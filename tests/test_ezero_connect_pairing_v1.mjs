import assert from "node:assert/strict";

let localIdentity;
const saved = [];
globalThis.location = { origin: "https://ezero-connect-staging.invalid" };
globalThis.EZERO_CONNECT_IDENTITY = {
  async getPublicIdentity() { return localIdentity; }
};
globalThis.EZERO_CONNECT_TRUST = {
  async buildTranscript(invite, responder) {
    const participants = [
      { fingerprint: invite.inviterFingerprint, publicKeySpki: invite.inviterPublicKeySpki },
      { fingerprint: responder.fingerprint, publicKeySpki: responder.publicKeySpki }
    ].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
    return { transcript: { v: 1, protocol: "E-ZERO-TRUST-1", roomId: invite.roomId, inviteNonce: invite.nonce, participants } };
  },
  async signApproval(transcript) {
    return { signerFingerprint: localIdentity.fingerprint, transcriptHash: "fixed-test-hash", signature: localIdentity.fingerprint };
  },
  async verifyApproval(transcript, approval) {
    assert.ok(transcript.participants.some(p => p.fingerprint === approval.signerFingerprint));
    assert.equal(approval.signature, approval.signerFingerprint);
    return true;
  },
  async saveTrustedContact(args) {
    assert.equal(args.explicitConsent, true);
    saved.push({ local: localIdentity.fingerprint, remote: args.transcript.participants.find(p => p.fingerprint !== localIdentity.fingerprint).fingerprint });
    return { status: "TRUSTED" };
  }
};

class FakeConnection {
  constructor() { this.authenticated = true; this.handlers = new Set(); this.sent = []; }
  subscribe(handler) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  send(type, payload) { this.sent.push({ type, payload }); }
  async emit(event) { await Promise.all([...this.handlers].map(handler => handler(event))); }
}
await import("../js/ezero_connect_pairing_v1.js");
const host = { fingerprint: "AA:".repeat(31) + "AA", publicKeySpki: "host-spki" };
const guest = { fingerprint: "BB:".repeat(31) + "BB", publicKeySpki: "guest-spki" };
const invitePayload = {
  origin: location.origin,
  inviterFingerprint: host.fingerprint,
  inviterPublicKeySpki: host.publicKeySpki,
  roomId: "R".repeat(32),
  nonce: "N".repeat(32),
  issuedAt: Date.now(),
  expiresAt: Date.now() + 90_000
};
const hostConnection = new FakeConnection();
const guestConnection = new FakeConnection();

localIdentity = host;
const hostSession = globalThis.EZERO_CONNECT_PAIRING.create({
  connection: hostConnection, invitePayload, role: "host"
});
await hostConnection.emit({
  type: "peer-ready",
  peerFingerprint: guest.fingerprint,
  peerPublicKeySpki: guest.publicKeySpki
});
assert.equal(hostSession.state, "READY_FOR_LOCAL_APPROVAL");
await hostSession.approveOutgoing();
assert.equal(hostSession.state, "AWAITING_REMOTE_APPROVAL");
const request = hostConnection.sent[0];
assert.equal(request.type, "trust-request");

localIdentity = guest;
const guestSession = globalThis.EZERO_CONNECT_PAIRING.create({
  connection: guestConnection, invitePayload, role: "guest"
});
await guestConnection.emit({
  type: "relay",
  fromFingerprint: host.fingerprint,
  message: { type: "trust-request", payload: request.payload }
});
assert.equal(guestSession.state, "AWAITING_LOCAL_APPROVAL");
await guestSession.approveIncoming();
assert.equal(guestSession.state, "MUTUAL_APPROVAL_READY");
const approval = guestConnection.sent[0];
assert.equal(approval.type, "trust-approval");

localIdentity = host;
await hostConnection.emit({
  type: "relay",
  fromFingerprint: guest.fingerprint,
  message: { type: "trust-approval", payload: approval.payload }
});
assert.equal(hostSession.state, "MUTUAL_APPROVAL_READY");
await assert.rejects(() => hostSession.save({ displayName: "Guest", explicitConsent: false }), /TRUST_EXPLICIT_SAVE_CONSENT_REQUIRED/);
assert.equal((await hostSession.save({ displayName: "Guest", explicitConsent: true })).status, "TRUSTED");
assert.equal(hostSession.state, "SAVED");

localIdentity = guest;
assert.equal((await guestSession.save({ displayName: "Host", explicitConsent: true })).status, "TRUSTED");
assert.equal(guestSession.state, "SAVED");
assert.deepEqual(saved, [
  { local: host.fingerprint, remote: guest.fingerprint },
  { local: guest.fingerprint, remote: host.fingerprint }
]);
hostSession.close();
guestSession.close();
console.log("EZERO_MUTUAL_PAIRING_EXPLICIT_TWO_SIDE_APPROVAL_PASS");
