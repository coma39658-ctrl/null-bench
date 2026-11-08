"use strict";
/* Browser-only, THREE isolated device profiles. No real cameras/phones.
 * Test served from isolated candidate files under the real HTTPS origin alias.
 * Signed contact forwarding MUST NOT imply a verified human identity or trust.
 */
import assert from "node:assert/strict";
import {chromium,webkit,firefox} from "playwright";

const BASE="http://127.0.0.1:8769/";
const PUBLIC="https://coma39658-ctrl.github.io/null-bench/";
const FILE="ezero_trusted_friends_staging_20261106.html";
const family=process.env.EZERO_BROWSER||"chromium";
const browserType={chromium,webkit,firefox}[family];
assert.ok(browserType,"valid Playwright browser");
const browser=await browserType.launch({headless:true,args:family==="chromium"?["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]:[]});
const contexts=[];
const screen=family==="firefox"?{width:1366,height:768}:family==="webkit"?{width:390,height:844}:{width:360,height:780};
const mobile=family!=="firefox";
const errors=[];
async function phone(name) {
  const ctx=await browser.newContext({
    viewport:screen,isMobile:mobile,hasTouch:mobile,locale:"en-US"
  });
  contexts.push(ctx);
  await ctx.route(PUBLIC+"**",async route=>{
    const url=new URL(route.request().url());
    const relative=url.pathname.slice("/null-bench/".length);
    const response=await ctx.request.get(BASE+relative+url.search);
    await route.fulfill({response});
  });
  await ctx.addInitScript(()=>{
    window.__referralShares=[];
    window.__mediaAttempt=0;
    Object.defineProperty(navigator,"share",{configurable:true,
      value:async item=>{window.__referralShares.push(item);}});
    // A contact-card action must never activate camera or microphone.
    if(navigator.mediaDevices?.getUserMedia){
      const old=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia=(...args)=>{
        window.__mediaAttempt++; return old(...args);
      };
    }
  });
  const page=await ctx.newPage();
  page.on("pageerror",e=>errors.push(name+": "+e.message));
  return page;
}
function linkBody(url){
  const u=new URL(url);
  return JSON.parse(Buffer.from(u.hash.slice("#contact=".length),"base64url").toString("utf8"));
}
try{
  const a=await phone("OWNER");
  const b=await phone("FORWARDER");
  const c=await phone("RECIPIENT");
  await a.goto(PUBLIC+FILE+"?contactStage=1",{waitUntil:"domcontentloaded"});
  await a.locator("#ezeroForwardCreate").waitFor();
  // Owner creates a saved, non-extractable per-browser P-256 identity.
  const identity=await a.evaluate(async ()=>{
    const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
    const raw=new Uint8Array(await crypto.subtle.exportKey("spki",keys.publicKey));
    let text="";for(const v of raw)text+=String.fromCharCode(v);
    const spki=btoa(text).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
    const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",raw));
    const fp=Array.from(digest,x=>x.toString(16).padStart(2,"0")).join("");
    await window.EZERO_DEVICE_IDENTITY_STORE.save(keys,spki,fp);
    localStorage.setItem("ezero_secure_connect_staging_local_profile_v0_1",
      JSON.stringify({name:"Ali Device Owner",share:true,avatar:""}));
    return fp;
  });
  assert.match(identity,/^[a-f0-9]{64}$/);
  assert.equal(await a.locator("#ezeroForwardShareMine").isDisabled(),true);
  await a.locator("#ezeroForwardCreate").click();
  assert.match(await a.locator("#ezeroForwardStatus").innerText(),/اجازت|consent|موافقة/i);
  await a.locator("#ezeroForwardConsent").check();
  await a.locator("#ezeroForwardCreate").click();
  await a.waitForFunction(()=>document.getElementById("ezeroForwardShareMine")?.disabled===false);
  await a.locator("#ezeroForwardShareMine").click();
  await a.waitForFunction(()=>window.__referralShares?.length===1);
  const signed=await a.evaluate(()=>window.__referralShares[0].url);
  assert.equal(linkBody(signed).p.name,"Ali Device Owner");
  assert.equal(linkBody(signed).p.fp,identity);
  assert.ok(!signed.includes("room=")&&!signed.includes("privateKey"));
  assert.equal(await a.evaluate(()=>window.__mediaAttempt),0);
  console.log("OWNER_EXPLICIT_CONSENT_DEVICE_SIGNED_CONTACT_"+family+": PASS");

  await b.goto(signed,{waitUntil:"domcontentloaded"});
  await b.locator("#ezeroForwardIncomingName").waitFor();
  await b.waitForFunction(()=>document.getElementById("ezeroForwardIncoming")?.hidden===false);
  assert.equal(await b.locator("#ezeroForwardIncomingName").textContent(),"Ali Device Owner");
  assert.equal(await b.locator("#ezeroForwardIncomingFp").textContent()?.slice(0,16),identity.slice(0,16));
  assert.equal(await b.evaluate(()=>localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")),null);
  await b.locator("#ezeroForwardSave").click();
  await b.waitForFunction(()=>JSON.parse(localStorage.getItem("ezero_signed_forwarded_public_contacts_stage_v0_1")||"[]").length===1);
  await b.locator("#ezeroForwardShareReceived").click();
  await b.waitForFunction(()=>window.__referralShares?.length===1);
  const forwarded=await b.evaluate(()=>window.__referralShares[0].url);
  assert.equal(forwarded,signed,"Third-party forwarding must preserve owner's signature");
  console.log("SECOND_DEVICE_SAVES_PENDING_NO_AUTO_TRUST_AND_FORWARDS_"+family+": PASS");

  await c.goto(forwarded,{waitUntil:"domcontentloaded"});
  await c.waitForFunction(()=>document.getElementById("ezeroForwardIncoming")?.hidden===false);
  assert.equal(await c.locator("#ezeroForwardIncomingName").textContent(),"Ali Device Owner");
  assert.equal(await c.evaluate(()=>window.__mediaAttempt),0);
  const altered=new URL(forwarded);
  const data=linkBody(forwarded);
  data.p.name="Fake Owner";
  altered.hash="contact="+Buffer.from(JSON.stringify(data),"utf8").toString("base64url");
  await c.goto(altered.href,{waitUntil:"domcontentloaded"});
  await c.waitForFunction(()=>document.getElementById("ezeroForwardStatus")?.textContent?.length>0);
  assert.equal(await c.locator("#ezeroForwardIncoming").isHidden(),true);
  assert.match(await c.locator("#ezeroForwardStatus").innerText(),/غلط|invalid|غير صحيح/i);
  assert.equal(await c.evaluate(()=>localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")),null);
  assert.equal(await c.evaluate(()=>window.__mediaAttempt),0);
  console.log("THIRD_DEVICE_VALID_CARD_AND_TAMPER_FAIL_CLOSED_"+family+": PASS");

  for(const p of [a,b,c]){
    const geometry=await p.evaluate(()=>({
      viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
      root:!!document.getElementById("ezeroUnifiedCard"),
      callButtons:document.querySelectorAll('[data-modern-select="audio"],[data-modern-select="video"]').length,
      contact:!!document.getElementById("ezeroForwardContactStage")
    }));
    assert.equal(geometry.root,true);
    assert.equal(geometry.callButtons,2,"Existing audio/video controls remain present");
    assert.equal(geometry.contact,true);
    assert.ok(geometry.scrollWidth<=geometry.viewport+2,
      "No horizontal overflow on "+family+" "+JSON.stringify(geometry));
  }
  // Distinct browser storage prevents a signed card from automatically becoming a friend.
  assert.equal(await a.evaluate(()=>window.__mediaAttempt),0);
  assert.equal(await b.evaluate(()=>window.__mediaAttempt),0);
  assert.equal(errors.length,0,"No uncaught page errors: "+errors.join("; "));
  console.log("THREE_DEVICE_BROWSER_LAYOUT_AND_NO_UNSOLICITED_MEDIA_"+family+": PASS");
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
