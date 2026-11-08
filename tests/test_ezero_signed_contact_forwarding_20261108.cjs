"use strict";
/* Signed public contact forwarding contract. No real calls, servers or keys sent. */
const assert=require("node:assert/strict");
const {webcrypto,createHash}=require("node:crypto");
const fs=require("node:fs");
if(!globalThis.crypto?.subtle)Object.defineProperty(globalThis,"crypto",{configurable:true,value:webcrypto});
const protocol=require("../js/ezero_contact_forwarding_protocol_v0_1.js");
const base="https://coma39658-ctrl.github.io/null-bench/ezero_trusted_friends_staging_20261106.html";
const b64=b=>Buffer.from(b).toString("base64url");
const j=token=>JSON.parse(Buffer.from(token,"base64url").toString("utf8"));
const enc=obj=>Buffer.from(JSON.stringify(obj),"utf8").toString("base64url");
async function assertReject(fn,pattern){await assert.rejects(fn,pattern);}
async function run(){
 const keys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const spki=b64(await webcrypto.subtle.exportKey("spki",keys.publicKey));
 const fingerprint=createHash("sha256").update(Buffer.from(spki,"base64url")).digest("hex");
 const identity={keys,spki,fingerprint};
 await assertReject(()=>protocol.create({identity,name:"Ali",baseUrl:base}),/OWNER_CONSENT_REQUIRED/);
 const made=await protocol.create({identity,name:"Ali",baseUrl:base,consent:true});
 assert.ok(made.url.startsWith(base+"#contact="));
 assert.ok(!made.url.includes("privateKey")&&!made.url.includes("room="));
 const view=await protocol.verify(made.url,{expectedOrigin:new URL(base).origin});
 assert.equal(view.name,"Ali");assert.equal(view.fp,fingerprint);
 assert.equal(view.proof,"SIGNED_DEVICE_KEY_NOT_HUMAN_IDENTITY");
 assert.ok(view.expires<=Date.now()+24*60*60*1000);
 console.log("FORWARD_SIGNED_PUBLIC_CONTACT_OWNER_OPT_IN: PASS");

 const raw=new URL(made.url);
 const body=j(raw.hash.slice("#contact=".length));
 body.p.name="Impersonated Ali";
 raw.hash="contact="+enc(body);
 await assertReject(()=>protocol.verify(raw.href,{expectedOrigin:new URL(base).origin}),
   /SIGNATURE_INVALID/);
 console.log("FORWARD_TAMPERED_NAME_REJECTED: PASS");

 await assertReject(()=>protocol.verify(made.url,{expectedOrigin:"https://attacker.test"}),
   /CROSS_ORIGIN_CONTACT/);
 await assertReject(()=>protocol.verify(made.url,{expectedOrigin:new URL(base).origin,
   now:Date.now()+25*60*60*1000}),/INVALID_OR_EXPIRED_CONTACT/);
 console.log("FORWARD_CROSS_ORIGIN_AND_EXPIRED_LINK_REJECTED: PASS");

 const attackerUrl=made.url.replace("coma39658-ctrl.github.io","attacker.example");
 await assertReject(()=>protocol.verify(attackerUrl,{expectedOrigin:new URL(base).origin}),
   /CROSS_ORIGIN_CONTACT/);
 const otherIdentity={...identity,fingerprint:"f".repeat(64)};
 await assertReject(()=>protocol.create({identity:otherIdentity,name:"Ali",baseUrl:base,consent:true}),
   /DEVICE_IDENTITY_MISMATCH/);
 console.log("FORWARD_WRONG_OWNER_IDENTITY_REJECTED: PASS");

 const html=fs.readFileSync("ezero_trusted_friends_staging_20261106.html","utf8");
 const sidecar=fs.readFileSync("js/ezero_contact_forwarding_stage_v0_1.js","utf8");
 for(const path of [
  "js/ezero_contact_forwarding_protocol_v0_1.js",
  "js/ezero_contact_forwarding_stage_v0_1.js",
  "css/ezero_contact_forwarding_stage_v0_1.css"
 ])assert.ok(html.includes("./"+path),"opt-in sidecar must be wired: "+path);
 assert.ok(sidecar.includes('get("contactStage")!=="1"'),"Only explicit pilot or incoming public link");
 assert.ok(sidecar.includes('!location.hash.startsWith("#contact=")'),"No unrelated page mutation");
 assert.ok(!/getUserMedia|RTCPeerConnection|new WebSocket|fetch\s*\(/.test(sidecar),
   "Public contact share can never create a call, capture media or connect network");
 assert.ok(!/localStorage\.setItem\(\s*["']ezero_secure_connect_staging_fingerprints/.test(sidecar),
   "Public contact card must not silently become trusted friend");
 console.log("FORWARD_OPT_IN_SIDECAR_NO_MEDIA_AUTO_TRUST: PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
