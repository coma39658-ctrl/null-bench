import assert from "node:assert/strict";
import { createTrustedReconnectProof, TRUSTED_RECONNECT_PROTOCOL } from "../js/ezero_connect_trusted_reconnect_v1.mjs";

const b64 = bytes => Buffer.from(bytes).toString("base64url");
const relationshipId = "1".repeat(64);
const localFingerprint = "01:".repeat(31) + "01";
const remoteFingerprint = "02:".repeat(31) + "02";
const transcript = {
  v: 1,
  protocol: "E-ZERO-TRUST-1",
  purpose: "mutual-contact-save",
  participants: [
    { fingerprint: localFingerprint, publicKeySpki: "local-public-spki" },
    { fingerprint: remoteFingerprint, publicKeySpki: "remote-public-spki" }
  ]
};
const approvals = [
  { signerFingerprint: localFingerprint, signature: "local-approval" },
  { signerFingerprint: remoteFingerprint, signature: "remote-approval" }
];
const now = 1_800_000_000_000;
const canonical = value => value === null || typeof value !== "object"
  ? JSON.stringify(value)
  : Array.isArray(value) ? "[" + value.map(canonical).join(",") + "]"
  : "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(transcript)));
const derived = Buffer.from(digest).toString("hex");
const contact = {
  relationshipId: derived,
  remoteFingerprint,
  remotePublicKeySpki: "remote-public-spki",
  status: "TRUSTED",
  trustProof: { transcript, approvals }
};
const calls = [];
const trustApi = {
  async getTrustedContact(id) { calls.push(["get", id]); return contact; },
  async verifyApproval(t, approval) { calls.push(["verify", approval.signerFingerprint]); return t === transcript && approvals.includes(approval); }
};
const identityApi = {
  async getPublicIdentity() { return { fingerprint: localFingerprint, publicKeySpki: "local-public-spki" }; },
  async signCanonical(payload) {
    calls.push(["sign", payload.protocol]);
    return "A".repeat(86);
  }
};
const proof = await createTrustedReconnectProof({
  relationshipId: derived,
  challenge: b64(new Uint8Array(32).fill(7)),
  challengeExpiresAt: now + 20_000,
  trustApi,
  identityApi,
  now
});
assert.equal(proof.payload.protocol, TRUSTED_RECONNECT_PROTOCOL);
assert.equal(proof.payload.relationshipId, derived);
assert.equal(proof.payload.localFingerprint, localFingerprint);
assert.equal(proof.payload.remoteFingerprint, remoteFingerprint);
assert.equal(proof.payload.challengeExpiresAt, now + 20_000);
assert.equal(proof.approvals.length, 2);
assert.deepEqual(calls.filter(c => c[0] === "verify").length, 2);
assert.equal(calls.at(-1)[0], "sign");

await assert.rejects(() => createTrustedReconnectProof({
  relationshipId: derived, challenge: b64(new Uint8Array(32)),
  challengeExpiresAt: now + 31_000, trustApi, identityApi, now
}), /RECONNECT_CHALLENGE_EXPIRED_OR_INVALID/);

await assert.rejects(() => createTrustedReconnectProof({
  relationshipId: derived, challenge: b64(new Uint8Array(32)),
  challengeExpiresAt: now + 20_000,
  trustApi: { ...trustApi, getTrustedContact: async () => ({ ...contact, status: "REVOKED" }) },
  identityApi, now
}), /RECONNECT_CONTACT_NOT_TRUSTED/);

await assert.rejects(() => createTrustedReconnectProof({
  relationshipId: "f".repeat(64), challenge: b64(new Uint8Array(32)),
  challengeExpiresAt: now + 20_000, trustApi, identityApi, now
}), /RECONNECT_CONTACT_NOT_TRUSTED/);

console.log("PASS relationship ID is derived from mutual trust transcript");
console.log("PASS both saved signatures are re-verified before reconnect");
console.log("PASS reconnect challenge is short-lived and identity-bound");
console.log("PASS local device signs the reconnect proof");
console.log("PASS revoked contacts and transcript substitution fail closed");
console.log("BOUNDARY: client proof contract only; no Durable Object rendezvous, push wakeup, or live device connection yet");
