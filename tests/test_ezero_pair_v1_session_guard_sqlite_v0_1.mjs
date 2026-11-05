import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {PairV1SessionGuardSqliteLab,sessionSecretDigestForLab,
 SESSION_LAB_COOKIE,SESSION_LAB_MAX_MS,SESSION_LAB_IDLE_MS}
 from "../secure_connect/pair_v1/account_session_guard_sqlite_lab_v0_1.mjs";
const directory=mkdtempSync(join(tmpdir(),"ezero_v1_session_guard_"));
const filepath=join(directory,"sessions.sqlite3");
const origin="https://secure.example.test"; // test-only SAME-ORIGIN site
const accountId="account_test_001",cred="credential_test_001",sid="a".repeat(32);
const now=Date.now();
const raw=crypto.getRandomValues(new Uint8Array(32));
const b64=v=>{
 let s="";for(const x of v)s+=String.fromCharCode(x);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const verifier=b64(raw);
const cookie=SESSION_LAB_COOKIE+"="+sid+"."+verifier;
const storage=db=>({
 sql:{exec(query,...args){
  const q=query.trim();
  if(q.startsWith("CREATE TABLE")){db.exec(q);return{toArray:()=>[]};}
  const stmt=db.prepare(q);
  if(q.startsWith("SELECT")||q.includes("RETURNING"))
   return{toArray:()=>stmt.all(...args)};
  stmt.run(...args);return{toArray:()=>[]};
 }},
 transactionSync(fn){
  db.exec("BEGIN IMMEDIATE");
  try{const r=fn();db.exec("COMMIT");return r;}
  catch(e){db.exec("ROLLBACK");throw e;}
 }
});
let db;
try{
 db=new DatabaseSync(filepath);
 db.exec(`CREATE TABLE ezero_v1_auth_accounts_lab (
  account_id TEXT PRIMARY KEY,status TEXT NOT NULL)`);
 db.exec(`CREATE TABLE ezero_v1_auth_credentials_lab (
  account_id TEXT,credential_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,revoked INTEGER NOT NULL)`);
 db.prepare("INSERT INTO ezero_v1_auth_accounts_lab VALUES(?,?)")
  .run(accountId,"PREVERIFIED_LAB_ONLY");
 db.prepare("INSERT INTO ezero_v1_auth_credentials_lab VALUES(?,?,?,?)")
  .run(accountId,cred,"ACTIVE",0);
 assert.throws(()=>new PairV1SessionGuardSqliteLab(storage(db),
  {serverOrigin:"http://secure.example.test"}),
  /HTTPS_SAME_ORIGIN_SERVER_REQUIRED/);
 let lab=new PairV1SessionGuardSqliteLab(storage(db),{serverOrigin:origin});
 // The only issuer in this test is a direct database fixture. The lab has
 // intentionally no public or server method to mint cookies / session IDs.
 const digest=await sessionSecretDigestForLab(verifier);
 assert.match(digest,/^[a-f0-9]{64}$/);
 assert.equal(verifier.length,43);
 assert.equal(SESSION_LAB_COOKIE,"__Host-ezv1");
 const issued=now-1_000,expires=now+14*60_000;
 db.prepare(`INSERT INTO ezero_v1_sessions_guard_lab
  (sid,secret_digest,account_id,credential_id,issued,expires,seen_at,
   origin,scope,revoked_at) VALUES(?,?,?,?,?,?,?,?,'ACCOUNT_OBSERVE_ONLY',NULL)`)
  .run(sid,digest,accountId,cred,issued,expires,issued,origin);
 async function verify(header=cookie,overrides={}){
  const result=await lab.inspect({
   cookieHeader:header,origin,method:"GET",now,...overrides
  });
  assert.equal(result.authorized,false);
  assert.equal(result.trusted,false);
  return result;
 }
 const checked=await verify();
 assert.deepEqual(checked,{ok:true,code:"SESSION_OBSERVED_ONLY_NO_AUTHORITY",
  authorized:false,trusted:false});
 console.log("SESSION_LAB_HOST_ONLY_OPAQUE_SHA256_TOKEN_OBSERVATION_NO_GRANT: PASS");
 for(const bad of [
  SESSION_LAB_COOKIE+"="+sid,
  SESSION_LAB_COOKIE+"="+sid+"."+b64(crypto.getRandomValues(new Uint8Array(32))),
  cookie+"; "+cookie,
  cookie+"; "+SESSION_LAB_COOKIE+"="+sid+"."+verifier,
  cookie.replace("a", "b"),
  "__Host-else="+sid+"."+verifier,""
 ]){
  assert.equal((await verify(bad)).ok,false,"Bad, duplicated or missing session cookie rejected");
 }
 assert.equal((await verify(cookie,{origin:"https://coma39658-ctrl.github.io"})).ok,false,
  "Pages origin cannot share the auth server's host cookie");
 assert.equal((await verify(cookie,{origin:"https://evil.example.test"})).ok,false);
 assert.equal((await verify(cookie,{origin:origin+"/path"})).ok,false);
 assert.equal((await verify(cookie,{method:"POST"})).ok,false,
  "No state mutation without future audited CSRF/origin router");
 assert.equal((await verify(cookie,{method:"DELETE"})).ok,false);
 assert.equal((await verify(cookie,{now:issued+SESSION_LAB_IDLE_MS})).ok,false);
 assert.equal((await verify(cookie,{now:expires})).ok,false);
 assert.equal(SESSION_LAB_MAX_MS,900_000);
 console.log("SESSION_LAB_INVALID_TOKEN_DUPLICATE_ORIGIN_CSRF_IDLE_EXPIRY_DENIED: PASS");
 // Reopened DB should retain exact server-side invalidation.
 db.close();db=new DatabaseSync(filepath);
 lab=new PairV1SessionGuardSqliteLab(storage(db),{serverOrigin:origin});
 assert.equal((await verify()).ok,true);
 assert.equal(lab.revokeTrustedServerSide(sid,now+1).ok,true);
 assert.equal(lab.revokeTrustedServerSide(sid,now+2).ok,false);
 assert.equal((await verify()).ok,false);
 db.close();db=new DatabaseSync(filepath);
 lab=new PairV1SessionGuardSqliteLab(storage(db),{serverOrigin:origin});
 assert.equal((await verify()).ok,false,"Logout must survive SQLite restart");
 console.log("SESSION_LAB_LOGOUT_DURABLE_REPLAY_DENIED_AFTER_DATABASE_RESTART: PASS");
 // A second independent verifier is a TEST FIXTURE; no token is minted by
 // the module. Revoking a passkey/account invalidates its linked record.
 const nextSid="b".repeat(32);
 const nextSecret=b64(crypto.getRandomValues(new Uint8Array(32)));
 const nextCookie=SESSION_LAB_COOKIE+"="+nextSid+"."+nextSecret;
 db.prepare(`INSERT INTO ezero_v1_sessions_guard_lab
 (sid,secret_digest,account_id,credential_id,issued,expires,seen_at,
 origin,scope,revoked_at) VALUES(?,?,?,?,?,?,?,?,'ACCOUNT_OBSERVE_ONLY',NULL)`)
 .run(nextSid,await sessionSecretDigestForLab(nextSecret),accountId,cred,
  issued,expires,issued,origin);
 assert.equal((await verify(nextCookie)).ok,true);
 db.prepare("UPDATE ezero_v1_auth_credentials_lab SET revoked=1,status='REVOKED' WHERE credential_id=?")
  .run(cred);
 assert.equal((await verify(nextCookie)).code,"ACCOUNT_OR_PASSKEY_REVOKED");
 db.prepare("UPDATE ezero_v1_auth_credentials_lab SET revoked=0,status='ACTIVE' WHERE credential_id=?")
  .run(cred);
 db.prepare("UPDATE ezero_v1_auth_accounts_lab SET status='REVOKED' WHERE account_id=?")
  .run(accountId);
 assert.equal((await verify(nextCookie)).code,"ACCOUNT_OR_PASSKEY_REVOKED");
 assert.equal(typeof lab.createSession,"undefined",
  "No credential issuer from synthetic proof or browser boolean");
 assert.equal(typeof lab.activateTrustedDevice,"undefined");
 console.log("SESSION_LAB_REVOKED_ACCOUNT_OR_PASSKEY_NEVER_AUTHORIZES_DEVICE: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(directory,{force:true,recursive:true});
}
