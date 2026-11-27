import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const worker = readFileSync(new URL("../signaling/cloudflare/src/android_enrollment_candidate_v1.js", import.meta.url), "utf8");
const contract = readFileSync(new URL("../android/FCM_TOKEN_REGISTRATION_V1.md", import.meta.url), "utf8");
const androidService = readFileSync(new URL("../android/app/src/main/java/com/ezero/connect/IncomingCallMessagingService.kt", import.meta.url), "utf8");
const androidClient = readFileSync(new URL("../android/app/src/main/java/com/ezero/connect/AndroidPushTokenRegistrationV1.kt", import.meta.url), "utf8");

test("FCM token registration is a PUT route isolated to the Android enrollment candidate", () => {
  assert.match(worker, /u\.pathname === "\/v1\/android\/devices\/current\/push-token"/);
  assert.match(worker, /expectedMethod = u\.pathname === "\/v1\/android\/devices\/current\/push-token" \? "PUT" : "POST"/);
  assert.match(worker, /Access-Control-Allow-Methods":"POST, PUT, OPTIONS"/);
});

test("token registration requires enrolled device, active root, bounded timestamp and device proof", () => {
  assert.match(worker, /DEVICE_NOT_ENROLLED/);
  assert.match(worker, /ROOT_REVOKED/);
  assert.match(worker, /Math\.abs\(now-issued\) > 120000/);
  assert.match(worker, /EZERO_ANDROID_PUSH_TOKEN_V1/);
  assert.match(worker, /crypto\.subtle\.verify\(\{name:"ECDSA",hash:"SHA-256"\}/);
  assert.match(worker, /BAD_DEVICE_SIGNATURE/);
  assert.match(worker, /DEVICE_AUTH_FAILED/);
});

test("FCM token is encrypted with AES-GCM and never returned or logged", () => {
  assert.match(worker, /AES-GCM/);
  assert.match(worker, /additionalData:enc\.encode\("EZERO_FCM_TOKEN_V1:"\+deviceFp\)/);
  assert.match(worker, /TOKEN_ENCRYPTION_KEY_BASE64URL/);
  assert.match(worker, /encrypted_token:encryptedToken/);
  assert.doesNotMatch(worker, /console\.(log|info|debug)\([^\n]*fcm_token/);
  assert.doesNotMatch(worker, /return response\([^\n]*fcm_token/);
});

test("token nonce is atomically replay-protected and root revocation blocks registration", () => {
  assert.match(worker, /transactionSync\(tx => \{/);
  assert.match(worker, /push-token-nonces:/);
  assert.match(worker, /TOKEN_NONCE_REPLAY/);
  assert.match(worker, /ROOT_REVOKED/);
  assert.match(worker, /fresh\.slice\(-128\)/);
});

test("Android onNewToken is wired to the authenticated token client while sender remains inactive", () => {
  assert.match(androidService, /AndroidPushTokenRegistrationV1\.onNewToken\(applicationContext, token\)/);
  assert.match(androidClient, /EZERO_ANDROID_PUSH_TOKEN_V1/);
  assert.match(androidClient, /requestMethod = "PUT"/);
  assert.ok(contract.includes("onNewToken\` now calls the authenticated registration client"));
  assert.match(contract, /No FCM sender exists/);
  assert.match(contract, /does \*\*not\*\* enable incoming ringing/);
});
test("issued_at accepts exactly 13 decimal digits (not a literal backslash-d)", () => {
  assert.ok(worker.includes("!/^\\d{13}$/.test"));
  assert.ok(!worker.includes("!/^\\\\d{13}$/.test"));
});
