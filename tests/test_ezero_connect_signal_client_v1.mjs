import assert from "node:assert/strict";

const sentSignatures = [];
globalThis.location = { origin: "https://ezero-connect-staging.invalid" };
class FakeWebSocket {
  static OPEN = 1;
  constructor(url) {
    this.url = url;
    this.readyState = 1;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.last = this;
    queueMicrotask(() => this.dispatch("message", { data: JSON.stringify({
      type: "challenge",
      roomId: "A".repeat(32),
      role: "host",
      challenge: "C".repeat(43),
      challengeExpiresAt: Date.now() + 20_000
    }) }));
  }
  addEventListener(type, callback) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(callback);
  }
  dispatch(type, event) {
    for (const callback of this.listeners.get(type) || []) callback(event);
  }
  send(raw) {
    this.sent.push(raw);
    const message = JSON.parse(raw);
    if (message.type === "hello") {
      queueMicrotask(() => this.dispatch("message", { data: JSON.stringify({
        type: "hello-accepted", role: "host", roomId: "A".repeat(32), expiresAt: Date.now() + 500_000
      }) }));
    }
  }
  close(code = 1000) {
    this.readyState = 3;
    this.dispatch("close", { code });
  }
}
globalThis.WebSocket = FakeWebSocket;
globalThis.EZERO_CONNECT_IDENTITY = {
  async getPublicIdentity() {
    return { fingerprint: "AA:".repeat(31) + "AA", publicKeySpki: "c3BraQ" };
  },
  async signCanonical(payload) {
    sentSignatures.push(payload);
    return "c2ln";
  }
};

await import("../js/ezero_connect_signal_client_v1.js");
const invitePayload = {
  origin: location.origin,
  roomId: "A".repeat(32),
  nonce: "N".repeat(32),
  expiresAt: Date.now() + 80_000
};
const events = [];
const connection = globalThis.EZERO_CONNECT_SIGNAL.connect({
  inviteCode: "EZERO1.test",
  invitePayload,
  role: "host",
  signalingBaseUrl: "https://signal.example.test",
  onEvent: event => events.push(event)
});
await connection.ready;
const primarySocket = FakeWebSocket.last;
assert.equal(connection.authenticated, true);
assert.equal(FakeWebSocket.last.url, "wss://signal.example.test/v1/rooms/" + invitePayload.roomId + "?role=host");
const directWss = globalThis.EZERO_CONNECT_SIGNAL.connect({
  inviteCode: "EZERO1.test",
  invitePayload,
  role: "host",
  signalingBaseUrl: "wss://secure-signal.example.test"
});
await directWss.ready;
assert.equal(FakeWebSocket.last.url, "wss://secure-signal.example.test/v1/rooms/" + invitePayload.roomId + "?role=host");
assert.throws(() => globalThis.EZERO_CONNECT_SIGNAL.connect({
  inviteCode: "EZERO1.test",
  invitePayload,
  role: "host",
  signalingBaseUrl: "ws://public-signal.example.test"
}), /SIGNAL_TLS_REQUIRED/);
directWss.close();
assert.equal(sentSignatures.length, 2);
assert.equal(sentSignatures[0].protocol, "E-ZERO-SIGNAL-HELLO-1");
assert.equal(sentSignatures[0].origin, location.origin);
assert.equal(sentSignatures[0].role, "host");
assert.equal(primarySocket.sent.length, 1);
assert.equal(JSON.parse(primarySocket.sent[0]).type, "hello");
connection.send("call-invite", { mode: "video" });
assert.equal(JSON.parse(primarySocket.sent[1]).payload.mode, "video");
assert.throws(() => connection.send("clear-dtc", {}), /SIGNAL_MESSAGE_NOT_ALLOWED/);
assert.throws(() => connection.send("offer", { sdp: "x".repeat(17_000) }), /SIGNAL_MESSAGE_TOO_LARGE/);
connection.close();
assert.equal(connection.closed, true);
assert.ok(events.some(event => event.type === "hello-accepted"));
console.log("EZERO_SIGNAL_CLIENT_SIGNED_HANDSHAKE_AND_ALLOWLIST_PASS");
