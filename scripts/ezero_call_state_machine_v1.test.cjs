"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createCallState, transitionCall, TERMINAL } = require("./ezero_call_state_machine_v1.cjs");

function state() {
  return createCallState({ callId: "call-A", recipientDeviceId: "device-B", expiresAt: 10_000 });
}
function send(s, type, at, extra = {}) {
  return transitionCall(s, {
    callId: "call-A", recipientDeviceId: "device-B",
    eventId: type + "-" + at, type, at, ...extra
  });
}
function advance(s, type, at, extra) {
  const result = send(s, type, at, extra);
  assert.equal(result.accepted, true, result.reason);
  return result.state;
}

test("requires valid initial identity and expiry", () => {
  assert.throws(() => createCallState({ callId: "", recipientDeviceId: "d", expiresAt: 1 }));
  assert.throws(() => createCallState({ callId: "c", recipientDeviceId: "d", expiresAt: 0 }));
});
test("follows the only successful call path", () => {
  let s = state();
  s = advance(s, "DELIVER", 1);
  s = advance(s, "RING", 2);
  s = advance(s, "ACCEPT", 3, { explicitConsent: true });
  s = advance(s, "JOIN", 4);
  s = advance(s, "CONNECT", 5);
  s = advance(s, "END", 6);
  assert.equal(s.status, "ENDED");
  assert.ok(TERMINAL.has(s.status));
});
test("rejects accept without explicit recipient consent", () => {
  let s = advance(state(), "DELIVER", 1);
  s = advance(s, "RING", 2);
  const result = send(s, "ACCEPT", 3);
  assert.equal(result.reason, "EXPLICIT_ACCEPT_REQUIRED");
  assert.equal(result.state.status, "RINGING");
});
test("rejects wrong call and wrong recipient", () => {
  const s = state();
  assert.equal(transitionCall(s, { callId: "other", recipientDeviceId: "device-B", eventId: "x", type: "DELIVER", at: 1 }).reason, "CALL_ID_MISMATCH");
  assert.equal(transitionCall(s, { callId: "call-A", recipientDeviceId: "device-C", eventId: "x", type: "DELIVER", at: 1 }).reason, "RECIPIENT_MISMATCH");
});
test("duplicate event is idempotent", () => {
  const s = state();
  const e = { callId: "call-A", recipientDeviceId: "device-B", eventId: "same", type: "DELIVER", at: 1 };
  const first = transitionCall(s, e);
  const second = transitionCall(first.state, e);
  assert.equal(first.state.status, "DELIVERED");
  assert.equal(second.duplicate, true);
  assert.equal(second.state, first.state);
});
test("rejects stale and out-of-order events", () => {
  const s = advance(advance(state(), "DELIVER", 10), "RING", 20);
  assert.equal(send(s, "ACCEPT", 19, { explicitConsent: true }).reason, "STALE_EVENT");
  assert.equal(send(s, "CONNECT", 21).reason, "TRANSITION_NOT_ALLOWED");
});
test("rejects events at or after expiry and accepts expiry event only at boundary", () => {
  const s = advance(state(), "DELIVER", 1);
  assert.equal(send(s, "RING", 10_000).reason, "INVITATION_EXPIRED");
  const expiry = send(s, "EXPIRE", 10_000);
  assert.equal(expiry.accepted, true);
  assert.equal(expiry.state.status, "EXPIRED");
  assert.equal(send(s, "EXPIRE", 9_999).reason, "EXPIRY_TOO_EARLY");
});
test("terminal outcomes cannot be changed by late events", () => {
  for (const type of ["REJECT", "CANCEL", "FAIL"]) {
    let s = state();
    if (type === "REJECT") s = advance(advance(s, "DELIVER", 1), "RING", 2);
    const terminal = send(s, type, 3);
    assert.equal(terminal.accepted, true);
    assert.equal(send(terminal.state, "DELIVER", 4).reason, "CALL_ALREADY_TERMINAL");
  }
});
test("a call cannot connect without accepted and joining states", () => {
  const s = advance(state(), "DELIVER", 1);
  assert.equal(send(s, "CONNECT", 2).reason, "TRANSITION_NOT_ALLOWED");
});
test("rejects malformed event identifiers and timestamps", () => {
  const s = state();
  assert.equal(transitionCall(s, { callId: "call-A", recipientDeviceId: "device-B", eventId: "", type: "DELIVER", at: 1 }).reason, "EVENT_ID_INVALID");
  assert.equal(transitionCall(s, { callId: "call-A", recipientDeviceId: "device-B", eventId: "x", type: "DELIVER", at: NaN }).reason, "EVENT_TIME_INVALID");
});
