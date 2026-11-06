import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8769/";
const pagePath="ezero_secure_connect_one_request_lab_20261106.html";
const service="wss://ezero-browser-signaling-pilot.coma39658.workers.dev/v1/rooms/";
const browser=await chromium.launch({headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream"]});
const contexts=[];
const rooms=new Map();
let offers=0,answers=0;
function mockSocket(ws){
  const id=ws.url().slice(service.length);
  if(!/^[A-Za-z0-9_-]{32}$/.test(id))throw Error("Bad room");
  if(!rooms.has(id))rooms.set(id,{});
  const room=rooms.get(id);
  let role="";
  ws.onMessage(payload=>{
    const m=JSON.parse(payload);
    if(m.t==="hello"){
      role=m.role;
      if(role==="host"){
        room.host=ws;
        ws.send(JSON.stringify({t:"ready",role,expires:Date.now()+600000}));
      }else if(role==="guest"&&room.host){
        room.guest=ws;
        ws.send(JSON.stringify({t:"ready",role,expires:Date.now()+600000}));
        room.host.send(JSON.stringify({t:"peer",state:"joined"}));
      }else throw Error("Guest without live host");
    }else if(m.t==="signal"){
      if(role==="host"){
        offers++;
        assert.equal(JSON.parse(m.payload).type,"offer");
        if(!room.guest)throw Error("Guest absent");
        room.guest.send(JSON.stringify({t:"signal",role:"host",payload:m.payload}));
      }else if(role==="guest"){
        answers++;
        assert.equal(JSON.parse(m.payload).type,"answer");
        if(!room.host)throw Error("Host absent");
        room.host.send(JSON.stringify({t:"signal",role:"guest",payload:m.payload}));
      }else throw Error("Unauthenticated mock signal");
    }else if(m.t==="leave"){
      const other=role==="host"?room.guest:room.host;
      other?.send(JSON.stringify({t:"left"}));
    }
  });
}
async function createPhone(name){
  const context=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    permissions:["camera","microphone"]
  });
  contexts.push(context);
  await context.routeWebSocket(service+"**",mockSocket);
  await context.route("**/*",route=>route.request().url().startsWith(base)?
    route.continue():route.abort("blockedbyclient"));
  await context.addInitScript(()=>{
    window.__mediaCalls=[];
    window.__oneInvite="";
    // Synthetic Web Audio test: verifies a ringtone starts for genuine
    // incoming calls and stops before the camera is opened by Accept.
    window.__ringCounts={contexts:0,resume:0,tones:0,suspend:0};
    class TestAudioContext {
      constructor(){window.__ringCounts.contexts++;this.state="suspended";this.currentTime=0;this.destination={};}
      async resume(){this.state="running";window.__ringCounts.resume++;}
      async suspend(){this.state="suspended";window.__ringCounts.suspend++;}
      async close(){this.state="closed";}
      createOscillator(){
        return {type:"",frequency:{setValueAtTime(){}},connect(){},disconnect(){},
          start(){window.__ringCounts.tones++;},stop(){},onended:null};
      }
      createGain(){
        return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},
          connect(){},disconnect(){}};
      }
    }
    window.AudioContext=TestAudioContext;
    document.addEventListener("ezero:auto-invite-ready",e=>{
      window.__oneInvite=e.detail?.link||"";
    });
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=args=>{
      window.__mediaCalls.push(args);
      return original(args);
    };
  });
  const page=await context.newPage();
  page.on("pageerror",e=>console.error(name+"_PAGE_ERROR",e.message));
  await page.goto(base+pagePath,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64);
  return page;
}
try{
  const caller=await createPhone("CALLER");
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"false",
    "Audio must not be preselected until the user actually initiates a call");
  assert.equal(await caller.locator('[data-modern-select="video"]').getAttribute("aria-pressed"),"false");
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),0,
    "Opening the call lab should not ask for microphone/camera permission");
  assert.equal(await caller.locator("#ezeroAutoPilot").isVisible(),true);
  assert.equal(await caller.locator("#ezeroUnifiedCard").isVisible(),true);
  assert.equal(await caller.locator("#ezeroLegacyCompatibility").isHidden(),true,
    "Old second-color duplicate layers must not be displayed");
  assert.equal(await caller.locator("#ezeroOneJoinPanel").isVisible(),true,
    "Call-QR scanner must be prominent on the receiving phone");
  assert.equal(await caller.locator("#ezeroOneScanInvite").isVisible(),true);
  assert.equal(await caller.locator("#oneTapPanel").isHidden(),true,
    "Identity-only scanner must not appear as a competing call scanner");
  // User request: unlike older page, pre-call video boxes must NOT be visible.
  assert.equal(await caller.locator("#modernCallPanel").isVisible(),false,
    "No camera or video boxes appear before the video call begins");
  assert.equal(await caller.locator("#localVideo").isVisible(),false);
  assert.equal(await caller.locator("#remoteVideo").isVisible(),false);
  assert.equal(await caller.locator("#modernHangup").isVisible(),false,
    "Red hangup banner must not appear on the idle app landing screen");
  // Physical Android feedback: old "Back" was white-on-white, users were stuck.
  const exitLink=caller.locator("#modernBack");
  assert.equal(await exitLink.isVisible(),true,"Exit must be visible on arrival");
  assert.equal(await exitLink.getAttribute("href"),"./index.html");
  const exitStyle=await exitLink.evaluate(el=>{
    const c=getComputedStyle(el),r=el.getBoundingClientRect();
    return {text:el.textContent,bg:c.backgroundColor,color:c.color,height:r.height,
      border:c.borderTopWidth};
  });
  assert.ok(/واپس|Back|رجوع/.test(exitStyle.text),"Visible back/exit text is required");
  assert.equal(exitStyle.bg,"rgb(20, 90, 60)",
    "Back exit must have dark green fill, not white-on-white");
  assert.equal(exitStyle.color,"rgb(255, 255, 255)");
  assert.ok(exitStyle.height>=44,"Back button must be comfortably touchable");
  const icons=await caller.evaluate(()=>[...document.querySelectorAll(".modern-feature-button")].map(el=>{
    const icon=el.querySelector(".modern-feature-icon");
    const root=el.getBoundingClientRect(),r=icon.getBoundingClientRect();
    const badge=getComputedStyle(el,"::before");
    return {badgeTop:parseFloat(badge.top),badgeWidth:parseFloat(badge.width),
      badgeHeight:parseFloat(badge.height),iconX:r.left-root.left,
      iconTop:r.top-root.top,iconWidth:r.width,height:root.height};
  }));
  assert.equal(icons.length,4);
  assert.ok(icons.every(x=>x.badgeWidth<=20&&x.badgeHeight<=20&&x.iconTop>=19),
    "Small 01–04 numbers must sit above, not obscure, the main icons");
  console.log("VISIBLE_TRILINGUAL_EXIT_AND_4_NONOVERLAPPING_ICONS: PASS");
  assert.equal(await caller.locator("#ezeroNetworkSettings").getAttribute("open"),null,
    "STUN advanced settings should be collapsed by default");
  const appShell=await caller.evaluate(()=>{
    const card=document.getElementById("ezeroUnifiedCard");
    const grid=document.querySelector(".modern-feature-grid");
    const features=Array.from(grid.querySelectorAll(".modern-feature-button"));
    const shell=document.getElementById("ezeroQuickConnectionSurface");
    const status=document.getElementById("modernConnectionStatus");
    const qrScan=document.getElementById("ezeroOneScanInvite");
    return {
      cardBorder:getComputedStyle(card).borderTopWidth,
      cardBg:getComputedStyle(card).backgroundImage,
      columns:getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      heights:features.map(x=>x.getBoundingClientRect().height),
      widths:features.map(x=>x.getBoundingClientRect().width),
      hasShell:!!shell&&shell.contains(qrScan),
      statusBorder:getComputedStyle(status).borderTopWidth,
      statusBackground:getComputedStyle(status).backgroundColor,
      qrScanHeight:qrScan.getBoundingClientRect().height
    };
  });
  assert.equal(appShell.cardBorder,"0px","Unified page must not use a poster-card frame");
  assert.equal(appShell.columns,4,"App controls must use a 4-icon navigation rail");
  assert.ok(appShell.heights.every(x=>x>=44&&x<=85),
    "Icon controls must be compact, but large enough for touch");
  assert.ok(appShell.widths.every(x=>x<115),"No oversized advertisement tile");
  assert.equal(appShell.hasShell,true,"QR and incoming call must share one surface");
  assert.equal(appShell.statusBorder,"0px","Statuses must not be stacked bordered boxes");
  assert.equal(appShell.qrScanHeight>=44,true,"QR action is touch accessible");
  console.log("COMPACT_2050_APP_STYLE_NO_IDLE_AD_CARDS_OR_EMPTY_MEDIA: PASS");
  // One click initiates offer; the share URL is short and has an ephemeral capability.
  await caller.locator('[data-modern-select="video"]').click();
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:30000});
  const invite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(invite,/\/c\.html\?mode=video#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/);
  assert.ok(invite.length<190,"One-request URL should not contain an entire SDP");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  assert.equal(await caller.locator("#modernHangup").isVisible(),true,
    "A pending call must keep an accessible small Cancel/Hangup control");
  const pendingHangupHeight=await caller.locator("#modernHangup").evaluate(el=>el.getBoundingClientRect().height);
  assert.ok(pendingHangupHeight<=54,
    "Pending call Cancel must be compact, not an enormous red banner");
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"false",
    "Call pending is not a connected state");
  console.log("SINGLE_CLICK_CREATES_COMPACT_QR_INVITE_NO_FAKE_CONNECTION: PASS");

  const callee=await createPhone("CALLEE");
  // c.html is a real public entry point; it redirects room fragments to lab.
  await callee.goto(invite,{waitUntil:"domcontentloaded"});
  await callee.waitForURL(new RegExp("one_request_lab_20261106.html"),{timeout:10000});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible"});
  assert.equal(await callee.locator("#ezeroOneIncomingShell").isVisible(),true,
    "Opening a call QR must directly expose the incoming-accept card");
  assert.equal(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    "📹 آنے والی ویڈیو کال — قبول کریں؟");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
    "Opening a friend request must NOT activate camera or microphone");
  assert.equal(await callee.locator("#ezeroAutoAccept").isVisible(),true);
  assert.equal(await callee.locator("#ezeroAutoDecline").isVisible(),true);
  assert.equal(await callee.locator("#ezeroIncomingRingToggle").isVisible(),true,
    "An incoming call must show a usable ringtone control");
  await callee.waitForFunction(()=>window.__ringCounts.tones>=2,{timeout:5000});
  assert.equal(await callee.evaluate(()=>window.__ringCounts.tones>=2),true,
    "Incoming invitation should attempt the original two-tone ringtone");
  assert.equal(await callee.locator("#modernCallPanel").isVisible(),false,
    "Video panels must not open or request camera before explicit accept");
  // Only recipient approval. No second link, pasted code or caller approval.
  await callee.locator("#ezeroAutoAccept").click();
  await callee.waitForFunction(()=>window.__ringCounts.suspend>=1,{timeout:5000});
  assert.equal(await callee.evaluate(()=>window.__ringCounts.suspend>=1),true,
    "Accept must immediately stop incoming ringtone");
  assert.equal(await callee.locator("#ezeroOneCallProgress").getAttribute("data-state"),
    "connecting","Accept should trigger connection without second link");
  await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  assert.equal(offers,1,"Only one signed offer should cross the signaling room");
  assert.equal(answers,1,"The answer should be sent automatically by WebSocket");
  assert.ok(await caller.evaluate(()=>window.__mediaCalls.length)>0);
  assert.ok(await callee.evaluate(()=>window.__mediaCalls.length)>0);
  assert.equal(await caller.locator("#modernConnectionStatus").getAttribute("data-state"),"connected");
  await callee.waitForFunction(()=>document.getElementById("ezeroOneCallProgress")?.dataset.state==="connected",
    {timeout:10000});
  assert.equal(await callee.locator("#ezeroOneCallProgress").getAttribute("data-state"),"connected");
  assert.equal(await caller.locator('[data-modern-select="video"]').getAttribute("aria-pressed"),"true");
  const videoGeometry=await caller.evaluate(()=>{
    const local=document.getElementById("localVideo");
    const remote=document.getElementById("remoteVideo");
    const p=document.getElementById("modernCallPanel");
    const x=local.closest(".videoBox").getBoundingClientRect();
    const y=remote.closest(".videoBox").getBoundingClientRect();
    const z=p.getBoundingClientRect();
    return {panelVisible:getComputedStyle(p).display!=="none",
      remoteTracks:remote.srcObject?.getVideoTracks().length||0,
      localTracks:local.srcObject?.getVideoTracks().length||0,
      remoteW:y.width,remoteH:y.height,localW:x.width,localH:x.height,
      panelW:z.width,panelH:z.height,
      connected:document.body.classList.contains("ezero-video-connected")};
  });
  assert.equal(videoGeometry.connected,true);
  assert.equal(videoGeometry.panelVisible,true);
  assert.equal(videoGeometry.localTracks,1,"Call must capture local video only after consent");
  assert.equal(videoGeometry.remoteTracks,1,"Call must receive one real WebRTC remote video track");
  assert.ok(videoGeometry.remoteW>videoGeometry.localW*2,
    "Friend video must be significantly larger than self PiP");
  assert.ok(videoGeometry.remoteH>videoGeometry.localH*2,
    "Friend video must fill the portrait screen");
  assert.ok(videoGeometry.panelW>=380&&videoGeometry.panelH>=700,
    "Video call scene must fill mobile viewport");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),false,
    "QR must disappear after the video call connects");
  assert.equal(await caller.locator("#ezeroCallMediaSlot .videos").isVisible(),true);
  console.log("ONE_IMMERSIVE_VIDEO_REMOTE_LARGE_LOCAL_PIP_REAL_TRACKS: PASS");
  console.log("ONE_REQUEST_ONE_ACCEPT_AUTOMATIC_SIGNED_ANSWER_REAL_BROWSER_WEBRTC: PASS");
  console.log("NO_SECOND_MANUAL_LINK_NO_AUTO_MIC_BEFORE_ACCEPT: PASS");
  // Additional two-phone browser test: video still works; incoming audio
  // really arrives as one live WebRTC track routed to an independent player.
  // A successful play() does not prove that a human heard the sound.
  for(const phone of [caller,callee]){
    await phone.waitForFunction(()=>{
      const a=document.getElementById("ezeroRemoteAudio");
      const v=document.getElementById("remoteVideo");
      return a?.srcObject?.getAudioTracks().some(t=>t.readyState==="live")
        &&v?.muted===true;
    },{timeout:12000});
    const state=await phone.evaluate(()=>{
      const audio=document.getElementById("ezeroRemoteAudio");
      const video=document.getElementById("remoteVideo");
      return {trackCount:audio.srcObject.getAudioTracks().length,
        audioMuted:audio.muted,videoMuted:video.muted,
        sameAudioTrack:audio.srcObject.getAudioTracks()[0]===
          video.srcObject.getAudioTracks()[0]};
    });
    assert.equal(state.trackCount,1);
    assert.equal(state.audioMuted,false);
    assert.equal(state.videoMuted,true,"Avoid a doubled playback echo");
    assert.equal(state.sameAudioTrack,true,"The audio output must use the authenticated remote WebRTC track");
    assert.equal(await phone.locator("#ezeroInCallChat").isVisible(),true);
    assert.equal(await phone.locator("#ezeroInCallVoice").isVisible(),true);
    assert.equal(await phone.locator("#ezeroInCallLanguage").isVisible(),true);
  }
  await caller.locator("#playRemote").click();
  await caller.waitForFunction(()=>{
    const s=document.getElementById("ezeroAudioStatus");
    return ["playing","blocked","failed","missing"].includes(s?.dataset.state);
  },{timeout:10000});
  assert.notEqual(await caller.locator("#ezeroAudioStatus").getAttribute("data-state"),"missing",
    "Real remote audio exists and should be offered to the speaker");
  console.log("DEDICATED_LIVE_REMOTE_AUDIO_AND_MANUAL_SPEAKER_ROUTE: PASS");

  // Temporary private text message traverses the *existing* data channel.
  const testText="E-ZERO two-phone one-view message - verified";
  await caller.locator("#ezeroInCallChat").click();
  assert.equal(await caller.locator("#modernChatPanel").isVisible(),true);
  await caller.locator("#sendText").fill(testText);
  await caller.locator("#sendMessage").click();
  await callee.waitForFunction(()=>document.getElementById("incomingItem")?.hidden===false,
    {timeout:12000});
  await callee.locator("#ezeroInCallChat").click();
  assert.equal(await callee.locator("#viewMessage").isVisible(),true);
  await callee.locator("#viewMessage").click();
  assert.equal((await callee.locator("#seenMessage").innerText()).trim(),testText);
  assert.equal(await callee.locator("#viewMessage").isVisible(),false);
  console.log("TWO_PHONE_ENCRYPTED_EPHEMERAL_TEXT_SEND_RECEIVE_VIEW_ONCE: PASS");

  // Voice-note sample uses a clone of the already-consented live microphone,
  // never an additional getUserMedia call that can steal Android call audio.
  await caller.locator("#ezeroInCallVoice").click();
  assert.equal(await caller.locator("#modernVoicePanel").isVisible(),true);
  const mediaCountBefore=await caller.evaluate(()=>window.__mediaCalls.length);
  await caller.locator("#ezeroVoiceRecord").click();
  await caller.locator("#ezeroVoiceStop").waitFor({state:"visible",timeout:7000});
  await caller.waitForTimeout(1250);
  await caller.locator("#ezeroVoiceStop").click();
  await caller.locator("#ezeroVoiceDraft").waitFor({state:"visible",timeout:10000});
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),mediaCountBefore,
    "Recording a voice note must not reopen the physical microphone during a call");
  assert.equal(await caller.locator("#ezeroVoiceSend").isEnabled(),true);
  await caller.locator("#ezeroVoiceSend").click();
  await callee.locator("#ezeroInCallVoice").click();
  await callee.locator("#ezeroVoiceReceived").waitFor({state:"visible",timeout:12000});
  assert.equal(await callee.locator("#ezeroVoiceOpenIncoming").isVisible(),true);
  await callee.locator("#ezeroVoiceOpenIncoming").click();
  const incomingAudio=await callee.locator("#ezeroVoiceIncomingAudio").evaluate(el=>({
    hasBlobUrl:el.src.startsWith("blob:"),hidden:el.hidden
  }));
  assert.equal(incomingAudio.hasBlobUrl,true);
  assert.equal(incomingAudio.hidden,false);
  assert.equal(await caller.evaluate(()=>window.EZERO_VOICE_TRANSPORT?.connected()),true,
    "Voice message must not close the existing authenticated call");
  console.log("TWO_PHONE_VOICE_NOTE_RECORD_CLONE_SEND_RECEIVE_USER_OPENS: PASS");
  // A privacy boundary: muting during a connected call must never cause a
  // new microphone permission request or background recording for a note.
  await caller.locator("#ezeroInCallClose").click();
  await caller.locator("#muteMic").click();
  const mutedMediaCount=await caller.evaluate(()=>window.__mediaCalls.length);
  await caller.locator("#ezeroInCallVoice").click();
  await caller.locator("#ezeroVoiceRecord").click();
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),mutedMediaCount,
    "Voice-note button must not recapture a muted in-call microphone");
  assert.equal(await caller.locator("#ezeroVoiceDraft").isVisible(),false);
  assert.equal(await caller.locator("#ezeroVoiceStop").isVisible(),false);
  console.log("MUTED_CALL_NEVER_OPENS_SECOND_MICROPHONE: PASS");
  await caller.locator("#ezeroInCallClose").click();
  await caller.locator("#muteMic").click();

  // All new live-call functions and audio notices support language switching:
  // Urdu RTL, Arabic RTL, English LTR, with the same main selector synchronized.
  const expectedAudioNotice={
    en:{incoming:"Remote audio track",playing:"Playback request succeeded",
      blocked:"Browser blocked",failed:"Audio output could not play"},
    ar:{incoming:"وصل مسار صوت",playing:"تم قبول تشغيل الصوت",
      blocked:"حظر المتصفح",failed:"تعذر تشغيل الصوت"},
    ur:{incoming:"دوست کی آڈیو ٹریک",playing:"آواز چلانے کی درخواست قبول ہوئی",
      blocked:"براؤزر نے آواز",failed:"آڈیو نہیں چل سکی"}
  };
  const voiceStatusLanguages=new Set();
  for(const [language,chatName,voiceName,dir] of [
    ["en","Chat","Voice note","ltr"],
    ["ar","رسالة","رسالة صوتية","rtl"],
    ["ur","میسج","وائس میسج","rtl"]
  ]){
    await caller.locator("#ezeroInCallLanguage").selectOption(language);
    assert.equal(await caller.locator("#language").inputValue(),language);
    assert.equal(await caller.locator("html").getAttribute("lang"),language);
    assert.equal(await caller.locator("html").getAttribute("dir"),dir);
    assert.ok((await caller.locator("#ezeroInCallChat").innerText()).includes(chatName));
    assert.ok((await caller.locator("#ezeroInCallVoice").innerText()).includes(voiceName));
    const audioText=await caller.locator("#ezeroAudioStatus").innerText();
    const audioStage=await caller.locator("#ezeroAudioStatus").getAttribute("data-state");
    assert.ok(audioText.includes(expectedAudioNotice[language][audioStage]),
      "Remote-audio "+audioStage+" status must translate to "+language+": "+audioText);
    const voiceText=(await caller.locator("#ezeroVoiceStatus").innerText()).trim();
    assert.ok(voiceText.length>5,"Voice-note status must remain translated "+language);
    voiceStatusLanguages.add(voiceText);
  }
  assert.equal(voiceStatusLanguages.size,3,
    "Voice note sent/received statuses must be translated, not one-language fallback");
  await callee.locator("#ezeroInCallLanguage").selectOption("ar");
  assert.equal(await callee.locator("html").getAttribute("lang"),"ar");
  await callee.locator("#ezeroInCallLanguage").selectOption("en");
  assert.equal(await callee.locator("html").getAttribute("dir"),"ltr");
  await callee.locator("#ezeroInCallLanguage").selectOption("ur");
  assert.equal(await callee.locator("html").getAttribute("dir"),"rtl");
  console.log("URDU_ARABIC_ENGLISH_LIVE_AUDIO_CHAT_VOICE_SWITCHING: PASS");


  // A verified first call must not strand the caller without the next QR.
  // Neither phone reloads before the caller starts another new room.
  // Fullscreen video scene owns its on-call hangup, not the hidden top card.
  await caller.locator("#hangup").click();
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),false,
    "Expired QR must not remain visible after video hangup");
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),false,
    "Copy of an old invitation must be disabled after video hangup");
  // Remote hangup releases its peer's camera and microphone, rather
  // than leaving a hidden red stop button over still-running capture.
  await callee.waitForFunction(()=>{
    const stream=document.getElementById("localVideo")?.srcObject;
    return window.EZERO_VOICE_TRANSPORT?.connected()===false &&
      (!stream||stream.getTracks().every(t=>t.readyState==="ended")) &&
      !document.body.classList.contains("ezero-video-connected");
  },{timeout:15000});
  console.log("REMOTE_VIDEO_HANGUP_RELEASES_BOTH_MEDIA_TRACKS: PASS");
  await caller.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000});
  await caller.locator('[data-modern-select="video"]').click();
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,invite,{timeout:30000});
  const newInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.notEqual(newInvite,invite,"Every new call must have a fresh invite");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await caller.locator("#ezeroOneQr svg").count(),1,
    "The second call must actually render its QR, not merely show a success label");
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  await callee.goto(newInvite,{waitUntil:"domcontentloaded"});
  await callee.waitForURL(new RegExp("one_request_lab_20261106.html"),{timeout:10000});
  await callee.locator("#ezeroAutoAccept").waitFor({state:"visible"});
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  assert.equal(offers,2,"Redial must create a new signed offer");
  assert.equal(answers,2,"Redial must receive another automatically relayed answer");
  const liveAgain=await callee.evaluate(()=>
    document.body.classList.contains("ezero-video-connected") &&
    document.getElementById("remoteVideo")?.srcObject?.getVideoTracks().length===1);
  assert.equal(liveAgain,true,"Second video call must also receive video");
  console.log("VIDEO_HANGUP_REDIAL_AND_REMOTE_VIDEO_SECOND_CALL: PASS");
  console.log("HANGUP_AND_REDIAL_CREATES_NEW_QR_WITHOUT_CALLER_RELOAD: PASS");
}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
