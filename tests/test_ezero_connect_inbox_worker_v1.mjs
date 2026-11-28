import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { EzeroConnectInbox } from "../signaling/ezero-connect-v1/inbox_worker.mjs";
import { canonicalCallInvite, encodeCallInvite, verifyCallInvite } from "../signaling/ezero-connect-v1/inbox_protocol.mjs";

globalThis.crypto ||= webcrypto;

function toB64url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

async function identity() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = toB64url(await crypto.subtle.exportKey("spki", pair.publicKey));
  const digest = await crypto.subtle.digest("SHA-256", await crypto.subtle.exportKey("spki", pair.publicKey));
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
  return { pair, spki, fingerprint };
}

class FakeSocket {
  constructor(attachment) { this.readyState = 1; this.attachment = structuredClone(attachment); this.sent = []; }
  deserializeAttachment() { return structuredClone(this.attachment); }
  serializeAttachment(value) { this.attachment = structuredClone(value); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.readyState = 3; }
}

const caller = await identity();
const recipient = await identity();
const now = Date.now();
const payload = {
  v: 1,
  protocol: "E-ZERO-SAVED-FRIEND-CALL-1",
  origin: "https://ezero-staging.example",
  callerFingerprint: caller.fingerprint,
  callerPublicKeySpki: caller.spki,
  recipientFingerprint: recipient.fingerprint,
  relationshipId: "relationship_1234567890",
  callId: "0123456789abcdefghijklmnopqrstuv",
  nonce: "abcdefghijklmnopqrstuv0123456789",
  mode: "audio",
  issuedAt: now,
  expiresAt: now + 20_000
};
const signature = toB64url(await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" }, caller.pair.privateKey,
  new TextEncoder().encode(canonicalCallInvite(payload))
));

const inviteCode = encodeCallInvite({ payload, signature });

// Negative signed-invite validation vectors: exact origin/recipient binding,
// strict envelope schema, expiry, malformed encoding, and signature tampering.
assert.deepEqual(await verifyCallInvite(inviteCode, payload.origin, recipient.fingerprint), payload);
await assert.rejects(
  () => verifyCallInvite(inviteCode, "https://wrong-origin.example", recipient.fingerprint),
  /CALL_INVITE_BINDING_INVALID/
);
await assert.rejects(
  () => verifyCallInvite(inviteCode, payload.origin, caller.fingerprint),
  /CALL_INVITE_BINDING_INVALID/
);
await assert.rejects(
  () => verifyCallInvite("EZERO-CALL1.not*base64", payload.origin, recipient.fingerprint),
  /CALL_INVITE_FORMAT_INVALID/
);
const decodedEnvelope = JSON.parse(Buffer.from(inviteCode.slice("EZERO-CALL1.".length), "base64url").toString("utf8"));
const tamperedSignature = decodedEnvelope.signature[0] === "A" ? "B" : "A";
await assert.rejects(
  () => verifyCallInvite(encodeCallInvite({ ...decodedEnvelope, signature: tamperedSignature + decodedEnvelope.signature.slice(1) }), payload.origin, recipient.fingerprint),
  /CALL_INVITE_SIGNATURE_INVALID/
);
await assert.rejects(
  () => verifyCallInvite(encodeCallInvite({ ...decodedEnvelope, unexpected: true }), payload.origin, recipient.fingerprint),
  /CALL_INVITE_ENVELOPE_INVALID/
);
const expiredPayload = { ...payload, issuedAt: now - 40_000, expiresAt: now - 1 };
const expiredSignature = toB64url(await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" }, caller.pair.privateKey,
  new TextEncoder().encode(canonicalCallInvite(expiredPayload))
));
await assert.rejects(
  () => verifyCallInvite(encodeCallInvite({ payload: expiredPayload, signature: expiredSignature }), payload.origin, recipient.fingerprint),
  /CALL_INVITE_EXPIRED_OR_TIME_INVALID/
);
const callerSocket = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: caller.fingerprint, pendingCallId: null
});
const recipientSocket = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: recipient.fingerprint, peerCallId: null
});
const ctx = { getWebSockets: () => [callerSocket, recipientSocket] };
const env = {
  PUBLIC_ORIGIN: payload.origin,
  // Unit-test-only trusted registry: emulate an exact mutual-friend allow decision.
  FRIENDSHIP_REGISTRY: {
    async fetch(_url, init) {
      const request = JSON.parse(init.body);
      assert.equal(request.protocol, "E-ZERO-SAVED-FRIEND-AUTH-1");
      assert.equal(request.callerFingerprint, caller.fingerprint);
      assert.equal(request.recipientFingerprint, recipient.fingerprint);
      assert.equal(request.relationshipId, payload.relationshipId);
      return new Response(JSON.stringify({
        authorized: true,
        relationshipId: payload.relationshipId
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }
};
const inbox = new EzeroConnectInbox(ctx, env);

await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(recipientSocket.sent.at(-1).type, "incoming-call");
assert.equal(recipientSocket.sent.at(-1).inviteCode, inviteCode);
assert.equal(callerSocket.sent.at(-1).type, "invite-routed");
assert.equal(callerSocket.attachment.pendingCallId, payload.callId);
assert.equal(recipientSocket.attachment.peerCallId, payload.callId);

await inbox.webSocketMessage(recipientSocket, JSON.stringify({
  type: "call-response", callId: payload.callId, decision: "accept"
}));
assert.deepEqual(callerSocket.sent.at(-1), {
  type: "call-response", callId: payload.callId, decision: "accept"
});
assert.equal(callerSocket.attachment.pendingCallId, null);
assert.equal(recipientSocket.attachment.peerCallId, null);
assert.equal(callerSocket.attachment.state, "CALL_ACCEPTED");
assert.equal(recipientSocket.attachment.state, "CALL_ACCEPTED");

// Only an accepted call can hand off a short-lived, signed WebRTC room invite.
// The inbox relays it opaquely; each browser verifies it against its saved peer.
const roomInviteCode = "EZERO1." + "A".repeat(120);
await inbox.webSocketMessage(callerSocket, JSON.stringify({
  type: "call-room-invite", callId: payload.callId, inviteCode: roomInviteCode
}));
assert.deepEqual(recipientSocket.sent.at(-1), {
  type: "call-room-invite", callId: payload.callId, inviteCode: roomInviteCode
});
assert.equal(callerSocket.sent.at(-1).type, "call-room-routed");
const notAcceptedSocket = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: caller.fingerprint, pendingCallId: null
});
await inbox.webSocketMessage(notAcceptedSocket, JSON.stringify({
  type: "call-room-invite", callId: payload.callId, inviteCode: roomInviteCode
}));
assert.equal(notAcceptedSocket.readyState, 3);

// An accepted call occupies both endpoints until cancellation.
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(callerSocket.sent.at(-1).type, "busy");
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-cancel", callId: payload.callId }));

assert.equal(callerSocket.attachment.state, "AUTHENTICATED");
assert.equal(recipientSocket.attachment.state, "AUTHENTICATED");

// A separate fresh invitation must require explicit user decline and must
// not enter the accepted-call / room-handoff state.
const declinePayload = {
  ...payload,
  callId: "ZYXWVUTSRQPONMLKJIHGFEDCBA987654",
  nonce: "987654ZYXWVUTSRQPONMLKJIHGFEDCBA",
  issuedAt: Date.now(),
  expiresAt: Date.now() + 20_000
};
const declineSignature = toB64url(await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" }, caller.pair.privateKey,
  new TextEncoder().encode(canonicalCallInvite(declinePayload))
));
const declineInviteCode = encodeCallInvite({ payload: declinePayload, signature: declineSignature });
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode: declineInviteCode }));
assert.equal(recipientSocket.sent.at(-1).type, "incoming-call");
await inbox.webSocketMessage(recipientSocket, JSON.stringify({
  type: "call-response", callId: declinePayload.callId, decision: "decline"
}));
assert.deepEqual(callerSocket.sent.at(-1), {
  type: "call-response", callId: declinePayload.callId, decision: "decline"
});
assert.equal(callerSocket.attachment.state, "AUTHENTICATED");
assert.equal(recipientSocket.attachment.state, "AUTHENTICATED");
assert.ok(!callerSocket.attachment.activeCallId, "declined caller must not retain an active call");
assert.ok(!recipientSocket.attachment.activeCallId, "declining recipient must not retain an active call");

