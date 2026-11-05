/*
 * Synthetic passkey registration → COSE storage shape → genuine ES256 login.
 * Uses SimpleWebAuthn verification for BOTH ceremonies. Not a real phone.
 * Never issues authenticated account session or trusted device admission.
 */
import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {PairV1SqliteAtomicPasskeyFinishLab}
 from "../secure_connect/pair_v1/passkey_atomic_finish_sqlite_lab_v0_1.mjs";
import {PairV1SqliteAtomicPasskeyRegistrationLab}
 from "../secure_connect/pair_v1/passkey_registration_atomic_sqlite_lab_v0_1.mjs";
import {PairV1TrustCandidateSqliteLab}
 from "../secure_connect/pair_v1/trust_candidate_sqlite_lab_v0_1.mjs";
import {PairV1SessionGuardSqliteLab,SESSION_LAB_COOKIE}
 from "../secure_connect/pair_v1/account_session_guard_sqlite_lab_v0_1.mjs";
import {PairV1PendingDeviceRegistryLab}
 from "../secure_connect/pair_v1/trusted_device_sqlite_lab_v0_1.mjs";
import {PairV1MutualApprovalSqliteLab}
 from "../secure_connect/pair_v1/mutual_approval_sqlite_lab_v0_1.mjs";
import {PairV1SqliteChallengeLedgerLab}
 from "../secure_connect/pair_v1/pair_challenge_sqlite_lab_v0_1.mjs";
import {pairApprovalText}
 from "../secure_connect/pair_v1/pair_policy_v1.mjs";
import {makeRegistrationOptionsLab,verifyRegistrationResponseLab}
 from "../secure_connect/pair_v1/webauthn_registration_library_lab_v0_1.mjs";
import {makeAuthenticationOptionsLabV1,verifyAuthenticationResponseLabV1}
 from "../secure_connect/pair_v1/webauthn_authentication_library_lab_v0_1.mjs";
import {PAIR_V1_ORIGIN,PAIR_V1_RP_ID}
 from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const te=new TextEncoder();
const u8=a=>new Uint8Array(a);
const b64=b=>{let x="";for(const n of b)x+=String.fromCharCode(n);
 return btoa(x).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const decode=s=>u8(Uint8Array.from(atob(s.replace(/-/g,"+")
 .replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0)));
function header(major,n){
 if(n<24)return[major*32+n];
 if(n<256)return[major*32+24,n];
 if(n<65536)return[major*32+25,n>>8,n&255];
 throw Error("CBOR_LENGTH_UNSUPPORTED");
}
function cbor(x){
 if(Number.isInteger(x))return x<0?header(1,-1-x):header(0,x);
 if(typeof x==="string"){const raw=te.encode(x);return [...header(3,raw.length),...raw];}
 if(x instanceof Uint8Array)return [...header(2,x.length),...x];
 if(x instanceof Map){
  let out=header(5,x.size);
  for(const [k,v] of x)out.push(...cbor(k),...cbor(v));
  return out;
 }
 throw Error("CBOR_UNSUPPORTED_TYPE");
}
function derInt(raw){
 let i=0;while(i<raw.length-1&&raw[i]===0)i++;
 const r=raw.slice(i),v=(r[0]&128)?u8([0,...r]):r;
 return u8([2,v.length,...v]);
}
function toDer(raw){const a=derInt(raw.slice(0,32)),b=derInt(raw.slice(32));
 return u8([0x30,a.length+b.length,...a,...b]);
}
const hash=async x=>u8(await crypto.subtle.digest("SHA-256",x));
const rpHash=await hash(te.encode(PAIR_V1_RP_ID));
const now=Date.now(),accountId="account_test_001";
const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
 true,["sign","verify"]);
const evil=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
 true,["sign","verify"]);
const jwk=await crypto.subtle.exportKey("jwk",keys.publicKey);
const cose=u8(cbor(new Map([
 [1,2],[3,-7],[-1,1],[-2,decode(jwk.x)],[-3,decode(jwk.y)]
])));
const rawId=crypto.getRandomValues(new Uint8Array(32));
const id=b64(rawId),aaguid=new Uint8Array(16);
const created=await makeRegistrationOptionsLab({
 accountId,userHandle:crypto.getRandomValues(new Uint8Array(32)),now
});
assert.equal(created.ok,true);
const registrationChallenge=created.pending.challenge;
const registrationAuth=u8([...rpHash,0x45,0,0,0,1,...aaguid,
 0,rawId.length,...rawId,...cose]);
