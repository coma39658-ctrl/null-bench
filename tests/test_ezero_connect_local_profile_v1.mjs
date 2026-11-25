import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
  await page.waitForFunction(() => Boolean(window.EZERO_CONNECT_LOCAL_PROFILE));
  await page.locator("#editMyProfile").click();
  assert.equal(await page.locator("#myProfileEditor").isVisible(), true);
  await page.locator("#myProfileName").fill("Qamar Profile Test");
  await page.locator("#saveMyProfile").click();
  await page.locator("#language").click();
  assert.equal(await page.locator("#welcomeTitle").textContent(), "Qamar Profile Test");
  await page.waitForFunction(() => document.querySelector("#welcomeTitle").textContent === "Qamar Profile Test");
  assert.equal(await page.locator("#myProfileEditor").isVisible(), false);

  const stored = await page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("ezero-connect-local-profile-v1", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const values = await new Promise((resolve, reject) => {
      const tx = db.transaction(["profile", "keys"], "readonly");
      const profileReq = tx.objectStore("profile").get("primary");
      const keyReq = tx.objectStore("keys").get("device-profile-aes-gcm");
      tx.oncomplete = () => resolve({ record: profileReq.result, key: keyReq.result.key });
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return {
      hasCiphertext: values.record.ciphertext instanceof Uint8Array,
      hasIv: values.record.iv instanceof Uint8Array,
      keyExtractable: values.key.extractable,
      keyAlgorithm: values.key.algorithm.name,
      ciphertextHasPlaintext: new TextDecoder().decode(values.record.ciphertext).includes("Qamar Profile Test")
    };
  });
  assert.deepEqual(stored, {
    hasCiphertext: true, hasIv: true, keyExtractable: false,
    keyAlgorithm: "AES-GCM", ciphertextHasPlaintext: false
  });

  await page.reload();
  await page.waitForFunction(() => document.querySelector("#welcomeTitle").textContent === "Qamar Profile Test");
  assert.equal(await page.locator("#profileInitial").innerText(), "Q");
  await page.locator("#editMyProfile").click();
  await page.locator("#myProfileName").fill(" ");
  await page.locator("#saveMyProfile").click();
  assert.match(await page.locator("#myProfileStatus").innerText(), /نام 1 سے 48/);
  assert.deepEqual(errors, []);
  console.log("EZERO_LOCAL_PROFILE_ENCRYPTION_PERSISTENCE_AND_VALIDATION_PASS");
} finally {
  await browser.close();
}
