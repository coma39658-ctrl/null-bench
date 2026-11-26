import assert from "node:assert/strict";
import { generateKeyPairSync, verify as verifySignature, randomBytes } from "node:crypto";
import {
  ANDROID_WAKE_LIMITS,
  canonicalWakeMessage,
  sendFcmWake,
  signWakePayload
} from "../signaling/ezero-connect-v1/android_wake.mjs";

const now = Date.now();
const callId = "A".repeat(32);
const nonce = randomBytes(24).toString("base64url");
const payload = {
  wake_v: "1",
  call_id: callId,
  mode: "AUDIO",
  expires_at: String(now + 90_000),
  nonce
};
assert.equal(ANDROID_WAKE_LIMITS.maxTtlMs, 120_000);

const ec = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const wakePrivate = ec.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
const signed = await signWakePayload(payload, wakePrivate, now);
const wakeSignature = Buffer.from(signed.server_sig, "base64url");
assert.equal(verifySignature(
  "sha256",
  Buffer.from(canonicalWakeMessage(signed)),
  { key: ec.publicKey, dsaEncoding: "der" },
  wakeSignature
), true, "Android-compatible DER ECDSA signature verifies");

const altered = { ...signed, call_id: "B".repeat(32) };
assert.equal(verifySignature(
  "sha256",
  Buffer.from(canonicalWakeMessage(altered)),
  { key: ec.publicKey, dsaEncoding: "der" },
  wakeSignature
), false, "call ID tampering invalidates the wake signature");

await assert.rejects(
  () => signWakePayload({ ...payload, expires_at: String(now + 120_001) }, wakePrivate, now),
  /WAKE_EXPIRY_INVALID/
);
await assert.rejects(
  () => signWakePayload({ ...payload, mode: "TEXT" }, wakePrivate, now),
  /WAKE_MODE_INVALID/
);

const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 });
const rsaPrivatePem = rsa.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const serviceAccount = {
  project_id: "ezero-staging-project",
  client_email: "ezero-staging-sender@example.invalid",
  private_key: rsaPrivatePem,
  token_uri: "https://oauth.example.invalid/token"
};
const env = {
  FCM_SERVICE_ACCOUNT_JSON: JSON.stringify(serviceAccount),
  FCM_PROJECT_ID: "ezero-staging-project",
  EZERO_WAKE_PRIVATE_KEY_PKCS8_BASE64: wakePrivate
};
const calls = [];
const fakeFetch = async (url, init) => {
  calls.push({ url: String(url), init });
  if (String(url) === serviceAccount.token_uri) {
    const form = new URLSearchParams(init.body);
    assert.equal(form.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
    const assertion = form.get("assertion");
    const [header, claims, signature] = assertion.split(".");
    assert.equal(verifySignature(
      "RSA-SHA256",
      Buffer.from(header + "." + claims),
      rsa.publicKey,
      Buffer.from(signature, "base64url")
    ), true, "FCM OAuth assertion is signed by the service account key");
    const parsedClaims = JSON.parse(Buffer.from(claims, "base64url").toString("utf8"));
    assert.equal(parsedClaims.scope, "https://www.googleapis.com/auth/firebase.messaging");
    return { ok: true, async json() { return { access_token: "test-access-token" }; } };
  }
  assert.equal(String(url), "https://fcm.googleapis.com/v1/projects/ezero-staging-project/messages:send");
  assert.equal(init.headers.Authorization, "Bearer test-access-token");
  const body = JSON.parse(init.body);
  const message = body.message;
  assert.equal(message.token, "test-fcm-device-token");
  assert.equal(message.android.priority, "HIGH");
  assert.equal(message.android.ttl, "90s");
  assert.equal(message.notification, undefined, "wake is data-only");
  assert.deepEqual(Object.keys(message.data).sort(),
    ["call_id", "expires_at", "mode", "nonce", "server_sig", "wake_v"].sort());
  assert.equal(verifySignature(
    "sha256",
    Buffer.from(canonicalWakeMessage(message.data)),
    { key: ec.publicKey, dsaEncoding: "der" },
    Buffer.from(message.data.server_sig, "base64url")
  ), true, "FCM payload contains the signed exact-call wake");
  return { ok: true, async json() { return { name: "projects/ezero-staging-project/messages/123" }; } };
};

const sent = await sendFcmWake(env, "test-fcm-device-token", payload, fakeFetch, now);
assert.equal(sent.sent, true);
assert.equal(sent.messageId, "projects/ezero-staging-project/messages/123");
assert.equal(calls.length, 2);
await assert.rejects(
  () => sendFcmWake({}, "test-fcm-device-token", payload, fakeFetch, now),
  /FCM_STAGING_SECRETS_MISSING/
);

console.log("PASS Android wake signature, tamper rejection, FCM OAuth and data-only payload contract");
