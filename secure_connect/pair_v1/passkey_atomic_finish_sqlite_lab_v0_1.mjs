/*
 * E-ZERO Secure Pair V1 — bounded PASSKEY AUTH COMMIT laboratory.
 *
 * Purpose: cryptographically verify a registered ES256/COSE passkey assertion,
 * then atomically consume its fresh 90-second server challenge and persist its
 * authenticator signature counter in the SAME SQLite transaction.
 *
 * NOT an account server, login session issuer, trusted-device activator, or
 * exposed Cloudflare route. A server must authenticate the account context
 * before invoking begin() or finish(), and register credentials through a
 * separate verified WebAuthn ceremony. No client-supplied {verified:true}
 * flags, private keys, raw biometrics, or ECU capabilities are accepted.
 *
 * This class reads independently enrolled credentials from the SQL registry.
 * It has intentionally NO public method to insert an ACTIVE credential.
 */
import {makeAuthenticationOptionsLabV1,verifyAuthenticationResponseLabV1}
 from "./webauthn_authentication_library_lab_v0_1.mjs";
import {PAIR_V1_RP_ID} from "./pair_policy_v1.mjs";
import {SESSION_LAB_COOKIE,SESSION_LAB_MAX_MS,sessionSecretDigestForLab}
 from "./account_session_guard_sqlite_lab_v0_1.mjs";

