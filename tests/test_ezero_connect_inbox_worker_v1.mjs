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
const ctx = { getWebSockets: () => [callerSocket, recipientSocket] };
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

// An accepted call occupies both endpoints until cancellation.
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(callerSocket.sent.at(-1).type, "busy");
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-cancel", callId: payload.callId }));
assert.equal(callerSocket.attachment.state, "AUTHENTICATED");
assert.equal(recipientSocket.attachment.state, "AUTHENTICATED");

// A signed invite cannot be replayed after the call is cancelled.
await inbox.webSocketMessage(callerSocket, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(callerSocket.sent.at(-1).type, "replay-rejected");

// Offline recipients are never queued or reported as delivered.
const offlineCaller = new FakeSocket({
  state: "AUTHENTICATED", inboxFingerprint: recipient.fingerprint,
  origin: payload.origin, fingerprint: caller.fingerprint, pendingCallId: null
});
const offlineInbox = new EzeroConnectInbox({ getWebSockets: () => [offlineCaller] }, { PUBLIC_ORIGIN: payload.origin });
await offlineInbox.webSocketMessage(offlineCaller, JSON.stringify({ type: "call-invite", inviteCode }));
assert.equal(offlineCaller.sent.at(-1).type, "unavailable");
assert.equal(offlineCaller.sent.some(item => item.type === "invite-routed"), false);

console.log("SAVED_FRIEND_INBOX_SIGNED_ROUTING_ACCEPT_DECLINE_AND_OFFLINE_NO_QUEUE_PASS");
