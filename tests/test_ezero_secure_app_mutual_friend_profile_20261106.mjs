import assert from "node:assert/strict";
import {chromium} from "playwright";

const LIVE_SIGNALING=process.env.EZERO_LIVE_SIGNALING==="1";
const REMOTE_RENDER_STAGE=process.env.EZERO_REMOTE_RENDER_STAGE==="1";
const REMOTE_RENDER_ORIGIN="https://ezero-secure-app-two-phone-test-20261107.onrender.com/";
const base="http://127.0.0.1:8769/";
const pagePath="ezero_trusted_friends_staging_20261106.html";
const publicOrigin=REMOTE_RENDER_STAGE?REMOTE_RENDER_ORIGIN:"https://coma39658-ctrl.github.io/null-bench/";
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
  if(!LIVE_SIGNALING) await context.routeWebSocket(service+"**",mockSocket);
  // Never touch the live Cloudflare trusted inbox in this test.
  // First QR and second selected-contact video use isolated WebRTC signaling.
  await context.routeWebSocket(trustedInbox+"**",socket=>{
    socket.onMessage(()=>socket.send(JSON.stringify({
      t:"error",code:"TEST_NETWORK_DELIVERY_DISABLED"
    })));
  });
  // Preserve the exact allowed public HTTPS Origin while reading candidate
  // files ONLY from the local CI server; public Pages is never modified.
  if(!REMOTE_RENDER_STAGE) await context.route("**/*",async route=>{
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
    // Safe staging QA diagnostics: counts/booleans only; never names, photos,
    // signatures, room tokens or complete fingerprints.
    window.__ezeroEventCounts={signed:0,channelOpen:0,profilesReceived:0,friendsSaved:0,callConnected:0};
    document.addEventListener("ezero:peer-signed-verified",()=>window.__ezeroEventCounts.signed++);
    document.addEventListener("ezero:channel-state",e=>{if(e.detail?.connected)window.__ezeroEventCounts.channelOpen++;});
    document.addEventListener("ezero:profile-received",()=>window.__ezeroEventCounts.profilesReceived++);
    document.addEventListener("ezero:friend-local-saved",()=>window.__ezeroEventCounts.friendsSaved++);
    document.addEventListener("ezero:call-status",e=>{if(e.detail?.stage==="connected")window.__ezeroEventCounts.callConnected++;});
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
  // Cache-bust the *HTML* too: otherwise Render's CDN or a mobile browser
  // can serve an older build while the JS/CSS source branch is newer.
  const buildQuery=REMOTE_RENDER_STAGE?
    "?stageBuild="+encodeURIComponent((process.env.EZERO_REMOTE_RENDER_SHA||"unknown").slice(0,12)):"";
  await page.goto(publicOrigin+pagePath+buildQuery,{waitUntil:"domcontentloaded"});
  if(REMOTE_RENDER_STAGE){
    const banner=page.locator(".ezero-stage-banner");
    await banner.waitFor({state:"visible",timeout:15000});
    assert.match(await banner.innerText(),/TEST|ٹیسٹ/);
    const expected=process.env.EZERO_REMOTE_RENDER_SHA||"";
    if(expected)assert.ok((await banner.innerText()).includes(expected.slice(0,12)),
      "Deployed stage SHA must match the pinned expected build");
  }
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64);
  return page;
}


