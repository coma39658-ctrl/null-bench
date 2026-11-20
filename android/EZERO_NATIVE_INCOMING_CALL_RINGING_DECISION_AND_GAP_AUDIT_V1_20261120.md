# E-ZERO Native Incoming Call & Ringing — Decision and Gap Audit V1

Date: 2026-11-20
Status: STAGING DESIGN / READINESS AUDIT ONLY
Branch: `ezero-native-incoming-call-readiness-audit-20261120`

## Product decision (approved by owner in conversation)

E-ZERO incoming calls should feel like a native Android phone call, not a generic message notification.

Required experience:
- Native Android incoming-call presentation using Android Telecom / CallStyle where supported.
- Distinct audio/video call presentation, trusted caller name and locally stored profile photo only after invite identity verification.
- Audible ringtone and vibration governed by Android channel, user sound/vibration settings, DND, OEM policy and permissions.
- Accept and Decline controls; explicit user action only; never auto-answer.
- Lock-screen/full-screen presentation only where Android policy and user permission allow it.
- Stop ringing immediately on accept, decline, caller cancellation, timeout, or verified invite revocation.
- Missed-call record/notification after expiry, without duplicate alerts for the same call.
- A wake-up push is only a hint; it is not proof of caller identity or a valid call.
- App swiped away and app force-stopped are different states; no unconditional delivery promise when Android/FCM/OEM restrictions prevent wake-up. A fully powered-off phone cannot ring.

## Current source audit

Existing staging source already contains:
- `IncomingCallNotifications.kt`: Android CallStyle notification, ringtone channel, vibration, timeout, and conditional full-screen intent.
- `CallActionReceiver.kt`: Accept/Reject notification actions; Accept opens MainActivity but does not yet accept a real WebRTC invite.
- `IncomingCallMessagingService.kt`: data-only FCM receiver; rejects notification payloads and requires a valid signed wake-up.
- `IncomingCallPayload.kt`: short-lived AUDIO/VIDEO payload shape; caller alias is not trusted from push.
- `IncomingCallWakeSignatureVerifier.kt`: canonical P-256 signature verifier, but pinned staging public key is deliberately empty, so verification fails closed.
- `AndroidTelecomRegistration.kt`: capability registration only; it does not add real incoming Telecom calls.
- Android manifest includes notification, vibration, wake-lock, full-screen-intent and Telecom-related permissions, plus FCM service/receiver declarations.

## Blocking gaps — do not claim incoming calling is active

1. No reviewed staging sender public key is pinned; signed wake verification correctly fails closed.
2. No Firebase project configuration is present in the audited tree; token refresh is not registered with a backend.
3. No authenticated Android installation enrollment/owner approval flow is connected to the backend.
4. No sender endpoint or server-side FCM delivery path is deployed or authorized.
5. Accept currently opens the app only; it does not fetch/consume a signed invite or hand off to the frozen WebRTC call engine.
6. Reject/cancel/timeout do not yet invalidate a pending invite server-side.
7. Trusted caller profile/photo resolution and missed-call deduplication need integration after invite verification.
8. Android 14+ full-screen intent policy, Android 13+ notification permission, channel settings, DND, battery restrictions and OEM background behavior require physical-device evidence.

## Safe implementation sequence

A. Preserve the existing audio/video/WebRTC baseline unchanged.
B. Add isolated unit tests for notification payload validation, canonical signature interoperability, expiry, duplicate wake suppression, and action routing.
C. Complete root-approved Android installation enrollment using a non-exportable Android Keystore key; do not export browser or Android private keys.
D. Create an isolated staging-only sender with private signing key stored only in an approved secret store; independently verify the public-key fingerprint before pinning.
E. Add server-side replay, rate, saved-friend trust, expiry, device-revocation and cancellation checks.
F. Connect Accept to authenticated invite consumption and then the existing WebRTC invitation path; no new media engine.
G. Test on at least two physical Android phones: foreground, background, screen locked, app swiped away, force-stop, notification denied, muted channel, DND, battery optimization, network loss, cancel, reject, accept and timeout.
H. Only after all evidence is reviewed, request a separate release decision.

## Release and privacy guard

- This branch is audit/design preparation only.
- No Firebase project mutation, secret creation, Worker route, namespace binding, deployment, public website change, app-store release, or production change.
- Never log FCM tokens, private keys, invite URLs, SDP, ICE, media, message content or call history.
- No background microphone/camera use and no auto-answer.
- Do not connect the binding ledger or push path to browser QR, contacts, calls or media until the relevant gates and separate integration approval pass.

## Acceptance vocabulary

- `PASS`: the named automated or physical test ran and passed.
- `FAIL`: the named test ran and failed.
- `PARTIAL`: some required cases passed, but acceptance is incomplete.
- `UNKNOWN`: not tested or evidence unavailable.
- CI green is not physical-device ringing proof.
- Telecom registration is not proof of incoming call integration.
- Notification display is not proof of successful call connection.

Owner's product choice: **native incoming-call screen + real ringtone/vibration + explicit accept/decline + missed-call handling**, implemented with Android policy compliance and no regression to the frozen calling engine.
