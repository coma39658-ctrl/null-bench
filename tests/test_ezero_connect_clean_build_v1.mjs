import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const html = await readFile("ezero-connect-app.html", "utf8");
const landing = await readFile("ezero-connect.html", "utf8");
assert.match(landing, /href="\.\/ezero-connect-app\.html"/);
assert.doesNotMatch(landing, /ezero_trusted_friends_staging_20261106\.html/);
const js = await readFile("js/ezero_connect_app_v1.js", "utf8");
const identityJs = await readFile("js/ezero_connect_identity_v1.js", "utf8");
assert.match(html, /E-ZERO Connect/);
assert.match(html, /js\/ezero_connect_app_v1\.js/);
assert.doesNotMatch(html, /ezero_trusted_friends_staging|ezero_saved_friend_stage|ezero_saved_friend_stage_engine/);
assert.doesNotMatch(js, /getUserMedia|RTCPeerConnection|WebSocket|localStorage|indexedDB/);
assert.ok(html.includes("js/ezero_connect_identity_v1.js"));
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
  await page.reload();
  await page.waitForFunction(() => document.querySelector("#identityFingerprint").textContent.length > 30);
  assert.equal(await page.locator("#identityFingerprint").innerText(), fingerprint);
  assert.equal(await page.locator("#createIdentity").isDisabled(), true);
  assert.deepEqual(errors, []);

  console.log("EZERO_CLEAN_BUILD_MOBILE_SHELL_TESTS_PASS");
} finally {
  await browser.close();
}
