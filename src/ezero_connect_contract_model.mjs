// Executable reference model for E-ZERO Connect trust and call authorization.
// This is a contract model, not a production cryptographic implementation.
export const PAIRING = Object.freeze({
  NEW: "NEW", INVITE_ISSUED: "INVITE_ISSUED", PEER_VERIFIED: "PEER_VERIFIED",
  ACCEPTED: "ACCEPTED", TRUSTED: "TRUSTED", REJECTED: "REJECTED", EXPIRED: "EXPIRED"
});
export const CALL = Object.freeze({
  IDLE: "IDLE", INVITED: "INVITED", RINGING: "RINGING",
  ACCEPTED: "ACCEPTED", JOINED: "JOINED", DECLINED: "DECLINED", ENDED: "ENDED", EXPIRED: "EXPIRED"
});

export function issueInvite({ owner, nonce, now, expiresAt }) {
  if (!owner || !nonce || !Number.isSafeInteger(now) || !Number.isSafeInteger(expiresAt) ||
      expiresAt <= now || expiresAt - now > 90_000) throw new Error("INVITE_INVALID");
  return Object.freeze({ owner, nonce, issuedAt: now, expiresAt, consumed: false });
}
export function verifyPeer(invite, peer, now) {
  if (!invite || invite.consumed || now >= invite.expiresAt) throw new Error("INVITE_EXPIRED_OR_REPLAYED");
  if (!peer || !peer.identityVerified || peer.owner === invite.owner) throw new Error("PEER_IDENTITY_INVALID");
  return Object.freeze({ invite, peer: peer.owner, state: PAIRING.PEER_VERIFIED });
}
export function acceptOnce(pairing, actor) {
  if (!pairing || pairing.state !== PAIRING.PEER_VERIFIED) throw new Error("PAIRING_STATE_INVALID");
  if (actor !== pairing.peer) throw new Error("ONLY_RECIPIENT_MAY_ACCEPT");
  return Object.freeze({ ...pairing, state: PAIRING.ACCEPTED, acceptedBy: actor, acceptCount: 1 });
}
export function saveTrusted(pairing, proofA, proofB) {
  if (!pairing || pairing.state !== PAIRING.ACCEPTED || pairing.acceptCount !== 1 ||
      !proofA || !proofB || proofA.signer === proofB.signer ||
      ![proofA.signer, proofB.signer].includes(pairing.invite.owner) ||
      ![proofA.signer, proofB.signer].includes(pairing.peer)) throw new Error("MUTUAL_PROOF_REQUIRED");
  return Object.freeze({ owner: pairing.invite.owner, peer: pairing.peer, state: PAIRING.TRUSTED });
}
export function issueCall({ trusted, caller, callee, callId, mode, now, expiresAt }) {
  if (!trusted || trusted.state !== PAIRING.TRUSTED ||
      ![trusted.owner, trusted.peer].includes(caller) ||
      ![trusted.owner, trusted.peer].includes(callee) || caller === callee ||
      !callId || !["audio", "video"].includes(mode) ||
      !Number.isSafeInteger(now) || !Number.isSafeInteger(expiresAt) ||
      expiresAt <= now || expiresAt - now > 60_000) throw new Error("CALL_INVITE_INVALID");
  return Object.freeze({ caller, callee, callId, mode, issuedAt: now, expiresAt, state: CALL.INVITED });
}
export function ringCall(call, recipient, now) {
  if (!call || call.state !== CALL.INVITED || recipient !== call.callee) throw new Error("CALL_RECIPIENT_INVALID");
  if (now >= call.expiresAt) return Object.freeze({ ...call, state: CALL.EXPIRED });
  return Object.freeze({ ...call, state: CALL.RINGING });
}
export function respondCall(call, recipient, action, now) {
  if (!call || call.state !== CALL.RINGING || recipient !== call.callee ||
      !["accept", "decline"].includes(action)) throw new Error("CALL_RESPONSE_INVALID");
  if (now >= call.expiresAt) return Object.freeze({ ...call, state: CALL.EXPIRED });
  return Object.freeze({ ...call, state: action === "accept" ? CALL.ACCEPTED : CALL.DECLINED });
}
export function authorizeMedia(call, now) {
  if (!call || call.state !== CALL.ACCEPTED || now >= call.expiresAt) throw new Error("MEDIA_NOT_AUTHORIZED");
  return true;
}
