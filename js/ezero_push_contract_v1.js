"use strict";

// Minimal, non-sensitive Web Push envelope for E-ZERO incoming-call wakeups.
// This contract never carries SDP, ICE, media, contact lists, or message text.
const MAX_TTL_MS = 90_000;
const REQUEST_ID_RE = /^[A-Za-z0-9_-]{22,86}$/;

function validateIncomingCallPush(value, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const keys = Object.keys(value).sort().join(",");
  if (keys !== "expiresAt,issuedAt,mode,requestId,type,v") return null;
  if (value.v !== 1 || value.type !== "incoming-call") return null;
  if (!REQUEST_ID_RE.test(value.requestId)) return null;
  if (!["audio", "video"].includes(value.mode)) return null;
  if (!Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt)) return null;
  if (value.issuedAt > now + 5_000 || value.expiresAt <= now) return null;
  if (value.expiresAt <= value.issuedAt || value.expiresAt - value.issuedAt > MAX_TTL_MS) return null;
  return Object.freeze({
    v: 1,
    type: "incoming-call",
    requestId: value.requestId,
    issuedAt: value.issuedAt,
    expiresAt: value.expiresAt,
    mode: value.mode
  });
}

function notificationOptions(envelope, now = Date.now()) {
  const safe = validateIncomingCallPush(envelope, now);
  if (!safe) return null;
  return {
    body: "Open E-ZERO Connect to review the call request.",
    tag: "ezero-call-" + safe.requestId,
    renotify: false,
    requireInteraction: true,
    data: { requestId: safe.requestId, expiresAt: safe.expiresAt, mode: safe.mode },
    actions: [{ action: "open", title: "Open" }, { action: "dismiss", title: "Dismiss" }]
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { MAX_TTL_MS, validateIncomingCallPush, notificationOptions };
} else if (typeof self !== "undefined") {
  self.EZERO_PUSH_CONTRACT_V1 = { MAX_TTL_MS, validateIncomingCallPush, notificationOptions };
}
