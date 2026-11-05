import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
const base="http://127.0.0.1:8769/";
const contexts=[];
async function phone(name){
  const ctx=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,permissions:["camera"]});
  contexts.push(ctx);
  await ctx.route("**/*",r=>r.request().url().startsWith(base)?r.continue():r.abort("blockedbyclient"));
  await ctx.addInitScript(()=>{
    window.__camera=[];
    const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=constraints=>{
      window.__camera.push(constraints);return get(constraints);
    };
  });
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.log(name+"_PAGE_ERROR",String(e)));
  await page.goto(base+"ezero_secure_connect_live_p2p_v0_1.html",{waitUntil:"domcontentloaded"});
  return page;
}
try{
  const a=await phone("A"),b=await phone("B");
  assert.equal(await a.locator("#oneTapStartButton").isVisible(),true);
  assert.equal(await a.locator("#oneTapStage").isHidden(),true);
  for(const id of ["chooseNearby","chooseRemote","guidedOffer","guidedIncoming",
     "remoteSignal","callSetup","createOffer","applyAnswer"])
    assert.equal(await a.locator("#"+id).count(),0,"No legacy public UI: "+id);
  assert.equal(await a.evaluate(()=>window.__camera.length),0);
  assert.equal(await a.locator("#installAppButton").isVisible(),true);
  assert.equal(await a.locator("#shortConnectLink").getAttribute("href"),"./c.html");
  const policy=await a.locator(".privacy-link a").getAttribute("href");
  assert.equal(policy,"./ezero_secure_connect_privacy_v0_2.html");
  assert.equal(await a.evaluate(()=>typeof window.RTCPeerConnection),"function");
  assert.equal(await a.evaluate(()=>!!window.EZERO_PUBLIC_QR_CORE),true);
  for(const [lang,label] of [["en","Connect with a distant friend"],["ar","التواصل مع صديق بعيد"],["ur","دور موجود دوست سے رابطہ"]]){
    await a.locator("#language").selectOption(lang);
    assert.match(await a.locator("#distanceTitle").innerText(),new RegExp(label));
  }
  assert.equal(await a.evaluate(()=>window.__camera.length),0,
    "Changing language and initial page view must not open camera");

  // Share invocation starts with a real user action; only public signed data in URL.
  await a.evaluate(()=>{
    window.__shared=[];
    Object.defineProperty(navigator,"share",{configurable:true,
      value:async payload=>window.__shared.push(payload)});
  });
  await a.locator("#remoteInviteButton").click();
  await a.waitForFunction(()=>window.__shared?.length===1);
  const invite=await a.evaluate(()=>window.__shared[0].url);
  assert.equal(new URL(invite).pathname.endsWith("/c.html"),true);
  assert.match(new URL(invite).hash,/^#i=/);
  assert.equal(invite.includes("privateKey"),false);
  const previous=await a.evaluate(()=>JSON.parse(
    localStorage.getItem("ezero_secure_connect_pending_v0_2")));
  assert.deepEqual(Object.keys(previous[0]).sort(),["fp","id","until"],
    "Store only request ID, public fingerprint and expiry");
  console.log("PLATFORM_NEUTRAL_SIGNED_SHORT_INVITE_AND_MINIMAL_LOCAL_STORAGE: PASS");

  // c.html forwards the same fragment to actual site where friend can approve.
  await b.goto(invite,{waitUntil:"domcontentloaded"});
  await b.waitForFunction(()=>document.querySelector("#acceptInviteButton")?.hidden===false);
  assert.match(b.url(),/ezero_secure_connect_live_p2p_v0_1\.html$/);
  assert.equal(await b.locator("#incomingPanel").isVisible(),true);
  assert.match(await b.locator("#incomingStatus").innerText(),/دستخط شدہ شناخت درست/);
  assert.equal(await b.evaluate(()=>window.__camera.length),0,
    "Receiving an invitation must not open a camera");
  await b.evaluate(()=>{
    window.__shared=[];
    Object.defineProperty(navigator,"share",{configurable:true,
      value:async payload=>window.__shared.push(payload)});
  });
  await b.locator("#acceptInviteButton").click();
  await b.waitForFunction(()=>window.__shared?.length===1);
  const reply=await b.evaluate(()=>window.__shared[0].url);
  assert.equal(new URL(reply).pathname.endsWith("/c.html"),true);
  assert.match(new URL(reply).hash,/^#r=/);
  console.log("DISTANT_FRIEND_EXPLICIT_ACCEPT_AND_SIGNED_BOUND_REPLY: PASS");

  await a.goto(reply,{waitUntil:"domcontentloaded"});
  await a.waitForFunction(()=>document.querySelector("#incomingStatus")?.textContent.includes("جواب آپ کی اسی درخواست سے مل گیا"));
  assert.equal(await a.locator("#acceptInviteButton").isHidden(),true);
  assert.equal(await a.locator("#oneTapStage").isHidden(),true);
  assert.equal(await a.evaluate(()=>window.__camera.length),0);
  assert.equal(await a.evaluate(()=>localStorage.getItem("ezero_secure_connect_pending_v0_2")),null);
  console.log("SIGNATURE_VERIFIED_REPLY_MATCHES_ORIGINAL_REQUEST_WITHOUT_CALL: PASS");

  await b.goto(base+"c.html#i=bad-token",{waitUntil:"domcontentloaded"});
  await b.waitForFunction(()=>document.querySelector("#incomingStatus")?.textContent.includes("غلط"));
  assert.equal(await b.locator("#acceptInviteButton").isHidden(),true);
  console.log("INVALID_INVITE_FAILS_CLOSED: PASS");

  // Real QR verification reuses explicit camera consent.
  const bIdentity=await b.evaluate(()=>window.EZERO_PUBLIC_QR_CORE.identity());
  await a.evaluate(token=>{
    window.BarcodeDetector=class{
      constructor({formats}){if(!formats.includes("qr_code"))throw Error("BAD_FORMAT");}
      async detect(){return [{rawValue:token}];}
    };
  },bIdentity.token);
  await a.locator("#oneTapStartButton").click();
  await a.waitForFunction(()=>document.querySelector("#oneTapResult")?.dataset.kind==="success",
    {timeout:15000});
  assert.equal(await a.evaluate(()=>window.__camera.length),1);
  assert.equal(await a.evaluate(()=>window.__camera[0].audio),false);
  console.log("ONE_CLICK_CAMERA_CONSENT_SIGNED_QR_NO_MIC: PASS");

  const installed=await phone("INSTALLED");
  await installed.addInitScript(()=>{
    const m=window.matchMedia.bind(window);
    window.matchMedia=q=>q.includes("display-mode: standalone")?
      {matches:true,addEventListener(){},removeEventListener(){}}:m(q);
  });
  await installed.reload();
  assert.equal(await installed.locator("#installAppButton").isHidden(),true);
  assert.match(await installed.locator("#installHelp").innerText(),/پہلے سے ایپ/);
  console.log("ALREADY_INSTALLED_STANDALONE_HIDES_REINSTALL: PASS");

  const denied=await phone("DENIED");
  await denied.evaluate(()=>{
    window.BarcodeDetector=class{async detect(){return [];}};
    navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Not allowed","NotAllowedError");};
  });
  await denied.locator("#oneTapStartButton").click();
  await denied.waitForFunction(()=>document.querySelector("#oneTapResult")?.dataset.kind==="error");
  assert.match(await denied.locator("#oneTapResult").innerText(),/اجازت/);
  assert.equal(await denied.locator("#oneTapStop").isHidden(),true);
  console.log("CAMERA_DENIED_VISIBLE_NO_AUTO_RETRY: PASS");
}finally{
  for(const c of contexts)await c.close().catch(()=>{});
  await browser.close();
}