const attestation=u8(cbor(new Map([
 ["fmt","none"],["attStmt",new Map()],["authData",registrationAuth]
])));
const registrationClient=te.encode(JSON.stringify({
 type:"webauthn.create",challenge:registrationChallenge,
 origin:PAIR_V1_ORIGIN,crossOrigin:false
}));
const regRes={
 id,rawId:id,type:"public-key",
 response:{clientDataJSON:b64(registrationClient),
 attestationObject:b64(attestation),transports:["internal"]},
 clientExtensionResults:{},authenticatorAttachment:"platform"
};
const registration=await verifyRegistrationResponseLab({
 response:regRes,pending:created.pending,serverAccountId:accountId,now
});
assert.equal(registration.ok,true,registration.code);
assert.equal(registration.authorized,false);
const record={
 accountId,credentialId:id,publicKeyCoseB64:b64(registration.publicKeyCose),
 signCount:registration.counter,alg:-7,rpId:PAIR_V1_RP_ID,
 status:"ACTIVE",revoked:false,transports:["internal"]
};
assert.ok(record.publicKeyCoseB64.length>70);
const authOptions=await makeAuthenticationOptionsLabV1({
 accountId,registeredCredentials:[record],now
});
assert.equal(authOptions.ok,true,authOptions.code);
assert.equal(authOptions.options.rpId,PAIR_V1_RP_ID);
assert.equal(authOptions.options.userVerification,"required");
assert.deepEqual(authOptions.options.allowCredentials.map(c=>c.id),[id]);
async function assertion({
 origin=PAIR_V1_ORIGIN,challenge=authOptions.pending.challenge,
 rp=rpHash,flags=0x05,counter=2,signer=keys,type="webauthn.get",
 crossOrigin=false,addTopOrigin=false
}={}){
 const client=te.encode(JSON.stringify({
  type,challenge,origin,crossOrigin,
  ...(addTopOrigin?{topOrigin:"https://attacker.invalid"}:{})
 }));
 const authenticator=u8([...rp,flags,(counter>>>24)&255,
  (counter>>>16)&255,(counter>>>8)&255,counter&255]);
 const digest=await hash(client);
 const signed=u8([...authenticator,...digest]);
 const sig=u8(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
  signer.privateKey,signed));
 return {
  id,rawId:id,type:"public-key",
  response:{clientDataJSON:b64(client),authenticatorData:b64(authenticator),
   signature:b64(toDer(sig)),userHandle:null},
  clientExtensionResults:{}
 };
}
const validAssertion=await assertion();
const base={response:validAssertion,pending:authOptions.pending,
 credentialRecord:record,serverAccountId:accountId,now};
