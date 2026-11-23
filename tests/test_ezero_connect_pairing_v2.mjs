import assert from "node:assert/strict";

globalThis.location = { origin: "https://ezero-connect-staging.invalid" };
const calls = [];
globalThis.EZERO_CONNECT_TRUST = {
  async saveVerifiedPeer(args) {
    calls.push(args);
    return { status: "TRUSTED", remoteFingerprint: args.peerFingerprint };
  }
};

class FakeConnection {
  authenticated = true;
  closed = false;
  handlers = new Set();
  subscribe(handler) { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  async emit(event) { await Promise.all([...this.handlers].map(handler => handler(event))); }
}
await import("../js/ezero_connect_pairing_v2.js");

const hostIdentity = { fingerprint: "AA:".repeat(31) + "AA", publicKeySpki: "host-spki" };
const guestIdentity = { fingerprint: "BB:".repeat(31) + "BB", publicKeySpki: "guest-spki" };
const invitePayload = {
  origin: location.origin,
  roomId: "R".repeat(32),
  nonce: "N".repeat(32),
  inviterFingerprint: hostIdentity.fingerprint,
  inviterPublicKeySpki: hostIdentity.publicKeySpki,
  issuedAt: 1,
  expiresAt: 90_001
};
const hostConnection = new FakeConnection();
const guestConnection = new FakeConnection();
const hostStates = [];
const guestStates = [];
const host = globalThis.EZERO_CONNECT_PAIRING_V2.create({
  connection: hostConnection, invitePayload, role: "host", onState: value => hostStates.push(value.state)
});
const guest = globalThis.EZERO_CONNECT_PAIRING_V2.create({
  connection: guestConnection, invitePayload, role: "guest", onState: value => guestStates.push(value.state)
});

const guestProof = { payload: { protocol: "test-guest-proof" }, signature: "signed-guest-proof" };
const hostProof = { payload: { protocol: "test-host-proof" }, signature: "signed-host-proof" };
await hostConnection.emit({
  type: "peer-ready", peerFingerprint: guestIdentity.fingerprint,
  peerPublicKeySpki: guestIdentity.publicKeySpki, peerHandshake: guestProof
});
await hostConnection.emit({
  type: "peer-ready", peerFingerprint: guestIdentity.fingerprint,
  peerPublicKeySpki: guestIdentity.publicKeySpki, peerHandshake: guestProof
});
await guestConnection.emit({
  type: "peer-ready", peerFingerprint: hostIdentity.fingerprint,
  peerPublicKeySpki: hostIdentity.publicKeySpki, peerHandshake: hostProof
});
assert.equal(host.state, "SAVED");
assert.equal(guest.state, "SAVED");
assert.equal(host.saved, true);
assert.equal(guest.saved, true);
assert.equal(calls.length, 2);
assert.equal(calls[0].localRole, "host");
assert.equal(calls[0].peerHandshake, guestProof);
assert.equal(calls[1].localRole, "guest");
assert.equal(calls[1].peerHandshake, hostProof);
assert.ok(hostStates.includes("SAVING_VERIFIED_FRIEND"));
assert.ok(guestStates.includes("SAVING_VERIFIED_FRIEND"));

const badConnection = new FakeConnection();
const bad = globalThis.EZERO_CONNECT_PAIRING_V2.create({
  connection: badConnection, invitePayload, role: "host"
});
await badConnection.emit({
  type: "peer-ready", peerFingerprint: guestIdentity.fingerprint,
  peerPublicKeySpki: guestIdentity.publicKeySpki
});
assert.equal(bad.state, "ERROR");
assert.equal(bad.saved, false);
host.close();
guest.close();
bad.close();
console.log("EZERO_AUTOMATIC_TRUST_PAIRING_V2_SESSION_PASS");
