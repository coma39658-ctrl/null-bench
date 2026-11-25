import assert from "node:assert/strict";
import { createTrustedFriendCallController } from "../js/ezero_connect_trusted_friend_call_controller_v1.mjs";

const relationshipId = "a".repeat(64);
const localFingerprint = "11:".repeat(31) + "11";
const remoteFingerprint = "22:".repeat(31) + "22";
const callA = "A".repeat(32);
const callB = "B".repeat(32);
const callD = "D".repeat(32);

class FakeSession {
  constructor() { this.sent = []; this.listeners = new Set(); }
  send(type, payload) { this.sent.push({ type, payload }); }
  on(type, fn) { assert.equal(type, "message"); this.listeners.add(fn); return () => this.listeners.delete(fn); }
  async receive(type, payload, fromFingerprint = remoteFingerprint) {
    for (const fn of [...this.listeners]) fn({ type, payload, fromFingerprint });
    await new Promise(resolve => setImmediate(resolve));
  }
}
function makeTimers(clock) {
  let next = 1;
  const tasks = new Map();
  return {
    setTimer(fn, delay) { const id = next++; tasks.set(id, { fn, at: clock.value + delay }); return id; },
    clearTimer(id) { tasks.delete(id); },
    advance(ms) {
      clock.value += ms;
      for (const [id, task] of [...tasks]) if (task.at <= clock.value) { tasks.delete(id); task.fn(); }
    }
  };
}
function trustApi(remote = remoteFingerprint) {
  return { async getTrustedContact(id) { return { status: "TRUSTED", relationshipId: id, remoteFingerprint: remote }; } };
}
const identityApi = { async getPublicIdentity() { return { fingerprint: localFingerprint }; } };
function mediaFactoryLog(log) {
  return options => ({
    async start() {
      log.push({ action: "start", role: options.role, mode: options.mode, callId: options.callId });
      options.onState({ state: "connection", connectionState: "connected" });
    },
    close(notify) { log.push({ action: "close", notify }); options.onState({ state: "closed" }); }
  });
}

const clock = { value: 1_000_000 };
const timers = makeTimers(clock);
const session = new FakeSession();
const mediaLog = [];
const callStates = [];
const generatedCallIds = [callA, callD];
const controller = createTrustedFriendCallController({
  signalingSession: session, relationshipId, trustApi: trustApi(), identityApi,
  callIdFactory: () => generatedCallIds.shift(), now: () => clock.value,
  setTimer: timers.setTimer, clearTimer: timers.clearTimer,
  mediaCallFactory: mediaFactoryLog(mediaLog),
  onState: value => callStates.push(value)
});
await controller.ready;
assert.equal(controller.state, "idle");

const outgoing = await controller.call("audio");
assert.equal(outgoing.callId, callA);
assert.equal(session.sent.at(-1).type, "call-invite");
assert.equal(session.sent.at(-1).payload.mode, "audio");
assert.equal(mediaLog.length, 0, "outgoing call must wait for matching acceptance");
await session.receive("call-accept", { callId: callB });
assert.equal(mediaLog.length, 0, "acceptance for another call must be ignored");
await session.receive("call-accept", { callId: callA }, "33:".repeat(31) + "33");
assert.equal(mediaLog.length, 0, "untrusted fingerprint must be ignored");
await session.receive("call-accept", { callId: callA });
assert.deepEqual(mediaLog[0], { action: "start", role: "caller", mode: "audio", callId: callA });
assert.equal(controller.state, "connected", "WebRTC connectionState=connected must update call control state");
assert.ok(callStates.some(value => value.state === "connected"), "media detail must not overwrite the authoritative connected call state");
await session.receive("call-hangup", { callId: callB });
assert.equal(controller.state, "starting-media", "hangup for another call must be ignored");
await session.receive("call-hangup", { callId: callA });
assert.equal(controller.state, "ended");
const secondCall = await controller.call("video");
assert.equal(secondCall.mode, "video", "same saved friend can be called again after hangup");
assert.equal(secondCall.callId, callD, "each call must receive a fresh call ID");
await session.receive("call-decline", { callId: callD });
assert.equal(controller.state, "declined");
controller.close();
assert.equal(controller.state, "closed");

const incomingSession = new FakeSession();
const incomingLog = [];
const incomingStates = [];
const incoming = createTrustedFriendCallController({
  signalingSession: incomingSession, relationshipId, trustApi: trustApi(), identityApi,
  callIdFactory: () => callB, now: () => clock.value,
  setTimer: timers.setTimer, clearTimer: timers.clearTimer,
  mediaCallFactory: mediaFactoryLog(incomingLog),
  onState: value => incomingStates.push(value)
});
await incoming.ready;
await incomingSession.receive("call-invite", { callId: callB, mode: "video", expiresAt: clock.value + 30_000 });
assert.equal(incoming.state, "incoming");
assert.equal(incomingLog.length, 0, "incoming invite must not request media before explicit accept");
await incoming.accept();
assert.equal(incomingSession.sent.at(-1).type, "call-accept");
assert.deepEqual(incomingLog[0], { action: "start", role: "callee", mode: "video", callId: callB });
assert.equal(incoming.state, "connected", "callee WebRTC connectionState=connected must update call control state");
assert.ok(incomingStates.some(value => value.state === "connected"), "callee emits the authoritative connected state");
incoming.hangup();
assert.equal(incoming.state, "ended");
incoming.close();

const expirySession = new FakeSession();
const expiry = createTrustedFriendCallController({
  signalingSession: expirySession, relationshipId, trustApi: trustApi(), identityApi,
  now: () => clock.value, setTimer: timers.setTimer, clearTimer: timers.clearTimer
});
await expiry.ready;
await expirySession.receive("call-invite", { callId: callA, mode: "audio", expiresAt: clock.value + 5_000 });
assert.equal(expiry.state, "incoming");
timers.advance(5_000);
assert.equal(expiry.state, "expired", "unanswered invite must expire locally");
await assert.rejects(() => expiry.accept(), /TRUSTED_CALL_NO_INCOMING_INVITE/);
expiry.close();

const cancelSession = new FakeSession();
const cancelledInvite = createTrustedFriendCallController({
  signalingSession: cancelSession, relationshipId, trustApi: trustApi(), identityApi,
  now: () => clock.value, setTimer: timers.setTimer, clearTimer: timers.clearTimer
});
await cancelledInvite.ready;
await cancelSession.receive("call-invite", { callId: callD, mode: "audio", expiresAt: clock.value + 10_000 });
assert.equal(cancelledInvite.state, "incoming");
await cancelSession.receive("call-decline", { callId: callD });
assert.equal(cancelledInvite.state, "ended", "caller cancellation must dismiss the incoming call UI");
cancelledInvite.close();

const untrustedSession = new FakeSession();
const untrusted = createTrustedFriendCallController({
  signalingSession: untrustedSession, relationshipId,
  trustApi: { async getTrustedContact() { return { status: "PENDING", relationshipId, remoteFingerprint }; } },
  identityApi
});
await assert.rejects(() => untrusted.ready, /TRUSTED_CALL_CONTACT_NOT_VERIFIED/);
untrusted.close();

console.log("PASS only the mutually trusted saved-friend fingerprint can control calls");
console.log("PASS outgoing calls start media only after matching call acceptance");
console.log("PASS incoming calls request no media before explicit accept");
console.log("PASS mismatched call IDs and untrusted senders are ignored");
console.log("PASS invite expiry, remote invite cancellation, decline, hangup, repeat-call and cleanup are enforced");
console.log("PASS unverified contacts cannot start call control");
