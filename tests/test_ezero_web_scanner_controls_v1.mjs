import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({headless:true,args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]});
let context;
try {
  context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,permissions:["camera"]});
  const page = await context.newPage();
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.EZERO_QR));
  for(const id of ["qrScannerOverlay","qrScannerVideo","qrScannerControls","switchQrCamera","toggleQrTorch","stopQrScanner","chooseGalleryQr","qrGalleryFile"])
    assert.equal(await page.locator("#"+id).count(),1,"control exists: "+id);
  assert.equal(await page.locator("#qrScannerOverlay").isHidden(),true,"camera must not start on page load");
  await page.evaluate(()=>{
    document.querySelector("#scanFriendQr").disabled=false;
    document.querySelector("#requestCameraPermission").disabled=false;
    const qrApi=window.EZERO_QR;
    window.EZERO_QR=Object.freeze({...qrApi,startCamera:async(video)=>{
      const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      video.srcObject=stream;
      await video.play();
      const stop=()=>stream.getTracks().forEach(track=>track.stop());
      stop.cameraCount=async()=>2;
      stop.switchCamera=async()=>"Fake front camera";
      stop.torchSupported=()=>false;
      stop.toggleTorch=async()=>true;
      return stop;
    }});
  });
  await page.locator("#scanFriendQr").click();
  await page.waitForFunction(()=>!document.querySelector("#qrScannerOverlay").hidden);
  assert.equal(await page.locator("#qrScannerVideo").isVisible(),true);
  assert.equal(await page.locator("#toggleQrTorch").isDisabled(),true,"unsupported torch is disabled, not falsely advertised");
  const layout=await page.evaluate(()=>{
    const overlay=getComputedStyle(document.querySelector("#qrScannerOverlay"));
    const video=document.querySelector("#qrScannerVideo");
    return {position:overlay.position,height:video.getBoundingClientRect().height};
  });
  assert.equal(layout.position,"fixed","camera occupies a dedicated full-screen overlay");
  assert.ok(layout.height>=300,"camera preview is large on a phone-sized viewport");
  await page.locator("#switchQrCamera").click();
  await page.waitForFunction(()=>document.querySelector("#qrScanStatus").textContent.includes("Camera switched"));
  await page.locator("#stopQrScanner").click();
  await page.waitForFunction(()=>document.querySelector("#qrScannerOverlay").hidden);
  assert.equal(await page.locator("#qrScannerVideo").evaluate(el=>el.srcObject),null);
  assert.deepEqual(errors,[]);
  console.log("MOBILE_FULLSCREEN_QR_SCANNER_USER_GESTURE_AND_CAMERA_STOP_PASS");
  console.log("EXPLICIT_CAMERA_SWITCH_AND_TORCH_CAPABILITY_GATING_PASS");
  console.log("GALLERY_IMPORT_CONTROL_PRESENT_AND_SEPARATE_PASS");
} finally {
  if(context) await context.close();
  await browser.close();
}
