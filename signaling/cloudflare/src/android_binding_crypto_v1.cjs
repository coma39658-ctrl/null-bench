/* E-ZERO Android binding server-side cryptographic verification V1.
 * Isolated test helper: no Worker route or deployment.
 * Validates the existing self-signed EZERO2 proof, then verifies the exact
 * domain-separated Android binding approval using the SAME P-256 owner key.
 */
"use strict";

const ORIGIN = "https://coma39658-ctrl.github.io";
const OWNER_DOMAIN = "EZERO-PERMANENT-IDENTITY-1";
const APPROVAL_DOMAIN = "EZERO-ANDROID-BIND-APPROVAL-1";
const FP = /^[0-9a-f]{64}$/;
const B64URL = /^[A-Za-z0-9_-]{40,240}$/;
const SIGNATURE = /^[A-Za-z0-9_-]{80,120}$/;

function decode(value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) throw new Error("INVALID_" + label);
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
  const raw = atob(padded);
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}
function hex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPermanentOwnerProof({origin, ownerSpkiBase64Url, ownerFingerprint,
  permanentProofBase64Url, cryptoImpl = globalThis.crypto}) {
  if (origin !== ORIGIN) throw new Error("OWNER_PROOF_WRONG_ORIGIN");
  if (!FP.test(ownerFingerprint || "")) throw new Error("OWNER_PROOF_BAD_FINGERPRINT");
  if (!cryptoImpl?.subtle) throw new Error("WEBCRYPTO_REQUIRED");
  const spki = decode(ownerSpkiBase64Url, B64URL, "OWNER_SPKI");
  if (spki.length < 75 || spki.length > 180) throw new Error("OWNER_SPKI_SIZE");
  if (hex(new Uint8Array(await cryptoImpl.subtle.digest("SHA-256", spki))) !== ownerFingerprint)
    throw new Error("OWNER_FINGERPRINT_MISMATCH");
  const key = await cryptoImpl.subtle.importKey("spki", spki,
    {name:"ECDSA", namedCurve:"P-256"}, false, ["verify"]);
  if (key.algorithm?.namedCurve !== "P-256") throw new Error("OWNER_KEY_NOT_P256");
  const proof = decode(permanentProofBase64Url, SIGNATURE, "OWNER_PROOF");
  if (proof.length !== 64) throw new Error("OWNER_PROOF_SIZE");
  const statement = [OWNER_DOMAIN, ORIGIN, ownerSpkiBase64Url, ownerFingerprint].join("\n");
  const valid = await cryptoImpl.subtle.verify({name:"ECDSA", hash:"SHA-256"},
    key, proof, new TextEncoder().encode(statement));
  if (!valid) throw new Error("OWNER_PERMANENT_PROOF_INVALID");
  return Object.freeze({origin:ORIGIN, ownerFingerprint, ownerSpkiBase64Url, publicKey:key});
}

async function verifyAndroidBindingApproval({ownerIdentity, canonicalRequest,
  signatureBase64Url, cryptoImpl = globalThis.crypto}) {
  if (!ownerIdentity || ownerIdentity.origin !== ORIGIN ||
      !FP.test(ownerIdentity.ownerFingerprint || "")) throw new Error("OWNER_IDENTITY_REQUIRED");
  if (typeof canonicalRequest !== "string" || canonicalRequest.length > 1200 ||
      canonicalRequest.includes("\r")) throw new Error("INVALID_CANONICAL_REQUEST");
  const lines = canonicalRequest.split("\n");
  if (lines.length !== 9 || lines[0] !== "EZERO-ANDROID-BIND-1" ||
      lines[1] !== ORIGIN || lines[2] !== ownerIdentity.ownerFingerprint ||
      lines[8] !== "call-invite-only") throw new Error("APPROVAL_REQUEST_SCOPE_MISMATCH");
  const signature = decode(signatureBase64Url, SIGNATURE, "APPROVAL_SIGNATURE");
  if (signature.length !== 64) throw new Error("APPROVAL_SIGNATURE_SIZE");
  const signed = APPROVAL_DOMAIN + "\n" + canonicalRequest;
  const valid = await cryptoImpl.subtle.verify({name:"ECDSA", hash:"SHA-256"},
    ownerIdentity.publicKey, signature, new TextEncoder().encode(signed));
  if (!valid) throw new Error("OWNER_APPROVAL_SIGNATURE_INVALID");
  return true;
}

async function verifyOwnerApprovalBundle({origin, ownerSpkiBase64Url, ownerFingerprint,
  permanentProofBase64Url, canonicalRequest, signatureBase64Url,
  cryptoImpl = globalThis.crypto}) {
  const ownerIdentity = await verifyPermanentOwnerProof({origin, ownerSpkiBase64Url,
    ownerFingerprint, permanentProofBase64Url, cryptoImpl});
  await verifyAndroidBindingApproval({ownerIdentity, canonicalRequest,
    signatureBase64Url, cryptoImpl});
  return true;
}

module.exports = {ORIGIN, verifyPermanentOwnerProof,
  verifyAndroidBindingApproval, verifyOwnerApprovalBundle};
