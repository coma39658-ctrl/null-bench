/* E-ZERO repeat-gallery safety regression, isolated local browser only.
 * No real contacts, WebSocket calls, credentials, or deployments.
 */
import assert from "node:assert/strict";
import {chromium} from "playwright";

const localBase="http://127.0.0.1:8769/";
const testOrigin="https://ezero-secure-app-two-phone-test-20261107.onrender.com/";
const callPage="ezero_trusted_friends_staging_20261106.html";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
try {
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  await context.route("**/*", async route=>{
    const url=route.request().url();
    if(!url.startsWith(testOrigin))return route.abort("blockedbyclient");
    const u=new URL(url);
    const path=u.pathname.slice(1);
    if(path.includes(".."))return route.abort("blockedbyclient");
    const response=await context.request.get(localBase+path+u.search);
    return route.fulfill({response});
  });
  await context.addInitScript(()=>{
    window.__galleryChanges=0;
    window.__galleryMediaRequests=0;
    document.addEventListener("change",e=>{
      if(e.target?.id==="ezeroOneImageScanInput")window.__galleryChanges++;
    },true);
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=(...args)=>{
      window.__galleryMediaRequests++;
      return original(...args);
    };
  });
  const page=await context.newPage();
  let sockets=0;
  page.on("websocket",()=>{sockets++;});
  await page.goto(testOrigin+callPage,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>
    typeof window.qrcode==="function" && typeof window.jsQR==="function" &&
    !!document.getElementById("ezeroOneImageScanInput"),undefined,{timeout:15000});

  async function qrImage(text){
    const base64=await page.evaluate(async value=>{
      const qr=window.qrcode(0,"M");
      qr.addData(value);qr.make();
      const svg=qr.createSvgTag(8,24);
      const img=new Image();
      await new Promise((resolve,reject)=>{
        img.onload=resolve;img.onerror=()=>reject(Error("SVG_RENDER_FAILED"));
        img.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg);
      });
      const canvas=document.createElement("canvas");
      canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
      const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("CANVAS_UNAVAILABLE");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.drawImage(img,0,0);
      return canvas.toDataURL("image/png").split(",")[1];
    },text);
    return Buffer.from(base64,"base64");
  }

  const identityOnly=await qrImage("EZERO1.INVALID-GALLERY-TEST");
  const wrongOrigin=await qrImage("https://untrusted.example/ezero_trusted_friends_staging_20261106.html?mode=video#room="+
    "a".repeat(32)+"."+"b".repeat(43));

  async function uploadAndReject(buffer,count){
    await page.evaluate(()=>{
      document.getElementById("ezeroOneImageScanInput").dataset.scanPhase="";
    });
    await page.locator("#ezeroOneImageScanInput").setInputFiles({
      name:"test-qr.png",mimeType:"image/png",buffer
    });
    await page.waitForFunction(expected=>
      window.__galleryChanges===expected &&
      document.getElementById("ezeroOneImageScanInput")?.dataset.scanPhase==="found",
      count,{timeout:15000});
    assert.equal(await page.locator("#ezeroOneScanStatus").getAttribute("data-kind"),"error");
    assert.equal(await page.locator("#ezeroOneImageScanInput").inputValue(),"",
      "File picker must reset so the same screenshot can be selected again");
    assert.equal(await page.evaluate(()=>window.__galleryMediaRequests),0,
      "Gallery scanning must not open camera or microphone");
    assert.equal(sockets,0,"Invalid gallery QR must not create a WebSocket call");
    assert.equal(page.url(),testOrigin+callPage,
      "Invalid QR must not navigate or auto-accept a call");
  }
  await uploadAndReject(identityOnly,1);
  await uploadAndReject(identityOnly,2);
  console.log("GALLERY_SAME_SCREENSHOT_CAN_BE_SCANNED_TWICE: PASS");
  await uploadAndReject(wrongOrigin,3);
  console.log("GALLERY_FOREIGN_ORIGIN_FAILS_CLOSED: PASS");
  console.log("GALLERY_NO_AUTOCALL_NO_MEDIA_CAPTURE: PASS");
}finally{
  await browser.close();
}
