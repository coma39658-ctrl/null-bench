"use strict";

const crypto = require("node:crypto");

const CALL_ID = /^[A-Za-z0-9_-]{8,128}$/;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_LIFETIME_MS = 120_000;

function canonicalWakeBytes(fields) {
  if (!fields || fields.wake_v !== "1") throw new Error("INVALID_WAKE_VERSION");
  if (typeof fields.call_id !== "string" || !CALL_ID.test(fields.call_id)) {
    throw new Error("INVALID_CALL_ID");
  }
  if (fields.mode !== "AUDIO" && fields.mode !== "VIDEO") {
    throw new Error("INVALID_CALL_MODE");
  }
  if (typeof fields.expires_at !== "string" || !/^[0-9]{13}$/.test(fields.expires_at)) {
    throw new Error("INVALID_EXPIRY");
  }
  if (typeof fields.nonce !== "string" || !NONCE.test(fields.nonce)) {
    throw new Error("INVALID_NONCE");
  }
  return Buffer.from(
    "EZERO_CALL_WAKE_V1\n" +
    "wake_v=1\n" +
    "call_id=" + fields.call_id + "\n" +
    "mode=" + fields.mode + "\n" +
    "expires_at=" + fields.expires_at + "\n" +
    "nonce=" + fields.nonce + "\n",
    "utf8"
  );
}

function signCallWakeV1(fields, privateKey, nowMillis = Date.now()) {
  const expiresAt = Number(fields?.expires_at);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= nowMillis ||
      expiresAt - nowMillis > MAX_LIFETIME_MS) {
    throw new Error("WAKE_EXPIRY_OUT_OF_RANGE");
  }
  const canonical = canonicalWakeBytes(fields);
  const signature = crypto.sign("sha256", canonical, {
    key: privateKey,
    dsaEncoding: "der"
  });
  return {
    wake_v: "1",
    call_id: fields.call_id,
    mode: fields.mode,
    expires_at: fields.expires_at,
    nonce: fields.nonce,
    server_sig: signature.toString("base64url")
  };
}

module.exports = { canonicalWakeBytes, signCallWakeV1 };
