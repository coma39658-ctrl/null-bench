/*
 * E-ZERO Secure Pair V1 — account + bilateral device EVIDENCE JOIN, LAB ONLY.
 * NO public worker route, login cookie, call grant or device activation.
 *
 * Requires all tables on the SAME SQLite Durable Object storage: a preverified
 * test account, real WebAuthn assertion whose nonce was atomically consumed,
 * two individually signed device approvals, and two pending/unrevoked
 * registered public keys. Every source of truth is read from server SQLite.
 *
 * Crucial: this is evidence correlation, NOT authorization. This class never
 * accepts client-supplied proof booleans, cannot promote a device to ACTIVE,
 * and ALWAYS returns authorized:false/trusted:false.
 *
 * A later reviewed service must add real owner account verification, session
 * cookies/CSRF/binding, QR one-time consume, atomic trust activation and full
 * revocation propagation. Lab fixtures are NOT production identities.
 */
const ID=/^[A-Za-z0-9_-]{12,64}$/;
const SID=/^[a-f0-9]{32}$/;
const MAX_AUTH_AGE_MS=90_000;
function answer(ok,code,extra={}){
 return Object.freeze({ok,code,authorized:false,trusted:false,
  accountSessionIssued:false,...extra});
}
export class PairV1TrustCandidateSqliteLab{
 #s;#tx;
 constructor(storage){
  if(typeof storage?.sql?.exec!=="function"||
     typeof storage?.transactionSync!=="function")
   throw Error("SQLITE_TRANSACTION_REQUIRED");
  this.#s=storage.sql;
  this.#tx=storage.transactionSync.bind(storage);
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_pair_v1_candidate_lab (
    pair_sid TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    auth_session_id TEXT NOT NULL UNIQUE,
    a_device_id TEXT NOT NULL,
    b_device_id TEXT NOT NULL,
    recorded_at INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state='EVIDENCE_PRESENT_NO_TRUST')
  )`);
 }
 #check({accountId,pairSid,authSessionId,aDeviceId,bDeviceId},now){
  const account=this.#s.exec(`SELECT account_id,status FROM
   ezero_v1_auth_accounts_lab WHERE account_id=?`,
   accountId).toArray()[0];
  if(!account||account.status!=="PREVERIFIED_LAB_ONLY")
   return "ACCOUNT_UNKNOWN_OR_REVOKED";
  const used=this.#s.exec(`SELECT credential_id,consumed_at,issued,expires
   FROM ezero_v1_auth_pending_lab WHERE session_id=?
    AND account_id=? AND purpose='WEBAUTHN_AUTHENTICATE'`,
   authSessionId,accountId).toArray()[0];
  if(!used||!Number.isSafeInteger(used.consumed_at)||
     used.consumed_at<used.issued||used.consumed_at>=used.expires||
     used.consumed_at>now||now-used.consumed_at>MAX_AUTH_AGE_MS)
   return "FRESH_CONSUMED_PASSKEY_REQUIRED";
  const credential=this.#s.exec(`SELECT status,revoked
   FROM ezero_v1_auth_credentials_lab
   WHERE account_id=? AND credential_id=?`,
   accountId,used.credential_id).toArray()[0];
  if(!credential||credential.status!=="ACTIVE"||credential.revoked!==0)
   return "PASSKEY_REVOKED_OR_UNKNOWN";
  const proof=this.#s.exec(`SELECT *
   FROM ezero_pair_v1_signed_approvals WHERE sid=? AND account_id=?`,
   pairSid,accountId).toArray()[0];
  if(!proof||proof.stage!=="BOTH_SIGNED_UNAUTHORIZED"||
     !Number.isSafeInteger(proof.a_signed_at)||
     !Number.isSafeInteger(proof.b_signed_at)||
     proof.rejected_at!==null||
     proof.issued>now||proof.expires<=now||
     proof.a_signed_at<proof.issued||proof.a_signed_at>=proof.expires||
     proof.b_signed_at<proof.issued||proof.b_signed_at>=proof.expires||
     proof.a_key_hash===proof.b_key_hash)
   return "DUAL_SIGNED_UNEXPIRED_APPROVALS_REQUIRED";
  const a=this.#s.exec(`SELECT status,key_hash FROM
   ezero_pair_v1_device_records WHERE account_id=? AND device_id=?`,
   accountId,aDeviceId).toArray()[0];
  const b=this.#s.exec(`SELECT status,key_hash FROM
   ezero_pair_v1_device_records WHERE account_id=? AND device_id=?`,
   accountId,bDeviceId).toArray()[0];
  if(!a||!b||a.status!=="PENDING"||b.status!=="PENDING"||
     a.key_hash!==proof.a_key_hash||b.key_hash!==proof.b_key_hash)
   return "DEVICE_KEYS_REVOKED_OR_UNBOUND";
  // This record is only an audit note that all lab evidence was correlated.
  // It may NOT be treated as an authenticated session or access token.
  return null;
 }
 recordEvidenceCandidate({
  accountId,pairSid,authSessionId,aDeviceId,bDeviceId
 }={},now=Date.now()){
  if(!ID.test(accountId||"")||!SID.test(pairSid||"")||
     !SID.test(authSessionId||"")||!ID.test(aDeviceId||"")||
     !ID.test(bDeviceId||"")||aDeviceId===bDeviceId||
     !Number.isSafeInteger(now)||now<=0)
   return answer(false,"CANDIDATE_CONTEXT_INVALID");
  try{
   return this.#tx(()=>{
    const context={accountId,pairSid,authSessionId,aDeviceId,bDeviceId};
    const reason=this.#check(context,now);
    if(reason)return answer(false,reason);
    // Both IDs are unique: neither a QR nor one passkey event can be
    // replayed to create multiple evidence candidates.
    const rows=this.#s.exec(`INSERT OR IGNORE INTO
     ezero_pair_v1_candidate_lab
     (pair_sid,account_id,auth_session_id,a_device_id,b_device_id,
      recorded_at,state) VALUES(?,?,?,?,?,?,'EVIDENCE_PRESENT_NO_TRUST')
     RETURNING pair_sid`,
     pairSid,accountId,authSessionId,aDeviceId,bDeviceId,now).toArray();
    return rows.length===1?
     answer(true,"LAB_EVIDENCE_CORRELATED_NO_AUTHORITY",{
      stage:"EVIDENCE_PRESENT_NO_TRUST"}):
     answer(false,"CANDIDATE_ALREADY_RECORDED");
   });
  }catch(_){return answer(false,"CANDIDATE_LEDGER_UNAVAILABLE");}
 }
 inspectCandidate({accountId,pairSid}={},now=Date.now()){
  if(!ID.test(accountId||"")||!SID.test(pairSid||"")||
     !Number.isSafeInteger(now)||now<=0)
   return answer(false,"CANDIDATE_CONTEXT_INVALID");
  try{
   return this.#tx(()=>{
    const saved=this.#s.exec(`SELECT *
     FROM ezero_pair_v1_candidate_lab WHERE pair_sid=? AND account_id=?`,
     pairSid,accountId).toArray()[0];
    if(!saved)return answer(false,"CANDIDATE_NOT_FOUND");
    const reason=this.#check({
     accountId,pairSid,authSessionId:saved.auth_session_id,
     aDeviceId:saved.a_device_id,bDeviceId:saved.b_device_id
    },now);
    return reason?answer(false,reason):
     answer(true,"LAB_EVIDENCE_STILL_PRESENT_NO_AUTHORITY",{
      stage:saved.state});
   });
  }catch(_){return answer(false,"CANDIDATE_LEDGER_UNAVAILABLE");}
 }
 // No activateTrustedDevice(), issueSession(), reconnect() or ECU method.
}
