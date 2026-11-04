import assert from "node:assert/strict";
import {
 ORIGIN,ROOM_TTL_MS,MAX_BODY_BYTES,randomHex,hashSecret,
 verifySignedIdentity,roomDecision
} from "../src/protocol.mjs";
const te=new TextEncoder();
const hex=u=>Array.from(u,x=>x.toString(16).padStart(2,"0")).join("");
async function signed(name="person",expire=Date.now()+300000){
  const k=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const pub=await crypto.subtle.exportKey("spki",k.publicKey);
  const spki=Buffer.from(pub).toString("base64url");
  const fp=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",pub)));
  const code=randomHex(12);
  const m=["EZERO-IDENTITY-1",ORIGIN,spki,fp,code,String(expire)].join("|");
  const sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},k.privateKey,te.encode(m));
  return {name,fp,raw:["EZERO1",spki,fp,code,String(expire),Buffer.from(sig).toString("base64url")].join(".")};
}
assert.equal(ROOM_TTL_MS,600000);
assert.equal(MAX_BODY_BYTES,4000);
const a=await signed("sender"),b=await signed("recipient");
assert.notEqual(a.fp,b.fp);
assert.equal((await verifySignedIdentity(a.raw)).fingerprint,a.fp);
assert.equal((await verifySignedIdentity(b.raw)).fingerprint,b.fp);
for(const malformed of ["junk","0".repeat(64),"EZERO1.x","EZERO1."+a.raw]){
 await assert.rejects(verifySignedIdentity(malformed));
}
const changedHash=a.raw.split(".");changedHash[2]="1".repeat(64);
await assert.rejects(verifySignedIdentity(changedHash.join(".")),/FINGERPRINT_MISMATCH/);
const tampered=a.raw.split(".");tampered[3]="a".repeat(24);
await assert.rejects(verifySignedIdentity(tampered.join(".")),/INVALID_SIGNATURE/);
const expired=await signed("old",Date.now()-1000);
await assert.rejects(verifySignedIdentity(expired.raw),/EXPIRED_INVITE/);
console.log("TEN_MINUTE_SIGNED_SHA256_IDENTITY_VERIFY_REJECT_TAMPER: PASS");

const ownerToken=randomHex(32),joinToken=randomHex(32);
assert.equal(ownerToken.length,64);
assert.equal(joinToken.length,64);
assert.notEqual(ownerToken,joinToken);
const ownerHash=await hashSecret(ownerToken),joinHash=await hashSecret(joinToken);
const room={
 state:"INVITED",ownerHash,joinHash,ownerSignedId:a.raw,ownerFp:a.fp,
 expiresAt:Math.min(Date.now()+ROOM_TTL_MS,(await verifySignedIdentity(a.raw)).expiresAt)
};
assert.equal(roomDecision(room,"lookup","0".repeat(64)).status,404);
assert.equal(roomDecision(room,"lookup",ownerHash).status,403);
const found=roomDecision(room,"lookup",joinHash);
assert.equal(found.code,"INVITE_FOUND");
assert.equal(found.inviterFingerprint,a.fp);
assert.equal(found.inviterSignedId,a.raw);
assert.equal(roomDecision(room,"request",joinHash,{signedId:a.raw,fp:a.fp}).code,"INVALID_REQUEST");
assert.equal(roomDecision(room,"request",ownerHash,{signedId:b.raw,fp:b.fp}).status,403);
let pending=roomDecision(room,"request",joinHash,{signedId:b.raw,fp:b.fp});
assert.equal(pending.status,202);
assert.equal(pending.code,"REQUEST_PENDING");
assert.equal(pending.next.state,"REQUEST_PENDING");
const afterPending=pending.next;
assert.equal(roomDecision(afterPending,"request",joinHash,{signedId:b.raw,fp:b.fp}).code,"ALREADY_REQUESTED");
const ownerView=roomDecision(afterPending,"status",ownerHash);
assert.equal(ownerView.requesterSignedId,b.raw);
assert.equal(ownerView.requesterFingerprint,b.fp);
const requesterView=roomDecision(afterPending,"status",joinHash);
assert.equal(requesterView.code,"REQUEST_PENDING");
assert.equal(requesterView.inviterSignedId,undefined,"Never misreport unapproved friendship");
assert.equal(roomDecision(afterPending,"decide",joinHash,{approve:true}).status,403);
assert.equal(roomDecision(afterPending,"decide",ownerHash,{}).code,"DECISION_REQUIRED");
const reject=roomDecision(afterPending,"decide",ownerHash,{approve:false});
assert.equal(reject.next.state,"FRIEND_DECLINED");
assert.equal(roomDecision(reject.next,"status",joinHash).code,"FRIEND_DECLINED");
const accept=roomDecision(afterPending,"decide",ownerHash,{approve:true});
assert.equal(accept.next.state,"FRIEND_APPROVED");
const approved=roomDecision(accept.next,"status",joinHash);
assert.equal(approved.code,"FRIEND_APPROVED");
assert.equal(approved.inviterSignedId,a.raw);
assert.equal(roomDecision(room,"lookup",joinHash,null,room.expiresAt+1).code,"INVITE_EXPIRED");
console.log("REQUEST_PENDING_TWO_SIDE_APPROVAL_DECLINE_EXPIRED_INVITE: PASS");

const wrangler=JSON.parse(await (await import("node:fs/promises")).readFile(
 new URL("../wrangler.jsonc",import.meta.url),"utf8"));
assert.equal(wrangler.name,"ezero-secure-connect-signaling-staging");
assert.equal(wrangler.workers_dev,false);
assert.equal(wrangler.preview_urls,false);
assert.equal(wrangler.vars.EZERO_PUBLIC_ENABLED,"false");
assert.equal(wrangler.durable_objects.bindings[0].class_name,"PairRoom");
assert.equal(wrangler.exports.PairRoom.storage,"sqlite");
assert.equal(wrangler.routes,undefined);
assert.equal(wrangler.route,undefined);
console.log("NO_PUBLIC_ENDPOINT_OR_PAID_AUTO_DEPLOY: PASS");

const worker=await (await import("node:fs/promises")).readFile(
 new URL("../src/worker.mjs",import.meta.url),"utf8");
for(const token of ["getUserMedia","MediaRecorder","video","audio","recording","localStorage"]){
 assert.ok(!/localStorage|MediaRecorder|getUserMedia/.test(worker),"Server never accesses browser media, recordings or contacts");
}
assert.ok(!worker.includes("env.TURN_SECRET")&&!worker.includes("TURN_TOKEN"),
 "No TURN billing activated");
assert.ok(!worker.includes("request.headers.get(\"Cookie\")")&&!worker.includes("indexedDB"),
 "No cookie account tracking");
assert.match(worker,/EZERO_PUBLIC_ENABLED!=="true"/);
assert.match(worker,/origin!==ORIGIN/);
assert.match(worker,/MAX_BODY_BYTES/);
assert.match(worker,/setAlarm\(/);
assert.match(worker,/deleteAll\(/);
assert.match(worker,/#ezero-join=/,"Invite bearer is in fragment, not HTTP query");
console.log("STAGING_DISABLED_ORIGIN_SIZE_TTL_NO_CALL_MEDIA_STORAGE: PASS");
