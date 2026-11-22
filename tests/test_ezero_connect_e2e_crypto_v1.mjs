import assert from "node:assert/strict";
import {
  createSessionOffer, acceptSessionOffer, finishSessionOffer, createSecureChannel
} from "../js/ezero_connect_e2e_crypto_v1.mjs";

const enc = new TextEncoder();
const b64u = bytes => Buffer.from(bytes).toString("base64url");
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
async function device() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const digest = await crypto.subtle.digest("SHA-256", spki);
  const fingerprint = hex(digest);
  const identity = { fingerprint, publicKeySpki: b64u(spki) };
  const signCanonical = async value => b64u(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, enc.encode(canonical(value))
  ));
  return { identity, signCanonical };
}
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}
const a = await device(), b = await device();
const relationshipId = "a".repeat(64), sessionId = b64u(crypto.getRandomValues(new Uint8Array(24)));
const trustA = { relationshipId, remoteFingerprint: b.identity.fingerprint, remotePublicKeySpki: b.identity.publicKeySpki, status: "TRUSTED" };
const trustB = { relationshipId, remoteFingerprint: a.identity.fingerprint, remotePublicKeySpki: a.identity.publicKeySpki, status: "TRUSTED" };
const pending = await createSessionOffer({ relationshipId, sessionId, trust: trustA, identity: a.identity, signCanonical: a.signCanonical });
const accepted = await acceptSessionOffer({ hello: pending.hello, relationshipId, sessionId, trust: trustB, identity: b.identity, signCanonical: b.signCanonical });
const finished = await finishSessionOffer({ pending, response: accepted.response });
const channelA = createSecureChannel({ keys: finished.keys, relationshipId, sessionId, role: "initiator" });
const channelB = createSecureChannel({ keys: accepted.keys, relationshipId, sessionId, role: "responder" });
const message = enc.encode("E-ZERO encrypted test");
const frame = await channelA.encrypt("text", message);
assert.notEqual(frame.ciphertext, b64u(message));
assert.equal(new TextDecoder().decode((await channelB.decrypt(frame)).bytes), "E-ZERO encrypted test");
await assert.rejects(() => channelB.decrypt(frame), /E2E_FRAME_REPLAY_OR_CONTEXT_INVALID/);
const altered = await channelA.encrypt("text", enc.encode("tamper target"));
const alteredFrame = { ...altered, metadata: { ...altered.metadata, relationshipId: "b".repeat(64) } };
await assert.rejects(() => channelB.decrypt(alteredFrame), /E2E_FRAME_REPLAY_OR_CONTEXT_INVALID/);
const tampered = await channelA.encrypt("text", enc.encode("ciphertext tamper"));
const tamperedFrame = { ...tampered, ciphertext: (tampered.ciphertext[0] === "A" ? "B" : "A") + tampered.ciphertext.slice(1) };
await assert.rejects(() => channelB.decrypt(tamperedFrame), /E2E_CIPHERTEXT_AUTHENTICATION_FAILED/);
await assert.rejects(() => acceptSessionOffer({
  hello: { ...pending.hello, signature: b64u(crypto.getRandomValues(new Uint8Array(64))) },
  relationshipId, sessionId, trust: trustB, identity: b.identity, signCanonical: b.signCanonical
}), /E2E_HANDSHAKE_SIGNATURE_INVALID/);
await assert.rejects(() => createSessionOffer({
  relationshipId, sessionId, trust: { ...trustA, status: "REVOKED" }, identity: a.identity, signCanonical: a.signCanonical
}), /E2E_RELATIONSHIP_NOT_TRUSTED/);
await assert.rejects(() => createSessionOffer({
  relationshipId, sessionId, trust: { ...trustA, remoteFingerprint: "FF:".repeat(31) + "FF" }, identity: a.identity, signCanonical: a.signCanonical
}), /E2E_REMOTE_KEY_FINGERPRINT_MISMATCH/);
await assert.rejects(() => createSessionOffer({
  relationshipId: "c".repeat(64), sessionId, trust: trustA, identity: a.identity, signCanonical: a.signCanonical
}), /E2E_RELATIONSHIP_NOT_TRUSTED/);
await assert.rejects(() => channelA.encrypt("text", new Uint8Array(256 * 1024 + 1)), /E2E_FRAME_SIZE_INVALID/);
console.log("EZERO_E2E_HANDSHAKE_DERIVATION_ENCRYPTION_TAMPER_REPLAY_TRUST_LIMITS_PASS");
