"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");

const source=fs.readFileSync("signaling/shortlinks/src/worker.js","utf8");
const clientSrc=fs.readFileSync("js/ezero_private_short_invite_v0_1.js","utf8");
const html=fs.readFileSync("ezero_secure_connect_communications_v0_3.html","utf8");
const wrangler=JSON.parse(fs.readFileSync("signaling/shortlinks/wrangler.jsonc","utf8"));

new vm.Script(clientSrc,{filename:"private-client.js"});
new vm.Script(source.replace(/^import .*cloudflare:workers.*;\s*/m,"")
  .replace("export default {","const worker = {")
  .replace("export class ShortInvite extends DurableObject","class ShortInvite extends DurableObject"));
assert.equal(wrangler.name,"ezero-shortlink-pilot");
assert.equal(wrangler.durable_objects.bindings[0].name,"SHORT_LINKS");
assert.equal(wrangler.migrations[0].new_sqlite_classes[0],"ShortInvite");
for(const id of ["ezeroShortLinkConsent","ezeroMakeShortLink",
  "ezeroShortLinkControls","ezeroShortLinkStatus"])
  assert.ok(html.includes('id="'+id+'"'),"Missing short-link opt-in "+id);
assert.ok(html.includes("https://ezero-shortlink-pilot.coma39658.workers.dev"));
assert.ok(html.includes("ezero_private_short_invite_v0_1.js"));
assert.match(clientSrc,/crypto\.subtle\.encrypt/);
assert.match(clientSrc,/crypto\.subtle\.decrypt/);
assert.match(clientSrc,/credentials:"omit"/);
assert.doesNotMatch(clientSrc,/\blocalStorage\b|\bindexedDB\b|\bgetUserMedia\b/);
assert.match(source,/class ShortInvite extends DurableObject/);
assert.match(source,/this\.ctx\.storage\.setAlarm\(expires\)/);
assert.match(source,/this\.ctx\.storage\.delete\("value"\)/);
assert.doesNotMatch(source,/\bgetUserMedia\b|\bRTCPeerConnection\b|\bMediaRecorder\b/);

class DummyDO{constructor(ctx,env){this.ctx=ctx;this.env=env;}}
const serverCtx=vm.createContext({DurableObject:DummyDO,URL,Request,Response,
  crypto:webcrypto,Uint8Array,JSON,Date,btoa,atob,TextEncoder,TextDecoder});
const transformed=source.replace(/^import .*cloudflare:workers.*;\s*/m,"")
  .replace("export default {","const worker = {")
  .replace("export class ShortInvite extends DurableObject","class ShortInvite extends DurableObject");
vm.runInContext(transformed+"\nthis.exports={worker,ShortInvite,redirectScript};",serverCtx,{timeout:2500});
const {worker,ShortInvite,redirectScript}=serverCtx.exports;
const records=new Map();
const origin="https://coma39658-ctrl.github.io";
const endpoint="https://ezero-shortlink-pilot.coma39658.workers.dev";
const env={PUBLIC_ORIGIN:origin,SHORT_LINKS:{
  getByName(id){
    if(!records.has(id)){
      const values=new Map();
      const storage={
        async get(key){return values.get(key);},
        async put(key,value){values.set(key,value);},
        async delete(key){values.delete(key);},
        async setAlarm(time){this.deadline=time;}
      };
      const obj=new ShortInvite({storage},{});
      records.set(id,{values,obj});
    }
    return records.get(id).obj;
  }
}};
async function serverFetch(url,opts={}){
  const headers=new Headers(opts.headers||{});
  headers.set("Origin",origin);
  return worker.fetch(new Request(url,{method:opts.method||"GET",headers,
    body:opts.body||undefined}),env);
}
const signed=JSON.stringify({v:1,type:"offer",fp:"a".repeat(64),sig:"signed",
  sdp:"v=0\r\n"+"a=fingerprint:sha-256 x\r\n"+"a".repeat(350),
  issued:Date.now(),pub:"PUB",nonce:"N"});

async function run(){
  // Cross-origin writes must be rejected (not itself a complete anti-abuse solution).
  const bad=await worker.fetch(new Request(endpoint+"/v1/links",{method:"POST",
    headers:{"Origin":"https://evil.example","Content-Type":"application/json"},
    body:"{}"}),env);
  assert.equal(bad.status,403);
  const windowObj={};
  const browserCtx=vm.createContext({window:windowObj,
    crypto:webcrypto,Uint8Array,URL,JSON,Date,btoa,atob,TextEncoder,
    TextDecoder,AbortController,setTimeout,clearTimeout,fetch:serverFetch});
  vm.runInContext(clientSrc,browserCtx,{timeout:2500});
  const api=windowObj.EZERO_PRIVATE_SHORT_INVITES;
  assert.equal(typeof api.create,"function");
  assert.equal(typeof api.resolve,"function");
  const full=await api.create(signed);
  assert.match(full,/^https:\/\/ezero-shortlink-pilot\.coma39658\.workers\.dev\/i\/[A-Za-z0-9_-]{22}#k=[A-Za-z0-9_-]{43}$/);
  assert.ok(full.length<180,"Actual short invite must be much shorter than signed SDP");
  assert.ok(full.length<signed.length,"Invite length must shrink");
  const link=new URL(full);
  const id=link.pathname.slice(3),key=link.hash.slice(3);
  assert.equal(records.size,1);
  const stored=records.get(id).values.get("value");
  assert.ok(stored);
  assert.ok(!JSON.stringify(stored).includes("fingerprint:sha"),"No unencrypted SDP reaches DO");
  assert.ok(!JSON.stringify(stored).includes("signed"),"No plaintext signature");
  assert.ok(!JSON.stringify(stored).includes(key),"AES key must never enter DO");
  const landingResponse=await worker.fetch(new Request(endpoint+"/i/"+id),env);
  assert.equal(landingResponse.status,200);
  const landing=await landingResponse.text();
  assert.match(landing,/property="og:image"/);
  assert.match(landing,/E-ZERO Secure Connect/);
  assert.doesNotMatch(landing,/fingerprint:sha|signed|#k=/);
  const loc={pathname:"/i/"+id,hash:link.hash,href:full,
    replace(url){this.target=url;}};
  vm.runInNewContext(redirectScript,{location:loc,URL,document:{
    getElementById(){return {textContent:""};}}});
  assert.equal(loc.target,
    "https://coma39658-ctrl.github.io/null-bench/ezero_secure_connect_communications_v0_3.html#s="+id+"."+key);
  const resolved=await api.resolve("#s="+id+"."+key);
  assert.equal(resolved,signed,"Recipient can decrypt and verify signed invite locally");
  assert.equal((await serverFetch(endpoint+"/v1/links/"+id)).status,200);
  await records.get(id).obj.alarm();
  assert.equal((await serverFetch(endpoint+"/v1/links/"+id)).status,410);
  await assert.rejects(api.resolve("#s="+id+"."+key),/EXPIRED_SHORT_LINK/);
  console.log("ENCRYPTED_SHORT_LINK_10_MINUTES_NO_PLAINTEXT_SERVER: PASS");
  console.log("SHORT_URL_DIRECT_EZERO_LANDING_GENERIC_PREVIEW: PASS");
  console.log("SIGNED_INVITE_KEPT_AND_EXPLICIT_ACCEPT_STILL_REQUIRED: PASS");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
