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
async function approval(identity, transcript) {
  const bytes = enc.encode(canonical(transcript));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const transcriptHash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  const signature = b64url(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, identity.pair.privateKey, bytes));
  return { signerFingerprint: identity.fingerprint, transcriptHash, signature };
}
const storage = new Map();
const state = {
  storage: {
    async get(key) { return storage.get(key); },
    async put(key, value) { storage.set(key, structuredClone(value)); }
  },
  blockConcurrencyWhile(fn) { return fn(); }
};
const relationship = new EzeroFriendshipRelationship(state);
const namespace = {
  idFromName(name) { return name; },
  get() { return { fetch: (url, init) => relationship.fetch(new Request(url, init)) }; }
};
const origin = "https://ezero-connect-pairing-v2-preview-20261123.onrender.com";
const env = { PUBLIC_ORIGIN: origin, RELATIONSHIPS: namespace };
const a = await identity();
const b = await identity();
const participants = [
  { fingerprint: a.fingerprint, publicKeySpki: a.spki },
  { fingerprint: b.fingerprint, publicKeySpki: b.spki }
].sort((x, y) => x.fingerprint.localeCompare(y.fingerprint));
const now = Date.now();
const transcript = {
  v: 1, protocol: "E-ZERO-TRUST-1", purpose: "mutual-contact-save",
  participants, roomId: "R".repeat(32), inviteNonce: "N".repeat(32),
  inviteIssuedAt: now - 1000, inviteExpiresAt: now + 60_000, createdAt: now
};
const relationshipIdBytes = await crypto.subtle.digest("SHA-256", enc.encode(canonical(transcript)));
const relationshipId = Array.from(new Uint8Array(relationshipIdBytes), b => b.toString(16).padStart(2, "0")).join("");
const approvals = [await approval(a, transcript), await approval(b, transcript)];
const postApproval = (approval) => RegistryWorker.fetch(new Request("https://registry.example/v1/relationships/approve", {
  method: "POST", headers: { Origin: origin, "Content-Type": "application/json" },
  body: JSON.stringify({ protocol: "E-ZERO-REGISTRY-APPROVAL-1", relationshipId, transcript, approval })
}), env);
let response = await postApproval(approvals[0]);
assert.equal(response.status, 202);
assert.equal((await response.json()).status, "PENDING");
const authBody = {
  protocol: "E-ZERO-SAVED-FRIEND-AUTH-1", relationshipId,
  callerFingerprint: a.fingerprint, recipientFingerprint: b.fingerprint,
  callId: "C".repeat(32), nonce: "Q".repeat(32), mode: "audio", expiresAt: Date.now() + 20_000
};
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authBody)
}), env);
assert.equal(response.status, 403);
response = await postApproval(approvals[1]);
assert.equal(response.status, 200);
assert.equal((await response.json()).status, "ACTIVE");
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authBody)
}), env);
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), { authorized: true, relationshipId });
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authBody)
}), env);
assert.equal(response.status, 409);
const wrongPeer = { ...authBody, callId: "D".repeat(32), nonce: "S".repeat(32), recipientFingerprint: "CC:".repeat(31) + "03" };
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/authorize-call", {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(wrongPeer)
}), env);
assert.equal(response.status, 403);
response = await postApproval(approvals[0]);
assert.equal(response.status, 200, "same approval must be idempotent");
response = await RegistryWorker.fetch(new Request("https://registry.example/v1/relationships/approve", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ protocol: "E-ZERO-REGISTRY-APPROVAL-1", relationshipId, transcript, approval: approvals[0] })
}), env);
assert.equal(response.status, 403, "browser approval endpoint requires exact configured origin");
console.log("EZERO_MUTUAL_FRIENDSHIP_REGISTRY_V1_PASS");
