import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8769/";
const pagePath="ezero_trusted_friends_staging_20261106.html";
const service="wss://ezero-browser-signaling-pilot.coma39658.workers.dev/v1/rooms/";
const publicOrigin="https://coma39658-ctrl.github.io/null-bench/";
const trustedWss="wss://ezero-trusted-friends-inbox-staging.coma39658.workers.dev";
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
  // Serve the isolated, NOT publicly hosted staging branch over an HTTPS
  // GitHub Pages ORIGIN alias. Assets are fetched only from a local CI server.
  // This preserves the exact browser Origin that the deployed Cloudflare
  // staging Durable Object authenticates while keeping the PR unmerged.
  await context.route(publicOrigin+"**",async route=>{
    const address=new URL(route.request().url());
    const relative=address.pathname.slice("/null-bench/".length);
    const response=await context.request.get(base+relative+address.search);
    // This is the actual candidate preview HTML/CSP/config on the PR branch;
    // no runtime overrides hide missing Cloudflare permissions or bad assets.
    return route.fulfill({response});
  });
  await context.addInitScript(()=>{
    window.__mediaCalls=[];
    window.__oneInvite="";
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
  // One click initiates offer; the share URL is short and has an ephemeral capability.
  await caller.locator('[data-modern-select="audio"]').click();
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:30000});
  const invite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(invite,/\/ezero_trusted_friends_staging_20261106\.html\?mode=audio#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/);
  assert.ok(invite.length<190,"One-request URL should not contain an entire SDP");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"false",
    "Call pending is not a connected state");
  console.log("SINGLE_CLICK_CREATES_COMPACT_QR_INVITE_NO_FAKE_CONNECTION: PASS");

  const callee=await createPhone("CALLEE");
  // The experimental QR points directly back to this same-identity stage.
  await callee.goto(invite,{waitUntil:"domcontentloaded"});
  await callee.waitForURL(new RegExp("ezero_trusted_friends_staging_20261106.html"),{timeout:10000});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible"});
  assert.equal(await callee.locator("#ezeroOneIncomingShell").isVisible(),true,
    "Opening a call QR must directly expose the incoming-accept card");
  assert.equal(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    "📞 آنے والی آڈیو کال — قبول کریں؟");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
    "Opening a friend request must NOT activate camera or microphone");
  assert.equal(await callee.locator("#ezeroAutoAccept").isVisible(),true);
  assert.equal(await callee.locator("#ezeroAutoDecline").isVisible(),true);
  // Only recipient approval. No second link, pasted code or caller approval.
  await callee.locator("#ezeroAutoAccept").click();
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
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"true");
  console.log("ONE_REQUEST_ONE_ACCEPT_AUTOMATIC_SIGNED_ANSWER_REAL_BROWSER_WEBRTC: PASS");
  console.log("NO_SECOND_MANUAL_LINK_NO_AUTO_MIC_BEFORE_ACCEPT: PASS");

  const persistentFingerprint=await Promise.all([caller,callee].map(
    phone=>phone.locator("#myFingerprint").innerText()));
  assert.notEqual(persistentFingerprint[0],persistentFingerprint[1],
    "Two phones must never share one device identity");
  for(const [phone,friendName] of [[caller,"Phone 2"],[callee,"Phone 1"]]){
    await phone.locator("#ezeroPeopleHub").evaluate(el=>el.open=true);
    await phone.locator("#ezeroFriendSavePanel").waitFor({state:"visible",timeout:15000});
    await phone.locator("#ezeroFriendSaveName").fill(friendName);
    await phone.locator("#ezeroSaveConnectedFriend").click();
    await phone.waitForFunction(()=>
      JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]").length===1,
      {timeout:10000});
    const record=await phone.evaluate(async()=>{
      const key=await window.EZERO_DEVICE_IDENTITY_STORE.read();
      return {fingerprint:key?.fingerprint,
        extractable:key?.keys?.privateKey?.extractable};
    });
    assert.equal(record.extractable,false);
    assert.equal(record.fingerprint,await phone.locator("#myFingerprint").innerText());
  }
  console.log("BOTH_PHONES_EXPLICIT_SAVE_FRIEND_AND_NONEXTRACTABLE_IDENTITY: PASS");


  // A verified first call must not strand the caller without the next QR.
  // Neither phone reloads before the caller starts another new room.
  await caller.locator("#modernHangup").click();
  await callee.locator("#modernHangup").click();
  await caller.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000});
  await caller.locator('[data-modern-select="audio"]').click();
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,invite,{timeout:30000});
  const newInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.notEqual(newInvite,invite,"Every new call must have a fresh invite");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await caller.locator("#ezeroOneQr svg").count(),1,
    "The second call must actually render its QR, not merely show a success label");
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  await callee.goto(newInvite,{waitUntil:"domcontentloaded"});
  await callee.waitForURL(new RegExp("ezero_trusted_friends_staging_20261106.html"),{timeout:10000});
  await callee.locator("#ezeroAutoAccept").waitFor({state:"visible"});
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  assert.equal(offers,2,"Redial must create a new signed offer");
  assert.equal(answers,2,"Redial must receive another automatically relayed answer");
  console.log("HANGUP_AND_REDIAL_CREATES_NEW_QR_WITHOUT_CALLER_RELOAD: PASS");

  await caller.locator("#modernHangup").click();
  await callee.locator("#modernHangup").click();
  await Promise.all([caller,callee].map(p=>
    p.goto(publicOrigin+pagePath,{waitUntil:"domcontentloaded"})));
  for(const [i,phone] of [[0,caller],[1,callee]]){
    await phone.waitForFunction(expected=>
      document.getElementById("myFingerprint")?.textContent===expected,
      persistentFingerprint[i],{timeout:12000});
    assert.equal(await phone.evaluate(()=>
      JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]").length),1);
  }
  console.log("BOTH_PHONES_PERSIST_SAVED_IDENTITY_AND_FRIENDS_ON_REOPEN: PASS");
  for(const phone of [caller,callee]){
    const proof=await phone.evaluate(async()=>({
      publicContacts:localStorage.getItem("ezero_secure_connect_local_fingerprints_v0_1"),
      publicProfile:localStorage.getItem("ezero_secure_connect_local_profile_v0_1"),
      publicCallHistory:localStorage.getItem("ezero_local_completed_call_history_v0_1"),
      stagingContacts:localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1"),
      databases:(await indexedDB.databases()).map(item=>item.name)
    }));
    assert.equal(proof.publicContacts,null,"Preview must not modify public saved friends");
    assert.equal(proof.publicProfile,null,"Preview must not modify public profile");
    assert.equal(proof.publicCallHistory,null,"Preview must not modify public call history");
    assert.ok(proof.stagingContacts,"Preview must save only staged friend contacts");
    assert.ok(proof.databases.includes("ezero_secure_connect_device_identity_staging_v0_1"),
      "Staging key must live in dedicated IndexedDB database");
    assert.ok(!proof.databases.includes("ezero_secure_connect_device_identity_v0_1"),
      "Preview must not create production device identity database");
  }
  console.log("STAGING_STORAGE_ISOLATED_FROM_PUBLIC_FRIENDS_PROFILE_HISTORY_AND_IDENTITY: PASS");

  // The first and second QR calls above used local mocked signaling.
  // Now test actual live Cloudflare Trusted Inbox with the two real browser
  // device keys explicitly saved after the first verified WebRTC connection.
  for(const phone of [caller,callee]){
    await phone.waitForFunction(()=>
      window.EZERO_TRUSTED_FRIEND_LAB?.enabled()===true,
      {timeout:15000});
    assert.equal(await phone.locator("#ezeroTrustedFriendsLab").isVisible(),true);
    await phone.evaluate(()=>{
      window.__inboxTestTrustEvents=[];
      window.EZERO_TRUSTED_FRIEND_LAB.on("trust-updated",e=>
        window.__inboxTestTrustEvents.push(e.detail));
    });
    await phone.locator("#ezeroTrustedEnable").click();
    await phone.waitForFunction(()=>
      document.getElementById("ezeroTrustedStatus")?.textContent.includes("تیار ہے"),
      {timeout:30000});
  }
  console.log("REAL_CLOUDFLARE_STAGING_FOREGROUND_INBOX_TWO_SIGNED_DEVICES: PASS");
  try{
    for(const [owner,otherFp] of [[caller,persistentFingerprint[1]],
      [callee,persistentFingerprint[0]]]){
      await owner.locator("#ezeroTrustedList .ezero-trusted-friend-row button")
        .filter({hasText:"اجازت دیں"}).click();
      await owner.waitForFunction(fp=>
        window.__inboxTestTrustEvents.some(e=>e.fp===fp&&e.trusted===true),
        otherFp,{timeout:20000});
    }
    console.log("REAL_CLOUDFLARE_MUTUAL_OPT_IN_TRUST_ACK: PASS");

    await caller.locator("#ezeroTrustedList .ezero-trusted-friend-row button")
      .filter({hasText:"📞 کال"}).click();
    // The QR is generated internally for signalling but never scanned
    // by the recipient. It is delivered by the authenticated inbox.
    await callee.locator("#ezeroTrustedIncoming").waitFor({state:"visible",
      timeout:35000});
    await caller.waitForFunction(()=>
      document.getElementById("ezeroTrustedStatus")?.textContent.includes("دعوت پہنچی"),
      {timeout:12000});
    assert.equal(await callee.locator("#ezeroAutoIncoming").isVisible(),false,
      "An unaccepted inbox invite must not auto-start media");
    console.log("REAL_CLOUDFLARE_INBOX_DELIVERY_BROWSER_VISIBLE_ACK_NO_QR_SCAN: PASS");

    // Revoke synthetic test identities on the staging worker before
    // navigating away; the invitation is already delivered/acknowledged.
    for(const [owner,otherFp] of [[caller,persistentFingerprint[1]],
      [callee,persistentFingerprint[0]]]){
      await owner.locator("#ezeroTrustedList .ezero-trusted-friend-row button")
        .filter({hasText:"اجازت ہٹائیں"}).click();
      await owner.waitForFunction(fp=>
        window.__inboxTestTrustEvents.some(e=>e.fp===fp&&e.trusted===false),
        otherFp,{timeout:15000});
    }
    console.log("REAL_CLOUDFLARE_STAGING_SYNTHETIC_TRUST_REVOKED: PASS");
    await callee.locator("#ezeroTrustedIncoming button")
      .filter({hasText:"دعوت کھولیں"}).click();
    await callee.locator("#ezeroAutoAccept").waitFor({state:"visible",
      timeout:15000});
    assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
      "Trusted invitation review must not activate camera/mic");
    await callee.locator("#ezeroAutoAccept").click();
    await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
      window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
    assert.equal(offers,3,"One more fresh signed offer after inbox call");
    assert.equal(answers,3,"One signed answer on the fresh inbox call");
    console.log("REAL_INBOX_REDIAL_ONE_RECIPIENT_ACCEPT_REAL_CHROMIUM_WEBRTC: PASS");

    // Voice-note export is forbidden by default unless the sender explicitly
    // opts in on the private encrypted DataChannel. The real call is connected.
    assert.equal(await caller.locator("#ezeroVoiceAllowDownload").isChecked(),false);
    assert.equal(await callee.evaluate(()=>
      window.EZERO_SIGNED_MEDIA_EVIDENCE.list().length),0);
    const sample=Buffer.from("E-ZERO-SYNTHETIC-VOICE-NOTE-FOR-CI");
    for(const allowed of [false,true]){
      const sent=await caller.evaluate(({encoded,allowed})=>
        window.EZERO_VOICE_TRANSPORT.send("audio/webm",encoded,allowed),
        {encoded:sample.toString("base64"),allowed});
      assert.equal(sent,true);
      await callee.waitForTimeout(120);
      const count=await callee.evaluate(()=>
        window.EZERO_SIGNED_MEDIA_EVIDENCE.list().length);
      assert.equal(count,allowed?1:0,
        "Without explicit sender export opt-in a voice message must not become downloadable");
    }
    const receivedProof=await callee.evaluate(async()=>{
      const api=window.EZERO_SIGNED_MEDIA_EVIDENCE;
      const file=await api.packageEvidence(api.list()[0].id);
      const raw=new Uint8Array(await file.archive.arrayBuffer());
      const view=new DataView(raw.buffer),dec=new TextDecoder();
      let offset=0,record=null,media=null;
      while(offset+30<=raw.length&&view.getUint32(offset,true)===0x04034b50){
        const size=view.getUint32(offset+18,true);
        const n=view.getUint16(offset+26,true),extra=view.getUint16(offset+28,true);
        const name=dec.decode(raw.slice(offset+30,offset+30+n));
        const start=offset+30+n+extra;
        if(name==="evidence.json")record=JSON.parse(dec.decode(raw.slice(start,start+size)));
        if(name==="media.webm")media=raw.slice(start,start+size);
        offset=start+size;
      }
      return {valid:await api.verify(media,record),
        source:record?.payload.capture.source,
        consent:record?.payload.capture.consent,
        sha256:file.sha256};
    });
    assert.equal(receivedProof.valid,true);
    assert.equal(receivedProof.source,"PEER_WEBRTC_VOICE_NOTE_OPT_IN");
    assert.equal(receivedProof.consent,"SENDER_EXPORT_ALLOWED_P2P_UNATTESTED");
    assert.match(receivedProof.sha256,/^[0-9a-f]{64}$/);
    console.log("VOICE_NOTE_EXPORT_DEFAULT_DENY_EXPLICIT_SENDER_OPT_IN_SIGNED_ZIP: PASS");

    // Both users must explicitly authorize recording. There is no
    // recording on initial connection or on a one-sided request.
    assert.equal(await caller.evaluate(()=>
      window.EZERO_SIGNED_MEDIA_EVIDENCE.list().length),0);
    assert.equal(await caller.locator("#ezeroEvidenceRecBadge").isHidden(),true);
    await caller.locator("#ezeroEvidenceAsk").click();
    await callee.locator("#ezeroEvidenceIncoming").waitFor({state:"visible",
      timeout:10000});
    assert.equal(await caller.locator("#ezeroEvidenceStart").isHidden(),true);
    await callee.locator("#ezeroEvidenceDeny").click();
    await caller.waitForFunction(()=>
      document.getElementById("ezeroEvidenceStatus")?.textContent.includes("اجازت نہیں ملی"),
      {timeout:10000});
    assert.equal(await caller.locator("#ezeroEvidenceRecBadge").isHidden(),true);
    assert.equal(await caller.evaluate(()=>
      window.EZERO_SIGNED_MEDIA_EVIDENCE.list().length),0);
    console.log("RECORDING_WITHOUT_TWO_PERSON_CONSENT_NEVER_STARTS: PASS");

    await caller.locator("#ezeroEvidenceAsk").click();
    await callee.locator("#ezeroEvidenceIncoming").waitFor({state:"visible",
      timeout:10000});
    await callee.locator("#ezeroEvidenceApprove").click();
    await caller.locator("#ezeroEvidenceStart").waitFor({state:"visible",
      timeout:10000});
    await caller.locator("#ezeroEvidenceStart").click();
    await caller.locator("#ezeroEvidenceRecBadge").waitFor({state:"visible",
      timeout:15000});
    await callee.locator("#ezeroEvidenceRecBadge").waitFor({state:"visible",
      timeout:10000});
    await caller.waitForTimeout(1400);
    // A recipient can revoke consent at any time; stops the local recorder.
    await callee.locator("#ezeroEvidenceRevoke").click();
    await caller.locator("#ezeroEvidenceRecBadge").waitFor({state:"hidden",
      timeout:15000});
    await caller.waitForFunction(()=>
      window.EZERO_SIGNED_MEDIA_EVIDENCE.list().length===1,
      {timeout:15000});
    console.log("MUTUAL_CONSENT_VISIBLE_REC_AND_RECIPIENT_REVOCATION: PASS");
    const signedProof=await caller.evaluate(async()=>{
      const api=window.EZERO_SIGNED_MEDIA_EVIDENCE;
      const id=api.list()[0].id;
      const file=await api.packageEvidence(id);
      const bytes=new Uint8Array(await file.archive.arrayBuffer());
      const view=new DataView(bytes.buffer);
      const files={};
      let pos=0;
      while(pos+30<=bytes.length&&view.getUint32(pos,true)===0x04034b50){
        const n=view.getUint16(pos+26,true);
        const extra=view.getUint16(pos+28,true);
        const size=view.getUint32(pos+18,true);
        const name=new TextDecoder().decode(bytes.slice(pos+30,pos+30+n));
        const dataStart=pos+30+n+extra;
        files[name]=bytes.slice(dataStart,dataStart+size);
        pos=dataStart+size;
      }
      const json=JSON.parse(new TextDecoder().decode(files["evidence.json"]));
      const media=files[json.payload.media.filename];
      const valid=await api.verify(media,json);
      const corrupted=media.slice();corrupted[0]^=1;
      const invalid=await api.verify(corrupted,json);
      return {valid,invalid,sha256:file.sha256,
        signerFingerprint:file.signerFingerprint,
        signerClass:json.payload.signerClass,
        consent:json.payload.capture.consent,
        source:json.payload.capture.source,
        clockTrust:json.payload.export.clockTrust,
        thirdPartyTimestamp:json.payload.export.thirdPartyTimestamp};
    });
    assert.equal(signedProof.valid,true);
    assert.equal(signedProof.invalid,false);
    assert.equal(signedProof.signerFingerprint,persistentFingerprint[0]);
    assert.equal(signedProof.signerClass,"CONSENT_SAVED_DEVICE_IDENTITY");
    assert.equal(signedProof.consent,"LOCAL_AND_PEER_UI_APPROVAL_REPORTED");
    assert.equal(signedProof.source,"LOCAL_CONSENTED_WEBRTC_CAPTURE");
    assert.equal(signedProof.clockTrust,"UNVERIFIED");
    assert.equal(signedProof.thirdPartyTimestamp,false);
    assert.match(signedProof.sha256,/^[a-f0-9]{64}$/);
    const [download]=await Promise.all([
      caller.waitForEvent("download",{timeout:20000}),
      caller.locator("#ezeroEvidenceList button").click()
    ]);
    assert.match(download.suggestedFilename(),/^E-ZERO-call_audio-[a-f0-9]{16}\.zip$/);
    console.log("SIGNED_AUDIO_EVIDENCE_ZIP_SHA256_ECDSA_TAMPER_DETECTION: PASS");

    // Local buffer cannot be exported after 10 minutes, even if suspended
    // browser timers did not wake to remove its list entry.
    const expired=await caller.evaluate(async()=>{
      const original=Date.now;
      try{
        const edge=window.EZERO_SIGNED_MEDIA_EVIDENCE.list()[0].expiresAt+1;
        Date.now=()=>edge;
        await window.EZERO_SIGNED_MEDIA_EVIDENCE.packageEvidence(
          window.EZERO_SIGNED_MEDIA_EVIDENCE.list()[0].id);
        return false;
      }catch(error){return String(error).includes("EVIDENCE_EXPIRED");}
      finally{Date.now=original;}
    });
    assert.equal(expired,true);
    console.log("EVIDENCE_LOCAL_MEMORY_EXPIRES_AFTER_TEN_MINUTES: PASS");

    await caller.locator("#modernHangup").click();
    await callee.locator("#modernHangup").click();
  }finally{
    // Best-effort cleanup if the test aborts after granting synthetic trust.
    // This is not used to claim cleanup; confirmed trust-updated above is.
    for(const [owner,otherFp] of [[caller,persistentFingerprint[1]],
      [callee,persistentFingerprint[0]]]){
      try{
        if(!owner.isClosed()){
          await owner.evaluate(async fp=>{
            const api=window.EZERO_TRUSTED_FRIEND_LAB;
            if(api?.enabled()){
              await api.openOwnerInbox();
              await api.setFriendTrust(fp,false);
            }
          },otherFp);
        }
      }catch(_){}
    }
  }

}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
