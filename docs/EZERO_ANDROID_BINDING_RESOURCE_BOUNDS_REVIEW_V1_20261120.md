# E-ZERO Android Binding — Resource Bounds and Retention Review V1

Date: 2026-11-20
Status: DESIGN REVIEW ONLY — NO RUNTIME POLICY OR CODE CHANGED
Parent: PR #166 (local workerd / SQLite runtime gate)

## Purpose

The local workerd/SQLite gate establishes atomic approval consumption, persistence across Durable Object eviction, and owner-authorized revocation. It does not yet bound durable storage growth or request volume. This document defines the next isolated gate before any remote staging endpoint is considered.

## Findings from the current implementation

1. Issued challenge records are written under owner+nonce keys and are not currently deleted after expiry or consumption.
2. Revocation replay tombstones are durable and currently have no retention/cleanup policy.
3. There is no per-owner request quota in the ledger.
4. The current runtime fixture creates a random Durable Object ID per test fixture. That is correct for test isolation, but it is not a valid future routing rule for per-owner quotas.
5. There is no Worker route or namespace binding in the live signaling Worker. No network caller currently reaches this class.

## Required design constraints

### Deterministic owner partition

Any future Worker route MUST derive exactly one Durable Object ID from the verified owner fingerprint, for example `idFromName("android-binding-v1:" + ownerFingerprint)`. All challenge, approval, status, and revocation operations for that owner must reach that same object. The route must validate the permanent owner proof before selecting/using the owner partition. A client-supplied arbitrary object ID is forbidden.

The runtime test project may continue using random IDs for isolated test fixtures; add a separate test proving two independently obtained stubs for the same deterministic owner ID share quota and state before any route is implemented.

### Proposed request budgets (initial staging defaults)

- Challenge issuance: at most 5 per owner per rolling 10-minute window.
- Challenge issuance: at most 20 per owner per UTC day.
- Revocation authorization attempts: at most 5 per owner per rolling 10-minute window.
- A valid approval consumption for an already-issued challenge is not charged as a new challenge issuance.
- Denied/invalid owner proofs are rejected before creating any durable per-owner counter record.
- Quota counters are updated atomically with challenge issuance / revocation authorization and are bounded to fixed window keys; never store one row per request.
- Return stable machine-readable `RATE_LIMITED` with a retry-after epoch value. Do not expose internal storage details.

These are conservative staging defaults, not a public SLA. Revisit only with measured traffic and abuse review.

### Retention and cleanup

- Unconsumed challenge: retain until expiry + 5 minutes, then delete.
- Consumed challenge: retain until its original expiry + 5 minutes, then delete. Replay after deletion remains rejected because the signed challenge is expired; test the expiry boundary explicitly.
- Revocation replay tombstone: retain at least 10 minutes after first accepted use. The verifier currently accepts revocation signatures only within ±90 seconds; 10 minutes leaves margin for clock skew and delayed replay. Do not shorten without a protocol-versioned review.
- Active and revoked binding records: retain indefinitely until a separately authorized account-erasure / lifecycle policy exists. Never TTL an active binding.
- Cleanup must be bounded per alarm invocation (maximum 100 records examined/deleted), reschedule itself when more work remains, and be idempotent.
- Use Durable Object alarms and SQLite-backed storage primitives supported by the actual runtime. Do not run unbounded scans in an RPC request.
- Do not rely on best-effort in-memory timers or process lifetime.

### Atomicity and abuse resistance

- Quota check + counter increment + challenge insert must be one SQLite transaction.
- Revocation quota check + replay-tombstone insert + binding revocation must be one SQLite transaction.
- Approval nonce consumption + binding activation remains one transaction.
- Concurrent requests at the quota boundary must never exceed the configured limit.
- Validate all input lengths and formats before expensive crypto or durable writes where possible, while still verifying the owner proof before any state mutation.
- Cap canonical request and RPC input sizes; do not persist raw arbitrary client payloads.
- Cleanup and quota accounting must not delete or reset active binding state.
- Fail closed on storage/transaction/clock errors.

## Required tests before implementation can be called PASS

1. Same-owner deterministic ID shares quota across fresh stubs; different owners remain isolated.
2. Parallel challenge requests at the quota boundary: exactly the configured maximum succeeds.
3. Invalid owner proof does not allocate counters or consume quota.
4. Quota reset occurs at the exact documented UTC/window boundary.
5. Expired and consumed challenge cleanup deletes only after expiry + 5 minutes.
6. Revocation tombstone remains through 10 minutes and replay is rejected; after safe cleanup, stale signatures remain rejected by timestamp validation.
7. Cleanup processes no more than 100 entries per alarm and reschedules when backlog remains.
8. Alarm execution is idempotent across eviction/restart.
9. Active and revoked binding records are never removed by challenge/tombstone cleanup.
10. All tests run in local workerd with SQLite-backed Durable Object storage, not only a fake storage adapter.

## Explicit non-goals

- No Worker HTTP route, public endpoint, namespace binding in the production signaling Worker, Wrangler migration, or remote deployment.
- No change to EZERO2 QR format, browser signer, Android UI, encrypted contacts, WebRTC/calling, push notifications, messages, media, or call history.
- No production or public website changes.
- No real user/device identity or private key in fixtures.

## Gate decision

Implementation is blocked until the deterministic owner partition and the retention/quotas above are implemented and pass the full local workerd/SQLite runtime suite. A separate security review and explicit release decision are required before any remote staging namespace or network route.
