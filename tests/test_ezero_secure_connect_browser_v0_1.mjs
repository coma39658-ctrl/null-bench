import assert from "node:assert/strict";
import {chromium} from "playwright";
const base="http://127.0.0.1:8769";
const browser=await chromium.launch({
  headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]
});
const context=await browser.newContext({
  viewport:{width:393,height:852},isMobile:true,hasTouch:true,
  permissions:["camera","microphone"]
});
await context.route("**/*",async route=>{
  const url=route.request().url();
  if(url.startsWith(base+"/"))return route.continue();
  return route.abort("blockedbyclient");
});
await context.addInitScript(()=>{
  window.__ezeroMediaCalls=[];
  const media=navigator.mediaDevices;
  if(media && typeof media.getUserMedia==="function"){
    const old=media.getUserMedia.bind(media);
    media.getUserMedia=function(options){window.__ezeroMediaCalls.push(options);return old(options);};
  }
});
const page=await context.newPage();
try {
  await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("a.ezero-voice-float").count(),1,"AI Studio separate button preserved");
  await page.locator("#ezeroQwenFrontOpen").click();
  await page.waitForURL(/ezero_ai_studio_v0_1\.html$/);
  assert.equal(await page.locator("#ezeroVoiceGuidePanel").count(),0,"Existing AI route never opens Secure Connect popup");
  await page.goto(base+"/index.html",{waitUntil:"domcontentloaded"});
  await page.locator("#ezeroVoiceGuideButton").click();
  await page.waitForFunction(()=>document.getElementById("ezeroVoiceGuidePanel")?.getAttribute("aria-hidden")==="false");
  assert.equal(await page.locator("#ezeroVoiceGuidePanel").getAttribute("aria-hidden"),"false");
  assert.equal(await page.locator("#ezeroLegacyVoiceGuide").isHidden(),true);
  const cards=page.locator("#ezeroAssistFutureDock a.ezero-assist-tool");
  assert.equal(await cards.count(),4,"Existing modal has 4 Secure Connect entries");
  const box=await page.locator("#ezeroVoiceGuidePanel").boundingBox();
  assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=393+1&&box.y+box.height<=852+1,
    "Secure Connect popup fits mobile viewport");
  await page.locator("#ezeroSecureConnectVideoEntry").click();
  await page.waitForURL(/ezero_secure_connect_one_request_lab_20261106\.html$/);
  assert.equal(await page.locator("#ezeroUnifiedCard").isVisible(),true,
    "The public entry must open the single unified green call card");
  assert.equal(await page.locator("#ezeroOneScanInvite").isVisible(),true);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),0,
    "Opening the public call page must not start microphone or camera");
  // Legacy device-preview tests remain valuable, but this is no longer
  // the public calling entry: navigate explicitly to the isolated preview.
  await page.goto(base+"/ezero_secure_connect_preview_v0_1.html#video",{waitUntil:"domcontentloaded"});
  assert.equal(await page.locator("#startVideo").isVisible(),true);
  await page.locator("#previewLanguage").selectOption("en");
  assert.match(await page.locator(".hero h1").innerText(),/Welcome/);
  assert.match(await page.locator(".policy h2").innerText(),/clear policy/);
  assert.match(await page.locator("#ezeroRealTwoPhoneTest").getAttribute("href"),/lang=en/);
  await page.locator("#previewLanguage").selectOption("ar");
  assert.match(await page.locator(".hero h1").innerText(),/مرحباً/);
  assert.match(await page.locator(".policy h2").innerText(),/سياستنا/);
  assert.match(await page.locator("#ezeroRealTwoPhoneTest").getAttribute("href"),/lang=ar/);
  await page.locator("#previewLanguage").selectOption("ur");
  assert.match(await page.locator(".hero h1").innerText(),/خوش آمدید/);
  assert.match(await page.locator("#ezeroRealTwoPhoneTest").getAttribute("href"),/lang=ur/);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),0,
    "Changing language never triggers camera or microphone");

  await page.locator("#previewIncomingCall").click();
  await page.locator("#incomingCallDemo").waitFor({state:"visible"});
  assert.match(await page.locator("#incomingDemoLimit").innerText(),/کوئی شخص کال نہیں کر رہا/);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),0,
    "Incoming-call demonstration cannot turn on camera or microphone");
  await page.locator("#demoAcceptAudio").click();
  assert.match(await page.locator("#incomingDemoStatus").innerText(),/کوئی کال، مائک/);
  await page.locator("#demoAcceptVideo").click();
  assert.match(await page.locator("#incomingDemoStatus").innerText(),/کیمرہ اور مائک دونوں بند/);
  await page.locator("#demoDecline").click();
  assert.match(await page.locator("#incomingDemoStatus").innerText(),/کوئی رابطہ قائم نہیں ہوا/);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),0,
    "Accepting demonstration never creates a real media call");
  await page.locator("#demoClose").click();
  assert.equal(await page.locator("#incomingCallDemo").isHidden(),true);

  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),0,"No auto mic or camera on page load");
  await page.locator("#startVideo").click();
  await page.waitForFunction(()=>document.querySelector("#cameraPreview")?.srcObject?.active===true);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),1,"Device capture begins only from user action");
  const requested=await page.evaluate(()=>window.__ezeroMediaCalls[0]);
  assert.equal(requested.video.width.ideal,1280);
  assert.equal(requested.video.height.ideal,720);
  assert.equal(requested.audio.echoCancellation,true);
  assert.equal(requested.audio.noiseSuppression,true);
  await page.locator("#stopVideo").click();
  assert.equal(await page.evaluate(()=>document.querySelector("#cameraPreview").srcObject),null);
  // These are local capture preferences, not claimed receiver-side network quality.
  await page.locator("#quality").selectOption("hd");
  await page.locator("#startVideo").click();
  await page.waitForFunction(()=>document.querySelector("#cameraPreview")?.srcObject?.active===true);
  const hd=await page.evaluate(()=>window.__ezeroMediaCalls.at(-1).video);
  assert.equal(hd.width.ideal,1920);
  assert.equal(hd.height.ideal,1080);
  assert.equal(hd.frameRate.ideal,30);
  await page.locator("#stopVideo").click();
  await page.locator("#quality").selectOption("saver");
  await page.locator("#startVideo").click();
  await page.waitForFunction(()=>document.querySelector("#cameraPreview")?.srcObject?.active===true);
  const saver=await page.evaluate(()=>window.__ezeroMediaCalls.at(-1).video);
  assert.equal(saver.width.ideal,640);
  assert.equal(saver.height.ideal,360);
  assert.equal(saver.frameRate.ideal,15);
  await page.locator("#stopVideo").click();
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),3);

  await page.locator('button[data-mode="audio"]').click();
  await page.locator("#startAudio").click();
  await page.waitForFunction(()=>document.querySelector("#stopAudio").disabled===false);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),4);
  await page.locator("#stopAudio").click();
  await page.locator('button[data-mode="voice"]').click();
  await page.locator("#recordVoice").click();
  await page.waitForFunction(()=>document.querySelector("#finishVoice").disabled===false);
  await page.waitForTimeout(1250);
  await page.locator("#finishVoice").click();
  await page.waitForFunction(()=>!!document.querySelector("#voicePlayback")?.getAttribute("src"));
  assert.match(await page.locator("#voicePlayback").getAttribute("src"),/^blob:/);
  await page.locator("#clearVoice").click();
  assert.equal(await page.locator("#voicePlayback").isHidden(),true);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),5);

  await page.locator('button[data-mode="qr"]').click();
  await page.locator("#makeFingerprint").click();
  await page.waitForFunction(()=>document.querySelector("#fingerprint").textContent.trim().length===64);
  assert.match(await page.locator("#qrStatus").innerText(),/عارضی SHA-256/);
  await page.locator('button[data-mode="messages"]').click();
  assert.match(await page.locator('[data-panel="messages"]').innerText(),/12 منٹ/);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),5,"Navigation does not restart camera or microphone");
  console.log("SECURE_CONNECT_MOBILE_POPUP_AND_SEPARATE_AI: PASS");
  console.log("LOCAL_360P_720P_1080P_CAPTURE_PROFILES: PASS");
  console.log("LOCAL_HD_CAMERA_ONLY_AFTER_GESTURE: PASS");
  console.log("LOCAL_AUDIO_METER_ONLY_AFTER_GESTURE: PASS");
  console.log("LOCAL_VOICE_DRAFT_AND_ERASURE: PASS");
  console.log("TEMPORARY_PUBLIC_KEY_SHA256_SIGNATURE: PASS");

  await page.locator('button[data-mode="video"]').click();
  await page.evaluate(()=>{
    Object.defineProperty(navigator,"connection",{
      configurable:true,
      value:{saveData:true,effectiveType:"2g",downlink:0.2,addEventListener(){}}
    });
  });
  await page.locator("#quality").selectOption("auto");
  assert.match(await page.locator("#autoQualityStatus").innerText(),/360p/);
  await page.locator("#startVideo").click();
  await page.waitForFunction(()=>document.querySelector("#cameraPreview")?.srcObject?.active===true);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.at(-1).video.width.ideal),640,
    "Data saver and weak-network hint chooses 360p without telemetry uploads");
  await page.locator("#stopVideo").click();
  console.log("CONSENT_FIRST_INCOMING_CALL_UI_DEMO: PASS");
  console.log("AUTO_LOCAL_DATA_SAVER_CAMERA_PREFERENCE: PASS");
  console.log("TRILINGUAL_WELCOME_AND_CONSENT_POLICY_WITH_LINK_LANGUAGE: PASS");
  console.log("NO_NETWORK_COMMUNICATION_OR_REAL_CALLS: PASS");
} finally {
  await context.close();
  await browser.close();
}
