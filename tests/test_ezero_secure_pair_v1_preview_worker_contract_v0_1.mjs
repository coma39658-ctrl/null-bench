import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import worker from "../secure_connect/pair_v1/preview_worker_lab/worker.mjs";

const config=JSON.parse(readFileSync(
 "secure_connect/pair_v1/preview_worker_lab/wrangler.jsonc","utf8")
 .replace(/^\s*\/\/.*$/gm,""));
assert.equal(config.workers_dev,false);
assert.equal(config.assets.run_worker_first,true);
assert.equal(config.assets.binding,"ASSETS");
assert.equal(config.assets.directory,"./public");
assert.equal(config.observability.enabled,false);
assert.equal(config.durable_objects,undefined);
assert.equal(config.vars,undefined);
const old=JSON.parse(readFileSync(
 "secure_connect/call_room_lab/wrangler.jsonc","utf8")
 .replace(/^\s*\/\/.*$/gm,""));
assert.equal(old.vars.ROOMS_ENABLED,"false");
assert.equal(old.name,"ezero-secure-connect-call-lab-disabled");
console.log("PREVIEW_CONFIG_WORKER_FIRST_NO_PUBLIC_ROUTE_AND_LIVE_ROOMS_OFF: PASS");

const html=readFileSync(
 "secure_connect/pair_v1/preview_worker_lab/public/index.html","utf8");
assert.match(html,/<html lang="ur" dir="rtl">/);
assert.match(html,/name="robots" content="noindex,nofollow,noarchive"/);
assert.match(html,/E-ZERO/);
assert.match(html,/ایک QR/);
assert.ok(!/<form\b|<input\b|<script\b/i.test(html),
 "Static preview must contain no data collection or executable scripts");
let assetCalls=0;
const env={
 ASSETS:{async fetch(request){
  assetCalls++;
  const path=new URL(request.url).pathname;
  if(path!=="/"&&path!=="/index.html")
   throw Error("UNKNOWN_ASSET_SHOULD_NEVER_BE_REACHED");
  return new Response(html,{status:200,headers:{
   "Content-Type":"text/html; charset=utf-8",
   "Set-Cookie":"faked=never-expose",
   "Access-Control-Allow-Origin":"*",
   "Cache-Control":"public,max-age=31536000"
  }});
 }},
 AUTH_ENABLED:"true",ROOMS_ENABLED:"true",PAIR_ENABLED:"true"
};
async function call(path,init){
 return worker.fetch(new Request("https://preview.example.test"+path,init),env);
}
const root=await call("/");
assert.equal(root.status,200);
const page=await root.text();
assert.match(page,/تجرباتی حالت/);
assert.equal(root.headers.get("set-cookie"),null);
assert.equal(root.headers.get("access-control-allow-origin"),null);
assert.equal(root.headers.get("cache-control"),"no-store, private, max-age=0");
assert.equal(root.headers.get("x-robots-tag"),"noindex, nofollow, noarchive");
assert.equal(root.headers.get("x-frame-options"),"DENY");
assert.match(root.headers.get("content-security-policy"),/default-src 'none'/);
assert.equal(root.headers.get("permissions-policy"),
 "camera=(), microphone=(), geolocation=()");
assert.equal((await call("/index.html")).status,200);
assert.equal(assetCalls,2);
console.log("PREVIEW_HTML_URDU_MOBILE_NO_LOGIN_NO_JS_AND_PRIVACY_HEADERS: PASS");

for(const path of [
 "/api","/api/","/api/ezero-pair/v1/session/status",
 "/api/ezero-pair/v1/session/logout",
 "/api/ezero-pair/v1/auth/register",
 "/api/ezero-pair/v1/auth/login",
 "/api/ezero-pair/v1/trusted-devices/activate",
 "/api/ezero-pair/v1/call",
 "/secure-pair/","/secure-pair/connect"
]){
 const r=await call(path);
 assert.equal(r.status,503,path);
 const data=await r.json();
 assert.equal(data.status,"AUTH_AND_CALLS_NOT_AVAILABLE");
 assert.equal(data.publicPairingEnabled,false);
 assert.equal(data.publicCallingEnabled,false);
 assert.equal(data.authenticatedAccountEnabled,false);
 assert.equal(r.headers.get("Access-Control-Allow-Origin"),null);
 assert.equal(r.headers.get("Set-Cookie"),null);
}
assert.equal(assetCalls,2,"No API or pairing path bypasses the Worker");
for(const path of ["/private.key","/wrangler.jsonc","/.env",
 "/.well-known/config","/scripts/","/foo"])
 assert.equal((await call(path)).status,404,path);
for(const path of ["/?token=secret","/health?token=secret",
 "/index.html#fragment","/%61pi/","/api?x=y"])
 assert.equal((await call(path)).status,400,path);
assert.equal((await call("/health")).status,200);
assert.equal((await call("/health",{method:"POST"})).status,405);
assert.equal((await call("/",{method:"POST"})).status,405);
assert.equal((await call("/api/ezero-pair/v1/auth/login",{
 method:"POST",headers:{"content-type":"application/json"},
 body:JSON.stringify({approved:true})})).status,503);
assert.equal(assetCalls,2);
console.log("PREVIEW_API_LOGIN_PAIRING_CALLS_NEVER_ENABLED_EVEN_FORGED_FLAGS: PASS");
console.log("PREVIEW_BLOCKS_UNKNOWN_FILES_QUERY_SECRETS_AND_POSTS: PASS");
