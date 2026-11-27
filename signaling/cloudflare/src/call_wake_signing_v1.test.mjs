import test from "node:test";
import assert from "node:assert/strict";
import { createPublicKey, verify as verifySignature, webcrypto } from "node:crypto";
import { canonicalCallWakeV1, signCallWakeV1 } from "./call_wake_signing_v1.js";

globalThis.crypto ??= webcrypto;
const NOW = 1_800_000_000_000;
const valid = {
  call_id: "call_12345678",
  mode: "AUDIO",
  nonce: "nonce_1234567890"
};

test("canonical bytes match Android verifier exactly, including final LF", () => {
  const actual = canonicalCallWakeV1({
    wake_v: "1", ...valid, expires_at: String(NOW + 90_000)
  });
  const expected = new TextEncoder().encode(
    "EZERO_CALL_WAKE_V1\n" +
    "wake_v=1\n" +
    "call_id=call_12345678\n" +
    "mode=AUDIO\n" +
    "expires_at=1800000090000\n" +
    "nonce=nonce_1234567890\n"
  );
  assert.deepEqual(actual, expected);
});

test("signed envelope verifies with public key and Android-compatible DER ECDSA", async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const envelope = await signCallWakeV1({ privateKey: pair.privateKey, ...valid, nowMillis: NOW });
  const signature = Uint8Array.from(
    atob(envelope.server_sig.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - envelope.server_sig.length % 4) % 4)),
    c => c.charCodeAt(0)
  );
  assert.equal(signature[0], 0x30, "server_sig must be ASN.1 DER for Android SHA256withECDSA");
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const publicKey = createPublicKey({ key: Buffer.from(spki), format: "der", type: "spki" });
  const ok = verifySignature(
    "sha256",
    Buffer.from(canonicalCallWakeV1(envelope)),
    publicKey,
    Buffer.from(signature)
  );
  assert.equal(ok, true, "Android-compatible DER signature must verify with the matching public key");
  assert.equal(envelope.expires_at, String(NOW + 90_000));
  assert.equal(envelope.wake_v, "1");
});

test("rejects malformed fields and unsupported modes", () => {
  assert.throws(() => canonicalCallWakeV1({
    wake_v: "1", ...valid, mode: "TEXT", expires_at: String(NOW + 90_000)
  }), TypeError);
  assert.throws(() => canonicalCallWakeV1({
    wake_v: "1", ...valid, nonce: "short", expires_at: String(NOW + 90_000)
  }), TypeError);
  assert.throws(() => canonicalCallWakeV1({
    wake_v: "2", ...valid, expires_at: String(NOW + 90_000)
  }), TypeError);
});

test("refuses a public key or a non-P256 signing key", async () => {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  await assert.rejects(
    signCallWakeV1({ privateKey: pair.publicKey, ...valid, nowMillis: NOW }),
    TypeError
  );
});
