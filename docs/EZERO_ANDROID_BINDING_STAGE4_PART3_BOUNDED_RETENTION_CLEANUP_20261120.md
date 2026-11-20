# E-ZERO Android Binding Stage 4 Part 3 — Bounded Retention Cleanup

Status: isolated implementation candidate; Draft PR only; not merged or deployed.

## Scope

This part adds expiry indexing and a Durable Object alarm cleanup path to the test-only Android binding ledger. It does not add a Worker route, production namespace binding, Wrangler migration, deployment, browser integration, Android UI integration, or calling/chat/media integration.

## Retention policy

| Record | Expiry |
|---|---:|
| Challenge record (issued or consumed) | Challenge expiry + 300 seconds |
| Revocation replay tombstone | Consumption time + 600 seconds |
| Fixed-window quota counter | Window end + 300 seconds |
| Active or revoked binding | No automatic expiry |

Permanent binding records are never added to the expiry index.

## Implementation

- `android_binding_retention_v1.cjs` classifies only the three temporary record families and creates a lexicographically sortable expiry index key.
- The adapter writes the primary record and its expiry index in the same Durable Object storage transaction.
- The adapter schedules the next Durable Object alarm from the earliest indexed expiry.
- The alarm processes no more than 100 index rows per invocation.
- Each deletion is performed transactionally. A target is deleted only when its current record still has the exact expiry represented by its index.
- Stale index entries may be removed without deleting a mismatched target. Unknown record families are not eligible.
- If more than 100 expired records remain, the next alarm is scheduled promptly and another bounded batch runs.
- The cleanup operation is idempotent. Active and revoked bindings are preserved indefinitely.

## Tests

The runtime test suite includes retention-policy tests for all temporary record types, a 101-record backlog split across two batches, permanent binding preservation, future-record preservation, and stale-index safety. The existing workerd/SQLite suite also exercises the adapter transaction path that creates the expiry indexes.

A green CI run is required before this part can be considered passed. These tests are not physical-device tests and do not authorize integration or deployment.

## Release boundary

This branch and its test-only Wrangler config remain isolated. Keep PR in Draft until the workerd/SQLite runtime gate and Evidence Validator are green and a separate review confirms alarm scheduling, transaction behavior, retention semantics, and the unchanged production configuration.
