# E-ZERO Secure Pair V1 — Registration-to-Login Cryptographic Interoperability
**Date:** 2026-11-05 | **Scope:** isolated GitHub Actions laboratory | **Public deployment:** NONE

## Purpose
Existing registration verifier emitted ES256 COSE public-key bytes while an older standalone assertion experiment consumed SPKI bytes. Treating these as interchangeable would make the future secure account system fail or encourage unreviewed conversion. The new auth verifier uses the same vetted SimpleWebAuthn v14.0.3 verifier family as registration, with the exact COSE bytes returned by registration.

## Code changes
- `secure_connect/pair_v1/webauthn_authentication_library_lab_v0_1.mjs`:
  - `makeAuthenticationOptionsLabV1`: bound to a **server-owned** account ID and active registered credential records; generates a fresh 90-second WebAuthn challenge for the configured RP ID, requires user verification and selects registered credential IDs.
  - `verifyAuthenticationResponseLabV1`: verifies a real ECDSA WebAuthn get assertion against the registered ES256 COSE public key, strict account/credential ID, challenge, Origin (`https://coma39658-ctrl.github.io`), RP ID (`coma39658-ctrl.github.io`), user verification and authenticator signature-counter behavior. Rejects revoked records, cross-origin requests, expired/consumed challenges, wrong-purpose requests, modified signatures or wrong keys.
  - **All results deliberately return `authorized:false`, and successful verification explicitly reports `challengeConsumed:false`, `counterPersisted:false`, `authenticatedSessionIssued:false`. This is not a login service.
- `tests/test_ezero_secure_pair_v1_webauthn_reg_to_login_v0_1.mjs`: synthesizes an ES256 authenticator's CBOR/COSE registration and P-256 signed authentication assertion, verifies it with the vetted library, then executes adversarial cases. It tests the actual **same registration key** passed into authentication; it does not pretend to use a hardware-backed authenticator or real biometrics.
- `.github/workflows/ezero_one_qr_one_accept_lab_20261105.yml`: requires this regression in the isolated browser job, alongside the original one-QR/WebRTC/Cloudflare-local tests.

## Verified evidence
[GitHub Actions run #42035593160](https://github.com/coma39658-ctrl/null-bench/actions/runs/42035593160): **PASS** for `browser-two-phones` and `actual-worker-local`. Local worker tests never deploy Cloudflare or enable public call rooms. Synthetic authentication's cryptographically valid ES256 login passed; negative cases returned secure denials.

## Remaining blockers
1. **Server-authenticated account authority:** an actual verified account onboarding path and protected cookie/session issuance with expiry, CSRF protection, Origin policy and account recovery.
2. **Durable registration and authentication:** persisted verified credential COSE key and counter, server-owned challenge storage and atomic one-use consumption plus compare-and-set counter updates across requests/restarts; do not accept any caller-supplied `verified:true`.
3. **Device trust approval:** separately registered device signing key, both devices' cryptographic approval over one challenge, revocation and trusted reconnect integrated atomically. Pair/call QR alone never authorizes account or device.
4. **Platform tests:** real Android Chrome and iPhone Safari passkey ceremonies and secure call flows, permissions, background behavior, cross-network TURN, broken-camera fallback and cost.
5. **Independent security review:** unexpected low-level input combinations, WebAuthn counter/backup semantics, account takeover and device lost/revoked behavior.

## Public release decision
**NOT READY.** Existing production/web pages unchanged, PR #65 still draft, `ROOMS_ENABLED=false`. No ECU access or OBD authorization is gained by pairing.

## References
- SimpleWebAuthn official server registration/authentication: https://simplewebauthn.dev/docs/packages/server
- W3C Web Authentication Level 3: https://www.w3.org/TR/webauthn-3/
- Cloudflare Durable Object SQLite `transactionSync`: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