const ACCOUNT=/^[A-Za-z0-9_-]{12,64}$/;
const ID=/^[A-Za-z0-9_-]{16,256}$/;
const SID=/^[a-f0-9]{32}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const TTL_MS=90_000;
const encoder=new TextEncoder();
const out=(ok,code,extra={})=>Object.freeze({
 ok,code,authorized:false,authenticatedSessionIssued:false,
 trustedDeviceActivated:false,...extra
});
const hex=bytes=>[...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");
function b64(bytes){let s="";for(const b of bytes)s+=String.fromCharCode(b);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function trustedServerOrigin(raw){
 try{
  const u=new URL(raw);
  return u.protocol==="https:"&&u.pathname==="/"&&!u.search&&!u.hash&&
   !u.username&&!u.password?u.origin:null;
 }catch(_){return null;}
}
async function digestChallenge(raw){
 if(typeof raw!=="string"||!B64.test(raw)||raw.length!==43)
  throw Error("INVALID_CHALLENGE");
 // A generated WebAuthn challenge must represent 32 bytes, canonical b64url.
 const decoded=atob(raw.replace(/-/g,"+").replace(/_/g,"/")+"=");
 if(decoded.length!==32)throw Error("INVALID_CHALLENGE");
 let s="";for(let i=0;i<decoded.length;i++)s+=decoded[i];
 if(btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")!==raw)
  throw Error("INVALID_CHALLENGE");
 return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(raw))));
}
function registryRow(row){
 if(!row||row.status!=="ACTIVE"||row.revoked!==0||row.alg!==-7||
    row.rp_id!==PAIR_V1_RP_ID||
    !ACCOUNT.test(row.account_id||"")||!ID.test(row.credential_id||"")||
    !Number.isSafeInteger(row.sign_count)||row.sign_count<0||
    row.sign_count>0xffffffff||
    typeof row.cose_public_key!=="string"||row.cose_public_key.length>1024)
  return null;
 let transports;
 try{
  transports=JSON.parse(row.transports_json||"[]");
  if(!Array.isArray(transports)||transports.length>5||
     transports.some(t=>!["usb","nfc","ble","internal","hybrid"].includes(t)))
   return null;
 }catch(_){return null;}
 return {
  accountId:row.account_id,credentialId:row.credential_id,
  publicKeyCoseB64:row.cose_public_key,signCount:row.sign_count,
  alg:row.alg,rpId:row.rp_id,status:row.status,
  revoked:row.revoked!==0,transports
 };
}
export class PairV1SqliteAtomicPasskeyFinishLab{
 #sql;#tx;#origin;
 constructor(storage,{labServerOrigin=null}={}){
  if(typeof storage?.sql?.exec!=="function"||
     typeof storage?.transactionSync!=="function")
   throw Error("SQLITE_TRANSACTION_REQUIRED");
  this.#sql=storage.sql;
  this.#tx=storage.transactionSync.bind(storage);
  this.#origin=labServerOrigin===null?null:trustedServerOrigin(labServerOrigin);
  if(labServerOrigin!==null&&!this.#origin)
   throw Error("HTTPS_SAME_ORIGIN_SERVER_REQUIRED");
  this.#sql.exec(`CREATE TABLE IF NOT EXISTS ezero_v1_auth_credentials_lab (
   account_id TEXT NOT NULL,
   credential_id TEXT PRIMARY KEY,
   cose_public_key TEXT NOT NULL,
   sign_count INTEGER NOT NULL CHECK(sign_count>=0),
   alg INTEGER NOT NULL CHECK(alg=-7),
   rp_id TEXT NOT NULL,
   transports_json TEXT NOT NULL DEFAULT '[]',
   status TEXT NOT NULL CHECK(status IN ('ACTIVE','REVOKED')),
   revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN(0,1)),
   version INTEGER NOT NULL DEFAULT 1
  )`);
  this.#sql.exec(`CREATE TABLE IF NOT EXISTS ezero_v1_auth_pending_lab (
   session_id TEXT PRIMARY KEY,
   challenge_digest TEXT NOT NULL UNIQUE,
   account_id TEXT NOT NULL,
   credential_id TEXT NOT NULL,
   issued INTEGER NOT NULL,
   expires INTEGER NOT NULL,
   purpose TEXT NOT NULL CHECK(purpose='WEBAUTHN_AUTHENTICATE'),
   consumed_at INTEGER
  )`);
  // Same guard schema: no public token-minting endpoint, no scope escalation.
  this.#sql.exec(`CREATE TABLE IF NOT EXISTS ezero_v1_sessions_guard_lab (
   sid TEXT PRIMARY KEY,
   secret_digest TEXT NOT NULL UNIQUE,
   account_id TEXT NOT NULL,
   credential_id TEXT NOT NULL,
   issued INTEGER NOT NULL,
   expires INTEGER NOT NULL,
   seen_at INTEGER NOT NULL,
   origin TEXT NOT NULL,
   scope TEXT NOT NULL CHECK(scope='ACCOUNT_OBSERVE_ONLY'),
   revoked_at INTEGER
  )`);
 }
 #record(accountId,credentialId){
  const rows=this.#sql.exec(
   "SELECT * FROM ezero_v1_auth_credentials_lab WHERE account_id=? AND credential_id=?",
   accountId,credentialId).toArray();
  return registryRow(rows[0]);
 }
 async begin({accountId,credentialId},now=Date.now()){
  // Route-level authenticated account ownership is NOT implemented here.
  if(!ACCOUNT.test(accountId||"")||!ID.test(credentialId||"")||
     !Number.isSafeInteger(now)||now<=0)
   return out(false,"ACCOUNT_CONTEXT_INVALID");
  let record;
  try{record=this.#record(accountId,credentialId);}catch(_){
   return out(false,"CREDENTIAL_REGISTRY_UNAVAILABLE");
  }
  if(!record||record.status!=="ACTIVE"||record.revoked)
   return out(false,"REGISTERED_CREDENTIAL_REQUIRED");
  const result=await makeAuthenticationOptionsLabV1({
   accountId,registeredCredentials:[record],now
  });
  if(!result.ok)return out(false,result.code);
  const sessionId=hex(crypto.getRandomValues(new Uint8Array(16)));
  let challengeDigest;
  try{challengeDigest=await digestChallenge(result.options.challenge);}catch(_){
   return out(false,"INVALID_SERVER_CHALLENGE");
  }
  const issued=now,expires=now+TTL_MS;
  try{
   const saved=this.#tx(()=>{
    this.#sql.exec(`INSERT INTO ezero_v1_auth_pending_lab
     (session_id,challenge_digest,account_id,credential_id,issued,expires,purpose)
     VALUES(?,?,?,?,?,?,'WEBAUTHN_AUTHENTICATE')`,
     sessionId,challengeDigest,accountId,credentialId,issued,expires);
    return true;
   });
   if(!saved)return out(false,"CHALLENGE_NOT_SAVED");
  }catch(_){return out(false,"CHALLENGE_LEDGER_UNAVAILABLE");}
  return out(true,"PASSKEY_CHALLENGE_ISSUED_LAB",{
   sessionId,expires,options:result.options,
   challengeConsumed:false,counterPersisted:false
  });
 }
 async finish({accountId,sessionId,response},now=Date.now()){
  return this.#finish({accountId,sessionId,response},now,null);
 }
 // Called only by an audited SAME-ORIGIN server route in the future.
 // A REAL WebAuthn signed assertion is verified before any session INSERT;
 // the token is created and committed in the SAME SQLite transaction as the
 // challenge consume + counter update. Only a preverified LAB fixture account
 // can be used; account onboarding and authorized routes still DO NOT EXIST.
 async finishForObservationSessionLab({accountId,sessionId,response}={},now=Date.now()){
  if(!this.#origin)return out(false,"HTTPS_SAME_ORIGIN_SERVER_REQUIRED");
  const secret=b64(crypto.getRandomValues(new Uint8Array(32)));
  const cookieSid=hex(crypto.getRandomValues(new Uint8Array(16)));
  const digest=await sessionSecretDigestForLab(secret);
  return this.#finish({accountId,sessionId,response},now,{
   secret,cookieSid,digest,origin:this.#origin
  });
 }
 async #finish({accountId,sessionId,response},now,issuance){
  if(!ACCOUNT.test(accountId||"")||!SID.test(sessionId||"")||
     !Number.isSafeInteger(now)||now<=0||!response||
     response.type!=="public-key"||!ID.test(response.id||""))
   return out(false,"FINISH_CONTEXT_INVALID");
  let pendingRow,record;
  try{
   const rows=this.#sql.exec(
    "SELECT * FROM ezero_v1_auth_pending_lab WHERE session_id=? AND account_id=?",
    sessionId,accountId).toArray();
   pendingRow=rows[0];
   if(!pendingRow||pendingRow.purpose!=="WEBAUTHN_AUTHENTICATE"||
      pendingRow.consumed_at!==null||pendingRow.issued>now||
      pendingRow.expires<=now||pendingRow.expires-pendingRow.issued>TTL_MS||
      pendingRow.credential_id!==response.id)
    return out(false,"CHALLENGE_EXPIRED_REPLAYED_OR_UNBOUND");
   record=this.#record(accountId,pendingRow.credential_id);
   if(!record||record.revoked)return out(false,"CREDENTIAL_REVOKED_OR_UNKNOWN");
  }catch(_){return out(false,"REGISTRY_UNAVAILABLE");}
  let challengeFromBrowser;
  try{
   const raw=response.response?.clientDataJSON;
   if(typeof raw!=="string"||!B64.test(raw)||raw.length>8192)
    throw Error("INVALID_CLIENT_DATA");
   const decoded=atob(raw.replace(/-/g,"+").replace(/_/g,"/")+
    "=".repeat((4-raw.length%4)%4));
   const data=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(
    Uint8Array.from(decoded,c=>c.charCodeAt(0))));
   challengeFromBrowser=data?.challenge;
   const hash=await digestChallenge(challengeFromBrowser);
   if(hash!==pendingRow.challenge_digest)
    return out(false,"CHALLENGE_MISMATCH");
  }catch(_){return out(false,"INVALID_CLIENT_DATA");}
  const checked=await verifyAuthenticationResponseLabV1({
   response,
   pending:{
    accountId,challenge:challengeFromBrowser,
    allowedCredentials:[record.credentialId],
    issued:pendingRow.issued,expires:pendingRow.expires,
    purpose:"WEBAUTHN_AUTHENTICATE",consumed:false
   },
   credentialRecord:record,serverAccountId:accountId,now
  });
  if(!checked.ok)return out(false,checked.code);
  const next=checked.nextSignCount,previous=record.signCount;
  if(!Number.isSafeInteger(next)||next<0||next>0xffffffff||
     (next!==0||previous!==0)&&next<=previous)
   return out(false,"COUNTER_ROLLBACK_REJECTED");
  // A successful crypto check is NOT atomic with the database read. The
  // transaction below checks the same record and challenge state AGAIN,
  // and updates BOTH the counter and the challenge together; concurrent
  // assertions can never both commit.
  try{
   return this.#tx(()=>{
    const counter=this.#sql.exec(`UPDATE ezero_v1_auth_credentials_lab
      SET sign_count=?,version=version+1
      WHERE account_id=? AND credential_id=? AND status='ACTIVE'
       AND revoked=0 AND sign_count=?
      RETURNING credential_id`,
      next,accountId,record.credentialId,previous).toArray();
    if(counter.length!==1)throw Error("COUNTER_CHANGED");
    const used=this.#sql.exec(`UPDATE ezero_v1_auth_pending_lab SET consumed_at=?
      WHERE session_id=? AND account_id=? AND credential_id=?
       AND challenge_digest=? AND purpose='WEBAUTHN_AUTHENTICATE'
       AND consumed_at IS NULL AND issued<=? AND expires>?
      RETURNING session_id`,
      now,sessionId,accountId,record.credentialId,
      pendingRow.challenge_digest,now,now).toArray();
    if(used.length!==1)throw Error("CHALLENGE_ALREADY_USED");
    if(issuance){
     // Test-only account fixture cannot be forged using browser flags; the
     // sole owner-verification/onboarding service is not implemented.
     const account=this.#sql.exec(`SELECT status FROM
      ezero_v1_auth_accounts_lab WHERE account_id=?`,
      accountId).toArray()[0];
     if(!account||account.status!=="PREVERIFIED_LAB_ONLY")
      throw Error("UNVERIFIED_ACCOUNT");
     this.#sql.exec(`INSERT INTO ezero_v1_sessions_guard_lab
       (sid,secret_digest,account_id,credential_id,issued,expires,seen_at,
        origin,scope,revoked_at)
       VALUES(?,?,?,?,?,?,?,?,'ACCOUNT_OBSERVE_ONLY',NULL)`,
       issuance.cookieSid,issuance.digest,accountId,record.credentialId,
       now,now+SESSION_LAB_MAX_MS,now,issuance.origin);
     return out(true,"PASSKEY_AND_OBSERVE_ONLY_SESSION_ATOMIC_LAB",{
      challengeConsumed:true,counterPersisted:true,nextSignCount:next,
      // This header belongs ONLY in a trusted same-origin HTTPS Set-Cookie
      // response, NEVER JSON, localStorage, a QR, log or a redirect URL.
      serverOnlySetCookie:SESSION_LAB_COOKIE+"="+issuance.cookieSid+"."+
       issuance.secret+"; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=900",
      authenticatedSessionIssued:false,
      observationOnlySessionStored:true
     });
    }
    return out(true,"PASSKEY_CRYPTO_AND_ATOMIC_CONSUME_LAB",{
     challengeConsumed:true,counterPersisted:true,
     nextSignCount:next
    });
   });
  }catch(_){return out(false,"ATOMIC_COMMIT_REJECTED");}
 }
 // No enrollment, account session issuance, trusted device activation,
 // remote call invitation or OBD capability is exposed by this class.
}
