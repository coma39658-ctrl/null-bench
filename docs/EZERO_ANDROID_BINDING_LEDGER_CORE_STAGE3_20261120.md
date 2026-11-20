# E-ZERO Android Binding Ledger Core — Stage 3

Date: 2026-11-20
Branch: `ezero-android-binding-ledger-stage3-20261120`
Status: **ISOLATED CORE + UNIT TESTS ONLY — NOT A WORKER, NOT DURABLE OBJECT DEPLOYMENT, NOT ENROLLMENT**

## Scope added

- Added `signaling/cloudflare/src/android_binding_ledger_core_v1.cjs`.
- Added `tests/test_ezero_android_binding_ledger_core_v1.cjs`.
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

- `verifyOwnerApproval` is a required callback. A real Worker must independently validate the permanent EZERO2 owner proof, prove the owner SPKI fingerprint, and verify the ECDSA signature over `EZERO-ANDROID-BIND-APPROVAL-1\\n` plus the exact canonical request bytes. A client-provided “verified” flag is not acceptable.
- The challenge issuer must authenticate the existing EZERO2 owner identity before calling this core.
- Revocation must authenticate a fresh owner-authorized action before calling this core.
- The current tests use a deliberately simple verifier stub to test ledger state transitions; they do NOT prove ECDSA verification, EZERO2 proof validation, Cloudflare Durable Object transaction behavior, or network security.
- The test storage adapter serializes transactions in memory. A real Cloudflare Durable Object adapter and concurrency tests against a non-production staging namespace are still required.

## Tests intended for the isolated gate

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