// A signed invite cannot be replayed after the call is cancelled.
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(callerSocket.sent.at(-1).type, "replay-rejected");

// A valid signature is not sufficient: the authoritative friendship registry
// must explicitly approve the exact saved relationship before any routing.
const deniedCaller = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: caller.fingerprint, pendingCallId: null
});
const deniedRecipient = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: recipient.fingerprint, peerCallId: null
});
const deniedEnv = {
  ...env,
  FRIENDSHIP_REGISTRY: {
    async fetch() {
      return new Response(JSON.stringify({ authorized: false }), {
        status: 403, headers: { "Content-Type": "application/json" }
      });
    }
  }
};
const deniedInbox = new EzeroConnectInbox({ getWebSockets: () => [deniedCaller, deniedRecipient] }, deniedEnv);
await deniedInbox.webSocketMessage(deniedCaller, JSON.stringify({ type: "call-invite", inviteCode }));
// A non-200 registry denial is treated as unavailable/rejected: close the
// caller socket, emit no delivery, and leave both endpoint attachments untouched.
assert.equal(deniedCaller.readyState, 3);
assert.equal(deniedCaller.sent.length, 0);
assert.equal(deniedRecipient.sent.some(item => item.type === "incoming-call"), false);
assert.equal(deniedCaller.attachment.pendingCallId, null);
assert.equal(deniedRecipient.attachment.peerCallId, null);

// A dropped socket also releases the accepted-call state on the other endpoint.
callerSocket.attachment.state = "CALL_ACCEPTED";
callerSocket.attachment.activeCallId = payload.callId;
callerSocket.attachment.peerFingerprint = recipient.fingerprint;
recipientSocket.attachment.state = "CALL_ACCEPTED";
recipientSocket.attachment.activeCallId = payload.callId;
recipientSocket.attachment.peerFingerprint = caller.fingerprint;
await inbox.webSocketClose(callerSocket, 1006, "network lost");
assert.equal(recipientSocket.attachment.state, "AUTHENTICATED");
assert.equal(recipientSocket.attachment.activeCallId, null);
assert.equal(recipientSocket.sent.at(-1).type, "peer-inbox-disconnected");

// Offline recipients are never queued or reported as delivered.
const offlineCaller = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: caller.fingerprint, pendingCallId: null
});
const offlineInbox = new EzeroConnectInbox({ getWebSockets: () => [offlineCaller] }, env);
await offlineInbox.webSocketMessage(offlineCaller, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(offlineCaller.sent.at(-1).type, "unavailable");
assert.equal(offlineCaller.sent.some(item => item.type === "invite-routed"), false);

console.log("SAVED_FRIEND_INBOX_SIGNED_ROUTING_ACCEPT_DECLINE_AND_OFFLINE_NO_QUEUE_PASS");
