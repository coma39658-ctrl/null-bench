const INVITE_PREFIX = "EZERO-CALL1.";
const CALL_INVITE_TTL_MS = 30_000;
const MAX_ENVELOPE_CHARS = 8192;
const FINGERPRINT_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function canonicalCallInvite(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalCallInvite).join(",") + "]";
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonicalCallInvite(value[key])).join(",") + "}";
  }
  throw new Error("CALL_INVITE_CANONICAL_INVALID");
}

function decodeBase64url(value, expectedBytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("CALL_INVITE_BASE64_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("CALL_INVITE_BASE64_INVALID"); }
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (expectedBytes && bytes.length !== expectedBytes) throw new Error("CALL_INVITE_BASE64_LENGTH_INVALID");
  return bytes;
}

function fingerprintFromSpki(spkiBytes) {
  return crypto.subtle.digest("SHA-256", spkiBytes).then(digest =>
    Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":")
  );
}

async function verifySignature(publicKeySpki, signature, payload) {
  const key = await crypto.subtle.importKey(
    "spki", decodeBase64url(publicKeySpki),
    { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]
  );
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, key, decodeBase64url(signature, 64),
    new TextEncoder().encode(canonicalCallInvite(payload))
  );
}

export function encodeCallInvite(envelope) {
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return INVITE_PREFIX + btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

export async function verifyCallInvite(code, expectedOrigin, expectedRecipientFingerprint, now = Date.now()) {
  if (typeof code !== "string" || code.length > MAX_ENVELOPE_CHARS || !code.startsWith(INVITE_PREFIX)) {
    throw new Error("CALL_INVITE_FORMAT_INVALID");
  }
  let envelope;
  try {
    const bytes = decodeBase64url(code.slice(INVITE_PREFIX.length));
    envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (_) { throw new Error("CALL_INVITE_FORMAT_INVALID"); }
  if (!envelope || Object.keys(envelope).sort().join(",") !== "payload,signature" ||
      typeof envelope.signature !== "string") throw new Error("CALL_INVITE_ENVELOPE_INVALID");
  const p = envelope.payload;
  const fields = ["callerFingerprint","callerPublicKeySpki","callId","expiresAt","issuedAt","mode","nonce","origin","protocol","recipientFingerprint","relationshipId","v"].sort().join(",");
  if (!p || typeof p !== "object" || Array.isArray(p) || Object.keys(p).sort().join(",") !== fields) {
    throw new Error("CALL_INVITE_FIELDS_INVALID");
  }
  if (p.v !== 1 || p.protocol !== "E-ZERO-SAVED-FRIEND-CALL-1" || p.origin !== expectedOrigin ||
      p.recipientFingerprint !== expectedRecipientFingerprint || !FINGERPRINT_RE.test(p.recipientFingerprint) ||
      !FINGERPRINT_RE.test(p.callerFingerprint) || p.callerFingerprint === p.recipientFingerprint) {
    throw new Error("CALL_INVITE_BINDING_INVALID");
  }
  if (!["audio", "video"].includes(p.mode) || typeof p.relationshipId !== "string" ||
      !/^[a-f0-9]{64}$/.test(p.relationshipId) ||
      typeof p.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(p.callId) ||
      typeof p.nonce !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(p.nonce)) {
    throw new Error("CALL_INVITE_VALUE_INVALID");
  }
  if (!Number.isSafeInteger(p.issuedAt) || !Number.isSafeInteger(p.expiresAt) ||
      p.issuedAt > now + 5_000 || p.expiresAt <= now ||
      p.expiresAt <= p.issuedAt || p.expiresAt - p.issuedAt > CALL_INVITE_TTL_MS) {
    throw new Error("CALL_INVITE_EXPIRED_OR_TIME_INVALID");
  }
  const spki = decodeBase64url(p.callerPublicKeySpki);
  if (await fingerprintFromSpki(spki) !== p.callerFingerprint) throw new Error("CALL_INVITE_FINGERPRINT_MISMATCH");
  if (!await verifySignature(p.callerPublicKeySpki, envelope.signature, p)) throw new Error("CALL_INVITE_SIGNATURE_INVALID");
  return Object.freeze({ ...p, signature: envelope.signature });
}

export const CALL_INVITE_LIMITS = Object.freeze({
  ttlMs: CALL_INVITE_TTL_MS,
  maxEnvelopeChars: MAX_ENVELOPE_CHARS,
  maxPendingPerSocket: 1
});
