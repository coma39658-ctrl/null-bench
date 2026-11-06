/*
 * E-ZERO Secure Pair V1 — persistent SQLite "PENDING" device registry LAB.
 *
 * This is NOT an active account/trusted-device enrollment endpoint. It uses
 * SQLite-backed Cloudflare DO storage semantics but remains unreferenced by
 * the public Worker. Staging a key does not authenticate an account.
 *
 * SAFE RULE: no method can change PENDING into ACTIVE until a reviewed
 * WebAuthn credential registration + mutually signed pairing ceremony exists.
 * Revocations are one way, server-mediated; never accept a client boolean
 * such as {trusted:true,verified:true,approved:true}.
 */
const A=/^[A-Za-z0-9_-]{12,64}$/;
const D=/^[A-Za-z0-9_-]{12,64}$/;
const H=/^[a-f0-9]{64}$/;
const B64=/^[A-Za-z0-9_-]+$/;
function result(ok,code,extra={}){return Object.freeze({ok,code,authorized:false,...extra});}
function hex(b){return [...b].map(x=>x.toString(16).padStart(2,"0")).join("");}
function decode(value){
 if(typeof value!=="string"||!B64.test(value)||value.length>300)
  throw Error("KEY_INVALID");
 const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4));
 if(raw.length<60||raw.length>200)throw Error("KEY_INVALID");
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export class PairV1PendingDeviceRegistryLab{
 #s;#tx;
 constructor(storage){
  if(typeof storage?.sql?.exec!=="function"||
     typeof storage?.transactionSync!=="function")
   throw Error("SQLITE_TRANSACTION_REQUIRED");
  this.#s=storage.sql;this.#tx=storage.transactionSync.bind(storage);
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_pair_v1_device_records (
   account_id TEXT NOT NULL,
   device_id TEXT NOT NULL,
   public_spki TEXT NOT NULL,
   key_hash TEXT NOT NULL UNIQUE,
   status TEXT NOT NULL CHECK(status IN ('PENDING','REVOKED')),
   version INTEGER NOT NULL DEFAULT 1,
   created_at INTEGER NOT NULL,
   revoked_at INTEGER,
   PRIMARY KEY(account_id,device_id)
  )`);
 }
 async stagePendingDevice({
  accountId,deviceId,publicSpki,keyHash
 },now=Date.now()){
  if(!A.test(accountId||"")||!D.test(deviceId||"")||
     !H.test(keyHash||"")||!Number.isSafeInteger(now)||now<=0)
   return result(false,"DEVICE_RECORD_INVALID");
  try{
   const spki=decode(publicSpki);
   const digest=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",spki)));
   if(digest!==keyHash)return result(false,"DEVICE_KEY_MISMATCH");
   await crypto.subtle.importKey("spki",spki,{name:"ECDSA",namedCurve:"P-256"},
    false,["verify"]);
  }catch(_){return result(false,"DEVICE_PROOF_KEY_INVALID");}
  try{
   return this.#tx(()=>{
    const exists=this.#s.exec(`SELECT device_id FROM ezero_pair_v1_device_records
      WHERE (account_id=? AND device_id=?) OR key_hash=?`,
      accountId,deviceId,keyHash).toArray();
    if(exists.length)return result(false,"DEVICE_ALREADY_STAGED_OR_REVOKED");
    this.#s.exec(`INSERT INTO ezero_pair_v1_device_records
       (account_id,device_id,public_spki,key_hash,status,created_at)
       VALUES(?,?,?,?,?,?)`,
      accountId,deviceId,publicSpki,keyHash,"PENDING",now);
    return result(true,"DEVICE_STAGED_PENDING_ONLY");
   });
  }catch(_){return result(false,"REGISTRY_UNAVAILABLE");}
 }
 // Still fail-closed even if the client lies that its biometric/passkey
 // succeeded. No production authority path or "activate" method exists.
 approveTrustedDeviceNotYetImplemented(){
  return result(false,"ACCOUNT_AND_DUAL_APPROVAL_NOT_IMPLEMENTED");
 }
 // For future audited server-side *owner-authorized* revocation only.
 // Do not expose this method through a browser/Worker URL without full auth.
 revokeServerSide(accountId,deviceId,now=Date.now()){
  if(!A.test(accountId||"")||!D.test(deviceId||"")||
     !Number.isSafeInteger(now)||now<=0)
   return result(false,"REVOCATION_INVALID");
  try{
   return this.#tx(()=>{
    const rows=this.#s.exec(`UPDATE ezero_pair_v1_device_records
      SET status='REVOKED',version=version+1,revoked_at=?
      WHERE account_id=? AND device_id=? AND status='PENDING'
      RETURNING device_id`,
      now,accountId,deviceId).toArray();
    return rows.length===1?
     result(true,"DEVICE_REVOKED_PENDING_LAB"):
     result(false,"DEVICE_NOT_FOUND_OR_ALREADY_REVOKED");
   });
  }catch(_){return result(false,"REGISTRY_UNAVAILABLE");}
 }
 getActiveDeviceNotYetImplemented(){
  return result(false,"TRUSTED_DEVICE_ENROLLMENT_NOT_IMPLEMENTED");
 }
}
