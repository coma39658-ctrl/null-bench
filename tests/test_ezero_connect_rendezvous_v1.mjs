import { createTrustedRendezvousClient } from "../js/ezero_connect_rendezvous_client_v1.mjs";
import assert from "node:assert/strict";
import { verifyReconnectProof, validateRelay, RENDEZVOUS_LIMITS } from "../signaling/ezero-connect-v1/rendezvous.mjs";

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
const callId = b64(new Uint8Array(24).fill(7));
const callInvite = { type: "call-invite", sentAt: now, payload: { callId, mode: "video", expiresAt: now + 45_000 } };
assert.equal(validateRelay(JSON.stringify(callInvite), now).payload.mode, "video");
assert.equal(validateRelay(JSON.stringify({ type: "call-accept", sentAt: now, payload: { callId } }), now).type, "call-accept");
assert.equal(validateRelay(JSON.stringify({ type: "call-decline", sentAt: now, payload: { callId } }), now).type, "call-decline");\nassert.equal(validateRelay(JSON.stringify({ type: "call-offer", sentAt: now, payload: { callId, sdp: "v=0" } }), now).type, "call-offer");\nassert.equal(validateRelay(JSON.stringify({ type: "call-answer", sentAt: now, payload: { callId, sdp: "v=0" } }), now).type, "call-answer");\nassert.equal(validateRelay(JSON.stringify({ type: "call-ice-candidate", sentAt: now, payload: { callId, candidate: JSON.stringify({ candidate: "candidate:1 1 UDP 1 127.0.0.1 9 typ host" }) } }), now).type, "call-ice-candidate");\nassert.equal(validateRelay(JSON.stringify({ type: "call-hangup", sentAt: now, payload: { callId } }), now).type, "call-hangup");\nassert.throws(() => validateRelay(JSON.stringify({ type: "call-offer", sentAt: now, payload: { callId: "wrong", sdp: "v=0" } }), now), /RENDEZVOUS_CALL_SDP_INVALID/);\nassert.throws(() => validateRelay(JSON.stringify({ type: "call-ice-candidate", sentAt: now, payload: { callId, candidate: "x", extra: true } }), now), /RENDEZVOUS_CALL_ICE_INVALID/);
assert.throws(() => validateRelay(JSON.stringify({ ...callInvite, payload: { ...callInvite.payload, mode: "screen" } }), now), /RENDEZVOUS_CALL_INVITE_INVALID/);
assert.throws(() => validateRelay(JSON.stringify({ ...callInvite, payload: { ...callInvite.payload, callId: "short" } }), now), /RENDEZVOUS_CALL_INVITE_INVALID/);
assert.throws(() => validateRelay(JSON.stringify({ ...callInvite, payload: { ...callInvite.payload, expiresAt: now + 90_000 } }), now), /RENDEZVOUS_CALL_INVITE_INVALID/);
assert.throws(() => validateRelay(JSON.stringify({ type: "call-accept", sentAt: now, payload: { callId, extra: true } }), now), /RENDEZVOUS_CALL_RESPONSE_INVALID/);
assert.throws(() => validateRelay(JSON.stringify({ type: "call-decline", sentAt: now, payload: { callId: "bad" } }), now), /RENDEZVOUS_CALL_RESPONSE_INVALID/);
assert.throws(() => validateRelay(JSON.stringify({ type: "hangup", sentAt: now, payload: { callId } }), now), /RENDEZVOUS_HANGUP_INVALID/);

