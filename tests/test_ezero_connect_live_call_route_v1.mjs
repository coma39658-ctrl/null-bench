import assert from "node:assert/strict";
import { chromium } from "playwright";

const appUrl = "https://ezero-connect-pairing-v2-preview-20261123.onrender.com/ezero-connect-app.html";
const workerBase = "https://ezero-connect-signal-staging-20261120.coma39658.workers.dev";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  const result = await page.evaluate(async ({ workerBase }) => {
    const encoder = new TextEncoder();
    const canonical = value => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
      if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
      if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
      if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
      }
      throw new Error("CALL_TEST_CANONICAL_INVALID");
    };
    const b64url = bytes => {
      let binary = "";
      for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
    };
    const randomToken = () => b64url(crypto.getRandomValues(new Uint8Array(24))).slice(0, 32);
    const fail = message => { throw new Error(message); };

    async function makeIdentity() {
      const pair = await crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
      );
      const spkiBytes = await crypto.subtle.exportKey("spki", pair.publicKey);
      const publicKeySpki = b64url(spkiBytes);
      const digest = await crypto.subtle.digest("SHA-256", spkiBytes);
      const fingerprint = Array.from(new Uint8Array(digest),
        byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
      return { pair, publicKeySpki, fingerprint };
    }

    async function connectInbox(identity, inboxFingerprint) {
      const url = new URL(workerBase);
      url.protocol = "wss:";
      url.pathname = "/v1/inbox/" + inboxFingerprint;
      url.search = "";
      url.hash = "";
      const socket = new WebSocket(url.toString());
      const messages = [];
      const waiters = [];
      socket.addEventListener("message", event => {
        let data;
        try { data = JSON.parse(event.data); } catch (_) { fail("LIVE_CALL_INBOX_INVALID_JSON"); }
        const index = waiters.findIndex(waiter => waiter.predicate(data));
        if (index >= 0) {
          const [waiter] = waiters.splice(index, 1);
          clearTimeout(waiter.timer);
          waiter.resolve(data);
        } else messages.push(data);
      });
      socket.addEventListener("error", () => {
        for (const waiter of waiters.splice(0)) { clearTimeout(waiter.timer); waiter.reject(new Error("LIVE_CALL_WEBSOCKET_ERROR")); }
      });
      const waitFor = (predicate, label) => {
        const existing = messages.findIndex(predicate);
        if (existing >= 0) return Promise.resolve(messages.splice(existing, 1)[0]);
        return new Promise((resolve, reject) => {
          const waiter = { predicate, resolve, reject, timer: setTimeout(() => {
            const index = waiters.indexOf(waiter);
            if (index >= 0) waiters.splice(index, 1);
            reject(new Error(label + "_TIMEOUT"));
          }, 15000) };
          waiters.push(waiter);
        });
      };
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("LIVE_CALL_SOCKET_OPEN_TIMEOUT")), 15000);
        socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
        socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("LIVE_CALL_SOCKET_OPEN_ERROR")); }, { once: true });
      });
      const challengeMessage = await waitFor(x => x.type === "challenge", "LIVE_CALL_CHALLENGE");
      const p = challengeMessage.payload;
      if (!p || p.protocol !== "E-ZERO-INBOX-HELLO-1" || p.origin !== location.origin ||
          p.inboxFingerprint !== inboxFingerprint || p.challengeExpiresAt <= Date.now()) {
        fail("LIVE_CALL_CHALLENGE_BINDING_INVALID");
      }
      const proof = {
        v: 1, protocol: "E-ZERO-INBOX-HELLO-1", origin: location.origin,
        fingerprint: identity.fingerprint, inboxFingerprint, challenge: p.challenge,
        challengeExpiresAt: p.challengeExpiresAt
      };
      const signature = b64url(await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" }, identity.pair.privateKey, encoder.encode(canonical(proof))
      ));
      socket.send(JSON.stringify({
        type: "hello", fingerprint: identity.fingerprint,
        publicKeySpki: identity.publicKeySpki, signature
      }));
      const ready = await waitFor(x => x.type === "inbox-ready", "LIVE_CALL_INBOX_READY");
      if (ready.fingerprint !== identity.fingerprint) fail("LIVE_CALL_INBOX_IDENTITY_MISMATCH");
      return { socket, waitFor };
    }

    const A = await makeIdentity();
    const B = await makeIdentity();
    const caller = await connectInbox(A, B.fingerprint);
    const recipient = await connectInbox(B, B.fingerprint);

    const issuedAt = Date.now();
    const payload = {
      v: 1,
      protocol: "E-ZERO-SAVED-FRIEND-CALL-1",
      origin: location.origin,
      callerFingerprint: A.fingerprint,
      callerPublicKeySpki: A.publicKeySpki,
      recipientFingerprint: B.fingerprint,
      relationshipId: "live_test_relationship_123456",
      callId: randomToken(),
      nonce: randomToken(),
      mode: "audio",
      issuedAt,
      expiresAt: issuedAt + 25000
    };
    const inviteSignature = b64url(await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, A.pair.privateKey, encoder.encode(canonical(payload))
    ));
    const inviteCode = "EZERO-CALL1." + b64url(encoder.encode(JSON.stringify({
      payload, signature: inviteSignature
    })));

    const incomingPromise = recipient.waitFor(x => x.type === "incoming-call", "LIVE_CALL_INCOMING");
    caller.socket.send(JSON.stringify({ type: "call-invite", inviteCode }));
    const [incoming, routed] = await Promise.all([
      incomingPromise,
      caller.waitFor(x => x.type === "invite-routed", "LIVE_CALL_INVITE_ROUTED")
    ]);
    if (incoming.inviteCode !== inviteCode || routed.callId !== payload.callId) fail("LIVE_CALL_INVITE_BINDING_FAILED");

    const acceptedPromise = caller.waitFor(
      x => x.type === "call-response" && x.callId === payload.callId,
      "LIVE_CALL_ACCEPT_RESPONSE"
    );
    recipient.socket.send(JSON.stringify({
      type: "call-response", callId: payload.callId, decision: "accept"
    }));
    const accepted = await acceptedPromise;
    if (accepted.decision !== "accept") fail("LIVE_CALL_ACCEPT_REJECTED");

    const roomInviteCode = "EZERO1." + randomToken() + randomToken();
    const roomRoutedPromise = caller.waitFor(
      x => x.type === "call-room-routed" && x.callId === payload.callId,
      "LIVE_CALL_ROOM_ROUTED"
    );
    const roomReceivedPromise = recipient.waitFor(
      x => x.type === "call-room-invite" && x.callId === payload.callId,
      "LIVE_CALL_ROOM_RECEIVED"
    );
    caller.socket.send(JSON.stringify({
      type: "call-room-invite", callId: payload.callId, inviteCode: roomInviteCode
    }));
    const [roomRouted, roomReceived] = await Promise.all([roomRoutedPromise, roomReceivedPromise]);
    if (roomRouted.callId !== payload.callId || roomReceived.inviteCode !== roomInviteCode) {
      fail("LIVE_CALL_ROOM_HANDOFF_FAILED");
    }

    caller.socket.close();
    recipient.socket.close();
    return {
      callerFingerprint: A.fingerprint,
      recipientFingerprint: B.fingerprint,
      callId: payload.callId,
      inviteRouted: true,
      recipientAccepted: true,
      signedRoomInviteRelayed: true
    };
  }, { workerBase });

  assert.equal(result.inviteRouted, true);
  assert.equal(result.recipientAccepted, true);
  assert.equal(result.signedRoomInviteRelayed, true);
  assert.notEqual(result.callerFingerprint, result.recipientFingerprint);
  console.log("LIVE_TWO_DEVICE_INBOX_AUTHENTICATION_PASS");
  console.log("LIVE_SIGNED_SAVED_FRIEND_CALL_INVITE_ROUTING_PASS");
  console.log("LIVE_RECIPIENT_ACCEPT_HANDSHAKE_PASS");
  console.log("LIVE_ACCEPTED_ROOM_INVITE_RELAY_PASS");
  console.log("LIVE_SIGNALING_ONLY_NO_PHYSICAL_MICROPHONE_OR_WEBRTC_MEDIA_PROOF");
  await context.close();
} finally {
  await browser.close();
}
