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
    const svg = window.EZERO_QR.encodeSvg(payload);
    const file = new File([svg], "ezero-invite.svg", { type: "image/svg+xml" });
    const decoded = await window.EZERO_QR.decodeImageFile(file);
    return {
      svgStartsCorrectly: svg.startsWith("<svg"),
      svgHasViewBox: /viewBox=/.test(svg),
      decoded,
      qrApi: Object.keys(window.EZERO_QR).sort()
    };
  });
  assert.equal(result.svgStartsCorrectly, true);
  assert.equal(result.svgHasViewBox, true);
  assert.equal(result.decoded, "EZERO1." + "A".repeat(420));
  assert.deepEqual(result.qrApi, ["decodeImageFile", "encodeSvg", "startCamera"]);
  assert.deepEqual(errors, []);
  console.log("EZERO_QR_GENERATE_GALLERY_DECODE_ROUNDTRIP_PASS");
} finally {
  await browser.close();
}
