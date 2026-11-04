import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const origin="http://127.0.0.1:8769";
const contexts=[];
async function makePhone(){
 const context=await browser.newContext({
  viewport:{width:393,height:852},isMobile:true,hasTouch:true
 });
 contexts.push(context);
 await context.route("**/*",route=>{
  if(route.request().url().startsWith(origin+"/"))return route.continue();
  return route.abort("blockedbyclient");
 });
 await context.addInitScript(()=>{
  window.__ezeroMicCalls=0;
  if(navigator.mediaDevices?.getUserMedia){
   const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=(constraints)=>{
    window.__ezeroMicCalls++;return original(constraints);
   };
  }
  window.__ezeroNetworkCalls=0;
  const nativeFetch=window.fetch.bind(window);
  window.fetch=(...args)=>{
   window.__ezeroNetworkCalls++;return nativeFetch(...args);
  };
 });
 const page=await context.newPage();
 page.on("pageerror",e=>console.log("CALL_DOCTOR_PAGE_ERROR",String(e).slice(0,150)));
 await page.goto(origin+"/ezero_secure_connect_live_p2p_v0_1.html");
 await page.waitForFunction(()=>document.querySelector("#myFingerprint")?.textContent.length===64);
 return page;
}
const a=await makePhone(),b=await makePhone();
try{
 const startA=await a.evaluate(()=>({mic:window.__ezeroMicCalls,net:window.__ezeroNetworkCalls}));
 await a.locator("#doctorRun").click();
 await b.locator("#doctorRun").click();
 await Promise.all([a,b].map(p=>p.waitForFunction(()=>
  document.querySelector("#doctorCopy")?.disabled===false)));
 const vA=await a.locator("#doctorVersion").innerText();
 const vB=await b.locator("#doctorVersion").innerText();
 assert.equal(vA,vB);
 assert.match(vA,/EZERO-CALL-20261104-DOCTOR-V1/);
 assert.equal(await a.evaluate(()=>window.__ezeroMicCalls),startA.mic,
  "One-tap check cannot open microphone/camera");
 assert.equal(await a.evaluate(()=>window.__ezeroNetworkCalls),startA.net,
  "One-tap readiness cannot fetch/poll any server");
 assert.match(await a.locator("#doctorStatus").innerText(),/مکمل/);
 assert.match(await a.locator("#doctorChecks").innerText(),/WebRTC/);
 assert.match(await a.locator("#doctorChecks").innerText(),/ابھی اس فون پر حقیقی WebRTC کال کنیکٹ نہیں/);
 const contentA=await a.locator("#doctorReport").inputValue();
 assert.match(contentA,/DOCTOR_BUILD: EZERO-CALL-20261104-DOCTOR-V1/);
 for(const stamp of ["20261104-CORE-SIGNED-R1","20261104-LINK-PRIVATE-R1","20261104-COPILOT-LOCAL-R1"]){
  assert.ok(contentA.includes(stamp),"Component build marker missing: "+stamp);
 }
 const contentB=await b.locator("#doctorReport").inputValue();
 assert.equal(contentA,contentB,"Both phones should show identical component build IDs in this controlled test");
 assert.doesNotMatch(contentA,/192\.168\.|candidate:|fingerprint:|EZERO1\.|callroom=/);
 console.log("TWO_ANDROID_PHONE_COMPONENT_BUNDLE_MATCH_ZERO_MIC_ZERO_NETWORK_NO_FALSE_CALL: PASS");

 // Sensitive fields may already contain secrets, but diagnostic MUST omit all
 // network addresses/SDP/identity/friend names/messages and copied call links.
 await a.evaluate(()=>{
  document.querySelector("#friendIdInput").value="FRIEND_PRIVATE_SIGNED_QR_CONTENT";
  document.querySelector("#remoteSignal").value="MY_PRIVATE_SDP_192.168.1.25";
  document.querySelector("#localSignal").value="MY_SECRET_ICE_987654";
  document.querySelector("#roomLink").value="https://example/#callroom=STOLEN_PRIVATE_BEARER";
  document.querySelector("#sendText").value="BANK_PIN_104923";
  window.__safeCopied=null;
  Object.defineProperty(navigator,"clipboard",{configurable:true,value:{
   writeText:async text=>{window.__safeCopied=text;}
  }});
 });
 await a.locator("#doctorRun").click();
 await a.locator("#doctorReportDetails").evaluate(el=>el.open=true);
 await a.locator("#doctorCopy").click();
 const copied=await a.evaluate(()=>window.__safeCopied);
 assert.equal(copied,await a.locator("#doctorReport").inputValue());
 for(const marker of ["FRIEND_PRIVATE","MY_PRIVATE","MY_SECRET","STOLEN_PRIVATE","BANK_PIN"]){
  assert.equal(copied.includes(marker),false,"Forbidden secret leaked "+marker);
 }
 console.log("NO_FINGERPRINT_SDP_CALL_LINK_MESSAGE_OR_PRIVATE_DATA_IN_REPORT: PASS");

 await a.evaluate(()=>{
  Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>false});
  Object.defineProperty(navigator,"permissions",{configurable:true,value:{
   query:async()=>({state:"denied"})
  }});
 });
 await a.locator("#doctorRun").click();
 const results=await a.locator("#doctorChecks").innerText();
 assert.match(results,/فون آف لائن/);
 assert.match(results,/مائیکروفون کی اجازت بند/);
 const blocked=await a.locator(".doctor-check[data-type='block']").count();
 assert.ok(blocked>=1,"Denied mic must be shown as block, not false permission");
 assert.equal(await a.evaluate(()=>window.__ezeroMicCalls),startA.mic);
 console.log("OFFLINE_DENIED_MIC_PERMISSION_READ_ONLY_FAIL_CLOSED: PASS");

 await a.evaluate(()=>{
  Object.defineProperty(navigator,"onLine",{configurable:true,get:()=>true});
  Object.defineProperty(navigator,"permissions",{configurable:true,value:{
   query:async()=>{throw Error("Not supported")}
  }});
  window.RTCPeerConnection=undefined;
 });
 await a.locator("#doctorRun").click();
 assert.match(await a.locator("#doctorChecks").innerText(),/WebRTC/);
 const blockedAgain=await a.locator(".doctor-check[data-type='block']").count();
 assert.ok(blockedAgain>=1);
 assert.match(await a.locator("#doctorChecks").innerText(),/اجازت کی حالت نہیں پڑھی جا سکی/);
 console.log("UNSUPPORTED_BROWSER_AND_PERMISSION_API_CAUTION_NOT_FAKE_READY: PASS");

 // Preflight checks actual connection only when the existing core reports a
 // real peer connection event. It does not create this claim itself.
 await b.evaluate(()=>document.dispatchEvent(new CustomEvent("ezero:call-status",{
  detail:{stage:"connected"}})));
 await b.waitForFunction(()=>document.querySelector("#doctorChecks")?.textContent.includes("حقیقی WebRTC کنکشن قائم"));
 await b.evaluate(()=>document.dispatchEvent(new CustomEvent("ezero:call-status",{
  detail:{stage:"offline"}})));
 await b.waitForFunction(()=>document.querySelector("#doctorChecks")?.textContent.includes("ابھی اس فون پر حقیقی"));
 console.log("CALL_CONNECTED_BADGE_ONLY_FROM_EXISTING_WEBRTC_STATE: PASS");

 await a.locator("#language").selectOption("en");
 assert.match(await a.locator("#doctorTitle").innerText(),/Call Doctor/);
 assert.match(await a.locator("#doctorStatus").innerText(),/Not checked/);
 await a.locator("#doctorRun").click();
 assert.match(await a.locator("#doctorChecks").innerText(),/Microphone blocked|Permission state unavailable/);
 await a.locator("#language").selectOption("ar");
 assert.match(await a.locator("#doctorTitle").innerText(),/طبيب/);
 await a.locator("#doctorRun").click();
 assert.match(await a.locator("#doctorChecks").innerText(),/WebRTC/);
 assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 console.log("URDU_ENGLISH_ARABIC_READINESS_AND_MOBILE_NO_HORIZONTAL_SCROLL: PASS");

 // Installed standalone app indicator is deliberately distinct from browser
 // tab; reports no guarantee that its cached code is the freshest version.
 await b.evaluate(()=>{
  // Explicitly simulate the standalone PWA indicator without changing
  // the desktop test runner's real browser window.
  Object.defineProperty(navigator,"standalone",{
   configurable:true,get:()=>true
  });
  if(navigator.standalone!==true)throw Error("STANDALONE_TEST_SHIM_FAILED");
 });
 await b.locator("#doctorRun").click();
 assert.match(await b.locator("#doctorChecks").innerText(),/انسٹال شدہ ایپ/);
 assert.match(await b.locator("#doctorChecks").innerText(),/محفوظ شدہ/);
 console.log("PWA_STANDALONE_STALE_CACHE_RISK_EXPLAINED: PASS");
}finally{
 await Promise.allSettled(contexts.map(c=>c.close()));
 await browser.close();
}
