# E-ZERO Secure Pair V1 — Server-Bound Device Signature Gate
**Date:** 2026-11-05 | **Status:** PASS — synthetic SQLite/WebCrypto and localhost Cloudflare tests | **Public release:** NO-GO

## Security issue closed in the isolated lab
The earlier `recordSignedDecision` verifier cryptographically checked a signed role approval, but required the caller to supply `registeredSpki`, `registeredDeviceKeyHash`, `accountFromRegistry`, and `recordRevoked`. These fields MUST originate from the trusted server registry, not a browser. A poorly implemented future route could accidentally accept an attacker-supplied key/account or miss revocation between async signature verification and the final SQLite write.

### New server-bound API
`PairV1MutualApprovalSqliteLab.recordServerRegisteredDecisionLab({accountId,deviceId,role,approval,signature},now)`:
1. Accepts only the proposed account and device identifiers, signed transcript, role and raw ECDSA signature; **ignores all caller-supplied public keys, key hashes and “verified”/“revoked” flags**.
2. Reads the `PENDING`, not revoked device key, SHA-256 key hash, account binding and version from **trusted SQLite** (the same Durable Object), then uses the existing P-256 WebCrypto signature verifier.
3. After WebCrypto's asynchronous verification, *inside the decision SQLite transaction*, re-reads the device's state and compares status, revocation time, version, key hash and SPKI bytes with the values initially verified. If a device was revoked or rotated in the interim, the signature is rejected **before any approval row changes**.
4. Applies the existing signed transcript and role-binding checks, one approval per side, explicit signed rejection, TTL and two-signature evidence-only stage. It still returns `authorized:false, trusted:false` and does NOT activate Trusted Devices, issue an account session or permit WebRTC calls.
5. Legacy `recordSignedDecision` remains available to older isolated lab tests but is **NOT approved for future browser/public routes**, because it accepts caller-supplied key provenance. The protected server-side route must use the new registry-bound method after genuine account/session verification.

## Added tests
`tests/test_ezero_secure_pair_v1_server_bound_device_approval_v0_1.mjs`:
- A real SQLite database holds two distinct P-256 public keys, each staged by the pending-device registry.
- Real ECDSA signatures are verified from SQLite-stored keys; a forged `registeredSpki`, `registeredDeviceKeyHash` or `verified:true` field in a client object cannot change which key is used.
- Signatures by the attacker, wrong device/account ID, role swaps, replay and unregistered phones fail closed.
- Two valid phone signatures yield **BOTH_SIGNED_UNAUTHORIZED**, never active trust.
- Revoking a phone while WebCrypto verification is still in progress blocks the final transaction (**time-of-check to time-of-use** test).
- After SQLite close/reopen, revoked-phone signatures remain denied and the system cannot activate a Trusted Device.

`tests/test_ezero_secure_pair_v1_webauthn_reg_to_login_v0_1.mjs` now exercises this registry-bound method in its complete synthetic ES256 Passkey → persisted credential → signed-login → two device signatures → 90-second one-use QR evidence chain.

**Verified CI:** [GitHub Actions 42059997599](https://github.com/coma39658-ctrl/null-bench/actions/runs/42059997599), both jobs **PASS** (browser-two-phones and actual-worker-local). No public Cloudflare deployment.

## Future production requirements
- Independently authenticate the real account and maintain a trustworthy recovery policy (lab uses `PREVERIFIED_LAB_ONLY` fixture).
- All related device records, authenticator challenges, approvals and revoked state must live in a consistent authoritative Durable Object, with atomic trust transitions.
- Finalize same-origin HTTPS host and WebAuthn RP ID; do not assume GitHub Pages credentials work on a workers.dev domain.
- Eliminate the legacy caller-supplied key path from any future production exports/routers, and perform a focused independent security review.
- Implement true 90-second QR enrollment and audited ACTIVE/REVOKED lifecycle, real active-call revocation, abuse protections, physical Android/iPhone and cross-carrier TURN tests.
- **Release remains NO-GO, PR #65 remains Draft, `ROOMS_ENABLED=false`.**

This change strengthens *evidence authenticity*, **not** the authority to enroll phones or launch public calls. The user experience goal remains: QR → Scan → Allow → Connected, with trusted-device reconnection only after all release gates are met.
