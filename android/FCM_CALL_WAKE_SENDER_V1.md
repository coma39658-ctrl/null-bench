# E-ZERO Android FCM call-wake sender V1

Status: **ISOLATED STAGING FOUNDATION — NOT ROUTED, NOT DEPLOYED, NOT CREDENTIALLED**

The module `signaling/cloudflare/src/fcm_call_wake_sender_v1.js` implements the low-level FCM HTTP v1 sender and the server-signed wake payload. It is deliberately not imported by either active Worker entrypoint and exposes no public HTTP route.

## Implemented

- Creates a versioned, 120-second-bounded ECDSA P-256/SHA-256 signed wake.
- Uses the exact LF-delimited canonical bytes in `FCM_WAKE_SENDER_INTEROPERABILITY_CONTRACT.md`.
- Converts WebCrypto's P1363 signature to ASN.1 DER for Android `SHA256withECDSA` verification.
- Exchanges a service-account RS256 JWT assertion for a short-lived Google OAuth access token.
- Sends an FCM HTTP v1 data-only message with Android HIGH priority and a TTL no longer than the signed wake expiry.
- Restricts message data to `wake_v`, `call_id`, `mode`, `expires_at`, `nonce`, and `server_sig`.
- Does not log, return, or persist FCM tokens or credentials.

## Required isolated Worker secrets

Provision only in a dedicated staging secret store; never commit them or include them in an APK:

- `FCM_SERVICE_ACCOUNT_JSON`: Firebase service-account JSON with the Firebase Cloud Messaging scope enabled.
- `CALL_WAKE_SIGNING_PRIVATE_KEY_PKCS8_BASE64URL`: Base64URL-encoded PKCS#8 P-256 private key.

The corresponding public SPKI must be independently fingerprint-verified and pinned in Android before a signed wake can pass client verification. No private key belongs in Android.

## Mandatory authorization boundary before integration

This helper is only a transport primitive. A caller MUST NOT invoke it until a separate trusted call-invite path has:

1. Verified the caller's signed invite and authenticated caller identity.
2. Verified the recipient fingerprint maps to an active root-approved Android installation.
3. Verified the saved-friend relationship and that the recipient has not blocked/revoked the caller.
4. Atomically enforced replay protection, call-ID uniqueness, cooldowns, and per-caller/per-device rate limits.
5. Persisted a short-lived invite retrievable only by the enrolled recipient device.

The current browser inbox is foreground-WebSocket-only. The Android enrollment record links an Android installation to a root fingerprint, but the native host does not yet have a synced saved-friend trust store or authenticated invite-fetch/Accept-to-WebRTC bridge. Therefore this sender foundation is intentionally not connected to a public route and cannot currently wake a phone.

## Remaining gates

- Firebase project/runtime configuration and dedicated service-account permission.
- Staging secrets and isolated Worker deployment.
- Reviewed public-key pin ceremony.
- Authenticated invite storage/fetch bound to the Android installation and local saved-friend trust.
- Android signature verification followed by invite authentication before showing a ringing alert.
- Accept/Reject/cancel/timeout handoff to the existing WebRTC engine.
- Two-device physical tests: foreground, background, locked screen, app swiped away, force-stop, notification/full-screen permission and OEM battery behavior.

CI tests validate canonical bytes, ECDSA DER interoperability, OAuth JWT construction, data-only FCM payload shape, and fail-closed secret/input handling. They do not prove live Firebase delivery, audible ringing, lock-screen presentation, or a connected WebRTC call.

**Release status remains NOT ACTIVE / NOT VERIFIED.** No production worker, public website, or existing calling engine is changed by this branch.
