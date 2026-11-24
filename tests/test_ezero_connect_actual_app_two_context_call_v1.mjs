import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "playwright";

const appUrl = "https://ezero-connect-pairing-v2-preview-20261123.onrender.com/ezero-connect-app.html";
const workerHost = "ezero-connect-signal-staging-20261120.coma39658.workers.dev";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"]
});
const contexts = [];
const pages = [];
const inboxReady = new Map();
const socketErrors = [];

const token = () => randomBytes(24).toString("base64url").slice(0, 32);

function watchInbox(page, label) {
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label + "_INBOX_READY_TIMEOUT")), 25000);
    page.on("websocket", socket => {
      if (!socket.url().includes("/v1/inbox/")) return;
      socket.on("framereceived", frame => {
        try {
          const message = JSON.parse(typeof frame.payload === "string" ? frame.payload : String(frame.payload));
          if (message.type === "inbox-ready") {
            clearTimeout(timer);
            resolve(message);
          }
          if (message.type === "unavailable" || message.type === "error") {
            socketErrors.push({ label, type: message.type, code: message.code || "" });
          }
        } catch (_) {}
      });
      socket.on("socketerror", error => socketErrors.push({ label, error }));
    });
  });
  inboxReady.set(label, ready);
  return ready;
}

async function openPhone(label) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    isMobile: true,
    hasTouch: true,
    permissions: ["camera", "microphone"]
  });
  contexts.push(context);
  const page = await context.newPage();
  pages.push(page);
  page.on("pageerror", error => socketErrors.push({ label, pageError: error.message }));
  const ready = watchInbox(page, label);
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForFunction(() => !!window.EZERO_CONNECT_IDENTITY && !!window.EZERO_CONNECT_TRUST &&
    !!window.EZERO_CONNECT_MEDIA, null, { timeout: 15000 });
  await page.evaluate(async () => {
    await window.EZERO_CONNECT_IDENTITY.createAfterConsent(true);
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.getElementById("identityFingerprint")?.textContent?.length > 20,
    null, { timeout: 15000 });
  const identity = await page.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  const authenticated = await ready;
  assert.equal(authenticated.fingerprint, identity.fingerprint, label + "_INBOX_IDENTITY_BINDING");
  await page.waitForFunction(() => document.getElementById("callStatus")?.textContent.includes("تیار"),
    null, { timeout: 10000 });
  return { page, identity, context };
}

async function saveMutualTrustedFriend(host, guest) {
  const issuedAt = Date.now();
  const invitePayload = {
    origin: new URL(appUrl).origin,
    roomId: token(),
    nonce: token(),
    inviterFingerprint: host.identity.fingerprint,
    inviterPublicKeySpki: host.identity.publicKeySpki,
    issuedAt,
    expiresAt: issuedAt + 60000
  };
  const hostProofPayload = {
    v: 1, protocol: "E-ZERO-SIGNAL-HELLO-1", origin: invitePayload.origin,
    roomId: invitePayload.roomId, inviteNonce: invitePayload.nonce,
    role: "host", fingerprint: host.identity.fingerprint,
    publicKeySpki: host.identity.publicKeySpki, challenge: randomBytes(32).toString("base64url"),
    challengeExpiresAt: Date.now() + 20000
  };
  const guestProofPayload = {
    ...hostProofPayload,
    role: "guest",
    fingerprint: guest.identity.fingerprint,
    publicKeySpki: guest.identity.publicKeySpki,
    challenge: randomBytes(32).toString("base64url"),
    challengeExpiresAt: Date.now() + 20000
  };
  const [hostSignature, guestSignature] = await Promise.all([
    host.page.evaluate(payload => window.EZERO_CONNECT_IDENTITY.signCanonical(payload), hostProofPayload),
    guest.page.evaluate(payload => window.EZERO_CONNECT_IDENTITY.signCanonical(payload), guestProofPayload)
  ]);
  await host.page.evaluate(async ({ invitePayload, proof, guestIdentity }) => {
    await window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
      invitePayload, peerHandshake: proof, localRole: "host",
      peerFingerprint: guestIdentity.fingerprint,
      peerPublicKeySpki: guestIdentity.publicKeySpki,
      displayName: "Second Phone"
    });
  }, {
    invitePayload,
    proof: { payload: guestProofPayload, signature: guestSignature },
    guestIdentity: guest.identity
  });
  await guest.page.evaluate(async ({ invitePayload, proof, hostIdentity }) => {
    await window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
      invitePayload, peerHandshake: proof, localRole: "guest",
      peerFingerprint: hostIdentity.fingerprint,
      peerPublicKeySpki: hostIdentity.publicKeySpki,
      displayName: "First Phone"
    });
  }, {
    invitePayload,
    proof: { payload: hostProofPayload, signature: hostSignature },
    hostIdentity: host.identity
  });
}

async function refreshFriendList(page) {
  await page.evaluate(() => document.getElementById("searchFriends").dispatchEvent(new Event("input", { bubbles: true })));
  await page.waitForFunction(() =>
    document.querySelectorAll("#savedFriendsList button[data-ezero-select-friend='true']").length === 1,
    null, { timeout: 10000 });
}

try {
  const first = await openPhone("FIRST_PHONE");
  const second = await openPhone("SECOND_PHONE");
  assert.notEqual(first.identity.fingerprint, second.identity.fingerprint, "PHONE_IDENTITIES_MUST_DIFFER");

  await saveMutualTrustedFriend(first, second);
  await Promise.all([refreshFriendList(first.page), refreshFriendList(second.page)]);

  const firstSelect = first.page.locator("#savedFriendsList button[data-ezero-select-friend='true']");
  await firstSelect.click();
  await first.page.waitForFunction(() => document.getElementById("audioCall").disabled === false);
  await first.page.locator("#audioCall").click();

  const incoming = second.page.locator("#ezeroActiveCallPanel");
  await incoming.waitFor({ state: "visible", timeout: 20000 });
  assert.match(await incoming.innerText(), /آنے والی کال|Incoming call/);
  assert.equal(await second.page.locator("#audioCall").isDisabled(), true,
    "RECIPIENT_MUST_NOT_START_A_SECOND_CALL_WHILE_INCOMING");
  console.log("ACTUAL_APP_TWO_CONTEXT_SAVED_FRIEND_INCOMING_VISIBLE_PASS");

  const accept = incoming.getByRole("button", { name: /کال قبول کریں|Accept call/ });
  await accept.click();
  await first.page.waitForFunction(() => /کال قبول ہو گئی|Call accepted|رابطہ قائم ہو رہا ہے/.test(
    document.getElementById("callStatus")?.textContent || ""
  ), null, { timeout: 15000 });
  console.log("ACTUAL_APP_RECIPIENT_EXPLICIT_ACCEPT_PASS");

  assert.equal(socketErrors.length, 0, "BROWSER_RUNTIME_OR_SOCKET_ERRORS: " + JSON.stringify(socketErrors));
  console.log("ACTUAL_APP_LIVE_WORKER_SAVED_FRIEND_CALL_ROUTE_PASS");
  console.log("EVIDENCE_BOUNDARY_NO_PHYSICAL_PHONE_OR_BACKGROUND_RING_PROOF");
} finally {
  await Promise.all(contexts.map(context => context.close().catch(() => {})));
  await browser.close();
}
