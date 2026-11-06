# E-ZERO Secure Pair V1 — Atomic One-Use Enrollment QR Evidence
**Date:** 2026-11-05  
**Status:** PASS in synthetic SQLite/WebAuthn and local Cloudflare workerd CI; **NO production device activation, no deployment**  
**PR:** https://github.com/coma39658-ctrl/null-bench/pull/65 (Draft)

## Problem addressed
The earlier lab had separate positive evidence that a Passkey was correctly signed/consumed, that both device keys signed a pairing transcript, and that a candidate record could be saved. But it had **not atomically burned a distinct server-issued enrollment QR** at the same moment as the evidence join. An otherwise correct implementation can accidentally let the same QR be replayed or leave a consumed QR without an evidence record when the final write fails.

## New implementation
`secure_connect/pair_v1/trust_candidate_sqlite_lab_v0_1.mjs` now adds a strictly separate, **higher-assurance but still non-authorizing** `recordEvidenceAndConsumeEnrollmentQrLab` method:
1. Requires server-owned **PREVERIFIED_LAB_ONLY** account fixture, a fresh WebAuthn assertion with server-consumed challenge, a nonrevoked credential, two P-256-signed approvals already verified by the existing bilateral ledger, and two distinct unrevoked `PENDING` device key records.
2. Reads the server-minted QR from `ezero_pair_v1_challenges`: matches the **same pairing SID, account ID, signed session nonce digest, issued and expiry times, exact WebAuthn credential ID, and purpose**. The QR must remain unconsumed and unexpired. QR is at most **90 seconds**.
3. **Within ONE SQLite Durable Object `transactionSync`**: conditionally sets `consumed_at` on the QR, then inserts an independent `QR_BURNED_NO_TRUST` audit row. A duplicate or failed INSERT throws and rolls both operations back. This avoids partial success.
4. A separately guarded `inspectConsumedEnrollmentQrLab` revalidates the account, credential, both signed approvals, pending nonrevoked device keys, QR audit timestamp, and expiry on every inspection, rather than trusting a cached result.
5. Returns `authorized:false`, `trusted:false`, `accountSessionIssued:false` **even when all evidence is correct**. There is **no method or SQL transition to ACTIVE**, no live call admission, public HTTP API, account cookie grant, or ECU writes. The older evidence-only candidate never becomes an authorization shortcut.

## Measured CI evidence
[GitHub Actions 42058442174](https://github.com/coma39658-ctrl/null-bench/actions/runs/42058442174): both `browser-two-phones` and `actual-worker-local` **PASS**. The enhanced synthetic integration test performs:
- Actual ES256 WebAuthn registration→SQLite→signed login verification and one-use server challenge;
- Two distinct real P-256 device key signatures bound to the same pairing context;
- Wrong-account, wrong-device-role, unconsumed/missing WebAuthn, tampered QR credential mismatches;
- No second device signature → no QR consumption;
- Injected database trigger failure after conditional QR consume → atomic rollback to `consumed_at IS NULL`;
- **20 concurrent requests, exactly one QR consume/audit winner**; replay blocked;
- SQLite close/reopen replay rejected, completed audit persists but is never a Trusted Device;
- Expiry and revoked device cause further inspection to fail closed.

**Evidence levels:** `PASS_SYNTHETIC` / `PASS_LOCAL_WORKER` are not `PASS_PHYSICAL`, independently validated production authority, or public deployment.

## Remaining release blockers
1. **Independent, privacy-preserving account ownership verification and recovery**, replacing the `PREVERIFIED_LAB_ONLY` fixture.
2. **Final same-origin HTTPS host and WebAuthn RP ID**; current GitHub Pages credential RP and workers.dev domain are incompatible as one authenticated cookie host. Real Passkeys must enroll against the final origin.
3. A secure production HTTP router, reviewed authorization context, CSRF/Origin/rate-limit protection and true production account session issuance/rotation/revocation (current session is observation-only).
4. A security-reviewed **atomic true device activation** transaction that *also* checks live account session, unrevoked identity, consent, QR burn and two device signatures; it must handle pending/active/revoked lifecycle and immediate eviction of lost phones from active calls. The existing lab deliberately stops before activation.
5. Tests with physical Android Chrome and iPhone Safari and separate carrier networks, background/camera permissions, TURN and quota/cost; independent abuse/security review and owner launch approval.
6. No release until evidence is recorded. Keep PR Draft, `ROOMS_ENABLED=false` and the `NO_GO` release gate.

## Simple interface remains
**First use:** one QR → scan → Approve/Reject → show Connected only when transport really connects.  
**Return:** Trusted Devices → Connect → fresh verifiable proof.  
No manual SDP or cryptographic fingerprint in the ordinary screen, no QR/session tokens in analytics or logs.

Relevant upstream specifications: [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/), [Cloudflare Durable Object SQLite transactions](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), [OWASP ASVS](https://asvs.owasp.org/).
