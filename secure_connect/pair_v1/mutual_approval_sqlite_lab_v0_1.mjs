/*
 * E-ZERO Secure Pair V1 — mutually signed approvals, SQLite DO lab ONLY.
 * Not wired to HTTP, UI, public Cloudflare Worker, device ACTIVE records or
 * account sessions. A real service MUST pass server-registered device keys,
 * an independently authenticated WebAuthn account session, and an atomic
 * revocation/QR ledger from a single trusted Durable Object.
 *
 * This module cryptographically validates BOTH per-device signatures against
 * the identical session transcript and stores each one at most once.
 * Even BOTH_SIGNED_UNAUTHORIZED always returns authorized:false.
 */
import {verifyRegisteredDeviceApproval} from "./pair_policy_v1.mjs";
const HEX32=/^[a-f0-9]{32}$/;
const HEX64=/^[a-f0-9]{64}$/;
const ACCOUNT=/^[A-Za-z0-9_-]{12,64}$/;
const PAIR_MS=90_000;
function result(ok,code,stage="UNKNOWN"){
 return Object.freeze({ok,code,stage,authorized:false,trusted:false});
}
function hex(bytes){return [...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");}
function validSession(s,now){
 return s&&typeof s==="object"&&HEX32.test(s.sid||"")&&
 HEX64.test(s.nonceDigest||"")&&HEX64.test(s.aKeyHash||"")&&
 HEX64.test(s.bKeyHash||"")&&s.aKeyHash!==s.bKeyHash&&
 ACCOUNT.test(s.accountId||"")&&s.purpose==="PAIR"&&
 Number.isSafeInteger(now)&&Number.isSafeInteger(s.issued)&&
 Number.isSafeInteger(s.expires)&&s.issued>0&&s.issued<=now+30_000&&
 s.expires>now&&s.expires>s.issued&&s.expires-s.issued<=PAIR_MS;
}
export class PairV1MutualApprovalSqliteLab{
 #db;#tx;
 constructor(storage){
  if(typeof storage?.sql?.exec!=="function"||
     typeof storage?.transactionSync!=="function")
   throw Error("SQLITE_TRANSACTION_REQUIRED");
  this.#db=storage.sql;
  this.#tx=storage.transactionSync.bind(storage);
  this.#db.exec(`CREATE TABLE IF NOT EXISTS ezero_pair_v1_signed_approvals (
   sid TEXT PRIMARY KEY,
   nonce_digest TEXT NOT NULL,
   account_id TEXT NOT NULL,
   a_key_hash TEXT NOT NULL,
   b_key_hash TEXT NOT NULL,
   issued INTEGER NOT NULL,
   expires INTEGER NOT NULL,
   stage TEXT NOT NULL CHECK(stage IN
    ('CREATED','A_SIGNED','B_SIGNED','BOTH_SIGNED_UNAUTHORIZED','REJECTED')),
   a_signed_at INTEGER,
   b_signed_at INTEGER,
   rejected_at INTEGER
  )`);
 }
 createSession(session,now=Date.now()){
  if(!validSession(session,now))return result(false,"SESSION_INVALID");
  try{
   return this.#tx(()=>{
    const prior=this.#db.exec(
     "SELECT sid FROM ezero_pair_v1_signed_approvals WHERE sid=?",
     session.sid).toArray();
    if(prior.length)return result(false,"SESSION_REPLAYED");
    this.#db.exec(`INSERT INTO ezero_pair_v1_signed_approvals
     (sid,nonce_digest,account_id,a_key_hash,b_key_hash,issued,expires,stage)
     VALUES(?,?,?,?,?,?,?,'CREATED')`,
     session.sid,session.nonceDigest,session.accountId,session.aKeyHash,
     session.bKeyHash,session.issued,session.expires);
    return result(true,"SESSION_RECORDED_UNAUTHORIZED","CREATED");
   });
  }catch(_){return result(false,"SESSION_LEDGER_UNAVAILABLE");}
 }
 // LEGACY LAB ENTRY POINT: caller supplies a registered key. Never
 // expose this method to a browser or production API. The server-bound
 // entry point below fetches the public key itself from SQLite.
 async recordSignedDecision({
  role,approval,signature,registeredSpki,registeredDeviceKeyHash,
  accountFromRegistry,recordRevoked=false
 },now=Date.now()){
  return this.#recordDecision({
   role,approval,signature,registeredSpki,registeredDeviceKeyHash,
   accountFromRegistry,recordRevoked
  },now,null);
 }
 /*
  * Preferred server-BOUND laboratory path. The caller supplies only the
  * device ID, its role, the signed approval and signature. The public key,
  * key hash, account and revocation status come entirely from trusted
  * SQLite, not a browser-provided "verified" flag or key. The registration
  * record must remain PENDING, and is checked AGAIN inside the decision
  * transaction to close the async signature-verification revocation race.
  * This remains evidence only: it NEVER activates Trusted Device state.
  */
 async recordServerRegisteredDecisionLab({
  accountId,deviceId,role,approval,signature
 }={},now=Date.now()){
  if(!ACCOUNT.test(accountId||"")||
     !ACCOUNT.test(deviceId||"")||
     !["A","B"].includes(role)||
     !approval||approval.accountId!==accountId||
     !(signature instanceof Uint8Array)||
     !Number.isSafeInteger(now)||now<=0)
   return result(false,"REGISTRY_DECISION_INVALID");
  let record,spki;
  try{
   record=this.#db.exec(`SELECT account_id,device_id,public_spki,
    key_hash,status,version,revoked_at
    FROM ezero_pair_v1_device_records
    WHERE account_id=? AND device_id=?`,accountId,deviceId).toArray()[0];
   if(!record||record.status!=="PENDING"||
      record.revoked_at!==null||!HEX64.test(record.key_hash||"")||
      !Number.isSafeInteger(record.version)||record.version<1)
    return result(false,"REGISTERED_DEVICE_NOT_ACTIVE_FOR_APPROVAL");
   if(typeof record.public_spki!=="string"||
      !/^[A-Za-z0-9_-]{80,280}$/.test(record.public_spki))
    return result(false,"REGISTERED_KEY_INVALID");
   const encoded=record.public_spki;
   const raw=atob(encoded.replace(/-/g,"+").replace(/_/g,"/")+
    "=".repeat((4-encoded.length%4)%4));
   spki=Uint8Array.from(raw,c=>c.charCodeAt(0));
   let canonical="";for(const x of spki)canonical+=String.fromCharCode(x);
   canonical=btoa(canonical).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
   if(canonical!==encoded)return result(false,"REGISTERED_KEY_INVALID");
  }catch(_){return result(false,"REGISTERED_DEVICE_LEDGER_UNAVAILABLE");}
  return this.#recordDecision({
   role,approval,signature,
   registeredSpki:spki,registeredDeviceKeyHash:record.key_hash,
   accountFromRegistry:record.account_id,recordRevoked:false
  },now,{
   accountId,deviceId,version:record.version,
   publicSpki:record.public_spki,keyHash:record.key_hash
  });
 }
 async #recordDecision({
  role,approval,signature,registeredSpki,registeredDeviceKeyHash,
  accountFromRegistry,recordRevoked=false
 },now=Date.now(),serverBinding=null){
  if(!["A","B"].includes(role)||!approval||
     !Number.isSafeInteger(now)||!HEX32.test(approval.sid||"")||
     !HEX32.test(approval.nonce||""))
   return result(false,"DECISION_INVALID");
  // Verify signatures, never accept a client-provided {verified:true}.
  // The caller must fetch the registered key and account from server storage.
  const proof=await verifyRegisteredDeviceApproval({
   registeredSpki,registeredDeviceKeyHash,signature,approval,
   now,recordRevoked,accountFromRegistry
  });
  if(!proof.ok)return result(false,proof.code);
  let digest;
  try{
   digest=hex(new Uint8Array(await crypto.subtle.digest(
    "SHA-256",new TextEncoder().encode(approval.nonce))));
  }catch(_){return result(false,"NONCE_HASH_FAILED");}
  try{
   return this.#tx(()=>{
    if(serverBinding){
     const current=this.#db.exec(`SELECT status,version,key_hash,
       public_spki,revoked_at FROM ezero_pair_v1_device_records
       WHERE account_id=? AND device_id=?`,
       serverBinding.accountId,serverBinding.deviceId).toArray()[0];
     if(!current||current.status!=="PENDING"||
        current.revoked_at!==null||
        current.key_hash!==serverBinding.keyHash||
        current.public_spki!==serverBinding.publicSpki||
        current.version!==serverBinding.version)
      return result(false,"REGISTERED_DEVICE_REVOKED_OR_CHANGED");
    }
    const records=this.#db.exec(
     "SELECT * FROM ezero_pair_v1_signed_approvals WHERE sid=?",
     approval.sid).toArray();
    const row=records[0];
    if(!row)return result(false,"SESSION_NOT_FOUND");
    if(row.expires<=now||row.issued>now||approval.expires!==row.expires)
     return result(false,"SESSION_EXPIRED");
    if(row.nonce_digest!==digest||row.account_id!==approval.accountId||
       row.a_key_hash!==approval.selfKeyHash&&role==="A"||
       row.b_key_hash!==approval.selfKeyHash&&role==="B"||
       row.a_key_hash!==approval.peerKeyHash&&role==="B"||
       row.b_key_hash!==approval.peerKeyHash&&role==="A")
     return result(false,"SESSION_BINDING_FAILED");
    if(["REJECTED","BOTH_SIGNED_UNAUTHORIZED"].includes(row.stage))
     return result(false,"SESSION_CLOSED",row.stage);
    const col=role==="A"?"a_signed_at":"b_signed_at";
    if(row[col]!==null)return result(false,"ROLE_APPROVAL_REPLAY",row.stage);
    if(approval.decision==="REJECT"){
     const affected=this.#db.exec(`UPDATE ezero_pair_v1_signed_approvals
       SET stage='REJECTED',rejected_at=?
       WHERE sid=? AND stage NOT IN('REJECTED','BOTH_SIGNED_UNAUTHORIZED')
       AND expires>? RETURNING sid`,
       now,approval.sid,now).toArray();
     return affected.length===1?
      result(true,"SIGNED_REJECTION_RECORDED","REJECTED"):
      result(false,"SESSION_CLOSED");
    }
    if(approval.decision!=="APPROVE")return result(false,"DECISION_INVALID");
    const both=(role==="A"?row.b_signed_at:row.a_signed_at)!==null;
    const stage=both?"BOTH_SIGNED_UNAUTHORIZED":role+"_SIGNED";
    const affected=this.#db.exec(`UPDATE ezero_pair_v1_signed_approvals
     SET ${col}=?,stage=? WHERE sid=? AND ${col} IS NULL
     AND stage NOT IN('REJECTED','BOTH_SIGNED_UNAUTHORIZED')
     AND expires>? RETURNING sid`,now,stage,approval.sid,now).toArray();
    return affected.length===1?
     result(true,both?"BOTH_SIGNATURES_RECORDED_NO_ACCOUNT_AUTH":"ONE_SIGNATURE_PENDING",
      stage):result(false,"ROLE_APPROVAL_REPLAY");
   });
  }catch(_){return result(false,"DECISION_LEDGER_UNAVAILABLE");}
 }
 inspectLab(sid){
  if(!HEX32.test(sid||""))return result(false,"SESSION_INVALID");
  try{
   const rows=this.#db.exec(
    "SELECT stage FROM ezero_pair_v1_signed_approvals WHERE sid=?",sid).toArray();
   return rows.length?result(true,"LAB_STAGE_ONLY",rows[0].stage):
    result(false,"SESSION_NOT_FOUND");
  }catch(_){return result(false,"LEDGER_UNAVAILABLE");}
 }
 // An account passkey assertion, server auth session, atomic nonce
 // consumption and ACTIVE device promotion are release blockers.
 // This lab intentionally has NO public access or trust-grant API.
}
