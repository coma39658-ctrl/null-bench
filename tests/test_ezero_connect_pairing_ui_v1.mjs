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
      window.__wsTrace = [];
      const NativeWebSocket = window.WebSocket;
      window.WebSocket = class extends NativeWebSocket {
        constructor(...args) {
          super(...args);
          this.addEventListener("message", event => window.__wsTrace.push({ direction: "in", data: event.data }));
          const originalSend = this.send.bind(this);
          this.send = data => { window.__wsTrace.push({ direction: "out", data }); return originalSend(data); };
        }
      };
      document.addEventListener("ezero:invite-created", event => { window.__ezeroPairInviteCode = event.detail?.invite?.inviteCode || null; });
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
  await host.waitForFunction(() => Boolean(window.__ezeroPairInviteCode), { timeout: 5000 });
  const activeCode = await host.evaluate(() => window.__ezeroPairInviteCode);
  assert.ok(activeCode.startsWith("EZERO1."), "the displayed host QR should contain a signed invite");

  const hostIdentity = await host.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  const guestIdentity = await guest.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());

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
  try {
    await guest.waitForFunction(() => {
      const el = document.querySelector("#pairingStatus");
      return el.dataset.kind === "error" || el.textContent.includes("محفوظ کرنا چاہتا");
    }, null, { timeout: 15000 });
  } catch (error) {
    const diagnostics = await Promise.all([host, guest].map(page => page.evaluate(() => ({
      status: document.querySelector("#pairingStatus")?.textContent,
      wsTrace: window.__wsTrace
    }))));
    throw new Error("Pairing relay diagnostic timeout: " + JSON.stringify(diagnostics) + " | " + error.message);
  }
  const guestPairingStatus = await guest.locator("#pairingStatus").textContent();
  assert.ok(guestPairingStatus.includes("محفوظ کرنا چاہتا"),
    "Guest did not receive/verify pairing request. Guest status: " + guestPairingStatus +
    " | Host status: " + await host.locator("#pairingStatus").textContent());
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
  assert.equal(savedHost[0].remoteFingerprint, guestIdentity.fingerprint);
  assert.equal(savedGuest[0].remoteFingerprint, hostIdentity.fingerprint);
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
