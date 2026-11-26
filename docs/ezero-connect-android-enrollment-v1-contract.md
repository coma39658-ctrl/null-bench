# E-ZERO Connect — Android Installation Enrollment V1

Status: DESIGN CONTRACT — NOT IMPLEMENTED. PR #221 staging only.

## Purpose and compatibility

This contract defines how an Android installation may be approved by an already-existing E-ZERO browser identity. It does not activate Firebase, create secrets, add Worker routes, change the live QR flow, or modify the WebRTC engine.

Keep the two keys separate:
- **Approver identity:** the existing non-exportable browser-origin ECDSA P-256 key in IndexedDB. It proves that the person controlling that browser identity explicitly approved this enrollment. It is not a global account identity or proof of a Google account.
- **Android installation identity:** a separate non-exportable ECDSA P-256 key held by Android Keystore. It proves possession by one Android app installation. It is not trusted until enrollment completes.

A browser storage reset or loss of the approver key requires a new explicit trust ceremony. Never silently migrate or copy private keys between browser and Android.

## Mandatory approver trust anchor (implementation blocker)

The browser approval signature is not self-authenticating. A public key included in the same client submission cannot establish that it belongs to the existing E-ZERO owner identity. The verifier must receive `trustedApproverPublicKeySpki` from a server-controlled trust anchor; it must never take that value from the enrollment request, QR payload, or an untrusted browser header.

Before enabling either endpoint, the owner must explicitly provision the exact public SPKI of the already-verified E-ZERO browser identity into the isolated staging Worker configuration (for example, a non-secret `APPROVER_PUBLIC_KEY_SPKI` variable plus its expected fingerprint). The fingerprint must be checked against the existing trusted browser identity through a separate owner-controlled confirmation step. Do not guess, generate a replacement, or silently trust the first key that calls the endpoint. Keep the private key in the browser's existing protected origin storage; it must never be uploaded or copied to the Worker.

The Worker must reject enrollment if this pinned key is absent, malformed, or its fingerprint does not match the configured fingerprint. Key rotation requires an explicit old-key-signed rotation statement or a separately documented owner recovery ceremony; a new browser key cannot replace the root merely by claiming the same profile name. Until this trust anchor is provisioned and independently checked, the enrollment endpoints remain disabled.

## Ceremony (90-second one-time challenge)

1. Android generates or loads its Keystore P-256 key pair. It sends the public SPKI and fingerprint to the staging enrollment-challenge endpoint over HTTPS. It does not send its private key or FCM token.
2. The backend creates a cryptographically random challenge ID and nonce, stores them as unused, and returns a signed-by-transport (HTTPS) challenge record containing:
   - protocol/version and exact staging origin/audience;
   - challenge ID, nonce, Android public-key SPKI and SHA-256 fingerprint;
   - server issue time and expiry (maximum 90 seconds).
3. Android signs the domain-separated canonical challenge bytes with its Keystore key. The app displays a QR containing only the challenge reference, public key, fingerprint, nonce, audience and expiry. The QR is not itself approval.
4. The owner opens the existing E-ZERO browser identity and scans the QR. The browser fetches the authoritative challenge over HTTPS and compares every displayed field. It shows the Android fingerprint and asks for a clear Approve action.
5. After the user approves, the browser signs an approval statement binding the exact challenge ID, nonce, Android SPKI/fingerprint, approver fingerprint, origin/audience, issue time and expiry.
6. Android submits both signatures to the completion endpoint. The backend verifies Android proof-of-possession, browser approval, key/fingerprint matches, origin/audience, challenge expiry and one-time nonce. It atomically consumes the challenge and creates the root-approver-to-installation binding.
7. The browser and Android show the same short fingerprint confirmation. Only after successful completion may the installation request FCM token registration.

## Canonical signing and encoding

- Algorithm: ECDSA P-256 with SHA-256.
- Canonical payload: UTF-8 JSON using the same deterministic sorted-key canonicalization already used by E-ZERO Connect (recursive object keys sorted lexicographically; arrays retain order; no insignificant whitespace).
- Domain separation is mandatory. Prefix canonical bytes with the exact ASCII protocol label and LF:
  - Android proof: `EZERO_ANDROID_ENROLL_PROOF_V1\n`
  - Browser approval: `EZERO_ANDROID_ENROLL_APPROVAL_V1\n`
- Signatures transmitted to the Worker use 64-byte IEEE P1363 (r || s), Base64URL without padding. Android's JCA `SHA256withECDSA` DER output must be converted to/from P1363 at the Android boundary; never ambiguously accept either format.
- SPKI is Base64URL without padding. Fingerprint is SHA-256(SPKI), uppercase hexadecimal bytes separated by colons.
- Reject unknown protocol versions, duplicate JSON keys, non-canonical payloads, wrong origin/audience, malformed keys, key/fingerprint mismatch, future issue times outside a small documented skew, expired challenges and reused challenge IDs/nonces.

## Proposed endpoints (not live)

- `POST /v1/android/enrollment/challenge`
- `POST /v1/android/enrollment/complete`
- `PUT /v1/android/devices/current/push-token`
- `DELETE /v1/android/devices/current`

The challenge and completion endpoints must be implemented as a dedicated capability, not as extra fields on the existing WebSocket call relay. Durable Object storage must serialize challenge consumption and installation creation so a challenge can succeed at most once.

## Installation record and token handling

A server-side record binds:
- approver public key/fingerprint;
- Android installation public key/fingerprint;
- opaque installation ID;
- status, creation time, last token-refresh time and revocation time;
- FCM token, stored server-side only and never returned to clients.

Token registration and rotation require a fresh server challenge signed by the enrolled Android key. A token alone never authenticates an installation. Revocation by the approver disables delivery immediately. Never log FCM tokens, signatures containing sensitive challenge material, private keys or authorization secrets. Secrets remain in the staging secret store, never Git, browser JavaScript or APK.

## Failure and recovery behavior

- Any failed signature, mismatched fingerprint, expired/replayed challenge, revoked approver, wrong audience or storage error fails closed and creates no trusted device.
- A retry uses a newly issued challenge; do not weaken expiry or replay checks to make a stale QR work.
- Duplicate completion requests return the already-created result only when the exact same challenge and both exact proofs are presented; they must not create a second installation.
- Provide a simple revoke-and-re-enroll path. Do not silently replace an existing Android key or FCM token for a different installation.

## Required tests before any live endpoint

1. Valid Android proof + valid browser approval enrolls exactly one installation.
2. Missing browser approval, wrong approver key, wrong Android key or changed fingerprint is rejected.
3. Challenge nonce/ID replay and expiry are rejected, including concurrent completion attempts.
4. Wrong origin/audience, altered canonical bytes, DER supplied where P1363 is required, malformed SPKI and unknown version are rejected.
5. Browser storage loss does not silently transfer authority to a new key.
6. Token registration requires an enrolled installation signature; token rotation replaces only that installation's token.
7. Revocation blocks token refresh and future wake delivery.
8. No secret, private key or FCM token appears in logs, responses, browser storage, Git or APK.
9. Existing QR pairing, saved-friend reconnect and online audio/video regression tests remain unchanged and green.

## Release guard

This is a design contract, not an implementation or deployment. Until the authenticated endpoints, atomic durable storage, FCM sender, pinned server signing key, authenticated invite fetch/consume, and two-physical-device background acceptance tests all pass, background ringing remains **NOT ACTIVE / NOT VERIFIED**. Push remains a wake hint only; no auto-answer and no microphone/camera activation before explicit user acceptance.