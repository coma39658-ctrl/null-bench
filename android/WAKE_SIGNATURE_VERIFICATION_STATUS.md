# Incoming-call wake signature gate — staging status

Branch: `ezero-android-incoming-call-ringtone-staging-20261120`

## Implemented in source

- `IncomingCallWakeSignatureVerifier` verifies an ECDSA P-256 / SHA-256 signature over a deterministic UTF-8 canonical message.
- Signed fields are protocol version, opaque call ID, AUDIO/VIDEO mode, expiry, and one-time nonce.
- The FCM service rejects notification-payload messages and checks the server signature before parsing or displaying a CallStyle alert.
- The verifier rejects unknown protocol versions, malformed fields, missing nonce/signature, altered fields, and invalid signatures.
- The verifier tests cover a valid signature, altered fields, tampered signature, unknown version, missing nonce, invalid mode, and the unpinned-key fail-closed path.

## Deliberately not active

- The staging public-key pin is intentionally blank because no independently verified backend signing public key has been supplied by an active sender.
- Therefore the production entry point `verify(data)` currently returns false for every message and no incoming-call alert can be triggered by FCM yet.
- No Firebase configuration, token registration, sender, enrollment endpoint, Worker secret, or deployment was added.
- Existing Android Telecom registration and Accept UI still do not establish or answer a WebRTC call.

## Required next gate

1. Generate the server signing key in an isolated staging environment; keep its private key only in the approved server-side secret store.
2. Publish and independently verify the matching public SPKI fingerprint, then pin only that public key in the Android staging app.
3. Run automated Android tests and a two-device physical test before describing incoming ringing as active.
4. Keep production, public QR/WebRTC code, and the existing calling engine unchanged.

Status: **IMPLEMENTED LOCALLY / KEY NOT PINNED / PUSH NOT ACTIVE / PHYSICAL TEST NOT RUN**.
