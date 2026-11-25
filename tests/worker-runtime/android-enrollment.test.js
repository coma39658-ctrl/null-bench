import { describe, expect, it } from "vitest";
import { env, exports } from "cloudflare:workers";
import { runInDurableObject, runDurableObjectAlarm } from "cloudflare:test";
import { canonical, base64url } from "../../signaling/cloudflare/src/android_enrollment_candidate_v1.js";

const ORIGIN = "https://coma39658-ctrl.github.io";
const ROOT_SECRET = "test-only-not-a-production-secret";
const CHALLENGE_ORDER = ["challenge_id", "device_fp", "nonce", "audience", "expires_at"];
const APPROVAL_ORDER = ["root_fp", "device_fp", "challenge_id", "nonce", "audience", "expires_at"];

async function keyPair() {
  return crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
}

async function spkiB64(key) {
  return base64url(new Uint8Array(await crypto.subtle.exportKey("spki", key)));
}

async function post(path, body, ip, { origin, secret } = {}) {
  const headers = {
    "Content-Type": "application/json",
    "CF-Connecting-IP": ip
  };
  if (origin !== undefined) headers.Origin = origin;
  if (secret !== undefined) headers["X-Root-Bootstrap"] = secret;
  return exports.default.fetch(new Request("https://enrollment-test.invalid" + path, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  }), env);
}

async function registerRoot(root, ip) {
  const rootSpki = await spkiB64(root.publicKey);
  const response = await post("/v1/admin/root-register", { root_spki: rootSpki }, ip, {
    origin: ORIGIN,
    secret: ROOT_SECRET
  });
  const payload = await response.json();
  expect(response.status).toBe(200);
  return { rootSpki, rootFp: payload.root_fp };
}

async function issueChallenge(device, ip) {
  const response = await post("/v1/android/enrollment/challenge", {
    device_spki: await spkiB64(device.publicKey)
  }, ip);
  const payload = await response.json();
  expect(response.status).toBe(200);
  return payload.challenge;
}

async function completionBody(root, rootFp, device, challenge) {
  const challengeBytes = canonical(
    "EZERO_ANDROID_ENROLL_CHALLENGE_V1",
    challenge,
    CHALLENGE_ORDER
  );
  const approval = {
    root_fp: rootFp,
    device_fp: challenge.device_fp,
    challenge_id: challenge.challenge_id,
    nonce: challenge.nonce,
    audience: challenge.audience,
    expires_at: challenge.expires_at
  };
  const approvalBytes = canonical("EZERO_ANDROID_ROOT_APPROVAL_V1", approval, APPROVAL_ORDER);
  const [deviceProof, rootApproval] = await Promise.all([
    crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, device.privateKey, challengeBytes),
    crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, root.privateKey, approvalBytes)
  ]);
  return {
    challenge_id: challenge.challenge_id,
    root_fp: rootFp,
    device_proof: base64url(new Uint8Array(deviceProof)),
    root_approval: base64url(new Uint8Array(rootApproval))
  };
}

describe("isolated Android enrollment Worker — real Workers runtime", () => {
  it("accepts one valid device enrollment and rejects replay of the same challenge", async () => {
    const root = await keyPair();
    const device = await keyPair();
    const { rootFp } = await registerRoot(root, "198.51.100.31");
    const challenge = await issueChallenge(device, "198.51.100.32");
    const body = await completionBody(root, rootFp, device, challenge);

    const first = await post("/v1/android/enrollment/complete", body, "198.51.100.32");
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({
      ok: true,
      status: "ENROLLED",
      root_fp: rootFp,
      device_fp: challenge.device_fp
    });

    const replay = await post("/v1/android/enrollment/complete", body, "198.51.100.32");
    expect(replay.status).toBe(409);
    expect(await replay.json()).toMatchObject({ error: "CHALLENGE_UNKNOWN_OR_USED" });
  });

  it("allows exactly one of two concurrent valid completions for the same challenge", async () => {
    const root = await keyPair();
    const device = await keyPair();
    const { rootFp } = await registerRoot(root, "198.51.100.41");
    const challenge = await issueChallenge(device, "198.51.100.42");
    const body = await completionBody(root, rootFp, device, challenge);

    const responses = await Promise.all([
      post("/v1/android/enrollment/complete", body, "198.51.100.42"),
      post("/v1/android/enrollment/complete", body, "198.51.100.42")
    ]);
    const statuses = responses.map(response => response.status).sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);
  });

  it("rejects a foreign browser Origin while permitting a native request without Origin", async () => {
    const device = await keyPair();
    const spki = await spkiB64(device.publicKey);

    const foreign = await post("/v1/android/enrollment/challenge", { device_spki: spki },
      "198.51.100.51", { origin: "https://attacker.invalid" });
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toMatchObject({ error: "ORIGIN_DENIED" });

    const native = await post("/v1/android/enrollment/challenge", { device_spki: spki },
      "198.51.100.52");
    expect(native.status).toBe(200);
  });

  it("enforces the per-IP challenge ceiling in Durable Object storage", async () => {
    const device = await keyPair();
    const deviceSpki = await spkiB64(device.publicKey);
    const ip = "198.51.100.61";
    const statuses = [];
    for (let i = 0; i < 11; i++) {
      const response = await post("/v1/android/enrollment/challenge", {
        device_spki: deviceSpki
      }, ip);
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 10).every(status => status === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("keeps Root registration unavailable without the bootstrap secret", async () => {
    const root = await keyPair();
    const response = await post("/v1/admin/root-register", {
      root_spki: await spkiB64(root.publicKey)
    }, "198.51.100.71", { origin: ORIGIN });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "ADMIN_UNAUTHORIZED" });
  });

  it("persists rate-limit buckets as hashed keys rather than raw client IPs", async () => {
    const id = env.ENROLLMENT.idFromName("global-root-enrollment-v1");
    const stub = env.ENROLLMENT.get(id);
    const keys = await runInDurableObject(stub, async (_instance, state) => {
      const values = await state.storage.list({ prefix: "rate:" });
      return [...values.keys()];
    });
    expect(keys.length).toBeGreaterThan(0);
    expect(keys.every(key => !key.includes("198.51.100."))).toBe(true);
  });
});


