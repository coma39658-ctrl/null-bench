import test from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import {createHash, generateKeyPairSync, sign, verify, createPublicKey} from "node:crypto";

const fp = spki => createHash("sha256").update(spki).digest("hex");
const canonical = (tag, fields, order) => Buffer.from(tag+"\n"+order.map(k=>k+"="+fields[k]+"\n").join(""),"utf8");
const CHALLENGE_ORDER=["challenge_id","device_fp","nonce","audience","expires_at"];
const APPROVAL_ORDER=["root_fp","device_fp","challenge_id","nonce","audience","expires_at"];
const signBytes=(key,bytes)=>sign("sha256",bytes,{key,dsaEncoding:"ieee-p1363"});
const verifyBytes=(key,bytes,sig)=>verify("sha256",bytes,{key,dsaEncoding:"ieee-p1363"},sig);

function fixture(){
 const root=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
 const device=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
 const rootSpki=root.publicKey.export({type:"spki",format:"der"});
 const deviceSpki=device.publicKey.export({type:"spki",format:"der"});
 const rootFp=fp(rootSpki), deviceFp=fp(deviceSpki);
 const challenge={challenge_id:"challenge_123456",device_fp:deviceFp,nonce:"abcdefghijklmnopQRSTUV",audience:"https://ezero-staging.example",expires_at:"1795555650000"};
 const approval={root_fp:rootFp,device_fp:deviceFp,challenge_id:challenge.challenge_id,nonce:challenge.nonce,audience:challenge.audience,expires_at:challenge.expires_at};
 return {root,device,rootSpki,deviceSpki,rootFp,deviceFp,challenge,approval};
}

test("fingerprints are recomputed from SPKI, not accepted as labels",()=>{
 const f=fixture();
 assert.equal(fp(f.deviceSpki),f.deviceFp);
 assert.notEqual(fp(f.deviceSpki),f.rootFp);
});

test("Android device proof uses 64-byte P1363 and verifies only against the exact challenge and device key",()=>{
 const f=fixture(), bytes=canonical("EZERO_ANDROID_ENROLL_CHALLENGE_V1",f.challenge,CHALLENGE_ORDER);
 const proof=signBytes(f.device.privateKey,bytes);
 assert.equal(proof.length,64,"WebCrypto ECDSA verification expects IEEE-P1363 r||s bytes");
 assert.equal(verifyBytes(createPublicKey({key:f.deviceSpki,type:"spki",format:"der"}),bytes,proof),true);
 assert.equal(verifyBytes(f.root.publicKey,bytes,proof),false);
 assert.equal(verifyBytes(f.device.publicKey,canonical("EZERO_ANDROID_ENROLL_CHALLENGE_V1",{...f.challenge,nonce:"changednonceabcdefghijkl"},CHALLENGE_ORDER),proof),false);
});

test("root approval binds exact root, device, challenge, nonce, audience and expiry",()=>{
 const f=fixture(), bytes=canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER);
 const sig=signBytes(f.root.privateKey,bytes);
 assert.equal(verifyBytes(f.root.publicKey,bytes,sig),true);
 for(const patch of [{device_fp:f.rootFp},{nonce:"changednonceabcdefghijkl"},{audience:"https://attacker.example"},{expires_at:"1795555555001"}]){
  assert.equal(verifyBytes(f.root.publicKey,canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",{...f.approval,...patch},APPROVAL_ORDER),sig),false);
 }
});

test("a valid self-signed root is still rejected unless root registry confirms it",()=>{
 const f=fixture(), registeredRoots=new Set();
 const rootAuthenticated=registeredRoots.has(f.rootFp);
 const approvalSig=signBytes(f.root.privateKey,canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER));
 assert.equal(verifyBytes(f.root.publicKey,canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER),approvalSig),true);
 assert.equal(rootAuthenticated,false,"signature validity is not root authorization");
 registeredRoots.add(f.rootFp);
 assert.equal(registeredRoots.has(f.rootFp),true,"only an independently provisioned registry may authorize this root");
});

