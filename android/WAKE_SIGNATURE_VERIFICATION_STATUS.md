# Incoming-call wake signature gate — staging status

Branch: `ezero-android-fcm-replay-guard-staging-20261125`

## Implemented in source

- `IncomingCallWakeSignatureVerifier` verifies an ECDSA P-256 / SHA-256 signature over a deterministic UTF-8 canonical message.
- Signed fields are protocol version, opaque call ID, AUDIO/VIDEO mode, expiry, and one-time nonce.
- The FCM service rejects notification-payload messages and checks the server signature before parsing or displaying a CallStyle alert.
- The verifier rejects unknown protocol versions, malformed fields, missing nonce/signature, altered fields, and invalid signatures.
- The verifier tests cover a valid signature, altered fields, tampered signature, unknown version, missing nonce, invalid mode, and the unpinned-key fail-closed path.

## Deliberately not active

- The staging public-key pin remains intentionally blank. The signing helper and DER-format interoperability test now pass, but no active sender has supplied an independently verified public SPKI key for pinning.
- Therefore the production entry point `verify(data)` currently returns false for every message and no incoming-call alert can be triggered by FCM yet.
- Firebase client configuration is restored from an Actions secret for the isolated staging75 package only. No authenticated token registration endpoint, FCM sender route, pinned wake key, or live push deployment is active.
- Existing Android Telecom registration and Accept UI still do not establish or answer a WebRTC call.

## Required next gate

1. Generate the server signing key in an isolated staging environment; keep its private key only in the approved server-side secret store.
2. Publish and independently verify the matching public SPKI fingerprint, then pin only that public key in the Android staging app.
3. Run automated Android tests and a two-device physical test before describing incoming ringing as active.
4. Keep production, public QR/WebRTC code, and the existing calling engine unchanged.

Staging CI: **Node signing contract PASS / Android unit tests PASS / signed staging APK build PASS / application ID and certificate fingerprint verified**.

Runtime boundary: **KEY NOT PINNED / TOKEN REGISTRATION NOT ACTIVE / FCM SENDER NOT ACTIVE / PUSH NOT ACTIVE / PHYSICAL TEST NOT RUN**.
