import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {PairV1MutualApprovalSqliteLab as Ledger}
 from "../secure_connect/pair_v1/mutual_approval_sqlite_lab_v0_1.mjs";
import {pairApprovalText}
 from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const root=mkdtempSync(join(tmpdir(),"ezero_mutual_lab_"));
const file=join(root,"mutual.sqlite3");
const storage=db=>({
 sql:{exec(q,...params){
   const t=q.trim();
   if(t.startsWith("CREATE TABLE")){db.exec(t);return{toArray:()=>[]};}
   const p=db.prepare(t);
   if(t.startsWith("SELECT")||t.includes("RETURNING"))
    return{toArray:()=>p.all(...params)};
   p.run(...params);return{toArray:()=>[]};
 }},
 transactionSync(f){
  db.exec("BEGIN IMMEDIATE");
  try{const out=f();db.exec("COMMIT");return out;}
  catch(e){db.exec("ROLLBACK");throw e;}
 }
});
const hex=b=>[...b].map(x=>x.toString(16).padStart(2,"0")).join("");
const digest=async b=>hex(new Uint8Array(await crypto.subtle.digest("SHA-256",b)));
const sign=async(key,approve)=>new Uint8Array(await crypto.subtle.sign(
 {name:"ECDSA",hash:"SHA-256"},key.privateKey,
 new TextEncoder().encode(pairApprovalText(approve))));
const pair=()=>crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const A=await pair(),B=await pair(),attacker=await pair();
const pubA=new Uint8Array(await crypto.subtle.exportKey("spki",A.publicKey));
const pubB=new Uint8Array(await crypto.subtle.exportKey("spki",B.publicKey));
const fpA=await digest(pubA),fpB=await digest(pubB);
const now=Date.now(),nonce="f".repeat(32),accountId="account_test_001";
const sid="a".repeat(32);
const session={sid,nonceDigest:await digest(new TextEncoder().encode(nonce)),
 accountId,aKeyHash:fpA,bKeyHash:fpB,issued:now,expires:now+60_000,purpose:"PAIR"};
const aApproval={sid,nonce,accountId,selfKeyHash:fpA,peerKeyHash:fpB,
 expires:session.expires,decision:"APPROVE"};
const bApproval={...aApproval,selfKeyHash:fpB,peerKeyHash:fpA};
const aProof={role:"A",approval:aApproval,signature:await sign(A,aApproval),
 registeredSpki:pubA,registeredDeviceKeyHash:fpA,accountFromRegistry:accountId};
const bProof={role:"B",approval:bApproval,signature:await sign(B,bApproval),
 registeredSpki:pubB,registeredDeviceKeyHash:fpB,accountFromRegistry:accountId};
