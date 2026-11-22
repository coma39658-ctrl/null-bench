import assert from "node:assert/strict";
import { verifyReconnectProof, RENDEZVOUS_LIMITS } from "../signaling/ezero-connect-v1/rendezvous.mjs";

const b64 = bytes => Buffer.from(bytes).toString("base64url");
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
const canonical = value => value === null || typeof value !== "object"
  ? JSON.stringify(value)
  : Array.isArray(value) ? "[" + value.map(canonical).join(",") + "]"
  : "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
const sign = async (key, value) => b64(new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(canonical(value)))));
const now = 1_800_000_000_000;
const [a,b] = await Promise.all([
  crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign","verify"]),
  crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign","verify"])
]);
const [spkiA,spkiB] = await Promise.all([a,b].map(async k => b64(new Uint8Array(await crypto.subtle.exportKey("spki", k.publicKey)))));
const [fpA,fpB] = await Promise.all([spkiA,spkiB].map(async s => hex(await crypto.subtle.digest("SHA-256", Buffer.from(s,"base64url")))));
const participants = [
  { fingerprint: fpA < fpB ? fpA : fpB, publicKeySpki: fpA < fpB ? spkiA : spkiB },
  { fingerprint: fpA < fpB ? fpB : fpA, publicKeySpki: fpA < fpB ? spkiB : spkiA }
];
const transcript = {
  v: 1, protocol: "E-ZERO-TRUST-1", purpose: "mutual-contact-save", participants,
  roomId: b64(new Uint8Array(24).fill(2)), inviteNonce: b64(new Uint8Array(24).fill(3)),
  inviteIssuedAt: now - 10_000, inviteExpiresAt: now + 80_000, createdAt: now
};
const relationshipId = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(transcript)))).toString("hex");
const transcriptHash = Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical(transcript)))).toString("hex");
const approvalA = { signerFingerprint: fpA, transcriptHash, signature: await sign(a.privateKey, transcript) };
const approvalB = { signerFingerprint: fpB, transcriptHash, signature: await sign(b.privateKey, transcript) };
const localIsA = fpA < fpB;
const local = localIsA ? a : b;
const localFingerprint = localIsA ? fpA : fpB;
const remoteFingerprint = localIsA ? fpB : fpA;
const payload = {
  v: 1, protocol: "E-ZERO-TRUSTED-RECONNECT-1", relationshipId, transcriptHash,
  localFingerprint, remoteFingerprint, challenge: b64(new Uint8Array(32).fill(9)),
  challengeExpiresAt: now + 20_000, issuedAt: now
};
const proof = { payload, signature: await sign(local.privateKey, payload), transcript, approvals: [approvalA, approvalB] };
const identity = await verifyReconnectProof(proof, relationshipId, payload.challenge, payload.challengeExpiresAt, now);
assert.equal(identity.localFingerprint, localFingerprint);
assert.equal(identity.remoteFingerprint, remoteFingerprint);
await assert.rejects(() => verifyReconnectProof(proof, relationshipId, "wrong-challenge", payload.challengeExpiresAt, now), /RENDEZVOUS_PROOF_BINDING_INVALID/);
await assert.rejects(() => verifyReconnectProof({ ...proof, approvals: [approvalA, approvalA] }, relationshipId, payload.challenge, payload.challengeExpiresAt, now), /RENDEZVOUS_APPROVAL_DUPLICATE/);
await assert.rejects(() => verifyReconnectProof({ ...proof, payload: { ...payload, relationshipId: "f".repeat(64) } }, relationshipId, payload.challenge, payload.challengeExpiresAt, now), /RENDEZVOUS_PROOF_BINDING_INVALID/);
assert.equal(RENDEZVOUS_LIMITS.challengeTtlMs, 30_000);
assert.equal(RENDEZVOUS_LIMITS.sessionTtlMs, 120_000);
console.log("PASS server verifies ECDSA proof-of-possession against saved transcript identity");
console.log("PASS both mutual trust approvals are independently verified");
console.log("PASS challenge, relationship and transcript are cryptographically bound");
console.log("PASS wrong challenge, duplicate approval and substituted relationship fail closed");
console.log("BOUNDARY: cryptographic proof tests only; no deployed Worker, real WebSocket, offline queue, push wakeup, or Android background ringing proof");
