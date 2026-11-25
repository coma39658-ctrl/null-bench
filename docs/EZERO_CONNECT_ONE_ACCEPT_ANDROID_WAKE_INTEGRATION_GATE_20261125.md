# E-ZERO Connect: one-accept pairing + Android incoming-call integration gate

Status: STAGING DESIGN / NO IMPLEMENTATION CLAIM. Based on the saved-friend call controller candidate and the separate Android incoming-call host scaffold inspected on 2026-11-25. This document does not configure Firebase, create secrets, deploy a Worker, activate public calling, or change production.

## User journey (required)

### First-time friend connection
1. The initiating phone creates one short-lived, single-use, signed E-ZERO invitation bound to the initiating device fingerprint, intended origin, session/call ID, nonce and expiry.
2. The recipient scans/opens it and sees one clear incoming request with **Accept / Decline**. There is no second Save Friend action.
3. Only the recipient's explicit Accept authorizes the first call. The recipient's device verifies the signed invitation and peer identity before sending its signed answer.
4. The initiator verifies that answer against the exact pending invitation and remote device fingerprint.
5. Both devices persist the same verified friend relationship idempotently, using their own local encrypted contact stores. Each side saves only after it has its required cryptographic proof; a mere QR scan, WebSocket connection, `peer-ready`, display name, profile photo, FCM token, or unsigned event never saves a friend.
6. The first audio/video call proceeds through the existing WebRTC media controller. Microphone/camera access is requested only after recipient Accept and only for the selected mode. Audio must not request camera.
7. Any failure before both proof checks leaves no trusted contact on either side and returns a retryable status.

### Subsequent calls
- A saved, mutually verified friend is selected from the local friends list.
- Audio/video call starts directly through the trusted-friend session; no repeat QR and no second friend approval.
- Every call uses a fresh opaque call ID, short expiry, matching relationship ID and authenticated remote fingerprint.
- Incoming calls still require recipient Accept before media starts.

## Integration boundaries discovered

### Browser call candidate
- `js/ezero_connect_trusted_friend_call_controller_v1.mjs` and `js/ezero_connect_trusted_friend_session_v1.mjs` provide call orchestration for an already-authenticated, mutually trusted saved friend.
- The controller checks the trusted relationship and remote fingerprint, binds invite/accept/decline/hangup to a call ID, expires unanswered calls, and delays media until acceptance.
- This candidate does not implement first-time QR pairing or bilateral contact persistence. It must be reused, not replaced, for subsequent calls.

### Existing pairing candidate
- The earlier `ezero_connect_pairing_v2` candidate saves on `peer-ready` without a recipient Accept. That behavior is not suitable for the required journey and must not be wired into this release path.
- The profile-first verified-friend candidate demonstrates the intended consent boundary: recipient Accept, signed offer/answer proof, and local friend persistence. Its old branch/page is a reference only; it is not assumed to be integrated with the current clean call controller.
- Integration must use one canonical accepted-invitation state machine and must not combine competing legacy pairing handlers.

### Android incoming-call host
- Android scaffold has a CallStyle notification, ringtone channel, Accept/Reject actions and strict incoming payload validator.
- `IncomingCallMessagingService.onNewToken` is currently a TODO; no authenticated token registration endpoint is wired.
- Firebase configuration is absent; FCM delivery and sender are not active.
- Android Accept currently opens MainActivity with a pending-call marker; it does not consume a signed invite or connect WebRTC.
- Telecom registration is capability groundwork only. It does not create or answer a call.
- Therefore background/closed-app/locked-screen ringing is NOT ACTIVE / NOT VERIFIED.

## Required integrated protocol

