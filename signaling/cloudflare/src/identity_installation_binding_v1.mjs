const ORIGIN = "https://coma39658-ctrl.github.io";
const IDENTITY_FP = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const INSTALLATION_FP = /^[a-f0-9]{64}$/;
const RELATIONSHIP_ID = /^[a-f0-9]{64}$/;
const OPAQUE_ID = /^[A-Za-z0-9_-]{22,128}$/;
const FIELDS = [
  "protocol", "origin", "challengeId", "nonce", "expiresAt",
  "relationshipId", "identityFingerprint", "installationFingerprint", "installationId"
];
const enc = new TextEncoder();

export function canonicalBindingV1(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      Object.keys(value).sort().join(",") !== [...FIELDS].sort().join(",")) {
    throw new TypeError("BINDING_FIELDS_INVALID");
  }
  return enc.encode("EZERO_IDENTITY_INSTALLATION_BINDING_V1\n" +
    FIELDS.map(key => key + "=" + value[key] + "\n").join(""));
}

export async function sha256Hex(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function fingerprintIdentitySpki(spki) {
  const digest = await crypto.subtle.digest("SHA-256", spki);
  return Array.from(new Uint8Array(digest), byte =>
    byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

export async function fingerprintInstallationSpki(spki) {
  return sha256Hex(spki);
}

function decodeP1363(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") +
      "=".repeat((4 - value.length % 4) % 4));
    const bytes = Uint8Array.from(raw, char => char.charCodeAt(0));
    return bytes.length === 64 ? bytes : null;
  } catch (_) { return null; }
}

function validateStatement(value, now) {
  if (value.protocol !== "EZERO_IDENTITY_INSTALLATION_BINDING_V1" ||
      value.origin !== ORIGIN ||
      typeof value.challengeId !== "string" || !OPAQUE_ID.test(value.challengeId) ||
      typeof value.nonce !== "string" || !OPAQUE_ID.test(value.nonce) ||
      typeof value.expiresAt !== "string" || !/^\d{13}$/.test(value.expiresAt) ||
      Number(value.expiresAt) <= now || Number(value.expiresAt) > now + 60_000 ||
      !RELATIONSHIP_ID.test(value.relationshipId || "") ||
      !IDENTITY_FP.test(value.identityFingerprint || "") ||
      !INSTALLATION_FP.test(value.installationFingerprint || "") ||
      !OPAQUE_ID.test(value.installationId || "")) {
    throw new TypeError("BINDING_STATEMENT_INVALID");
  }
}

async function verifyP256(spki, signature, bytes) {
  const sig = decodeP1363(signature);
  if (!sig || !(spki instanceof Uint8Array) || spki.length < 80 || spki.length > 160)
    return false;
  try {
    const key = await crypto.subtle.importKey("spki", spki,
      { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, bytes);
  } catch (_) { return false; }
}

/**
 * Verifies two independent signatures over one canonical binding statement.
 * The caller MUST supply SPKIs fetched from authoritative registries, not request data.
 * This helper does not check relationship status, device/root revocation, challenge
 * consumption, or persist a binding; those checks belong in the private service.
 */
export async function verifyIdentityInstallationBindingV1({
  statement, identitySpki, installationSpki, identitySignature, installationSignature,
  now = Date.now()
}) {
  validateStatement(statement, now);
  const bytes = canonicalBindingV1(statement);
  const [identityFp, installationFp] = await Promise.all([
    fingerprintIdentitySpki(identitySpki),
    fingerprintInstallationSpki(installationSpki)
  ]);
  if (identityFp !== statement.identityFingerprint) throw new Error("IDENTITY_KEY_FINGERPRINT_MISMATCH");
  if (installationFp !== statement.installationFingerprint) throw new Error("INSTALLATION_KEY_FINGERPRINT_MISMATCH");
  const [identityOK, installationOK] = await Promise.all([
    verifyP256(identitySpki, identitySignature, bytes),
    verifyP256(installationSpki, installationSignature, bytes)
  ]);
  if (!identityOK) throw new Error("IDENTITY_SIGNATURE_INVALID");
  if (!installationOK) throw new Error("INSTALLATION_SIGNATURE_INVALID");
  return { ok: true, statementHash: await sha256Hex(bytes) };
}
