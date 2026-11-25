import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile("js/ezero_connect_identity_v1.js", "utf8");

test("browser root approval signer is exposed without exporting private key", () => {
  assert.match(source, /signAndroidRootApproval/);
  assert.match(source, /signAndroidDeviceManagement/);
  assert.match(source, /globalThis\.EZERO_CONNECT_IDENTITY = Object\.freeze/);
  assert.doesNotMatch(source, /exportKey\(["']pkcs8/);
  assert.doesNotMatch(source, /exportKey/);
});

test("root approval uses the Worker canonical tag and exact field order", () => {
  assert.match(source, /EZERO_ANDROID_ROOT_APPROVAL_V1/);
  assert.match(source, /\["root_fp", "device_fp", "challenge_id", "nonce", "audience", "expires_at"\]/);
  assert.match(source, /ROOT_APPROVAL_ROOT_MISMATCH/);
  assert.match(source, /ROOT_APPROVAL_BINDING_INVALID/);
});

test("root device management binds action and target device", () => {
  assert.match(source, /EZERO_ROOT_DEVICE_MANAGEMENT_V1/);
  assert.match(source, /\["root_fp", "action", "device_fp", "challenge_id", "nonce", "audience", "expires_at"\]/);
  assert.match(source, /LIST_DEVICES/);
  assert.match(source, /REVOKE_DEVICE/);
  assert.match(source, /ROOT_MANAGEMENT_ROOT_MISMATCH/);
});

test("signing enforces exact origin and short expiry before using root key", () => {
  assert.match(source, /ROOT_COMMAND_AUDIENCE_INVALID/);
  assert.match(source, /ROOT_COMMAND_EXPIRED/);
  assert.match(source, /Date\.now\(\) \+ 90000/);
});

test("browser signer returns WebCrypto P1363 signature and root fingerprint", () => {
  assert.match(source, /crypto\.subtle\.sign\([\s\S]*?record\.privateKey/);
  assert.match(source, /return \{ root_fp: rootFp, signature: toBase64Url\(signature\) \}/);
});
