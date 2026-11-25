"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateIncomingCallPush, notificationOptions, MAX_TTL_MS } = require("../js/ezero_push_contract_v1.js");

const now = 1_800_000_000_000;
const valid = { v: 1, type: "incoming-call", requestId: "A".repeat(24), issuedAt: now, expiresAt: now + 30_000, mode: "audio" };

test("accepts a minimal, unexpired audio request", () => {
  assert.equal(validateIncomingCallPush(valid, now).mode, "audio");
});
test("accepts video and caps the invite lifetime at 90 seconds", () => {
  assert.equal(validateIncomingCallPush({ ...valid, mode: "video", expiresAt: now + MAX_TTL_MS }, now).mode, "video");
  assert.equal(validateIncomingCallPush({ ...valid, expiresAt: now + MAX_TTL_MS + 1 }, now), null);
});
test("rejects expired, future-issued, malformed and unknown fields", () => {
  assert.equal(validateIncomingCallPush({ ...valid, expiresAt: now }, now), null);
  assert.equal(validateIncomingCallPush({ ...valid, issuedAt: now + 5_001 }, now), null);
  assert.equal(validateIncomingCallPush({ ...valid, requestId: "short" }, now), null);
  assert.equal(validateIncomingCallPush({ ...valid, sdp: "private media offer" }, now), null);
});
test("rejects unsupported modes and unexpected envelope types", () => {
  assert.equal(validateIncomingCallPush({ ...valid, mode: "screen-share" }, now), null);
  assert.equal(validateIncomingCallPush({ ...valid, type: "message" }, now), null);
});
test("notification is generic and carries no auto-answer action or caller content", () => {
  const options = notificationOptions(valid, now);
  assert.match(options.body, /review the call request/i);
  assert.deepEqual(options.actions.map(x => x.action), ["open", "dismiss"]);
  assert.equal(options.data.requestId, valid.requestId);
  assert.equal("sdp" in options.data, false);
  assert.equal(notificationOptions({ ...valid, expiresAt: now - 1 }, now), null);
});
