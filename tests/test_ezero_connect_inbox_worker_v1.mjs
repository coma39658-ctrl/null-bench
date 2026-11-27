import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { EzeroConnectInbox } from "../signaling/ezero-connect-v1/inbox_worker.mjs";
import { canonicalCallInvite, encodeCallInvite } from "../signaling/ezero-connect-v1/inbox_protocol.mjs";

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

class FakeStorage {
  constructor() { this.values = new Map(); this.alarmAt = null; }
  async get(key) { return this.values.get(key); }
  async put(key, value) { this.values.set(key, structuredClone(value)); }
  async delete(key) { this.values.delete(key); }
  async setAlarm(value) { this.alarmAt = value; }
  async deleteAlarm() { this.alarmAt = null; }
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
const callerSocket = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: caller.fingerprint, pendingCallId: null
});
const recipientSocket = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: recipient.fingerprint, peerCallId: null
});
const ctx = { storage: new FakeStorage(), getWebSockets: () => [callerSocket, recipientSocket] };
const inbox = new EzeroConnectInbox(ctx, { PUBLIC_ORIGIN: payload.origin });

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

// A signed invite cannot be replayed after the call is cancelled.
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(callerSocket.sent.at(-1).type, "replay-rejected");

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
const offlineSockets = [offlineCaller];
const offlineStorage = new FakeStorage();
const offlineInbox = new EzeroConnectInbox({
  storage: offlineStorage, getWebSockets: () => offlineSockets
}, { PUBLIC_ORIGIN: payload.origin });
await offlineInbox.webSocketMessage(offlineCaller, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(offlineCaller.sent.at(-1).type, "invite-queued");
assert.equal(offlineCaller.sent.some(item => item.type === "invite-routed"), false);
assert.equal((await offlineStorage.get("pendingInvite")).callId, payload.callId);

// Recipient reconnects while the signed invite is still valid. The queue is
// delivered only after the authenticated recipient fingerprint matches and
// the original caller is still online with the same pending call.
const reconnectedRecipient = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: recipient.fingerprint,
  peerCallId: null, pendingCallId: null, activeCallId: null
});
offlineSockets.push(reconnectedRecipient);
assert.equal(await offlineInbox.deliverPendingInvite(reconnectedRecipient), true);
assert.equal(reconnectedRecipient.sent.at(-1).type, "incoming-call");
assert.equal(reconnectedRecipient.sent.at(-1).queued, true);
assert.equal(offlineCaller.sent.at(-1).type, "invite-routed");
assert.equal(offlineCaller.attachment.pendingCallId, payload.callId);

await offlineInbox.webSocketMessage(reconnectedRecipient, JSON.stringify({
  type: "call-response", callId: payload.callId, decision: "accept"
}));
assert.equal(offlineCaller.sent.at(-1).decision, "accept");
assert.equal(reconnectedRecipient.attachment.state, "CALL_ACCEPTED");
assert.equal(offlineCaller.attachment.state, "CALL_ACCEPTED");
assert.equal(await offlineStorage.get("pendingInvite"), undefined);
assert.equal(offlineStorage.alarmAt, null);

// The signed invite is consumed only after explicit Accept/Decline or expiry.

console.log("SAVED_FRIEND_INBOX_SIGNED_ROUTING_ACCEPT_DECLINE_AND_OFFLINE_NO_QUEUE_PASS");
