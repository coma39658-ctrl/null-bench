# E-ZERO Android ↔ Browser Trusted-Device Bridge Contract

**Date:** 2026-11-20  
**Branch:** `ezero-android-incoming-call-ringtone-staging-20261120`  
**Status:** Design gate; no enrollment endpoint or cross-device trust is active.  
**Production:** Frozen. No production browser identity, WebRTC media engine, Worker, Firebase project, or credentials changed.

## 1. Verified implementation boundary

The Android host now has a local Android Keystore P-256 identity primitive. It generates a non-exportable installation private key and exposes a public SPKI key plus SHA-256 fingerprint. The primitive is local only: it does not enroll, authenticate, register FCM, or contact a service.

The browser staging identity is a separate non-extractable P-256 CryptoKey persisted in same-origin IndexedDB. Its permanent QR is an origin-bound, self-signed public identity envelope. Browser saved-friend state is browser-origin/device scoped.

These are two distinct cryptographic identities. They must not be represented as one shared key, silently copied, or auto-trusted because the user has a Google account or because a QR was scanned.

## 2. Identity roles

- **Browser root candidate:** existing browser P-256 key and fingerprint. It is a candidate approver only after the Android user explicitly verifies the browser identity and the protocol proves possession.
- **Android installation:** Android Keystore P-256 key and fingerprint. The private key never leaves Android Keystore.
- **Friend identity:** a separate peer identity established through the existing signed friend protocol. Do not conflate a user's other device with a friend.
- **FCM token:** mutable delivery address, not an identity or authorization credential.

## 3. Required enrollment sequence

1. Android creates/loads its installation key and displays its public fingerprint. It requests a short-lived, server-issued enrollment challenge only after explicit user action.
2. Challenge binds protocol version, staging audience/origin, Android public key fingerprint, nonce, issued-at, expiry, and server challenge ID. Server signature is verified against a pinned staging verification key.
3. User scans or imports the browser's permanent public identity QR. The Android app verifies its version, canonical origin, SPKI/fingerprint match, and ECDSA proof. The browser identity is displayed for human confirmation; scanning alone is not consent.
4. Android presents the complete enrollment request (Android public key + fingerprint + challenge ID + nonce + expiry) as a QR or short-lived shareable payload. It contains no private key, FCM token, call invite, SDP, or ICE credentials.
5. The already verified browser root explicitly approves the Android public key by signing a domain-separated canonical approval that binds both fingerprints, staging audience, challenge ID, nonce, and expiry.
6. Android verifies the browser signature against the public key the user explicitly verified in step 3. Server verifies the challenge, browser proof, Android proof-of-possession, expiry, nonce, audience, and replay state before saving the device association.
7. Only after enrollment is confirmed may the Android app register/rotate an FCM token over an authenticated TLS endpoint. The server binds the token to the enrolled Android installation and never trusts token-supplied identity claims.
8. Revoke, block, key rotation, challenge expiry, or failed proof invalidates the association and any pending call wake-up.

This is a two-way trust ceremony. Do not claim "one QR" until a reviewed protocol can authenticate the browser approver without weakening trust. A short one-time code may reduce scanning steps, but must preserve the same cryptographic binding and explicit consent.

## 4. Canonical message requirements

Use a versioned, domain-separated canonical format with fixed field order and UTF-8 encoding. Reject duplicate keys, unknown mandatory fields, oversized payloads, invalid base64url, malformed SPKI, wrong curve, fingerprint mismatch, wrong origin/audience, expired challenge, future-issued challenge outside clock tolerance, and reused nonce/challenge ID.

The browser approval signature must cover at least:
- protocol/domain string and version;
- exact staging audience/origin;
- browser root fingerprint;
- Android installation fingerprint and public-key hash;
- server challenge ID and unpredictable nonce;
- issued-at and expiry.

Android proof-of-possession must sign the server challenge and the same enrollment transcript. Signatures are proofs of key control, not proof of a person's civil identity.

## 5. FCM and call-wakeup gates

