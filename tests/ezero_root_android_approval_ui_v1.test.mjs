import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ui = readFileSync(new URL("../js/ezero_root_android_approval_ui_v1.js", import.meta.url), "utf8");
const page = readFileSync(new URL("../ezero-root-android-approval-staging.html", import.meta.url), "utf8");

test("Root approval UI is bound to the canonical E-ZERO origin and protocol tags", () => {
  assert.match(ui, /const ORIGIN = "https:\/\/coma39658-ctrl\.github\.io"/);
  assert.match(ui, /EZERO_ANDROID_ENROLL_REQUEST_V1/);
  assert.match(ui, /EZERO_ANDROID_ENROLL_APPROVAL_V1/);
  assert.match(ui, /EZERO_ANDROID_ENROLL_CHALLENGE_V1/);
});

test("request acceptance verifies challenge freshness, device fingerprint and device proof", () => {
  assert.match(ui, /expiry <= now \|\| expiry > now\+90000/);
  assert.match(ui, /DEVICE_FINGERPRINT_MISMATCH/);
  assert.match(ui, /crypto\.subtle\.verify/);
  assert.match(ui, /DEVICE_PROOF_INVALID/);
});

test("Root signing requires explicit human consent and existing Root identity", () => {
  assert.match(ui, /!\$\("consent"\)\.checked/);
  assert.match(ui, /EZERO_CONNECT_IDENTITY\.load\(\)/);
  assert.match(ui, /signAndroidRootApproval/);
  assert.doesNotMatch(ui, /createAfterConsent/);
});

test("approval output is QR-only and explicitly not Worker enrollment", () => {
  assert.match(ui, /EZERO_QR\.encodeDataUrl/);
  assert.match(ui, /Worker enrollment ابھی نہیں ہوا/);
  assert.doesNotMatch(ui, /fetch\s*\(/);
  assert.doesNotMatch(ui, /XMLHttpRequest/);
});

test("staging page loads only existing identity, signer, QR runtime and approval UI", () => {
  assert.match(page, /js\/ezero_connect_identity_v1\.js/);
  assert.match(page, /js\/ezero_connect_root_signer_v1\.js/);
  assert.match(page, /js\/ezero_qr_runtime_v1\.js/);
  assert.match(page, /js\/ezero_root_android_approval_ui_v1\.js/);
  assert.match(page, /No automatic Root key creation/);
});
