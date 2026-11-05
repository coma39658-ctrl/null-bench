# E-ZERO Secure Pair V1 — Atomic Passkey Replay Gate (Laboratory)
**Date:** 2026-11-05  
**Repository:** coma39658-ctrl/null-bench  
**Branch:** ezero-one-qr-incoming-call-consent-lab-20261105  
**Status:** LAB PASS; ACCOUNT LOGIN / DEVICE TRUST / PHYSICAL MOBILE TEST: NOT VERIFIED.

## Objective and user experience
The user should only see a brief secure system Passkey prompt during first-time pairing, never base64, hashes, signed JSON, raw WebRTC offer/answer or a Cloudflare owner secret. The backend must reject a previously used passkey challenge or an out-of-order authenticator counter, without extra manual steps.

## Implemented, isolated code
`secure_connect/pair_v1/passkey_atomic_finish_sqlite_lab_v0_1.mjs`:
1. Reads the existing ACTIVE ES256/COSE credential **from a server-side SQL registry**, not from untrusted `verified: true` client flags.
2. Creates an unpredictable 128-bit session ID and a random 32-byte WebAuthn challenge through the vetted SimpleWebAuthn generator; stores only a SHA-256 challenge digest with binding to server account, credential, purpose, time and expiry (90 seconds).
3. Receives a `webauthn.get` assertion and requires the submitted challenge digest to match the persistent server record; verifies signature, RP ID, exact Origin, UP/UV and registered COSE key with `verifyAuthenticationResponseLabV1`.
4. In **one SQLite transaction** with conditional updates, persists the new signature counter and consumes the challenge **once**, rejecting replay, concurrent races, expired challenges and revoked/changed credentials. An error rolls both changes back.
5. **Deliberately returns `authorized:false`, `authenticatedSessionIssued:false` and `trustedDeviceActivated:false`, including after a successful cryptographic check.** No public route imports this module.

`tests/test_ezero_secure_pair_v1_webauthn_reg_to_login_v0_1.mjs`: Uses synthetic CBOR/COSE registration and a genuine P-256 signed login assertion. Tests invalid signatures/challenges/accounts, database rollback after an injected SQLite trigger error, challenge/counter survival across restart, 20 concurrent assertions with only one commit, expiry, and revocation. The registered key is test-seeded through the local fixture SQL, **not** enrolled through a public account server.

## Evidence
[GitHub Actions #42036976661](https://github.com/coma39658-ctrl/null-bench/actions/runs/42036976661):
- `browser-two-phones`: **PASS** (includes synthetic one-QR Chromium integration, manual/regression UI, SimpleWebAuthn registration/login and atomic passkey gate).
- `actual-worker-local`: **PASS** (local Cloudflare workerd, no remote deployment).
- `ROOMS_ENABLED=false` stays the public worker's source configuration.

## Security limitations and next work
- Current scaffold **assumes a separately authenticated server-side account** and deliberately has no HTTP endpoints or login/session cookie issuance.
- The SQL credential fixture is **not** a server-proven credential registration lifecycle. A production credential registry needs verified registration, unique credential IDs, atomic updates, account recovery, revoked-device propagation and audit.
- Signature-counter behavior differs for synced passkeys, including legitimate 0/0 counters. Counter checking is a signal, **not a guarantee against credential cloning**.
- The SQLite transaction protects a single isolated store. Device approval ledgers, QR pairing state and login-session state are **not yet integrated atomically**; do not claim full replay/identity security at system level.
- No actual Android biometric or iPhone Safari passkey interaction, cross-network calls or TURN testing yet.
- E-ZERO OBD remains separate: **pairing is not permission to scan a car, write to an ECU or clear fault codes**.

## Next release gate
Implement an authenticated account enrollment and account-scoped server session with anti-CSRF/Origin controls, bind mutually signed device approvals and revocation to the consumed pairing challenge, then run physical Android + iPhone trials and independent security review. Do not merge PR #65 or publish until the complete gate passes.
