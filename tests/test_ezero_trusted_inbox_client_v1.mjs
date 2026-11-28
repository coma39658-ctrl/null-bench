import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  EzeroTrustedInboxClient,
  canonicalInboxJson
} from "../signaling/ezero-connect-v1/inbox_client_candidate.mjs";

globalThis.crypto ||= webcrypto;

function b64url(bytes) {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
function colonFingerprint(bytes) {
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
class FakeWebSocket {
  static last;
  constructor(url) { this.url = url; this.readyState = 1; this.listeners = new Map(); this.sent = []; FakeWebSocket.last = this; }
  addEventListener(type, fn) { const list = this.listeners.get(type) || []; list.push(fn); this.listeners.set(type, list); }
  emit(type, data) { for (const fn of this.listeners.get(type) || []) fn({ data }); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.readyState = 3; this.emit("close"); }
}

const generated = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const spki = new Uint8Array(await crypto.subtle.exportKey("spki", generated.publicKey));
const pkcs8 = await crypto.subtle.exportKey("pkcs8", generated.privateKey);
const privateKey = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
const fingerprint = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
const fingerprintColon = colonFingerprint(digest);
const identity = {
  fingerprint,
  spki: b64url(spki),
  keys: { privateKey }
};
const events = [];
const client = new EzeroTrustedInboxClient({
  websocketOrigin: "wss://isolated-inbox.example",
  origin: "https://ezero-staging.example",
  identityProvider: async () => identity,
  WebSocketImpl: FakeWebSocket,
  onEvent: event => events.push(event)
});
const target = "AB:".repeat(31) + "CD";
const opening = client.openInbox(target);
await new Promise(resolve => { const wait = () => FakeWebSocket.last ? resolve() : setImmediate(wait); wait(); });
const socket = FakeWebSocket.last;
assert.equal(socket.url, "wss://isolated-inbox.example/v1/inbox/" + target);

const challengeBytes = crypto.getRandomValues(new Uint8Array(32));
const challenge = b64url(challengeBytes);
const challengeExpiresAt = Date.now() + 20000;
socket.emit("message", JSON.stringify({
  type: "challenge",
  payload: {
    v: 1,
    protocol: "E-ZERO-INBOX-HELLO-1",
    origin: "https://ezero-staging.example",
    inboxFingerprint: target,
    challenge,
    challengeExpiresAt
  }
}));
await new Promise(resolve => { const wait = () => socket.sent.length ? resolve() : setImmediate(wait); wait(); });
assert.equal(socket.sent.length, 1);
const hello = socket.sent[0];
assert.deepEqual(Object.keys(hello).sort(), ["fingerprint", "publicKeySpki", "signature", "type"]);
assert.equal(hello.type, "hello");
assert.equal(hello.fingerprint, fingerprintColon);
assert.equal(hello.publicKeySpki, identity.spki);
const transcript = {
  v: 1,
  protocol: "E-ZERO-INBOX-HELLO-1",
  origin: "https://ezero-staging.example",
  fingerprint: fingerprintColon,
  inboxFingerprint: target,
  challenge,
  challengeExpiresAt
};
const importedPublic = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
assert.equal(await crypto.subtle.verify(
  { name: "ECDSA", hash: "SHA-256" },
  importedPublic,
  Uint8Array.from(atob(hello.signature.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - hello.signature.length % 4) % 4)), c => c.charCodeAt(0)),
  new TextEncoder().encode(canonicalInboxJson(transcript))
), true);
socket.emit("message", JSON.stringify({ type: "inbox-ready", fingerprint: fingerprintColon }));
assert.equal(await opening, client);
assert.equal(events[0].type, "inbox-online");

client.respondToCall("0123456789abcdefghijklmnopqrstuv", "accept");
assert.deepEqual(socket.sent.at(-1), {
  type: "call-response", callId: "0123456789abcdefghijklmnopqrstuv", decision: "accept"
});
client.sendRoomInvite("0123456789abcdefghijklmnopqrstuv", "EZERO1." + "A".repeat(80));
assert.equal(socket.sent.at(-1).type, "call-room-invite");
assert.throws(() => client.respondToCall("bad", "accept"), /INBOX_RESPONSE_INVALID/);
assert.throws(() => client.sendRoomInvite("bad", "EZERO1.valid"), /INBOX_ROOM_INVITE_INVALID/);
client.close();

const badClient = new EzeroTrustedInboxClient({
  websocketOrigin: "wss://isolated-inbox.example",
  origin: "https://ezero-staging.example",
  identityProvider: async () => identity,
  WebSocketImpl: FakeWebSocket
});
const badOpening = badClient.openInbox(target);
await new Promise(resolve => { const wait = () => FakeWebSocket.last ? resolve() : setImmediate(wait); wait(); });
const badSocket = FakeWebSocket.last;
badSocket.emit("message", JSON.stringify({
  type: "challenge",
  payload: {
    v: 1, protocol: "E-ZERO-INBOX-HELLO-1",
    origin: "https://attacker.example",
    inboxFingerprint: target, challenge,
    challengeExpiresAt: Date.now() + 20000
  }
}));
await assert.rejects(badOpening, /INBOX_CHALLENGE_INVALID/);
assert.equal(badSocket.readyState, 3);

console.log("TRUSTED_INBOX_V1_CLIENT_HANDSHAKE_AND_STRICT_FRAME_TESTS_PASS");