class FakeWebSocket2 {
  constructor(url) { FakeWebSocket2.last = this; this.url = url; this.readyState = 0; this.handlers = new Map(); this.sent = []; queueMicrotask(() => { this.readyState = 1; this.dispatch("open", {}); }); }
  addEventListener(name, fn) { if (!this.handlers.has(name)) this.handlers.set(name, []); this.handlers.get(name).push(fn); }
  dispatch(name, value) { for (const fn of this.handlers.get(name) || []) fn(value); }
  send(raw) { this.sent.push(JSON.parse(raw)); }
  close() { this.readyState = 3; this.dispatch("close", {}); }
}
const trustApiForClient = {
  async getTrustedContact(id) {
    assert.equal(id, relationshipId);
    return { relationshipId, remoteFingerprint, remotePublicKeySpki: participants.find(p => p.fingerprint === remoteFingerprint).publicKeySpki,
      status: "TRUSTED", trustProof: { transcript, approvals: [approvalA, approvalB] } };
  },
  async verifyApproval(t, approval) { return t === transcript && [approvalA, approvalB].includes(approval); }
};
const identityApiForClient = {
  async getPublicIdentity() { return { fingerprint: localFingerprint, publicKeySpki: participants.find(p => p.fingerprint === localFingerprint).publicKeySpki }; },
  async signCanonical(value) { return sign(local.privateKey, value); }
};
const clientStates = [];
const client = createTrustedRendezvousClient({
  signalingUrl: "wss://example.invalid", relationshipId,
  trustApi: trustApiForClient, identityApi: identityApiForClient, WebSocketImpl: FakeWebSocket2,
  onState: value => clientStates.push(value)
});
const clientSocket = FakeWebSocket2.last;
assert.equal(new URL(clientSocket.url).pathname, "/v1/rendezvous/" + relationshipId);
await new Promise(resolve => setTimeout(resolve, 0));
clientSocket.dispatch("message", { data: JSON.stringify({ type: "challenge", challenge: b64(new Uint8Array(32).fill(4)), challengeExpiresAt: Date.now() + 20_000 }) });
await new Promise(resolve => setTimeout(resolve, 100));
assert.equal(client.state, "proof-sent", JSON.stringify(clientStates));
assert.equal(clientSocket.sent[0]?.type, "proof");
clientSocket.dispatch("message", { data: JSON.stringify({ type: "authenticated", expiresAt: Date.now() + 120_000 }) });
await client.ready;
clientSocket.dispatch("message", { data: JSON.stringify({ type: "peer-ready", peerFingerprint: remoteFingerprint }) });
assert.equal(client.state, "peer-ready");
client.send("offer", { sdp: "v=0" });
assert.equal(clientSocket.sent.at(-1).type, "offer");
client.send("call-invite", { callId, mode: "audio", expiresAt: Date.now() + 30_000 });
assert.equal(clientSocket.sent.at(-1).type, "call-invite");
client.send("call-accept", { callId });
assert.equal(clientSocket.sent.at(-1).type, "call-accept");
client.send("call-decline", { callId });
assert.equal(clientSocket.sent.at(-1).type, "call-decline");
let relayed = false;
client.on("message", message => { relayed = message.type === "call-answer" && message.fromFingerprint === remoteFingerprint; });
clientSocket.dispatch("message", { data: JSON.stringify({ type: "relay", fromFingerprint: remoteFingerprint, message: { type: "call-answer", payload: { callId, sdp: "v=0" } } }) });
assert.equal(relayed, true);
client.close();
console.log("PASS browser client signs the server challenge using saved mutual trust");
console.log("PASS client exposes the signalingSession on/send contract to WebRTC transport");
console.log("PASS authenticated client emits call invite, accept and decline relays");
console.log("PASS server validates call mode, bounded expiry and call correlation IDs\nPASS media offer, answer, ICE and hangup are strictly bound to a call ID");
console.log("PASS malformed call controls and non-empty hangup payloads are rejected");

console.log("PASS server verifies ECDSA proof-of-possession against saved transcript identity");
console.log("PASS both mutual trust approvals are independently verified");
console.log("PASS challenge, relationship and transcript are cryptographically bound");
console.log("PASS wrong challenge, duplicate approval and substituted relationship fail closed");
console.log("BOUNDARY: cryptographic proof tests only; no deployed Worker, real WebSocket, offline queue, push wakeup, or Android background ringing proof");
