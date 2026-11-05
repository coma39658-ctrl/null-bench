/*
 * Real SQLite and real P-256 signatures; public keys are fetched ONLY from
 * server storage. No active Trusted Device, account login, public Worker,
 * call permission, or ECU operation is introduced by this test.
 */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {PairV1PendingDeviceRegistryLab as Devices}
 from "../secure_connect/pair_v1/trusted_device_sqlite_lab_v0_1.mjs";
import {PairV1MutualApprovalSqliteLab as Decisions}
 from "../secure_connect/pair_v1/mutual_approval_sqlite_lab_v0_1.mjs";
import {pairApprovalText} from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const root=mkdtempSync(join(tmpdir(),"ezero_bound_approvals_"));
const databasePath=join(root,"data.sqlite");
const storage=db=>({
 sql:{exec(query,...values){
  const q=query.trim();
  if(q.startsWith("CREATE TABLE")){
   db.exec(q);return{toArray:()=>[]};
  }
  const stmt=db.prepare(q);
  if(q.startsWith("SELECT")||q.includes("RETURNING"))
   return{toArray:()=>stmt.all(...values)};
  stmt.run(...values);return{toArray:()=>[]};
 }},
 transactionSync(work){
  db.exec("BEGIN IMMEDIATE");
  try{const result=work();db.exec("COMMIT");return result;}
  catch(error){db.exec("ROLLBACK");throw error;}
 }
});
const toHex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");
const sha=async bytes=>toHex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
const toB64=bytes=>{
 let x="";for(const b of bytes)x+=String.fromCharCode(b);
 return btoa(x).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const keypair=()=>crypto.subtle.generateKey(
 {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const sign=async(key,approval)=>new Uint8Array(await crypto.subtle.sign(
 {name:"ECDSA",hash:"SHA-256"},key.privateKey,
 new TextEncoder().encode(pairApprovalText(approval))));
const accountId="account_test_001";
const devA="device_alpha_registered_001",devB="device_beta_registered_001";
const a=await keypair(),b=await keypair(),attacker=await keypair();
const aPub=new Uint8Array(await crypto.subtle.exportKey("spki",a.publicKey));
const bPub=new Uint8Array(await crypto.subtle.exportKey("spki",b.publicKey));
const ePub=new Uint8Array(await crypto.subtle.exportKey("spki",attacker.publicKey));
const aHash=await sha(aPub),bHash=await sha(bPub);
const now=Date.now(),nonce="f".repeat(32);
const sid="1".repeat(32);
const base={
 sid,nonceDigest:await sha(new TextEncoder().encode(nonce)),
 accountId,aKeyHash:aHash,bKeyHash:bHash,
 issued:now,expires:now+60_000,purpose:"PAIR"
};
const approvalA={sid,nonce,accountId,selfKeyHash:aHash,peerKeyHash:bHash,
 expires:base.expires,decision:"APPROVE"};
const approvalB={...approvalA,selfKeyHash:bHash,peerKeyHash:aHash};
let db;
try{
 db=new DatabaseSync(databasePath);
 let registry=new Devices(storage(db));
 let ledger=new Decisions(storage(db));
 assert.equal((await registry.stagePendingDevice({
  accountId,deviceId:devA,publicSpki:toB64(aPub),keyHash:aHash
 },now)).ok,true);
 assert.equal((await registry.stagePendingDevice({
  accountId,deviceId:devB,publicSpki:toB64(bPub),keyHash:bHash
 },now)).ok,true);
 assert.equal(ledger.createSession(base,now).ok,true);
 const serverOnly={
  accountId,deviceId:devA,role:"A",approval:approvalA,
  signature:await sign(a,approvalA)
 };
 const fake={
  ...serverOnly,signature:await sign(attacker,approvalA),
  registeredSpki:ePub,registeredDeviceKeyHash:await sha(ePub),
  accountFromRegistry:accountId,recordRevoked:false,verified:true
 };
 const forgery=await ledger.recordServerRegisteredDecisionLab(fake,now+1);
 assert.equal(forgery.code,"DEVICE_SIGNATURE_INVALID");
 assert.equal(forgery.authorized,false);
 assert.equal((await ledger.recordServerRegisteredDecisionLab({
  ...serverOnly,deviceId:"device_unregistered_001"
 },now+2)).code,"REGISTERED_DEVICE_NOT_ACTIVE_FOR_APPROVAL");
 assert.equal((await ledger.recordServerRegisteredDecisionLab({
  ...serverOnly,accountId:"other_account_001"
 },now+2)).code,"REGISTRY_DECISION_INVALID");
 assert.equal((await ledger.recordServerRegisteredDecisionLab({
  ...serverOnly,role:"B"
 },now+2)).code,"SESSION_BINDING_FAILED");
 assert.equal(ledger.inspectLab(sid).stage,"CREATED");
 const goodA=await ledger.recordServerRegisteredDecisionLab({
  ...serverOnly,registeredSpki:ePub,registeredDeviceKeyHash:await sha(ePub),
  verified:false,recordRevoked:true
 },now+3);
 assert.equal(goodA.stage,"A_SIGNED");
 assert.equal(goodA.trusted,false);
 assert.equal((await ledger.recordServerRegisteredDecisionLab(
  serverOnly,now+3)).code,"ROLE_APPROVAL_REPLAY");
 const goodB=await ledger.recordServerRegisteredDecisionLab({
  accountId,deviceId:devB,role:"B",approval:approvalB,
  signature:await sign(b,approvalB)
 },now+4);
 assert.equal(goodB.stage,"BOTH_SIGNED_UNAUTHORIZED");
 assert.equal(goodB.authorized,false);
 assert.equal(goodB.trusted,false);
 assert.equal(ledger.inspectLab(sid).stage,"BOTH_SIGNED_UNAUTHORIZED");
 console.log("SERVER_ONLY_SQLITE_DEVICE_KEY_CANNOT_BE_SPOOFED_BY_BROWSER_FIELDS: PASS");
 console.log("SERVER_BOUND_TWO_REAL_P256_SIGNATURES_STILL_NO_DEVICE_TRUST: PASS");

 const sid2="2".repeat(32);
 const a2={...approvalA,sid:sid2};
 const b2={...approvalB,sid:sid2};
 assert.equal(ledger.createSession({...base,sid:sid2},now).ok,true);
 // The server-bound method reads B's pending registration synchronously,
 // then yields for async ECDSA verification. Revoking B immediately after
 // that read MUST be observed again inside the commit transaction.
 const inFlight=ledger.recordServerRegisteredDecisionLab({
  accountId,deviceId:devB,role:"B",approval:b2,
  signature:await sign(b,b2)
 },now+6);
 const revoked=registry.revokeServerSide(accountId,devB,now+6);
 assert.equal(revoked.ok,true);
 const raced=await inFlight;
 assert.equal(raced.ok,false);
 assert.equal(raced.code,"REGISTERED_DEVICE_REVOKED_OR_CHANGED");
 assert.equal(ledger.inspectLab(sid2).stage,"CREATED");
 assert.equal((await ledger.recordServerRegisteredDecisionLab({
  accountId,deviceId:devB,role:"B",approval:b2,signature:await sign(b,b2)
 },now+7)).code,"REGISTERED_DEVICE_NOT_ACTIVE_FOR_APPROVAL");
 console.log("SERVER_BOUND_ASYNC_VERIFY_REVOCATION_RACE_FAILS_BEFORE_COMMIT: PASS");

 db.close();db=new DatabaseSync(databasePath);
 registry=new Devices(storage(db));ledger=new Decisions(storage(db));
 assert.equal(ledger.inspectLab(sid2).stage,"CREATED");
 assert.equal((await ledger.recordServerRegisteredDecisionLab({
  accountId,deviceId:devB,role:"B",approval:b2,signature:await sign(b,b2)
 },now+8)).code,"REGISTERED_DEVICE_NOT_ACTIVE_FOR_APPROVAL");
 assert.equal(typeof ledger.activateTrustedDevice,"undefined");
 console.log("SERVER_BOUND_REVOKED_DEVICE_STAYS_BLOCKED_AFTER_SQLITE_RESTART: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(root,{recursive:true,force:true});
}
