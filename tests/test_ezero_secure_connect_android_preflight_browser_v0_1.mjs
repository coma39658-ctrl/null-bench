import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
const host="http://127.0.0.1:8769",target=host+"/ezero_secure_connect_live_p2p_v0_1.html";
const html=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const js=fs.readFileSync("js/ezero_secure_connect_android_preflight_v0_1.js","utf8");
const sw=fs.readFileSync("service-worker.js","utf8");
const stamp=html.match(/<meta name="ezero-connect-build" content="([^"]+)">/)?.[1];
assert.equal(stamp,"ezero-connect-oneqr-easy-first-20261105-lab-v1");
assert.match(js,/X-EZERO-Readiness-Probe/);
assert.match(sw,/X-EZERO-Readiness-Probe/);
assert.ok(!/getUserMedia\s*\(|window\.location\.reload|location\.reload|caches\.delete|serviceWorker\.unregister|new WebSocket|new RTCPeerConnection/.test(js),
  "Readiness must not start a call, request media, reload, delete or open connections");
assert.match(js,/no-store/);
assert.match(js,/credentials:"same-origin"/);
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
let probeCount=0,external=0;
try{
 await ctx.route("**/*",route=>{
  if(route.request().url().startsWith(host+"/")){
   if(route.request().headers()["x-ezero-readiness-probe"]==="v1"){
    assert.equal(route.request().url(),target);
    assert.equal(route.request().method(),"GET");
    probeCount++;
   }
   return route.continue();
  }
  external++;return route.abort("blockedbyclient");
 });
 await ctx.addInitScript(()=>{
  window.__micRequests=0;
  const old=navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
  if(old)navigator.mediaDevices.getUserMedia=(...args)=>{window.__micRequests++;return old(...args);};
  window.__reloadRequests=0;
 });
 const page=await ctx.newPage();
 await page.goto(target);
 await page.waitForFunction(()=>document.querySelector("#androidReadinessRun")&&!document.querySelector("#androidReadinessRun").disabled);
 assert.equal(probeCount,0,"No probe before user click");
 assert.equal(await page.evaluate(()=>window.__micRequests),0);
 await page.locator("#oneQrAdvanced").evaluate(el=>el.open=true);
 await page.locator("#androidReadiness").evaluate(el=>el.open=true);
 await page.locator("#androidReadinessRun").click();
 await page.waitForFunction(()=>document.querySelector("#androidReadinessDetail")?.dataset.networkVersion==="current");
 assert.equal(probeCount,1,"One same-origin network probe, no polling");
 assert.equal(await page.locator("#androidReadinessDetail").getAttribute("data-local-ready"),"yes");
 assert.match(await page.locator("#androidReadinessDetail").innerText(),/WebRTC/);
 assert.equal(await page.evaluate(()=>window.__micRequests),0);
 assert.equal(external,0);
 console.log("ANDROID_ONE_TAP_FRESHNESS_NO_AUTO_MICROPHONE_OR_THIRD_PARTY: PASS");
 
 // Simulate offline page while retaining the already loaded app. Cache
 // fallback is not allowed to masquerade as the network's current build.
 await page.route("**/ezero_secure_connect_live_p2p_v0_1.html",route=>{
  if(route.request().headers()["x-ezero-readiness-probe"]==="v1")return route.abort("internetdisconnected");
  return route.continue();
 });
 await page.locator("#androidReadinessRun").click();
 await page.waitForFunction(()=>document.querySelector("#androidReadinessDetail")?.dataset.networkVersion==="unknown");
 assert.match(await page.locator("#androidReadinessDetail").innerText(),/تصدیق نہیں|unknown|Could not/);
 assert.equal(await page.evaluate(()=>window.__micRequests),0);
 console.log("ANDROID_CACHED_PAGE_OFFLINE_FAILS_UNKNOWN_NOT_FALSE_UP_TO_DATE: PASS");
 
 await page.locator("#language").selectOption("en");
 await page.locator("#androidReadinessRun").click();
 await page.waitForFunction(()=>document.querySelector("#androidReadinessStatus").dataset.state==="done");
 assert.match(await page.locator("#androidReadinessDetail").innerText(),/Could not confirm/);
 await page.locator("#language").selectOption("ar");
 assert.match(await page.locator("#androidReadinessRun").innerText(),/افحص/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
 console.log("ANDROID_READINESS_URDU_ENGLISH_ARABIC_MOBILE_NO_OVERFLOW: PASS");
}finally{await ctx.close();await browser.close();}
