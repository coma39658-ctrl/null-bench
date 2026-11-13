import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8769/";
const pagePath="ezero_trusted_friends_staging_20261106.html";
const publicOrigin="https://ezero-secure-app-two-phone-test-20261107.onrender.com/";
const trustedInbox="wss://ezero-trusted-friends-inbox-staging.coma39658.workers.dev";
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
  // Never touch the live Cloudflare trusted inbox in this test.
  // First QR and second selected-contact video use isolated WebRTC signaling.
  await context.routeWebSocket(trustedInbox+"**",socket=>{
    socket.onMessage(()=>socket.send(JSON.stringify({
      t:"error",code:"TEST_NETWORK_DELIVERY_DISABLED"
    })));
  });
  // Preserve the exact allowed public HTTPS Origin while reading candidate
  // files ONLY from the local CI server; public Pages is never modified.
  await context.route("**/*",async route=>{
    const url=route.request().url();
    if(!url.startsWith(publicOrigin))return route.abort("blockedbyclient");
    const u=new URL(url);
    const relative=u.pathname.slice(1);
    const response=await context.request.get(base+relative+u.search);
    return route.fulfill({response});
  });
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
  await page.goto(publicOrigin+pagePath,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64);
  return page;
}

const profilePhoto=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGPkrzBhIAUwkaR6VMOohiGlAQBvQwDbVY2zjwAAAABJRU5ErkJggg==","base64");
async function completeFirstTimeProfile(page,name){
  assert.equal(await page.locator("#ezeroProfileMissingReminder").isVisible(),true);
  await page.locator("#ezeroProfileFirstOpen").click();
  await page.locator("#ezeroMyName").fill(name);
  await page.locator("#ezeroMyPhoto").setInputFiles({
    name:"ci-profile.png",mimeType:"image/png",buffer:profilePhoto
  });
  await page.waitForFunction(()=>document.getElementById("ezeroMyAvatar")?.hidden===false,
    undefined,{timeout:12000});
  await page.locator("#ezeroShareProfile").check();
  await page.locator("#ezeroSaveProfile").click();
  await page.waitForFunction(()=>document.getElementById("ezeroProfileFirstStatus")?.dataset.state==="ready",
    undefined,{timeout:15000});
  assert.equal(await page.locator("#ezeroProfileMissingReminder").isHidden(),true);
}

