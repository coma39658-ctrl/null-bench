import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  enrollmentCanonical, enrollmentBase64url, enrollmentFingerprint,
  verifyAndroidEnrollmentV1
} from "./android-enrollment-crypto-v1.mjs";

globalThis.crypto ??= webcrypto;
const NOW = 1_800_000_000_000;
async function keyPair() {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
}
async function spki(key) {
  return enrollmentBase64url(await crypto.subtle.exportKey("spki", key));
}
async function sign(key, domain, payload) {
  const bytes = new TextEncoder().encode(domain + enrollmentCanonical(payload));
  return enrollmentBase64url(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, bytes));
}
async function fixture() {
  const android = await keyPair(), browser = await keyPair();
  const androidSpki = await spki(android.publicKey), browserSpki = await spki(browser.publicKey);
  const challenge = {
    challengeId: "enroll_123456", nonce: "abcdefghijklmnopqrstuv",
    audience: "https://ezero-connect-qr-clock-skew-preview.onrender.com",
    androidPublicKeySpki: androidSpki,
    androidFingerprint: await enrollmentFingerprint(androidSpki),
    issuedAt: NOW, expiresAt: NOW + 90_000
  };
  const androidPayload = {
    v: 1, challengeId: challenge.challengeId, nonce: challenge.nonce,
    audience: challenge.audience, androidPublicKeySpki: androidSpki,
    androidFingerprint: challenge.androidFingerprint,
    issuedAt: challenge.issuedAt, expiresAt: challenge.expiresAt
  };
  const approvalPayload = {
    ...androidPayload, approverPublicKeySpki: browserSpki,
    approverFingerprint: await enrollmentFingerprint(browserSpki)
  };
  const submission = {
    androidProof: {
      payload: androidPayload,
      signature: await sign(android.privateKey, "EZERO_ANDROID_ENROLL_PROOF_V1\n", androidPayload)
    },
    browserApproval: {
      payload: approvalPayload,
      signature: await sign(browser.privateKey, "EZERO_ANDROID_ENROLL_APPROVAL_V1\n", approvalPayload)
    }
  };
  return { challenge, submission, android, browser, browserSpki, approvalPayload };
}
function options(f, extra = {}) {
  return { now: NOW + 1, expectedAudience: f.challenge.audience,
    trustedApproverPublicKeySpki: f.browserSpki, ...extra };
}
}

test("verifies real P-256 Android proof and independent browser approval", async () => {
  const f = await fixture();
  const result = await verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f));
  assert.equal(result.status, "ACTIVE");
  assert.equal(result.androidFingerprint, f.challenge.androidFingerprint);
  assert.equal(result.approverFingerprint, f.approvalPayload.approverFingerprint);
  assert.equal(result.audience, f.challenge.audience);
});

test("rejects a changed Android proof payload", async () => {
  const f = await fixture();
  f.submission.androidProof.payload.nonce = "changed_nonce_abcdefghijkl";
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f)), /ENROLLMENT_PROOF_BINDING_INVALID/);
});

test("rejects a forged browser approval signature", async () => {
  const f = await fixture();
  const attacker = await keyPair();
  f.submission.browserApproval.signature = await sign(attacker.privateKey, "EZERO_ANDROID_ENROLL_APPROVAL_V1\n", f.approvalPayload);
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f)), /ENROLLMENT_BROWSER_APPROVAL_INVALID/);
});

test("rejects a signature from the wrong domain", async () => {
  const f = await fixture();
  f.submission.androidProof.signature = await sign(f.android.privateKey, "WRONG_DOMAIN\n", f.submission.androidProof.payload);
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f)), /ENROLLMENT_ANDROID_SIGNATURE_INVALID/);
});

test("rejects expired, overlong and wrong-audience challenges", async () => {
  const f = await fixture();
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f, { now: NOW + 90_000 })), /ENROLLMENT_CHALLENGE_INVALID/);
  await assert.rejects(() => verifyAndroidEnrollmentV1({ ...f.challenge, expiresAt: NOW + 90_001 }, f.submission, options(f)), /ENROLLMENT_CHALLENGE_INVALID/);
  const altered = structuredClone(f.submission);
  altered.androidProof.payload.audience = "https://wrong.example";
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, altered, options(f)), /ENROLLMENT_PROOF_BINDING_INVALID/);
});

test("rejects DER or malformed signature encodings rather than accepting ambiguity", async () => {
  const f = await fixture();
  f.submission.androidProof.signature = "AQ";
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f)), /ENROLLMENT_SIGNATURE_LENGTH_INVALID/);
});

test("rejects public-key fingerprint substitution", async () => {
  const f = await fixture();
  f.submission.browserApproval.payload.approverFingerprint = f.challenge.androidFingerprint;
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission, options(f)), /ENROLLMENT_APPROVER_IDENTITY_MISMATCH/);
});

test("rejects a self-selected browser key not authenticated by the saved browser identity", async () => {
  const f = await fixture();
  const attacker = await keyPair();
  const attackerSpki = await spki(attacker.publicKey);
  const attackerFingerprint = await enrollmentFingerprint(attackerSpki);
  const payload = { ...f.approvalPayload, approverPublicKeySpki: attackerSpki, approverFingerprint };
  f.submission.browserApproval = {
    payload, signature: await sign(attacker.privateKey, "EZERO_ANDROID_ENROLL_APPROVAL_V1\n", payload)
  };
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission,
    options(f, { trustedApproverPublicKeySpki: f.browserSpki })), /ENROLLMENT_APPROVER_IDENTITY_MISMATCH/);
});

test("requires exact configured service audience", async () => {
  const f = await fixture();
  await assert.rejects(() => verifyAndroidEnrollmentV1(f.challenge, f.submission,
    options(f, { expectedAudience: "https://attacker.example" })), /ENROLLMENT_AUDIENCE_MISMATCH/);
});
