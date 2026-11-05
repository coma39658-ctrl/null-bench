import assert from "node:assert/strict";
import {chromium} from "playwright";
const browser=await chromium.launch({
  headless:true,args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]
});
const contexts=[];
const base="http://127.0.0.1:8769/_ezero_secure_connect_lab_fixture_v0_1.html";
async function phone() {
  const ctx=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    permissions:["camera","microphone"]
  });
  contexts.push(ctx);
  await ctx.route("**/*",route=>route.request().url().startsWith("http://127.0.0.1:8769/")?
    route.continue():route.abort("blockedbyclient"));
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.log("QR_CONTACT_PAGE_ERROR",String(e).slice(0,300)));
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#myFingerprint")?.textContent.length===64);
  return page;
}
async function insertQrMock(page,code) {
  await page.evaluate(value=>{
    window.BarcodeDetector=class {
      constructor({formats}){if(!formats.includes("qr_code"))throw Error("QR_UNSUPPORTED");}
      async detect(){return [{rawValue:value}];}
    };
  },code);
}
async function assertStatus(page,part){
  try{
    await page.waitForFunction(expected=>
      document.querySelector("#qrScanStatus")?.textContent.includes(expected),part,{timeout:10000});
  }catch(error){
    console.log("QR_EXPECTED",part);
    console.log("QR_OBSERVED",await page.locator("#qrScanStatus").innerText(),
      "IDENTITY",await page.locator("#identityPeerStatus").innerText());
    throw error;
  }
}
let a,b;
try{
  a=await phone();b=await phone();
  const myId=await a.locator("#myDigitalId").inputValue();
  const idB=await b.locator("#myDigitalId").inputValue();
  const fpB=await b.locator("#myFingerprint").textContent();
  assert.equal(await a.locator("#friendsList .friend-entry").count(),0);
  assert.equal(await a.locator("#saveVerifiedFriend").isDisabled(),true);
  assert.equal(await a.locator("#oneTapStartButton").isVisible(),true);
  assert.equal(await a.locator("#scanQR").isVisible(),false,"Manual scan stays under More options");
  await a.locator("#secureAdvanced").evaluate(el=>el.open=true);
  await b.locator("#secureAdvanced").evaluate(el=>el.open=true);
  assert.equal(await a.locator("#scanQR").isVisible(),true);
  assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  await a.locator("#language").selectOption("en");
  assert.match(await a.locator("#contactsTitle").innerText(),/My friends/);
  assert.match(await a.locator("#friendsStatus").innerText(),/No friends/);
  await a.locator("#language").selectOption("ar");
  assert.match(await a.locator("#contactsTitle").innerText(),/أصدقائي/);
  await a.locator("#language").selectOption("ur");
  assert.match(await a.locator("#contactsTitle").innerText(),/میرے دوست/);

  await a.locator("#chooseRemote").click();
  await a.locator("#friendIdInput").fill("invalid-data");
  await a.locator("#verifyFriend").click();
  assert.match(await a.locator("#identityPeerStatus").innerText(),/کوڈ درست نہیں/);
  assert.equal(await a.locator("#saveVerifiedFriend").isDisabled(),true);
  await a.locator("#friendIdInput").fill(myId);
  await a.locator("#verifyFriend").click();
  assert.match(await a.locator("#identityPeerStatus").innerText(),/اپنے فون/);
  assert.equal(await a.locator("#saveVerifiedFriend").isDisabled(),true);
  await a.locator("#friendIdInput").fill(fpB);
  await a.locator("#verifyFriend").click();
  assert.match(await a.locator("#identityPeerStatus").innerText(),/دستخط تصدیق نہیں ہوا/);
  assert.equal(await a.locator("#saveVerifiedFriend").isDisabled(),true);
  assert.equal(await a.locator("#friendsList .friend-entry").count(),0);
  console.log("BAD_SELF_AND_UNSIGNED_QR_NEVER_CREATE_VERIFIED_CONTACT: PASS");

  await a.locator("#friendIdInput").fill(idB);
  await a.locator("#verifyFriend").click();
  assert.match(await a.locator("#identityPeerStatus").innerText(),/دستخط شدہ شناخت درست/);
  await a.locator("#friendDisplayName").fill("Ali Test");
  assert.equal(await a.locator("#saveVerifiedFriend").isEnabled(),true);
  await a.locator("#saveVerifiedFriend").click();
  assert.match(await a.locator("#friendsStatus").innerText(),/محفوظ ہوگیا/);
  assert.equal(await a.locator("#friendsList .friend-entry").count(),1);
  assert.equal(await a.locator(".friend-name").innerText(),"Ali Test");
  assert.equal(await a.locator(".friend-fingerprint").innerText(),fpB);
  assert.equal(await a.locator(".friend-letter").innerText(),"A");
  const stored=await a.evaluate(()=>localStorage.getItem("ezero_secure_connect_local_fingerprints_v0_1"));
  assert.equal(JSON.parse(stored).length,1);
  assert.deepEqual(Object.keys(JSON.parse(stored)[0]).sort(),["fp","name"],"Contacts store name and public fingerprint only");
  assert.ok(!stored.includes("EZERO1.")&&!stored.includes('"sdp"')&&!stored.includes('"sig"'));
  await a.locator("#friendSearch").fill("unknown");
  assert.equal(await a.locator("#friendsList .friend-entry").count(),0);
  assert.match(await a.locator(".friends-placeholder").innerText(),/نہیں ملا/);
  await a.locator("#friendSearch").fill("Ali");
  assert.equal(await a.locator("#friendsList .friend-entry").count(),1);
  await a.locator("#friendSearch").fill("");
  await a.reload();
  await a.waitForFunction(()=>document.querySelector("#myFingerprint")?.textContent.length===64);
  await a.locator("#secureAdvanced").evaluate(el=>el.open=true);
  assert.equal(await a.locator(".friend-name").innerText(),"Ali Test","Opt-in local-only name persists on this device");
  assert.equal(await a.locator(".friend-fingerprint").innerText(),fpB);
  assert.equal(await a.locator("#saveVerifiedFriend").isDisabled(),true,"New session cannot treat stored fingerprint as a signed verified QR");
  console.log("NAMED_SHA256_LOCAL_CONTACT_SEARCH_AVATAR_RELOAD_NO_AUTO_TRUST: PASS");

  await a.locator("#friendsList .friend-remove").click();
  assert.equal(await a.locator("#friendsList .friend-entry").count(),0);
  assert.equal(JSON.parse(await a.evaluate(()=>
    localStorage.getItem("ezero_secure_connect_local_fingerprints_v0_1"))).length,0);
  console.log("CONTACT_DELETE_NO_SERVER_AND_NO_ARCHIVE: PASS");

  await a.locator("#chooseNearby").click();
  await insertQrMock(a,"https://example.org/not-ezero");
  await a.locator("#scanQR").click();
  await assertStatus(a,"E-ZERO کا شناختی کوڈ نہیں");
  assert.equal(await a.locator("#stopScan").isDisabled(),true);
  await insertQrMock(a,idB.replace(/^EZERO1\./,"WRONG1."));
  await a.locator("#scanQR").click();
  await assertStatus(a,"E-ZERO کا شناختی کوڈ نہیں");
  // Expiration follows the identical signed-ID validator for scans and pasted codes.
  // Paste the expired token to avoid opening the fake camera 4 consecutive times.
  const expiredParts=idB.split(".");
  expiredParts[4]=String(Date.now()-9000);
  await a.locator("#chooseRemote").click();
  await a.locator("#friendIdInput").fill(expiredParts.join("."));
  await a.locator("#verifyFriend").click();
  assert.match(await a.locator("#identityPeerStatus").innerText(),/مدت ختم/);
  assert.equal(await a.locator("#saveVerifiedFriend").isDisabled(),true);
  await a.locator("#chooseNearby").click();
  console.log("WRONG_QR_AND_EXPIRED_QR_REASONS_VISIBLE: PASS");

  await insertQrMock(a,idB);
  await a.locator("#scanQR").click();
  await assertStatus(a,"QR کامیابی سے اسکین");
  assert.equal(await a.locator("#qrScanStatus").getAttribute("data-kind"),"success");
  assert.equal(await a.locator("#peerFingerprint").innerText(),fpB);
  await a.locator("#friendDisplayName").fill("QR Verified Friend");
  assert.equal(await a.locator("#saveVerifiedFriend").isEnabled(),true);
  await a.locator("#saveVerifiedFriend").click();
  assert.equal(await a.locator("#friendsList .friend-entry").count(),1);
  console.log("SUCCESSFUL_SIGNED_QR_SCAN_HAS_VISIBLE_SUCCESS_AND_OPT_IN_ADD: PASS");

  await a.evaluate(()=>{
    window.BarcodeDetector=class {constructor(){} async detect(){return [];}};
    navigator.mediaDevices.getUserMedia=()=>Promise.reject(new DOMException("Denied","NotAllowedError"));
  });
  await a.locator("#scanQR").click();
  await assertStatus(a,"کیمرے کی اجازت نہیں");
  assert.equal(await a.locator("#stopScan").isDisabled(),true);
  console.log("CAMERA_PERMISSION_DENIED_SHOWS_CLEAR_COPY_PASTE_FALLBACK: PASS");
}finally{
  for(const ctx of contexts) await ctx.close().catch(()=>{});
  await browser.close();
}