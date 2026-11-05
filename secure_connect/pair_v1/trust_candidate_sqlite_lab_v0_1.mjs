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
 #s;#tx;#serverOrigin;
 constructor(storage,{serverOrigin=null}={}){
  if(typeof storage?.sql?.exec!=="function"||
     typeof storage?.transactionSync!=="function")
   throw Error("SQLITE_TRANSACTION_REQUIRED");
  this.#s=storage.sql;
  this.#tx=storage.transactionSync.bind(storage);
  this.#serverOrigin=null;
  if(serverOrigin!==null){
   try{
    const u=new URL(serverOrigin);
    if(u.protocol!=="https:"||u.username||u.password||
       u.pathname!=="/"||u.search||u.hash)
     throw Error("INVALID_ORIGIN");
    this.#serverOrigin=u.origin;
   }catch(_){throw Error("HTTPS_SAME_ORIGIN_SERVER_REQUIRED");}
  }
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_pair_v1_candidate_lab (
    pair_sid TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    auth_session_id TEXT NOT NULL UNIQUE,
    a_device_id TEXT NOT NULL,
    b_device_id TEXT NOT NULL,
    recorded_at INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state='EVIDENCE_PRESENT_NO_TRUST')
  )`);
  // This separate, stricter evidence ledger ONLY records that a server-
  // issued QR was consumed atomically with a full (non-authorizing) join.
  // The old candidate ledger can never substitute for this QR ledger.
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_pair_v1_qr_consumed_evidence_lab (
    pair_sid TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    auth_session_id TEXT NOT NULL UNIQUE,
    a_device_id TEXT NOT NULL,
    b_device_id TEXT NOT NULL,
    consumed_at INTEGER NOT NULL,
    state TEXT NOT NULL CHECK(state='QR_BURNED_NO_TRUST')
  )`);
  // Strict provenance link: one observation session cannot be re-used to
  // join multiple QR enrollments. No public device/call authority exists.
  this.#s.exec(`CREATE TABLE IF NOT EXISTS ezero_pair_v1_session_qr_link_lab (
    pair_sid TEXT PRIMARY KEY,
    server_session_sid TEXT NOT NULL UNIQUE,
    auth_session_id TEXT NOT NULL UNIQUE,
    account_id TEXT NOT NULL
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
 /*
  * A deliberately separate, HIGHER assurance evidence route. Never call this
  * from a browser body: the preverified account, fresh consumed Passkey,
  * checked P-256 approval ledger and staged device key records MUST already
  * exist in server-owned SQLite on this *same* Durable Object. The QR ledger
  * is minted by a trusted server; neither its nonce nor "verified" boolean
  * is accepted from a browser.
  *
  * Both the single-use QR consume and durable evidence record are ONE SQLite
  * transaction. Any collision or database failure rolls back both. This
  * explicitly DOES NOT activate a Trusted Device or authorize a call.
  */
 recordEvidenceAndConsumeEnrollmentQrLab({
  accountId,pairSid,authSessionId,aDeviceId,bDeviceId
 }={},now=Date.now()){
  return this.#consumeQrEvidence({
   accountId,pairSid,authSessionId,aDeviceId,bDeviceId
  },now,null);
 }
 // Stronger evidence-only method: server Session is mandatory but NEVER
 // becomes account/call/Trusted Device authorization.
 recordSessionBoundEnrollmentQrEvidenceLab({
  accountId,pairSid,authSessionId,aDeviceId,bDeviceId,serverSessionSid
 }={},now=Date.now()){
  if(!SID.test(serverSessionSid||"")||!this.#serverOrigin)
   return answer(false,"SERVER_OBSERVATION_SESSION_REQUIRED");
  return this.#consumeQrEvidence({
   accountId,pairSid,authSessionId,aDeviceId,bDeviceId
  },now,serverSessionSid);
 }
 #consumeQrEvidence({
  accountId,pairSid,authSessionId,aDeviceId,bDeviceId
 }={},now=Date.now(),serverSessionSid=null){
  if(!ID.test(accountId||"")||!SID.test(pairSid||"")||
     !SID.test(authSessionId||"")||!ID.test(aDeviceId||"")||
     !ID.test(bDeviceId||"")||aDeviceId===bDeviceId||
     !Number.isSafeInteger(now)||now<=0)
   return answer(false,"ENROLLMENT_CONTEXT_INVALID");
  try{
   return this.#tx(()=>{
    const ctx={accountId,pairSid,authSessionId,aDeviceId,bDeviceId};
    const reason=this.#check(ctx,now);
    if(reason)return answer(false,reason);
    if(serverSessionSid!==null){
     // Both the observation session and its proven passkey issuance must
     // be server-side, current, and associated with THIS consumed challenge.
     const session=this.#s.exec(`SELECT account_id,credential_id,
       issued,expires,seen_at,origin,scope,revoked_at
       FROM ezero_v1_sessions_guard_lab WHERE sid=?`,
       serverSessionSid).toArray()[0];
     const link=this.#s.exec(`SELECT auth_session_id,account_id,
       credential_id,linked_at FROM ezero_v1_session_auth_link_lab
       WHERE sid=?`,serverSessionSid).toArray()[0];
     const auth=this.#s.exec(`SELECT credential_id,consumed_at FROM
       ezero_v1_auth_pending_lab WHERE session_id=? AND account_id=?
       AND purpose='WEBAUTHN_AUTHENTICATE'`,
       authSessionId,accountId).toArray()[0];
     if(!session||!link||!auth||
        session.account_id!==accountId||
        link.account_id!==accountId||
        session.credential_id!==auth.credential_id||
        link.credential_id!==auth.credential_id||
        link.auth_session_id!==authSessionId||
        link.linked_at!==auth.consumed_at||
        session.issued!==link.linked_at||
        session.origin!==this.#serverOrigin||
        session.scope!=="ACCOUNT_OBSERVE_ONLY"||
        session.revoked_at!==null||
        !Number.isSafeInteger(session.issued)||
        !Number.isSafeInteger(session.expires)||
        !Number.isSafeInteger(session.seen_at)||
        session.issued>now||session.expires<=now||
        session.expires<=session.issued||
        session.expires-session.issued>15*60_000||
        session.seen_at<session.issued||session.seen_at>now||
        now-session.seen_at>=5*60_000)
      return answer(false,"OBSERVATION_SESSION_REVOKED_EXPIRED_OR_UNBOUND");
    }
    // Bind the QR to precisely the same signed session transcript AND the
    // same registered credential that verified the WebAuthn assertion.
    const proof=this.#s.exec(`SELECT nonce_digest,issued,expires
      FROM ezero_pair_v1_signed_approvals
      WHERE sid=? AND account_id=? AND stage='BOTH_SIGNED_UNAUTHORIZED'`,
      pairSid,accountId).toArray()[0];
    const webauthn=this.#s.exec(`SELECT credential_id,consumed_at
      FROM ezero_v1_auth_pending_lab WHERE session_id=?
      AND account_id=? AND purpose='WEBAUTHN_AUTHENTICATE'`,
      authSessionId,accountId).toArray()[0];
    const qr=this.#s.exec(`SELECT nonce_digest,credential_id,issued,expires,
      consumed_at,purpose FROM ezero_pair_v1_challenges
      WHERE session_id=? AND account_id=?`,
      pairSid,accountId).toArray()[0];
    if(!proof||!webauthn||!qr||qr.purpose!=="PAIR_OR_RECONNECT"||
       qr.consumed_at!==null||qr.nonce_digest!==proof.nonce_digest||
       qr.credential_id!==webauthn.credential_id||
       qr.issued!==proof.issued||qr.expires!==proof.expires||
       qr.expires<=now||qr.issued>now)
     return answer(false,"SERVER_ENROLLMENT_QR_INVALID_OR_REPLAYED");
    const updated=this.#s.exec(`UPDATE ezero_pair_v1_challenges
      SET consumed_at=? WHERE session_id=? AND account_id=?
      AND credential_id=? AND nonce_digest=? AND purpose='PAIR_OR_RECONNECT'
      AND issued=? AND expires=? AND consumed_at IS NULL
      AND issued<=? AND expires>?
      RETURNING session_id`,
      now,pairSid,accountId,webauthn.credential_id,
      proof.nonce_digest,proof.issued,proof.expires,now,now).toArray();
    if(updated.length!==1)throw Error("QR_ALREADY_CONSUMED");
    // Never use INSERT OR IGNORE here: silently ignoring a duplicate
    // after burning the QR would create a partial success.
    const saved=this.#s.exec(`INSERT INTO
      ezero_pair_v1_qr_consumed_evidence_lab
      (pair_sid,account_id,auth_session_id,a_device_id,b_device_id,
       consumed_at,state) VALUES(?,?,?,?,?,?,'QR_BURNED_NO_TRUST')
      RETURNING pair_sid`,pairSid,accountId,authSessionId,
      aDeviceId,bDeviceId,now).toArray();
    if(saved.length!==1)throw Error("EVIDENCE_WRITE_FAILED");
    if(serverSessionSid!==null){
     this.#s.exec(`INSERT INTO ezero_pair_v1_session_qr_link_lab
       (pair_sid,server_session_sid,auth_session_id,account_id)
       VALUES(?,?,?,?)`,pairSid,serverSessionSid,authSessionId,accountId);
    }
    return answer(true,"ENROLLMENT_QR_CONSUMED_EVIDENCE_ONLY",{
      stage:"QR_BURNED_NO_TRUST",pairQrConsumed:true});
   });
  }catch(_){return answer(false,"ENROLLMENT_ATOMIC_COMMIT_REJECTED");}
 }
 inspectConsumedEnrollmentQrLab({accountId,pairSid}={},now=Date.now()){
  if(!ID.test(accountId||"")||!SID.test(pairSid||"")||
     !Number.isSafeInteger(now)||now<=0)
   return answer(false,"ENROLLMENT_CONTEXT_INVALID");
  try{
   return this.#tx(()=>{
    const row=this.#s.exec(`SELECT * FROM
     ezero_pair_v1_qr_consumed_evidence_lab
     WHERE pair_sid=? AND account_id=?`,
     pairSid,accountId).toArray()[0];
    if(!row)return answer(false,"ENROLLMENT_EVIDENCE_NOT_FOUND");
    const reason=this.#check({
     accountId,pairSid,authSessionId:row.auth_session_id,
     aDeviceId:row.a_device_id,bDeviceId:row.b_device_id
    },now);
    if(reason)return answer(false,reason);
    const qr=this.#s.exec(`SELECT consumed_at FROM
      ezero_pair_v1_challenges WHERE session_id=? AND account_id=?`,
      pairSid,accountId).toArray()[0];
    if(!qr||qr.consumed_at!==row.consumed_at)
     return answer(false,"QR_CONSUMPTION_AUDIT_MISMATCH");
    return answer(true,"ENROLLMENT_EVIDENCE_PRESENT_NO_AUTHORITY",{
     stage:row.state,pairQrConsumed:true});
   });
  }catch(_){return answer(false,"ENROLLMENT_LEDGER_UNAVAILABLE");}
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