let db;
try{
 db=new DatabaseSync(file);
 let ledger=new Ledger(storage(db));
 assert.deepEqual(ledger.createSession(session,now),{
  ok:true,code:"SESSION_RECORDED_UNAUTHORIZED",stage:"CREATED",
  authorized:false,trusted:false
 });
 assert.equal(ledger.createSession(session,now).code,"SESSION_REPLAYED");
 async function deny(proof,expected,at=now+2){
  const r=await ledger.recordSignedDecision(proof,at);
  assert.equal(r.ok,false,expected);
  assert.equal(r.authorized,false);
  assert.equal(r.trusted,false);
  assert.equal(r.code,expected);
 }
 await deny({...aProof,signature:await sign(attacker,aApproval)},"DEVICE_SIGNATURE_INVALID");
 await deny({...aProof,recordRevoked:true},"DEVICE_REVOKED");
 await deny({...aProof,accountFromRegistry:"another_account"},"ACCOUNT_BINDING_FAILED");
 await deny({...aProof,registeredSpki:pubB},"DEVICE_KEY_MISMATCH");
 await deny({...aProof,role:"B"},"SESSION_BINDING_FAILED");
 await deny({...aProof,approval:{...aApproval,nonce:"c".repeat(32)},
  signature:await sign(A,{...aApproval,nonce:"c".repeat(32)})},
  "SESSION_BINDING_FAILED");
 await deny({...aProof,approval:{...aApproval,accountId:"different_account"},
  signature:await sign(A,{...aApproval,accountId:"different_account"})},
  "ACCOUNT_BINDING_FAILED");
 await deny({...aProof,approval:{...aApproval,purpose:"ECU_WRITE"}},"DEVICE_PROOF_INVALID");
 assert.equal((await ledger.recordSignedDecision(aProof,now+3)).stage,"A_SIGNED");
 await deny(aProof,"ROLE_APPROVAL_REPLAY");
 // A valid signed B approval must not inherit privileges from A.
 let onlyOne=ledger.inspectLab(sid);
 assert.equal(onlyOne.stage,"A_SIGNED");
 assert.equal(onlyOne.authorized,false);
 assert.equal(onlyOne.trusted,false);
 db.close();db=new DatabaseSync(file);
 ledger=new Ledger(storage(db));
 assert.equal(ledger.inspectLab(sid).stage,"A_SIGNED");
 const both=await ledger.recordSignedDecision(bProof,now+4);
 assert.deepEqual(both,{
  ok:true,code:"BOTH_SIGNATURES_RECORDED_NO_ACCOUNT_AUTH",
  stage:"BOTH_SIGNED_UNAUTHORIZED",authorized:false,trusted:false
 });
 await deny(bProof,"SESSION_CLOSED");
 assert.equal(ledger.inspectLab(sid).stage,"BOTH_SIGNED_UNAUTHORIZED");
 db.close();db=new DatabaseSync(file);ledger=new Ledger(storage(db));
 assert.equal(ledger.inspectLab(sid).stage,"BOTH_SIGNED_UNAUTHORIZED");
 console.log("PAIR_V1_SQLITE_DUAL_REAL_ECDSA_SIGNATURES_ROLE_NONCE_ACCOUNT_BINDING_PASS: PASS");
 console.log("PAIR_V1_DOUBLE_APPROVAL_PERSISTED_BUT_TRUST_NEVER_ACTIVATED: PASS");

 const sid2="b".repeat(32);
 assert.equal(ledger.createSession({...session,sid:sid2},now).ok,true);
 const ar={...aApproval,sid:sid2,decision:"REJECT"};
 const rejection=await ledger.recordSignedDecision(
  {...aProof,approval:ar,signature:await sign(A,ar)},now+5);
 assert.equal(rejection.stage,"REJECTED");
 const bp2={...bProof,approval:{...bApproval,sid:sid2},
  signature:await sign(B,{...bApproval,sid:sid2})};
 await deny(bp2,"SESSION_CLOSED",now+6);
 assert.equal(ledger.inspectLab(sid2).stage,"REJECTED");
 const sid3="c".repeat(32);
 assert.equal(ledger.createSession({...session,sid:sid3},now).ok,true);
 const delayed={...aApproval,sid:sid3};
 await deny({...aProof,approval:delayed,signature:await sign(A,delayed)},
  "APPROVAL_EXPIRED",now+90_001);
 const invalid={...session,sid:"d".repeat(32)};
 for(const change of [
  {purpose:"OBD_CONTROL"},{accountId:"wrong"},{expires:now+90_001},
  {expires:now-1},{bKeyHash:fpA},{nonceDigest:"bad"},
  {sid:"too_short"},
 ]){
  assert.equal(ledger.createSession({...invalid,...change},now).ok,false);
 }
 // Do not silently allow either proof to sign for the other role.
 const sid4="e".repeat(32);
 assert.equal(ledger.createSession({...session,sid:sid4},now).ok,true);
 const aa={...aApproval,sid:sid4};
 const bb={...bApproval,sid:sid4};
 await deny({...aProof,role:"B",approval:aa,signature:await sign(A,aa)},
  "SESSION_BINDING_FAILED");
 const second={...bProof,approval:bb,signature:await sign(B,bb)};
 const pending=await ledger.recordSignedDecision(second,now+9);
 assert.equal(pending.stage,"B_SIGNED");
 const first={...aProof,approval:aa,signature:await sign(A,aa)};
 const completed=await ledger.recordSignedDecision(first,now+10);
 assert.equal(completed.stage,"BOTH_SIGNED_UNAUTHORIZED");
 assert.equal(completed.authorized,false);
 console.log("PAIR_V1_REVOCATION_FORGERY_EXPIRED_QR_REJECT_AND_REPLAY_FAIL_CLOSED: PASS");
 console.log("PAIR_V1_OUT_OF_ORDER_B_FIRST_THEN_A_SIGNED_STILL_NO_ACCESS: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(root,{recursive:true,force:true});
}
