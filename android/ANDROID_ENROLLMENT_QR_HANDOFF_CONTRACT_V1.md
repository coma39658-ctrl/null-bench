# E-ZERO Android enrollment QR handoff contract V1

Status: DESIGN + STATIC QA ONLY. No Android QR enrollment UI, browser QR approval UI, API client, Worker deployment, Firebase/FCM sender, or device enrollment is active.

## Purpose

Transfer one short-lived enrollment challenge between the Android installation and the already-authorized browser root without copying private keys, sharing account credentials, or weakening the existing permanent friend QR format.

This is a separate protocol from the permanent friend QR. Never parse an enrollment QR as a friend identity QR, and never save an enrollment device as a trusted friend.

## Two-scan ceremony

1. Android user taps **Prepare secure enrollment**. Android creates/loads its non-exportable P-256 Android Keystore key, sends public SPKI to the isolated enrollment challenge endpoint, receives a 90-second challenge, and signs the exact challenge bytes with its private key.
2. Android displays a temporary **Android enrollment request QR**. It contains protocol version, challenge fields, device proof signature, and the public device fingerprint. It contains no private key, FCM token, phone number, profile name, friend list, call invite, or reusable bearer credential.
3. The already-authenticated browser root scans this request QR using a dedicated enrollment scanner (not the friend QR scanner). It validates version, audience, expiry, field formats, and the exact challenge binding. It shows the device fingerprint and expiry to the human.
4. Browser root user explicitly taps **Approve this Android device**. Only then does the browser sign the canonical root approval using its existing non-exportable root private key.
5. Browser displays a short-lived **root approval response QR**. Android scans it with a dedicated enrollment approval scanner, checks that challenge ID, device fingerprint, nonce, audience, expiry, and root fingerprint match the pending request, then submits the completion request to the isolated Worker.
6. Backend verifies the independently pre-registered root, device proof, root approval signature, exact challenge binding, expiry, audience, and one-time challenge consumption. Only then may it mark the installation enrolled.
7. Root can later list or revoke devices. Revocation invalidates the device binding and must block future token registration/delivery.

## QR payload contracts

Request QR is a JSON object with exactly these fields:
- `v`: integer `1`
- `type`: `EZERO_ANDROID_ENROLL_REQUEST_V1`
- `challenge`: object with exactly `challenge_id`, `device_fp`, `nonce`, `audience`, `expires_at`
- `device_proof`: Base64URL, no padding, exactly 64 decoded bytes (P-256 IEEE-P1363)
- `device_spki`: Base64URL DER SPKI, public key only

Response QR is a JSON object with exactly these fields:
- `v`: integer `1`
- `type`: `EZERO_ANDROID_ROOT_APPROVAL_RESPONSE_V1`
- `root_fp`: lowercase SHA-256 hex of the already-authorized browser root SPKI
- `device_fp`, `challenge_id`, `nonce`, `audience`, `expires_at`: exact values copied from the request challenge
- `root_approval`: Base64URL, no padding, exactly 64 decoded bytes (P-256 IEEE-P1363)

Both QR payloads must be <= 2,400 UTF-8 bytes; reject larger payloads rather than truncating or splitting silently. Strict JSON parsing: reject duplicate keys, unknown fields, missing fields, wrong types, invalid Base64URL, malformed SPKI, invalid fingerprints, CR/LF injection, and non-canonical encodings. No URL or network location is accepted from QR content.

## Trust and replay rules

- Enrollment QR is not a friend QR, and successful QR parsing is not successful enrollment.
- Browser root must already be authenticated and independently authorized in the backend root registry. A self-signed key or a QR-supplied root key is never sufficient.
- The browser must display the exact device fingerprint before approval; approval requires an explicit user action. No auto-approval.
- Challenge lifetime is at most 90 seconds and is single-use. Expired, replayed, mismatched, or revoked requests fail closed.
- Root approval binds the exact root, device, challenge ID, nonce, audience, and expiry.
- Android Keystore private key and browser IndexedDB CryptoKey private key never leave their respective secure stores.
- QR content must not contain FCM tokens, aliases, phone numbers, profile photos, friend records, call IDs, SDP, messages, media, or secret bootstrap values.
- Do not log QR payloads or signatures. Logs may contain a short event code and non-sensitive result only.
- The existing permanent friend QR, saved-friend list, call signaling, and public site remain unchanged.

## Release blockers

Before UI/API implementation:
1. Complete an independently verified root bootstrap ceremony; the candidate's out-of-band bootstrap secret is not a user-ready ceremony.
2. Add strict QR codec/parser tests including duplicate JSON keys, oversize payload, wrong type, unknown fields, expired challenge, and altered binding.
3. Implement browser and Android scanners as separate enrollment-only flows with explicit human approval.
4. Add HTTPS client with pinned exact origin and no redirects; use bounded request/response sizes and timeouts.
5. Add end-to-end tests against a local Worker test harness before any separately authorized staging deployment.
6. Keep FCM token registration and incoming-call push disabled until enrollment, root revoke, token lifecycle, and wake-signature gates pass.

This document does not authorize deployment, production changes, Firebase project deletion, FCM activation, or a new APK release.
