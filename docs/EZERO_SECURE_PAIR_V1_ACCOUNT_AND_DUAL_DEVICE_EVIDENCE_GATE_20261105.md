# E-ZERO Secure Pair V1 — Account and Dual-Device Evidence Gate
**Date:** 2026-11-05 | **Scope:** isolated SQLite/CI laboratory | **Public deployment:** NONE | **Release status:** PARTIAL

## Why this exists
WebAuthn verified registration and an atomic authentication assertion are not sufficient to authorize an additional phone. The two peer device keys must each sign the identical bounded pairing context, both must refer to the same preverified account, and each pending registered key must still be unrevo­ked. A valid QR, a browser-supplied `verified:true`, and a single phone's consent alone MUST NOT create device trust.

## What was implemented
- New `secure_connect/pair_v1/trust_candidate_sqlite_lab_v0_1.mjs`. It combines **server-owned SQLite state**, not client booleans:
  - preverified lab account whose status has not been revoked;
  - fresh, one-time **consumed** WebAuthn authentication challenge, bound to account ID and registered active credential;
  - persistent dual signed approvals with precise role A/B, account, key hashes, expiry, non-rejection and both timestamps;
  - distinct `PENDING` registered device keys, with hashes matching the correct approval roles;
  - atomic `EVIDENCE_PRESENT_NO_TRUST` candidate insertion with globally unique pairing session ID and unique passkey authentication session ID.
- Revalidation on inspection fails closed after expiry, revoked credential/account or revoked device. An in-memory flag is never enough; SQLite survives restart.
- **Intentional non-feature:** the class has NO activation, account-session issuance, phone connection, QR consume, client permissions or ECU capability. Every result includes `authorized:false`, `trusted:false`, and `accountSessionIssued:false`.
- Updated `tests/test_ezero_secure_pair_v1_webauthn_reg_to_login_v0_1.mjs` to create a synthetic ES256 passkey registration, persist real vetted COSE public key, authenticate a fresh signed ES256 WebAuthn assertion and atomically persist it; stage two distinct signed P-256 device keys, sign one pairing context from both roles, join all proof records, then adversarially test mismatched account, role/device swap, wrong auth SID, one-sided consent, expired QR, revocation, restart and 20 concurrent candidate attempts.
- The real QR calling browser test and local Cloudflare Worker regression remain separately required by CI.

## Verifiable result
[GitHub Actions run 42043385571](https://github.com/coma39658-ctrl/null-bench/actions/runs/42043385571): **PASS** in `browser-two-phones` and `actual-worker-local`. This verifies synthetic two-browser signaling and localhost workerd, **NOT real Android/iPhone physical pairing**, public Cloudflare access, or account ownership.

## Public-release blockers
1. Actual independent account ownership verification, recovery, rate limits, identity and revocation authority. Current `PREVERIFIED_LAB_ONLY` row is a trusted *test fixture*, not a production identity.
2. A reviewed **account session** mechanism with server-only opaque credentials, safe cookies, exact origin/RP ID, CSRF protection, expiry, rotation, logout, unauthorized device removal and revocation propagation.
3. A single atomic Durable Object transaction coupling account session, consumed **one-use 90-second enrollment QR**, two independently verified signed approvals, and state transition from pending keys to active trusted devices. The present lab only records evidence, **never authorizes**.
4. First-time mobile WebAuthn biometric/PIN ceremonies and re-connection using fresh signed nonces; distinct phone owners and account recovery policy to be determined.
5. Tests on actual Android Chrome and iPhone Safari across different carriers/networks including camera-broken private-link fallback, background restrictions, denied media access, lost/revoked phone, TURN/network fallback, cost control, independent security review.
6. Explicit owner-approved public launch after tests. PR #65 stays draft and `ROOMS_ENABLED=false`; no public web site/Cloudflare production changes.

## User-facing design target
**Initial:** Show QR → Scan OR Share one private link → consent prompt → connected only on measured WebRTC success.
**Return:** Trusted Devices → one-tap Connect → fresh server nonce/device signatures → connected only on measured success.
All JSON, WebAuthn/COSE/SPKI details and operator secrets remain behind the scenes.
**Do not claim** WhatsApp background calling works in a PWA without separate native/push permission testing.

## Evidence classification
- **PASS (synthetic):** independent WebAuthn signature, SQLite atomic commits, dual device signatures and recorded evidence candidate; previous one-QR WebRTC browser regression and local workerd.
- **PARTIAL:** persistent account and device trust authorization, browser ↔ server integration.
- **UNKNOWN:** full cross-platform physical phone validation and independent security review.
- **NOT DEPLOYED:** public multi-device trusted pairing, live account session, production signaling rooms.

Technical references: https://www.w3.org/TR/webauthn-3/ ; https://simplewebauthn.dev/docs/packages/server ; https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