const result=await verifyAuthenticationResponseLabV1(base);
assert.equal(result.ok,true,JSON.stringify({code:result.code}));
assert.equal(result.authorized,false);
assert.equal(result.challengeConsumed,false);
assert.equal(result.counterPersisted,false);
assert.equal(result.authenticatedSessionIssued,false);
assert.equal(result.nextSignCount,2);
console.log("PASSKEY_REGISTRATION_COSE_TO_AUTHENTICATION_REAL_ES256_LIBRARY: PASS");
async function reject(override,expected){
 const r=await verifyAuthenticationResponseLabV1({...base,...override});
 assert.equal(r.ok,false,expected);
 assert.equal(r.authorized,false,expected);
 assert.equal(r.code,expected,JSON.stringify({actual:r.code,expected}));
}
await reject({response:await assertion({origin:"https://attacker.invalid"})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
await reject({response:await assertion({type:"webauthn.create"})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
await reject({response:await assertion({crossOrigin:true})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
await reject({response:await assertion({addTopOrigin:true})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
for(const opts of [
 {challenge:b64(crypto.getRandomValues(new Uint8Array(32)))},
 {rp:await hash(te.encode("attacker.invalid"))},
 {flags:0x01},{flags:0x04},
 {counter:1},{signer:evil}
])await reject({response:await assertion(opts)},"AUTH_SIGNATURE_OR_POLICY_INVALID");
await reject({pending:{...authOptions.pending,consumed:true}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({pending:{...authOptions.pending,expires:now}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({pending:{...authOptions.pending,purpose:"ECU_WRITE"}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({pending:{...authOptions.pending,allowedCredentials:["other"]}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({credentialRecord:{...record,status:"REVOKED"}},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({credentialRecord:{...record,revoked:true}},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({credentialRecord:{...record,accountId:"another_account"}},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({credentialRecord:{...record,publicKeyCoseB64:"INVALID!"}},
 "AUTH_SIGNATURE_OR_POLICY_INVALID");
await reject({serverAccountId:"attacker_account"},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({response:{...validAssertion,id:"wrong_credential"}},
 "AUTH_RESPONSE_INVALID");
await reject({response:{...validAssertion,rawId:"wrong_credential"}},
 "AUTH_RESPONSE_INVALID");
console.log("PASSKEY_ACCOUNT_ORIGIN_RPID_UV_SIGNATURE_REPLAY_REVOKE_ADVERSARIAL: PASS");
console.log("PASSKEY_LIBRARY_LAB_NO_REAL_LOGIN_COOKIE_OR_TRUSTED_DEVICE_PERMISSION: PASS");

/*
 * Durable integration: the validated COSE key is seeded into a TEST-ONLY
 * account registry, then the real SimpleWebAuthn verifier checks a challenge
 * read from the SQLite ledger. A single transaction commits the counter and
 * challenge together. Does NOT mint login tokens or activate trusted devices.
 */
const dir=mkdtempSync(join(tmpdir(),"ezero_v1_passkey_commit_"));
const path=join(dir,"auth.sqlite3");
const store=db=>({
 sql:{exec(sql,...args){
  const command=sql.trim();
  if(command.startsWith("CREATE TABLE")){db.exec(command);return{toArray:()=>[]};}
  const statement=db.prepare(command);
  if(command.startsWith("SELECT")||command.includes("RETURNING"))
   return {toArray:()=>statement.all(...args)};
  statement.run(...args);return {toArray:()=>[]};
 }},
 transactionSync(fn){
  db.exec("BEGIN IMMEDIATE");
  try{const r=fn();db.exec("COMMIT");return r;}
  catch(e){db.exec("ROLLBACK");throw e;}
 }
});
let db;
try{
 db=new DatabaseSync(path);
 let lab=new PairV1SqliteAtomicPasskeyFinishLab(store(db));
 // Only a server's independently verified credential-registration ceremony
 // may eventually perform this INSERT. This is trusted test fixture setup,
 // not a browser endpoint or enrollment method.
 db.prepare(`INSERT INTO ezero_v1_auth_credentials_lab
  (account_id,credential_id,cose_public_key,sign_count,alg,rp_id,
   transports_json,status,revoked,version)
  VALUES(?,?,?,?,?,?,?,?,0,1)`).run(
  accountId,id,record.publicKeyCoseB64,record.signCount,-7,PAIR_V1_RP_ID,
  '["internal"]',"ACTIVE"
 );
 const started=await lab.begin({accountId,credentialId:id},now);
 assert.equal(started.ok,true,started.code);
 assert.equal(started.authorized,false);
 assert.equal(started.expires-now,90_000);
 const signing={accountId,sessionId:started.sessionId,
  response:await assertion({challenge:started.options.challenge,counter:3})};
 const forged=await lab.finish({...signing,
  response:await assertion({challenge:started.options.challenge,
   counter:3,signer:evil})},now+15);
 assert.equal(forged.ok,false);
 const wrongAccount=await lab.finish({...signing,accountId:"another_account"},now+16);
 assert.equal(wrongAccount.ok,false);
 const badChallenge=await lab.finish({...signing,
  response:await assertion({challenge:b64(crypto.getRandomValues(new Uint8Array(32))),
   counter:3})},now+16);
 assert.equal(badChallenge.code,"CHALLENGE_MISMATCH");
 const untouched=db.prepare(
  "SELECT consumed_at FROM ezero_v1_auth_pending_lab WHERE session_id=?"
 ).get(started.sessionId);
 assert.equal(untouched.consumed_at,null);
 assert.equal(db.prepare(
  "SELECT sign_count FROM ezero_v1_auth_credentials_lab WHERE credential_id=?"
 ).get(id).sign_count,record.signCount);

 // Force the challenge update to fail AFTER the counter update has been
 // attempted, and verify SQLite rolls back BOTH changes. No partial auth.
 db.exec(`CREATE TRIGGER ezero_v1_lab_block_consume
  BEFORE UPDATE OF consumed_at ON ezero_v1_auth_pending_lab
  BEGIN SELECT RAISE(ABORT,'INJECTED_LEDGER_FAILURE'); END`);
 const aborted=await lab.finish(signing,now+17);
 assert.equal(aborted.code,"ATOMIC_COMMIT_REJECTED");
 assert.equal(db.prepare(
  "SELECT sign_count FROM ezero_v1_auth_credentials_lab WHERE credential_id=?"
 ).get(id).sign_count,record.signCount);
 assert.equal(db.prepare(
  "SELECT consumed_at FROM ezero_v1_auth_pending_lab WHERE session_id=?"
 ).get(started.sessionId).consumed_at,null);
 db.exec("DROP TRIGGER ezero_v1_lab_block_consume");

 const first=await lab.finish(signing,now+18);
 assert.equal(first.ok,true,first.code);
 assert.equal(first.code,"PASSKEY_CRYPTO_AND_ATOMIC_CONSUME_LAB");
 assert.equal(first.authorized,false);
 assert.equal(first.authenticatedSessionIssued,false);
 assert.equal(first.trustedDeviceActivated,false);
 assert.equal(first.challengeConsumed,true);
 assert.equal(first.counterPersisted,true);
 assert.equal(first.nextSignCount,3);
 assert.equal((await lab.finish(signing,now+19)).ok,false);
 db.close();
 db=new DatabaseSync(path);
 lab=new PairV1SqliteAtomicPasskeyFinishLab(store(db));
 assert.equal((await lab.finish(signing,now+20)).ok,false,
  "Replay must remain denied after restarting the SQLite ledger");
 console.log("PASSKEY_SQLITE_ATOMIC_COUNTER_AND_CHALLENGE_RESTART_REPLAY: PASS");

 const fresh=await lab.begin({accountId,credentialId:id},now+24);
 assert.equal(fresh.ok,true);
 const candidate={accountId,sessionId:fresh.sessionId,
  response:await assertion({challenge:fresh.options.challenge,counter:4})};
 // Multiple asynchronous verifications may finish before either writes.
 // Only ONE SQLite transaction is permitted to update this challenge.
 const outcomes=await Promise.all(
  Array.from({length:20},()=>lab.finish(candidate,now+28)));
 assert.equal(outcomes.filter(r=>r.ok).length,1,"Twenty contenders, exactly one commit");
 assert.equal(outcomes.filter(r=>!r.ok).length,19);
 assert.ok(outcomes.every(r=>r.authorized===false));
 assert.equal(db.prepare(
  "SELECT sign_count FROM ezero_v1_auth_credentials_lab WHERE credential_id=?"
 ).get(id).sign_count,4);
 console.log("PASSKEY_SQLITE_TWENTY_COMPETING_ASSERTIONS_ONE_COMMIT: PASS");

 const expired=await lab.begin({accountId,credentialId:id},now+30);
 assert.equal(expired.ok,true);
 const expiredResponse={accountId,sessionId:expired.sessionId,
  response:await assertion({challenge:expired.options.challenge,counter:5})};
 assert.equal((await lab.finish(expiredResponse,now+90_031)).ok,false);
 db.prepare(`UPDATE ezero_v1_auth_credentials_lab
  SET status='REVOKED',revoked=1 WHERE credential_id=?`).run(id);
 assert.equal((await lab.begin({accountId,credentialId:id},now+100)).ok,false);
 assert.equal((await lab.finish(expiredResponse,now+101)).ok,false);
 console.log("PASSKEY_SQLITE_EXPIRED_OR_REVOKED_FAIL_CLOSED_NO_TRUST_ACTIVATION: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(dir,{recursive:true,force:true});
}

/*
 * Full persistence pipeline: server-fixtured account -> VERIFIED WebAuthn
 * registration -> SQLite one-use challenge & COSE credential -> real passkey
 * assertion -> SQLite one-use login challenge & counter. No account login
 * token or Trusted Device is granted. No public endpoint calls these methods.
 */
const registrationDir=mkdtempSync(join(tmpdir(),"ezero_passkey_reg_atomic_"));
const registrationPath=join(registrationDir,"registration.sqlite3");
let registrationDB;
function registerResponse(challenge,overrides={}){
 const client=te.encode(JSON.stringify({
  type:"webauthn.create",challenge,
  origin:overrides.origin||PAIR_V1_ORIGIN,crossOrigin:false
 }));
 return {...regRes,response:{...regRes.response,clientDataJSON:b64(client)}};
}
try{
 registrationDB=new DatabaseSync(registrationPath);
 let registrationLab=new PairV1SqliteAtomicPasskeyRegistrationLab(
  store(registrationDB));
 assert.equal((await registrationLab.begin({accountId},now)).ok,false,
  "Unknown account must never be auto-created from a user-supplied ID");
 // A trusted external identity authority would need to create this record
 // after independent account proof. Unit test fixture ONLY; no public API.
 const userHandle=b64(crypto.getRandomValues(new Uint8Array(32)));
 registrationDB.prepare(`INSERT INTO ezero_v1_auth_accounts_lab
  (account_id,user_handle,status,version) VALUES(?,?,?,1)`)
  .run(accountId,userHandle,"PREVERIFIED_LAB_ONLY");
 const started=await registrationLab.begin({accountId},now);
 assert.equal(started.ok,true,started.code);
 assert.equal(started.authorized,false);
 assert.equal(started.accountSessionIssued,false);
 assert.equal(started.trustedDeviceActivated,false);
 assert.equal(started.expires-now,90_000);
 const payload={accountId,sessionId:started.sessionId,
  response:registerResponse(started.options.challenge)};
 const forged=await registrationLab.finish({
  ...payload,response:registerResponse(started.options.challenge,
   {origin:"https://attacker.invalid"})
 },now+1);
 assert.equal(forged.ok,false);
 const wrongChallenge=await registrationLab.finish({
  ...payload,response:registerResponse(b64(
   crypto.getRandomValues(new Uint8Array(32))))
 },now+2);
 assert.equal(wrongChallenge.code,"CHALLENGE_MISMATCH");
 assert.equal((await registrationLab.finish({...payload,
  accountId:"another_account_001"},now+3)).ok,false);
 assert.equal(registrationDB.prepare(`SELECT consumed_at
  FROM ezero_v1_register_pending_lab WHERE session_id=?`)
  .get(started.sessionId).consumed_at,null,
  "Failed signature / challenge must not consume the pending session");

 // A transaction failure after inserting a key must roll back both the
 // credential and the challenge consumption. No half-registered accounts.
 registrationDB.exec(`CREATE TRIGGER ezero_lab_fail_registration_commit
 BEFORE UPDATE OF consumed_at ON ezero_v1_register_pending_lab
 BEGIN SELECT RAISE(ABORT,'FORCED_REGISTRATION_COMMIT_FAILURE'); END`);
 const aborted=await registrationLab.finish(payload,now+4);
 assert.equal(aborted.code,"REGISTRATION_ATOMIC_COMMIT_REJECTED");
 assert.equal(registrationDB.prepare(`SELECT COUNT(*) AS c FROM
  ezero_v1_auth_credentials_lab WHERE credential_id=?`).get(id).c,0);
 assert.equal(registrationDB.prepare(`SELECT consumed_at
  FROM ezero_v1_register_pending_lab WHERE session_id=?`)
  .get(started.sessionId).consumed_at,null);
 registrationDB.exec("DROP TRIGGER ezero_lab_fail_registration_commit");

 // Parallel valid submissions all pass signature verification, but ONLY
 // ONE can atomically insert the credential and consume the nonce.
 const races=await Promise.all(Array.from({length:20},
  ()=>registrationLab.finish(payload,now+6)));
 assert.equal(races.filter(x=>x.ok).length,1,"One registration winner");
 assert.equal(races.filter(x=>!x.ok).length,19,"No duplicate registration");
 assert.ok(races.every(x=>x.authorized===false&&
  x.trustedDeviceActivated===false));
 const committed=races.find(x=>x.ok);
 assert.equal(committed.credentialPersisted,true);
 assert.equal(committed.challengeConsumed,true);
 assert.equal(committed.accountSessionIssued,false);
 assert.equal(committed.verifiedPasskeyRecordOnly,true);
 assert.equal((await registrationLab.finish(payload,now+7)).ok,false);
 assert.equal(registrationDB.prepare(`SELECT version
  FROM ezero_v1_auth_accounts_lab WHERE account_id=?`)
  .get(accountId).version,2);
 console.log("PASSKEY_SQLITE_REGISTER_ONE_WINNER_ATOMIC_WITH_ROLLBACK: PASS");

 registrationDB.close();
 registrationDB=new DatabaseSync(registrationPath);
 registrationLab=new PairV1SqliteAtomicPasskeyRegistrationLab(
  store(registrationDB));
 assert.equal((await registrationLab.finish(payload,now+8)).ok,false,
  "Registration replay rejected across SQLite process restarts");

 // The LOGIN module now reads the actual verified COSE credential stored
 // by the REGISTRATION module; no manual production-style account insertion.
 let authLab=new PairV1SqliteAtomicPasskeyFinishLab(store(registrationDB));
 const newLogin=await authLab.begin({accountId,credentialId:id},now+9);
 assert.equal(newLogin.ok,true,newLogin.code);
 const loginFinished=await authLab.finish({
  accountId,sessionId:newLogin.sessionId,
  response:await assertion({challenge:newLogin.options.challenge,counter:2})
 },now+10);
 assert.equal(loginFinished.ok,true,loginFinished.code);
 assert.equal(loginFinished.challengeConsumed,true);
 assert.equal(loginFinished.counterPersisted,true);
 assert.equal(loginFinished.authenticatedSessionIssued,false);
 assert.equal(loginFinished.trustedDeviceActivated,false);
 const loginRecord=registrationDB.prepare(`SELECT sign_count,version
  FROM ezero_v1_auth_credentials_lab WHERE credential_id=?`).get(id);
 assert.equal(loginRecord.sign_count,2);
 assert.equal(loginRecord.version,2);
 assert.equal((await authLab.finish({
  accountId,sessionId:newLogin.sessionId,
  response:await assertion({challenge:newLogin.options.challenge,counter:3})
 },now+11)).ok,false,"A consumed challenge cannot authenticate again");
 console.log("PASSKEY_SQLITE_PERSISTED_REGISTRATION_TO_REAL_COSE_LOGIN: PASS");

 // Server-only stage: SAME cryptographically verified WebAuthn signature
 // commits a hashed observe-only session in the SAME transaction as counter
 // and one-time challenge. No actual production account ownership exists.
 const serverOrigin="https://secure.example.test";
 const sessionIssuer=new PairV1SqliteAtomicPasskeyFinishLab(
  store(registrationDB),{labServerOrigin:serverOrigin});
 const sessionBegin=await sessionIssuer.begin({accountId,credentialId:id},now+11);
 assert.equal(sessionBegin.ok,true);
 const authRequest={
  accountId,sessionId:sessionBegin.sessionId,
  response:await assertion({challenge:sessionBegin.options.challenge,counter:3})
 };
 const fake=await sessionIssuer.finishForObservationSessionLab({
  ...authRequest,
  response:await assertion({challenge:sessionBegin.options.challenge,
   counter:3,signer:evil})
 },now+12);
 assert.equal(fake.ok,false);
 assert.equal(fake.serverOnlySetCookie,undefined);
 registrationDB.exec(`CREATE TRIGGER ezero_lab_block_session_insert
 BEFORE INSERT ON ezero_v1_sessions_guard_lab
 BEGIN SELECT RAISE(ABORT,'FORCED_SESSION_FAILURE'); END`);
 const failed=await sessionIssuer.finishForObservationSessionLab(authRequest,now+13);
 assert.equal(failed.code,"ATOMIC_COMMIT_REJECTED");
 assert.equal(failed.serverOnlySetCookie,undefined);
 assert.equal(registrationDB.prepare(`SELECT sign_count FROM
  ezero_v1_auth_credentials_lab WHERE credential_id=?`).get(id).sign_count,2,
  "Failed session INSERT must roll back credential counter");
 assert.equal(registrationDB.prepare(`SELECT consumed_at FROM
  ezero_v1_auth_pending_lab WHERE session_id=?`)
  .get(sessionBegin.sessionId).consumed_at,null,
  "Failed session INSERT must NOT consume signed challenge");
 registrationDB.exec("DROP TRIGGER ezero_lab_block_session_insert");
 registrationDB.exec(`CREATE TRIGGER ezero_lab_block_csrf_insert
 BEFORE INSERT ON ezero_v1_session_csrf_lab
 BEGIN SELECT RAISE(ABORT,'FORCED_CSRF_LEDGER_FAILURE'); END`);
 const csrfFailed=await sessionIssuer.finishForObservationSessionLab(authRequest,now+13);
 assert.equal(csrfFailed.ok,false);
 assert.equal(csrfFailed.serverOnlySetCookie,undefined);
 assert.equal(registrationDB.prepare(`SELECT sign_count FROM
  ezero_v1_auth_credentials_lab WHERE credential_id=?`).get(id).sign_count,2);
 assert.equal(registrationDB.prepare(`SELECT consumed_at FROM
  ezero_v1_auth_pending_lab WHERE session_id=?`)
  .get(sessionBegin.sessionId).consumed_at,null);
 assert.equal(registrationDB.prepare(`SELECT COUNT(*) AS c
  FROM ezero_v1_sessions_guard_lab`).get().c,0,
  "CSRF persistence error must roll back session and WebAuthn writes");
 registrationDB.exec("DROP TRIGGER ezero_lab_block_csrf_insert");
 const outcomes=await Promise.all(Array.from({length:20},
  ()=>sessionIssuer.finishForObservationSessionLab(authRequest,now+14)));
 assert.equal(outcomes.filter(x=>x.ok).length,1);
 assert.equal(outcomes.filter(x=>!x.ok).length,19);
 const issued=outcomes.find(x=>x.ok);
 assert.equal(issued.authenticatedSessionIssued,false);
 assert.equal(issued.observationOnlySessionStored,true);
 assert.equal(issued.trustedDeviceActivated,false);
 assert.equal(issued.challengeConsumed,true);
 assert.equal(issued.counterPersisted,true);
 assert.ok(issued.serverOnlySetCookie.startsWith(SESSION_LAB_COOKIE+"="));
 assert.match(issued.serverOnlySetCookie,
  /; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=900$/);
 assert.doesNotMatch(issued.serverOnlySetCookie,/; Domain=/);
 assert.match(issued.serverOnlyCsrfToken,/^[A-Za-z0-9_-]{43}$/);
 assert.ok(!issued.serverOnlySetCookie.includes(issued.serverOnlyCsrfToken),
  "Synchronizer CSRF token is never placed in the HttpOnly session cookie");
 assert.equal(registrationDB.prepare(`SELECT COUNT(*) AS c FROM
  ezero_v1_session_csrf_lab`).get().c,1,
  "CSRF digest stored in the SAME successful WebAuthn transaction");
 const sessionGuard=new PairV1SessionGuardSqliteLab(
  store(registrationDB),{serverOrigin});
 const cookieHeader=issued.serverOnlySetCookie.split(";")[0];
 const guarded=await sessionGuard.inspect({
  cookieHeader,origin:serverOrigin,method:"GET",now:now+15});
 assert.deepEqual(guarded,{
  ok:true,code:"SESSION_OBSERVED_ONLY_NO_AUTHORITY",
  authorized:false,trusted:false});
 assert.equal((await sessionGuard.inspect({
  cookieHeader,origin:serverOrigin,method:"POST",now:now+15})).ok,false);
 assert.equal((await sessionGuard.inspect({
  cookieHeader,origin:PAIR_V1_ORIGIN,now:now+15})).ok,false,
  "GitHub Pages origin and Worker account origin MUST NOT be conflated");
 assert.equal((await sessionIssuer.finishForObservationSessionLab(
  authRequest,now+16)).ok,false,"Replayed assertion must not mint cookies");
 const logoutArgs={
  cookieHeader,csrfToken:issued.serverOnlyCsrfToken,
  origin:serverOrigin,method:"POST",now:now+17
 };
 assert.equal((await sessionGuard.logoutOwnSessionWithCsrfLab({
  ...logoutArgs,origin:"https://attacker.invalid"
 })).ok,false);
 assert.equal((await sessionGuard.logoutOwnSessionWithCsrfLab({
  ...logoutArgs,csrfToken:issued.serverOnlySetCookie.split(".")[1]?.slice(0,43)
 })).ok,false,"Cookie and CSRF tokens are separate secrets");
 assert.equal((await sessionGuard.inspect({
  cookieHeader,origin:serverOrigin,now:now+17
 })).ok,true,"Wrong CSRF does not revoke session");
 const logout=await sessionGuard.logoutOwnSessionWithCsrfLab(logoutArgs);
 assert.equal(logout.ok,true);
 assert.equal(logout.authorized,false);
 assert.equal((await sessionGuard.inspect({
  cookieHeader,origin:serverOrigin,now:now+18
 })).ok,false,"Logout must invalidate session immediately");
 assert.equal((await sessionGuard.logoutOwnSessionWithCsrfLab({
  ...logoutArgs,now:now+18
 })).ok,false,"Logout replay is denied");
 console.log("PASSKEY_SQLITE_REAL_SIGNATURE_AND_SAME_ORIGIN_CSRF_LOGOUT_NO_GRANT: PASS");
 console.log("PASSKEY_SQLITE_REAL_SIGNATURE_ATOMIC_HASHED_HTTPONLY_COOKIE_OBSERVE_ONLY: PASS");
 console.log("PASSKEY_SQLITE_SESSION_INSERT_FAILURE_ROLLBACK_AND_20_RACE_ONE_WINNER: PASS");


 // Correlate the VERIFIED AND DURABLY CONSUMED passkey with TWO
 // real separately signed device approvals and the pending registry.
 // This still cannot grant Trusted Device, login cookie or call authority.
 const deviceDB=new PairV1PendingDeviceRegistryLab(store(registrationDB));
 const approvalDB=new PairV1MutualApprovalSqliteLab(store(registrationDB));
 const candidateDB=new PairV1TrustCandidateSqliteLab(store(registrationDB));
 const enrollmentQrDB=new PairV1SqliteChallengeLedgerLab(store(registrationDB));
 const aDev=await crypto.subtle.generateKey(
  {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const bDev=await crypto.subtle.generateKey(
  {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const aPub=u8(await crypto.subtle.exportKey("spki",aDev.publicKey));
 const bPub=u8(await crypto.subtle.exportKey("spki",bDev.publicKey));
 const aHash=Array.from(await hash(aPub),x=>x.toString(16).padStart(2,"0")).join("");
 const bHash=Array.from(await hash(bPub),x=>x.toString(16).padStart(2,"0")).join("");
 const aDeviceId="device_phone_alpha_01",bDeviceId="device_phone_beta_01";
 assert.equal((await deviceDB.stagePendingDevice({
  accountId,deviceId:aDeviceId,publicSpki:b64(aPub),keyHash:aHash
 },now+11)).ok,true);
 assert.equal((await deviceDB.stagePendingDevice({
  accountId,deviceId:bDeviceId,publicSpki:b64(bPub),keyHash:bHash
 },now+11)).ok,true);
 const pairSid="d".repeat(32),pairNonce="f".repeat(32);
 const pairExpires=now+80_000;
 const pairNonceDigest=Array.from(await hash(te.encode(pairNonce)),
  x=>x.toString(16).padStart(2,"0")).join("");
 assert.equal(approvalDB.createSession({
  sid:pairSid,nonceDigest:pairNonceDigest,accountId,
  aKeyHash:aHash,bKeyHash:bHash,issued:now,expires:pairExpires,
  purpose:"PAIR"
 },now+11).ok,true);
 assert.equal(enrollmentQrDB.issue({
  sessionId:pairSid,nonceDigest:pairNonceDigest,accountId,
  credentialId:id,issued:now,expires:pairExpires,purpose:"PAIR_OR_RECONNECT"
 },now+11).ok,true,"90-second QR minted by server ledger, not client boolean");
 const pairCtx={
  accountId,pairSid,authSessionId:newLogin.sessionId,aDeviceId,bDeviceId
 };
 assert.equal(candidateDB.recordEvidenceCandidate(pairCtx,now+12).code,
  "DUAL_SIGNED_UNEXPIRED_APPROVALS_REQUIRED",
  "Single passkey must NEVER authorize pair before both signatures");
 assert.equal(candidateDB.recordEvidenceAndConsumeEnrollmentQrLab(
  pairCtx,now+12).code,"DUAL_SIGNED_UNEXPIRED_APPROVALS_REQUIRED");
 assert.equal(registrationDB.prepare(`SELECT consumed_at FROM
  ezero_pair_v1_challenges WHERE session_id=?`).get(pairSid).consumed_at,null,
  "Unapproved QR is not burned by an invalid request");
 const aApproval={
  sid:pairSid,nonce:pairNonce,accountId,selfKeyHash:aHash,
  peerKeyHash:bHash,expires:pairExpires,decision:"APPROVE"
 };
 const bApproval={...aApproval,selfKeyHash:bHash,peerKeyHash:aHash};
 const signPair=async(key,data)=>u8(await crypto.subtle.sign(
  {name:"ECDSA",hash:"SHA-256"},key.privateKey,
  te.encode(pairApprovalText(data))));
 const badPairSignature=await signPair(bDev,aApproval);
 const wrongSig=await approvalDB.recordSignedDecision({
  role:"A",approval:aApproval,signature:badPairSignature,
  registeredSpki:aPub,registeredDeviceKeyHash:aHash,
  accountFromRegistry:accountId
 },now+12);
 assert.equal(wrongSig.ok,false,"Wrong device cannot approve role A");
 const aSigned=await approvalDB.recordSignedDecision({
  role:"A",approval:aApproval,signature:await signPair(aDev,aApproval),
  registeredSpki:aPub,registeredDeviceKeyHash:aHash,
  accountFromRegistry:accountId
 },now+12);
 assert.equal(aSigned.stage,"A_SIGNED");
 assert.equal(candidateDB.recordEvidenceCandidate(pairCtx,now+12).ok,false,
  "No trust from one signed approval");
 const bSigned=await approvalDB.recordSignedDecision({
  role:"B",approval:bApproval,signature:await signPair(bDev,bApproval),
  registeredSpki:bPub,registeredDeviceKeyHash:bHash,
  accountFromRegistry:accountId
 },now+13);
 assert.equal(bSigned.stage,"BOTH_SIGNED_UNAUTHORIZED");
 // Pairing QR must be from the server-ledger and match BOTH signed device
 // approvals, the same verified account, and the exact consumed Passkey.
 const qrPre=registrationDB.prepare(`SELECT consumed_at
  FROM ezero_pair_v1_challenges WHERE session_id=?`).get(pairSid);
 assert.equal(qrPre.consumed_at,null);
 for(const bad of [
  {...pairCtx,accountId:"another_account_001"},
  {...pairCtx,aDeviceId:bDeviceId,bDeviceId:aDeviceId},
  {...pairCtx,authSessionId:"e".repeat(32)}
 ]){
  assert.equal(candidateDB.recordEvidenceAndConsumeEnrollmentQrLab(
   bad,now+14).ok,false);
 }
 assert.equal(registrationDB.prepare(`SELECT consumed_at FROM
  ezero_pair_v1_challenges WHERE session_id=?`).get(pairSid).consumed_at,null);
 // Tamper a QR credential binding in the test database; it must fail and
 // never consume. This cannot be set by a browser through any endpoint.
 registrationDB.prepare(`UPDATE ezero_pair_v1_challenges
  SET credential_id=? WHERE session_id=?`)
  .run("wrong_credential_001",pairSid);
 assert.equal(candidateDB.recordEvidenceAndConsumeEnrollmentQrLab(
  pairCtx,now+14).code,"SERVER_ENROLLMENT_QR_INVALID_OR_REPLAYED");
 registrationDB.prepare(`UPDATE ezero_pair_v1_challenges
  SET credential_id=? WHERE session_id=?`).run(id,pairSid);
 // If durable evidence INSERT fails AFTER the QR is consumed, the
 // transaction must roll back the consumed_at CAS as well.
 registrationDB.exec(`CREATE TRIGGER ezero_lab_fail_pair_qr_evidence
 BEFORE INSERT ON ezero_pair_v1_qr_consumed_evidence_lab
 BEGIN SELECT RAISE(ABORT,'FORCED_QR_EVIDENCE_FAILURE'); END`);
 const abortedQR=candidateDB.recordEvidenceAndConsumeEnrollmentQrLab(
  pairCtx,now+14);
 assert.equal(abortedQR.code,"ENROLLMENT_ATOMIC_COMMIT_REJECTED");
 assert.equal(registrationDB.prepare(`SELECT consumed_at
  FROM ezero_pair_v1_challenges WHERE session_id=?`).get(pairSid).consumed_at,
  null,"QR consumed_at must roll back when evidence insert fails");
 registrationDB.exec("DROP TRIGGER ezero_lab_fail_pair_qr_evidence");
 const qrResults=await Promise.all(Array.from({length:20},
  ()=>candidateDB.recordEvidenceAndConsumeEnrollmentQrLab(pairCtx,now+14)));
 assert.equal(qrResults.filter(r=>r.ok).length,1,
  "One-use QR must yield one winner across 20 competing requests");
 assert.equal(qrResults.filter(r=>!r.ok).length,19);
 const qrSuccess=qrResults.find(r=>r.ok);
 assert.equal(qrSuccess.pairQrConsumed,true);
 assert.equal(qrSuccess.stage,"QR_BURNED_NO_TRUST");
 assert.ok(qrResults.every(r=>r.authorized===false&&
  r.trusted===false&&r.accountSessionIssued===false));
 assert.equal(candidateDB.inspectConsumedEnrollmentQrLab({
  accountId,pairSid
 },now+15).code,"ENROLLMENT_EVIDENCE_PRESENT_NO_AUTHORITY");
 const replay=candidateDB.recordEvidenceAndConsumeEnrollmentQrLab(
  pairCtx,now+16);
 assert.equal(replay.ok,false);
 assert.equal(replay.code,"SERVER_ENROLLMENT_QR_INVALID_OR_REPLAYED");
 console.log("PAIR_V1_QR_90S_SINGLE_USE_CONSUME_ATOMIC_WITH_BOTH_SIGNED_DEVICES: PASS");
 console.log("PAIR_V1_QR_TWENTY_RACE_ONE_WINNER_ROLLBACK_TAMPER_NO_TRUST: PASS");

 assert.equal(candidateDB.recordEvidenceCandidate({
  ...pairCtx,bDeviceId:aDeviceId
 },now+14).ok,false,"Cannot pair a device with itself");
 assert.equal(candidateDB.recordEvidenceCandidate({
  ...pairCtx,accountId:"another_account_001"
 },now+14).ok,false,"Wrong account rejected");
 assert.equal(candidateDB.recordEvidenceCandidate({
  ...pairCtx,aDeviceId:bDeviceId,bDeviceId:aDeviceId
 },now+14).code,"DEVICE_KEYS_REVOKED_OR_UNBOUND");
 assert.equal(candidateDB.recordEvidenceCandidate({
  ...pairCtx,authSessionId:"e".repeat(32)
 },now+14).code,"FRESH_CONSUMED_PASSKEY_REQUIRED");
 const winners=await Promise.all(Array.from({length:20},
  ()=>candidateDB.recordEvidenceCandidate(pairCtx,now+14)));
 assert.equal(winners.filter(x=>x.ok).length,1,
  "Same verified account and bilateral signed pair can be recorded once");
 assert.equal(winners.filter(x=>!x.ok).length,19);
 assert.ok(winners.every(x=>x.authorized===false&&x.trusted===false&&
  x.accountSessionIssued===false));
 assert.equal(candidateDB.inspectCandidate({
  accountId,pairSid
 },now+15).code,"LAB_EVIDENCE_STILL_PRESENT_NO_AUTHORITY");
 registrationDB.close();
 registrationDB=new DatabaseSync(registrationPath);
 // Reconstruct ALL SQLite adapters after restart; do not use stale handles.
 registrationLab=new PairV1SqliteAtomicPasskeyRegistrationLab(store(registrationDB));
 authLab=new PairV1SqliteAtomicPasskeyFinishLab(store(registrationDB));
 const reloadedCandidate=new PairV1TrustCandidateSqliteLab(store(registrationDB));
 assert.equal(reloadedCandidate.recordEvidenceCandidate(pairCtx,now+16).ok,false,
  "Evidence cannot be replayed after restart");
 assert.equal(reloadedCandidate.inspectCandidate({
  accountId,pairSid
 },now+16).ok,true);
 assert.equal(reloadedCandidate.recordEvidenceAndConsumeEnrollmentQrLab(
  pairCtx,now+16).ok,false,"Consumed enrollment QR cannot replay on restart");
 assert.equal(reloadedCandidate.inspectConsumedEnrollmentQrLab({
  accountId,pairSid
 },now+16).ok,true,"QR evidence survives restart, but confers NO trust");
 assert.equal(reloadedCandidate.inspectCandidate({
  accountId,pairSid
 },now+80_000).ok,false,"Expired QR never remains eligible");
 assert.equal(reloadedCandidate.inspectConsumedEnrollmentQrLab({
  accountId,pairSid
 },now+80_000).ok,false,"Expired QR audit cannot grant live trust");
 const reloadedDevices=new PairV1PendingDeviceRegistryLab(store(registrationDB));
 assert.equal(reloadedDevices.revokeServerSide(
  accountId,bDeviceId,now+17).ok,true);
 assert.equal(reloadedCandidate.inspectCandidate({
  accountId,pairSid
 },now+18).code,"DEVICE_KEYS_REVOKED_OR_UNBOUND");
 assert.equal(reloadedCandidate.inspectConsumedEnrollmentQrLab({
  accountId,pairSid
 },now+18).code,"DEVICE_KEYS_REVOKED_OR_UNBOUND",
  "Revoked device must invalidate even a consumed QR evidence record");
 console.log("PASSKEY_SQLITE_BOTH_REAL_DEVICE_SIGNATURES_EVIDENCE_CORRELATED_ONLY: PASS");
 console.log("PASSKEY_SQLITE_REPLAY_REVOKE_EXPIRY_NEVER_ACTIVATES_TRUST: PASS");


 const duplicate=await registrationLab.begin({accountId},now+12);
 assert.equal(duplicate.ok,true);
 assert.ok(duplicate.options.excludeCredentials.some(x=>x.id===id),
  "Re-registering same credential should be discouraged in native picker");
 const duplicateResult=await registrationLab.finish({
  accountId,sessionId:duplicate.sessionId,
  response:registerResponse(duplicate.options.challenge)
 },now+13);
 assert.equal(duplicateResult.ok,false,"Existing credential ID is unique");
 const count=registrationDB.prepare(`SELECT COUNT(*) AS c
  FROM ezero_v1_auth_credentials_lab`).get().c;
 assert.equal(count,1);
 registrationDB.prepare(`UPDATE ezero_v1_auth_credentials_lab
  SET status='REVOKED',revoked=1 WHERE credential_id=?`).run(id);
 assert.equal((await authLab.begin({accountId,credentialId:id},now+14)).ok,false,
  "Revocation prevents another credential authentication challenge");
 registrationDB.prepare(`UPDATE ezero_v1_auth_accounts_lab
  SET status='REVOKED' WHERE account_id=?`).run(accountId);
 assert.equal((await registrationLab.begin({accountId},now+15)).ok,false,
  "Revoked account cannot register another passkey");
 console.log("PASSKEY_SQLITE_DUPLICATE_CREDENTIAL_REVOKED_ACCOUNT_FAIL_CLOSED: PASS");
}finally{
 try{registrationDB?.close();}catch(_){}
 rmSync(registrationDir,{recursive:true,force:true});
}
