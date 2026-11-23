import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
  await page.waitForFunction(() => Boolean(window.EZERO_QR));
  const result = await page.evaluate(async () => {
    const payload = "EZERO1." + "A".repeat(420);
    const dataUrl = window.EZERO_QR.encodeDataUrl(payload);
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 512, 512);
    const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const file = new File([png], "ezero-invite.png", { type: "image/png" });
    const decoded = await window.EZERO_QR.decodeImageFile(file);
    return {
      dataUrlIsLocalGif: dataUrl.startsWith("data:image/gif;base64,"),
      decoded,
      qrApi: Object.keys(window.EZERO_QR).sort()
    };
  });
  assert.equal(result.dataUrlIsLocalGif, true);
  assert.equal(result.decoded, "EZERO1." + "A".repeat(420));
  assert.deepEqual(result.qrApi, ["decodeImageFile", "encodeDataUrl", "startCamera"]);
  const cameraDecoded = await page.evaluate(async () => {
    const payload = "EZERO1." + "A".repeat(420);
    const image = new Image();
    image.src = window.EZERO_QR.encodeDataUrl(payload);
    await image.decode();
    const source = document.createElement("canvas");
    source.width = 512; source.height = 512;
    const sourceContext = source.getContext("2d");
    let animation = 0;
    const pump = () => {
      sourceContext.drawImage(image,0,0,512,512);
      animation = requestAnimationFrame(pump);
    };
    document.body.append(source);
    pump();
    const stream = source.captureStream(30);
    const media = navigator.mediaDevices;
    const original = media.getUserMedia.bind(media);
    Object.defineProperty(media,"getUserMedia",{configurable:true,value:async()=>stream});
    const video = document.createElement("video");
    video.muted = true; video.playsInline = true;
    video.style.width = "512px"; video.style.height = "512px";
    document.body.append(video);
    let stop = null;
    try {
      let resolveDecoded;
      const decodedPromise = new Promise(resolve=>{resolveDecoded=resolve;});
      stop = await window.EZERO_QR.startCamera(video,resolveDecoded);
      await video.play();
      await new Promise((resolve,reject)=>{
        if(video.readyState>=2&&video.videoWidth>0&&video.currentTime>0)return resolve();
        const timeout=setTimeout(()=>reject(new Error("CAMERA_VIDEO_NOT_READY")),5000);
        const ready=()=>{if(video.readyState>=2&&video.videoWidth>0&&video.currentTime>0){clearTimeout(timeout);resolve();}};
        video.addEventListener("loadeddata",ready);
        video.addEventListener("timeupdate",ready);
      });
      return await Promise.race([
        decodedPromise,
        new Promise((_,reject)=>setTimeout(()=>reject(new Error("CAMERA_QR_TIMEOUT")),12000))
      ]);
    } finally {
      stop?.();
      cancelAnimationFrame(animation);
      for(const track of stream.getTracks())track.stop();
      video.pause();video.srcObject=null;video.remove();source.remove();
      Object.defineProperty(media,"getUserMedia",{configurable:true,value:original});
    }
  });
  assert.equal(cameraDecoded,"EZERO1."+"A".repeat(420));
  assert.deepEqual(errors, []);
  console.log("EZERO_QR_GENERATE_GALLERY_AND_CAMERA_STREAM_DECODE_ROUNDTRIP_PASS");
} finally {
  await browser.close();
}
