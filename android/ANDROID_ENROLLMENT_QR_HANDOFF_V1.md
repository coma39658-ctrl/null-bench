# E-ZERO Android enrollment handoff V1 — QR transport contract

Status: design-only staging contract. No QR enrollment exchange, network client, endpoint deployment, root bootstrap, Firebase/FCM integration, or production change is active.

## Goal

Move a short-lived Android enrollment challenge to the already-authorized browser root for explicit approval, then return the signed approval to the same Android installation. The handoff must not expose either private key and must not create a trusted friend relationship.

## Actors and trust

- Android installation: owns a non-exportable P-256 key in Android Keystore.
- Browser root: owns the existing E-ZERO browser P-256 identity in IndexedDB; signing is allowed only after a clear user approval action.
- Enrollment Worker candidate: validates device proof, root registry membership, signature, audience, expiry, and one-use challenge.
- QR is an untrusted transport only. Scanning a QR never by itself enrolls, approves, or trusts a device.

## Proposed two-QR ceremony

1. Android requests a server challenge for its SPKI. The server recomputes the device fingerprint and returns a challenge bound to that key, nonce, audience, and <=90-second expiry.
2. Android signs the canonical challenge using its Keystore private key and displays a QR containing a versioned, size-bounded enrollment request. It contains public SPKI, device fingerprint, challenge fields, and Android proof only.
3. Browser root scans the QR. Before signing, it verifies the challenge origin/audience, expiry, device fingerprint consistency, and Android proof-of-possession locally or through the Worker verification endpoint. The UI displays the exact device fingerprint and asks the root owner to approve explicitly.
4. Browser signs the exact root-approval canonical bytes using its existing non-exportable root key. It displays a second QR containing the signed approval and the original challenge binding.
5. Android scans the response QR and submits the approval to the enrollment endpoint. The Worker verifies the root is already independently registered, validates both proofs, atomically consumes the challenge, and records the device binding.
6. Android shows ENROLLED only after a verified server response. Until then it must show KEY_CREATED_NOT_ENROLLED or APPROVAL_PENDING.

## QR payload rules

- Use a versioned envelope with a fixed type: EZERO_ANDROID_ENROLL_REQUEST_V1 or EZERO_ANDROID_ENROLL_APPROVAL_V1.
- Maximum decoded payload: 4 KiB. Reject unknown fields, duplicate keys, invalid UTF-8, oversized strings, invalid base64url, and unsupported versions.
- Encode only public keys, fingerprints, challenge metadata, and signatures. Never include private keys, FCM tokens, browser session cookies, bearer secrets, caller aliases, contact names, invite URLs, SDP, chat messages, photos, or media.
- QR contents are public and may be photographed. Confidentiality is not a security property of this exchange; integrity, audience binding, expiry, proof-of-possession, and one-use replay protection are.
- QR may be displayed or scanned from camera/gallery, but both paths must invoke the same strict parser and verifier.
- Never trust a fingerprint supplied by the QR; recompute it from SPKI and compare all copies.
- The root approval must bind the exact device fingerprint, challenge ID, nonce, audience, and expiry. A modified request requires a fresh challenge.
- Challenges expire after 90 seconds and are consumed exactly once. A failed or cancelled ceremony must request a new challenge; no retry with a consumed challenge.
- No QR payload may be accepted as a friend-list entry or call identity.

## Browser root UI requirements

- Show the device fingerprint in a human-readable grouped format and allow copy.
- Show origin, expiry countdown, and clear warning that this adds an Android installation to the account's trusted-device list, not to friends.
- Require a separate explicit Approve action; scanning alone must not sign.
- If the root identity is absent, invalid, mismatched, expired, or not independently registered by the backend, fail closed.
- Do not offer root bootstrap from the enrolling Android QR. Root provisioning is a separate audited ceremony requiring out-of-band fingerprint verification and secret rotation.

## Android UI requirements

- Creating a key is a user-initiated action; private key remains non-exportable.
- Clearly distinguish key created, request QR ready, approval scanned, enrollment submitted, and server-confirmed enrolled.
- Never show connected, trusted, or enrolled before server confirmation.
- Cancellation, app restart, timeout, network loss, malformed QR, root rejection, and duplicate scan must leave the device unenrolled.
- Existing friend QR, saved friends, calling, and production identity stores must remain untouched.

## Required tests before implementation can be enabled

- Cross-platform golden vectors: Android/JCA -> P1363, browser WebCrypto -> P1363, Worker WebCrypto verification.
- Request and approval QR round-trip, camera and gallery parser parity, malformed/oversized/duplicate-field rejection.
- Wrong origin, wrong root, wrong device, changed nonce, changed expiry, expired challenge, replay, concurrent completion, revoked root, and unregistered root rejection.
- Verify scan-only never invokes root signing; only explicit Approve can sign.
- Verify no QR field can mutate friend list, call inbox, or existing browser identity.
- End-to-end two physical Android/browser devices before any APK is distributed.

## Release boundary

This document does not authorize deployment. The enrollment Worker remains an isolated candidate; its root registry still needs a separately reviewed bootstrap ceremony. No FCM token registration, push sender, background ringing, or call media is implemented by this handoff design.