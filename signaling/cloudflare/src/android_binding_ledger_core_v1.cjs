/* E-ZERO Android binding nonce ledger core V1.
 * ISOLATED TEST CORE ONLY: no Worker route, Durable Object binding, or deploy.
 * The caller MUST authenticate the EZERO2 owner proof and verify the
 * domain-separated owner signature before this ledger consumes an approval.
 */
"use strict";

const ORIGIN = "https://coma39658-ctrl.github.io";
const CAPABILITY = "call-invite-only";
const REQUEST_DOMAIN = "EZERO-ANDROID-BIND-1";
const FP = /^[0-9a-f]{64}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const NONCE = /^[A-Za-z0-9_-]{32}$/;
const MAX_TTL_SECONDS = 90;

function assertFingerprint(value, label) {
  if (typeof value !== "string" || !FP.test(value)) throw new Error("INVALID_" + label);
}
function decodeBase64Url(value) {
  if (typeof value !== "string" || !B64URL.test(value)) throw new Error("INVALID_BASE64URL");
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  if (typeof atob === "function") {
    const raw = atob(padded);
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}
function encodeBase64Url(bytes) {
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  const encoded = typeof btoa === "function" ? btoa(raw) : Buffer.from(bytes).toString("base64");
  return encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function canonicalRequest({ownerFingerprint, androidPublicKeySpkiBase64Url, androidFingerprint, nonce, issuedAtEpochSeconds, expiresAtEpochSeconds}) {
  assertFingerprint(ownerFingerprint, "OWNER_FINGERPRINT");
  assertFingerprint(androidFingerprint, "ANDROID_FINGERPRINT");
  if (typeof androidPublicKeySpkiBase64Url !== "string" ||
      !/^[A-Za-z0-9_-]{40,240}$/.test(androidPublicKeySpkiBase64Url)) throw new Error("INVALID_ANDROID_SPKI");
  if (typeof nonce !== "string" || !NONCE.test(nonce)) throw new Error("INVALID_NONCE");
  if (!Number.isSafeInteger(issuedAtEpochSeconds) || !Number.isSafeInteger(expiresAtEpochSeconds) ||
      issuedAtEpochSeconds < 0 || expiresAtEpochSeconds <= issuedAtEpochSeconds ||
      expiresAtEpochSeconds - issuedAtEpochSeconds > MAX_TTL_SECONDS) throw new Error("INVALID_CHALLENGE_TIME");
  return [
    REQUEST_DOMAIN, ORIGIN, ownerFingerprint, androidPublicKeySpkiBase64Url,
    androidFingerprint, nonce, String(issuedAtEpochSeconds),
    String(expiresAtEpochSeconds), CAPABILITY
  ].join("\n");
}
const challengeKey = (owner, nonce) => "android-bind:v1:challenge:" + owner + ":" + nonce;
const bindingKey = (owner, android) => "android-bind:v1:binding:" + owner + ":" + android;

async function issueChallenge({storage, ownerFingerprint, androidPublicKeySpkiBase64Url,
  androidFingerprint, nowEpochSeconds, cryptoImpl = globalThis.crypto}) {
  if (!storage || typeof storage.transaction !== "function") throw new Error("ATOMIC_STORAGE_REQUIRED");
  assertFingerprint(ownerFingerprint, "OWNER_FINGERPRINT");
  assertFingerprint(androidFingerprint, "ANDROID_FINGERPRINT");
  if (!Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < 0) throw new Error("INVALID_NOW");
  const spki = decodeBase64Url(androidPublicKeySpkiBase64Url);
  if (spki.length < 75 || spki.length > 180) throw new Error("INVALID_ANDROID_SPKI_SIZE");
  if (!cryptoImpl?.subtle?.digest || !cryptoImpl?.getRandomValues) throw new Error("WEBCRYPTO_REQUIRED");
  const digest = new Uint8Array(await cryptoImpl.subtle.digest("SHA-256", spki));
  const actualFingerprint = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
  if (actualFingerprint !== androidFingerprint) throw new Error("ANDROID_FINGERPRINT_MISMATCH");

  const nonceBytes = cryptoImpl.getRandomValues(new Uint8Array(24));
  const nonce = encodeBase64Url(nonceBytes);
  const issuedAtEpochSeconds = nowEpochSeconds;
  const expiresAtEpochSeconds = nowEpochSeconds + MAX_TTL_SECONDS;
  const fields = {ownerFingerprint, androidPublicKeySpkiBase64Url, androidFingerprint,
    nonce, issuedAtEpochSeconds, expiresAtEpochSeconds};
  const canonical = canonicalRequest(fields);
  const key = challengeKey(ownerFingerprint, nonce);
  await storage.transaction(async tx => {
    if (await tx.get(key)) throw new Error("NONCE_COLLISION");
    await tx.put(key, {status:"issued", canonical, ownerFingerprint, androidFingerprint,
      issuedAtEpochSeconds, expiresAtEpochSeconds});
  });
  return Object.freeze({...fields, origin:ORIGIN, capability:CAPABILITY, canonical});
}

/* verifyOwnerApproval MUST independently validate the EZERO2 permanent proof,
 * owner SPKI fingerprint, and ECDSA signature over
 * "EZERO-ANDROID-BIND-APPROVAL-1\n" + exact canonical request bytes.
 */
async function consumeApproval({storage, request, signatureBase64Url, nowEpochSeconds, verifyOwnerApproval}) {
  if (!storage || typeof storage.transaction !== "function") throw new Error("ATOMIC_STORAGE_REQUIRED");
  if (typeof verifyOwnerApproval !== "function") throw new Error("OWNER_VERIFIER_REQUIRED");
  if (!request || request.origin !== ORIGIN || request.capability !== CAPABILITY) throw new Error("REQUEST_SCOPE_MISMATCH");
  const canonical = canonicalRequest(request);
  if (typeof request.canonical !== "string" || request.canonical !== canonical) throw new Error("NON_CANONICAL_REQUEST");
  if (!Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < 0) throw new Error("INVALID_NOW");
  if (request.issuedAtEpochSeconds > nowEpochSeconds + 30 || request.expiresAtEpochSeconds <= nowEpochSeconds)
    throw new Error("CHALLENGE_EXPIRED_OR_NOT_YET_VALID");
  if (typeof signatureBase64Url !== "string" || !/^[A-Za-z0-9_-]{80,120}$/.test(signatureBase64Url))
    throw new Error("INVALID_APPROVAL_SIGNATURE");
  const verified = await verifyOwnerApproval({request, canonical, signatureBase64Url});
  if (verified !== true) throw new Error("OWNER_APPROVAL_INVALID");

  const cKey = challengeKey(request.ownerFingerprint, request.nonce);
  const bKey = bindingKey(request.ownerFingerprint, request.androidFingerprint);
  return storage.transaction(async tx => {
    const challenge = await tx.get(cKey);
    if (!challenge || challenge.status !== "issued") throw new Error("CHALLENGE_NOT_ISSUED_OR_REPLAYED");
    if (challenge.canonical !== canonical ||
        challenge.ownerFingerprint !== request.ownerFingerprint ||
        challenge.androidFingerprint !== request.androidFingerprint)
      throw new Error("CHALLENGE_MISMATCH");
    if (challenge.expiresAtEpochSeconds <= nowEpochSeconds) throw new Error("CHALLENGE_EXPIRED");
    const existing = await tx.get(bKey);
    if (existing?.status === "active") throw new Error("BINDING_ALREADY_ACTIVE");
    await tx.put(cKey, {...challenge, status:"consumed", consumedAtEpochSeconds:nowEpochSeconds});
    await tx.put(bKey, {status:"active", ownerFingerprint:request.ownerFingerprint,
      androidFingerprint:request.androidFingerprint, capability:CAPABILITY,
      approvedAtEpochSeconds:nowEpochSeconds, revokedAtEpochSeconds:null});
    return Object.freeze({status:"active", ownerFingerprint:request.ownerFingerprint,
      androidFingerprint:request.androidFingerprint, capability:CAPABILITY});
  });
}

/* authorizeOwner MUST authenticate a fresh owner-authorized revocation action.
 * This core does not define or expose an unauthenticated network endpoint.
 */
async function revokeBinding({storage, ownerFingerprint, androidFingerprint,
  nowEpochSeconds, authorizeOwner}) {
  if (!storage || typeof storage.transaction !== "function") throw new Error("ATOMIC_STORAGE_REQUIRED");
  assertFingerprint(ownerFingerprint, "OWNER_FINGERPRINT");
  assertFingerprint(androidFingerprint, "ANDROID_FINGERPRINT");
  if (typeof authorizeOwner !== "function" || await authorizeOwner() !== true)
    throw new Error("OWNER_REVOCATION_AUTH_REQUIRED");
  if (!Number.isSafeInteger(nowEpochSeconds) || nowEpochSeconds < 0) throw new Error("INVALID_NOW");
  const key = bindingKey(ownerFingerprint, androidFingerprint);
  return storage.transaction(async tx => {
    const current = await tx.get(key);
    if (!current || current.status !== "active") throw new Error("BINDING_NOT_ACTIVE");
    const revoked = {...current, status:"revoked", revokedAtEpochSeconds:nowEpochSeconds};
    await tx.put(key, revoked);
    return Object.freeze({status:"revoked", ownerFingerprint, androidFingerprint,
      revokedAtEpochSeconds:nowEpochSeconds});
  });
}

async function isBindingActive({storage, ownerFingerprint, androidFingerprint}) {
  assertFingerprint(ownerFingerprint, "OWNER_FINGERPRINT");
  assertFingerprint(androidFingerprint, "ANDROID_FINGERPRINT");
  const record = await storage.get(bindingKey(ownerFingerprint, androidFingerprint));
  return record?.status === "active" && record.capability === CAPABILITY;
}

module.exports = {ORIGIN, CAPABILITY, canonicalRequest, issueChallenge,
  consumeApproval, revokeBinding, isBindingActive};
