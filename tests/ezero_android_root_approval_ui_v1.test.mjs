import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.crypto ??= webcrypto;
globalThis.atob ??= value => Buffer.from(value, "base64").toString("binary");
globalThis.btoa ??= value => Buffer.from(value, "binary").toString("base64");

await import("../js/ezero_android_root_approval_ui_v1.js");
const api = globalThis.EZERO_ANDROID_ROOT_APPROVAL_UI_V1;
const ORIGIN = "https://coma39658-ctrl.github.io";

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}
async function makeRequest(overrides = {}) {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
  const fp = Buffer.from(digest).toString("hex");
  const fields = {
    challenge_id: b64url(crypto.getRandomValues(new Uint8Array(24))),
    device_fp: fp,
    nonce: b64url(crypto.getRandomValues(new Uint8Array(24))),
    audience: ORIGIN,
    expires_at: String(Date.now() + 60000)
  };
  const canonical = "EZERO_ANDROID_ENROLL_CHALLENGE_V1\n" +
    ["challenge_id","device_fp","nonce","audience","expires_at"]
      .map(key => key + "=" + fields[key] + "\n").join("");
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, pair.privateKey,
    new TextEncoder().encode(canonical)
  );
  const request = {
    device_spki: b64url(spki),
    ...fields,
    device_proof: b64url(signature),
    ...overrides
  };
  const raw = "EZERO_ANDROID_ENROLL_REQUEST_V1\n" +
    ["device_spki","device_fp","challenge_id","nonce","audience","expires_at","device_proof"]
      .map(key => key + "=" + request[key] + "\n").join("");
  return { raw, request, pair };
}

test("accepts a correctly signed Android enrollment request", async () => {
  const { raw, request } = await makeRequest();
  const result = await api.verifyEnrollmentRequest(raw);
  assert.equal(result.deviceFingerprint, request.device_fp);
  assert.equal(result.challengeId, request.challenge_id);
  assert.equal(result.expiresAt, request.expires_at);
});

test("rejects tampered device proof and wrong origin", async () => {
  const valid = await makeRequest();
  const tampered = valid.raw.replace(/device_proof=([A-Za-z0-9_-])/, "device_proof=Z$1");
  await assert.rejects(() => api.verifyEnrollmentRequest(tampered));

  const wrongOrigin = await makeRequest({ audience: "https://attacker.invalid" });
  await assert.rejects(() => api.verifyEnrollmentRequest(wrongOrigin.raw), /CHALLENGE_AUDIENCE_INVALID/);
});

test("rejects reordered, duplicate, malformed and expired QR envelopes", async () => {
  const { raw } = await makeRequest();
  await assert.rejects(() => api.verifyEnrollmentRequest(raw.replace(
    "device_fp=", "device_spki="
  )));
  await assert.rejects(() => api.verifyEnrollmentRequest(raw + "device_fp=duplicate\n"));
  const expired = await makeRequest({ expires_at: String(Date.now() - 1) });
  await assert.rejects(() => api.verifyEnrollmentRequest(expired.raw), /CHALLENGE_EXPIRED_OR_TOO_LONG/);
  await assert.rejects(() => api.verifyEnrollmentRequest("x".repeat(4097)));
});

test("creates the exact Android approval envelope only after explicit caller invocation", async () => {
  const { raw, request } = await makeRequest();
  const rootFp = "c".repeat(64);
  globalThis.EZERO_CONNECT_IDENTITY = {
    async load() { return { fingerprint: rootFp }; },
    async getPublicIdentity() { return { fingerprint: rootFp }; }
  };
  globalThis.EZERO_CONNECT_ROOT_SIGNER_V1 = {
    async signAndroidRootApproval(challenge) {
      assert.equal(challenge.root_fp, rootFp);
      assert.equal(challenge.device_fp, request.device_fp);
      assert.equal(challenge.challenge_id, request.challenge_id);
      return { root_fp: rootFp, signature: b64url(new Uint8Array(64).fill(7)) };
    }
  };
  const approval = await api.createRootApproval(raw);
  assert.ok(approval.startsWith("EZERO_ANDROID_ENROLL_APPROVAL_V1\n"));
  assert.match(approval, new RegExp("root_fp=" + rootFp));
  assert.match(approval, new RegExp("device_fp=" + request.device_fp));
  assert.match(approval, /root_approval=[A-Za-z0-9_-]{86}\n$/);
});

test("does not create approval when existing Root identity is missing", async () => {
  const { raw } = await makeRequest();
  globalThis.EZERO_CONNECT_IDENTITY = {
    async load() { return null; },
    async getPublicIdentity() { throw new Error("NO_ROOT"); }
  };
  await assert.rejects(() => api.createRootApproval(raw), /EXISTING_ROOT_IDENTITY_REQUIRED/);
});
