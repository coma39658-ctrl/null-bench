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
 const authLab=new PairV1SqliteAtomicPasskeyFinishLab(store(registrationDB));
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
