import assert from "node:assert/strict";
import {chromium} from "playwright";
const base="http://127.0.0.1:8769/";
const browser=await chromium.launch({headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
const contexts=[];
async function phone(name,mode="audio"){
  const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,
    hasTouch:true,permissions:["camera","microphone"]});
  contexts.push(ctx);
  await ctx.route("**/*",r=>r.request().url().startsWith(base)?
    r.continue():r.abort("blockedbyclient"));
  await ctx.addInitScript(()=>{
    window.__mediaCalls=[];
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=opts=>{window.__mediaCalls.push(opts);return original(opts);};
  });
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.log(name+"_PAGE_ERROR",String(e).slice(0,200)));
  await page.goto(base+"ezero_secure_connect_communications_v0_3.html?mode="+mode,
    {waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64);
  return page;
}
async function offerAndAnswer(a,b){
  await a.locator("#modernConnect").click();
  assert.equal(await a.locator("#ezeroCallSetupSlot").isVisible(),true);
  assert.equal(await a.locator("#guidedOffer").isVisible(),false,
    "Original technical copy/paste must remain hidden");
  await a.locator("#ezeroPrepareInvite").click();
  await a.waitForFunction(()=>document.querySelector("#ezeroGeneratedLink")?.value.includes("#e="),{timeout:30000});
  const offer=await a.locator("#ezeroGeneratedLink").inputValue();
  assert.match(offer,/^http:\/\/127\.0\.0\.1:8769\/ezero_secure_connect_communications_v0_3\.html\?/);
  assert.match(offer,/#e=/);
  // A messenger that preserves only a truncated fragment must fail safely,
  // with a useful recovery reason and without activating media.
  await b.goto(base+"ezero_secure_connect_communications_v0_3.html?mode=audio#e=short",
    {waitUntil:"domcontentloaded"});
  assert.match(await b.locator("#ezeroInviteStatus").innerText(),/نامکمل یا تبدیل/);
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),0);
  await b.locator("#ezeroLinkFallback").evaluate(el=>el.open=true);
  assert.equal(await b.locator("#ezeroLoadLink").isDisabled(),true,
    "Empty example must not be submitted as a real invitation");
  await b.locator("#ezeroPasteLink").fill(base+"ezero_secure_connect_communications_v0_3.html?mode=audio");
  await b.locator("#ezeroLoadLink").click();
  assert.match(await b.locator("#ezeroInviteStatus").innerText(),/ضروری حصہ نہیں ملا/);
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),0);
  // A valid full link is accepted even when copied with messenger text.
  await b.locator("#ezeroPasteLink").fill("E-ZERO دوست کی دعوت\\n"+offer);
  await b.locator("#ezeroLoadLink").click();
  await b.locator("#ezeroIncomingInvite").waitFor({state:"visible",timeout:30000});
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),0,
    "Pasting a valid invitation must still require explicit acceptance");
  await b.goto(offer,{waitUntil:"domcontentloaded"});
  const inviteDebug=await b.evaluate(()=>({
    status:document.getElementById("ezeroInviteStatus")?.textContent,
    panelHidden:document.getElementById("ezeroCallSetupSlot")?.hidden,
    inviteHidden:document.getElementById("ezeroIncomingInvite")?.hidden,
    fragmentLength:location.hash.length
  }));
  console.log("RECEIVED_SIGNED_LINK_STATUS",JSON.stringify(inviteDebug));
  await b.locator("#ezeroIncomingInvite").waitFor({state:"visible",timeout:30000});
  assert.equal(await b.locator("#ezeroPrepareInvite").isVisible(),true);
  assert.equal(await b.locator("#guidedContinue").isVisible(),false);
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),0,
    "Opening an invite alone must not activate camera/mic");
  await b.locator("#ezeroAcceptInvite").click();
  await b.waitForFunction(()=>document.querySelector("#ezeroGeneratedLink")?.value.includes("#e="),{timeout:30000});
  const answer=await b.locator("#ezeroGeneratedLink").inputValue();
  assert.notEqual(answer,offer);
  await a.locator("#ezeroLinkFallback").evaluate(e=>e.open=true);
  await a.locator("#ezeroPasteLink").fill(answer);
  await a.locator("#ezeroLoadLink").click();
  await a.locator("#ezeroIncomingInvite").waitFor({state:"visible",timeout:30000});
  assert.equal(await a.locator("#ezeroAcceptInvite").isVisible(),true);
  await a.locator("#ezeroAcceptInvite").click();
  await Promise.all([a,b].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:30000})));
}

