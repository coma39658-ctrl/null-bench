// Server-side cryptographic verifier primitives for Android enrollment V1.
// Not wired to a public route or Durable Object yet.
const ANDROID_DOMAIN = "EZERO_ANDROID_ENROLL_PROOF_V1\n";
const APPROVAL_DOMAIN = "EZERO_ANDROID_ENROLL_APPROVAL_V1\n";
const FP_RE = /^(?:[A-F0-9]{2}:){31}[A-F0-9]{2}$/;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;

export function enrollmentCanonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(enrollmentCanonical).join(",") + "]";
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + enrollmentCanonical(value[k])).join(",") + "}";
  }
  throw new Error("ENROLLMENT_CANONICAL_INVALID");
}

export function enrollmentDecodeBase64url(value, expectedBytes) {
  if (typeof value !== "string" || !B64URL_RE.test(value)) throw new Error("ENROLLMENT_BASE64URL_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("ENROLLMENT_BASE64URL_INVALID"); }
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (expectedBytes !== undefined && bytes.length !== expectedBytes) throw new Error("ENROLLMENT_SIGNATURE_LENGTH_INVALID");
  return bytes;
}

export function enrollmentBase64url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export async function enrollmentFingerprint(spki) {
  const digest = await crypto.subtle.digest("SHA-256", enrollmentDecodeBase64url(spki));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

async function verifyP1363(spki, signature, domain, payload) {
  const keyBytes = enrollmentDecodeBase64url(spki);
  const signatureBytes = enrollmentDecodeBase64url(signature, 64);
  const key = await crypto.subtle.importKey("spki", keyBytes, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const message = new TextEncoder().encode(domain + enrollmentCanonical(payload));
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, signatureBytes, message);
}

function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

export async function verifyAndroidEnrollmentV1(challenge, submission, options = {}) {
  const { now = Date.now(), expectedAudience, trustedApproverPublicKeySpki } = options;
  if (!challenge || !submission || !Number.isSafeInteger(now) ||
      typeof expectedAudience !== "string" || !expectedAudience.startsWith("https://") ||
      typeof trustedApproverPublicKeySpki !== "string") throw new Error("ENROLLMENT_INPUT_INVALID");
  if (challenge.audience !== expectedAudience) throw new Error("ENROLLMENT_AUDIENCE_MISMATCH");
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(challenge.challengeId || "") ||
      !/^[A-Za-z0-9_-]{22,172}$/.test(challenge.nonce || "") ||
      typeof challenge.audience !== "string" || !challenge.audience.startsWith("https://") ||
      !Number.isSafeInteger(challenge.issuedAt) || !Number.isSafeInteger(challenge.expiresAt) ||
      challenge.expiresAt <= challenge.issuedAt || challenge.expiresAt - challenge.issuedAt > 90_000 ||
      now < challenge.issuedAt || now >= challenge.expiresAt) throw new Error("ENROLLMENT_CHALLENGE_INVALID");

  const androidProof = submission.androidProof;
  const approval = submission.browserApproval;
  const proofKeys = ["v","challengeId","nonce","audience","androidPublicKeySpki","androidFingerprint","issuedAt","expiresAt"];
  const approvalKeys = ["v","challengeId","nonce","audience","androidPublicKeySpki","androidFingerprint","approverPublicKeySpki","approverFingerprint","issuedAt","expiresAt"];
  if (!exactKeys(androidProof?.payload, proofKeys) || typeof androidProof.signature !== "string" ||
      !exactKeys(approval?.payload, approvalKeys) || typeof approval.signature !== "string") {
    throw new Error("ENROLLMENT_PROOF_SHAPE_INVALID");
  }
  const p = androidProof.payload, a = approval.payload;
  const bound = payload => payload.v === 1 &&
    payload.challengeId === challenge.challengeId && payload.nonce === challenge.nonce &&
    payload.audience === challenge.audience &&
    payload.androidPublicKeySpki === challenge.androidPublicKeySpki &&
    payload.androidFingerprint === challenge.androidFingerprint &&
    payload.issuedAt === challenge.issuedAt && payload.expiresAt === challenge.expiresAt;
  if (!bound(p) || !bound(a) || !FP_RE.test(challenge.androidFingerprint || "")) {
    throw new Error("ENROLLMENT_PROOF_BINDING_INVALID");
  }
  if (!/^[A-Za-z0-9_-]+$/.test(challenge.androidPublicKeySpki || "")) throw new Error("ENROLLMENT_PUBLIC_KEY_INVALID");
  if (await enrollmentFingerprint(challenge.androidPublicKeySpki) !== challenge.androidFingerprint) {
    throw new Error("ENROLLMENT_ANDROID_FINGERPRINT_MISMATCH");
  }
  if (a.approverPublicKeySpki !== trustedApproverPublicKeySpki ||
      await enrollmentFingerprint(a.approverPublicKeySpki) !== a.approverFingerprint ||
      !FP_RE.test(a.approverFingerprint || "")) throw new Error("ENROLLMENT_APPROVER_IDENTITY_MISMATCH");

  if (!await verifyP1363(challenge.androidPublicKeySpki, androidProof.signature, ANDROID_DOMAIN, p)) {
    throw new Error("ENROLLMENT_ANDROID_SIGNATURE_INVALID");
  }
  if (!await verifyP1363(a.approverPublicKeySpki, approval.signature, APPROVAL_DOMAIN, a)) {
    throw new Error("ENROLLMENT_BROWSER_APPROVAL_INVALID");
  }
  return Object.freeze({
    challengeId: challenge.challengeId,
    androidPublicKeySpki: challenge.androidPublicKeySpki,
    androidFingerprint: challenge.androidFingerprint,
    approverPublicKeySpki: a.approverPublicKeySpki,
    approverFingerprint: a.approverFingerprint,
    audience: challenge.audience,
    enrolledAt: now,
    status: "ACTIVE"
  });
}
