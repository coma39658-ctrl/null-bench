# E-ZERO Secure Pair V1 — Atomic Passkey Registration and Login Chain
**Date:** 2026-11-05 | **Environment:** isolated GitHub Actions lab | **Status:** CRYPTO + SQLITE TESTED, NOT AUTHORIZED FOR PUBLIC RELEASE

## Scope and original problem
The existing experimental `PairV1SqliteAtomicPasskeyFinishLab` verified an ES256 login and atomically committed the one-time challenge and signature counter to SQLite. However, its tests used a *test-fixture SQL INSERT* to create the account's registered COSE credential. That fixture is not a production registration ceremony. This phase adds a separate, independently tested **WebAuthn registration → durable COSE storage → login** path without a new public route or any Trusted Device activation.

## Implementation
- New `secure_connect/pair_v1/passkey_registration_atomic_sqlite_lab_v0_1.mjs` calls the previously tested, pinned SimpleWebAuthn registration functions. Requires an **independently preverified** server account record with a unique opaque user handle, stored in the same SQLite Durable Object context. The future account-provisioning authority is **NOT IMPLEMENTED**, and this class intentionally offers no method to create such an account.
- `begin` verifies account presence/status and version, asks SimpleWebAuthn for a new challenge and saves only its SHA-256 digest with random session ID and 90-second expiry. No biometric template, passkey private key, admin token, QR bearer, or SDP is stored.
- `finish` extracts the browser-provided challenge, requires its digest to match the server-owned record, calls the vetted WebAuthn verifier for exact RP ID, origin, user verification, ES256 COSE key and challenge, and then uses **ONE SQLite transaction** to insert the globally unique credential ID/COSE key, consume challenge and bump the account version. Any conflict or write failure rolls all three operations back.
- The successful registration creates an `ACTIVE` **WebAuthn credential record**, which means only that subsequent cryptographic assertions can be verified. It does **not** mark any phone as a Trusted Device, grant a call privilege, authenticate an account session or authorize automotive ECU access.
- Existing `PairV1SqliteAtomicPasskeyFinishLab` verifies the stored COSE key in the same database; a fresh 90-second challenge and signature-counter update are atomically consumed. No persistent account login session is minted.
- `tests/test_ezero_secure_pair_v1_webauthn_reg_to_login_v0_1.mjs` now checks the entire synthetic registration→database→real ECDSA signature→login path, including revoked/unknown account, wrong origin, wrong challenge, mid-transaction failure injection, 20 competing registration attempts, replay after database close/reopen, uniqueness and credential revocation.

## Evidence
[GitHub Actions 42041629240](https://github.com/coma39658-ctrl/null-bench/actions/runs/42041629240): `browser-two-phones` **PASS** and `actual-worker-local` **PASS**. A real **localhost Cloudflare workerd** regression still works; no Cloudflare remote Worker or public calling was enabled. The authentication test uses synthetic ES256 authenticator data and a vetted verifier, **not** physical Android Face Unlock/Touch ID/Face ID testing.

### What is still REQUIRED, not optional
1. Reviewed **human account verification** and recovery before an account is marked preverified. A browser-provided account ID/boolean never establishes ownership.
2. Durable account cookie/token/CSRF/origin policy, explicit UI consent, rate limits, account suspension and invalidation of active sessions.
3. Enforcement of account revocation across **all** authentication and call routes; current isolated passkey credential verifier is not a complete authenticated account server.
4. A reviewed atomic pairing transition binding both signed device keys, verified account authority, user approvals, single-use 90-second QR and revocation state in the same transaction. Existing bilateral-signature ledger returns `BOTH_SIGNED_UNAUTHORIZED` intentionally.
5. Real Android Chrome and iPhone Safari security and accessibility tests, remote connectivity/TURN costs, camera-broken one-link fallback, background limitations, and independent security review.
6. Explicit owner approval **after** these gates. Until then `ROOMS_ENABLED=false`, Draft PR #65, no merge/public deployment.

## Status labels
- **PASS (synthetic):** registration verifier, SQLite atomic persistence, one-use nonce, real local workerd/browser regressions.
- **PARTIAL:** account/device identity system and one-tap Trusted Reconnect.
- **UNKNOWN:** physical cross-platform passkeys, real different-carrier calling, live revocation propagation.
- **NOT DEPLOYED:** server identity, trusted-device enrollment, public QR room service.

Public standards: https://simplewebauthn.dev/docs/packages/server ; https://www.w3.org/TR/webauthn-3/ ; https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
