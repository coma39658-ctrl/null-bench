import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { EzeroOfflineCallQueue } from "../signaling/ezero-offline-call-queue-v1/worker.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

class MemoryStorage {
  constructor() { this.data = new Map(); }
  async get(key) { return this.data.get(key); }
  async put(key, value) { this.data.set(key, structuredClone(value)); }
  async delete(key) { return this.data.delete(key); }
}
class Context {
  constructor() { this.storage = new MemoryStorage(); this.lock = Promise.resolve(); }
  blockConcurrencyWhile(fn) {
    const run = this.lock.then(fn, fn);
    this.lock = run.then(() => undefined, () => undefined);
    return run;
  }
}
const b64url = bytes => Buffer.from(bytes).toString("base64url");
function p1363ToDer(raw) {
  const integer = bytes => {
    let start = 0;
    while (start < bytes.length - 1 && bytes[start] === 0) start++;
    let value = bytes.slice(start);
    if (value[0] & 0x80) value = Uint8Array.from([0, ...value]);
    return Uint8Array.from([0x02, value.length, ...value]);
  };
  const r = integer(raw.slice(0, 32)), s = integer(raw.slice(32, 64));
  return Uint8Array.from([0x30, r.length + s.length, ...r, ...s]);
}
const fingerprint = byte => Array(32).fill(byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
async function fingerprintForSpki(spki) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}
async function fixture() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const recipientFingerprint = await fingerprintForSpki(spki);
  const ctx = new Context();
  const secret = "staging-internal-queue-secret-32-bytes";
  const queue = new EzeroOfflineCallQueue(ctx, { INTERNAL_QUEUE_SECRET: secret });
  const now = Date.now();
  const body = {
    callId: "call_12345678", callerFingerprint: fingerprint(1),
    recipientIdentityFingerprint: fingerprint(2), recipientInstallationFingerprint: recipientFingerprint,
    relationshipId: "a".repeat(64), installationId: "install_device_123456",
    devicePublicKeySpki: b64url(spki), invite: "SIGNED_CALL_INVITE_TEST_FIXTURE",
    mode: "AUDIO", nonce: "caller_nonce_1234567890", expiresAt: now + 25_000
  };
  const internalHeaders = { "Content-Type": "application/json", "X-EZERO-Queue-Internal": secret };
  async function create(overrides = {}, headers = internalHeaders) {
    return queue.fetch(new Request("https://queue.invalid/internal/v1/create", {
      method: "POST", headers, body: JSON.stringify({ ...body, ...overrides })
    }));
  }
  async function deviceAction(path, callId = body.callId, overrides = {}) {
    const issuedAt = Date.now();
    const payload = {
      protocol: "E-ZERO-OFFLINE-CALL-CLAIM-1", method: "POST", path,
      callId, installationId: body.installationId,
      recipientIdentityFingerprint: body.recipientIdentityFingerprint,
      recipientInstallationFingerprint: body.recipientInstallationFingerprint,
      issuedAt, nonce: "device_nonce_" + crypto.randomUUID().replaceAll("-", "")
    };
    const rawSignature = new Uint8Array(await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(canonical(payload))
    ));
    const signature = b64url(p1363ToDer(rawSignature));
    return queue.fetch(new Request("https://queue.invalid" + path, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callId, installationId: body.installationId, issuedAt,
        nonce: payload.nonce, signature, ...overrides })
    }));
  }
  return { queue, ctx, body, pair, create, deviceAction };
}

test("internal queue creation requires secret and strict recipient-bound payload", async () => {
  const f = await fixture();
  const denied = await f.create({}, { "Content-Type": "application/json" });
  assert.equal(denied.status, 403);
  const invalid = await f.create({ mode: "TEXT" });
  assert.equal(invalid.status, 400);
  const created = await f.create();
  assert.equal(created.status, 201);
  assert.equal((await created.json()).status, "PENDING");
});

test("recipient fingerprint must match the exact installation public key", async () => {
  const f = await fixture();
  const mismatch = await f.create({ recipientInstallationFingerprint: fingerprint(3) });
  assert.equal(mismatch.status, 400);
  assert.equal((await mismatch.json()).error, "QUEUE_DEVICE_FINGERPRINT_MISMATCH");
  const created = await f.create();
  assert.equal(created.status, 201);
  // The account identity and installation key are intentionally distinct identities.
  assert.notEqual(f.body.recipientIdentityFingerprint, f.body.recipientInstallationFingerprint);
});

test("only the enrolled installation key can atomically claim once", async () => {
  const f = await fixture();
  assert.equal((await f.create()).status, 201);
  const claim = await f.deviceAction("/v1/claim");
  assert.equal(claim.status, 200);
  const data = await claim.json();
  assert.equal(data.status, "CLAIMED");
  assert.equal(data.invite, f.body.invite);
  const second = await f.deviceAction("/v1/claim");
  assert.equal(second.status, 404);
});

test("reject is authenticated and consumes the pending call", async () => {
  const f = await fixture();
  assert.equal((await f.create()).status, 201);
  const rejected = await f.deviceAction("/v1/reject");
  assert.equal(rejected.status, 200);
  assert.equal((await rejected.json()).status, "REJECTED");
  assert.equal((await f.deviceAction("/v1/claim")).status, 404);
});

test("wrong installation, forged signature and proof replay fail closed", async () => {
  const f = await fixture();
  assert.equal((await f.create()).status, 201);
  const mismatch = await f.deviceAction("/v1/claim", f.body.callId, { installationId: "other_device_123456" });
  assert.equal(mismatch.status, 403);
  const forged = await f.queue.fetch(new Request("https://queue.invalid/v1/claim", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callId: f.body.callId, installationId: f.body.installationId,
      issuedAt: Date.now(), nonce: "forged_nonce_1234567890", signature: b64url(new Uint8Array(64)) })
  }));
  assert.equal(forged.status, 403);
});

test("only one pending call per recipient installation; duplicate call and nonce rejected", async () => {
  const f = await fixture();
  assert.equal((await f.create()).status, 201);
  assert.equal((await f.create({ callId: "call_87654321", nonce: "another_nonce_1234567890" })).status, 409);
});

test("expired pending calls cannot be claimed", async () => {
  const f = await fixture();
  assert.equal((await f.create({ expiresAt: Date.now() + 150 })).status, 201);
  await new Promise(resolve => setTimeout(resolve, 180));
  assert.equal((await f.deviceAction("/v1/claim")).status, 404);
});
