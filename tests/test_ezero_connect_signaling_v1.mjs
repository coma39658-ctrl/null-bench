import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  stableCanonical,
  verifyInviteCode,
  handshakePayload,
  verifyHandshake,
  validateSignalMessage
} from "../signaling/ezero-connect-v1/worker.mjs";

const encoder = new TextEncoder();
const base64url = bytes => Buffer.from(bytes).toString("base64url");
const fingerprint = async spki => {
  const digest = await crypto.subtle.digest("SHA-256", spki);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
};
const makeDevice = async () => {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  return { privateKey: pair.privateKey, publicKeySpki: base64url(spki), fingerprint: await fingerprint(spki) };
};
const sign = async (key, value) => base64url(await crypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(stableCanonical(value))
));

const origin = "https://ezero-connect-staging.invalid";
const now = Date.now();
const host = await makeDevice();
const guest = await makeDevice();
const roomId = base64url(crypto.getRandomValues(new Uint8Array(24)));
const nonce = base64url(crypto.getRandomValues(new Uint8Array(24)));
const invitePayload = {
  v: 1,
  origin,
  inviterFingerprint: host.fingerprint,
  inviterPublicKeySpki: host.publicKeySpki,
  roomId,
  issuedAt: now,
  expiresAt: now + 90_000,
  nonce
};
const inviteSignature = await sign(host.privateKey, invitePayload);
const inviteEnvelope = { payload: invitePayload, signature: inviteSignature };
const inviteCode = "EZERO1." + base64url(encoder.encode(stableCanonical(inviteEnvelope)));

const verifiedInvite = await verifyInviteCode(inviteCode, origin, roomId, now);
assert.equal(verifiedInvite.nonce, nonce);
assert.equal(verifiedInvite.inviterFingerprint, host.fingerprint);
await assert.rejects(() => verifyInviteCode(inviteCode, "https://wrong.invalid", roomId, now), /INVITE_ORIGIN_OR_ROOM_INVALID/);
await assert.rejects(() => verifyInviteCode(inviteCode, origin, base64url(crypto.getRandomValues(new Uint8Array(24))), now), /INVITE_ORIGIN_OR_ROOM_INVALID/);
await assert.rejects(() => verifyInviteCode(inviteCode, origin, roomId, invitePayload.expiresAt + 120_001), /INVITE_EXPIRED_OR_TIME_INVALID/);
const skewedPastNow = invitePayload.issuedAt + 120_000;
assert.equal((await verifyInviteCode(inviteCode, origin, roomId, skewedPastNow)).nonce, nonce,
  "A valid signed invite remains usable with a bounded two-minute device/server clock skew");
await assert.rejects(() => verifyInviteCode(inviteCode, origin, roomId, invitePayload.expiresAt + 120_001),
  /INVITE_EXPIRED_OR_TIME_INVALID/);
const futureIssuedPayload = { ...invitePayload, issuedAt: now + 120_000, expiresAt: now + 210_000 };
const futureIssuedCode = "EZERO1." + base64url(encoder.encode(stableCanonical({
  payload: futureIssuedPayload, signature: await sign(host.privateKey, futureIssuedPayload)
})));
assert.equal((await verifyInviteCode(futureIssuedCode, origin, roomId, now)).nonce, nonce,
  "A signed invite tolerates bounded fast-device clock skew");

const tamperedEnvelope = structuredClone(inviteEnvelope);
tamperedEnvelope.payload.issuedAt += 1;
const tamperedCode = "EZERO1." + base64url(encoder.encode(JSON.stringify(tamperedEnvelope)));
await assert.rejects(() => verifyInviteCode(tamperedCode, origin, roomId, now), /INVITE_SIGNATURE_INVALID/);

const room = {
  roomId,
  origin,
  inviteNonce: nonce,
  hostFingerprint: host.fingerprint,
  hostPublicKeySpki: host.publicKeySpki,
  guestFingerprint: null,
  guestPublicKeySpki: null,
  expiresAt: now + 600_000
};
const attachmentHost = {
  state: "PENDING", roomId, role: "host", origin,
  challenge: base64url(crypto.getRandomValues(new Uint8Array(32))),
  challengeExpiresAt: now + 30_000
};
const hostSignedChallenge = handshakePayload({
  origin, roomId, inviteNonce: nonce, role: "host",
  fingerprint: host.fingerprint, publicKeySpki: host.publicKeySpki,
  challenge: attachmentHost.challenge, challengeExpiresAt: attachmentHost.challengeExpiresAt
});
const hostHello = {
  type: "hello", inviteNonce: nonce, fingerprint: host.fingerprint,
  publicKeySpki: host.publicKeySpki,
  signature: await sign(host.privateKey, hostSignedChallenge)
};
const verifiedHostHandshake = await verifyHandshake(hostHello, attachmentHost, room, now);
assert.equal(verifiedHostHandshake.fingerprint, host.fingerprint);
assert.deepEqual(verifiedHostHandshake.proof.payload, hostSignedChallenge);
assert.equal(verifiedHostHandshake.proof.signature, hostHello.signature);

