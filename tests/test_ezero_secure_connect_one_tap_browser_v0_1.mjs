import assert from "node:assert/strict";
import {chromium} from "playwright";

const browser=await chromium.launch({
  headless:true,args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]
});
const contexts=[];
const base="http://127.0.0.1:8769/ezero_secure_connect_live_p2p_v0_1.html";
async function phone(label){
  const context=await browser.newContext({viewport:{width:393,height:852},
    isMobile:true,hasTouch:true,permissions:["camera","microphone"]});
  contexts.push(context);
  await context.route("**/*",route=>route.request().url().startsWith("http://127.0.0.1:8769/")?
    route.continue():route.abort("blockedbyclient"));
  await context.addInitScript(()=>{
    window.__qrCameraRequests=[];
    const request=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=opts=>{
      window.__qrCameraRequests.push({audio:opts.audio,video:opts.video});
      return request(opts);
    };
  });
  const page=await context.newPage();
  page.on("pageerror",e=>console.log(label+"_PAGEERROR",String(e)));
  await page.goto(base,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.querySelector("#myDigitalId")?.value.startsWith("EZERO1."));
  return page;
}
try{
  const a=await phone("QUICK_A"),b=await phone("QUICK_B");
  const signedB=await b.locator("#myDigitalId").inputValue();
  const fpB=await b.locator("#myFingerprint").innerText();
  assert.equal(await a.locator("#oneTapStartButton").isVisible(),true);
  assert.equal(await a.locator("#oneTapStage").isHidden(),true);
  assert.equal(await a.locator("#secureAdvanced").getAttribute("open"),null);
  assert.equal(await a.locator("#scanQR").isVisible(),false);
  assert.equal(await a.evaluate(()=>window.__qrCameraRequests.length),0,
    "No camera or mic is requested on loading the page");
  assert.equal(await a.locator("#oneTapQr svg").count(),1,
    "Existing ephemeral signed offline QR is mirrored");
  await a.locator("#language").selectOption("en");
  assert.match(await a.locator("#oneTapStartButton").innerText(),/Start QR/);
  await a.locator("#language").selectOption("ar");
  assert.match(await a.locator("#oneTapStartButton").innerText(),/بدء/);
  await a.locator("#language").selectOption("ur");
  assert.match(await a.locator("#oneTapStartButton").innerText(),/شروع/);
  assert.equal(await a.evaluate(()=>window.__qrCameraRequests.length),0);

  await a.evaluate(value=>{
    window.BarcodeDetector=class{
      constructor({formats}){if(!formats.includes("qr_code"))throw Error("BAD_FORMAT");}
      async detect(){return [{rawValue:value}];}
    };
  },signedB);
  await a.locator("#oneTapStartButton").click();
  await a.waitForFunction(()=>document.querySelector("#oneTapCall").hidden===false,{timeout:15000});
  assert.equal(await a.locator("#oneTapStage").isVisible(),true);
  assert.equal(await a.locator("#oneTapResult").getAttribute("data-kind"),"success");
  assert.match(await a.locator("#oneTapResult").innerText(),/دستخط شدہ QR/);
  assert.equal(await a.locator("#peerFingerprint").innerText(),fpB);
  assert.equal(await a.evaluate(()=>window.__qrCameraRequests.length),1,
    "QR camera is requested only after pressing one-tap start");
  assert.equal(await a.evaluate(()=>window.__qrCameraRequests[0].audio),false,
    "QR scanning must never open microphone");
  assert.equal(await a.locator("#localSignal").inputValue(),"",
    "Scanning a QR is not a WebRTC offer");
  assert.equal(await a.locator("#connectionStatus").textContent().then(x=>/Connected|منسلک|متصل/.test(x)),false,
    "QR validation must not be mistaken for a connected call");
  assert.equal(await a.locator("#secureAdvanced").getAttribute("open"),null);
  await a.locator("#oneTapCall").click();
  assert.equal(await a.locator("#secureAdvanced").getAttribute("open"),"",
    "Call options are opened only by an explicit subsequent action");
  assert.equal(await a.locator("#callSetup").getAttribute("open"),"");
  assert.equal(await a.locator("#localSignal").inputValue(),"");
  console.log("ONE_TAP_SIGNED_QR_WITH_PERMISSION_NO_FALSE_CALL: PASS");

  const bad=await phone("QUICK_BAD");
  await bad.evaluate(()=>{
    window.BarcodeDetector=class{
      async detect(){return [{rawValue:"https://wrong.example/qr"}];}
    };
  });
  await bad.locator("#oneTapStartButton").click();
  await bad.waitForFunction(()=>document.querySelector("#oneTapResult")?.dataset.kind==="error",{timeout:15000});
  assert.equal(await bad.locator("#oneTapCall").isHidden(),true);
  assert.equal(await bad.locator("#saveVerifiedFriend").isDisabled(),true);
  console.log("WRONG_QR_NEVER_UNLOCKS_CALL_OPTIONS_OR_FRIEND_SAVE: PASS");

  const denied=await phone("QUICK_DENIED");
  await denied.evaluate(()=>{
    window.BarcodeDetector=class{async detect(){return [];}};
    navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied","NotAllowedError");};
  });
  await denied.locator("#oneTapStartButton").click();
  await denied.waitForFunction(()=>document.querySelector("#oneTapResult")?.dataset.kind==="error",{timeout:15000});
  assert.match(await denied.locator("#oneTapResult").innerText(),/اجازت|کیمرہ/);
  assert.equal(await denied.locator("#oneTapCall").isHidden(),true);
  console.log("CAMERA_DENIAL_IS_SAFE_AND_VISIBLE: PASS");
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
