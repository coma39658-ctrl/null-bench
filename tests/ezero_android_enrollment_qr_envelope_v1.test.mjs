import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const codec = await readFile("android/app/src/main/java/com/ezero/connect/AndroidEnrollmentQrEnvelopeV1.kt", "utf8");
const tests = await readFile("android/app/src/test/java/com/ezero/connect/AndroidEnrollmentQrEnvelopeV1Test.kt", "utf8");
test("Android QR request and approval envelopes use distinct versioned types", () => {
  assert.match(codec, /EZERO_ANDROID_ENROLL_REQUEST_V1/);
  assert.match(codec, /EZERO_ANDROID_ENROLL_APPROVAL_V1/);
  assert.match(codec, /device_spki/); assert.match(codec, /device_proof/);
  assert.match(codec, /root_approval/);
});
test("QR codec enforces size, ASCII, exact order, duplicate rejection, origin and expiry", () => {
  assert.match(codec, /MAX_BYTES = 4096/);
  assert.match(codec, /QR_FIELD_ORDER_OR_DUPLICATE_INVALID/);
  assert.match(codec, /QR_LINE_ENDING_INVALID/);
  assert.match(codec, /value.audience == ORIGIN/);
  assert.match(codec, /CHALLENGE_EXPIRED/);
  assert.match(tests, /rejectsDuplicateOrReorderedFields/);
  assert.match(tests, /rejectsOversizedAndCarriageReturnPayloads/);
});
test("QR envelope carries no private key, Firebase token, friend record or call invite", () => {
  assert.doesNotMatch(codec, /privateKey|fcm_token|friend_list|sdp|invite_url/i);
});