try{
  const caller=await createPhone("CONTACT_CALLER");
  assert.equal(await caller.locator("#ezeroContactFirstDock").isVisible(),true);
  assert.equal(await caller.locator("#ezeroContactVideo").isEnabled(),false);
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),0,
    "Contact list itself must never activate microphone or camera");
  await caller.locator("#ezeroFriendListToggle").click();
  assert.equal(await caller.locator("#ezeroFriendSidePanel").isVisible(),true);
  assert.equal(await caller.locator("#ezeroFriendSideList .ezero-friend-option").count(),0);
  await caller.locator("#ezeroFriendSideClose").click();
  console.log("CONTACT_FIRST_EMPTY_LIST_NO_MEDIA_OR_FAKE_FRIEND: PASS");
  // The first ever call still uses real explicit QR/accept, no saved friend.
  await caller.locator('[data-modern-select="audio"]').click();
  assert.equal(await caller.evaluate(()=>window.__oneInvite),"",
    "Unsaved name/photo must not create a QR or start calling");
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),0);
  await completeFirstTimeProfile(caller,"First Phone");
  await caller.locator('[data-modern-select="audio"]').click();
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:12000});
  const first=await caller.evaluate(()=>window.__oneInvite);
  assert.match(first,/mode=audio#room=/);
  const callee=await createPhone("CONTACT_CALLEE");
  await callee.goto(first,{waitUntil:"domcontentloaded"});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0);
  await callee.locator("#ezeroAutoAccept").click();
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
    "Incoming call requires recipient profile and explicit consent");
  await completeFirstTimeProfile(callee,"Second Phone");
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  // Signed offer/answer and receiver Accept now save each verified friend
  // automatically; do not regress to a second manual Save Friend operation.
  for(const [phone,friendName] of [[caller,"Second Phone"],[callee,"First Phone"]]){
    await phone.waitForFunction(name=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ).some(peer=>peer.profileName===name&&peer.nickname===false),friendName,{timeout:25000});
    const saved=await phone.evaluate(()=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ));
    assert.equal(saved.length,1);
    assert.equal(saved[0].name,friendName);
    assert.ok(saved[0].avatar?.startsWith("data:image/jpeg;base64,"));
  }
  await caller.locator("#modernHangup").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000})));
  const lastInvite=await caller.evaluate(()=>window.__oneInvite);
  const before=await caller.evaluate(()=>window.__mediaCalls.length);
  await caller.locator('[data-modern-select="video"]').click();
  assert.equal(await caller.locator("#ezeroFriendSidePanel").isVisible(),true,
    "Video button must request friend selection instead of silently calling anyone");
  assert.equal(await caller.evaluate(()=>window.__oneInvite),lastInvite,
    "No unselected outgoing call may create a new QR or activate media");
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),before);
  await caller.locator("#ezeroFriendSideList .ezero-friend-option").filter({
    hasText:"Second Phone"
  }).click();
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");
  assert.equal(await caller.locator("#ezeroContactVideo").isEnabled(),true);
  assert.equal(await caller.locator("#ezeroFriendSidePanel").isHidden(),true);
  console.log("BEFORE_SECOND_VIDEO_PANEL_HIDDEN", await caller.locator("#ezeroAutoPilot").isHidden());
  await caller.locator("#ezeroContactVideo").click();
  console.log("SECOND_VIDEO_DIAGNOSTIC", JSON.stringify(await caller.evaluate(() => ({autoPilotHidden:document.getElementById("ezeroAutoPilot")?.hidden,incomingHidden:document.getElementById("ezeroAutoIncoming")?.hidden,autoStartDisabled:document.getElementById("ezeroAutoStart")?.disabled,autoStartHidden:document.getElementById("ezeroAutoStart")?.hidden,selectedFriend:document.getElementById("ezeroSelectedFriendName")?.textContent,mediaCalls:window.__mediaCalls.length,connected:window.EZERO_VOICE_TRANSPORT?.connected(),savedCallPending:window.EZERO_TRUSTED_SAVED_CALL?.isPending?.()}))));
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,lastInvite,{timeout:30000});
  const videoInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(videoInvite,/mode=video#room=/,
    "Saved contact's video button must create VIDEO not audio invitation");
  assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
    "Saved friend's direct Call must not show the initial-pairing QR");
  assert.equal(await caller.locator("#ezeroInlineCallResult").isVisible(),true,
    "The call status must appear beside the chosen Call control");
  const callerMedia=await caller.evaluate(()=>window.__mediaCalls.at(-1));
  assert.ok(callerMedia?.video&&callerMedia?.audio,
    "Selected-contact video call must explicitly request camera AND mic");
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");
  console.log("SAVED_FRIEND_SELECTED_THEN_VIDEO_BUTTON_REQUESTS_REAL_CAMERA: PASS");
  await callee.goto(videoInvite,{waitUntil:"domcontentloaded"});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  assert.equal(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    "📹 آنے والی ویڈیو کال — قبول کریں؟");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0);
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  for(const phone of [caller,callee]){
    await phone.waitForFunction(()=>document.body.classList.contains("ezero-video-connected")&&
      document.getElementById("remoteVideo")?.srcObject?.getVideoTracks?.()
      .some(t=>t.readyState==="live"),{timeout:12000});
    assert.equal(await phone.locator("#ezeroCallMediaSlot .videos").isVisible(),true,
      "Video scene must be visible for caller and receiver");
    const liveTracks=await phone.evaluate(()=>({
      local:document.getElementById("localVideo").srcObject?.getVideoTracks().filter(x=>x.readyState==="live").length||0,
      remote:document.getElementById("remoteVideo").srcObject?.getVideoTracks().filter(x=>x.readyState==="live").length||0
    }));
    assert.equal(liveTracks.local,1);assert.equal(liveTracks.remote,1);
  }
  console.log("SELECTED_CONTACT_TWO_PHONE_VIDEO_VISIBLE_AND_LIVE_TRACKS: PASS");
  await caller.locator("#hangup").click();
  await callee.waitForFunction(()=>{
    const s=document.getElementById("localVideo")?.srcObject;
    return !window.EZERO_VOICE_TRANSPORT?.connected()&&
      (!s||s.getTracks().every(t=>t.readyState==="ended"));
  },{timeout:15000});
  console.log("CONTACT_FIRST_VIDEO_HANGUP_STOPS_REMOTE_CAMERA: PASS");
}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
