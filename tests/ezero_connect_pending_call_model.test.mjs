import test from "node:test";
import assert from "node:assert/strict";
import {
  PENDING_CALL, createPendingCall, markPendingCallRinging,
  acceptPendingCall, declinePendingCall, cancelPendingCall,
  expirePendingCall, isPendingCallTerminal
} from "../src/ezero_connect_pending_call_model.mjs";

const NOW = 1_800_000_000_000;
const INSTALL = "android-install-01";
const CALLER = "browser-root-A";
function fixture(overrides = {}) {
  return createPendingCall({
    relationshipId: "a".repeat(64), callerIdentity: CALLER,
    recipientInstallationId: INSTALL, callId: "call_12345678",
    nonce: "abcdefghijklmnopqrstuv", mode: "audio",
    issuedAt: NOW, expiresAt: NOW + 120_000, ...overrides
  });
}

test("creates only bounded audio/video pending calls", () => {
  assert.equal(fixture().state, PENDING_CALL.PENDING);
  assert.throws(() => fixture({ mode: "screen-share" }), /PENDING_CALL_INPUT_INVALID/);
  assert.throws(() => fixture({ expiresAt: NOW + 120_001 }), /PENDING_CALL_INPUT_INVALID/);
  assert.throws(() => fixture({ expiresAt: NOW }), /PENDING_CALL_INPUT_INVALID/);
  assert.throws(() => fixture({ relationshipId: "not-a-hash" }), /PENDING_CALL_INPUT_INVALID/);
});

test("only the bound recipient installation may ring or accept", () => {
  const call = fixture();
  assert.throws(() => markPendingCallRinging(call, "other-install", NOW + 1), /PENDING_CALL_RECIPIENT_INVALID/);
  const ringing = markPendingCallRinging(call, INSTALL, NOW + 1);
  assert.equal(ringing.state, PENDING_CALL.RINGING);
  assert.throws(() => acceptPendingCall(ringing, "other-install", NOW + 2), /PENDING_CALL_RECIPIENT_INVALID/);
  assert.equal(acceptPendingCall(ringing, INSTALL, NOW + 2).state, PENDING_CALL.ACCEPTED);
});

test("decline is terminal and prevents a later accept", () => {
  const declined = declinePendingCall(markPendingCallRinging(fixture(), INSTALL, NOW + 1), INSTALL, NOW + 2);
  assert.equal(declined.state, PENDING_CALL.DECLINED);
  assert.equal(isPendingCallTerminal(declined), true);
  assert.throws(() => acceptPendingCall(declined, INSTALL, NOW + 3), /PENDING_CALL_TERMINAL/);
});

test("only the authenticated caller may cancel and cancellation is terminal", () => {
  const call = fixture();
  assert.throws(() => cancelPendingCall(call, "attacker", NOW + 1), /PENDING_CALL_CALLER_INVALID/);
  const cancelled = cancelPendingCall(call, CALLER, NOW + 1);
  assert.equal(cancelled.state, PENDING_CALL.CANCELLED);
  assert.throws(() => markPendingCallRinging(cancelled, INSTALL, NOW + 2), /PENDING_CALL_TERMINAL/);
});

test("expiry uses supplied server time and cannot be accepted afterwards", () => {
  const call = fixture();
  assert.throws(() => expirePendingCall(call, NOW + 119_999), /PENDING_CALL_NOT_EXPIRED/);
  const expired = expirePendingCall(call, NOW + 120_000);
  assert.equal(expired.state, PENDING_CALL.EXPIRED);
  assert.throws(() => acceptPendingCall(expired, INSTALL, NOW + 120_001), /PENDING_CALL_TERMINAL/);
});

test("terminal expiry is idempotent and active transitions reject expired timestamps", () => {
  const expired = expirePendingCall(fixture(), NOW + 120_000);
  assert.equal(expirePendingCall(expired, NOW + 130_000), expired);
  assert.throws(() => acceptPendingCall(fixture(), INSTALL, NOW + 120_000), /PENDING_CALL_EXPIRED/);
});
