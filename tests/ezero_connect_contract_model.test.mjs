import test from "node:test";
import assert from "node:assert/strict";
import { PAIRING, CALL, issueInvite, verifyPeer, acceptOnce, saveTrusted, issueCall, ringCall, respondCall, authorizeMedia } from "../src/ezero_connect_contract_model.mjs";

const NOW = 1_800_000_000_000;
function trustedFixture() {
  const invite = issueInvite({ owner: "device-A", nonce: "n-unique", now: NOW, expiresAt: NOW + 90_000 });
  const peer = verifyPeer(invite, { owner: "device-B", identityVerified: true }, NOW + 1);
  const accepted = acceptOnce(peer, "device-B");
  return saveTrusted(accepted, { signer: "device-A" }, { signer: "device-B" });
}

test("one recipient acceptance plus two distinct proofs is required to save", () => {
  const invite = issueInvite({ owner: "A", nonce: "n", now: NOW, expiresAt: NOW + 90_000 });
  const peer = verifyPeer(invite, { owner: "B", identityVerified: true }, NOW + 1);
  const accepted = acceptOnce(peer, "B");
  assert.equal(accepted.state, PAIRING.ACCEPTED);
  assert.equal(accepted.acceptCount, 1);
  assert.equal(saveTrusted(accepted, { signer: "A" }, { signer: "B" }).state, PAIRING.TRUSTED);
});
test("wrong party, self-pairing, unverified identity and duplicate acceptance fail closed", () => {
  const invite = issueInvite({ owner: "A", nonce: "n", now: NOW, expiresAt: NOW + 90_000 });
  assert.throws(() => verifyPeer(invite, { owner: "A", identityVerified: true }, NOW + 1), /PEER_IDENTITY_INVALID/);
  assert.throws(() => verifyPeer(invite, { owner: "B", identityVerified: false }, NOW + 1), /PEER_IDENTITY_INVALID/);
  const peer = verifyPeer(invite, { owner: "B", identityVerified: true }, NOW + 1);
  assert.throws(() => acceptOnce(peer, "A"), /ONLY_RECIPIENT_MAY_ACCEPT/);
  const accepted = acceptOnce(peer, "B");
  assert.throws(() => acceptOnce(accepted, "B"), /PAIRING_STATE_INVALID/);
});
test("expired and replayed invitations cannot pair", () => {
  const invite = issueInvite({ owner: "A", nonce: "n", now: NOW, expiresAt: NOW + 90_000 });
  assert.throws(() => verifyPeer(invite, { owner: "B", identityVerified: true }, NOW + 90_000), /INVITE_EXPIRED_OR_REPLAYED/);
  assert.throws(() => issueInvite({ owner: "A", nonce: "n", now: NOW, expiresAt: NOW + 90_001 }), /INVITE_INVALID/);
});
test("two signatures from the same device cannot create a trusted relationship", () => {
  const invite = issueInvite({ owner: "A", nonce: "n", now: NOW, expiresAt: NOW + 90_000 });
  const accepted = acceptOnce(verifyPeer(invite, { owner: "B", identityVerified: true }, NOW + 1), "B");
  assert.throws(() => saveTrusted(accepted, { signer: "A" }, { signer: "A" }), /MUTUAL_PROOF_REQUIRED/);
});
test("saved friend can call without QR; untrusted third parties cannot", () => {
  const trusted = trustedFixture();
  const call = issueCall({ trusted, caller: "device-A", callee: "device-B", callId: "call-1", mode: "audio", now: NOW, expiresAt: NOW + 60_000 });
  assert.equal(call.state, CALL.INVITED);
  assert.throws(() => issueCall({ trusted, caller: "outsider-C", callee: "device-B", callId: "call-2", mode: "audio", now: NOW, expiresAt: NOW + 60_000 }), /CALL_INVITE_INVALID/);
});
test("media is impossible before explicit recipient acceptance", () => {
  const trusted = trustedFixture();
  const call = issueCall({ trusted, caller: "device-A", callee: "device-B", callId: "call-1", mode: "video", now: NOW, expiresAt: NOW + 60_000 });
  const ringing = ringCall(call, "device-B", NOW + 1);
  assert.equal(ringing.state, CALL.RINGING);
  assert.throws(() => authorizeMedia(ringing, NOW + 2), /MEDIA_NOT_AUTHORIZED/);
  const accepted = respondCall(ringing, "device-B", "accept", NOW + 3);
  assert.equal(authorizeMedia(accepted, NOW + 4), true);
});
test("decline, wrong recipient and expired call never authorize media", () => {
  const trusted = trustedFixture();
  const call = issueCall({ trusted, caller: "device-A", callee: "device-B", callId: "call-1", mode: "audio", now: NOW, expiresAt: NOW + 60_000 });
  assert.throws(() => ringCall(call, "outsider-C", NOW + 1), /CALL_RECIPIENT_INVALID/);
  const declined = respondCall(ringCall(call, "device-B", NOW + 1), "device-B", "decline", NOW + 2);
  assert.equal(declined.state, CALL.DECLINED);
  assert.throws(() => authorizeMedia(declined, NOW + 3), /MEDIA_NOT_AUTHORIZED/);
  const expired = ringCall(call, "device-B", NOW + 60_000);
  assert.equal(expired.state, CALL.EXPIRED);
});
test("malformed call mode and excessive token lifetime fail closed", () => {
  const trusted = trustedFixture();
  assert.throws(() => issueCall({ trusted, caller: "device-A", callee: "device-B", callId: "x", mode: "screen-share", now: NOW, expiresAt: NOW + 10_000 }), /CALL_INVITE_INVALID/);
  assert.throws(() => issueCall({ trusted, caller: "device-A", callee: "device-B", callId: "x", mode: "audio", now: NOW, expiresAt: NOW + 60_001 }), /CALL_INVITE_INVALID/);
});
