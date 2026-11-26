# E-ZERO Connect — Pending Call Lifecycle Contract (Staging)

Status: DESIGN CONTRACT — NOT IMPLEMENTED
Scope: PR #221 staging only. This document does not authorize production changes.

## Non-negotiable compatibility boundary

- Preserve the existing audio/video WebRTC engine and trusted-friend identity format.
- Do not change QR enrollment, saved-friend storage, or existing online call relay semantics in this phase.
- Add offline delivery as a separate call-lifecycle capability, not as an FCM shortcut inside the WebSocket relay.
- Existing browser relay remains usable when the peer is online.
- Push is only a wake-up hint. It must never answer a call, start WebRTC, or enable microphone/camera.

## State machine

A server-side call record is bound to one authenticated caller identity, one already-verified relationship, and one root-approved recipient installation.

Allowed transitions:

- absent -> pending: caller authorization and saved-friend relationship verified; opaque call ID and unpredictable nonce atomically reserved.
- pending -> ringing: recipient wake hint accepted for delivery; this state is informational and does not imply user notification was displayed.
- pending|ringing -> accepted: recipient installation authenticates and atomically consumes the still-valid invitation.
- pending|ringing -> declined: recipient explicitly rejects; record becomes terminal.
- pending|ringing -> cancelled: caller cancels; record becomes terminal.
- pending|ringing -> expired: server clock passes expiry; record becomes terminal.
- accepted|declined|cancelled|expired are terminal; no transition out is permitted.

The server must make consume/decline/cancel/expiry idempotent and atomic. Two simultaneous accepts must yield at most one success. A declined, cancelled, consumed, expired, or replayed invitation must never be reactivated.

## Timing and replay

- Invitation lifetime: maximum 120 seconds, measured by server time.
- Use a cryptographically random nonce (minimum 16 bytes).
- Reserve call ID and nonce atomically before sending any wake message.
- Enforce server-side replay protection across retries and process restarts.
- Client-side replay storage is defense in depth, never the authoritative replay control.
- Expiry is checked on create, wake, fetch, consume, decline and cancel.

## Recipient installation enrollment

- Android installation has its own non-exportable P-256 Keystore key.
- It is not the browser root identity and must not be silently treated as the same key.
- Enrollment requires explicit approval by the existing root identity using a short-lived challenge and proof-of-possession.
- Enrollment records installation public key/fingerprint, recipient identity, status, creation time and revocation state.
- Token registration/update requires proof signed by the enrolled installation key.
- Revocation and token rotation invalidate old delivery credentials.
- Never log or expose FCM registration tokens, private keys, access tokens or signed payloads.

## Wake message and sender

- Data-only FCM payload; opaque call reference, media mode, version, expiry, nonce and server signature only.
- No caller display name, profile photo, SDP, ICE, media, message text, contacts, or other personal content.
- Signature uses the canonical ECDSA P-256/SHA-256 format in `android/FCM_WAKE_SENDER_INTEROPERABILITY_CONTRACT.md`.
- Signing key and FCM credentials stay in the server secret store; never in Git, browser storage or APK.
- Sender verifies caller, relationship, recipient enrollment, token status, rate limit and cooldown before dispatch.
- FCM delivery success is not proof that Android displayed a notification or rang.

## Accept / decline / cancel API behavior

- Android must fetch the invitation from the authenticated server using the opaque reference.
- Server revalidates caller, saved relationship, recipient installation, signature, expiry and replay status before returning trusted call details.
- Accept atomically consumes the invite and only then hands off to the existing call engine.
- Decline and caller cancel perform server-side terminal transitions and best-effort notification cleanup.
- The client must not open a call URL or start media based only on untrusted notification extras.
- Displayed caller name/photo must come from the already-verified saved-friend record, never push payload fields.

## Required automated tests before enabling delivery

1. Unauthenticated caller cannot create a pending call.
2. Caller cannot target a non-friend or a different recipient installation.
3. Unenrolled/revoked installation cannot register or receive a token.
4. Duplicate call ID or nonce is rejected atomically.
5. Expired, malformed, tampered and replayed wake payloads are rejected.
6. Two concurrent accepts: exactly one succeeds.
7. Decline/cancel/expiry are idempotent and prevent later accept.
8. Token rotation/revocation prevents delivery to the old token.
9. Push payload schema rejects every prohibited field.
10. Push dispatch failure does not corrupt the existing online call relay.
11. Existing QR, saved-friend reconnect and online audio/video contract tests remain green.

## Physical release gate

Do not mark Background Ringing PASS until two real Android devices verify:
- foreground, background, screen locked and app swiped away;
- ringtone and accept/decline UI under granted notification/full-screen permissions;
- battery optimization, DND, Wi-Fi/mobile network transitions and OEM behavior documented;
- decline/cancel/expiry cleanup on both devices;
- no automatic answer and no microphone/camera activation before explicit acceptance.

Device powered off, offline, force-stopped by OS policy, or restricted by OEM settings may prevent timely delivery; do not promise unconditional ringing.

## Current status

NOT IMPLEMENTED / NOT VERIFIED. This document is a staging implementation contract only. No Firebase project, credentials, secrets, Worker routes, Android enrollment, or production services are changed by adding this document.