try{
  const a=await phone("A"),b=await phone("B");
  assert.equal(await a.locator("#modernCallPanel").isVisible(),true);
  assert.equal(await a.locator("#modernChatPanel").isHidden(),true);
  assert.equal(await a.locator("#ezeroCallSetupSlot").isHidden(),true);
  assert.equal(await a.locator("#modernConnect").isVisible(),true);
  assert.equal(await a.locator("#secureAdvanced").isHidden(),true);
  await a.locator('[data-modern-select="chat"]').click();
  const chatPattern=await a.locator("#modernChatPanel").evaluate(el=>({
    image:getComputedStyle(el,"::before").backgroundImage,
    pointer:getComputedStyle(el,"::before").pointerEvents,
    repeat:getComputedStyle(el,"::before").backgroundRepeat,
    width:document.documentElement.scrollWidth,
    innerWidth:window.innerWidth
  }));
  assert.match(chatPattern.image,/ezero_secure_chat_cosmic_pattern_v0_1\.svg/,
    "Original E-ZERO cosmic icons appear only behind chat");
  assert.equal(chatPattern.pointer,"none");
  assert.equal(chatPattern.repeat,"repeat");
  assert.ok(chatPattern.width<=chatPattern.innerWidth+1,
    "Cosmic pattern must not cause horizontal overflow");
  await a.locator('[data-modern-select="audio"]').click();
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0);
  for(const mode of ["audio","video","voice","chat"])
    assert.equal(await a.locator('[data-modern-select="'+mode+'"]').isVisible(),true);
  await a.locator('[data-modern-select="video"]').click();
  assert.equal(await a.locator("#modernCallPanel").isVisible(),true);
  assert.equal(await a.evaluate(()=>document.querySelector('input[name="mode"]:checked').value),"video");
  await a.locator('[data-modern-select="chat"]').click();
  assert.equal(await a.locator("#modernChatPanel").isVisible(),true);
  assert.equal(await a.locator("#sendMessage").isDisabled(),true);
  await a.locator('[data-modern-select="voice"]').click();
  assert.equal(await a.locator("#modernVoicePanel").isVisible(),true);
  assert.equal(await a.locator("#ezeroVoiceSend").isDisabled(),true);
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0,
    "Selecting video, chat or voice must not start microphone or camera");
  assert.match(await a.locator("#modernOfflineHeading").innerText(),/Nearby/);
  assert.equal(await a.locator("#nearbyFutureOpt").count(),0);
  await a.locator("#language").selectOption("en");
  assert.match(await a.locator('[data-modern="voice"]').innerText(),/Voice note/);
  await a.locator("#language").selectOption("ar");
  assert.match(await a.locator('[data-modern="voice"]').innerText(),/رسالة صوتية/);
  await a.locator("#language").selectOption("ur");
  console.log("FOUR_VISIBLE_MODE_CONTROLS_AND_THREE_LANGUAGES_NO_AUTO_MEDIA: PASS");

  await a.locator('[data-modern-select="audio"]').click();
  await offerAndAnswer(a,b);
  assert.equal(await a.locator("#modernConnectionStatus").getAttribute("data-state"),"connected");
  assert.equal(await a.evaluate(()=>document.querySelector("#localVideo").srcObject.getAudioTracks().length),1);
  assert.equal(await b.evaluate(()=>document.querySelector("#remoteVideo").srcObject.getAudioTracks().length),1);
  console.log("EXPERIMENTAL_REAL_WEBRTC_AUDIO_WITH_MANUAL_SIGNALING: PASS");

  await a.locator('[data-modern-select="chat"]').click();
  await b.locator('[data-modern-select="chat"]').click();
  await a.locator("#sendText").fill("E-ZERO temporary private chat");
  await a.locator("#sendMessage").click();
  await b.locator("#incomingItem").waitFor({state:"visible",timeout:10000});
  await b.locator("#viewMessage").click();
  assert.match(await b.locator("#seenMessage").innerText(),/E-ZERO temporary private chat/);
  console.log("RESTORED_REAL_ENCRYPTED_ONE_VIEW_CHAT: PASS");

  await a.locator('[data-modern-select="voice"]').click();
  await b.locator('[data-modern-select="voice"]').click();
  const before=await a.evaluate(()=>window.__mediaCalls.length);
  await a.locator("#ezeroVoiceRecord").click();
  await a.waitForFunction(()=>document.querySelector("#ezeroVoiceStop")?.hidden===false);
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),before+1);
  await a.waitForTimeout(1400);
  await a.locator("#ezeroVoiceStop").click();
  await a.waitForFunction(()=>document.querySelector("#ezeroVoiceDraft")?.hidden===false,{timeout:15000});
  assert.equal(await a.locator("#ezeroVoiceSend").isEnabled(),true);
  assert.equal(await b.locator("#ezeroVoiceReceived").isHidden(),true,
    "Record alone must not transmit");
  await a.locator("#ezeroVoiceSend").click();
  await b.locator("#ezeroVoiceReceived").waitFor({state:"visible",timeout:15000});
  assert.equal(await b.locator("#ezeroVoiceIncomingAudio").isHidden(),true);
  await b.locator("#ezeroVoiceOpenIncoming").click();
  assert.equal(await b.locator("#ezeroVoiceIncomingAudio").isVisible(),true);
  console.log("USER_CONSENT_LOCAL_RECORD_AND_EXPLICIT_P2P_VOICE_SEND: PASS");

  assert.equal(await a.locator("#modernHangup").isVisible(),true);
  await a.locator("#modernHangup").click();
  assert.equal(await b.locator("#modernHangup").isVisible(),true);
  await b.locator("#modernHangup").click();
  assert.equal(await a.evaluate(()=>window.EZERO_VOICE_TRANSPORT.connected()),false);
  console.log("HANGUP_CLOSES_PEER_CHANNEL_AND_STOPS_STREAM: PASS");
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
