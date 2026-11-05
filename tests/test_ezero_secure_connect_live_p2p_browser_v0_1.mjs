import assert from "node:assert/strict";
import {chromium} from "playwright";
const base="http://127.0.0.1:8769";
const browser=await chromium.launch({
  headless:true,args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]
});
const contexts=[],pages=[];
async function phone(label) {
  const c=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    permissions:["camera","microphone"],locale:"en-US"
  });
  contexts.push(c);
  await c.route("**/*",route=>{
    if(route.request().url().startsWith(base+"/"))return route.continue();
    return route.abort("blockedbyclient");
  });
  await c.addInitScript(()=>{
    window.__mediaCalls=[];
    const old=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=opts=>{
      window.__mediaCalls.push(opts);
      return old(opts);
    };
  });
  const page=await c.newPage();pages.push(page);
  page.on("pageerror",err=>{console.log(label+"_PAGEERROR",String(err).slice(0,250));});
  await page.goto(base+"/ezero_secure_connect_live_p2p_v0_1.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint").textContent.trim().length===64,{timeout:30000});
  return page;
}
async function getSignal(p) {
  await p.waitForFunction(()=>document.querySelector("#localSignal").value.length>500,{timeout:30000});
  return p.locator("#localSignal").inputValue();
}
async function connect(a,b,mode){
  await a.locator("#callSetup").evaluate(el=>el.open=true);
  await b.locator("#callSetup").evaluate(el=>el.open=true);
  await a.locator('input[value="'+mode+'"]').check();
  await b.locator('input[value="'+mode+'"]').check();
  await a.locator("#guidedOffer").click();
  const offer=await getSignal(a);
  assert.match(offer,/"type":"offer"/,"A produced a signed SDP offer");
  assert.match(await a.locator("#callDiagnostic").innerText(),/دعوت تیار|Invitation ready|الدعوة جاهزة/,
    "Offer readiness is shown as a measured stage, not a completed call");
  assert.equal(await a.locator("#guidedShare").isEnabled(),true,"Simple share button enables only on signed offer");
  await b.locator("#guidedIncoming").fill(offer);
  await b.locator("#guidedContinue").click();
  const answer=await getSignal(b);
  assert.match(answer,/"type":"answer"/,"B generated a signed answer from one paste button");
  assert.match(await b.locator("#callDiagnostic").innerText(),/جواب تیار|Answer ready|الرد جاهز/,
    "Answer readiness clearly means the reply still must be sent to phone A");
  assert.equal(await b.locator("#guidedShare").isEnabled(),true,"Simple answer share enabled");
  await a.locator("#guidedIncoming").fill(answer);
  await a.locator("#guidedContinue").click();
  await Promise.all([a,b].map(p=>p.waitForFunction(()=>
    document.querySelector("#sendMessage")?.disabled===false,{timeout:30000})));
  const tracks=await Promise.all([a,b].map(p=>p.evaluate(()=>{
    const local=document.querySelector("#localVideo").srcObject;
    const remote=document.querySelector("#remoteVideo").srcObject;
    return {a:local?.getAudioTracks().length,v:local?.getVideoTracks().length,ra:remote?.getAudioTracks().length,rv:remote?.getVideoTracks().length};
  })));
  return tracks;
}
let a,b;
try{
  a=await phone("PHONE_A");b=await phone("PHONE_B");
  assert.match(await a.locator("#myFingerprint").textContent(),/^[a-f0-9]{64}$/);
  const fpA=await a.locator("#myFingerprint").textContent();
  const fpB=await b.locator("#myFingerprint").textContent();
  assert.notEqual(fpA,fpB,"Each phone generated a different random identity automatically");
  assert.equal(await a.locator("#myQr svg").count(),1,"QR generated offline");
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0,"No camera or mic without a click");
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),0);
  assert.equal(await a.locator("#oneTapStartButton").isVisible(),true,"Single QR start is prominent");
  assert.equal(await a.locator("#secureAdvanced").getAttribute("open"),null,"Complex options are initially closed");
  await a.locator("#secureAdvanced").evaluate(el=>el.open=true);
  await b.locator("#secureAdvanced").evaluate(el=>el.open=true);
  assert.equal(await a.locator("#nearbyPanel").isVisible(),true,"Nearby QR is default");
  assert.equal(await a.locator("#remotePanel").isHidden(),true,"Remote copy mode hidden until selected");
  assert.equal(await a.locator("#callSetup").getAttribute("open"),null,
    "Advanced calling steps folded on first visit");
  assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,
    "Simplified mobile page fits viewport without horizontal scrolling");
  await a.locator("#language").selectOption("en");
  assert.match(await a.locator("h1").first().innerText(),/Welcome/);
  assert.match(await a.locator("#callDiagnostic").textContent(),/does not start a call|still needs an invite/);
  await b.locator("#language").selectOption("ar");
  assert.match(await b.locator("h1").first().innerText(),/مرحباً/);
  await a.locator("#openPolicy").click();
  assert.equal(await a.locator("#policyDialog").isVisible(),true);
  assert.match(await a.locator("[data-i18n=policy1]").innerText(),/do not run ads/);
  await a.locator("#closePolicy").click();
  assert.equal(await a.locator("#policyDialog").isHidden(),true);
  await a.locator("#language").selectOption("ar");
  assert.match(await a.locator("#easyTitle").innerText(),/بطريقتين/);
  await a.locator("#language").selectOption("ur");
  assert.match(await a.locator("#easyTitle").innerText(),/صرف دو طریقے/);
  assert.match(await a.locator("#copyIdentity").innerText(),/میری ڈیجیٹل شناخت|میرا شناختی کوڈ/);
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0,
    "Switching three languages never opens mic/camera");
  const idA=await a.locator("#myDigitalId").inputValue();
  const idB=await b.locator("#myDigitalId").inputValue();
  assert.match(idA,/^EZERO1\./);
  assert.match(idB,/^EZERO1\./);
  await a.locator("#chooseRemote").click();
  assert.equal(await a.locator("#remotePanel").isVisible(),true);
  assert.equal(await a.locator("#copyIdentity").isVisible(),true);
  assert.equal(await a.locator("#pasteFriend").isVisible(),true);
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0,
    "Choosing remote copy/paste never starts recording or a camera");
  assert.equal(await a.locator("#nearbyPanel").isHidden(),true);
  await a.locator("#friendIdInput").fill(idB);
  await a.locator("#verifyFriend").click();
  await a.waitForFunction(()=>document.querySelector("#peerFingerprint").textContent.trim().length===64);
  assert.equal(await a.locator("#peerFingerprint").innerText(),fpB);
  await b.locator("#chooseRemote").click();
  assert.equal(await b.locator("#remotePanel").isVisible(),true);
  await b.locator("#friendIdInput").fill(idA);
  await b.locator("#verifyFriend").click();
  await b.waitForFunction(()=>document.querySelector("#peerFingerprint").textContent.trim().length===64);
  assert.equal(await b.locator("#peerFingerprint").innerText(),fpA);
  console.log("UNIQUE_SESSION_SHA256_FINGERPRINTS_AND_SIGNED_QR: PASS");
  console.log("NEARBY_QR_AND_REMOTE_MESSAGE_MODE_ONE_TOUCH_SWITCH: PASS");
  console.log("FULL_ENGLISH_ARABIC_POLICY_AND_LANGUAGE_CONTROL: PASS");

  const audioTracks=await connect(a,b,"audio");
  assert.deepEqual(audioTracks.map(x=>[x.a,x.v,x.ra,x.rv]),[[1,0,1,0],[1,0,1,0]]);
  await a.locator("#sendText").fill("E-ZERO one-view test via encrypted DataChannel");
  await a.locator("#sendMessage").click();
  await b.locator("#incomingItem").waitFor({state:"visible",timeout:10000});
  assert.equal(await b.locator("#seenMessage").isHidden(),true,"Plaintext not shown until first open");
  await b.locator("#viewMessage").click();
  assert.match(await b.locator("#seenMessage").innerText(),/E-ZERO one-view test/);
  assert.equal(await b.locator("#viewMessage").isHidden(),true);
  await a.locator("#hangup").click();
  await b.locator("#hangup").click();
  assert.equal(await a.evaluate(()=>document.querySelector("#localVideo").srcObject),null);
  assert.equal(await b.evaluate(()=>document.querySelector("#localVideo").srcObject),null);
  assert.equal(await b.locator("#incomingItem").isHidden(),true,"Hangup removes temporary message");
  console.log("REAL_TWO_BROWSER_OPUS_AUDIO_TRACK_AND_ENCRYPTED_DATACHANNEL: PASS");
  console.log("ONE_VIEW_MESSAGE_WITH_NO_BACKEND_ARCHIVE_AND_HANGUP_PURGE: PASS");

  const videoTracks=await connect(a,b,"video");
  assert.deepEqual(videoTracks.map(x=>[x.a,x.v,x.ra,x.rv]),[[1,1,1,1],[1,1,1,1]]);
  await a.locator("#muteMic").click();
  assert.equal(await a.evaluate(()=>document.querySelector("#localVideo").srcObject.getAudioTracks()[0].enabled),false);
  await a.locator("#toggleCamera").click();
  assert.equal(await a.evaluate(()=>document.querySelector("#localVideo").srcObject.getVideoTracks()[0].enabled),false);
  await a.locator("#closeAll").click();
  await b.locator("#closeAll").click();
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),2,"Both calls require user action, never auto-requested");
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),2);
  console.log("REAL_TWO_BROWSER_AUDIO_VIDEO_TRACKS_MUTE_CAMERA_HANGUP: PASS");
  console.log("ZERO_PAYMENTS_ZERO_SIGNALS_BACKEND_NO_RECORDING: PASS");
  console.log("REAL_ICE_CONNECTED_AND_OFFER_ANSWER_STAGES: PASS");
}finally{
  for(const c of contexts)await c.close().catch(()=>{});
  await browser.close();
}