/* E-ZERO Android binding Stage 4 primitives.
 * Pure deterministic helpers only: no storage, Worker route, or deployment.
 */
"use strict";

const OWNER_FINGERPRINT = /^[0-9a-f]{64}$/;

function assertOwnerFingerprint(value) {
  if (typeof value !== "string" || !OWNER_FINGERPRINT.test(value))
    throw new Error("INVALID_OWNER_FINGERPRINT");
  return value;
}

/**
 * Stable per-owner Durable Object name. Call ONLY after verifying EZERO2
 * permanent owner proof. Never accept a client-supplied DO name or ID.
 */
function ownerDurableObjectName(ownerFingerprint) {
  return "android-binding-v1:" + assertOwnerFingerprint(ownerFingerprint);
}

/**
 * Fixed UTC window calculation. Returns an integer window index and exact
 * exclusive end boundary; retryAfterEpochSeconds is the next window start.
 */
function fixedUtcWindow(nowEpochSeconds, windowSeconds) {
  if (!Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < 0)
    throw new Error("INVALID_NOW");
  if (!Number.isSafeInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86400)
    throw new Error("INVALID_WINDOW");
  const index = Math.floor(nowEpochSeconds / windowSeconds);
  const startEpochSeconds = index * windowSeconds;
  const endEpochSeconds = startEpochSeconds + windowSeconds;
  return Object.freeze({
    index,
    startEpochSeconds,
    endEpochSeconds,
    retryAfterEpochSeconds: endEpochSeconds
  });
}

function quotaCounterKey(ownerFingerprint, quotaName, window) {
  const owner = assertOwnerFingerprint(ownerFingerprint);
  if (quotaName !== "challenge-10m" && quotaName !== "challenge-utc-day" &&
      quotaName !== "revocation-10m") throw new Error("INVALID_QUOTA_NAME");
  if (!window || !Number.isSafeInteger(window.index) || window.index < 0)
    throw new Error("INVALID_WINDOW");
  return "android-bind:v1:quota:" + quotaName + ":" + owner + ":" + window.index;
}

module.exports = {ownerDurableObjectName, fixedUtcWindow, quotaCounterKey};
