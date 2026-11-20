import { describe, it, expect } from "vitest";
import retention from "../../src/android_binding_retention_v1.cjs";

function memoryStorage() {
  const values = new Map();
  return {
    values,
    async get(key) { return values.get(key); },
    async put(key, value) { values.set(key, value); },
    async list({prefix, limit}) {
      return new Map([...values.entries()]
        .filter(([key]) => key.startsWith(prefix))
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(0, limit));
    },
    async transaction(fn) {
      return fn({
        get: async key => values.get(key),
        put: async (key, value) => values.set(key, value),
        delete: async key => values.delete(key)
      });
    }
  };
}

describe("E-ZERO Android binding bounded retention", () => {
  it("applies challenge, replay-tombstone and quota retention windows", () => {
    expect(retention.expiryForRecord("android-bind:v1:challenge:o:n", {
      expiresAtEpochSeconds:1000
    })).toBe(1300);
    expect(retention.expiryForRecord("android-bind:v1:revocation:o:a:n", {
      consumedAtEpochSeconds:1000
    })).toBe(1600);
    expect(retention.expiryForRecord("android-bind:v1:quota:challenge-10m:o:1", {
      windowEndsAtEpochSeconds:1000
    })).toBe(1300);
    expect(retention.expiryForRecord("android-bind:v1:binding:o:a", {
      status:"revoked"
    })).toBeNull();
  });

  it("cleans at most 100 expired records per batch and leaves backlog for the next alarm", async () => {
    const storage = memoryStorage();
    for (let i = 0; i < 101; i++) {
      const key = "android-bind:v1:challenge:owner:" + String(i).padStart(3, "0");
      const value = {status:"consumed", expiresAtEpochSeconds:100};
      await storage.put(key, value);
      await storage.put(retention.expiryIndexKey(400, key), {
        targetKey:key, expiresAtEpochSeconds:400
      });
    }
    const first = await retention.cleanupExpiredBatch(storage, 400);
    expect(first.deleted).toBe(100);
    expect([...storage.values.keys()].filter(k => k.startsWith("android-bind:v1:expiry:"))).toHaveLength(1);
    const second = await retention.cleanupExpiredBatch(storage, 400);
    expect(second.deleted).toBe(1);
    expect([...storage.values.keys()].some(k => k.startsWith("android-bind:v1:expiry:"))).toBe(false);
  });

  it("preserves permanent bindings, future records and records without a recognized expiry index", async () => {
    const storage = memoryStorage();
    const bindingKey = "android-bind:v1:binding:owner:android";
    const futureKey = "android-bind:v1:revocation:owner:android:future";
    const unknownKey = "android-bind:v1:other:owner:record";
    await storage.put(bindingKey, {status:"revoked"});
    await storage.put(futureKey, {status:"consumed", consumedAtEpochSeconds:1000});
    await storage.put(unknownKey, {opaque:true});
    await storage.put(retention.expiryIndexKey(1600, futureKey), {
      targetKey:futureKey, expiresAtEpochSeconds:1600
    });

    const result = await retention.cleanupExpiredBatch(storage, 1599);
    expect(result.deleted).toBe(0);
    expect(await storage.get(bindingKey)).toEqual({status:"revoked"});
    expect(await storage.get(futureKey)).toBeTruthy();
    expect(await storage.get(unknownKey)).toEqual({opaque:true});
    const expired = await retention.cleanupExpiredBatch(storage, 1600);
    expect(expired.deleted).toBe(1);
    expect(await storage.get(futureKey)).toBeUndefined();
    expect(await storage.get(bindingKey)).toEqual({status:"revoked"});
  });

  it("removes only a stale index when its target record no longer matches the indexed expiry", async () => {
    const storage = memoryStorage();
    const key = "android-bind:v1:challenge:owner:nonce";
    await storage.put(key, {status:"issued", expiresAtEpochSeconds:200});
    const indexKey = retention.expiryIndexKey(400, key);
    await storage.put(indexKey, {targetKey:key, expiresAtEpochSeconds:400});
    const result = await retention.cleanupExpiredBatch(storage, 400);
    expect(result.deleted).toBe(1);
    expect(await storage.get(key)).toEqual({status:"issued", expiresAtEpochSeconds:200});
    expect(await storage.get(indexKey)).toBeUndefined();
  });
});
