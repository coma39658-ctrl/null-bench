# E-ZERO Android Binding Ledger Core — Stage 3

Date: 2026-11-20
Branch: `ezero-android-binding-ledger-stage3-20261120`
Status: **ISOLATED CORE + UNIT TESTS ONLY — NOT A WORKER, NOT DURABLE OBJECT DEPLOYMENT, NOT ENROLLMENT**

## Scope added

- Added `signaling/cloudflare/src/android_binding_ledger_core_v1.cjs`.
- Added `tests/test_ezero_android_binding_ledger_core_v1.cjs`.
- Added `signaling/cloudflare/src/android_binding_crypto_v1.cjs`, a pure WebCrypto verifier for the existing EZERO2 permanent owner proof and the domain-separated Android binding approval, using the same P-256 public key.
- Added `tests/test_ezero_android_binding_crypto_v1.cjs` with generated P-256 test keys and real WebCrypto signatures; no private test key is stored in the repository.
- Added a branch-scoped GitHub Actions workflow for the isolated core tests.
- This is a storage-agnostic core intended to be called with Cloudflare Durable Object storage transactions later. It does not import the older PR156 inbox and does not use its `EZERO-TRUSTED-INBOX-1` format.

## Core rules

- Exact origin: `https://coma39658-ctrl.github.io`.
- Exact request protocol: `EZERO-ANDROID-BIND-1`, nine canonical lines, exact `call-invite-only` capability.
- Android SPKI SHA-256 fingerprint is recomputed before challenge issuance.
- Challenge nonce is 24 cryptographically random bytes (32 base64url characters); lifetime is fixed at 90 seconds.
- Challenge issuance requires an atomic storage transaction.
- Approval consumption re-checks the exact canonical request and expiry inside the transaction, then marks the nonce consumed and activates the owner/device binding in the same transaction.
- Concurrent replay attempts are expected to produce one winner only when backed by a storage implementation that provides serialized atomic transactions, as Cloudflare Durable Object storage does.
- Revocation requires a caller-supplied fresh owner-authorization verifier and atomically marks the binding revoked.
- Active bindings cannot be activated a second time without first being revoked.

## Critical trust boundary — not yet wired

- `verifyOwnerApproval` is a required callback. The new pure WebCrypto helper implements EZERO2 proof and approval signature verification, but it is not yet wired into a Worker/DO entrypoint. A client-provided “verified” flag is never acceptable.
- The challenge issuer must authenticate the existing EZERO2 owner identity before calling this core.
- Revocation must authenticate a fresh owner-authorized action before calling this core.
- Ledger state-transition tests use a deliberately simple verifier stub; the separate crypto tests use real generated P-256 keys and WebCrypto. Neither suite proves Cloudflare Durable Object transaction behavior or network security.
- The test storage adapter serializes transactions in memory. A real Cloudflare Durable Object adapter and concurrency tests against a non-production staging namespace are still required.
- Expired/consumed nonce retention and bounded cleanup must be designed before any live endpoint; the current core deliberately does not silently delete security records.

## Automated evidence — PASS

- Isolated core workflow run [44760075595](https://github.com/coma39658-ctrl/null-bench/actions/runs/44760075595), commit `a6bccb21431140042c95aa183a5f7c443d95fd84`: completed successfully.
- Initial Node 22 core run [44760075595](https://github.com/coma39658-ctrl/null-bench/actions/runs/44760075595): **8 passed, 0 failed** for ledger state transitions.
- A real WebCrypto test suite is now added to the same gate. It generates P-256 keys at runtime, verifies the exact EZERO2 permanent proof, checks that the Android approval is signed by the same owner key, rejects altered signatures and wrong owner keys, and exercises ledger consumption with that cryptographic verifier. Its new CI run is pending at the latest branch commit; do not mark those new crypto tests PASS until that run completes.
- Evidence registry validator passed on the initial ledger commit [44760075610](https://github.com/coma39658-ctrl/null-bench/actions/runs/44760075610).
- Important: ledger concurrency tests still use a serialized in-memory storage adapter. They do not prove Cloudflare Durable Object transaction behavior or a live network endpoint.

## Tests covered by the isolated gate

- Canonical nine-line challenge and 90-second lifetime.
- Successful single-use approval and replay rejection.
- Concurrent duplicate consumption has one winner.
- Expiry at the exact boundary.
- Failed owner verifier does not consume the nonce.
- Authenticated revocation and rejection of unauthorized revocation.
- No duplicate active binding.
- Changed canonical bytes and wrong origin rejected.

## Explicitly not done

- No Worker route or API endpoint.
- No Durable Object class, namespace binding, migration, or deployment.
- No integration with the existing Trusted Inbox candidate.
- No Android UI/contact-vault integration, enrollment, contact sync, calls, messages, media, background delivery, or push notifications.
- No website, Render, Cloudflare, production, or release APK changes.
- No real-user identity, public keys, private keys, QR tokens, or contact data are stored by these tests.

## Next gate

1. Run the isolated core test workflow and correct any failures.
2. Implement an entirely separate staging Durable Object adapter with atomic storage transactions, no public route initially.
3. Add Worker-side EZERO2 proof and ECDSA approval verification using the same canonical bytes and exact origin.
4. Add Cloudflare staging integration tests for concurrent replay, expiry, revocation, owner/device mismatch, and fail-closed behavior.
5. Only after those pass, consider an authenticated staging endpoint. Keep it disconnected from app UI, contacts, and the live call engine until separately gated.
