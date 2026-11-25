function fail(code) { throw new Error(code); }

function stableCanonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
  }
  fail("RECONNECT_CANONICAL_VALUE_INVALID");
}

function decodeBase64url(value, expectedBytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) fail("RECONNECT_CHALLENGE_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let bytes;
  try { bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0)); }
  catch (_) { fail("RECONNECT_CHALLENGE_INVALID"); }
  if (bytes.length !== expectedBytes) fail("RECONNECT_CHALLENGE_INVALID");
  return bytes;
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function validateFingerprint(value) {
  return typeof value === "string" && /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value);
}

export async function createTrustedReconnectProof({
  relationshipId,
  challenge,
  challengeExpiresAt,
  trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY,
  now = Date.now()
} = {}) {
  if (typeof relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(relationshipId)) fail("RECONNECT_RELATIONSHIP_ID_INVALID");
  decodeBase64url(challenge, 32);
  if (!Number.isSafeInteger(challengeExpiresAt) || challengeExpiresAt <= now ||
      challengeExpiresAt > now + 30_000) fail("RECONNECT_CHALLENGE_EXPIRED_OR_INVALID");
  if (!trustApi || typeof trustApi.getTrustedContact !== "function" ||
      typeof trustApi.verifyApproval !== "function" ||
      !identityApi || typeof identityApi.getPublicIdentity !== "function" ||
      typeof identityApi.signCanonical !== "function") fail("RECONNECT_APIS_UNAVAILABLE");

  const contact = await trustApi.getTrustedContact(relationshipId);
  if (!contact || contact.status !== "TRUSTED" || contact.relationshipId !== relationshipId ||
      !contact.trustProof || !contact.trustProof.transcript ||
      !Array.isArray(contact.trustProof.approvals) || contact.trustProof.approvals.length !== 2) {
    fail("RECONNECT_CONTACT_NOT_TRUSTED");
  }
  const transcript = contact.trustProof.transcript;
  const transcriptHash = await sha256Hex(stableCanonical(transcript));
  const derivedRelationshipId = await sha256Hex(stableCanonical(transcript));
  if (derivedRelationshipId !== relationshipId) fail("RECONNECT_TRANSCRIPT_RELATIONSHIP_MISMATCH");

  const identity = await identityApi.getPublicIdentity();
  if (!validateFingerprint(identity?.fingerprint) || typeof identity.publicKeySpki !== "string") {
    fail("RECONNECT_LOCAL_IDENTITY_INVALID");
  }
  const participants = transcript.participants;
  if (!Array.isArray(participants) || participants.length !== 2) fail("RECONNECT_TRANSCRIPT_INVALID");
  const local = participants.find(item => item.fingerprint === identity.fingerprint);
  const remote = participants.find(item => item.fingerprint === contact.remoteFingerprint);
  if (!local || local.publicKeySpki !== identity.publicKeySpki || !remote ||
      remote.publicKeySpki !== contact.remotePublicKeySpki ||
      identity.fingerprint === contact.remoteFingerprint) fail("RECONNECT_TRUSTED_IDENTITY_MISMATCH");

  const approvals = contact.trustProof.approvals.slice().sort((a, b) =>
    String(a?.signerFingerprint || "").localeCompare(String(b?.signerFingerprint || ""))
  );
  const signerSet = new Set();
  for (const approval of approvals) {
    if (!approval || signerSet.has(approval.signerFingerprint)) fail("RECONNECT_APPROVAL_SET_INVALID");
    signerSet.add(approval.signerFingerprint);
    if (!await trustApi.verifyApproval(transcript, approval)) fail("RECONNECT_APPROVAL_INVALID");
  }
  if (signerSet.size !== 2 || !signerSet.has(identity.fingerprint) || !signerSet.has(contact.remoteFingerprint)) {
    fail("RECONNECT_MUTUAL_APPROVAL_REQUIRED");
  }

  const issuedAt = now;
  const payload = Object.freeze({
    v: 1,
    protocol: "E-ZERO-TRUSTED-RECONNECT-1",
    relationshipId,
    transcriptHash,
    localFingerprint: identity.fingerprint,
    remoteFingerprint: contact.remoteFingerprint,
    challenge,
    challengeExpiresAt,
    issuedAt
  });
  const signature = await identityApi.signCanonical(payload);
  if (typeof signature !== "string" || !/^[A-Za-z0-9_-]{80,100}$/.test(signature)) {
    fail("RECONNECT_SIGNATURE_INVALID");
  }
  return Object.freeze({
    payload,
    signature,
    transcript,
    approvals: Object.freeze(approvals)
  });
}

export const TRUSTED_RECONNECT_PROTOCOL = "E-ZERO-TRUSTED-RECONNECT-1";
