# Android Worker Client V1 — Staging Only

Status: implementation candidate; not deployed and not enabled in the app's user flow.

## Scope
- Android calls only an injected HTTPS `*.workers.dev` origin. Redirects are disabled.
- Challenge request transmits the Android Keystore public SPKI only.
- The response challenge is checked against locally reconstructed canonical bytes before the Keystore signs it.
- Completion is sent only after the Root approval QR is independently pinned and locally verified.
- The client accepts success only when the server returns `ok: true`, `status: ENROLLED`, and the exact expected device and Root fingerprints.
- No private key, Root bootstrap secret, FCM token, or call permission is transmitted.

## Deliberate gates
- Candidate Worker is not deployed, so no endpoint is configured in the APK and this client is not invoked by MainActivity.
- Root public key registration remains a separate out-of-band bootstrap operation. The bootstrap secret must never be embedded in Android, browser code, repository files, or QR data.
- Before any real request, provision the Root public key out-of-band, independently compare the full 64-character Root fingerprint, and test on a disposable staging installation.
- The Worker consumes a challenge before asynchronous signature verification; invalid attempts require a fresh challenge. This is fail-closed but may allow denial-of-service against a challenge, so the limitation must be reviewed before deployment.
- This client is synchronous; every call MUST run on a background thread. It has bounded connect/read timeouts and response/request sizes.

## Not claimed
No server enrollment, friend trust, FCM registration, background ringing, or WebRTC permission is active merely because this source exists or compiles.
