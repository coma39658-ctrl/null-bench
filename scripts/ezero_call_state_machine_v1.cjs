"use strict";

// Reference model only: the live UI/provider adapter must call an equivalent,
// separately reviewed implementation before this model is treated as integrated.
const TERMINAL = new Set(["REJECTED", "CANCELLED", "EXPIRED", "FAILED", "ENDED"]);
const NEXT = Object.freeze({
  CREATED: Object.freeze({ DELIVER: "DELIVERED", CANCEL: "CANCELLED", FAIL: "FAILED" }),
  DELIVERED: Object.freeze({ RING: "RINGING", CANCEL: "CANCELLED", EXPIRE: "EXPIRED", FAIL: "FAILED" }),
  RINGING: Object.freeze({ ACCEPT: "ACCEPTED", REJECT: "REJECTED", CANCEL: "CANCELLED", EXPIRE: "EXPIRED", FAIL: "FAILED" }),
  ACCEPTED: Object.freeze({ JOIN: "JOINING", CANCEL: "CANCELLED", EXPIRE: "EXPIRED", FAIL: "FAILED" }),
  JOINING: Object.freeze({ CONNECT: "CONNECTED", CANCEL: "CANCELLED", EXPIRE: "EXPIRED", FAIL: "FAILED" }),
  CONNECTED: Object.freeze({ END: "ENDED", FAIL: "FAILED" })
});

function createCallState({ callId, recipientDeviceId, expiresAt }) {
  if (typeof callId !== "string" || !callId || typeof recipientDeviceId !== "string" ||
      !recipientDeviceId || !Number.isSafeInteger(expiresAt) || expiresAt <= 0) {
    throw new TypeError("CALL_STATE_ARGUMENTS_INVALID");
  }
  return Object.freeze({
    callId, recipientDeviceId, expiresAt, status: "CREATED",
    lastEventAt: 0, seenEventIds: Object.freeze([])
  });
}

function transitionCall(state, event) {
  const reject = reason => Object.freeze({ accepted: false, reason, state });
  if (!state || !event || typeof event !== "object") return reject("EVENT_INVALID");
  if (event.callId !== state.callId) return reject("CALL_ID_MISMATCH");
  if (event.recipientDeviceId !== state.recipientDeviceId) return reject("RECIPIENT_MISMATCH");
  if (typeof event.eventId !== "string" || !event.eventId || event.eventId.length > 128) return reject("EVENT_ID_INVALID");
  if (!Number.isSafeInteger(event.at) || event.at < 0) return reject("EVENT_TIME_INVALID");
  if (state.seenEventIds.includes(event.eventId)) {
    return Object.freeze({ accepted: true, duplicate: true, reason: "DUPLICATE_IGNORED", state });
  }
  if (TERMINAL.has(state.status)) return reject("CALL_ALREADY_TERMINAL");
  if (event.at < state.lastEventAt) return reject("STALE_EVENT");
  if (event.type === "EXPIRE" ? event.at < state.expiresAt : event.at >= state.expiresAt) {
    return reject(event.at >= state.expiresAt ? "INVITATION_EXPIRED" : "EXPIRY_TOO_EARLY");
  }
  const next = NEXT[state.status]?.[event.type];
  if (!next) return reject("TRANSITION_NOT_ALLOWED");
  if (event.type === "ACCEPT" && event.explicitConsent !== true) return reject("EXPLICIT_ACCEPT_REQUIRED");
  const nextState = Object.freeze({
    ...state,
    status: next,
    lastEventAt: event.at,
    seenEventIds: Object.freeze([...state.seenEventIds, event.eventId])
  });
  return Object.freeze({ accepted: true, duplicate: false, reason: "TRANSITION_ACCEPTED", state: nextState });
}

module.exports = { TERMINAL, createCallState, transitionCall };
