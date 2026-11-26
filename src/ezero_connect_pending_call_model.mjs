// Executable reference model for the pending-call lifecycle.
// This is a deterministic contract model, NOT a persistent server implementation.
export const PENDING_CALL = Object.freeze({
  PENDING: "PENDING", RINGING: "RINGING", ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED", CANCELLED: "CANCELLED", EXPIRED: "EXPIRED"
});
const TERMINAL = new Set([
  PENDING_CALL.ACCEPTED, PENDING_CALL.DECLINED,
  PENDING_CALL.CANCELLED, PENDING_CALL.EXPIRED
]);
export const MAX_PENDING_CALL_TTL_MS = 120_000;

export function createPendingCall(input) {
  if (!input || typeof input !== "object" ||
      typeof input.relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(input.relationshipId) ||
      typeof input.callerIdentity !== "string" || !input.callerIdentity ||
      typeof input.recipientInstallationId !== "string" || !input.recipientInstallationId ||
      typeof input.callId !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(input.callId) ||
      typeof input.nonce !== "string" || !/^[A-Za-z0-9_-]{22,172}$/.test(input.nonce) ||
      !["audio", "video"].includes(input.mode) ||
      !Number.isSafeInteger(input.issuedAt) || !Number.isSafeInteger(input.expiresAt) ||
      input.expiresAt <= input.issuedAt ||
      input.expiresAt - input.issuedAt > MAX_PENDING_CALL_TTL_MS) {
    throw new Error("PENDING_CALL_INPUT_INVALID");
  }
  return Object.freeze({
    v: 1, relationshipId: input.relationshipId, callerIdentity: input.callerIdentity,
    recipientInstallationId: input.recipientInstallationId, callId: input.callId,
    nonce: input.nonce, mode: input.mode, issuedAt: input.issuedAt,
    expiresAt: input.expiresAt, state: PENDING_CALL.PENDING, terminalAt: null
  });
}

function assertActive(call, now) {
  if (!call || TERMINAL.has(call.state)) throw new Error("PENDING_CALL_TERMINAL");
  if (!Number.isSafeInteger(now)) throw new Error("PENDING_CALL_TIME_INVALID");
  if (now >= call.expiresAt) throw new Error("PENDING_CALL_EXPIRED");
}
function terminal(call, state, now) {
  return Object.freeze({ ...call, state, terminalAt: now });
}

export function markPendingCallRinging(call, installationId, now) {
  assertActive(call, now);
  if (installationId !== call.recipientInstallationId) throw new Error("PENDING_CALL_RECIPIENT_INVALID");
  if (call.state !== PENDING_CALL.PENDING) throw new Error("PENDING_CALL_STATE_INVALID");
  return Object.freeze({ ...call, state: PENDING_CALL.RINGING });
}
export function acceptPendingCall(call, installationId, now) {
  assertActive(call, now);
  if (installationId !== call.recipientInstallationId) throw new Error("PENDING_CALL_RECIPIENT_INVALID");
  if (![PENDING_CALL.PENDING, PENDING_CALL.RINGING].includes(call.state)) throw new Error("PENDING_CALL_STATE_INVALID");
  return terminal(call, PENDING_CALL.ACCEPTED, now);
}
export function declinePendingCall(call, installationId, now) {
  assertActive(call, now);
  if (installationId !== call.recipientInstallationId) throw new Error("PENDING_CALL_RECIPIENT_INVALID");
  if (![PENDING_CALL.PENDING, PENDING_CALL.RINGING].includes(call.state)) throw new Error("PENDING_CALL_STATE_INVALID");
  return terminal(call, PENDING_CALL.DECLINED, now);
}
export function cancelPendingCall(call, callerIdentity, now) {
  assertActive(call, now);
  if (callerIdentity !== call.callerIdentity) throw new Error("PENDING_CALL_CALLER_INVALID");
  if (![PENDING_CALL.PENDING, PENDING_CALL.RINGING].includes(call.state)) throw new Error("PENDING_CALL_STATE_INVALID");
  return terminal(call, PENDING_CALL.CANCELLED, now);
}
export function expirePendingCall(call, now) {
  if (!call || !Number.isSafeInteger(now)) throw new Error("PENDING_CALL_TIME_INVALID");
  if (TERMINAL.has(call.state)) return call;
  if (now < call.expiresAt) throw new Error("PENDING_CALL_NOT_EXPIRED");
  return terminal(call, PENDING_CALL.EXPIRED, now);
}
export function isPendingCallTerminal(call) {
  return Boolean(call && TERMINAL.has(call.state));
}
