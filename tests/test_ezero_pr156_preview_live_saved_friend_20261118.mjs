import assert from "node:assert/strict";
import {chromium} from "playwright";

const origin="https://ezero-save-friend-pr156-preview-v2.onrender.com";
const pageUrl=origin+"/ezero_trusted_friends_staging_20261106.html";
const friendsKey="ezero_secure_connect_staging_fingerprints_v0_1";
const browser=await chromium.launch({headless:true,args:[
  "--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"
]});
const contexts=[];
let caller=null,callee=null,callerFingerprint="",calleeFingerprint="";
const profilePhoto=Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGUlEQVR4nGPkrzBhIAUwkaR6VMOohiGlAQBvQwDbVY2zjwAAAABJRU5ErkJggg==",
  "base64"
);
async function createPhone(label){
  const context=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    permissions:["camera","microphone"]
  });
  contexts.push(context);
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
  page.on("pageerror",e=>console.error(label+"_PAGE_ERROR",e.message));
  await page.goto(pageUrl,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64,
    undefined,{timeout:20000});
  return page;
}
async function completeProfile(page,name){
  assert.equal(await page.locator("#ezeroProfileMissingReminder").isVisible(),true);
  await page.locator("#ezeroProfileFirstOpen").click();
  await page.locator("#ezeroMyName").fill(name);
  await page.locator("#ezeroMyPhoto").setInputFiles({
    name:"ci-profile.png",mimeType:"image/png",buffer:profilePhoto
  });
  await page.waitForFunction(()=>document.getElementById("ezeroMyAvatar")?.hidden===false,
    undefined,{timeout:15000});
  await page.locator("#ezeroShareProfile").check();
  await page.locator("#ezeroSaveProfile").click();
  await page.waitForFunction(()=>document.getElementById("ezeroProfileFirstStatus")?.dataset.state==="ready",
    undefined,{timeout:15000});
  assert.equal(await page.locator("#ezeroProfileMissingReminder").isHidden(),true);
}
async function waitDisconnected(){
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:20000})));
}
async function openRecipientInbox(){
  await callee.evaluate(()=>{
    window.__inboxOnline=false;
    window.__trustEvents=[];
    window.EZERO_TRUSTED_FRIEND_LAB.on("inbox-online",()=>{window.__inboxOnline=true;});
    window.EZERO_TRUSTED_FRIEND_LAB.on("trust-updated",e=>
      window.__trustEvents.push(e.detail));
  });
  await callee.locator("#ezeroTrustedEnable").click();
  await callee.waitForFunction(()=>window.__inboxOnline===true||
    document.getElementById("ezeroTrustedStatus")?.textContent.includes("کال وصول کرنے کے لیے تیار"),
    undefined,{timeout:30000});
}
async function acceptDeliveredInvite(kind){
  await callee.locator("#ezeroTrustedIncoming").waitFor({state:"visible",timeout:35000});
  await caller.waitForFunction(()=>
    document.getElementById("ezeroTrustedStatus")?.textContent.includes("دعوت پہنچی"),
    undefined,{timeout:15000});
  assert.equal(await callee.locator("#ezeroAutoIncoming").isVisible(),false,
    "Trusted Inbox must not auto-answer or start media");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),false,
    "A saved-friend call must not show a new QR");
  await callee.locator("#ezeroTrustedIncoming button").filter({hasText:"دعوت کھولیں"}).click();
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:15000});
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
    "Reviewing the inbox invitation must not activate camera or microphone");
  assert.match(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    kind==="audio"?/آنے والی آڈیو کال/:/آنے والی ویڈیو کال/);
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:60000})));
}
try{
  caller=await createPhone("CALLER");
  assert.equal(await caller.locator("#ezeroContactFirstDock").isVisible(),true);
  assert.equal(await caller.locator(".ezero-simple-home").isVisible(),true,
    "The compact messenger home must be the visible entry point");
  const homeActions=await caller.locator(".ezero-simple-home [data-ezero-home]")
    .evaluateAll(nodes=>nodes.map(node=>node.dataset.ezeroHome).sort());
  assert.deepEqual(homeActions,["add","chat","friends","more","voice"],
    "Home must not duplicate call or QR controls");
  assert.equal(await caller.locator("#ezeroContactAudio").isVisible(),true,
    "Audio call belongs beside the selected saved friend");
  assert.equal(await caller.locator("#ezeroContactVideo").isVisible(),true,
    "Video call belongs beside the selected saved friend");
  await caller.locator('.ezero-simple-home [data-ezero-home="add"]').click();
  assert.equal(await caller.locator("#ezeroAutoPilot").isVisible(),true,
    "Add Friend must reveal the QR invitation generator");
  assert.equal(await caller.locator("#ezeroCreatePermanentQr").isVisible(),true,
    "Add Friend must expose the permanent identity setup before scanning");
  assert.equal(await caller.locator("#ezeroOneScanInvite").isVisible(),false,
    "The temporary call-invite scanner must not be presented as the permanent identity QR");
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),0);
  console.log("PR156_SIMPLE_HOME_SINGLE_CALL_CONTROLS_AND_TWO_SIDED_QR_ENTRY: PASS");
  await caller.locator('[data-modern-select="audio"]').click();
  assert.equal(await caller.evaluate(()=>window.__oneInvite),"",
    "No invite or media before the first-time profile is complete");
  await completeProfile(caller,"First Phone");
  await caller.waitForFunction(()=>document.getElementById("ezeroPermanentQr")?.querySelector("svg"),
    undefined,{timeout:20000});
  assert.equal(await caller.locator("#ezeroScanPermanentFriendQr").isVisible(),true,
    "After the device identity is consent-saved, Add Friend exposes the permanent QR camera scanner");
  await caller.locator('[data-modern-select="audio"]').click();
  await caller.waitForFunction(()=>!!window.__oneInvite,undefined,{timeout:30000});
  const firstInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(firstInvite,/mode=audio#room=/);

  callee=await createPhone("CALLEE");
  await callee.goto(firstInvite,{waitUntil:"domcontentloaded"});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:20000});
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0);
  await completeProfile(callee,"Second Phone");
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(p=>p.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:60000})));
  for(const [phone,name] of [[caller,"Second Phone"],[callee,"First Phone"]]){
    await phone.waitForFunction(friendName=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ).some(row=>row.profileName===friendName&&row.nickname===false),name,{timeout:25000});
    const records=await phone.evaluate(()=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"));
    assert.equal(records.length,1);
    assert.equal(records[0].name,name);
  }
  callerFingerprint=await caller.locator("#myFingerprint").innerText();
  calleeFingerprint=await callee.locator("#myFingerprint").innerText();
  assert.notEqual(callerFingerprint,calleeFingerprint);
  console.log("PR156_FIRST_QR_PAIRING_AND_MUTUAL_LOCAL_SAVE: PASS");
  await caller.locator("#hangup").click();
  await waitDisconnected();

  // Permanent device QR regression: both users must explicitly scan and save
  // the other's reusable EZERO2 identity. This runs before direct saved-friend calls.
  const callerPermanent=await caller.evaluate(async()=>
    (await window.EZERO_PERMANENT_IDENTITY_QR.createAfterConsent()).token);
  const calleePermanent=await callee.evaluate(async()=>
    (await window.EZERO_PERMANENT_IDENTITY_QR.createAfterConsent()).token);
  assert.match(callerPermanent,/^EZERO2\./);
  assert.match(calleePermanent,/^EZERO2\./);
  assert.notEqual(callerPermanent.split(".")[2],calleePermanent.split(".")[2]);
  await Promise.all([caller,callee].map(p=>p.locator("#ezeroPermanentQr svg")
    .waitFor({state:"visible",timeout:15000})));
  const callerPermanentImage=await caller.locator("#ezeroPermanentQr svg").screenshot();
  async function scanPermanentCamera(receiver,token,name){
    const before=await receiver.evaluate(()=>window.__mediaCalls.length);
    await receiver.evaluate(token=>{
      window.BarcodeDetector=class {
        async detect(){return [{rawValue:token}];}
      };
    },token);
    await receiver.locator("#ezeroScanPermanentFriendQr").click();
    await receiver.locator("#ezeroPermanentFriendSaveForm").waitFor({
      state:"visible",timeout:20000
    });
    const cameraState=await receiver.evaluate(()=>({
      mediaCalls:window.__mediaCalls.length,
      cameraHidden:document.getElementById("ezeroPermanentFriendQrCamera")?.hidden,
      stopHidden:document.getElementById("ezeroStopPermanentFriendQrCamera")?.hidden,
      streamCleared:document.getElementById("ezeroPermanentFriendQrCamera")?.srcObject===null
    }));
    assert.equal(cameraState.mediaCalls,before+1,
      "The permanent camera must request media only after the scan button is tapped");
    assert.equal(cameraState.cameraHidden,true,
      "Camera preview must close after a QR is decoded");
    assert.equal(cameraState.stopHidden,true);
    assert.equal(cameraState.streamCleared,true,
      "Camera stream must be stopped and detached after successful scan");
    await receiver.locator("#ezeroPermanentFriendName").fill(name);
    await receiver.locator("#ezeroSavePermanentFriend").click();
    await receiver.waitForFunction(()=>
      document.getElementById("ezeroPermanentQrStatus")?.textContent.includes("اجازت"),
      undefined,{timeout:30000});
  }
  async function scanPermanentGallery(receiver,image,name){
    await receiver.locator("#ezeroGalleryPermanentFriendQr").click();
    await receiver.locator("#ezeroPermanentQrCard input[type=file]").setInputFiles({
      name:"friend-permanent-identity.png",mimeType:"image/png",buffer:image
    });
    await receiver.locator("#ezeroPermanentFriendSaveForm").waitFor({
      state:"visible",timeout:20000
    });
    await receiver.locator("#ezeroPermanentFriendName").fill(name);
    await receiver.locator("#ezeroSavePermanentFriend").click();
    await receiver.waitForFunction(()=>
      document.getElementById("ezeroPermanentQrStatus")?.textContent.includes("اجازت"),
      undefined,{timeout:30000});
  }
  await scanPermanentCamera(caller,calleePermanent,"Second Phone");
  await scanPermanentGallery(callee,callerPermanentImage,"First Phone");
  const callerPermanentFp=callerPermanent.split(".")[2];
  const calleePermanentFp=calleePermanent.split(".")[2];
  for(const [phone,fp,name] of [
    [caller,calleePermanentFp,"Second Phone"],
    [callee,callerPermanentFp,"First Phone"]
  ]){
    const contact=await phone.evaluate(fp=>JSON.parse(
      localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"
    ).find(row=>row.fp===fp),fp);
    assert.ok(contact,"Each device must save the other permanent fingerprint");
    assert.equal(contact.identityVersion,2);
    assert.equal(contact.name,name);
    assert.equal(contact.profileName,name,
      "Permanent QR save must preserve the already verified remote profile");
    assert.equal(contact.nickname,false,
      "Saving a permanent QR must not silently replace a verified profile with a nickname");
  }
  console.log("PR156_PERMANENT_QR_CAMERA_GALLERY_MUTUAL_SAVE_PROFILE_PRESERVED: PASS");


  await openRecipientInbox();
  await callee.locator("#ezeroTrustedList .ezero-trusted-friend-row button")
    .filter({hasText:"اجازت دیں"}).click();
  await callee.waitForFunction(fp=>window.__trustEvents.some(e=>
    e.fp===fp&&e.trusted===true),callerFingerprint,{timeout:20000});
  console.log("PR156_REAL_TRUSTED_INBOX_OWNER_AND_EXPLICIT_FRIEND_TRUST: PASS");

  await caller.locator("#ezeroFriendListToggle").click();
  await caller.locator("#ezeroFriendSideList .ezero-friend-option")
    .filter({hasText:"Second Phone"}).click();
  assert.equal(await caller.locator("#ezeroSelectedFriendName").innerText(),"Second Phone");

  let previous=await caller.evaluate(()=>window.__oneInvite);
  await caller.locator("#ezeroContactAudio").click();
  await caller.waitForFunction(old=>!!window.__oneInvite&&window.__oneInvite!==old,
    previous,{timeout:30000});
  const audioInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(audioInvite,/mode=audio#room=/);
  const audioRequest=await caller.evaluate(()=>window.__mediaCalls.at(-1));
  assert.ok(audioRequest?.audio&&!audioRequest?.video,
    "Saved-friend audio must request microphone without camera");
  await acceptDeliveredInvite("audio");
  for(const phone of [caller,callee]){
    const request=await phone.evaluate(()=>window.__mediaCalls.at(-1));
    assert.ok(request?.audio&&!request?.video);
  }
  console.log("PR156_SAVED_FRIEND_DIRECT_AUDIO_REAL_INBOX_ACCEPT_AND_WEBRTC: PASS");
  await caller.locator("#hangup").click();
  await waitDisconnected();

  // The inbox intentionally rate-limits repeated calls from one friend for 30 seconds.
  await new Promise(resolve=>setTimeout(resolve,31000));
  await openRecipientInbox();

  previous=await caller.evaluate(()=>window.__oneInvite);
  await caller.locator("#ezeroContactVideo").click();
  await caller.waitForFunction(old=>!!window.__oneInvite&&window.__oneInvite!==old,
    previous,{timeout:30000});
  const videoInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(videoInvite,/mode=video#room=/);
  const videoRequest=await caller.evaluate(()=>window.__mediaCalls.at(-1));
  assert.ok(videoRequest?.audio&&videoRequest?.video,
    "Saved-friend video must request both microphone and camera");
  await acceptDeliveredInvite("video");
  for(const phone of [caller,callee]){
    await phone.waitForFunction(()=>document.body.classList.contains("ezero-video-connected")&&
      document.getElementById("remoteVideo")?.srcObject?.getVideoTracks?.()
        .some(track=>track.readyState==="live")===true,{timeout:20000});
    const tracks=await phone.evaluate(()=>({
      local:document.getElementById("localVideo").srcObject?.getVideoTracks()
        .filter(track=>track.readyState==="live").length||0,
      remote:document.getElementById("remoteVideo").srcObject?.getVideoTracks()
        .filter(track=>track.readyState==="live").length||0
    }));
    assert.equal(tracks.local,1);
    assert.equal(tracks.remote,1);
  }
  console.log("PR156_SAVED_FRIEND_DIRECT_VIDEO_REAL_INBOX_ACCEPT_AND_LIVE_TRACKS: PASS");
  await caller.locator("#hangup").click();
  await waitDisconnected();

  // Explicitly revoke the synthetic caller from the recipient's staging inbox.
  await openRecipientInbox();
  await callee.locator("#ezeroTrustedList .ezero-trusted-friend-row button")
    .filter({hasText:"اجازت ہٹائیں"}).click();
  await callee.waitForFunction(fp=>window.__trustEvents.some(e=>
    e.fp===fp&&e.trusted===false),callerFingerprint,{timeout:20000});
  console.log("PR156_SYNTHETIC_TRUST_REVOKED_AFTER_TEST: PASS");
}catch(error){
  console.error("PR156_LIVE_SAVED_FRIEND_ASSERTION_FAILED",error?.stack||String(error));
  throw error;
}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