const FRIENDS="ezero_secure_connect_staging_fingerprints_v0_1";
const photoAlice=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGPkrzBhIAUwkaR6VMOohiGlAQBvQwDbVY2zjwAAAABJRU5ErkJggg==","base64");
const photoBob=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGN0DFrFQApgIkn1qIZRDUNKAwD8KgFdNAHPJwAAAABJRU5ErkJggg==","base64");
async function setupProfile(page,name,photo){
  assert.equal(await page.locator("#ezeroProfileMissingReminder").isVisible(),true,
    "An unsaved name/photo must have a visible reminder");
  await page.locator("#ezeroProfileFirstOpen").click();
  await page.locator("#ezeroMyName").fill(name);
  await page.locator("#ezeroMyPhoto").setInputFiles({
    name:name+".png",mimeType:"image/png",buffer:photo
  });
  await page.waitForFunction(()=>document.getElementById("ezeroMyAvatar")?.hidden===false,
    undefined,{timeout:12000});
  await page.locator("#ezeroShareProfile").check();
  await page.locator("#ezeroSaveProfile").click();
  await page.waitForFunction(()=>document.getElementById("ezeroProfileFirstStatus")?.dataset.state==="ready",
    undefined,{timeout:15000});
  assert.equal(await page.locator("#ezeroProfileMissingReminder").isHidden(),true);
  const proof=await page.evaluate(async()=>({
    key:(await window.EZERO_DEVICE_IDENTITY_STORE.read())?.fingerprint,
    visible:document.getElementById("myFingerprint")?.textContent.trim(),
    profile:JSON.parse(localStorage.getItem("ezero_secure_connect_staging_local_profile_v0_1")||"null")
  }));
  assert.equal(proof.key,proof.visible);
  assert.equal(proof.profile.name,name);
  assert.ok(proof.profile.avatar.startsWith("data:image/jpeg;base64,"));
  assert.equal(proof.profile.share,true);
  console.log(name+"_NAME_DP_AND_DURABLE_DEVICE_ID: PASS");
}
async function readFriends(page){
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)||"[]"),FRIENDS);
}
async function waitForProfileFriend(page,name){
  await page.waitForFunction(({key,name})=>{
    const arr=JSON.parse(localStorage.getItem(key)||"[]");
    return arr.some(x=>x.profileName===name&&x.avatar?.startsWith("data:image/jpeg;base64,"));
  },{key:FRIENDS,name},{timeout:25000});
}
try{
  const alice=await createPhone("ALICE");
  const hub=alice.locator("#ezeroFrontQrHub");
  assert.equal(await hub.isVisible(),true,"Each phone must display Wi-Fi-style QR up front");
  assert.equal(await alice.locator("#ezeroFrontAudioQr").isVisible(),true);
  assert.equal(await alice.locator("#ezeroOneScanInvite").isVisible(),true);
  assert.equal(await alice.locator("#modernCallPanel").evaluate(el=>
    el.closest("#ezeroInlineCallResult")!==null),true,
    "Actual call video/audio must stay directly below the tapped call tile");
  assert.equal(await alice.locator("#modernConnectionStatus").evaluate(el=>
    el.closest("#ezeroInlineCallResult")!==null),true,
    "Connection status and hangup must be displayed at the call button");

  assert.equal(await alice.locator("#ezeroOneQrBox").isHidden(),true,
    "An unsigned and unrequested QR must never look like a ready call invite");
  assert.equal(await alice.evaluate(()=>{
    const qr=document.getElementById("ezeroFrontQrHub");
    const dock=document.getElementById("ezeroContactFirstDock");
    return qr.compareDocumentPosition(dock)&Node.DOCUMENT_POSITION_FOLLOWING;
  })!==0,true,"The QR hub must be ahead of long friend/contact panels");
  assert.equal(await alice.locator("#ezeroOneScanInvite").evaluate(el=>
    el.parentElement?.id==="ezeroFrontScannerSlot"),true,
    "Only the original signed call scanner, not an identity-only scanner, is shown up front");
  if(!REMOTE_RENDER_STAGE){
    assert.equal(await alice.locator("#ezeroOneScannerVideo").evaluate(el=>
      el.closest("#ezeroFrontScannerSlot")!==null),true,
      "The camera must open underneath the Scan button, not at the bottom of the page");
    assert.equal(await alice.locator("#modernVoicePanel").evaluate(el=>
      el.parentElement?.classList.contains("modern-feature-grid")&&
      el.previousElementSibling?.dataset.modernSelect==="voice"),true,
      "Voice-note panel must immediately follow the Voice button");
    assert.equal(await alice.locator("#modernChatPanel").evaluate(el=>
      el.parentElement?.classList.contains("modern-feature-grid")&&
      el.previousElementSibling?.dataset.modernSelect==="chat"),true,
      "Chat panel must immediately follow the Chat button");
    assert.equal(await alice.locator("#ezeroProfileEditor").evaluate(el=>
      el.parentElement?.id==="ezeroProfileFirstGate"),true,
      "Name/photo editor must open beside the profile prerequisite");
    assert.equal(await alice.locator("#ezeroOneQrBox").evaluate(el=>
      el.parentElement?.id==="ezeroFrontQrRenderSlot"),true,
      "Call QR starts next to My QR, not under another feature");
  }
  assert.equal(await alice.locator("#ezeroContactVideo").isEnabled(),false);
  await alice.locator("#ezeroFrontAudioQr").click();
  assert.equal(await alice.evaluate(()=>window.__mediaCalls.length),0,
    "Unsaved profile must never request media");
  assert.equal(await alice.evaluate(()=>window.__oneInvite),"",
    "Unsaved profile must not create invitation");
  assert.equal(await alice.locator("#ezeroProfileEditor").evaluate(el=>
    el.parentElement?.id==="ezeroFrontQrRenderSlot"),true,
    "Name/DP editor should open next to My QR without scrolling to settings");
  console.log("MISSING_NAME_DP_PREVENTS_CALL: PASS");
  await setupProfile(alice,"Alice",photoAlice);
  await alice.locator("#ezeroFrontAudioQr").click();
  await alice.waitForFunction(()=>!!window.__oneInvite,{timeout:20000});
  const invite=await alice.evaluate(()=>window.__oneInvite);
  assert.match(invite,/mode=audio#room=/);
  await alice.locator("#ezeroOneQr svg").waitFor({state:"visible",timeout:12000});
  assert.equal(await alice.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await alice.locator("#ezeroFrontShareQrImage").isEnabled(),true);
  assert.equal(await alice.locator("#ezeroOneQr").evaluate(el=>
    el.closest("#ezeroFrontQrHub")!==null),true);
  assert.equal(await alice.locator("#ezeroAutoShare").isEnabled(),true);
  assert.equal(await alice.locator("#ezeroAutoShare").evaluate(el=>
    el.closest("#ezeroFrontQrRenderSlot")!==null),true,
    "Share actions must remain under My QR instead of the Scan button");
  assert.equal(await alice.locator("#ezeroOneCopyInvite").isEnabled(),true);
  if(!REMOTE_RENDER_STAGE){
    assert.equal(await alice.locator("#ezeroOneQrBox").evaluate(el=>
      el.nextElementSibling?.id==="ezeroFrontQrShareSlot"),true,
      "QR image and QR sharing must appear in the same inline option");
    assert.equal(await alice.locator("#ezeroFrontQrShareSlot").evaluate(el=>
      el.nextElementSibling?.id==="ezeroAutoStatus"),true,
      "Cloudflare status/failures must remain next to the QR, not far below");
  }

  if(!REMOTE_RENDER_STAGE){
    assert.equal(await alice.locator("#ezeroOneQrBox").evaluate(el=>
      el.parentElement?.id==="ezeroFrontQrRenderSlot"),true);
    assert.equal(await alice.locator("#ezeroFrontAudioQr").getAttribute("aria-expanded"),"true");
    assert.equal(await alice.locator("#ezeroOneQrBox").isVisible(),true);
    console.log("SAME_PLACE_QR_SCANNER_PROFILE_CHAT_VOICE: PASS");
  }
  console.log("FRONT_WIFI_STYLE_CALL_QR_SCAN_AND_SHARE_SAME_PAGE: PASS");
  // A real gallery QR decode on an isolated mobile Chromium page. Force the
  // browser-native BarcodeDetector OFF: the self-hosted jsQR fallback must
  // read the actual generated signed QR PNG (without using a server or camera).
  assert.equal(await alice.locator("#ezeroOneImageScan").isVisible(),true);
  assert.equal(await alice.locator("#ezeroOneSameVersion").isVisible(),true,
    "The share-this-test-link control must be visible even before pairing");
  const qrPng=await alice.locator("#ezeroOneQr svg").screenshot({type:"png"});
  const scanPhone=await createPhone("QR_IMAGE_FALLBACK_PHONE");
  await scanPhone.evaluate(()=>Object.defineProperty(window,"BarcodeDetector",{
    configurable:true,value:undefined
  }));
  assert.equal(await scanPhone.locator("#ezeroOneImageScan").isVisible(),true);
  assert.equal(await scanPhone.evaluate(()=>typeof window.jsQR),"function",
    "Self-hosted jsQR fallback must load without external CDN access");
  await scanPhone.locator("#ezeroOneImageScanInput").setInputFiles({
    name:"call-invitation.png",mimeType:"image/png",buffer:qrPng
  });
  await scanPhone.waitForFunction(()=>location.hash.startsWith("#room="),
    undefined,{timeout:20000});
  await scanPhone.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  assert.equal(await scanPhone.evaluate(()=>window.__mediaCalls.length),0,
    "Scanning an image never auto-accepts a call or opens mic/camera");
  console.log("SELF_HOSTED_GALLERY_QR_SCAN_SAME_ORIGIN_SIGNED_INVITE: PASS");
  await scanPhone.context().close();

  if(REMOTE_RENDER_STAGE)assert.ok(invite.startsWith(REMOTE_RENDER_ORIGIN),
    "Generated invite must point back to the same isolated Render staging site");
  const bob=await createPhone("BOB");
  assert.equal(await bob.locator("#ezeroFrontQrHub").isVisible(),true);
  assert.equal(await bob.locator("#ezeroOneScanInvite").isVisible(),true);
  await bob.goto(invite,{waitUntil:"domcontentloaded"});
  await bob.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  const unaccepted=await readFriends(bob);
  assert.equal(unaccepted.length,0,"Opening someone else's link is not accepting friendship");
  await bob.locator("#ezeroAutoAccept").click();
  assert.equal(await bob.evaluate(()=>window.__mediaCalls.length),0,
    "Accept must be stopped before mandatory name and display photo are saved");
  await setupProfile(bob,"Bob",photoBob);
  await bob.locator("#ezeroAutoAccept").click();
  await Promise.all([alice,bob].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  try{
    await Promise.all([waitForProfileFriend(alice,"Bob"),waitForProfileFriend(bob,"Alice")]);
  }catch(error){
    if(LIVE_SIGNALING){
      for(const [label,page] of [["A",alice],["B",bob]]){
        const diagnostics=await page.evaluate(()=>{
          const contacts=JSON.parse(localStorage.getItem(
            "ezero_secure_connect_staging_fingerprints_v0_1")||"[]");
          const local=JSON.parse(localStorage.getItem(
            "ezero_secure_connect_staging_local_profile_v0_1")||"null");
          return {
            events:window.__ezeroEventCounts,
            voiceChannelOpen:window.EZERO_VOICE_TRANSPORT?.connected()===true,
            verifiedProfileTransport:window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true,
            verifiedPeerFingerprintPresent:/^[a-f0-9]{64}$/.test(
              window.EZERO_PEER_PROFILE_TRANSPORT?.peerFingerprint?.()||""),
            userProfileReady:document.getElementById("ezeroProfileFirstStatus")?.dataset.state==="ready",
            localShareConsent:local?.share===true,
            hasRemoteProfileCard:document.getElementById("ezeroPeerProfileCard")?.hidden===false,
            contactCount:contacts.length,
            contactsWithRemoteProfiles:contacts.filter(c=>!!c.profileName&&
              typeof c.avatar==="string"&&c.avatar.startsWith("data:image/jpeg;base64,")).length
          };
        });
        console.error("LIVE_PROFILE_SAFE_DIAGNOSTIC_"+label,JSON.stringify(diagnostics));
      }
    }
    throw error;
  }
  const aliceFriend=(await readFriends(alice)).find(x=>x.profileName==="Bob");
  const bobFriend=(await readFriends(bob)).find(x=>x.profileName==="Alice");
  assert.equal(aliceFriend.name,"Bob");
  assert.equal(bobFriend.name,"Alice");
  assert.equal(aliceFriend.nickname,false);
  assert.equal(bobFriend.nickname,false);
  assert.equal(aliceFriend.fp.length,64);
  assert.equal(bobFriend.fp.length,64);
  console.log("MUTUAL_ACCEPT_SIGNED_ID_BOTH_FRIENDS_NAMES_PHOTOS: PASS");
  await alice.locator("#hangup").click();
  await Promise.all([alice,bob].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000})));

  // Regression: after the first verified call, a NEW QR must remain
  // available even with saved contacts. The scanner is not the QR creator.
  await alice.locator("#ezeroFreshQrToggle").click();
  assert.equal(await alice.locator("#ezeroFreshQrVideo").isVisible(),true);
  await alice.locator("#ezeroFreshQrVideo").click();
  await alice.waitForFunction(old=>window.__oneInvite&&
    window.__oneInvite!==old,invite,{timeout:30000});
  const second=await alice.evaluate(()=>window.__oneInvite);
  assert.match(second,/mode=video#room=/);
  assert.notEqual(second,invite);
  await alice.locator("#ezeroOneQr svg").waitFor({state:"visible",timeout:12000});
  assert.equal(await alice.locator("#ezeroAutoPilot").evaluate(x=>
    x.parentElement?.id==="ezeroContactFirstDock"),true);
  console.log("AFTER_FIRST_CALL_FRESH_VIDEO_QR_NEAR_FRIEND_ACTIONS: PASS");
  await bob.goto(second,{waitUntil:"domcontentloaded"});
  await bob.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  await bob.waitForFunction(()=>document.getElementById("ezeroProfileFirstStatus")?.dataset.state==="ready",
    undefined,{timeout:12000});
  await bob.locator("#ezeroAutoAccept").click();
  await Promise.all([alice,bob].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  for(const phone of [alice,bob]){
    await phone.waitForFunction(()=>document.getElementById("remoteVideo")?.srcObject?.
      getVideoTracks().some(t=>t.readyState==="live"),undefined,{timeout:15000});
  }
  await alice.locator("#hangup").click();
  await Promise.all([alice,bob].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000})));
  console.log("SECOND_QR_VIDEO_CALL_BOTH_DIRECTIONS_NO_NEW_PROFILE_REQUIRED: PASS");
  const aliceId=await alice.evaluate(()=>document.getElementById("myFingerprint").textContent.trim());
  await alice.reload({waitUntil:"domcontentloaded"});
  await alice.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent?.length===64,
    undefined,{timeout:12000});
  assert.equal(await alice.evaluate(()=>document.getElementById("myFingerprint").textContent.trim()),aliceId,
    "Reload must restore same non-extractable device key");
  await alice.waitForFunction(()=>document.getElementById("ezeroProfileFirstStatus")?.dataset.state==="ready");
  assert.equal((await readFriends(alice)).some(x=>x.profileName==="Bob"),true);
  console.log("RELOAD_PRESERVES_PRIVATE_KEY_CONTACTS_AND_PROFILE: PASS");
  await alice.locator("#ezeroFriendListToggle").click();
  await alice.locator("#ezeroFriendSideList .ezero-friend-option").filter({hasText:"Bob"}).click();
  assert.equal(await alice.locator("#ezeroSelectedFriendName").textContent(),"Bob");
  await alice.locator("#ezeroSelectedFriendRename").click();
  await alice.locator("#ezeroContactNickname").fill("Workshop Brother");
  await alice.locator("#ezeroContactNicknameSave").click();
  assert.equal(await alice.locator("#ezeroSelectedFriendName").textContent(),"Workshop Brother");
  assert.match(await alice.locator("#ezeroSelectedFriendNote").textContent(),/Bob/);
  await alice.locator("#ezeroFriendListToggle").click();
  await alice.locator("#ezeroFriendSideSearch").fill("Bob");
  assert.equal(await alice.locator("#ezeroFriendSideList .ezero-friend-option").count(),1,
    "Search should match remote profile name despite a local nickname");
  await alice.locator("#ezeroFriendSideClose").click();
  console.log("LOCAL_ALIAS_PRESERVED_AND_PROFILE_NAME_SEARCHABLE: PASS");
  const aliceFriendAfter=(await readFriends(alice)).find(x=>x.fp===aliceFriend.fp);
  assert.equal(aliceFriendAfter.name,"Workshop Brother");
  assert.equal(aliceFriendAfter.profileName,"Bob");
  assert.equal(aliceFriendAfter.nickname,true);
  await alice.locator("#ezeroBlockSelectedFriend").click();
  assert.equal(await alice.locator("#ezeroSelectedFriendName").textContent(),"دوست منتخب نہیں");
  assert.equal(await alice.evaluate(fp=>window.EZERO_FRIEND_ACCESS.isBlocked(fp),aliceFriend.fp),true);
  assert.equal((await readFriends(alice)).some(x=>x.fp===aliceFriend.fp),false);
  await alice.locator("#ezeroFriendListToggle").click();
  assert.equal(await alice.locator("#ezeroBlockedIdentities button").count(),1);
  await alice.locator("#ezeroBlockedIdentities button").click();
  assert.equal(await alice.evaluate(fp=>window.EZERO_FRIEND_ACCESS.isBlocked(fp),aliceFriend.fp),false);
  await alice.locator("#ezeroFriendSideClose").click();
  console.log("BLOCK_DELETES_LOCAL_FRIEND_AND_EXPLICIT_UNBLOCK_WORKS: PASS");
  if(!LIVE_SIGNALING) assert.ok(offers>=1&&answers>=1,
    "Signed real WebRTC offer and answer must both pass");
  else console.log(REMOTE_RENDER_STAGE?
    "RENDER_HTTPS_REAL_CLOUDFLARE_TWO_BROWSER_WEBRTC: PASS":
    "LIVE_CLOUDFLARE_SIGNALING_AND_SIGNED_WEBRTC_MEDIA: PASS");
}finally{
  await Promise.all(contexts.map(c=>c.close().catch(()=>{})));
  await browser.close();
}
