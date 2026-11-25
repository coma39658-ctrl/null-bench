import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../js/ezero_connect_media_v1.js", import.meta.url), "utf8");

function harness() {
  const fingerprintA = "AA:".repeat(31) + "AA";
  const fingerprintB = "BB:".repeat(31) + "BB";
  const calls = [];
  const signals = [];
  const sockets = [];
  const identity = { getPublicIdentity: async () => ({ fingerprint: fingerprintA, publicKeySpki: "spki-A" }) };
  const trust = { getTrustedPeerForCall: async fp => fp === fingerprintB
    ? { relationshipId: "relationship_1234567890", remoteFingerprint: fingerprintB, remotePublicKeySpki: "spki-B", displayName: "Friend" }
    : null };
  const savedCalls = {
    connectInbox: options => {
      const socket = {
        options, ready: Promise.resolve(), authenticated: true, closed: false,
        sendCallInvite: code => calls.push(["invite", code]),
        respondToCall: (id, decision) => calls.push(["response", id, decision]),
        sendRoomInvite: (id, code) => calls.push(["room", id, code]),
        cancelCall: id => calls.push(["cancel", id]),
        close() { this.closed = true; }
      };
      calls.push(["inbox", options.inboxFingerprint]);
      sockets.push(socket);
      return socket;
    },
    createCallInvite: async ({ recipientFingerprint, mode }) => ({
      inviteCode: "EZERO-CALL1.signed", callId: "A".repeat(32), mode,
      recipientFingerprint, relationshipId: "relationship_1234567890"
    }),
    verifyIncomingCallInvite: async () => ({
      callId: "B".repeat(32), mode: "audio", callerFingerprint: fingerprintB,
      relationshipId: "relationship_1234567890", callerName: "Friend"
    }),
    createRoomInviteForAcceptedCall: async () => ({
      callId: "A".repeat(32), inviteCode: "EZERO1.room", invite: {
        origin: "https://staging.example", roomId: "R".repeat(32), nonce: "N".repeat(32),
        expiresAt: Date.now() + 60_000
      }
    }),
    verifyRoomInviteForAcceptedCall: async () => ({
      origin: "https://staging.example", roomId: "R".repeat(32), nonce: "N".repeat(32),
      expiresAt: Date.now() + 60_000
    })
  };
  const signal = {
    connect: options => {
      const connection = {
        options, ready: Promise.resolve(), authenticated: true, closed: false,
        send: (type, payload) => signals.push([type, payload]),
        close() { this.closed = true; }
      };
      signals.push(["connect", options.role]);
      return connection;
    }
  };
  class FakePeerConnection {}
  class FakeWebSocket {}
  const context = {
    crypto: webcrypto, isSecureContext: true, location: { origin: "https://staging.example" },
    EZERO_CONNECT_IDENTITY: identity, EZERO_CONNECT_TRUST: trust,
    EZERO_CONNECT_SAVED_CALLS: savedCalls, EZERO_CONNECT_SIGNAL: signal,
    EZERO_CONNECT_INVITES: {}, EZERO_CONNECT_CONFIG: { signalingUrl: "wss://signal.example" },
    RTCPeerConnection: FakePeerConnection, WebSocket: FakeWebSocket,
    setTimeout, clearTimeout, URL, TextEncoder, TextDecoder, Uint8Array, atob, btoa,
    navigator: { mediaDevices: { getUserMedia: async () => { throw new Error("MEDIA_MUST_NOT_START_BEFORE_PEER_VERIFICATION"); } } },
    onIncoming: null, statuses: []
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "ezero_connect_media_v1.js" });
  return { context, calls, signals, sockets, fingerprintA, fingerprintB };
}

{
  const h = harness();
  const manager = h.context.EZERO_CONNECT_MEDIA.createManager({
    onStatus: value => h.context.statuses.push(value)
  });
  await manager.listen();
  assert.equal(h.sockets.length, 1);
  assert.equal(h.sockets[0].options.inboxFingerprint, h.fingerprintA);

  await manager.call({ recipientFingerprint: h.fingerprintB, mode: "audio" });
  assert.equal(h.sockets.length, 2);
  const outgoing = h.sockets[1];
  assert.ok(h.calls.some(item => item[0] === "invite" && item[1] === "EZERO-CALL1.signed"));
  assert.equal(manager.activeCall.mode, "audio");

  await outgoing.options.onEvent({ type: "call-response", callId: "A".repeat(32), decision: "accept" });
  assert.ok(h.signals.some(item => item[0] === "connect" && item[1] === "host"));
  assert.ok(h.calls.some(item => item[0] === "room" && item[1] === "A".repeat(32) && item[2] === "EZERO1.room"));
  manager.dispose();
}

{
  const h = harness();
  const incoming = [];
  const manager = h.context.EZERO_CONNECT_MEDIA.createManager({
    onIncomingCall: controls => incoming.push(controls)
  });
  await manager.listen();
  const listener = h.sockets[0];
  await listener.options.onEvent({ type: "incoming-call", inviteCode: "EZERO-CALL1.incoming" });
  assert.equal(incoming.length, 1);
  assert.equal(h.calls.some(item => item[0] === "response"), false,
    "incoming call must not be accepted automatically");
  await incoming[0].accept();
  assert.ok(h.calls.some(item => item[0] === "response" && item[2] === "accept"));
  await listener.options.onEvent({ type: "call-room-invite", callId: "B".repeat(32), inviteCode: "EZERO1.room" });
  assert.ok(h.signals.some(item => item[0] === "connect" && item[1] === "guest"));
  assert.equal(manager.activeCall.mode, "audio");
  manager.dispose();
}

const html = await readFile(new URL("../ezero-connect-app.html", import.meta.url), "utf8");
assert.match(html, /ezero_connect_saved_calls_v1\.js/);
assert.match(html, /ezero_connect_media_v1\.js/);
assert.match(html, /ezero_connect_media_ui_v1\.js/);
const ui = await readFile(new URL("../js/ezero_connect_media_ui_v1.js", import.meta.url), "utf8");
assert.match(ui, /incoming\.accept\(\)/);
assert.match(ui, /incoming\.decline\(\)/);
assert.match(ui, /manager\.call\(\{ recipientFingerprint: selectedFingerprint, mode \}\)/);
console.log("SAVED_FRIEND_MEDIA_CLIENT_UI_CONTRACT_PASS");
