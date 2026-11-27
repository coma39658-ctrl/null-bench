# E-ZERO Android enrollment Worker candidate V1

Status: **isolated code candidate only — NOT DEPLOYED and NOT wired to the active Worker**.

## Files and architecture
- `signaling/cloudflare/src/android_enrollment_candidate_v1.js`: root pre-registration, Android challenge, signed device proof, signed Root approval, active enrollment binding, signed Root device listing/revocation, and proof-bound FCM token registration.
- `signaling/cloudflare/wrangler.android-enrollment-candidate-v1.jsonc`: separate Worker configuration and its own Durable Object class.
- `ezero-android-root-approval-staging.html` and `js/ezero_android_root_approval_ui_v1.js`: isolated browser page that verifies Android's request QR and requires an explicit approval click before signing with the existing browser Root key.
- Android client: Keystore-backed device identity, request QR, server enrollment client, and FCM token registration after confirmed enrollment.
- Existing active `wrangler.jsonc`, live signaling Worker, friend store, Render preview, Firebase project and production APK are unchanged.

## Trust anchor and bootstrap
A Root can only be added through `POST /v1/admin/root-register` using the out-of-band `ROOT_BOOTSTRAP_SECRET`. This is an administrative bootstrap, not self-registration. The secret must be provisioned only through the platform secret manager and must never enter source control, browser code, logs, an APK, QR payloads, or chat. No secret is present in this repository and no Root has been registered.

The bootstrap ceremony remains an operational security dependency: the operator must independently confirm the existing Root SPKI fingerprint through a separate trusted channel and define secret rotation, recovery and audit procedure. Do not infer Root authority from an email address.

## Implemented candidate routes
- `POST /v1/admin/root-register`: secret-gated registration of a P-256 Root SPKI.
- `POST /v1/android/enrollment/challenge`: validate Android P-256 SPKI, recompute SHA-256 fingerprint and issue a 90-second challenge.
- `POST /v1/android/enrollment/complete`: verify Android proof-of-possession and Root signature; atomically consume the challenge and persist the active device binding.
- `POST /v1/admin/root/devices/list` and `/v1/admin/root/devices/revoke`: require short-lived P-256 Root-signed commands with nonce, expiry, command ID and atomic replay protection. Revocation clears the stored FCM token.
- `POST /v1/android/device-token`: accept an FCM token only from an active enrolled device, signed by that device key over the token digest and a short-lived command. The raw token is stored server-side and never returned or logged.

## Validation status
- Workers Runtime: 19/19 tests passed for the route allowlist, enrollment, Root device lifecycle, FCM token registration, replay rejection, forged-signature rejection, revoked-device rejection, bounded cleanup and rate limits.
- Browser Root approval module: syntax and strict QR/explicit-approval tests passed.
- Existing web calling and QR contract checks passed.
- Android Worker client QA and clean-shell checks must pass on the latest commit before this candidate is considered build-verified.
- These are automated tests, not live deployment or physical Android proof.

## Remaining release blockers
1. Approve and securely provision the administrative bootstrap secret; independently verify the existing Root fingerprint.
2. Run a live same-origin browser test of the Root approval page and review the Root approval ceremony.
3. Complete Root revocation, Root key rotation/recovery and independent security review.
4. Review Android Keystore token-registration retry/refresh behavior and confirm the endpoint against an isolated deployed Worker.
5. Add Firebase Admin sender, call-wake authorization and signed data-only FCM delivery. Token registration alone does not send a push.
6. Complete quota, abuse-control, retention and audit-policy review.
7. Implement the authenticated native Accept-to-WebRTC handoff and test the full call path.

The candidate still has no FCM sender, push delivery, call-wake route, Root revocation/rotation/recovery, or native Accept-to-WebRTC handoff. It does not make incoming calls ring. The candidate remains isolated and not deployed; no Root or FCM token has been registered and no push has been sent. Never point the active Worker at this module without separate review and explicit deployment approval.

## Canonical cryptography
UTF-8, LF-only, fixed field order and final LF. ECDSA P-256/SHA-256 signatures use 64-byte IEEE-P1363 (r||s) values for WebCrypto verification. The challenge is 90 seconds and binds the exact device key, nonce, challenge ID and fixed E-ZERO audience. Root approval binds Root fingerprint, device fingerprint, challenge ID, nonce, audience and expiry.
