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
    document.querySelector("#pairingStatus").textContent.includes("دعوت بھیج دی گئی") &&
    document.querySelector("#pairingAction").hidden === true, { timeout: 20000 });
  await guest.waitForFunction(() => document.querySelector("#pairingPanel").hidden === false,
    { timeout: 20000 });

  const hostActionDiagnostic = await host.evaluate(() => ({
    actionHidden: document.querySelector("#pairingAction")?.hidden,
    nameHidden: document.querySelector("#pairingFriendName")?.hidden,
    status: document.querySelector("#pairingStatus")?.textContent,
    outgoingTrustRequest: window.__wsTrace.some(item => item.direction === "out" && String(item.data).includes('"trust-request"'))
  }));
  assert.equal(hostActionDiagnostic.actionHidden, true,
    "The caller must not need a second approval/save click");
  assert.equal(hostActionDiagnostic.nameHidden, true,
    "The caller must not need to type a friend name before the recipient accepts");
  assert.ok(hostActionDiagnostic.outgoingTrustRequest,
    "The caller's deliberate QR invitation must automatically send the signed trust request");

  try {
    await guest.waitForFunction(() => {
      const el = document.querySelector("#pairingStatus");
      return el.dataset.kind === "error" || el.textContent.includes("ایک بار قبول کریں");
    }, null, { timeout: 15000 });
  } catch (error) {
    const diagnostics = await Promise.all([host, guest].map(page => page.evaluate(() => ({
      status: document.querySelector("#pairingStatus")?.textContent,
      wsTrace: window.__wsTrace
    }))));
    throw new Error("Pairing relay diagnostic timeout: " + JSON.stringify(diagnostics) + " | " + error.message);
  }
  const guestPairingStatus = await guest.locator("#pairingStatus").textContent();
  assert.ok(guestPairingStatus.includes("ایک بار قبول کریں"),
    "Guest did not receive the single-accept request. Guest status: " + guestPairingStatus +
    " | Host status: " + await host.locator("#pairingStatus").textContent());
  assert.equal(await guest.locator("#pairingAction").isVisible(), true,
    "Only the recipient should see the Accept action");
  assert.equal(await guest.locator("#pairingFriendName").isHidden(), true,
    "Recipient should not need to type a friend name to approve");
  await guest.locator("#pairingAction").click();

  try {
    await Promise.all([
      host.waitForFunction(() => document.querySelector("#pairingStatus")?.textContent.includes("دوست محفوظ ہو گیا"), null, { timeout: 15000 }),
      guest.waitForFunction(() => document.querySelector("#pairingStatus")?.textContent.includes("دوست محفوظ ہو گیا"), null, { timeout: 15000 })
    ]);
  } catch (error) {
    const state = await Promise.all([host, guest].map(async page => page.evaluate(async () => ({
      status: document.querySelector("#pairingStatus")?.textContent,
      statusKind: document.querySelector("#pairingStatus")?.dataset.kind,
      contacts: await window.EZERO_CONNECT_TRUST.listTrustedContacts(),
      wsTrace: window.__wsTrace
    }))));
    throw new Error("Save completion diagnostic: " + JSON.stringify(state) + " | " + error.message);
  }

  const [savedHost, savedGuest] = await Promise.all([
    host.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts()),
    guest.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts())
  ]);
  const hostSavedFriend = savedHost.find(c => c.remoteFingerprint === guestIdentity.fingerprint && c.status === "TRUSTED");
  const guestSavedFriend = savedGuest.find(c => c.remoteFingerprint === hostIdentity.fingerprint && c.status === "TRUSTED");
  assert.ok(hostSavedFriend, "Host did not automatically persist the accepted guest. Contacts: " + JSON.stringify(savedHost));
  assert.ok(guestSavedFriend, "Guest did not automatically persist the accepted host. Contacts: " + JSON.stringify(savedGuest));
  assert.equal(hostSavedFriend.displayName, "E-ZERO friend · " + guestIdentity.fingerprint.replaceAll(":", "").slice(0, 8));
  assert.equal(guestSavedFriend.displayName, "E-ZERO friend · " + hostIdentity.fingerprint.replaceAll(":", "").slice(0, 8));
  assert.equal(hostSavedFriend.remoteFingerprint, guestIdentity.fingerprint);
  assert.equal(guestSavedFriend.remoteFingerprint, hostIdentity.fingerprint);
  // The recipient's single pairing Accept also authorizes the first
  // requested audio call. Platform media permission remains separate.
  await Promise.all([host, guest].map(page => page.waitForFunction(
    () => document.querySelector("#callStatus")?.textContent.includes("کال منسلک ہے"),
    { timeout: 60000 }
  )));
  assert.ok(await host.evaluate(() => window.__mediaCalls > 0),
    "Caller microphone should start only after the recipient's one Accept");
  assert.ok(await guest.evaluate(() => window.__mediaCalls > 0),
    "Recipient microphone should start after its one pairing Accept");
  assert.equal(await host.locator("#hangupCall").isVisible(), true);
  assert.equal(await guest.locator("#hangupCall").isVisible(), true);

  console.log("EZERO_ONE_RECIPIENT_ACCEPT_BILATERAL_SAVE_AND_FIRST_AUDIO_CALL_PASS");
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
