"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { canonicalWakeBytes, signCallWakeV1 } = require("../src/call_wake_signer_v1.cjs");

const now = 1_800_000_000_000;
const fixtureText = fs.readFileSync(
  path.join(__dirname, "../../../android/app/src/test/resources/incoming_call_wake_v1.properties"),
  "utf8"
);
const fixture = Object.fromEntries(fixtureText.trim().split("\n").map(line => {
  const i = line.indexOf("=");
  return [line.slice(0, i), line.slice(i + 1)];
}));
const fields = {
  wake_v: fixture.wake_v,
  call_id: fixture.call_id,
  mode: fixture.mode,
  expires_at: fixture.expires_at,
  nonce: fixture.nonce
};

test("canonical bytes match the Android golden vector exactly", () => {
  assert.equal(canonicalWakeBytes(fields).toString("utf8"), fixture.canonical.replace(/\\n/g, "\n"));
});

test("signs a DER ECDSA signature in Base64URL without padding", () => {
  const pair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const payload = signCallWakeV1(fields, pair.privateKey, now);
  assert.match(payload.server_sig, /^[A-Za-z0-9_-]+$/);
  assert.equal(payload.server_sig.includes("="), false);
  const signature = Buffer.from(payload.server_sig, "base64url");
  assert.equal(crypto.verify("sha256", canonicalWakeBytes(fields), {
    key: pair.publicKey, dsaEncoding: "der"
  }, signature), true);
});

test("changed fields fail signature verification", () => {
  const pair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const payload = signCallWakeV1(fields, pair.privateKey, now);
  const changed = {...payload, mode: "VIDEO"};
  assert.equal(crypto.verify("sha256", canonicalWakeBytes(changed), {
    key: pair.publicKey, dsaEncoding: "der"
  }, Buffer.from(payload.server_sig, "base64url")), false);
});

test("rejects expired and overlong wake windows", () => {
  const pair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  assert.throws(() => signCallWakeV1({...fields, expires_at: String(now)}, pair.privateKey, now),
    /WAKE_EXPIRY_OUT_OF_RANGE/);
  assert.throws(() => signCallWakeV1({...fields, expires_at: String(now + 120_001)}, pair.privateKey, now),
    /WAKE_EXPIRY_OUT_OF_RANGE/);
});

test("rejects malformed version, mode, call ID and nonce", () => {
  const pair = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  assert.throws(() => canonicalWakeBytes({...fields, wake_v: "2"}), /INVALID_WAKE_VERSION/);
  assert.throws(() => canonicalWakeBytes({...fields, mode: "TEXT"}), /INVALID_CALL_MODE/);
  assert.throws(() => canonicalWakeBytes({...fields, call_id: "short"}), /INVALID_CALL_ID/);
  assert.throws(() => canonicalWakeBytes({...fields, nonce: "tiny"}), /INVALID_NONCE/);
});

test("a signature cannot be verified with a different public key", () => {
  const signer = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const other = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const payload = signCallWakeV1(fields, signer.privateKey, now);
  assert.equal(crypto.verify("sha256", canonicalWakeBytes(fields), {
    key: other.publicKey, dsaEncoding: "der"
  }, Buffer.from(payload.server_sig, "base64url")), false);
});