- FCM sender credentials stay server-side in a staging secret store; never commit service-account JSON or embed sender credentials in the APK.
- Do not register tokens before authenticated device enrollment.
- Wake-up payload is a data-only hint with a strict allowlist and short expiry. Caller alias, profile photo, SDP, ICE, or arbitrary URLs are not trusted from push data.
- Android must fetch and authenticate a signed call invite before showing a trusted caller identity or enabling Accept.
- Accept must consume/validate the invite and hand it to a real call lifecycle. Reject must cancel/revoke the invite server-side. Timeout and replay must fail closed.
- No auto-answer. Full-screen intent and ringtone behavior depend on Android version, notification permission, channel settings, OEM policy, and app process state; never guarantee them without device tests.

## 6. Explicitly unavailable today

- No `google-services.json` is present in this branch.
- No active device enrollment API or server-side browser-root verification exists.
- Android `onNewToken` does not register or upload the token.
- No authenticated FCM sender or device-token registry is wired.
- The current incoming notification is not backed by a verified invite fetch.
- Accept opens the host activity only; it does not establish WebRTC or a Telecom call.
- Reject dismisses the local notification only; it does not cancel a remote invite.
- Android gallery QR decoding and a CameraX live-preview scanner are now implemented in isolated staging; decoded content is still only passed to the existing cryptographic verifier. Physical camera scan behavior has not yet been confirmed on a device.
- Browser approval UI and Android QR rendering for the enrollment request are not implemented.
- No physical-device end-to-end push or locked-screen ringing result is established.

## 7. Acceptance tests before implementation can be called complete

1. Android private key is non-exportable and stable across app restarts; key deletion/rotation is explicit.
2. Browser permanent QR verifies on Android; wrong origin, malformed QR, tampering, unsupported curve/version, fingerprint mismatch, and invalid signature are rejected.
3. Android enrollment request is bound to the exact Android public key, challenge ID, nonce, staging audience, and expiry.
4. Browser approval requires a visible confirmation of Android fingerprint and an explicit user gesture.
5. Android rejects approval from an unverified browser key; server rejects missing/invalid signatures, replay, expiry, wrong audience, and mismatched fingerprints.
6. Both sides persist the same association only after server confirmation; interrupted enrollment leaves no trusted device.
7. Token registration is authenticated, idempotent, rotation-safe, revocable, and never logs token material.
8. A data-only FCM wake-up leads to signed invite retrieval; invalid, replayed, expired, revoked, or unknown invite never presents a trusted caller.
9. Accept, Reject, timeout, duplicate wake-up, app background/force-stop, notification permission denied, and network loss have explicit tested outcomes.
10. Physical-device matrix covers at least two Android devices and a browser root device, with app foreground/background/terminated states and lock-screen settings recorded.

## 8. Safe next implementation order

1. Validate the new Android camera/gallery QR scanner on supported physical devices and retain cryptographic verification as a separate mandatory step.
2. Add strict parsing and verification for the browser permanent QR envelope, with test vectors shared from the existing browser implementation.
3. Implement the signed enrollment transcript and browser approval UI in isolated staging only.
4. Add a staging backend with nonce/replay storage and pinned-key verification; keep all secrets outside source control.
5. Wire authenticated FCM token registration only after enrollment acceptance.
6. Implement signed invite fetch/consume/cancel and real Telecom/WebRTC handoff.
7. Run automated regression tests, then one consolidated physical-device test round.

No stage may bypass the existing browser WebRTC media engine or modify production. No paid service, deployment, Firebase configuration change, or production release is implied by this design contract.


## Native Android Accept → browser WebRTC handoff

The native CallStyle notification's Accept action now passes the verified call ID and media mode to MainActivity. MainActivity opens only a build-configured HTTPS E-ZERO origin. The URL carries an opaque call locator, not caller identity, SDP, credentials or an authorization token. The web handoff module waits for an authenticated incoming-call event with the exact same call ID and only then clicks the existing Accept control. This means the user's native Accept is the one human approval; no unrelated call can be auto-accepted.

The Gradle property `ezeroConnectUrl` defaults to empty. Until an approved staging URL is configured, Accept reports that browser handoff is not configured and does not start a call. This code does not enable FCM delivery or background ringing by itself.
