import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const html = await readFile("ezero-connect-app.html", "utf8");
const landing = await readFile("ezero-connect.html", "utf8");
assert.match(landing, /href="\.\/ezero-connect-app\.html"/);
assert.doesNotMatch(landing, /ezero_trusted_friends_staging_20261106\.html/);
const js = await readFile("js/ezero_connect_app_v1.js", "utf8");
const identityJs = await readFile("js/ezero_connect_identity_v1.js", "utf8");
const inviteJs = await readFile("js/ezero_connect_invite_v1.js", "utf8");
const trustJs = await readFile("js/ezero_connect_trust_v1.js", "utf8");
assert.match(html, /E-ZERO Connect/);
assert.match(html, /js\/ezero_connect_app_v1\.js/);
assert.doesNotMatch(html, /ezero_trusted_friends_staging|ezero_saved_friend_stage|ezero_saved_friend_stage_engine/);
assert.doesNotMatch(js, /getUserMedia|RTCPeerConnection|WebSocket|localStorage|indexedDB/);
assert.ok(html.includes("js/ezero_connect_identity_v1.js"));
assert.ok(html.includes("js/ezero_qr_runtime_v1.js"));
assert.ok(html.includes("js/ezero_connect_invite_v1.js"));
assert.ok(html.includes("js/ezero_connect_trust_v1.js"));
assert.ok(!["localStorage","sessionStorage","fetch(","WebSocket"].some(token => trustJs.includes(token)));
assert.ok(!["fetch(","WebSocket","localStorage","sessionStorage"].some(token => inviteJs.includes(token)));
assert.ok(!["localStorage","sessionStorage","fetch(","WebSocket","RTCPeerConnection","getUserMedia"].some(token => identityJs.includes(token)));
assert.match(identityJs, /extractable !== false/);
assert.match(identityJs, /EXPLICIT_CONSENT_REQUIRED/);
assert.doesNotMatch(html, /احمد|سارہ|محمد|فاطمہ|sample profile/i);
assert.match(html, /id="audioCall"[^>]*disabled/);
assert.match(html, /id="videoCall"[^>]*disabled/);

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__ezeroMediaRequestCount = 0;
    const media = navigator.mediaDevices;
    if (media && media.getUserMedia) {
      const original = media.getUserMedia.bind(media);
      media.getUserMedia = (...args) => { window.__ezeroMediaRequestCount++; return original(...args); };
    }
  });
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
  await page.waitForSelector("#emptyState");
  assert.equal(await page.locator("#audioCall").isDisabled(), true);
  assert.equal(await page.locator("#videoCall").isDisabled(), true);
  assert.match(await page.locator("#emptyTitle").innerText(), /کوئی دوست محفوظ نہیں/);

  await page.locator("#addFriend").click();
  assert.equal(await page.locator("#dialogBackdrop").evaluate(el => el.classList.contains("open")), true);
  await page.locator("#closeDialog").click();
  assert.equal(await page.locator("#dialogBackdrop").evaluate(el => el.classList.contains("open")), false);

  await page.locator("#language").click();
  assert.equal(await page.locator("html").getAttribute("lang"), "en");
  assert.match(await page.locator("#emptyTitle").innerText(), /No saved friends/);
  await page.locator("#tabChats").click();
  assert.equal(await page.locator("#tabChats").getAttribute("aria-selected"), "true");
  await page.locator("#searchFriends").fill("unknown");
  assert.match(await page.locator("#emptyTitle").innerText(), /No saved friend matches/);

  assert.equal(await page.locator("#identityFingerprintWrap").isVisible(), false);
  const emptyIdentity = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ezero-connect-device-identity", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise((resolve, reject) => {
      const request = db.transaction("device-keys", "readonly").objectStore("device-keys").get("primary-device");
      request.onsuccess = () => resolve(request.result === undefined);
      request.onerror = () => reject(request.error);
    });
  });
  assert.equal(emptyIdentity, true);
  await page.locator("#createIdentity").click();
  assert.match(await page.locator("#identityStatus").innerText(), /Please tick|پہلے اجازت/);
  assert.equal(await page.locator("#identityFingerprintWrap").isVisible(), false);
  await page.locator("#identityConsent").check();
  await page.locator("#createIdentity").click();
  await page.waitForFunction(() => document.querySelector("#identityFingerprint").textContent.length > 30);
  const fingerprint = await page.locator("#identityFingerprint").innerText();
  assert.match(fingerprint, /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  const keyPolicy = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ezero-connect-device-identity", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return await new Promise((resolve, reject) => {
      const request = db.transaction("device-keys", "readonly").objectStore("device-keys").get("primary-device");
      request.onsuccess = () => resolve({ extractable: request.result.privateKey.extractable, type: request.result.privateKey.type, algorithm: request.result.privateKey.algorithm.name, curve: request.result.privateKey.algorithm.namedCurve });
      request.onerror = () => reject(request.error);
    });
  });
  assert.deepEqual(keyPolicy, { extractable: false, type: "private", algorithm: "ECDSA", curve: "P-256" });
  const signatureValid = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ezero-connect-device-identity", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const record = await new Promise((resolve, reject) => {
      const request = db.transaction("device-keys", "readonly").objectStore("device-keys").get("primary-device");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const challenge = new TextEncoder().encode("E-ZERO Connect device identity proof v1");
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, record.privateKey, challenge);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, record.publicKey, signature, challenge);
  });
  assert.equal(signatureValid, true);

  const invite = await page.evaluate(async () => window.EZERO_CONNECT_INVITES.createInvite());
  assert.ok(invite.inviteCode.startsWith("EZERO1."));
  assert.equal(invite.roomId.length, 32);
  const expiredResult = await page.evaluate(async ({ code, now }) => {
    try { await window.EZERO_CONNECT_INVITES.verifyInvite(code, now); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, { code: invite.inviteCode, now: invite.expiresAt + 1 });
  assert.equal(expiredResult, "INVITE_EXPIRED_OR_TIME_INVALID");

  const tamperedCode = await page.evaluate((code) => {
    const raw = atob(code.slice(7).replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (code.length - 7) % 4) % 4));
    const envelope = JSON.parse(raw);
    const first = envelope.payload.guestSecret[0];
    envelope.payload.guestSecret = (first === "A" ? "B" : "A") + envelope.payload.guestSecret.slice(1);
    return "EZERO1." + btoa(JSON.stringify(envelope)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }, invite.inviteCode);
  const tamperResult = await page.evaluate(async code => {
    try { await window.EZERO_CONNECT_INVITES.verifyInvite(code); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, tamperedCode);
  assert.equal(tamperResult, "INVITE_SIGNATURE_INVALID");
  const wrongOriginCode = await page.evaluate(code => {
    const raw = atob(code.slice(7).replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (code.length - 7) % 4) % 4));
    const envelope = JSON.parse(raw);
    envelope.payload.origin = "https://attacker.invalid";
    return "EZERO1." + btoa(JSON.stringify(envelope)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }, invite.inviteCode);
  const wrongOriginResult = await page.evaluate(async code => {
    try { await window.EZERO_CONNECT_INVITES.verifyInvite(code); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, wrongOriginCode);
  assert.equal(wrongOriginResult, "INVITE_ORIGIN_OR_VERSION_INVALID");

  const verifiedInvite = await page.evaluate(async code => window.EZERO_CONNECT_INVITES.verifyInvite(code), invite.inviteCode);
  assert.equal(verifiedInvite.roomId, invite.roomId);
  assert.equal(verifiedInvite.inviterFingerprint, fingerprint);
  assert.equal(verifiedInvite.nonce, invite.nonce);
  assert.equal(verifiedInvite.issuedAt, invite.issuedAt);
  assert.equal(Object.hasOwn(invite, "guestSecret"), false);
  assert.equal(Object.hasOwn(verifiedInvite, "guestProof"), false);
  const replayResult = await page.evaluate(async code => {
    try { await window.EZERO_CONNECT_INVITES.verifyInvite(code); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, invite.inviteCode);
  assert.equal(replayResult, "INVITE_REPLAYED");



  await page.reload();
  await page.waitForFunction(() => document.querySelector("#identityFingerprint").textContent.length > 30);
  assert.equal(await page.locator("#identityFingerprint").innerText(), fingerprint);
  assert.equal(await page.locator("#createIdentity").isDisabled(), true);
  await page.waitForFunction(() => Boolean(window.EZERO_QR));
  assert.equal(await page.locator("#createMyQr").isDisabled(), false);
  assert.equal(await page.locator("#scanFriendQr").isDisabled(), false);
  await page.locator("#createMyQr").click();
  await page.waitForFunction(() => !document.querySelector("#myQrDisplay").hidden);
  const qrPngDataUrl = await page.evaluate(async () => {
    const image = document.querySelector("#myQrImage img");
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, 512, 512);
    const png = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(png);
    });
  });
  await page.locator("#qrGalleryFile").setInputFiles({
    name: "ezero-invite.png",
    mimeType: "image/png",
    buffer: Buffer.from(qrPngDataUrl.split(",")[1], "base64")
  });
  await page.waitForFunction(() => !document.querySelector("#qrScanStatus").textContent.includes("آپ کا QR تیار ہے") && !document.querySelector("#qrScanStatus").textContent.includes("Your QR is ready") && !document.querySelector("#qrScanStatus").textContent.includes("رمز QR جاهز"));
  assert.match(await page.locator("#qrScanStatus").innerText(), /QR signature verified|دستخطی تصدیق کامیاب|تم التحقق من توقيع/);
  assert.equal(await page.evaluate(() => window.__ezeroMediaRequestCount), 0);
  assert.deepEqual(errors, []);

  console.log("EZERO_CLEAN_BUILD_MOBILE_SHELL_TESTS_PASS");
} finally {
  await browser.close();
}
