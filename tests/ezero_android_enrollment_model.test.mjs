import test from "node:test";
import assert from "node:assert/strict";
import {
  ENROLLMENT_TTL_MS, createEnrollmentChallenge, completeEnrollment, revokeEnrollment
} from "../src/ezero_android_enrollment_model.mjs";

const NOW = 1_800_000_000_000;
const ANDROID_FP = "AA:".repeat(31) + "AA";
const APPROVER_FP = "BB:".repeat(31) + "BB";
function challenge(overrides = {}) {
  return createEnrollmentChallenge({
    challengeId: "enroll_123456", nonce: "abcdefghijklmnopqrstuv",
    androidFingerprint: ANDROID_FP, audience: "https://staging.ezero.example",
    issuedAt: NOW, expiresAt: NOW + ENROLLMENT_TTL_MS, ...overrides
  });
}
function proof(overrides = {}) {
  return {
    challengeId: "enroll_123456", nonce: "abcdefghijklmnopqrstuv",
    androidFingerprint: ANDROID_FP, approverFingerprint: APPROVER_FP,
    audience: "https://staging.ezero.example", installationId: "android_install_01",
    androidProofVerified: true, browserApprovalVerified: true, ...overrides
  };
}

test("creates only HTTPS enrollment challenges with a maximum 90-second lifetime", () => {
  assert.equal(challenge().consumed, false);
  assert.throws(() => challenge({ audience: "http://staging.ezero.example" }), /ENROLLMENT_CHALLENGE_INVALID/);
  assert.throws(() => challenge({ expiresAt: NOW + ENROLLMENT_TTL_MS + 1 }), /ENROLLMENT_CHALLENGE_INVALID/);
  assert.throws(() => challenge({ expiresAt: NOW }), /ENROLLMENT_CHALLENGE_INVALID/);
  assert.throws(() => challenge({ androidFingerprint: "bad" }), /ENROLLMENT_CHALLENGE_INVALID/);
});

test("valid Android proof and explicit browser approval enroll one bound installation", () => {
  const result = completeEnrollment(challenge(), proof(), NOW + 1);
  assert.equal(result.challenge.consumed, true);
  assert.equal(result.installation.status, "ACTIVE");
  assert.equal(result.installation.androidFingerprint, ANDROID_FP);
  assert.equal(result.installation.approverFingerprint, APPROVER_FP);
  assert.equal(result.installation.audience, "https://staging.ezero.example");
});

test("missing or invalid signature-verifier results fail closed", () => {
  assert.throws(() => completeEnrollment(challenge(), proof({ browserApprovalVerified: false }), NOW + 1), /ENROLLMENT_SIGNATURE_INVALID/);
  assert.throws(() => completeEnrollment(challenge(), proof({ androidProofVerified: false }), NOW + 1), /ENROLLMENT_SIGNATURE_INVALID/);
  assert.throws(() => completeEnrollment(challenge(), proof({ browserApprovalVerified: undefined }), NOW + 1), /ENROLLMENT_SIGNATURE_INVALID/);
});

test("challenge, nonce, fingerprint and audience are all bound to the approval", () => {
  assert.throws(() => completeEnrollment(challenge(), proof({ nonce: "different_nonce_value_123" }), NOW + 1), /ENROLLMENT_PROOF_BINDING_INVALID/);
  assert.throws(() => completeEnrollment(challenge(), proof({ challengeId: "other_123456" }), NOW + 1), /ENROLLMENT_PROOF_BINDING_INVALID/);
  assert.throws(() => completeEnrollment(challenge(), proof({ androidFingerprint: APPROVER_FP }), NOW + 1), /ENROLLMENT_PROOF_BINDING_INVALID/);
  assert.throws(() => completeEnrollment(challenge(), proof({ audience: "https://wrong.example" }), NOW + 1), /ENROLLMENT_PROOF_BINDING_INVALID/);
});

test("expired and not-yet-valid challenges cannot enroll", () => {
  assert.throws(() => completeEnrollment(challenge(), proof(), NOW + ENROLLMENT_TTL_MS), /ENROLLMENT_CHALLENGE_EXPIRED/);
  assert.throws(() => completeEnrollment(challenge(), proof(), NOW - 1), /ENROLLMENT_CHALLENGE_EXPIRED/);
});

test("a consumed challenge cannot be completed again", () => {
  const first = completeEnrollment(challenge(), proof(), NOW + 1);
  assert.throws(() => completeEnrollment(first.challenge, proof(), NOW + 2), /ENROLLMENT_CHALLENGE_REPLAYED/);
});

test("installation revocation is terminal in the reference policy model", () => {
  const enrolled = completeEnrollment(challenge(), proof(), NOW + 1).installation;
  const revoked = revokeEnrollment(enrolled);
  assert.equal(revoked.status, "REVOKED");
  assert.throws(() => revokeEnrollment(revoked), /ENROLLMENT_INSTALLATION_NOT_ACTIVE/);
});

test("invalid installation identifiers are rejected", () => {
  assert.throws(() => completeEnrollment(challenge(), proof({ installationId: "bad id" }), NOW + 1), /ENROLLMENT_INSTALLATION_INVALID/);
});