const attachmentGuest = {
  state: "PENDING", roomId, role: "guest", origin,
  challenge: base64url(crypto.getRandomValues(new Uint8Array(32))),
  challengeExpiresAt: now + 30_000
};
const guestSignedChallenge = handshakePayload({
  origin, roomId, inviteNonce: nonce, role: "guest",
  fingerprint: guest.fingerprint, publicKeySpki: guest.publicKeySpki,
  challenge: attachmentGuest.challenge, challengeExpiresAt: attachmentGuest.challengeExpiresAt
});
const guestHello = {
  type: "hello", inviteNonce: nonce, fingerprint: guest.fingerprint,
  publicKeySpki: guest.publicKeySpki,
  signature: await sign(guest.privateKey, guestSignedChallenge)
};
const verifiedGuestHandshake = await verifyHandshake(guestHello, attachmentGuest, room, now);
assert.equal(verifiedGuestHandshake.fingerprint, guest.fingerprint);
assert.deepEqual(verifiedGuestHandshake.proof.payload, guestSignedChallenge);
assert.equal(verifiedGuestHandshake.proof.signature, guestHello.signature);
await assert.rejects(() => verifyHandshake(guestHello, { ...attachmentGuest, challenge: "wrong" }, room, now), /HELLO_SIGNATURE_INVALID/);
await assert.rejects(() => verifyHandshake(guestHello, { ...attachmentGuest, challengeExpiresAt: now - 1 }, room, now), /HELLO_CHALLENGE_EXPIRED/);
await assert.rejects(() => verifyHandshake({ ...guestHello, inviteNonce: "wrong" }, attachmentGuest, room, now), /HELLO_FIELDS_INVALID/);

const validOffer = JSON.stringify({ type: "offer", sentAt: now, payload: { sdp: "v=0\r\n" } });
assert.equal(validateSignalMessage(validOffer, now).type, "offer");
assert.equal(validateSignalMessage(JSON.stringify({ type: "call-invite", sentAt: now, payload: { mode: "video" } }), now).payload.mode, "video");
assert.equal(validateSignalMessage(JSON.stringify({ type: "ice-candidate", sentAt: now, payload: { candidate: "candidate:1" } }), now).type, "ice-candidate");
assert.throws(() => validateSignalMessage(JSON.stringify({ type: "unknown", sentAt: now, payload: {} }), now), /SIGNAL_MESSAGE_INVALID/);
assert.throws(() => validateSignalMessage(JSON.stringify({ type: "offer", sentAt: now, payload: { sdp: "x".repeat(13_000) } }), now), /SDP_PAYLOAD_INVALID/);
assert.throws(() => validateSignalMessage(JSON.stringify({ type: "ice-candidate", sentAt: now, payload: { candidate: "x".repeat(2_100) } }), now), /ICE_CANDIDATE_INVALID/);
assert.throws(() => validateSignalMessage(JSON.stringify({ type: "call-invite", sentAt: now, payload: { mode: "silent-downgrade" } }), now), /CALL_MODE_INVALID/);
assert.throws(() => validateSignalMessage(JSON.stringify({ type: "offer", sentAt: now - 60_000, payload: { sdp: "v=0" } }), now), /SIGNAL_MESSAGE_INVALID/);
assert.throws(() => validateSignalMessage("x".repeat(17_000), now), /SIGNAL_MESSAGE_TOO_LARGE/);

const workerSource = await readFile("signaling/ezero-connect-v1/worker.mjs", "utf8");
assert.match(workerSource, /new WebSocketPair\(/);
assert.match(workerSource, /acceptWebSocket\(/);
assert.match(workerSource, /serializeAttachment\(/);
assert.match(workerSource, /storage\.put\("room", room\)/);
assert.match(workerSource, /storage\.put\("pendingChallenges", pendingChallenges\)/);
assert.doesNotMatch(workerSource, /storage\.put\(["'](?:messages|sdp|ice|payload)["']/i);
assert.doesNotMatch(workerSource, /console\.(?:log|info|warn|error)\(/);
console.log("EZERO_SIGNALING_INVITE_HANDSHAKE_MESSAGE_GATES_PASS");
