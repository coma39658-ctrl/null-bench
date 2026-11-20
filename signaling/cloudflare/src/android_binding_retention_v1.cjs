/* E-ZERO Android binding bounded-retention index V1.
 * Only temporary challenge, replay-tombstone and quota records are eligible.
 * Permanent active/revoked bindings are deliberately never indexed.
 */
"use strict";

const PREFIX = "android-bind:v1:expiry:";
const MAX_ALARM_BATCH = 100;
const EPOCH_PAD = 16;

function expiryForRecord(key, value) {
  if (typeof key !== "string" || !value || typeof value !== "object") return null;
  if (key.startsWith("android-bind:v1:challenge:") &&
      Number.isSafeInteger(value.expiresAtEpochSeconds) && value.expiresAtEpochSeconds >= 0) {
    return value.expiresAtEpochSeconds + 300;
  }
  if (key.startsWith("android-bind:v1:revocation:") &&
      Number.isSafeInteger(value.consumedAtEpochSeconds) && value.consumedAtEpochSeconds >= 0) {
    return value.consumedAtEpochSeconds + 600;
  }
  if (key.startsWith("android-bind:v1:quota:") &&
      Number.isSafeInteger(value.windowEndsAtEpochSeconds) && value.windowEndsAtEpochSeconds >= 0) {
    return value.windowEndsAtEpochSeconds + 300;
  }
  return null;
}

function hexUtf8(value) {
  return Array.from(new TextEncoder().encode(value), b => b.toString(16).padStart(2, "0")).join("");
}

function expiryIndexKey(expiresAtEpochSeconds, targetKey) {
  if (!Number.isSafeInteger(expiresAtEpochSeconds) || expiresAtEpochSeconds < 0 ||
      typeof targetKey !== "string" || !targetKey.startsWith("android-bind:v1:"))
    throw new Error("INVALID_RETENTION_INDEX");
  return PREFIX + String(expiresAtEpochSeconds).padStart(EPOCH_PAD, "0") + ":" + hexUtf8(targetKey);
}

function parseExpiryIndex(key, value) {
  if (typeof key !== "string" || !key.startsWith(PREFIX) ||
      !value || typeof value.targetKey !== "string" ||
      !Number.isSafeInteger(value.expiresAtEpochSeconds) || value.expiresAtEpochSeconds < 0)
    return null;
  const target = value.targetKey;
  if (!target.startsWith("android-bind:v1:challenge:") &&
      !target.startsWith("android-bind:v1:revocation:") &&
      !target.startsWith("android-bind:v1:quota:")) return null;
  return {targetKey:target, expiresAtEpochSeconds:value.expiresAtEpochSeconds};
}

async function cleanupExpiredBatch(storage, nowEpochSeconds) {
  if (!storage || typeof storage.list !== "function" ||
      typeof storage.transaction !== "function" ||
      !Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < 0)
    throw new Error("INVALID_RETENTION_STORAGE_OR_TIME");
  const indexes = await storage.list({prefix:PREFIX, limit:MAX_ALARM_BATCH});
  let deleted = 0;
  await storage.transaction(async tx => {
    for (const [indexKey, indexValue] of indexes) {
      const parsed = parseExpiryIndex(indexKey, indexValue);
      if (!parsed || parsed.expiresAtEpochSeconds > nowEpochSeconds) break;
      const current = await tx.get(parsed.targetKey);
      if (expiryForRecord(parsed.targetKey, current) === parsed.expiresAtEpochSeconds) {
        await tx.delete(parsed.targetKey);
      }
      await tx.delete(indexKey);
      deleted += 1;
    }
  });
  return Object.freeze({deleted, batchLimit:MAX_ALARM_BATCH});
}

module.exports = {PREFIX, MAX_ALARM_BATCH, expiryForRecord, expiryIndexKey,
  parseExpiryIndex, cleanupExpiredBatch};
