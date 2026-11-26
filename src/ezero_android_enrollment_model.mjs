// Deterministic policy model for Android enrollment.
// This is NOT cryptography, an API, Durable Object storage, or a live enrollment service.
// Signature-verification booleans represent results from a future audited verifier.
export const ENROLLMENT_TTL_MS = 90_000;

export function createEnrollmentChallenge(input) {
  if (!input || typeof input.challengeId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(input.challengeId) ||
      typeof input.nonce !== "string" || !/^[A-Za-z0-9_-]{22,172}$/.test(input.nonce) ||
      typeof input.androidFingerprint !== "string" || !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(input.androidFingerprint) ||
      typeof input.audience !== "string" || !input.audience.startsWith("https://") ||
      !Number.isSafeInteger(input.issuedAt) || !Number.isSafeInteger(input.expiresAt) ||
      input.expiresAt <= input.issuedAt || input.expiresAt - input.issuedAt > ENROLLMENT_TTL_MS) {
    throw new Error("ENROLLMENT_CHALLENGE_INVALID");
  }
  return Object.freeze({ ...input, consumed: false });
}

export function completeEnrollment(challenge, proof, now) {
  if (!challenge || challenge.consumed) throw new Error("ENROLLMENT_CHALLENGE_REPLAYED");
  if (!Number.isSafeInteger(now)) throw new Error("ENROLLMENT_TIME_INVALID");
  if (now < challenge.issuedAt || now >= challenge.expiresAt) throw new Error("ENROLLMENT_CHALLENGE_EXPIRED");
  if (!proof || proof.challengeId !== challenge.challengeId ||
      proof.nonce !== challenge.nonce || proof.audience !== challenge.audience ||
      proof.androidFingerprint !== challenge.androidFingerprint ||
      typeof proof.approverFingerprint !== "string" ||
      !/^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(proof.approverFingerprint)) {
    throw new Error("ENROLLMENT_PROOF_BINDING_INVALID");
  }
  if (proof.androidProofVerified !== true || proof.browserApprovalVerified !== true) {
    throw new Error("ENROLLMENT_SIGNATURE_INVALID");
  }
  const installation = Object.freeze({
    installationId: proof.installationId,
    androidFingerprint: challenge.androidFingerprint,
    approverFingerprint: proof.approverFingerprint,
    audience: challenge.audience,
    status: "ACTIVE"
  });
  if (typeof installation.installationId !== "string" ||
      !/^[A-Za-z0-9_-]{8,128}$/.test(installation.installationId)) {
    throw new Error("ENROLLMENT_INSTALLATION_INVALID");
  }
  return Object.freeze({
    challenge: Object.freeze({ ...challenge, consumed: true }),
    installation
  });
}

export function revokeEnrollment(installation) {
  if (!installation || installation.status !== "ACTIVE") {
    throw new Error("ENROLLMENT_INSTALLATION_NOT_ACTIVE");
  }
  return Object.freeze({ ...installation, status: "REVOKED" });
}
