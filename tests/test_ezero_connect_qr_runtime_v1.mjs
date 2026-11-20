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
  assert.deepEqual(errors, []);
  console.log("EZERO_QR_GENERATE_GALLERY_DECODE_ROUNDTRIP_PASS");
} finally {
  await browser.close();
}