describe("Android enrollment storage lifecycle alarms", () => {
  it("removes an expired challenge record and its index", async () => {
    const stub = env.ENROLLMENT.get(env.ENROLLMENT.idFromName("cleanup-expired-challenge"));
    const expiresAt = Date.now() - 1000;
    const recordKey = "challenge:expired_challenge_0001";
    const indexKey = "expiry:" + String(expiresAt).padStart(16, "0") + ":" + recordKey;
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put(recordKey, {
        challenge: { expires_at: String(expiresAt) }, created_at: expiresAt - 90000
      });
      await state.storage.put(indexKey, { record_key: recordKey });
      await state.storage.setAlarm(Date.now() + 60000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const state = await runInDurableObject(stub, async (_instance, state) => ({
      record: await state.storage.get(recordKey),
      index: await state.storage.get(indexKey)
    }));
    expect(state.record).toBeUndefined();
    expect(state.index).toBeUndefined();
  });

  it("keeps an unexpired challenge and reschedules its cleanup", async () => {
    const stub = env.ENROLLMENT.get(env.ENROLLMENT.idFromName("cleanup-live-challenge"));
    const expiresAt = Date.now() + 60000;
    const recordKey = "challenge:live_challenge_00001";
    const indexKey = "expiry:" + String(expiresAt).padStart(16, "0") + ":" + recordKey;
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put(recordKey, {
        challenge: { expires_at: String(expiresAt) }, created_at: Date.now()
      });
      await state.storage.put(indexKey, { record_key: recordKey });
      await state.storage.setAlarm(Date.now() + 60000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const state = await runInDurableObject(stub, async (_instance, state) => ({
      record: await state.storage.get(recordKey),
      alarm: await state.storage.getAlarm()
    }));
    expect(state.record).toBeTruthy();
    expect(state.alarm).toBe(expiresAt);
  });

  it("cleans more than one batch over multiple bounded alarm invocations", async () => {
    const stub = env.ENROLLMENT.get(env.ENROLLMENT.idFromName("cleanup-bounded-batches"));
    const expiresAt = Date.now() - 1000;
    await runInDurableObject(stub, async (_instance, state) => {
      for (let i = 0; i < 105; i++) {
        const recordKey = "challenge:batch_" + String(i).padStart(3, "0");
        const indexKey = "expiry:" + String(expiresAt).padStart(16, "0") + ":" + recordKey;
        await state.storage.put(recordKey, { challenge: { expires_at: String(expiresAt) } });
        await state.storage.put(indexKey, { record_key: recordKey });
      }
      await state.storage.setAlarm(Date.now() + 60000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const firstCount = await runInDurableObject(stub, async (_instance, state) =>
      (await state.storage.list({ prefix: "expiry:" })).size);
    expect(firstCount).toBe(5);

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const finalCount = await runInDurableObject(stub, async (_instance, state) =>
      (await state.storage.list({ prefix: "expiry:" })).size);
    expect(finalCount).toBe(0);
  });

  it("removes an expired rate bucket without retaining its raw-IP key", async () => {
    const stub = env.ENROLLMENT.get(env.ENROLLMENT.idFromName("cleanup-expired-rate"));
    const expiresAt = Date.now() - 1000;
    const recordKey = "rate:/v1/android/enrollment/challenge:" + "a".repeat(64);
    const indexKey = "expiry:" + String(expiresAt).padStart(16, "0") + ":" + recordKey;
    await runInDurableObject(stub, async (_instance, state) => {
      await state.storage.put(recordKey, { window_start: 1, count: 2, expires_at: expiresAt });
      await state.storage.put(indexKey, { record_key: recordKey });
      await state.storage.setAlarm(Date.now() + 60000);
    });

    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const remaining = await runInDurableObject(stub, async (_instance, state) => ({
      bucket: await state.storage.get(recordKey),
      index: await state.storage.get(indexKey)
    }));
    expect(remaining.bucket).toBeUndefined();
    expect(remaining.index).toBeUndefined();
  });
});
