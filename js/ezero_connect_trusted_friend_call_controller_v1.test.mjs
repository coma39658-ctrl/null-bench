import test from "node:test";
import assert from "node:assert/strict";
import { createTrustedFriendCallController } from "./ezero_connect_trusted_friend_call_controller_v1.mjs";

const local = "01:" + "AA:".repeat(30) + "AA";
const remote = "02:" + "BB:".repeat(30) + "BB";
const callId = "0123456789abcdefghijklmnopqrstuv";

function harness() {
  const listeners = new Set();
  const sent = [];
  const timers = new Map();
  let timerId = 0;
  const signalingSession = {
    on(name, fn) { assert.equal(name, "message"); listeners.add(fn); return () => listeners.delete(fn); },
    send(type, payload) { sent.push({ type, payload }); }
  };
  const trustApi = { async getTrustedContact(id) {
    return { status: "TRUSTED", relationshipId: id, remoteFingerprint: remote };
  }};
  const identityApi = { async getPublicIdentity() { return { fingerprint: local }; }};
  const mediaStarts = [];
  const mediaCallFactory = opts => ({
    async start() { mediaStarts.push(opts); return { state: "started" }; },
    close(notify) { mediaStarts.push({ closed: true, notify }); }
  });
  const controller = createTrustedFriendCallController({
    signalingSession, relationshipId: "a".repeat(64), trustApi, identityApi,
    mediaCallFactory, callIdFactory: () => callId,
    mediaDevices: { getUserMedia: async () => { throw new Error("not used by fake media"); } },
    RTCPeerConnectionImpl: function FakePeer() {},
    mediaStartTimeoutMs: 5000,
    setTimer(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimer(id) { timers.delete(id); }
  });
  return {
    controller, sent, mediaStarts, timers,
    async receive(type, payload, fromFingerprint = remote) {
      for (const fn of [...listeners]) await fn({ type, payload, fromFingerprint });
    }
  };
}

test("saved-friend call controller is already authenticated before ready", async () => {
  const h = harness();
  const ready = await h.controller.ready;
  assert.equal(ready.state, "ready");
  assert.equal(h.controller.state, "idle");
  h.controller.close();
});

test("outgoing call waits for recipient acceptance before media starts", async () => {
  const h = harness();
  await h.controller.ready;
  const invite = await h.controller.call("audio");
  assert.equal(invite.callId, callId);
  assert.equal(h.sent[0].type, "call-invite");
  assert.equal(h.mediaStarts.length, 0);
  await h.receive("call-accept", { callId });
  assert.equal(h.controller.state, "starting-media");
  assert.equal(h.mediaStarts.length, 1);
  assert.equal(h.mediaStarts[0].role, "caller");
  h.controller.close();
});

test("incoming call starts media only after explicit accept action", async () => {
  const h = harness();
  await h.controller.ready;
  await h.receive("call-invite", { callId, mode: "video", expiresAt: Date.now() + 30_000 });
  assert.equal(h.controller.state, "incoming");
  assert.equal(h.mediaStarts.length, 0);
  await h.controller.accept();
  assert.equal(h.sent.some(x => x.type === "call-accept" && x.payload.callId === callId), true);
  assert.equal(h.mediaStarts.length, 1);
  assert.equal(h.mediaStarts[0].role, "callee");
  h.controller.close();
});

test("duplicate incoming invite while busy is declined without replacing active call", async () => {
  const h = harness();
  await h.controller.ready;
  await h.receive("call-invite", { callId, mode: "audio", expiresAt: Date.now() + 30_000 });
  await h.receive("call-invite", { callId: "abcdefghijklmnop0123456789ABCDEF", mode: "video", expiresAt: Date.now() + 30_000 });
  assert.equal(h.controller.callId, callId);
  assert.equal(h.sent.some(x => x.type === "call-decline" && x.payload.callId === "abcdefghijklmnop0123456789ABCDEF"), true);
  h.controller.close();
});

test("untrusted sender, expired invite and malformed mode are ignored", async () => {
  const h = harness();
  await h.controller.ready;
  await h.receive("call-invite", { callId, mode: "audio", expiresAt: Date.now() + 30_000 }, "03:" + "CC:".repeat(30) + "CC");
  assert.equal(h.controller.state, "idle");
  await h.receive("call-invite", { callId, mode: "audio", expiresAt: Date.now() - 1 });
  await h.receive("call-invite", { callId, mode: "screen-share", expiresAt: Date.now() + 30_000 });
  assert.equal(h.controller.state, "idle");
  h.controller.close();
});

test("media startup has a bounded timeout and fails closed", async () => {
  const h = harness();
  await h.controller.ready;
  await h.receive("call-invite", { callId, mode: "audio", expiresAt: Date.now() + 30_000 });
  await h.controller.accept();
  const pending = [...h.timers.values()][0];
  assert.equal(typeof pending, "function");
  pending();
  assert.equal(h.controller.state, "failed");
  h.controller.close();
});

test("second accept cannot create a second media session", async () => {
  const h = harness();
  await h.controller.ready;
  await h.receive("call-invite", { callId, mode: "audio", expiresAt: Date.now() + 30_000 });
  await h.controller.accept();
  await assert.rejects(h.controller.accept(), /TRUSTED_CALL_NO_INCOMING_INVITE/);
  assert.equal(h.mediaStarts.length, 1);
  h.controller.close();
});
