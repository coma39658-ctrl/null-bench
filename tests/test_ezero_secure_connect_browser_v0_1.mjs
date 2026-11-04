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
  await page.locator("#ezeroVoiceGuideButton").click();
  await page.waitForTimeout(200);
  const hubDebug=await page.evaluate(()=>({aria:document.getElementById("ezeroVoiceGuidePanel")?.getAttribute("aria-hidden"),display:document.getElementById("ezeroVoiceGuidePanel")?.style.display,handler:typeof window.EZERO_POSITION_AI_AGENT_PANEL,close:!!document.getElementById("ezeroVoiceGuideClose"),parent:document.getElementById("ezeroVoiceGuidePanel")?.parentElement?.tagName}));
  console.log("HUB_OPEN_DEBUG",JSON.stringify(hubDebug));
  assert.equal(await page.locator("#ezeroVoiceGuidePanel").getAttribute("aria-hidden"),"false");
  assert.equal(await page.locator("#ezeroLegacyVoiceGuide").isHidden(),true);
  const cards=page.locator("#ezeroAssistFutureDock a.ezero-assist-tool");
  assert.equal(await cards.count(),4,"Existing modal has 4 Secure Connect entries");
  const box=await page.locator("#ezeroVoiceGuidePanel").boundingBox();
  assert.ok(box&&box.x>=0&&box.y>=0&&box.x+box.width<=393+1&&box.y+box.height<=852+1,
    "Secure Connect popup fits mobile viewport");
  await page.locator("#ezeroSecureConnectVideoEntry").click();
  await page.waitForURL(/ezero_secure_connect_preview_v0_1\.html#video$/);
  assert.equal(await page.locator("#startVideo").isVisible(),true);
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

  await page.locator('button[data-mode="audio"]').click();
  await page.locator("#startAudio").click();
  await page.waitForFunction(()=>document.querySelector("#stopAudio").disabled===false);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),2);
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
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),3);

  await page.locator('button[data-mode="qr"]').click();
  await page.locator("#makeFingerprint").click();
  await page.waitForFunction(()=>document.querySelector("#fingerprint").textContent.trim().length===64);
  assert.match(await page.locator("#qrStatus").innerText(),/عارضی SHA-256/);
  await page.locator('button[data-mode="messages"]').click();
  assert.match(await page.locator('[data-panel="messages"]').innerText(),/12 منٹ/);
  assert.equal(await page.evaluate(()=>window.__ezeroMediaCalls.length),3,"Navigation does not restart camera or microphone");
  console.log("SECURE_CONNECT_MOBILE_POPUP_AND_SEPARATE_AI: PASS");
  console.log("LOCAL_HD_CAMERA_ONLY_AFTER_GESTURE: PASS");
  console.log("LOCAL_AUDIO_METER_ONLY_AFTER_GESTURE: PASS");
  console.log("LOCAL_VOICE_DRAFT_AND_ERASURE: PASS");
  console.log("TEMPORARY_PUBLIC_KEY_SHA256_SIGNATURE: PASS");
  console.log("NO_NETWORK_COMMUNICATION_OR_REAL_CALLS: PASS");
} finally {
  await context.close();
  await browser.close();
}
