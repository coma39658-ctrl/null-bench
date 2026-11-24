import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.crypto ||= webcrypto;
globalThis.isSecureContext = true;
globalThis.location = { origin: "https://ezero-staging.example" };

const canonical = value => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
};
const b64url = bytes => {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};
const fingerprint = async spki => {
  const digest = await crypto.subtle.digest("SHA-256", spki);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
};
async function makeIdentity() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = b64url(await crypto.subtle.exportKey("spki", pair.publicKey));
  const fp = await fingerprint(await crypto.subtle.exportKey("spki", pair.publicKey));
  return {
    fingerprint: fp,
    publicKeySpki: spki,
    signCanonical: async value => b64url(await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(canonical(value))
    ))
  };
}
const A = await makeIdentity();
const B = await makeIdentity();
const relationshipId = "relationship_1234567890";
let local = A;
let trustedPeer = { relationshipId, remoteFingerprint: B.fingerprint, remotePublicKeySpki: B.publicKeySpki, displayName: "Friend B" };
globalThis.EZERO_CONNECT_IDENTITY = {
  getPublicIdentity: async () => ({ fingerprint: local.fingerprint, publicKeySpki: local.publicKeySpki }),
  signCanonical: value => local.signCanonical(value)
};
globalThis.EZERO_CONNECT_TRUST = {
  getTrustedPeerForCall: async fp => fp === trustedPeer.remoteFingerprint ? trustedPeer : null
};
await import("../js/ezero_connect_saved_calls_v1.js");
const calls = globalThis.EZERO_CONNECT_SAVED_CALLS;

const outgoing = await calls.createCallInvite({ recipientFingerprint: B.fingerprint, mode: "video" });
assert.equal(outgoing.mode, "video");
assert.equal(outgoing.relationshipId, relationshipId);
assert.ok(outgoing.inviteCode.startsWith("EZERO-CALL1."));
local = B;
trustedPeer = { relationshipId, remoteFingerprint: A.fingerprint, remotePublicKeySpki: A.publicKeySpki, displayName: "Friend A" };
const incoming = await calls.verifyIncomingCallInvite(outgoing.inviteCode);
assert.equal(incoming.callerFingerprint, A.fingerprint);
assert.equal(incoming.callerName, "Friend A");
assert.equal(incoming.mode, "video");
await assert.rejects(() => calls.verifyIncomingCallInvite(outgoing.inviteCode), /REPLAYED/);

const decoded = JSON.parse(new TextDecoder().decode(Uint8Array.from(
  atob(outgoing.inviteCode.slice("EZERO-CALL1.".length).replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - outgoing.inviteCode.slice("EZERO-CALL1.".length).length % 4) % 4)),
  c => c.charCodeAt(0)
)));
decoded.payload.mode = "audio";
const tampered = "EZERO-CALL1." + b64url(new TextEncoder().encode(JSON.stringify(decoded)));
await assert.rejects(() => calls.verifyIncomingCallInvite(tampered), /SIGNATURE_INVALID|REPLAYED/);

await assert.rejects(() => calls.createRoomInviteForAcceptedCall({ call: { callId: outgoing.callId, mode: "video", accepted: false } }), /ACCEPT_REQUIRED/);
globalThis.EZERO_CONNECT_INVITES = {
  createInvite: async () => ({ inviteCode: "EZERO1.signed-room", inviterFingerprint: B.fingerprint, origin: location.origin, expiresAt: Date.now() + 60_000 }),
  verifyInvite: async () => ({ inviterFingerprint: A.fingerprint, inviterPublicKeySpki: A.publicKeySpki, origin: location.origin, expiresAt: Date.now() + 60_000 })
};
const room = await calls.createRoomInviteForAcceptedCall({ call: { callId: outgoing.callId, mode: "video", accepted: true } });
assert.equal(room.callId, outgoing.callId);
assert.equal(room.inviteCode, "EZERO1.signed-room");
const verifiedRoom = await calls.verifyRoomInviteForAcceptedCall({
  call: { callId: outgoing.callId, mode: "video", accepted: true, callerFingerprint: A.fingerprint, relationshipId },
  inviteCode: room.inviteCode
});
assert.equal(verifiedRoom.inviterFingerprint, A.fingerprint);

// Exercise the foreground inbox proof-of-possession handshake and allowlisted messages.
class FakeWebSocket {
  static OPEN = 1;
  constructor(url) { this.url = url; this.readyState = 1; this.listeners = {}; this.sent = []; FakeWebSocket.last = this; }
  addEventListener(type, callback) { (this.listeners[type] ||= []).push(callback); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.readyState = 3; for (const fn of this.listeners.close || []) fn({ code: 1000 }); }
  async receive(value) { for (const fn of this.listeners.message || []) await fn({ data: JSON.stringify(value) }); }
}
globalThis.WebSocket = FakeWebSocket;
local = B;
const inbox = calls.connectInbox({ signalingBaseUrl: "https://signal.example", inboxFingerprint: A.fingerprint });
assert.equal(FakeWebSocket.last.url, "wss://signal.example/v1/inbox/" + encodeURIComponent(A.fingerprint));
await FakeWebSocket.last.receive({ type: "challenge", payload: {
  v: 1, protocol: "E-ZERO-INBOX-HELLO-1", origin: location.origin,
  inboxFingerprint: A.fingerprint, challenge: "A".repeat(43), challengeExpiresAt: Date.now() + 20_000
}});
assert.equal(FakeWebSocket.last.sent[0].type, "hello");
assert.equal(FakeWebSocket.last.sent[0].fingerprint, B.fingerprint);
await FakeWebSocket.last.receive({ type: "inbox-ready", fingerprint: B.fingerprint });
await inbox.ready;
assert.equal(inbox.authenticated, true);
inbox.respondToCall("0123456789abcdefghijklmnopqrstuv", "accept");
assert.deepEqual(FakeWebSocket.last.sent.at(-1), {
  type: "call-response", callId: "0123456789abcdefghijklmnopqrstuv", decision: "accept"
});
inbox.sendRoomInvite("0123456789abcdefghijklmnopqrstuv", "EZERO1.example");
assert.equal(FakeWebSocket.last.sent.at(-1).type, "call-room-invite");
inbox.cancelCall("0123456789abcdefghijklmnopqrstuv");
assert.equal(FakeWebSocket.last.sent.at(-1).type, "call-cancel");
inbox.close();

console.log("SAVED_FRIEND_CALL_CLIENT_SIGNED_INVITE_TRUST_BINDING_ROOM_HANDOFF_AND_INBOX_AUTH_PASS");
