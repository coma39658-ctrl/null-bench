import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import RegistryWorker, { EzeroFriendshipRelationship } from "../signaling/ezero-friendship-registry-v1/worker.mjs";

globalThis.crypto ||= webcrypto;
const enc = new TextEncoder();
function b64url(bytes) {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}
async function identity() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const spki = b64url(await crypto.subtle.exportKey("spki", pair.publicKey));
  const digest = await crypto.subtle.digest("SHA-256", await crypto.subtle.exportKey("spki", pair.publicKey));
  const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
  return { pair, spki, fingerprint };
}
async function signedHandshake(who, role, transcript) {
  const payload = {
    v: 1, protocol: "E-ZERO-SIGNAL-HELLO-1", origin: transcript.origin,
    roomId: transcript.roomId, inviteNonce: transcript.inviteNonce, role,
    fingerprint: who.fingerprint, publicKeySpki: who.spki,
    challenge: b64url(crypto.getRandomValues(new Uint8Array(32))),
    challengeExpiresAt: transcript.inviteIssuedAt + 30_000
  };
  const signature = b64url(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, who.pair.privateKey, enc.encode(canonical(payload))));
  return { payload, signature };
}
const storage = new Map();
const relationship = new EzeroFriendshipRelationship({
  storage: {
    async get(key) { return storage.get(key); },
    async put(key, value) { storage.set(key, structuredClone(value)); }
  },
  blockConcurrencyWhile(fn) { return fn(); }
});
const namespace = {
  idFromName(name) { return name; },
  get() { return { fetch: (url, init) => relationship.fetch(new Request(url, init)) }; }
};
const origin = "https://ezero-connect-pairing-v2-preview-20261123.onrender.com";
const env = { PUBLIC_ORIGIN: origin, RELATIONSHIPS: namespace };
const host = await identity();
const guest = await identity();
const now = Date.now();
const participants = [
  { fingerprint: host.fingerprint, publicKeySpki: host.spki },
  { fingerprint: guest.fingerprint, publicKeySpki: guest.spki }
].sort((a,b) => a.fingerprint.localeCompare(b.fingerprint));
const transcript = {
  v: 2, protocol: "E-ZERO-TRUST-2", purpose: "consented-invite-auto-save",
  origin, roomId: "R".repeat(32), inviteNonce: "N".repeat(32),
  inviteIssuedAt: now - 1000, inviteExpiresAt: now + 60_000,
  inviterFingerprint: host.fingerprint, participants
};
const relationshipId = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(canonical(transcript)))), b => b.toString(16).padStart(2, "0")).join("");
const handshakes = {
  host: await signedHandshake(host, "host", transcript),
  guest: await signedHandshake(guest, "guest", transcript)
};
const request = body => RegistryWorker.fetch(new Request("https://registry.example/v1/relationships/register-v2", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(body)
}), env);
let response = await request({ protocol: "E-ZERO-REGISTRY-V2-REGISTER-1", relationshipId, transcript, handshakes });
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { protocol: "E-ZERO-REGISTRY-RESULT-2", relationshipId, status: "ACTIVE" });
const callPayload = {
  v: 1, protocol: "E-ZERO-SAVED-FRIEND-CALL-1", origin,
  callerFingerprint: host.fingerprint, callerPublicKeySpki: host.spki,
  recipientFingerprint: guest.fingerprint, relationshipId,
  callId: "C".repeat(32), nonce: "Q".repeat(32), mode: "video",
  issuedAt: Date.now(), expiresAt: Date.now() + 20_000
};
const callSignature = b64url(await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" }, host.pair.privateKey, enc.encode(canonical(callPayload))
));
const auth = {
  protocol: "E-ZERO-SAVED-FRIEND-AUTH-1", relationshipId,
  callerFingerprint: host.fingerprint, recipientFingerprint: guest.fingerprint,
  callId: callPayload.callId, nonce: callPayload.nonce, mode: callPayload.mode,
  expiresAt: callPayload.expiresAt, signedInvite: { payload: callPayload, signature: callSignature }
};
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { "Origin": "https://evil.example", "Content-Type": "application/json" }, body: JSON.stringify(auth)
}), env);
assert.equal(response.status, 403);
const forgedAuth = structuredClone(auth);
forgedAuth.signedInvite.signature = handshakes.guest.signature;
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(forgedAuth)
}), env);
assert.equal(response.status, 400);
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(auth)
}), env);
assert.equal(response.status, 200);
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" }, body: JSON.stringify(auth)
}), env);
assert.equal(response.status, 409);
const tampered = structuredClone(handshakes);
tampered.guest.signature = handshakes.host.signature;
const otherId = "f".repeat(64);
response = await request({ protocol: "E-ZERO-REGISTRY-V2-REGISTER-1", relationshipId: otherId, transcript, handshakes: tampered });
assert.equal(response.status, 400);
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/relationships/register-v2", {
  method: "POST", headers: { Origin: "https://evil.example", "Content-Type": "application/json" },
  body: JSON.stringify({ protocol: "E-ZERO-REGISTRY-V2-REGISTER-1", relationshipId, transcript, handshakes })
}), env);
assert.equal(response.status, 403);
console.log("EZERO_V2_MUTUAL_PAIRING_REGISTRY_PASS");
