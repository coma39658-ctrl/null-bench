import assert from "node:assert/strict";
import {chromium} from "playwright";
import {createHash,createPublicKey,verify} from "node:crypto";

const base="http://127.0.0.1:8769/";
const pagePath="noqr-preview-20261115/ezero_trusted_friends_staging_20261106.html";
const publicOrigin="https://coma39658-ctrl.github.io/null-bench/";
const trustedInbox="wss://ezero-trusted-friends-inbox-staging.coma39658.workers.dev";
const service="wss://ezero-browser-signaling-pilot.coma39658.workers.dev/v1/rooms/";
const browser=await chromium.launch({headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream"]});
const contexts=[];
const rooms=new Map();
let offers=0,answers=0;
// Local trusted-inbox simulation: no live Cloudflare connections or account writes.
// This tests invitation delivery and explicit recipient acceptance, not real cloud availability.
const owners=new Map();
const permitted=new Map();
const pendingCalls=new Map();
function mockTrustedInbox(ws){
  console.log("TRUSTED_INBOX_LAB_ONLY_SOCKET_INTERCEPTED");
  const url=new URL(ws.url());
  const match=new RegExp("^/v1/trusted/([a-f0-9]{64})$").exec(url.pathname);
  assert.ok(match,"Trusted inbox endpoint must be a verified SHA-256 device fingerprint");
  const target=match[1],opened=Date.now();
  const nonce="AbCdEfGhIjKlMnOpQrStUvWxYz012345";
  const send=data=>ws.send(JSON.stringify(data));
  let client=null;
  ws.onMessage(raw=>{
    const msg=JSON.parse(raw);
    if(msg.t==="hello"){
      assert.ok(["owner","caller"].includes(msg.role));
      const pk=Buffer.from(msg.pub,"base64url");
      const expectedFp=createHash("sha256").update(pk).digest("hex");
      assert.equal(msg.fp,expectedFp,"client must use signed key fingerprint");
      if(msg.role==="owner")assert.equal(msg.fp,target);
      else assert.notEqual(msg.fp,target);
      const content=["EZERO-TRUSTED-INBOX-1","https://coma39658-ctrl.github.io",
        target,msg.role,msg.fp,nonce,String(opened)].join("\n");
      const pub=createPublicKey({key:pk,format:"der",type:"spki"});
      assert.ok(verify("sha256",Buffer.from(content),
        {key:pub,dsaEncoding:"ieee-p1363"},Buffer.from(msg.sig,"base64url")),
        "trusted inbox challenge must be signed by saved device key");
      client={role:msg.role,fp:msg.fp,ws};
      if(client.role==="owner")owners.set(target,client);
      send({t:"ready",role:msg.role});
    }else if(msg.t==="trust"){
      assert.equal(client?.role,"owner");
      const key=client.fp;
      const set=permitted.get(key)||new Set();
      set.add(msg.fp);permitted.set(key,set);
      send({t:"trust-updated",fp:msg.fp,trusted:true});
    }else if(msg.t==="untrust"){
      assert.equal(client?.role,"owner");
      permitted.get(client.fp)?.delete(msg.fp);
      send({t:"trust-updated",fp:msg.fp,trusted:false});
    }else if(msg.t==="call"){
      assert.equal(client?.role,"caller");
      const owner=owners.get(target);
      if(!owner||!permitted.get(target)?.has(client.fp)){
        send({t:"error",code:"RECIPIENT_NOT_READY_OR_UNTRUSTED"});return;
      }
      assert.ok(/^[a-f0-9]{32}$/.test(msg.callId));
      assert.ok(["audio","video"].includes(msg.kind));
      pendingCalls.set(msg.callId,client);
      owner.ws.send(JSON.stringify({t:"incoming",from:client.fp,
        kind:msg.kind,callId:msg.callId,invite:msg.invite}));
    }else if(msg.t==="received"){
      assert.equal(client?.role,"owner");
      const sender=pendingCalls.get(msg.callId);
      assert.ok(sender);
      assert.equal(sender.fp,msg.from);
      sender.ws.send(JSON.stringify({t:"delivered-to-active-tab",callId:msg.callId}));
      pendingCalls.delete(msg.callId);
    }
  });
  setTimeout(()=>send({t:"challenge",nonce,target,opened,expires:opened+20000}),0);
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
  // Capture every WebSocket. Unknown external sockets are never forwarded.
  await context.routeWebSocket("**/*",socket=>{
    const u=socket.url();
    if(u.startsWith(service))return mockSocket(socket);
    if(u.startsWith(trustedInbox))return mockTrustedInbox(socket);
    throw Error("UNAUTHORIZED_WEBSOCKET_DESTINATION");
  });
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
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:12000});
  const first=await caller.evaluate(()=>window.__oneInvite);
  assert.match(first,/mode=audio#room=/);
  const callee=await createPhone("CONTACT_CALLEE");
  await callee.goto(first,{waitUntil:"domcontentloaded"});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0);
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  for(const [phone,friendName] of [[caller,"Second Phone"],[callee,"First Phone"]]){
    await phone.evaluate(()=>{
      document.querySelector(".ezero-unified-options").open=true;
      document.getElementById("ezeroPeopleHub").open=true;
    });
    await phone.locator("#ezeroFriendSavePanel").waitFor({state:"visible",timeout:15000});
    await phone.locator("#ezeroFriendSaveName").fill(friendName);
    await phone.locator("#ezeroSaveConnectedFriend").click();
    await phone.waitForFunction(()=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ).length===1,{timeout:10000});
  }
  // Saving the verified peer is durable browser data on BOTH devices, not
  // temporary call metadata. The selected label must survive route changes.
  const readSavedFriends=phone=>phone.evaluate(()=>({
    friends:JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]")
      .map(x=>({fp:x.fp,name:x.name})),
    chosen:document.getElementById("ezeroSelectedFriendName")?.textContent||"",
    list:document.getElementById("ezeroFriendSideList")?.textContent||"",
    people:document.getElementById("ezeroPeopleList")?.textContent||"",
    selection:sessionStorage.getItem("ezero_secure_connect_selected_friend_tab_v0_1")||""
  }));
  for(const [phone,name] of [[caller,"Second Phone"],[callee,"First Phone"]]){
    const state=await readSavedFriends(phone);
    assert.equal(state.friends.length,1);
    assert.equal(state.friends[0].name,name);
    assert.equal(state.chosen,name,"Saving a friend must show the name immediately");
    assert.ok(state.list.includes(name));
    assert.ok(state.people.includes(name));
    assert.equal(state.selection,state.friends[0].fp);
  }
  await caller.locator("#modernHangup").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000})));
  const callerFp=(await caller.locator("#myFingerprint").textContent()).trim();
  const calleeFp=(await callee.locator("#myFingerprint").textContent()).trim();
  assert.match(callerFp,/^[a-f0-9]{64}$/);
  assert.match(calleeFp,/^[a-f0-9]{64}$/);
  // Recipient explicitly enables foreground delivery and trusts the saved caller.
  await callee.locator("#ezeroTrustedEnable").click();
  await callee.waitForFunction(()=>document.getElementById("ezeroTrustedStatus")
    ?.textContent.includes("تیار"),{timeout:15000});
  const persistedCalleeFp=await callee.evaluate(async()=>
    (await window.EZERO_DEVICE_IDENTITY_STORE.read())?.fingerprint||"");
  console.log("SAFE_OWNER_DIAGNOSTIC",JSON.stringify({
    ownerCount:owners.size,
    ownerMatchesDisplay:owners.has(calleeFp),
    ownerMatchesPersisted:owners.has(persistedCalleeFp),
    persistedMatchesDisplay:persistedCalleeFp===calleeFp,
    ownerRolePresent:Array.from(owners.values()).some(x=>x.role==="owner"),
    status:await callee.locator("#ezeroTrustedStatus").textContent()
  }));
  assert.equal(owners.has(persistedCalleeFp),true,
    "Recipient owner inbox should authenticate consent-saved device identity");
  await callee.locator("#ezeroTrustedList .ezero-trusted-friend-row button").first().click();
  await callee.waitForFunction(()=>document.getElementById("ezeroTrustedStatus")
    ?.textContent.includes("محفوظ"),{timeout:15000});
  assert.equal(permitted.get(calleeFp)?.has(callerFp),true,
    "Explicit trust grant must reach the recipient inbox");
  const lastInvite=await caller.evaluate(()=>window.__oneInvite);
  const before=await caller.evaluate(()=>window.__mediaCalls.length);
  const receivedMediaBefore=await callee.evaluate(()=>window.__mediaCalls.length);
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
  await caller.locator("#ezeroContactVideo").click();
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,lastInvite,{timeout:30000});
  const videoInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
    "RED: saved-contact video must NOT reopen the QR panel when sending a direct call");
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isDisabled(),true,
    "RED: while direct delivery is pending, do not invite the user to manually copy a link");
  assert.match(videoInvite,/mode=video#room=/,
    "Saved contact's video button must create VIDEO not audio invitation");
  const callerMedia=await caller.evaluate(()=>window.__mediaCalls.at(-1));
  assert.ok(callerMedia?.video&&callerMedia?.audio,
    "Selected-contact video call must explicitly request camera AND mic");
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");
  console.log("SAVED_FRIEND_SELECTED_THEN_VIDEO_BUTTON_REQUESTS_REAL_CAMERA: PASS");
  // No manual callee.goto(), QR scan, share link, clipboard, or second invite.
  // The receiving phone must show a trusted incoming card on its OPEN page.
  const recipientUrlBefore=callee.url();
  await callee.locator("#ezeroTrustedIncoming").waitFor({state:"visible",timeout:15000});
  assert.equal(callee.url(),recipientUrlBefore,
    "Saved friend's call must arrive on the existing page without navigation");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),receivedMediaBefore,
    "Incoming display must not auto-activate camera or microphone");
  assert.match(await callee.locator("#ezeroTrustedIncoming").innerText(),/First Phone/);
  await caller.waitForFunction(()=>
    document.getElementById("ezeroTrustedStatus")?.textContent.includes("پہنچی"),
    {timeout:15000});
  assert.equal(pendingCalls.size,0,"Receipt only means visible, not accepted");
  console.log("SAVED_FRIEND_NO_QR_FOREGROUND_INCOMING_VISIBLE: PASS");
  await callee.locator("#ezeroTrustedIncoming button").first().click();
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
  // Repeat without rescanning QR or re-saving the friend. These are new real
  // browser WebRTC cycles using the same persisted identity and active inbox.
  for(let redial=1;redial<=2;redial++){
    const oldInvite=await caller.evaluate(()=>window.__oneInvite);
    const mediaBefore=await callee.evaluate(()=>window.__mediaCalls.length);
    await caller.locator("#ezeroContactVideo").click();
    await caller.waitForFunction(old=>!!window.__oneInvite&&window.__oneInvite!==old,
      oldInvite,{timeout:30000});
    assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
      "Repeat saved-friend video must never reopen a call QR");
    assert.equal(await caller.locator("#ezeroOneCopyInvite").isDisabled(),true);
    await callee.locator("#ezeroTrustedIncoming").waitFor({state:"visible",timeout:15000});
    assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),mediaBefore,
      "Repeat incoming must not capture media before the recipient accepts");
    await callee.locator("#ezeroTrustedIncoming button").first().click();
    await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
    await callee.locator("#ezeroAutoAccept").click();
    await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
      window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
    for(const phone of [caller,callee]){
      await phone.waitForFunction(()=>document.getElementById("remoteVideo")
        ?.srcObject?.getVideoTracks?.().some(t=>t.readyState==="live"),{timeout:12000});
    }
    await caller.locator("#hangup").click();
    await callee.waitForFunction(()=>{
      const s=document.getElementById("localVideo")?.srcObject;
      return !window.EZERO_VOICE_TRANSPORT?.connected()&&
        (!s||s.getTracks().every(t=>t.readyState==="ended"));
    },{timeout:15000});
    // Regression for real-phone report: after second and third calls, the
    // receiver's saved names must stay visible, not silently disappear.
    for(const [phone,name] of [[caller,"Second Phone"],[callee,"First Phone"]]){
      const state=await readSavedFriends(phone);
      assert.equal(state.friends.length,1,"Repeat calls must not erase any friend");
      assert.equal(state.friends[0].name,name);
      assert.equal(state.chosen,name,"Selected name must survive incoming navigation");
      assert.equal(state.selection,state.friends[0].fp);
      assert.ok(state.list.includes(name),"Friend sidebar must retain name");
      assert.ok(state.people.includes(name),"Friends panel must retain name");
    }
    console.log("SAVED_FRIEND_REPEAT_VIDEO_NO_QR_CYCLE_"+redial+": PASS");
    console.log("SAVED_FRIEND_BOTH_PHONES_NAMES_RETAINED_CYCLE_"+redial+": PASS");
  }
  // Revocation must FAIL closed but must NOT surprise saved contacts with QR.
  // The user may separately choose to add a new friend via a fresh QR.
  await callee.locator("#ezeroTrustedEnable").click();
  await callee.waitForFunction(()=>
    document.getElementById("ezeroTrustedStatus")?.textContent.includes("تیار"),
    {timeout:15000});
  await callee.locator("#ezeroTrustedList .ezero-trusted-friend-row button").nth(1).click();
  await callee.waitForFunction(()=>
    document.getElementById("ezeroTrustedStatus")?.textContent.includes("واپس"),
    {timeout:15000});
  assert.equal(permitted.get(calleeFp)?.has(callerFp),false,
    "Revoked trust must not be silently re-granted");
  const previousInvite=await caller.evaluate(()=>window.__oneInvite);
  await caller.locator("#ezeroContactVideo").click();
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,
    previousInvite,{timeout:30000});
  await caller.waitForFunction(()=>document.getElementById("ezeroOneScanStatus")
    ?.textContent.includes("براہِ راست کال نہیں پہنچ سکی"),{timeout:15000});
  assert.equal(await caller.locator("#ezeroOneQrBox").isHidden(),true,
    "Revoked trust may NOT automatically reopen QR for a saved friend");
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isDisabled(),true,
    "No automatic manual QR/link prompt after a direct-call failure");
  console.log("REVOKED_TRUST_FAILS_CLOSED_WITHOUT_FORCING_QR: PASS");
  // New QR remains accessible only through a separate EXPLICIT user choice.
  await caller.locator("#ezeroFriendListToggle").click();
  await caller.locator("#ezeroFriendNewQr").click();
  const explicitlyOldInvite=await caller.evaluate(()=>window.__oneInvite);
  await caller.locator('[data-modern-select="video"]').click();
  await caller.waitForFunction(old=>!!window.__oneInvite&&window.__oneInvite!==old,
    explicitlyOldInvite,{timeout:30000});
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true,
    "User-selected new contact QR must still work");
  assert.equal(await caller.locator("#ezeroOneQr svg").count(),1);
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  console.log("EXPLICIT_FRESH_QR_STILL_WORKS_WITH_SAVED_CONTACTS: PASS");
  // A fresh QR selection clears only the selected-person UI preference. The
  // saved friend must not be deleted even when the user onboards another one.
  const finalState=await readSavedFriends(caller);
  assert.equal(finalState.friends.length,1);
  assert.equal(finalState.friends[0].name,"Second Phone");
  assert.ok(finalState.list.includes("Second Phone"));
  console.log("EXPLICIT_NEW_QR_PRESERVES_ALL_SAVED_CONTACTS: PASS");
}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