1. **Invitation creation:** server/client generates an unpredictable 32-byte-or-stronger nonce, fresh opaque invitation ID, exact recipient/session binding and a maximum 90-second first-pair expiry. The signed invitation is purpose-bound to first-time pairing and cannot be reused as a wake token or later call.
2. **Recipient acceptance:** Accept is a user gesture tied to the exact invitation ID and verified inviter fingerprint. Decline, expiry, cancellation, wrong origin, wrong role, replay or fingerprint mismatch consumes/rejects the invitation.
3. **Proof exchange:** recipient signs an acceptance statement over canonical invitation ID, nonce, both device fingerprints, roles, origin and expiry. The initiator verifies it. Both sides verify the matching signed offer/answer proof before local persistence. Duplicate delivery is idempotent.
4. **Bilateral persistence:** each side writes one TRUSTED contact record only after its own verified proof and exact session match. The record contains the remote public identity/fingerprint and locally chosen alias/profile metadata. Never persist caller identity from push fields.
5. **Call handoff:** the accepted first-pair session hands the same authenticated peer relationship to the existing call controller. Audio/video media starts only after explicit recipient acceptance. No separate Save Friend click.
6. **Later direct calls:** trusted-friend session authenticates the persisted relationship and uses the existing call controller without QR.
7. **Android wake:** after an already trusted caller passes backend authorization, the backend sends a data-only, short-lived, signed FCM wake hint to an active root-approved Android installation. The app verifies the pinned staging signature, then fetches/consumes the matching signed invite over an authenticated channel. FCM is not identity proof and contains no alias, SDP, message, media or credentials.
8. **Android Accept/Reject:** native Accept revalidates the invite and routes it into the same trusted-friend call controller; Reject/cancel/timeout/revocation dismisses the alert and invalidates the invite. No auto-answer.
9. **Failure behavior:** no silent friend save, no auto-answer, no fallback to untrusted identity, and no false “connected” status. Show concise retryable error and retain any already verified trusted friend records.

## Deterministic test matrix (must be added before implementation is declared integrated)

### First pairing
- One recipient Accept is sufficient; no second Save Friend or sender-side approval button.
- Before Accept: no mic/camera request and no trusted contact saved.
- After valid Accept and matching signed proof: both sides save exactly one contact and the first selected audio/video call can proceed.
- Duplicate Accept, answer, peer-ready and relay events do not create duplicate records.
- QR scan without Accept, forged signature, wrong fingerprint, wrong role/origin, wrong invite ID, expired invite, replayed nonce and blocked peer all fail closed.
- Storage failure on either side is visible; do not report bilateral save until both sides confirm.
- Profile name/photo is displayed only after signed identity and profile transport are bound to the same fingerprint; never trust push alias.

### Saved-friend calls
- Direct audio and video redial from saved-friend list without QR.
- Wrong relationship ID, call ID or remote fingerprint cannot accept, decline, hang up or start media.
- Caller media starts only after matching remote acceptance.
- Recipient media starts only after its explicit Accept.
- Audio mode never requests camera; video camera opens only after acceptance.
- Expiry, reject, caller cancel, hangup, network loss and repeated calls clean up state.

### Android background wake
- Token refresh is authenticated to an active root-approved Android installation; tokens are never logged.
- Unapproved/revoked installation, unknown sender key, bad signature, altered payload, expired wake, duplicate nonce/call ID and rate-limit overflow do not show an actionable alert.
- Valid wake displays CallStyle with ringtone and Accept/Decline while foreground, background and screen locked where Android policy permits.
- Accept opens the exact signed invite; Reject/cancel/timeout stops ringtone and consumes the invite.
- Android 13+ notification permission, Android 14+ full-screen-intent eligibility, muted channel, battery optimization, network loss, app swiped away and force-stop behavior are explicitly recorded.
- Physical two-phone tests record device model, Android version, build SHA, permissions, network state and observed outcome.

## Release gates and evidence labels

Keep the following separate:
- **CI PASS:** deterministic source/unit/browser tests only.
- **Staging preview:** exact preview origin and commit SHA verified.
- **Physical call PASS:** two real phones complete authenticated audio/video in foreground.
- **Background ring PASS:** real FCM delivery, audible ringtone and Accept/Decline verified with app backgrounded and screen locked.
- **Production release:** requires separate explicit owner approval; this draft does not authorize merge or deployment.

No Firebase project setting, Google services configuration, service-account key, Worker secret, Render workspace, billing setting, production Worker, public site, or release signing is changed by this staging design.
