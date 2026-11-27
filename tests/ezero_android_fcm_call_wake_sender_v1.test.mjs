import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto, generateKeyPairSync, verify as verifySignature } from "node:crypto";
import {
  canonicalCallWake,
  createSignedCallWake,
  sendSignedCallWake
} from "../signaling/cloudflare/src/fcm_call_wake_sender_v1.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, "base64").toString("binary");
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, "binary").toString("base64");

const now = 1_800_000_000_000;
const call = {
  callId: "call_12345678",
  mode: "VIDEO",
  expiresAt: now + 30_000,
  nonce: "abcdefghijklmnopQRSTUV"
};
const b64url = bytes => Buffer.from(bytes).toString("base64url");

function ecFixture() {
  const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return {
    privateKey: pair.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64url"),
    publicKey: pair.publicKey
  };
}

function rsaFixture() {
  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privateKey: pair.privateKey.export({ type: "pkcs8", format: "pem" }),
    publicKey: pair.publicKey
  };
}

test("canonical wake bytes match Android contract exactly", () => {
  const expected = [
    "EZERO_CALL_WAKE_V1",
    "wake_v=1",
    "call_id=call_12345678",
    "mode=VIDEO",
    `expires_at=${now + 30_000}`,
    "nonce=abcdefghijklmnopQRSTUV",
    ""
  ].join("\n");
  assert.deepEqual(canonicalCallWake(call), Buffer.from(expected, "utf8"));
});

test("signed wake is DER ECDSA and verifies against the staged public key", async () => {
  const ec = ecFixture();
  const wake = await createSignedCallWake({
    CALL_WAKE_SIGNING_PRIVATE_KEY_PKCS8_BASE64URL: ec.privateKey
  }, call, now);
  const signature = Buffer.from(wake.server_sig, "base64url");
  assert.equal(wake.wake_v, "1");
  assert.equal(wake.call_id, call.callId);
  assert.equal(wake.mode, call.mode);
  assert.equal(wake.expires_at, String(call.expiresAt));
  assert.equal(verifySignature(
    "sha256", canonicalCallWake(call), ec.publicKey, signature
  ), true);
});

test("rejects expired, overlong, malformed and unsigned wake requests", async () => {
  const ec = ecFixture();
  const env = { CALL_WAKE_SIGNING_PRIVATE_KEY_PKCS8_BASE64URL: ec.privateKey };
  await assert.rejects(() => createSignedCallWake(env, { ...call, expiresAt: now }, now), /CALL_WAKE_EXPIRY_OUT_OF_RANGE/);
  await assert.rejects(() => createSignedCallWake(env, { ...call, expiresAt: now + 120_001 }, now), /CALL_WAKE_EXPIRY_OUT_OF_RANGE/);
  await assert.rejects(() => createSignedCallWake(env, { ...call, mode: "TEXT" }, now), /CALL_WAKE_MODE_INVALID/);
  await assert.rejects(() => createSignedCallWake({}, call, now), /CALL_WAKE_SIGNING_KEY_NOT_CONFIGURED/);
});

test("FCM sender uses OAuth JWT and sends only signed data-only high-priority wake fields", async () => {
  const ec = ecFixture();
  const rsa = rsaFixture();
  const serviceAccount = {
    project_id: "ezero-staging-12345",
    client_email: "ezero-sender@ezero-staging-12345.iam.gserviceaccount.com",
    private_key: rsa.privateKey
  };
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url === "https://oauth2.googleapis.com/token") {
      const form = new URLSearchParams(init.body);
      assert.equal(form.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
      const assertion = form.get("assertion").split(".");
      assert.equal(assertion.length, 3);
      const signedBytes = Buffer.from(assertion[0] + "." + assertion[1]);
      assert.equal(verifySignature(
        "RSA-SHA256", signedBytes, rsa.publicKey, Buffer.from(assertion[2], "base64url")
      ), true);
      const claims = JSON.parse(Buffer.from(assertion[1], "base64url").toString("utf8"));
      assert.equal(claims.iss, serviceAccount.client_email);
      assert.equal(claims.aud, "https://oauth2.googleapis.com/token");
      return { ok: true, json: async () => ({ access_token: "test-access-token", expires_in: 3600 }) };
    }
    assert.equal(url, "https://fcm.googleapis.com/v1/projects/ezero-staging-12345/messages:send");
    assert.equal(init.headers.Authorization, "Bearer test-access-token");
    const body = JSON.parse(init.body);
    assert.equal(body.message.token, "fcm-token-value-that-is-long-enough-123456");
    assert.equal(body.message.android.priority, "HIGH");
    assert.equal(body.message.android.ttl, "30s");
    assert.equal(body.message.notification, undefined);
    assert.deepEqual(Object.keys(body.message.data).sort(),
      ["call_id", "expires_at", "mode", "nonce", "server_sig", "wake_v"].sort());
    assert.equal(verifySignature(
      "sha256", canonicalCallWake(call), ec.publicKey,
      Buffer.from(body.message.data.server_sig, "base64url")
    ), true);
    return { ok: true, json: async () => ({ name: "projects/ezero-staging-12345/messages/abc" }) };
  };

  const result = await sendSignedCallWake({
    FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount),
    CALL_WAKE_SIGNING_PRIVATE_KEY_PKCS8_BASE64URL: ec.privateKey
  }, { ...call, fcmToken: "fcm-token-value-that-is-long-enough-123456" }, { now, fetchImpl });
  assert.equal(calls.length, 2);
  assert.equal(result.messageName, "projects/ezero-staging-12345/messages/abc");
  assert.equal(result.expiresAt, call.expiresAt);
});

test("sender fails closed when credentials or recipient token are absent", async () => {
  await assert.rejects(() => sendSignedCallWake({}, { ...call, fcmToken: "fcm-token-value-that-is-long-enough-123456" }, { now }), /FCM_SERVICE_ACCOUNT_NOT_CONFIGURED/);
  await assert.rejects(() => sendSignedCallWake({
    FCM_SERVICE_ACCOUNT_JSON: "{}"
  }, { ...call, fcmToken: "fcm-token-value-that-is-long-enough-123456" }, { now }), /FCM_SERVICE_ACCOUNT_INVALID/);
  const rsa = rsaFixture();
  await assert.rejects(() => sendSignedCallWake({
    FCM_SERVICE_ACCOUNT_JSON: JSON.stringify({
      project_id: "ezero-staging-12345",
      client_email: "ezero-sender@ezero-staging-12345.iam.gserviceaccount.com",
      private_key: rsa.privateKey
    })
  }, { ...call, fcmToken: "short" }, { now }), /FCM_TOKEN_INVALID/);
});
