/*
 * E-ZERO Secure Pair V1 — restricted account session VALIDATION lab.
 *
 * NOT a login issuer. No API mints a token or inserts an authenticated session.
 * Tests may seed a synthetic token verifier directly via SQL; production
 * issuance must happen INSIDE the reviewed atomic WebAuthn assertion commit,
 * and only after independent account ownership/recovery is implemented.
 *
 * The session cookie is host-only, Secure, HttpOnly, SameSite=Strict, no Domain;
 * it MUST be set by a SAME-ORIGIN trusted server, not cross-site GitHub Pages.
 * A separate Cloudflare workers.dev origin cannot set a github.io host cookie.
 * This module never grants an authenticated call or trusted device, even
 * after a session verifies: authorized:false in every return.
 */
const ACCOUNT=/^[A-Za-z0-9_-]{12,64}$/;
const SID=/^[a-f0-9]{32}$/;
const CRED=/^[A-Za-z0-9_-]{16,256}$/;
const SECRET=/^[A-Za-z0-9_-]{43}$/;
const HASH=/^[a-f0-9]{64}$/;
export const SESSION_LAB_MAX_MS=15*60_000;
export const SESSION_LAB_IDLE_MS=5*60_000;
export const SESSION_LAB_COOKIE="__Host-ezv1";
const prefix="E-ZERO-SESSION-V1:";
const csrfPrefix="E-ZERO-CSRF-V1:";
const denied=code=>Object.freeze({ok:false,code,authorized:false,trusted:false});
const accepted=code=>Object.freeze({ok:true,code,authorized:false,trusted:false});
function hex(bytes){return [...bytes].map(b=>b.toString(16).padStart(2,"0")).join("");}
function encode(b){let s="";for(const x of b)s+=String.fromCharCode(x);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decodeSecret(secret){
 if(typeof secret!=="string"||!SECRET.test(secret))throw Error("INVALID_SECRET");
 const raw=atob(secret.replace(/-/g,"+").replace(/_/g,"/")+"=");
 const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(bytes.length!==32||encode(bytes)!==secret)throw Error("INVALID_SECRET");
 return bytes;
}
export async function sessionSecretDigestForLab(secret){
 const bytes=decodeSecret(secret);
 const framed=new Uint8Array(new TextEncoder().encode(prefix).length+bytes.length);
 framed.set(new TextEncoder().encode(prefix));framed.set(bytes,prefix.length);
 return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",framed)));
}
export async function sessionCsrfDigestForLab(token){
 const bytes=decodeSecret(token);
 const label=new TextEncoder().encode(csrfPrefix);
 const framed=new Uint8Array(label.length+bytes.length);
 framed.set(label);framed.set(bytes,label.length);
 return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",framed)));
}
function cookieValue(header){
 if(typeof header!=="string"||header.length>4096)return null;
 const values=header.split(";").map(x=>x.trim())
  .filter(x=>x.startsWith(SESSION_LAB_COOKIE+"="))
  .map(x=>x.slice(SESSION_LAB_COOKIE.length+1));
 if(values.length!==1)return null;
 const [sid,secret,...rest]=values[0].split(".");
 if(rest.length||!SID.test(sid||"")||!SECRET.test(secret||""))
  return null;
 return {sid,secret};
}
function canonicalOrigin(raw){
 try{
  const url=new URL(raw);
  if(url.protocol!=="https:"||url.username||url.password||
    url.pathname!=="/"||url.search||url.hash)return null;
  return url.origin;
 }catch(_){return null;}
}
function policyCheck({origin,method,csrfToken,storedCsrfDigest,sessionOrigin}){
 if(origin!==sessionOrigin)return false;
 if(!["GET","POST","DELETE"].includes(method))return false;
 if(method!=="GET"){
  // Extra app-layer CSRF assertion is NOT provided by this module.
  // Mutations MUST use a separate synchronizer-token / Origin policy
  // in a reviewed request router. Lab refuses all mutating requests.
  return false;
 }
 return true;
}
export class PairV1SessionGuardSqliteLab{
 #s;#tx;#origin;
 constructor(storage,{serverOrigin}={}){
  if(typeof storage?.sql?.exec!=="function"||
     typeof storage?.transactionSync!=="function")
   throw Error("SQLITE_TRANSACTION_REQUIRED");
  const origin=canonicalOrigin(serverOrigin);
  if(!origin)throw Error("HTTPS_SAME_ORIGIN_SERVER_REQUIRED");
  this.#s=storage.sql;this.#tx=storage.transactionSync.bind(storage);
  this.#origin=origin;
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_v1_sessions_guard_lab (
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
  // Independent synchronizer token, NOT a browser cookie or URL token.
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_v1_session_csrf_lab (
   sid TEXT PRIMARY KEY,
   csrf_digest TEXT NOT NULL UNIQUE,
   created_at INTEGER NOT NULL
  )`);
 }
 async inspect({
  cookieHeader,origin,method="GET",now=Date.now()
 }={}){
  if(!Number.isSafeInteger(now)||now<=0||
     !policyCheck({origin,method,sessionOrigin:this.#origin}))
   return denied("REQUEST_ORIGIN_OR_METHOD_REJECTED");
  const parsed=cookieValue(cookieHeader);
  if(!parsed)return denied("SESSION_COOKIE_REJECTED");
  let digest;
  try{digest=await sessionSecretDigestForLab(parsed.secret);}
  catch(_){return denied("SESSION_COOKIE_REJECTED");}
  try{
   // Even successful match does not grant trusted-device or calling access.
   return this.#tx(()=>{
    const row=this.#s.exec(`SELECT * FROM ezero_v1_sessions_guard_lab
      WHERE sid=?`,parsed.sid).toArray()[0];
    if(!row||row.secret_digest!==digest||!HASH.test(row.secret_digest)||
       row.scope!=="ACCOUNT_OBSERVE_ONLY"||
       row.origin!==this.#origin||row.revoked_at!==null||
       !Number.isSafeInteger(row.issued)||!Number.isSafeInteger(row.expires)||
       !Number.isSafeInteger(row.seen_at)||row.issued>now||
       row.expires<=now||row.expires<=row.issued||
       row.expires-row.issued>SESSION_LAB_MAX_MS||
       row.seen_at<row.issued||row.seen_at>now||
       now-row.seen_at>=SESSION_LAB_IDLE_MS)
     return denied("SESSION_EXPIRED_REVOKED_OR_UNKNOWN");
    if(!ACCOUNT.test(row.account_id)||!CRED.test(row.credential_id))
     return denied("SESSION_ACCOUNT_BINDING_INVALID");
    const account=this.#s.exec(`SELECT status FROM ezero_v1_auth_accounts_lab
      WHERE account_id=?`,row.account_id).toArray()[0];
    const credential=this.#s.exec(`SELECT status,revoked FROM
      ezero_v1_auth_credentials_lab
      WHERE account_id=? AND credential_id=?`,
      row.account_id,row.credential_id).toArray()[0];
    if(!account||account.status!=="PREVERIFIED_LAB_ONLY"||
       !credential||credential.status!=="ACTIVE"||credential.revoked!==0)
     return denied("ACCOUNT_OR_PASSKEY_REVOKED");
    return accepted("SESSION_OBSERVED_ONLY_NO_AUTHORITY");
   });
  }catch(_){return denied("SESSION_LEDGER_UNAVAILABLE");}
 }
 // The ONLY client-triggered mutation in the isolated lab is a
 // same-origin CSRF-confirmed logout of the requesting session. It does not
 // authorize calling, pairing or any other write.
 async logoutOwnSessionWithCsrfLab({
  cookieHeader,csrfToken,origin,method="POST",now=Date.now()
 }={}){
  if(origin!==this.#origin||method!=="POST"||
     !Number.isSafeInteger(now)||now<=0)
   return denied("LOGOUT_ORIGIN_OR_METHOD_REJECTED");
  const parsed=cookieValue(cookieHeader);
  if(!parsed)return denied("SESSION_COOKIE_REJECTED");
  let secretDigest,csrfDigest;
  try{
   [secretDigest,csrfDigest]=await Promise.all([
    sessionSecretDigestForLab(parsed.secret),
    sessionCsrfDigestForLab(csrfToken)
   ]);
  }catch(_){return denied("LOGOUT_CREDENTIAL_OR_CSRF_INVALID");}
  try{
   return this.#tx(()=>{
    const row=this.#s.exec(`SELECT * FROM ezero_v1_sessions_guard_lab
     WHERE sid=?`,parsed.sid).toArray()[0];
    const csrf=this.#s.exec(`SELECT csrf_digest FROM ezero_v1_session_csrf_lab
     WHERE sid=?`,parsed.sid).toArray()[0];
    if(!row||!csrf||row.secret_digest!==secretDigest||
       csrf.csrf_digest!==csrfDigest||row.revoked_at!==null||
       row.scope!=="ACCOUNT_OBSERVE_ONLY"||row.origin!==this.#origin||
       row.issued>now||row.expires<=now||
       row.expires-row.issued>SESSION_LAB_MAX_MS||
       row.seen_at<row.issued||row.seen_at>now||
       now-row.seen_at>=SESSION_LAB_IDLE_MS)
     return denied("SESSION_EXPIRED_REVOKED_OR_UNKNOWN");
    const account=this.#s.exec(`SELECT status FROM ezero_v1_auth_accounts_lab
     WHERE account_id=?`,row.account_id).toArray()[0];
    const credential=this.#s.exec(`SELECT status,revoked FROM
     ezero_v1_auth_credentials_lab
     WHERE account_id=? AND credential_id=?`,
     row.account_id,row.credential_id).toArray()[0];
    if(!account||account.status!=="PREVERIFIED_LAB_ONLY"||
       !credential||credential.status!=="ACTIVE"||credential.revoked!==0)
     return denied("ACCOUNT_OR_PASSKEY_REVOKED");
    const result=this.#s.exec(`UPDATE ezero_v1_sessions_guard_lab
     SET revoked_at=? WHERE sid=? AND secret_digest=? AND revoked_at IS NULL
     RETURNING sid`,now,parsed.sid,secretDigest).toArray();
    if(result.length!==1)return denied("SESSION_EXPIRED_REVOKED_OR_UNKNOWN");
    return Object.freeze({
     ok:true,code:"OWN_SESSION_REVOKED_WITH_CSRF_LAB",
     authorized:false,trusted:false,
     // Only a future server-side HTTPS response may emit this header.
     serverOnlyClearCookie:SESSION_LAB_COOKIE+
      "=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0"
    });
   });
  }catch(_){return denied("LOGOUT_LEDGER_UNAVAILABLE");}
 }
 // Logout is server-side invalidation, not just removal of a browser cookie.
 // This accepts only a server-trusted SID, NOT an unauthenticated client SID.
 revokeTrustedServerSide(sid,now=Date.now()){
  if(!SID.test(sid||"")||!Number.isSafeInteger(now)||now<=0)
   return denied("REVOCATION_CONTEXT_INVALID");
  try{
   return this.#tx(()=>{
    const found=this.#s.exec(`UPDATE ezero_v1_sessions_guard_lab
     SET revoked_at=? WHERE sid=? AND revoked_at IS NULL
     RETURNING sid`,now,sid).toArray();
    return found.length===1?
     accepted("SESSION_REVOKED_LAB"):
     denied("SESSION_NOT_FOUND_OR_ALREADY_REVOKED");
   });
  }catch(_){return denied("SESSION_LEDGER_UNAVAILABLE");}
 }
 // No createSession(), no cookie response and no general write permission.
}
