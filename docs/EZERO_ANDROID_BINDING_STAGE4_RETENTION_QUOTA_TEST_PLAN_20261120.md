# E-ZERO Android Binding — Retention, Quota and Cleanup Stage 4 Test Plan

Date: 2026-11-20
Branch: `ezero-android-binding-retention-quota-stage4-prep-20261120`
Base: `965fa03bfa334578941179277976af142943b5e5`
Status: PREPARATION ONLY — TEST SPECIFICATION, NO POLICY CODE OR DEPLOYMENT

## Scope

Prepare the next isolated implementation gate after the local workerd/SQLite runtime gate. This stage will add:
- deterministic per-owner Durable Object addressing helper;
- atomic owner-scoped challenge and revocation request budgets;
- bounded SQLite-backed retention cleanup using Durable Object alarms;
- runtime tests proving quota concurrency, expiry, cleanup bounds, persistence, and owner isolation.

This branch intentionally contains no runtime behavior changes. It is not a deployable Worker.

## Non-negotiable safety boundaries

- Keep the existing EZERO2 owner proof and its canonical bytes unchanged.
- Do not alter the browser signer, Android QR verifier, Android contact vault, or WebRTC call engine.
- Do not add a Worker fetch route, public endpoint, production namespace binding, Wrangler migration outside the test-only config, secrets, or remote deployment.
- Never store private keys, raw QR tokens, media, SDP, ICE, chat messages, photos, or call history.
- Never delete active or revoked binding records as part of challenge/replay cleanup.
- Fail closed if SQLite transaction or alarm scheduling fails.
- Preserve explicit owner approval and one-time nonce consumption.

## Deterministic owner partition

Future routing must derive the Durable Object ID only after validating the EZERO2 proof:
`idFromName("android-binding-v1:" + lowercaseOwnerFingerprint)`.

Tests must prove:
1. Two stubs obtained from the same owner fingerprint resolve to the same durable state and quota.
2. Two different owner fingerprints do not share counters, challenges, or bindings.
3. Arbitrary client-provided object names/IDs are never accepted by the future routing layer.
4. Invalid EZERO2 proof creates no durable records and does not allocate a quota bucket.

The current test fixtures may retain random IDs when isolation is intended. Add deterministic-ID fixtures separately; do not silently change existing test isolation.

## Quota semantics to implement

Use fixed UTC windows to keep state bounded and deterministic:
- Challenge issuance: 5 per owner per 10-minute window.
- Challenge issuance: 20 per owner per UTC day.
- Revocation authorization attempts: 5 per owner per 10-minute window.

For each operation, compute window keys from the verified owner's fingerprint and integer UTC window index. Counter records are fixed-size values; do not write one record per request. Check and increment counters in the same SQLite transaction as the operation's state mutation.

Expected behavior:
- The first configured number of requests in a window are accepted.
- The next request returns `{status:"rejected", code:"RATE_LIMITED", retryAfterEpochSeconds:<integer>}`.
- Parallel requests at the boundary never exceed the limit.
- A new fixed window starts at its exact UTC boundary.
- Invalid owner proof is rejected before a counter is created or incremented.
- Approval consumption for a challenge already issued does not charge another issuance.
- Invalid revocation signature does not consume quota; quota is charged atomically only when a valid owner-authorized revocation attempt is accepted for processing. Document whether nonexistent/inactive binding attempts count, then test it consistently.

No unbounded per-request rate-limit logs.

## Retention policy

- Challenge record (issued or consumed): eligible for deletion at expiry + 300 seconds.
- Revocation replay tombstone: eligible for deletion 600 seconds after consumption.
- Active binding record: no TTL.
- Revoked binding record: no TTL until a separately authorized lifecycle/erasure policy exists.
- Quota buckets: expire after the relevant window closes plus a small fixed cleanup margin; no per-request rows.

Use the Durable Object alarm API and SQLite-backed storage. Cleanup must:
- examine/delete at most 100 eligible records per alarm invocation;
- avoid unbounded full-storage scans;
- be idempotent across alarm retries, eviction and restart;
- schedule the next alarm if backlog remains;
- never delete binding records;
- handle absent/old/malformed records safely (fail closed and retain unknown records rather than deleting them).

Implementation should use bounded expiry indexes or another indexed structure with a proven bounded query; do not scan all keys on each RPC.

## Required local workerd/SQLite runtime tests

### Owner partition and quotas
1. Same owner via independently acquired stubs shares the same quota.
2. Different owners have isolated quotas and state.
3. Parallel 10-minute issuance requests: exactly 5 succeed.
4. Parallel UTC-day issuance requests spanning separate 10-minute windows: exactly 20 succeed.
5. Parallel revocation requests: configured maximum enforced atomically.
6. Retry-after points to the next exact fixed-window boundary.
7. Exact boundary resets counters; one second before boundary does not.
8. Invalid EZERO2 proof does not allocate or mutate quota.
9. Invalid Android SPKI/fingerprint does not consume issuance quota.
10. Failed approval signature does not change issued challenge state or charge issuance twice.

### Retention and alarms
11. Challenge is retained before expiry + 300 seconds and deleted at/after the boundary.
12. Consumed challenge is cleaned only after the same expiry + 300-second boundary.
13. Revocation tombstone is retained before 600 seconds and cleaned at/after the boundary.
14. Replay after tombstone cleanup still fails due to expired signed timestamp.
15. Active binding survives cleanup and eviction.
16. Revoked binding survives cleanup and eviction.
17. One alarm processes no more than 100 records.
18. Backlog causes a follow-up alarm; second run is idempotent.
19. Alarm/transaction failure leaves records safe and does not silently clear active bindings.
20. Cleanup never deletes an unknown record type.

### Regression
21. Existing 90-second challenge expiry and exact nine-line canonical request remain unchanged.
22. Same-owner P-256 proof and domain-separated approval verification remain unchanged.
23. Concurrent one-time approval consumption still has exactly one winner.
24. Owner-signed revocation and revocation replay prevention still pass.
25. No Worker route, production config, remote namespace, or live service is introduced.

## Implementation sequence

1. Add pure deterministic owner-name and fixed-window calculation helpers with unit tests.
2. Add indexed expiry records and atomic quota transactions in the ledger core.
3. Add bounded alarm scheduling/cleanup in the Durable Object class.
4. Extend test-only Wrangler config and workerd tests only as required for alarm testing.
5. Run the complete existing Node gate and local workerd/SQLite runtime suite.
6. Run Evidence Registry Validator and inspect all diffs for production/config leakage.
7. Keep the PR Draft until every required runtime test is green and a separate security review is complete.

## Gate

This preparation does not authorize implementation in production, remote deployment, a public route, or Android/browser integration. Any later deployment requires a separate explicit release decision.
