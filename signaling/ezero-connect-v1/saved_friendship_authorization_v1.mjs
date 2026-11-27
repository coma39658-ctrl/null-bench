/**
 * Server-authoritative saved-friend gate for E-ZERO call invites.
 *
 * FRIENDSHIP_REGISTRY must be a Cloudflare Service Binding to a separately
 * deployed trusted registry. No public URL fallback is allowed. Missing,
 * malformed, unavailable, or negative registry responses fail closed.
 */
const REGISTRY_PATH = "https://friendship-registry.internal/v1/authorize-call";
const FINGERPRINT_RE = new RegExp("^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$");
const RELATIONSHIP_RE = new RegExp("^[A-Za-z0-9_-]{16,128}$");
const OPAQUE_ID_RE = new RegExp("^[A-Za-z0-9_-]{32}$");

export async function authorizeSavedFriendshipForCall(env, invite) {
  if (!env || !env.FRIENDSHIP_REGISTRY ||
      typeof env.FRIENDSHIP_REGISTRY.fetch !== "function") {
    throw new Error("FRIENDSHIP_REGISTRY_UNAVAILABLE");
  }
  if (!invite || !FINGERPRINT_RE.test(invite.callerFingerprint || "") ||
      !FINGERPRINT_RE.test(invite.recipientFingerprint || "") ||
      invite.callerFingerprint === invite.recipientFingerprint ||
      !RELATIONSHIP_RE.test(invite.relationshipId || "") ||
      !OPAQUE_ID_RE.test(invite.callId || "") ||
      !OPAQUE_ID_RE.test(invite.nonce || "") ||
      !["audio", "video"].includes(invite.mode) ||
      !Number.isSafeInteger(invite.issuedAt) ||
      !Number.isSafeInteger(invite.expiresAt) || invite.expiresAt <= Date.now() ||
      typeof invite.origin !== "string" || typeof invite.callerPublicKeySpki !== "string" ||
      typeof invite.signature !== "string") {
    throw new Error("FRIENDSHIP_INVITE_INVALID");
  }
  if (!env.PUBLIC_ORIGIN || invite.origin !== env.PUBLIC_ORIGIN) {
    throw new Error("FRIENDSHIP_INVITE_ORIGIN_INVALID");
  }
  const signedPayload = {
    v: invite.v,
    protocol: invite.protocol,
    origin: invite.origin,
    callerFingerprint: invite.callerFingerprint,
    callerPublicKeySpki: invite.callerPublicKeySpki,
    recipientFingerprint: invite.recipientFingerprint,
    relationshipId: invite.relationshipId,
    callId: invite.callId,
    nonce: invite.nonce,
    mode: invite.mode,
    issuedAt: invite.issuedAt,
    expiresAt: invite.expiresAt
  };
  const response = await env.FRIENDSHIP_REGISTRY.fetch(REGISTRY_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Origin": env.PUBLIC_ORIGIN
    },
    body: JSON.stringify({
      protocol: "E-ZERO-SAVED-FRIEND-AUTH-1",
      relationshipId: invite.relationshipId,
      callerFingerprint: invite.callerFingerprint,
      recipientFingerprint: invite.recipientFingerprint,
      callId: invite.callId,
      nonce: invite.nonce,
      mode: invite.mode,
      expiresAt: invite.expiresAt,
      signedInvite: { payload: signedPayload, signature: invite.signature }
    })
  });
  if (!response || response.status !== 200) throw new Error("FRIENDSHIP_REGISTRY_REJECTED");
  const result = await response.json().catch(() => null);
  if (!result || Object.keys(result).sort().join(",") !== "authorized,relationshipId" ||
      result.authorized !== true || result.relationshipId !== invite.relationshipId) {
    throw new Error("FRIENDSHIP_REGISTRY_RESPONSE_INVALID");
  }
  return Object.freeze({ authorized: true, relationshipId: result.relationshipId });
}
