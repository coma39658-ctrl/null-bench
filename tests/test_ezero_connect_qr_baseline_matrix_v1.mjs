import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const OUT = path.resolve("artifacts/ezero-qr-baseline");
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageErrors = [];
page.on("pageerror", e => pageErrors.push(e.message));
await page.goto("http://127.0.0.1:8769/ezero-connect-app.html", { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => window.EZERO_QR && typeof window.EZERO_QR.decodeImageFile === "function");
const payload = "EZERO1.BASELINE." + "A".repeat(420);
const fixtures = await page.evaluate(async (payload) => {
  const api = window.EZERO_QR;
  const qrUrl = api.encodeDataUrl(payload);
  const source = new Image();
  source.src = qrUrl;
  await source.decode();

  const png = async (draw, name) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400; canvas.height = 1400;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    draw(ctx, canvas);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return { name, type: blob.type, data: Array.from(bytes) };
  };
  const clean = await png((ctx, c) => {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    const side = 700;
    ctx.drawImage(source, (c.width-side)/2, (c.height-side)/2, side, side);
  }, "clean.png");
  const blurred = [];
  for (const [name, radius] of [["blurry-light.png", 0.7], ["blurry-medium.png", 1.5], ["blurry-heavy.png", 3.0]]) {
    blurred.push(await png((ctx, c) => {
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
      ctx.filter = `blur(${radius}px)`;
      const side = 700;
      ctx.drawImage(source, (c.width-side)/2, (c.height-side)/2, side, side);
      ctx.filter = "none";
    }, name));
  }
  const largeCanvas = document.createElement("canvas");
  largeCanvas.width = 2500; largeCanvas.height = 2500;
  const largeContext = largeCanvas.getContext("2d", { willReadFrequently: true });
  const largePixels = largeContext.createImageData(largeCanvas.width, largeCanvas.height);
  let largeSeed = 0x12345678;
  for (let i = 0; i < largePixels.data.length; i += 4) {
    largeSeed = (1664525 * largeSeed + 1013904223) >>> 0;
    const v = largeSeed >>> 24;
    largePixels.data[i] = v; largePixels.data[i+1] = v; largePixels.data[i+2] = v; largePixels.data[i+3] = 255;
  }
  largeContext.putImageData(largePixels, 0, 0);
  const largeSide = 700;
  largeContext.fillStyle = "#fff";
  largeContext.fillRect((largeCanvas.width-largeSide)/2-12, (largeCanvas.height-largeSide)/2-12, largeSide+24, largeSide+24);
  largeContext.drawImage(source, (largeCanvas.width-largeSide)/2, (largeCanvas.height-largeSide)/2, largeSide, largeSide);
  const largeBlob = await new Promise(resolve => largeCanvas.toBlob(resolve, "image/png"));
  const large = { name: "large.png", type: largeBlob.type, data: Array.from(new Uint8Array(await largeBlob.arrayBuffer())) };
  const noQr = await png((ctx, c) => {
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = i % 2 ? "#222" : "#ddd";
      ctx.fillRect((i*97)%c.width, (i*193)%c.height, 35, 35);
    }
  }, "no_qr.png");
  return [clean, ...blurred, large, noQr];
}, payload);

for (const fixture of fixtures) fs.writeFileSync(path.join(OUT, fixture.name), Buffer.from(fixture.data));
const report = { baseline: "PRE_CHANGE_QR_RUNTIME", payloadLength: payload.length, cases: [] };
for (const fixture of fixtures) {
  const filePath = path.join(OUT, fixture.name);
  const bytes = fs.readFileSync(filePath);
  const result = await page.evaluate(async ({ name, bytes }) => {
    const started = performance.now();
    try {
      const file = new File([new Uint8Array(bytes)], name, { type: "image/png" });
      const decoded = await window.EZERO_QR.decodeImageFile(file);
      return { result: decoded === undefined || decoded === null ? "NO_DECODE" : (decoded === "EZERO1.BASELINE." + "A".repeat(420) ? "PASS_EXPECTED_PAYLOAD" : "DECODED_DIFFERENT_PAYLOAD"), error: null, decodeMs: Math.round(performance.now()-started) };
    } catch (error) {
      return { result: "ERROR", error: String(error?.message || error), decodeMs: Math.round(performance.now()-started) };
    }
  }, { name: fixture.name, bytes: Array.from(bytes) });
  report.cases.push({ name: fixture.name, fileSizeBytes: bytes.length, ...result });
}
report.encodeCases = [];
for (const length of [8192, 8193]) {
  const result = await page.evaluate(length => {
    try {
      window.EZERO_QR.encodeDataUrl("A".repeat(length));
      return { result: "ENCODED", error: null };
    } catch (error) {
      return { result: "ERROR", error: String(error?.message || error) };
    }
  }, length);
  report.encodeCases.push({ inputLength: length, ...result });
}
report.pageErrors = pageErrors;
fs.writeFileSync(path.join(OUT, "baseline-report.json"), JSON.stringify(report, null, 2) + "\n");
console.log("EZERO_QR_PRE_CHANGE_BASELINE");
console.log(JSON.stringify(report, null, 2));
await browser.close();
assert.equal(pageErrors.length, 0, "Browser page errors occurred during baseline fixture generation");
