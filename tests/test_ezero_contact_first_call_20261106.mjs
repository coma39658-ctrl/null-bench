import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8769/";
const pagePath="ezero_trusted_friends_staging_20261106.html";
const publicOrigin="https://coma39658-ctrl.github.io/null-bench/";
const trustedInbox="wss://ezero-trusted-inbox-pr156-preview-v2.coma39658.workers.dev";
const service="wss://ezero-browser-signaling-pilot.coma39658.workers.dev/v1/rooms/";
const browser=await chromium.launch({headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream"]});
const contexts=[];
const rooms=new Map();
const ownerSockets=new Map(),trustedPeers=new Map(),pendingCalls=new Map();
let offers=0,answers=0;
function mockTrusted(ws){
  const target=new URL(ws.url()).pathname.split("/").pop();
  if(!/^[a-f0-9]{64}$/.test(target))throw Error("Bad trusted-inbox target");
  const opened=Date.now();
  ws.send(JSON.stringify({t:"challenge",target,nonce:"A".repeat(32),opened,expires:opened+20000}));
  let role="",ownFp="";
  ws.onMessage(payload=>{
    const m=JSON.parse(payload);
    if(m.t==="hello"){
      role=m.role;ownFp=m.fp;
      if(!["owner","caller"].includes(role)||!/^[a-f0-9]{64}$/.test(ownFp||"")||
         typeof m.pub!=="string"||typeof m.sig!=="string")throw Error("Bad trusted-inbox hello");
      if(role==="owner"){
        if(ownFp!==target)throw Error("Owner target mismatch");
        ownerSockets.set(ownFp,ws);
      }else if(ownFp===target)throw Error("Self-call in trusted inbox");
      ws.send(JSON.stringify({t:"ready",role}));
    }else if(role==="owner"&&m.t==="trust"){
      const peers=trustedPeers.get(ownFp)||new Set();peers.add(m.fp);trustedPeers.set(ownFp,peers);
      ws.send(JSON.stringify({t:"trust-updated",fp:m.fp,trusted:true}));
    }else if(role==="owner"&&m.t==="untrust"){
      const peers=trustedPeers.get(ownFp)||new Set();peers.delete(m.fp);trustedPeers.set(ownFp,peers);
      ws.send(JSON.stringify({t:"trust-updated",fp:m.fp,trusted:false}));
    }else if(role==="caller"&&m.t==="call"){
      if(!/^[a-f0-9]{32}$/.test(m.callId||"")||!["audio","video"].includes(m.kind)||
         typeof m.invite!=="string")throw Error("Bad trusted call");
      if(!trustedPeers.get(target)?.has(ownFp)){
        ws.send(JSON.stringify({t:"error",code:"FRIEND_NOT_TRUSTED"}));return;
      }
      const owner=ownerSockets.get(target);
      if(!owner){ws.send(JSON.stringify({t:"error",code:"OWNER_OFFLINE"}));return;}
      pendingCalls.set(m.callId,ws);
      owner.send(JSON.stringify({t:"incoming",from:ownFp,callId:m.callId,kind:m.kind,invite:m.invite}));
    }else if(role==="owner"&&m.t==="received"){
      const caller=pendingCalls.get(m.callId);
      caller?.send(JSON.stringify({t:"delivered-to-active-tab",callId:m.callId}));
      pendingCalls.delete(m.callId);
    }
  });
}
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
  // Deterministic mock for the isolated PR156 Trusted Inbox. It verifies
  // bilateral trust before relaying an incoming call; no live Worker is touched.
  await context.routeWebSocket(trustedInbox+"/v1/trusted/**",mockTrusted);
  // Preserve the exact allowed public HTTPS Origin while reading candidate
  // files ONLY from the local CI server; public Pages is never modified.
  await context.route("**/*",async route=>{
    const url=route.request().url();
    if(!url.startsWith(publicOrigin))return route.abort("blockedbyclient");
    const u=new URL(url);
    const relative=u.pathname.slice("/null-bench/".length);
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
  // Pair both phones once with their permanent signed EZERO2 identities.
  const callee=await createPhone("CONTACT_CALLEE");
  await completeFirstTimeProfile(caller,"First Phone");
  await completeFirstTimeProfile(callee,"Second Phone");
  await Promise.all([caller,callee].map(async phone=>{
    const create=phone.locator("#ezeroCreatePermanentQr");
    if(await create.isVisible())await create.click();
    await phone.locator("#ezeroPermanentQr").waitFor({state:"visible",timeout:12000});
  }));
  const [callerIdentity,calleeIdentity]=await Promise.all([caller,callee].map(phone=>
    phone.evaluate(()=>window.EZERO_PERMANENT_IDENTITY_QR.createAfterConsent())));
  assert.notEqual(callerIdentity.fingerprint,calleeIdentity.fingerprint);
  for(const [phone,peerIdentity,friendName] of [
    [caller,calleeIdentity,"Second Phone"],[callee,callerIdentity,"First Phone"]
  ]){
    await phone.evaluate(peer=>document.dispatchEvent(new CustomEvent("ezero:friend-verification",{
      detail:{ok:true,permanent:true,token:peer.token,fingerprint:peer.fingerprint,source:"scan"}
    })),peerIdentity);
    await phone.locator("#ezeroPermanentFriendSaveForm").waitFor({state:"visible",timeout:10000});
    await phone.locator("#ezeroPermanentFriendName").fill(friendName);
    await phone.locator("#ezeroSavePermanentFriend").click();
    await phone.waitForFunction(fp=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ).some(peer=>peer.fp===fp&&peer.identityVersion===2&&peer.nickname===true&&
      typeof peer.spki==="string"&&peer.spki.length>50),peerIdentity.fingerprint,{timeout:15000});
  }
  const waitForTrust=async()=>{
    const until=Date.now()+12000;
    while(Date.now()<until){
      if(trustedPeers.get(callerIdentity.fingerprint)?.has(calleeIdentity.fingerprint)&&
         trustedPeers.get(calleeIdentity.fingerprint)?.has(callerIdentity.fingerprint))return;
      await new Promise(resolve=>setTimeout(resolve,50));
    }
    throw Error("Bilateral permanent-friend trust was not established");
  };
  await waitForTrust();
  await Promise.all([caller,callee].map(phone=>phone.waitForFunction(()=>
    document.getElementById("ezeroTrustedStatus")?.textContent.includes("کال وصول کرنے کے لیے تیار"),
    undefined,{timeout:15000})));
  console.log("CONTACT_FIRST_QR_SAVE_AUTO_ACTIVATES_FOREGROUND_INBOX: PASS");
  // A hundred direct-call preparations must not create or reveal another QR.
  const repeated=await caller.evaluate(fp=>{
    for(let i=0;i<100;i++){
      if(window.EZERO_TRUSTED_SAVED_CALL?.prepare(fp,i%2?"audio":"video")!==true)return false;
      // Simulate the completed/aborted call lifecycle before preparing the
      // next one; no invitation URL or QR is created by preparation itself.
      document.dispatchEvent(new CustomEvent("ezero:call-status",{detail:{stage:"idle"}}));
    }
    return true;
  },calleeIdentity.fingerprint);
  assert.equal(repeated,true,"Saved friend must remain directly callable after 100 preparations");
  assert.equal(await caller.evaluate(()=>window.__oneInvite),"",
    "Preparing repeated saved-friend calls must not create a new invitation QR");
  assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
    "A saved friend never needs the pairing QR again");
  await caller.locator("#ezeroFriendListToggle").click();
  await caller.locator("#ezeroFriendSidePanel").waitFor({state:"visible",timeout:10000});
  await caller.locator("#ezeroFriendSideList .ezero-friend-option").filter({
    hasText:"Second Phone"
  }).click();
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");
  assert.equal(await caller.locator("#ezeroContactAudio").isEnabled(),true);
  await caller.locator("#ezeroContactAudio").click();
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:20000});
  const audioInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(audioInvite,/mode=audio#room=/);
  assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
    "Direct audio calls do not display a pairing QR");
  await callee.locator("#ezeroTrustedIncoming").waitFor({state:"visible",timeout:15000});
  const audioInboxUrl=callee.url();
  await callee.locator("#ezeroTrustedIncoming button").first().click();
  assert.equal(callee.url(),audioInboxUrl,"Incoming-call review must not reload or disconnect the trusted inbox");
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:10000});
  assert.equal(await callee.evaluate(()=>document.querySelector('input[name="mode"]:checked')?.value),"audio");
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(phone=>phone.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  for(const phone of [caller,callee]){
    const mode=await phone.evaluate(()=>({
      active:window.EZERO_ACTIVE_CALL_MODE,
      selected:window.EZERO_SELECTED_CALL_MODE,
      videoTracks:document.getElementById("localVideo").srcObject?.getVideoTracks().length||0,
      requestedVideo:window.__mediaCalls.at(-1)?.video||false
    }));
    assert.equal(mode.active,"audio");
    assert.equal(mode.selected,"audio");
    assert.equal(mode.videoTracks,0,"Audio calls must not capture camera video");
    assert.equal(mode.requestedVideo,false,"Audio calls must request video:false");
  }
  for(const [phone,friendFp,friendName] of [
    [caller,calleeIdentity.fingerprint,"Second Phone"],
    [callee,callerIdentity.fingerprint,"First Phone"]
  ]){
    const saved=await phone.evaluate(()=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ));
    assert.equal(saved.length,1);
    assert.equal(saved[0].fp,friendFp);
    assert.equal(saved[0].name,friendName,"Local friend name must survive the call");
    assert.equal(saved[0].nickname,true,"Verified profile must not overwrite the user's local name");
    assert.ok(saved[0].spki,"Permanent public key must remain pinned after calling");
  }
  console.log("TWO_PHONE_PERMANENT_QR_PAIR_DIRECT_AUDIO_100_PREPARATIONS_NO_RESCAN: PASS");
  await caller.locator("#hangup").click();
  await Promise.all([caller,callee].map(phone=>phone.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000})));
  const lastInvite=await caller.evaluate(()=>window.__oneInvite);
  const before=await caller.evaluate(()=>window.__mediaCalls.length);
  await caller.locator("#ezeroFriendListToggle").click();
  await caller.locator("#ezeroFriendSidePanel").waitFor({state:"visible",timeout:10000});
  await caller.locator("#ezeroFriendSideList .ezero-friend-option").filter({
    hasText:"Second Phone"
  }).click();
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");
  assert.equal(await caller.locator("#ezeroContactVideo").isEnabled(),true);
  await caller.locator("#ezeroContactVideo").click();
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,lastInvite,{timeout:30000});
  const videoInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(videoInvite,/mode=video#room=/,
    "Saved contact's video button must create VIDEO not audio invitation");
  assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
    "Saved friend's direct video call must not show a pairing QR");
  assert.equal(await caller.locator("#ezeroContactFirstStatus").isVisible(),true,
    "The call status must appear beside the chosen Call control");
  const callerMedia=await caller.evaluate(()=>window.__mediaCalls.at(-1));
  assert.ok(callerMedia?.video&&callerMedia?.audio,
    "Selected-contact video call must explicitly request camera AND mic");
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");
  await callee.locator("#ezeroTrustedIncoming").waitFor({state:"visible",timeout:15000});
  const calleeMediaBeforeVideoReview=await callee.evaluate(()=>window.__mediaCalls.length);
  const videoInboxUrl=callee.url();
  await callee.locator("#ezeroTrustedIncoming button").first().click();
  assert.equal(callee.url(),videoInboxUrl,"Repeated incoming video review must remain in-place");
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:10000});
  assert.equal(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    "📹 آنے والی ویڈیو کال — قبول کریں؟");
  assert.equal(await callee.evaluate(()=>document.querySelector('input[name="mode"]:checked')?.value),"video",
    "Incoming video invitation must select video media before Accept");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),calleeMediaBeforeVideoReview,
    "Reviewing an incoming video invitation must not request camera or microphone before Accept");
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  for(const phone of [caller,callee]){
    assert.equal(await phone.evaluate(()=>window.EZERO_ACTIVE_CALL_MODE),"video",
      "The accepted session must preserve the requested video mode");
    assert.equal(await phone.evaluate(()=>window.EZERO_PEER_PROFILE_TRANSPORT.remoteVideoReady()),true,
      "A video call is not connected until a remote video track is live");
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
    // The live remote-video surface intentionally covers the collapsed
    // mode picker. Dispatch the guarded control event directly to verify that
    // even a programmatic stale audio action cannot downgrade an active video call.
    await phone.locator('[data-modern-select="audio"]').evaluate(node=>node.click());
    assert.equal(await phone.evaluate(()=>window.EZERO_ACTIVE_CALL_MODE),"video",
      "A live video call cannot be silently switched to audio");
    assert.equal(await phone.evaluate(()=>document.querySelector('input[name="mode"]:checked')?.value),"video");
  }
  console.log("SELECTED_CONTACT_TWO_PHONE_VIDEO_MODE_LOCK_AND_LIVE_TRACKS: PASS");
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
