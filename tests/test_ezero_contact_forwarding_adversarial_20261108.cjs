"use strict";
/* E-ZERO offline adversarial QA. Against local protocol only; no live attacks,
 * no usernames, credentials, device/media access or outside networks. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {webcrypto,createHash}=require("node:crypto");
if(!globalThis.crypto?.subtle)
  Object.defineProperty(globalThis,"crypto",{configurable:true,value:webcrypto});
const api=require("../js/ezero_contact_forwarding_protocol_v0_1.js");
const base="https://coma39658-ctrl.github.io/null-bench/ezero_trusted_friends_staging_20261106.html";
const origin=new URL(base).origin;
const encode=value=>Buffer.from(JSON.stringify(value),"utf8").toString("base64url");
const decode=url=>JSON.parse(Buffer.from(new URL(url).hash.slice(9),"base64url").toString("utf8"));
function altered(url,change){
  const u=new URL(url),o=decode(url);
  change(o);
  u.hash="contact="+encode(o);
  return u.href;
}
async function bad(label,link,options={expectedOrigin:origin}){
  await assert.rejects(()=>api.verify(link,options),undefined,label);
  console.log("REJECT_"+label+": PASS");
}
async function identity(){
  const keys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const raw=Buffer.from(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  return {keys,spki:raw.toString("base64url"),
    fingerprint:createHash("sha256").update(raw).digest("hex")};
}
async function run(){
  const id=await identity(),now=Date.now();
  const card=(await api.create({identity:id,name:"Ali",baseUrl:base,consent:true,now})).url;
  const verified=await api.verify(card,{expectedOrigin:origin,now});
  assert.equal(verified.fp,id.fingerprint);
  assert.equal(verified.proof,"SIGNED_DEVICE_KEY_NOT_HUMAN_IDENTITY");
  // A public signed contact may be forwarded/reopened; repeat reading is NOT
  // authentication, a friend acceptance, or a replayable call request.
  const twice=await api.verify(card,{expectedOrigin:origin,now});
  assert.equal(twice.fp,id.fingerprint);
  assert.equal(Object.hasOwn(twice,"trusted"),false);
  assert.equal(Object.hasOwn(twice,"call"),false);
  console.log("PUBLIC_SIGNED_IDENTITY_NOT_A_TRUST_OR_CALL_TOKEN: PASS");

  const edits={
    name:o=>{o.p.name="Another Person";},
    fp:o=>{o.p.fp="e".repeat(64);},
    spki:o=>{o.p.spki=o.p.spki.slice(0,-1)+(o.p.spki.at(-1)==="A"?"B":"A");},
    origin:o=>{o.p.origin="https://attacker.invalid";},
    issued:o=>{o.p.issued-=5000;},
    expires:o=>{o.p.expires-=5000;},
    nonce:o=>{o.p.nonce="A".repeat(22);},
    version:o=>{o.p.v=2;},
    type:o=>{o.p.type="EZERO-AUTH-1";},
    consent:o=>{o.p.allowForward=false;},
    signature:o=>{o.s=Buffer.alloc(64).toString("base64url");}
  };
  for(const [label,edit] of Object.entries(edits))
    await bad("SIGNED_FIELD_TAMPER_"+label,altered(card,edit),{expectedOrigin:origin,now});

  await bad("CROSS_ORIGIN",card,{expectedOrigin:"https://attacker.invalid",now});
  await bad("EXPIRED_CARD",card,{expectedOrigin:origin,now:now+25*60*60*1000});
  await bad("FUTURE_ISSUE",card,{expectedOrigin:origin,now:now-120000});
  await bad("WRONG_ROUTE",card.replace("ezero_trusted_friends_staging_20261106.html","index.html"));
  await bad("INSECURE_HTTP",card.replace("https://","http://"));
  await bad("UNEXPECTED_QUERY",card.replace(".html#",".html?debug=1#"));
  await bad("FRAGMENT_PARAM_INJECTION",card+"&owner=admin");
  await bad("TOKEN_OVERSIZE",base+"#contact="+"A".repeat(2200));
  await bad("BAD_BASE64",base+"#contact=!!");
  await assert.rejects(()=>api.create({identity:id,name:"A".repeat(41),baseUrl:base,consent:true}),/INVALID_NAME/);
  await assert.rejects(()=>api.create({identity:id,name:"Ali",baseUrl:base}),/OWNER_CONSENT_REQUIRED/);
  await assert.rejects(()=>api.create({identity:id,name:"Ali",baseUrl:"http://attacker.invalid/fake.html",consent:true}),/INVALID_CONTACT_URL/);
  console.log("BOUNDS_URL_AUTHORIZATION_AND_CONSENT: PASS");

  // Malicious text is a valid self-declared *name*, not HTML. It is displayed
  // only as textContent, even if an owner maliciously signs such a display name.
  const xss="<img src=x onerror=alert(1)>";
  const evil=await api.create({identity:id,name:xss,baseUrl:base,consent:true,now});
  assert.equal((await api.verify(evil.url,{expectedOrigin:origin,now})).name,xss);
  const ui=fs.readFileSync("js/ezero_contact_forwarding_stage_v0_1.js","utf8");
  assert.ok(ui.includes("incomingName.textContent=item.name"),
    "Signed display names must use inert textContent");
  assert.ok(!/\binnerHTML\b|\binsertAdjacentHTML\b|\beval\s*\(/.test(ui));
  assert.ok(!/\bfetch\s*\(|new WebSocket|RTCPeerConnection|getUserMedia/.test(ui),
    "Public contact view must not auto-start network, calls or media");
  assert.ok(!/localStorage\.setItem\(\s*["']ezero_secure_connect_staging_fingerprints/.test(ui),
    "A contact must not auto-become a trusted friend");
  assert.ok(ui.includes('window.addEventListener("hashchange"'),
    "Same-tab forwarded contact navigation must be revalidated");
  assert.ok(ui.includes("revision!==referralRevision"),
    "Stale async signature results must not restore old identities");
  console.log("INERT_SELF_DECLARED_NAME_NO_DOM_XSS_OR_AUTO_TRUST: PASS");
  console.log("EZERO_OFFLINE_ADVERSARIAL_SECURITY_GATE: PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1;});