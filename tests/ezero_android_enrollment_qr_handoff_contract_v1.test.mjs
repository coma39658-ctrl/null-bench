import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync("android/ANDROID_ENROLLMENT_QR_HANDOFF_CONTRACT_V1.md", "utf8");

test("handoff remains design-only and cannot be mistaken for live enrollment", () => {
  assert.match(contract, /DESIGN \+ STATIC QA ONLY/);
  assert.match(contract, /No Android QR enrollment UI, browser QR approval UI, API client, Worker deployment/);
});

test("request and response QR use distinct protocol type tags", () => {
  assert.match(contract, /EZERO_ANDROID_ENROLL_REQUEST_V1/);
  assert.match(contract, /EZERO_ANDROID_ROOT_APPROVAL_RESPONSE_V1/);
  assert.match(contract, /never parse an enrollment QR as a friend identity QR/i);
});

test("human approval and independently registered root are mandatory", () => {
  assert.match(contract, /explicitly taps \*\*Approve this Android device\*\*/);
  assert.match(contract, /independently authorized in the backend root registry/);
  assert.match(contract, /No auto-approval/);
});

test("QR payloads are bounded and reject malformed content", () => {
  assert.match(contract, /<= 2,400 UTF-8 bytes/);
  assert.match(contract, /duplicate keys/);
  assert.match(contract, /unknown fields/);
  assert.match(contract, /reject larger payloads rather than truncating or splitting silently/);
});

test("private and unrelated user data are excluded from QR payloads", () => {
  assert.match(contract, /private key, FCM token, phone number, profile name, friend list/);
  assert.match(contract, /FCM tokens, aliases, phone numbers, profile photos, friend records/);
  assert.match(contract, /never leave their respective secure stores/);
});

test("replay, expiry, binding, and revocation fail closed", () => {
  assert.match(contract, /at most 90 seconds and is single-use/);
  assert.match(contract, /Expired, replayed, mismatched, or revoked requests fail closed/);
  assert.match(contract, /Root approval binds the exact root, device, challenge ID, nonce, audience, and expiry/);
});

test("existing friend QR, saved friends, calls, and production stay untouched", () => {
  assert.match(contract, /existing permanent friend QR, saved-friend list, call signaling, and public site remain unchanged/i);
  assert.match(contract, /does not authorize deployment, production changes/);
});
