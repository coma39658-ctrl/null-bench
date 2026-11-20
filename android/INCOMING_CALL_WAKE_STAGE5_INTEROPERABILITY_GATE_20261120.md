# E-ZERO Incoming Call Wake — Stage 5 Interoperability Gate

Status: isolated staging contract and deterministic tests only. No sender is deployed and incoming calls are not activated.

## Work completed
- Added a server-side Node.js ECDSA P-256/SHA-256 signer helper for the exact existing Android wake contract.
- Enforces the existing version, call ID, mode, nonce and 120-second expiry constraints.
- Emits DER ECDSA signature bytes encoded as unpadded Base64URL in the data-only `server_sig` field.
- Added one shared canonical-byte fixture consumed independently by Node and Android unit tests.
- Uses ephemeral test keys only; no key, FCM token, Firebase credential or secret is committed.

## Security and UX boundaries
- The wake payload contains only the opaque call ID, AUDIO/VIDEO mode, expiry, nonce, version and signature; no caller-supplied name, message, phone number, SDP, media or invite URL.
- FCM remains a wake-up hint, not caller identity or call authorization.
- Android must verify the signature and consume the short-lived signed invite before an Accept action can enter the frozen WebRTC engine.
- The signing helper does not send FCM, register devices, configure Firebase, pin a public key or change Android UI.

## Required next gates
1. Review the canonical-byte and signer interoperability test results.
2. Generate an isolated staging key outside the repository; independently verify its public fingerprint before Android pinning.
3. Implement authenticated device-token registration and a sender endpoint only after its threat model and storage/retention are reviewed.
4. Wire Accept/Reject/cancel/timeout to signed invite consumption/invalidation.
5. Run two-device physical tests for ringtone, vibration, lock screen, FCM wake and actual call handoff.

## Explicit non-actions
No Firebase project setup, service-account credential, secret-store mutation, Worker route, Durable Object production binding, remote deployment, public website change, release signing or production integration.
