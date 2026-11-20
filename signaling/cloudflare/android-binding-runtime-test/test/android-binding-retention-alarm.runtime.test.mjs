import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import retention from "../../src/android_binding_retention_v1.cjs";

describe("E-ZERO Android binding retention — SQLite Durable Object alarm", () => {
  it("fires the real DO alarm, deletes no more than 100 expired rows, reschedules backlog, and preserves permanent records", async () => {
    const id = env.ANDROID_BINDING_LEDGER.idFromName(
      "retention-alarm-runtime-" + crypto.randomUUID()
    );
    const stub = env.ANDROID_BINDING_LEDGER.get(id);
    const now = Math.floor(Date.now() / 1000);
    const permanentKey = "android-bind:v1:binding:owner:android";
    const unknownKey = "android-bind:v1:future-record:owner:opaque";

    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put(permanentKey, {status:"revoked", permanent:true});
      await state.storage.put(unknownKey, {opaque:true});
      for (let i = 0; i < 101; i++) {
        const targetKey = "android-bind:v1:challenge:alarm-owner:" +
          String(i).padStart(3, "0");
        const expiresAtEpochSeconds = now - 600;
        await state.storage.put(targetKey, {
          status:"consumed",
          expiresAtEpochSeconds: expiresAtEpochSeconds - 300
        });
        await state.storage.put(
          retention.expiryIndexKey(expiresAtEpochSeconds, targetKey),
          {targetKey, expiresAtEpochSeconds}
        );
      }
      // Mirror the adapter's production alarm scheduling path against SQLite storage.
      await state.storage.setAlarm(Date.now() + 60_000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    const afterFirst = await runInDurableObject(stub, async (_instance, state) => {
      const remaining = await state.storage.list({
        prefix:"android-bind:v1:expiry:",
        limit:200
      });
      return {
        remainingIndexes: remaining.size,
        permanent: await state.storage.get(permanentKey),
        unknown: await state.storage.get(unknownKey),
        nextAlarm: await state.storage.getAlarm()
      };
    });
    expect(afterFirst.remainingIndexes).toBe(1);
    expect(afterFirst.permanent).toEqual({status:"revoked", permanent:true});
    expect(afterFirst.unknown).toEqual({opaque:true});
    expect(afterFirst.nextAlarm).not.toBeNull();

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const afterSecond = await runInDurableObject(stub, async (_instance, state) => ({
      remainingIndexes: (await state.storage.list({
        prefix:"android-bind:v1:expiry:",
        limit:200
      })).size,
      remainingTargets: (await state.storage.list({
        prefix:"android-bind:v1:challenge:alarm-owner:",
        limit:200
      })).size,
      permanent: await state.storage.get(permanentKey),
      unknown: await state.storage.get(unknownKey),
      nextAlarm: await state.storage.getAlarm()
    }));
    expect(afterSecond.remainingIndexes).toBe(0);
    expect(afterSecond.remainingTargets).toBe(0);
    expect(afterSecond.permanent).toEqual({status:"revoked", permanent:true});
    expect(afterSecond.unknown).toEqual({opaque:true});
    expect(afterSecond.nextAlarm).toBeNull();
    expect(await runDurableObjectAlarm(stub)).toBe(false);
  });
});