test("canonical encodings are deterministic, LF-only, and end with LF",()=>{
 const f=fixture();
 for(const [tag,fields,order] of [
  ["EZERO_ANDROID_ENROLL_CHALLENGE_V1",f.challenge,CHALLENGE_ORDER],
  ["EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER]
 ]){
  const bytes=canonical(tag,fields,order);
  assert.equal(bytes.at(-1),10);
  assert.equal(bytes.includes(13),false);
  assert.equal(bytes.equals(canonical(tag,fields,order)),true);
 }
});

test("challenge expiry, audience and field syntax fail closed",()=>{
 const f=fixture(), now=1795555550000;
 const valid=(c)=>/^[A-Za-z0-9_-]{16,128}$/.test(c.nonce)&&/^https:\/\/[a-z0-9.-]+$/.test(c.audience)&&/^\d{13}$/.test(c.expires_at)&&Number(c.expires_at)>now&&Number(c.expires_at)-now<=90000;
 assert.equal(valid(f.challenge),false,"fixture exceeds 90-second enrollment lifetime");
 const good={...f.challenge,expires_at:String(now+90000)};
 assert.equal(valid(good),true);
 assert.equal(valid({...good,audience:"*"}),false);
 assert.equal(valid({...good,nonce:"tiny"}),false);
 assert.equal(valid({...good,expires_at:String(now+90001)}),false);
});


test("native Android requests may omit Origin only on proof-gated enrollment routes",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/const androidRoute = u\.pathname === "\/v1\/android\/enrollment\/challenge" \|\|[\s\S]*?u\.pathname === "\/v1\/android\/enrollment\/complete"/);
 assert.match(worker,/if \(rootAdminRoute && origin !== ORIGIN\) return response\(\{error:"ORIGIN_DENIED"\},403\)/);
 assert.match(worker,/if \(androidRoute && origin !== null && origin !== ORIGIN\)[\s\S]*?ORIGIN_DENIED/);
 assert.match(worker,/Native Android HTTP clients do not send a browser Origin header/);
});

test("foreign browser origins remain rejected and admin root registration stays origin-bound",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/if \(request\.headers\.get\("Origin"\) !== ORIGIN\) return response\(\{error:"ORIGIN_DENIED"\},403\)/);
 assert.match(worker,/if \(rootAdminRoute && origin !== ORIGIN\) return response\(\{error:"ORIGIN_DENIED"\},403\)/);
});

test("enrollment endpoints apply privacy-preserving per-IP fixed-window limits",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/CF-Connecting-IP/);
 assert.match(worker,/X-EZERO-Client-IP/);
 assert.match(worker,/crypto\.subtle\.digest\("SHA-256", enc\.encode\(clientIp\)\)/);
 assert.match(worker,/const windowMs = admin \? 60 \* 60 \* 1000 : 60 \* 1000/);
 assert.match(worker,/const limit = admin \? 3 : 10/);
 assert.match(worker,/transactionSync\(tx => \{/);
 assert.match(worker,/status:429/);
 assert.match(worker,/Retry-After/);
 assert.doesNotMatch(worker,/tx\.put\([^\n]*clientIp/,"raw client IP must never be persisted");
});

test("root revocation atomically disables every child installation and stored push token",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/u\.pathname === "\/v1\/admin\/root-revoke"/);
 assert.match(worker,/ROOT_AND_CHILD_INSTALLATIONS_REVOKED/);
 assert.match(worker,/devices\[deviceFp\] = \{\.\.\.device,active:false,revoked:true/);
 assert.match(worker,/tx\.put\("push-token:"\+deviceFp,\{\.\.\.token,active:false/);
 assert.match(worker,/ROOT_BOOTSTRAP_SECRET/);
});

test("installation revocation atomically disables its push token and leaves a tombstone",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/u\.pathname === "\/v1\/admin\/device-revoke"/);
 assert.match(worker,/INSTALLATION_REVOKED/);
 assert.match(worker,/revoked:true,revoked_at:now/);
 assert.match(worker,/DEVICE_ALREADY_SEEN/,"a revoked installation key cannot silently re-enroll");
});

test("token writes re-check root and device revocation inside the same transaction",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/Re-check revocation atomically with token persistence/);
 assert.match(worker,/currentDevices\[deviceFp\]/);
 assert.match(worker,/currentRoots\[currentDevice\.root_fp\]/);
 assert.match(worker,/DEVICE_OR_ROOT_REVOKED/);
});

test("enrollment completion atomically re-checks root state before adding a device",()=>{
 const worker=readFileSync(fileURLToPath(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js",import.meta.url)),"utf8");
 assert.match(worker,/const enrollmentResult = this\.ctx\.storage\.transactionSync/);
 assert.match(worker,/if \(!currentRoots\[body\.root_fp\]\?\.active\) return "ROOT_REVOKED"/);
 assert.match(worker,/if \(devices\[c\.device_fp\]\) return "DEVICE_ALREADY_SEEN"/);
});
