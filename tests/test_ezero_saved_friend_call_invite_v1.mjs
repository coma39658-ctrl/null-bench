import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { canonicalCallInvite, encodeCallInvite, verifyCallInvite, CALL_INVITE_LIMITS } from "../signaling/ezero-connect-v1/inbox_protocol.mjs";

if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.atob) globalThis.atob = value => Buffer.from(value, "base64").toString("binary");
if (!globalThis.btoa) globalThis.btoa = value => Buffer.from(value, "binary").toString("base64");

const b64url = bytes => Buffer.from(bytes).toString("base64url");
const fingerprint = async spki => {
  const digest = await crypto.subtle.digest("SHA-256", spki);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
};
const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
const spki = new Uint8Array(await crypto.subtle.exportKey("spki", keys.publicKey));
const callerFingerprint = await fingerprint(spki);
const recipientFingerprint = "AB:".repeat(31) + "CD";
const now = Date.now();
const payload = {
  v: 1, protocol: "E-ZERO-SAVED-FRIEND-CALL-1",
  origin: "https://staging.example.test",
  callerFingerprint, callerPublicKeySpki: b64url(spki),
  recipientFingerprint, relationshipId: "c".repeat(64),
  callId: "A".repeat(32), nonce: "B".repeat(32),
  mode: "audio", issuedAt: now, expiresAt: now + 20_000
};
const signature = b64url(new Uint8Array(await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" }, keys.privateKey,
  new TextEncoder().encode(canonicalCallInvite(payload))
)));
const code = encodeCallInvite({ payload, signature });
const verified = await verifyCallInvite(code, payload.origin, recipientFingerprint, now);
assert.equal(verified.callId, payload.callId);
assert.equal(verified.callerFingerprint, callerFingerprint);
assert.equal(CALL_INVITE_LIMITS.ttlMs, 30_000);

await assert.rejects(() => verifyCallInvite(code, "https://wrong.example.test", recipientFingerprint, now), /CALL_INVITE_BINDING_INVALID/);
await assert.rejects(() => verifyCallInvite(code, payload.origin, callerFingerprint, now), /CALL_INVITE_BINDING_INVALID/);
await assert.rejects(() => verifyCallInvite(code, payload.origin, recipientFingerprint, now + 31_000), /CALL_INVITE_EXPIRED_OR_TIME_INVALID/);

const tamperedPayload = { ...payload, mode: "video" };
const tampered = encodeCallInvite({ payload: tamperedPayload, signature });
await assert.rejects(() => verifyCallInvite(tampered, payload.origin, recipientFingerprint, now), /CALL_INVITE_SIGNATURE_INVALID/);

const malformed = encodeCallInvite({ payload: { ...payload, unexpected: true }, signature });
await assert.rejects(() => verifyCallInvite(malformed, payload.origin, recipientFingerprint, now), /CALL_INVITE_FIELDS_INVALID/);

console.log("EZERO_SAVED_FRIEND_CALL_INVITE_SIGNATURE_BINDING_EXPIRY_PASS");
