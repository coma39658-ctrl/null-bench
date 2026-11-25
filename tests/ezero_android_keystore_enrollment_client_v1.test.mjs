import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const keyStore = await readFile("android/app/src/main/java/com/ezero/connect/AndroidEnrollmentKeyStore.kt", "utf8");
const protocol = await readFile("android/app/src/main/java/com/ezero/connect/AndroidEnrollmentProtocolV1.kt", "utf8");
const activity = await readFile("android/app/src/main/java/com/ezero/connect/MainActivity.kt", "utf8");

test("Android enrollment key is created in Android Keystore on explicit button action", () => {
  assert.match(keyStore, /AndroidKeyStore/);
  assert.match(keyStore, /KeyGenParameterSpec/);
  assert.match(keyStore, /secp256r1/);
  assert.match(activity, /Prepare this phone for secure enrollment/);
  assert.match(activity, /AndroidEnrollmentKeyStore\.getOrCreatePublicIdentity\(\)/);
});

test("Android private key is not exported and only SPKI fingerprint is exposed", () => {
  assert.match(keyStore, /pair\.private\.encoded == null/);
  assert.match(keyStore, /pair\.public\.encoded/);
  assert.doesNotMatch(keyStore, /privateKey.*Base64|private\.encoded.*Base64/);
});

test("challenge signing uses fixed origin, exact LF canonical fields and P1363 conversion", () => {
  assert.match(protocol, /EZERO_ANDROID_ENROLL_CHALLENGE_V1/);
  assert.match(protocol, /challenge_id=/);
  assert.match(protocol, /device_fp=/);
  assert.match(protocol, /nonce=/);
  assert.match(protocol, /audience=/);
  assert.match(protocol, /expires_at=/);
  assert.match(keyStore, /AndroidEnrollmentProtocolV1\.canonicalChallenge/);
  assert.match(keyStore, /AndroidSignatureEncoding\.derP256ToP1363/);
});

test("preparation is explicitly not enrollment or friend trust", () => {
  assert.match(activity, /KEY_CREATED_NOT_ENROLLED/);
  assert.match(activity, /No server connection or friend trust has been created/);
  assert.match(activity, /Root approval is still required/);
});
