(() => {
  "use strict";
  const ORIGIN = "https://coma39658-ctrl.github.io";
  const REQUEST_TAG = "EZERO_ANDROID_ENROLL_REQUEST_V1";
  const APPROVAL_TAG = "EZERO_ANDROID_ENROLL_APPROVAL_V1";
  const REQUEST_FIELDS = ["device_spki","device_fp","challenge_id","nonce","audience","expires_at","device_proof"];
  const APPROVAL_FIELDS = ["root_fp","device_fp","challenge_id","nonce","audience","expires_at","root_approval"];
  const CHALLENGE_ORDER = ["challenge_id","device_fp","nonce","audience","expires_at"];

  function fail(code) { throw new Error(code); }
  function base64urlDecode(value, maxBytes = 512) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) fail("BASE64URL_INVALID");
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - value.length % 4) % 4);
    let binary;
    try { binary = atob(padded); } catch (_) { fail("BASE64URL_INVALID"); }
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    if (!bytes.length || bytes.length > maxBytes || base64urlEncode(bytes) !== value) fail("BASE64URL_NON_CANONICAL");
    return bytes;
  }
  function base64urlEncode(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }
  function parseEnvelope(raw, tag, fields) {
    if (typeof raw !== "string" || !raw || new TextEncoder().encode(raw).length > 4096) fail("QR_SIZE_INVALID");
    if (!/^[\x20-\x7e\n]+$/.test(raw) || raw.includes("\r") || !raw.endsWith("\n")) fail("QR_LINE_ENDING_INVALID");
    const lines = raw.slice(0, -1).split("\n");
    if (lines.length !== fields.length + 1 || lines[0] !== tag) fail("QR_ENVELOPE_INVALID");
    const result = Object.create(null);
    fields.forEach((key, index) => {
      const line = lines[index + 1];
      if (!line.startsWith(key + "=") || line.indexOf("=") !== key.length) fail("QR_FIELD_ORDER_OR_DUPLICATE_INVALID");
      const value = line.slice(key.length + 1);
      if (!value || /[\r\n]/.test(value)) fail("QR_FIELD_INVALID");
      result[key] = value;
    });
    return result;
  }
  function validateExpiry(value, now = Date.now()) {
    if (!/^[0-9]{13}$/.test(value)) fail("CHALLENGE_EXPIRY_INVALID");
    const expiry = Number(value);
    if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + 90000) fail("CHALLENGE_EXPIRED_OR_TOO_LONG");
    return expiry;
  }
  function canonicalChallenge(fields) {
    return new TextEncoder().encode(
      "EZERO_ANDROID_ENROLL_CHALLENGE_V1\n" +
      CHALLENGE_ORDER.map(key => key + "=" + fields[key] + "\n").join("")
    );
  }
  async function verifyEnrollmentRequest(raw, now = Date.now()) {
    const fields = parseEnvelope(raw, REQUEST_TAG, REQUEST_FIELDS);
    if (!/^[a-f0-9]{64}$/.test(fields.device_fp)) fail("DEVICE_FINGERPRINT_INVALID");
    if (!/^[A-Za-z0-9_-]{16,128}$/.test(fields.challenge_id) ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(fields.nonce)) fail("CHALLENGE_BINDING_INVALID");
    if (fields.audience !== ORIGIN) fail("CHALLENGE_AUDIENCE_INVALID");
    validateExpiry(fields.expires_at, now);
    const spki = base64urlDecode(fields.device_spki, 160);
    if (spki.length < 80) fail("DEVICE_SPKI_SIZE_INVALID");
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
    const fingerprint = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
    if (fingerprint !== fields.device_fp) fail("DEVICE_FINGERPRINT_MISMATCH");
    const publicKey = await crypto.subtle.importKey(
      "spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]
    );
    const proof = base64urlDecode(fields.device_proof, 64);
    if (proof.length !== 64) fail("DEVICE_PROOF_SIZE_INVALID");
    const challenge = {
      challenge_id: fields.challenge_id,
      device_fp: fields.device_fp,
      nonce: fields.nonce,
      audience: fields.audience,
      expires_at: fields.expires_at
    };
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" }, publicKey, proof, canonicalChallenge(challenge)
    );
    if (!valid) fail("DEVICE_PROOF_INVALID");
    return Object.freeze({
      deviceSpki: fields.device_spki,
      deviceFingerprint: fields.device_fp,
      challengeId: fields.challenge_id,
      nonce: fields.nonce,
      audience: fields.audience,
      expiresAt: fields.expires_at
    });
  }
  async function createRootApproval(rawRequest, now = Date.now()) {
    const request = await verifyEnrollmentRequest(rawRequest, now);
    if (!globalThis.EZERO_CONNECT_IDENTITY || !globalThis.EZERO_CONNECT_ROOT_SIGNER_V1) fail("ROOT_SIGNER_UNAVAILABLE");
    const loaded = await globalThis.EZERO_CONNECT_IDENTITY.load();
    if (!loaded) fail("EXISTING_ROOT_IDENTITY_REQUIRED");
    const identity = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    const rootFp = identity.fingerprint.replace(/:/g, "").toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(rootFp)) fail("ROOT_FINGERPRINT_INVALID");
    const challenge = {
      root_fp: rootFp,
      device_fp: request.deviceFingerprint,
      challenge_id: request.challengeId,
      nonce: request.nonce,
      audience: request.audience,
      expires_at: request.expiresAt
    };
    const signed = await globalThis.EZERO_CONNECT_ROOT_SIGNER_V1.signAndroidRootApproval(challenge);
    if (signed.root_fp !== rootFp || typeof signed.signature !== "string") fail("ROOT_SIGNER_RESPONSE_INVALID");
    base64urlDecode(signed.signature, 64);
    const approval = {
      root_fp: rootFp,
      device_fp: request.deviceFingerprint,
      challenge_id: request.challengeId,
      nonce: request.nonce,
      audience: request.audience,
      expires_at: request.expiresAt,
      root_approval: signed.signature
    };
    return APPROVAL_TAG + "\n" + APPROVAL_FIELDS.map(key => key + "=" + approval[key] + "\n").join("");
  }

  globalThis.EZERO_ANDROID_ROOT_APPROVAL_UI_V1 = Object.freeze({
    verifyEnrollmentRequest,
    createRootApproval
  });
})();