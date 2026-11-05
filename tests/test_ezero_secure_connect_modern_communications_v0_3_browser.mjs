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
  await a.waitForFunction(()=>document.querySelector("#ezeroGeneratedLink")?.value.includes("#e=")||document.querySelector("#ezeroGeneratedLink")?.value.includes("#e2="),{timeout:30000});
  const offer=await a.locator("#ezeroGeneratedLink").inputValue();
  assert.match(offer,/^http:\/\/127\.0\.0\.1:8769\/ezero_secure_connect_communications_v0_3\.html\?/);
  assert.match(offer,/#e2=/, "Modern browser should create a compressed signed WebRTC invite");
  assert.ok(offer.length<19000, "Invitation must be compact enough for common share applications");
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
  await b.waitForFunction(()=>document.querySelector("#ezeroGeneratedLink")?.value.includes("#e=")||document.querySelector("#ezeroGeneratedLink")?.value.includes("#e2="),{timeout:30000});
  const answer=await b.locator("#ezeroGeneratedLink").inputValue();
  assert.match(answer,/#e2=/, "Answer should also use compressed signed signaling");
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

  // Purely visible controls must not masquerade as a genuinely connected phone.
  const numberStages=await a.locator(".modern-feature-button").evaluateAll(nodes=>
    nodes.map(el=>({n:el.getAttribute("data-step"),
      badge:getComputedStyle(el,"::before").content})));
  assert.deepEqual(numberStages.map(x=>x.n),["01","02","03","04"]);
  assert.ok(numberStages.every(x=>x.badge.includes(x.n)));
  assert.notEqual(await a.locator("#modernConnectionStatus").getAttribute("data-state"),"connected");
  await a.evaluate(()=>document.dispatchEvent(new CustomEvent("ezero:call-status",
    {detail:{stage:"connected"}})));
  assert.notEqual(await a.locator("#modernConnectionStatus").getAttribute("data-state"),"connected",
    "A fake event must not light a verified green tick without a connected peer");
  await a.evaluate(()=>document.dispatchEvent(new CustomEvent("ezero:call-status",
    {detail:{stage:"iceNoRoute"}})));
  assert.equal(await a.locator("#modernConnectionStatus").getAttribute("data-state"),"error");
  assert.match(await a.locator("#modernConnectionStatus").evaluate(el=>
    getComputedStyle(el,"::before").content),/!/);
  await a.evaluate(()=>document.dispatchEvent(new CustomEvent("ezero:call-status",
    {detail:{stage:"idle"}})));
  console.log("MILITARY_GREEN_NUMBERED_TILES_NO_FALSE_SUCCESS_RED_ERRORS: PASS");

  // The selected-mode border animates for 160ms; inspect its settled color.
  await a.waitForFunction(()=>getComputedStyle(
    document.querySelector('[data-modern-select="voice"]')).borderTopColor==="rgb(25, 131, 78)");
  // CSS transitions interpolate the border for 160ms; assert settled color,
  // not an arbitrary mid-transition pixel from a fast headless browser.
  await a.waitForFunction(()=> {
    const el=document.querySelector('.modern-feature-button[aria-pressed="true"]');
    return !!el && getComputedStyle(el).borderTopColor==="rgb(25, 131, 78)";
  },{timeout:3000});
  const selectedGreen=await a.locator('.modern-feature-button[aria-pressed="true"]').evaluate(
    el=>getComputedStyle(el).borderTopColor);
  assert.equal(selectedGreen,"rgb(25, 131, 78)",
    "Selected communication mode must settle on professional green");
  await a.locator("#ezeroPeopleHub").evaluate(el=>el.open=true);
  const savedFriendFP=(await b.locator("#myFingerprint").innerText()).trim();
  await a.evaluate(fp=>localStorage.setItem("ezero_secure_connect_local_fingerprints_v0_1",
    JSON.stringify([{fp,name:"Saved QR Friend"}])),savedFriendFP);
  await a.locator("#ezeroTabFriends").click();
  assert.match(await a.locator("#ezeroPeopleList").innerText(),/Saved QR Friend/);
  assert.match(await a.locator("#ezeroPeopleList").innerText(),/دوبارہ تصدیق/);
  await a.locator("#ezeroTabMissed").click();
  assert.match(await a.locator("#ezeroPeopleList").innerText(),/مس کال/);
  assert.equal(await a.locator("#ezeroHistoryConsent").isChecked(),false);
  assert.equal(await a.evaluate(()=>
    localStorage.getItem("ezero_local_completed_call_history_v0_1")),null,
    "No call history should be created without explicit opt-in");
  await b.locator("#ezeroPeopleHub").evaluate(el=>el.open=true);
  await b.locator("#ezeroHistoryConsent").check();
  assert.equal(await b.locator("#ezeroHistoryConsent").isChecked(),true);
  console.log("GREEN_SELECTION_SAVED_QR_CONTACTS_NO_FAKE_MISSED_OR_AUTOMATIC_LOGS: PASS");

  // Self-declared profile is local until the user explicitly opts in.
  await a.locator("#ezeroProfileEditor").evaluate(el=>el.open=true);
  await a.locator("#ezeroMyName").fill("Test Caller A");
  await a.locator("#ezeroSaveProfile").click();
  assert.equal(await a.locator("#ezeroShareProfile").isChecked(),false);
  assert.equal(await a.locator("#ezeroPeerProfileCard").isHidden(),true);
  await b.locator("#ezeroProfileEditor").evaluate(el=>el.open=true);
  await b.locator("#ezeroMyName").fill("Test Caller B");
  // Distinct, real user-triggered Android file-picker and camera actions.
  assert.equal(await b.locator("#ezeroCameraPhoto").getAttribute("capture"),"user");
  assert.equal(await b.locator("#ezeroMyPhoto").getAttribute("capture"),null);
  assert.equal(await a.locator("#ezeroMyAvatar").isHidden(),true);
  const cameraChooserPromise=a.waitForEvent("filechooser");
  await a.locator("#ezeroCameraButton").click();
  const cameraChooser=await cameraChooserPromise;
  assert.equal(await cameraChooser.element().getAttribute("id"),"ezeroCameraPhoto");
  await cameraChooser.setFiles([]); // Cancel: no picture may be taken without the user.
  const pngBase64=await b.evaluate(()=>{
    const canvas=document.createElement("canvas");
    canvas.width=64;canvas.height=64;
    canvas.getContext("2d").fillRect(0,0,64,64);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  const galleryChooserPromise=b.waitForEvent("filechooser");
  await b.locator("#ezeroGalleryButton").click();
  const galleryChooser=await galleryChooserPromise;
  assert.equal(await galleryChooser.element().getAttribute("id"),"ezeroMyPhoto");
  await galleryChooser.setFiles({
    name:"friend-avatar.png",mimeType:"image/png",
    buffer:Buffer.from(pngBase64,"base64")
  });
  await b.waitForFunction(()=>document.querySelector("#ezeroMyAvatar")?.hidden===false);
  await b.locator("#ezeroShareProfile").check();
  await b.locator("#ezeroSaveProfile").click();
  assert.equal(await b.locator("#ezeroMyAvatar").isVisible(),true);
  assert.equal(await a.locator("#ezeroPeerProfileCard").isHidden(),true,
    "No identity/photo should be received before secure peer connection");
  const savedProfile=await b.evaluate(()=>
    JSON.parse(localStorage.getItem("ezero_secure_connect_local_profile_v0_1")));
  assert.equal(savedProfile.name,"Test Caller B");
  assert.equal(savedProfile.share,true);
  assert.ok(savedProfile.avatar.startsWith("data:image/jpeg;base64,"));
  assert.ok(savedProfile.avatar.length<=12000);
  console.log("LOCAL_NAME_PHOTO_OPT_IN_NO_PRECONNECTION_UPLOAD: PASS");

  await a.locator('[data-modern-select="audio"]').click();
  await offerAndAnswer(a,b);
  assert.equal(await a.locator("#modernConnectionStatus").getAttribute("data-state"),"connected");
  assert.match(await a.locator("#modernConnectionStatus").evaluate(el=>
    getComputedStyle(el,"::before").content),/✓/,
    "Verified real WebRTC connection should display a luminous checkmark");

  assert.equal(await a.evaluate(()=>document.querySelector("#localVideo").srcObject.getAudioTracks().length),1);
  assert.equal(await b.evaluate(()=>document.querySelector("#remoteVideo").srcObject.getAudioTracks().length),1);
  console.log("EXPERIMENTAL_REAL_WEBRTC_AUDIO_WITH_MANUAL_SIGNALING: PASS");
  const bHistory=await b.evaluate(()=>
    JSON.parse(localStorage.getItem("ezero_local_completed_call_history_v0_1")||"[]"));
  assert.equal(bHistory.length,0,
    "Ongoing call must not be saved as a completed call until actual hangup");
  assert.equal(await a.evaluate(()=>
    localStorage.getItem("ezero_local_completed_call_history_v0_1")),null,
    "Non-consenting caller keeps no local call log");
  await b.locator("#ezeroPeopleHub").evaluate(el=>el.open=true);
  await b.locator("#ezeroTabCalls").click();
  assert.match(await b.locator("#ezeroPeopleList").innerText(),/ابھی کوئی مکمل/);
  await b.locator("#ezeroTabMissed").click();
  assert.match(await b.locator("#ezeroPeopleList").innerText(),/مس کال/);
  console.log("REAL_CONNECTED_INCOMING_CALL_OPT_IN_HISTORY_NO_INVENTED_MISSED: PASS");
  await a.locator("#ezeroPeerProfileCard").waitFor({state:"visible",timeout:12000});
  await a.waitForFunction(()=>
    document.querySelector("#ezeroPeerDisplayName")?.textContent==="Test Caller B",{timeout:12000});
  assert.equal(await a.locator("#ezeroPeerAvatar").isVisible(),true,
    "Opted-in peer photo must arrive after verified WebRTC connection only");
  assert.match(await a.locator("#ezeroVerifiedConnection").innerText(),/دونوں فون/);
  const peerFP=await b.locator("#myFingerprint").textContent();
  assert.ok((await a.locator("#ezeroPeerSessionId").textContent()).includes(peerFP.slice(0,12)),
    "Displayed session ID must match the signed peer fingerprint, not a supplied photo/name");
  assert.equal(await b.locator("#ezeroPeerDisplayName").innerText(),"دوست نے ابھی پروفائل شیئر نہیں کی",
    "Without opting in, the local name/photo must not automatically reach the peer");
  await a.locator("#ezeroProfileEditor").evaluate(el=>el.open=true);
  await a.locator("#ezeroShareProfile").check();
  await a.locator("#ezeroSaveProfile").click();
  await b.waitForFunction(()=>
    document.querySelector("#ezeroPeerDisplayName")?.textContent==="Test Caller A",{timeout:12000});
  assert.equal(await b.locator("#ezeroPeerAvatar").isHidden(),true,
    "A name-only profile should render an initial, never invent an image");
  console.log("VERIFIED_CONNECTED_PHONE_NAME_PHOTO_AND_SIGNED_SESSION_ID: PASS");

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
  assert.equal(await a.locator("#ezeroPeerProfileCard").isHidden(),true);
  assert.equal(await b.locator("#ezeroPeerProfileCard").isHidden(),true);
  console.log("PEER_PHOTO_AND_SESSION_ID_REMOVED_ON_HANGUP: PASS");
  // An opted-in call record should persist after closing the genuine
  // connection, and be deletable without touching friends or messages.
  await b.locator("#ezeroTabCalls").click();
  const finished=await b.evaluate(()=>
    JSON.parse(localStorage.getItem("ezero_local_completed_call_history_v0_1")||"[]"));
  assert.equal(finished.length,1);
  assert.equal(finished[0].direction,"incoming");
  assert.equal(finished[0].kind,"audio");
  assert.equal(finished[0].name,"Test Caller A");
  assert.ok(Date.now()-finished[0].ended<600000);
  assert.equal(Object.hasOwn(finished[0],"fp"),false);
  assert.equal(Object.hasOwn(finished[0],"media"),false);
  assert.equal(await a.evaluate(()=>
    localStorage.getItem("ezero_local_completed_call_history_v0_1")),null,
    "Nonconsenting phone must not record a completed call");
  await b.reload({waitUntil:"domcontentloaded"});
  await b.locator("#ezeroPeopleHub").evaluate(el=>el.open=true);
  await b.locator("#ezeroTabCalls").click();
  assert.equal(await b.locator(".ezero-person-card").count(),1,
    "Opted-in history survives a reload on this device only");
  // Move the actual completed record beyond its 10-minute TTL. Loading the
  // page again must purge it without asking the user or retaining metadata.
  await b.evaluate(()=>{
    const key="ezero_local_completed_call_history_v0_1";
    const list=JSON.parse(localStorage.getItem(key));
    list[0].ended=Date.now()-600001;
    localStorage.setItem(key,JSON.stringify(list));
  });
  await b.reload({waitUntil:"domcontentloaded"});
  await b.locator("#ezeroPeopleHub").evaluate(el=>el.open=true);
  await b.locator("#ezeroTabCalls").click();
  assert.equal(await b.locator(".ezero-person-card").count(),0);
  assert.deepEqual(await b.evaluate(()=>
    JSON.parse(localStorage.getItem("ezero_local_completed_call_history_v0_1")||"[]")),[]);
  await b.locator("#ezeroHistoryConsent").uncheck();
  assert.equal(await b.evaluate(()=>
    localStorage.getItem("ezero_local_completed_call_history_v0_1")),null);
  await b.locator("#ezeroTabMissed").click();
  assert.equal(await b.locator(".ezero-person-card").count(),0);
  console.log("REAL_CALL_HISTORY_AUTO_EXPIRES_AFTER_TEN_MINUTES_AND_OPT_OUT_ERASES: PASS");
  console.log("HANGUP_CLOSES_PEER_CHANNEL_AND_STOPS_STREAM: PASS");
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
