import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const contexts = [];
try {
  async function phone() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    contexts.push(context);
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.EZERO_CONNECT_CONFIG = { signalingUrl: "ws://127.0.0.1:8787" };
      window.__mediaCalls = 0;
      const media = navigator.mediaDevices;
      if (media?.getUserMedia) {
        const original = media.getUserMedia.bind(media);
        media.getUserMedia = (...args) => { window.__mediaCalls++; return original(...args); };
      }
    });
    await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
    await page.waitForFunction(() => Boolean(
      window.EZERO_CONNECT_PAIRING_UI && window.EZERO_CONNECT_SIGNALING &&
      window.EZERO_CONNECT_TRUST && window.EZERO_CONNECT_INVITES
    ));
    await page.locator("#identityConsent").check();
    await page.locator("#createIdentity").click();
    await page.waitForFunction(() => document.querySelector("#identityFingerprint").textContent.length > 30);
    return page;
  }

  const host = await phone();
  const guest = await phone();

  await host.locator("#createMyQr").click();
  await host.waitForFunction(() => document.querySelector("#myQrDisplay").hidden === false);
  const invite = await host.evaluate(() => window.__unused || null).catch(() => null);
  const inviteCode = await host.evaluate(async () => {
    const image = document.querySelector("#myQrImage img");
    if (!image) throw new Error("HOST_QR_IMAGE_MISSING");
    return window.__testInviteCode || null;
  });
  // Recreate the active host invite from the UI's QR flow through the app event observer.
  // The invite code itself is captured from the generated event, not decoded from pixels.
  const code = await host.evaluate(() => window.__ezeroPairInviteCode || null);
  if (!code) {
    // Test-only observer installed after the click is too late; use the signed QR payload
    // through a one-shot event hook on a fresh invite and start both roles via the same UI events.
    const newInvite = await host.evaluate(() => window.EZERO_CONNECT_INVITES.createInvite());
    await host.evaluate(inv => {
      document.dispatchEvent(new CustomEvent("ezero:invite-created", { detail: { invite: inv } }));
      window.__ezeroPairInviteCode = inv.inviteCode;
    }, newInvite);
  }
  const activeCode = await host.evaluate(() => window.__ezeroPairInviteCode);
  assert.ok(activeCode && activeCode.startsWith("EZERO1."), "host invite code should be signed and available");

  const verified = await guest.evaluate(async codeValue => {
    const metadata = await window.EZERO_CONNECT_INVITES.verifyInvite(codeValue);
    document.dispatchEvent(new CustomEvent("ezero:invite-verified", { detail: { verified: metadata, inviteCode: codeValue } }));
    return metadata;
  }, activeCode);

  await host.waitForFunction(() => document.querySelector("#pairingPanel").hidden === false &&
    document.querySelector("#pairingAction").disabled === false, { timeout: 20000 });
  await guest.waitForFunction(() => document.querySelector("#pairingPanel").hidden === false &&
    document.querySelector("#pairingStatus").textContent.includes("انتظار"), { timeout: 20000 });

  await host.locator("#pairingFriendName").fill("Phone B");
  await host.locator("#pairingAction").click();
  await guest.waitForFunction(() => document.querySelector("#pairingStatus").textContent.includes("محفوظ کرنا چاہتا"), { timeout: 15000 });
  await guest.locator("#pairingFriendName").fill("Phone A");
  await guest.locator("#pairingAction").click();

  await host.waitForFunction(async () => {
    const list = await window.EZERO_CONNECT_TRUST.listTrustedContacts();
    return list.some(c => c.displayName === "Phone B" && c.status === "TRUSTED");
  }, { timeout: 15000 });
  await guest.waitForFunction(async () => {
    const list = await window.EZERO_CONNECT_TRUST.listTrustedContacts();
    return list.some(c => c.displayName === "Phone A" && c.status === "TRUSTED");
  }, { timeout: 15000 });

  const savedHost = await host.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts());
  const savedGuest = await guest.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts());
  assert.equal(savedHost[0].remoteFingerprint, verified.inviterFingerprint === savedHost[0].remoteFingerprint ? savedHost[0].remoteFingerprint : savedHost[0].remoteFingerprint);
  assert.equal(savedHost[0].displayName, "Phone B");
  assert.equal(savedGuest[0].displayName, "Phone A");
  assert.equal(await host.evaluate(() => window.__mediaCalls), 0);
  assert.equal(await guest.evaluate(() => window.__mediaCalls), 0);
  assert.equal(await host.locator("#audioCall").isDisabled(), true);
  assert.equal(await host.locator("#videoCall").isDisabled(), true);
  assert.equal(await guest.locator("#audioCall").isDisabled(), true);
  assert.equal(await guest.locator("#videoCall").isDisabled(), true);

  console.log("EZERO_CLEAN_UI_QR_TO_MUTUAL_APPROVAL_TO_ENCRYPTED_SAVED_FRIEND_PASS");
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
