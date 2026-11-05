import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {createSameOriginSessionHttpLab}
 from "../secure_connect/pair_v1/same_origin_session_http_lab_v0_1.mjs";
import {sessionSecretDigestForLab,sessionCsrfDigestForLab,
 SESSION_LAB_COOKIE}
 from "../secure_connect/pair_v1/account_session_guard_sqlite_lab_v0_1.mjs";
const directory=mkdtempSync(join(tmpdir(),"ezero_http_lab_"));
const dbPath=join(directory,"test.sqlite3");
const origin="https://secure.example.test";
const base=origin+"/api/ezero-pair/v1/session/";
const account="account_test_001",credential="credential_test_001";
const now=Date.now();
const b64=bytes=>{
 let s="";for(const x of bytes)s+=String.fromCharCode(x);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
const secret=b64(crypto.getRandomValues(new Uint8Array(32)));
const csrf=b64(crypto.getRandomValues(new Uint8Array(32)));
const sid="d".repeat(32);
const cookie=SESSION_LAB_COOKIE+"="+sid+"."+secret;
const headers={
 "origin":origin,"sec-fetch-site":"same-origin",
 "cookie":cookie
};
const store=db=>({
 sql:{exec(sql,...params){
  const q=sql.trim();
  if(q.startsWith("CREATE TABLE")){db.exec(q);return{toArray:()=>[]};}
  const s=db.prepare(q);
  if(q.startsWith("SELECT")||q.includes("RETURNING"))
   return{toArray:()=>s.all(...params)};
  s.run(...params);return{toArray:()=>[]};
 }},
 transactionSync(f){
  db.exec("BEGIN IMMEDIATE");
  try{const r=f();db.exec("COMMIT");return r;}
  catch(e){db.exec("ROLLBACK");throw e;}
 }
});
let db;
try{
 db=new DatabaseSync(dbPath);
 db.exec(`CREATE TABLE ezero_v1_auth_accounts_lab
  (account_id TEXT PRIMARY KEY,status TEXT NOT NULL)`);
 db.exec(`CREATE TABLE ezero_v1_auth_credentials_lab
  (account_id TEXT NOT NULL,credential_id TEXT PRIMARY KEY,
   status TEXT NOT NULL,revoked INTEGER NOT NULL)`);
 db.prepare("INSERT INTO ezero_v1_auth_accounts_lab VALUES(?,?)")
  .run(account,"PREVERIFIED_LAB_ONLY");
 db.prepare("INSERT INTO ezero_v1_auth_credentials_lab VALUES(?,?,?,?)")
  .run(account,credential,"ACTIVE",0);
 let handler=createSameOriginSessionHttpLab({
  storage:store(db),serverOrigin:origin
 });
 const issued=now-1_000;
 db.prepare(`INSERT INTO ezero_v1_sessions_guard_lab
  (sid,secret_digest,account_id,credential_id,issued,expires,seen_at,
   origin,scope,revoked_at)
  VALUES(?,?,?,?,?,?,?,?,'ACCOUNT_OBSERVE_ONLY',NULL)`)
  .run(sid,await sessionSecretDigestForLab(secret),account,credential,
   issued,now+10*60_000,issued,origin);
 db.prepare(`INSERT INTO ezero_v1_session_csrf_lab
  (sid,csrf_digest,created_at) VALUES(?,?,?)`)
  .run(sid,await sessionCsrfDigestForLab(csrf),issued);
 const call=async(path,options={})=>handler.handle(new Request(
  path.startsWith("https:")?path:base+path,{
   method:options.method||"GET",
   headers:{...headers,...options.headers},
   ...(options.body===undefined?{}:{body:options.body})
  }),options.now||now);
 const success=await call("status");
 assert.equal(success.status,200);
 assert.equal(success.headers.get("cache-control"),"no-store, private, max-age=0");
 assert.equal(success.headers.get("x-content-type-options"),"nosniff");
 assert.equal(success.headers.get("access-control-allow-origin"),null);
 assert.equal(success.headers.get("set-cookie"),null);
 assert.equal(success.headers.get("cross-origin-resource-policy"),"same-origin");
 assert.match(success.headers.get("vary"),/Sec-Fetch-Site/);
 // Browser GET fetch may legitimately omit Origin but includes protected
 // Sec-Fetch-Site: same-origin. POST is still strict about Origin.
 const browserStatus=await handler.handle(new Request(base+"status",{
  headers:{"sec-fetch-site":"same-origin","cookie":cookie}
 }),now);
 assert.equal(browserStatus.status,200);
 const unknownSource=await handler.handle(new Request(base+"status",{
  headers:{"cookie":cookie}
 }),now);
 assert.equal(unknownSource.status,403);
 const noOriginLogout=await handler.handle(new Request(base+"logout",{
  method:"POST",headers:{"sec-fetch-site":"same-origin","cookie":cookie,
   "x-ezero-csrf":csrf}
 }),now);
 assert.equal(noOriginLogout.status,403,
  "POST mutations always require exact Origin, never Fetch Metadata alone");
 const statusData=await success.json();
 assert.deepEqual(statusData,{
  ok:true,code:"OBSERVATION_ONLY_NO_ACCESS",
  authorized:false,trusted:false,
  authenticatedSessionIssued:false,observationOnly:true
 });
 assert.ok(!JSON.stringify(statusData).includes(secret));
 assert.ok(!JSON.stringify(statusData).includes(account));
 console.log("SAME_ORIGIN_HTTP_NO_STORE_OBSERVE_ONLY_NO_CREDENTIAL_LEAK: PASS");
 const deny=async(route,opts,code)=>{
  const r=await call(route,opts);
  assert.notEqual(r.status,200);
  assert.equal(r.headers.get("access-control-allow-origin"),null);
  assert.equal(r.headers.get("set-cookie"),null);
  const data=await r.json();
  if(code)assert.equal(data.code,code);
  assert.equal(data.authorized,false);
  assert.equal(data.trusted,false);
 };
 await deny("status",{headers:{origin:"https://attacker.invalid"}},
  "ORIGIN_OR_TARGET_REJECTED");
 await deny("status",{headers:{"sec-fetch-site":"cross-site"}},
  "ORIGIN_OR_TARGET_REJECTED");
 await deny("status",{headers:{"sec-fetch-site":"same-site"}},
  "ORIGIN_OR_TARGET_REJECTED");
 await deny("status",{headers:{"x-forwarded-host":"secure.example.test"}},
  "ORIGIN_OR_TARGET_REJECTED");
 await deny("https://evil.example.test/api/ezero-pair/v1/session/status",{},
  "ORIGIN_OR_TARGET_REJECTED");
 await deny("status?x=y",{},"ORIGIN_OR_TARGET_REJECTED");
 await deny("status#fragment",{},"ORIGIN_OR_TARGET_REJECTED");
 await deny("status",{headers:{cookie:""}},"SESSION_NOT_AVAILABLE");
 await deny("status",{headers:{cookie:SESSION_LAB_COOKIE+"="+sid+"."+
  b64(crypto.getRandomValues(new Uint8Array(32)))}},"SESSION_NOT_AVAILABLE");
 await deny("logout",{method:"GET"},"ROUTE_NOT_AVAILABLE");
 await deny("logout",{method:"POST"},"CSRF_REQUIRED");
 await deny("logout",{method:"POST",headers:{"x-ezero-csrf":
  b64(crypto.getRandomValues(new Uint8Array(32)))}},"LOGOUT_REJECTED");
 await deny("logout",{method:"POST",headers:{
  "x-ezero-csrf":csrf,origin:"https://attacker.invalid"
 }},"ORIGIN_OR_TARGET_REJECTED");
 await deny("logout",{method:"POST",headers:{"x-ezero-csrf":csrf},
  body:"untrusted"},"BODY_NOT_ACCEPTED");
 await deny("register",{method:"POST",headers:{"x-ezero-csrf":csrf}},
  "ROUTE_NOT_AVAILABLE");
 await deny("login",{method:"POST",headers:{"x-ezero-csrf":csrf}},
  "ROUTE_NOT_AVAILABLE");
 await deny("activate",{method:"POST",headers:{"x-ezero-csrf":csrf}},
  "ROUTE_NOT_AVAILABLE");
 await deny("status",{method:"HEAD"},"METHOD_NOT_ALLOWED");
 await deny("status",{method:"OPTIONS"},"METHOD_NOT_ALLOWED");
 console.log("SAME_ORIGIN_HTTP_FORGED_ORIGIN_FETCH_METADATA_BODY_AND_CSRF_DENIED: PASS");
 const requests=await Promise.all(Array.from({length:20},()=>call("logout",{
  method:"POST",headers:{"x-ezero-csrf":csrf}
 })));
 assert.equal(requests.filter(r=>r.status===204).length,1,
  "Only one atomic logout succeeds");
 assert.equal(requests.filter(r=>r.status===403).length,19);
 const okResponse=requests.find(r=>r.status===204);
 assert.equal(await okResponse.text(),"");
 assert.match(okResponse.headers.get("set-cookie"),
  /^__Host-ezv1=; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=0$/);
 assert.equal((await call("status")).status,401);
 db.close();db=new DatabaseSync(dbPath);
 handler=createSameOriginSessionHttpLab({storage:store(db),serverOrigin:origin});
 assert.equal((await call("status")).status,401,
  "Revocation is durable and cookie cannot be replayed after restart");
 assert.equal((await call("logout",{
  method:"POST",headers:{"x-ezero-csrf":csrf}
 })).status,403);
 console.log("SAME_ORIGIN_HTTP_TWENTY_LOGOUT_RACE_ONE_WINNER_RESTART_DENIES_REPLAY: PASS");
 assert.equal(typeof handler.handle,"function");
 assert.equal(handler.createSession,undefined);
 assert.equal(handler.activateTrustedDevice,undefined);
 console.log("SAME_ORIGIN_HTTP_NO_PUBLIC_LOGIN_PAIRING_CALL_OR_TRUST_ACTIVATION: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(directory,{recursive:true,force:true});
}
