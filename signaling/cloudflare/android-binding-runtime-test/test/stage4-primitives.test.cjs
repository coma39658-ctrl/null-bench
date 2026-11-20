"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {ownerDurableObjectName, fixedUtcWindow, quotaCounterKey} =
  require("../src/android_binding_stage4_primitives_v1.cjs");

const OWNER = "a".repeat(64);

test("owner Durable Object name is deterministic and owner-scoped", () => {
  assert.equal(ownerDurableObjectName(OWNER), "android-binding-v1:" + OWNER);
  assert.equal(ownerDurableObjectName(OWNER), ownerDurableObjectName(OWNER));
  assert.notEqual(ownerDurableObjectName(OWNER), ownerDurableObjectName("b".repeat(64)));
});

test("owner partition rejects malformed and uppercase fingerprints", () => {
  for (const bad of [null, "", "A".repeat(64), "a".repeat(63), "g".repeat(64), 7]) {
    assert.throws(() => ownerDurableObjectName(bad), {message:"INVALID_OWNER_FINGERPRINT"});
  }
});

test("fixed UTC window exposes exact exclusive boundary", () => {
  assert.deepEqual(fixedUtcWindow(599, 600), {
    index:0, startEpochSeconds:0, endEpochSeconds:600, retryAfterEpochSeconds:600
  });
  assert.deepEqual(fixedUtcWindow(600, 600), {
    index:1, startEpochSeconds:600, endEpochSeconds:1200, retryAfterEpochSeconds:1200
  });
  assert.deepEqual(fixedUtcWindow(86400, 86400), {
    index:1, startEpochSeconds:86400, endEpochSeconds:172800,
    retryAfterEpochSeconds:172800
  });
});

test("quota keys are stable, owner-specific, and window-specific", () => {
  const w0 = fixedUtcWindow(10, 600);
  const w1 = fixedUtcWindow(610, 600);
  const key = quotaCounterKey(OWNER, "challenge-10m", w0);
  assert.equal(key, quotaCounterKey(OWNER, "challenge-10m", w0));
  assert.notEqual(key, quotaCounterKey("b".repeat(64), "challenge-10m", w0));
  assert.notEqual(key, quotaCounterKey(OWNER, "challenge-10m", w1));
  assert.notEqual(key, quotaCounterKey(OWNER, "revocation-10m", w0));
});

test("window and quota inputs fail closed", () => {
  for (const [now, width] of [[-1,600],[1.2,600],[1,0],[1,86401],[1,NaN]]) {
    assert.throws(() => fixedUtcWindow(now, width));
  }
  assert.throws(() => quotaCounterKey(OWNER, "unknown", fixedUtcWindow(1,600)),
    {message:"INVALID_QUOTA_NAME"});
});
