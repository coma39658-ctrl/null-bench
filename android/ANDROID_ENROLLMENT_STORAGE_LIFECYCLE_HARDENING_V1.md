# E-ZERO Android Enrollment Storage Lifecycle Hardening — V1

Status: STAGING DESIGN / NOT DEPLOYED

Base: `4182ce7dad787495e323835ac6fae4d0ffb10f4d` (PR #207 runtime-test candidate)

## Purpose

Close the storage lifecycle risks identified by the security review before any Worker deployment or Root enrollment. This document is a scope and acceptance contract; it does not claim that the controls are implemented.

## Required implementation

1. **Challenge expiry cleanup**
   - Keep the 90-second challenge validity check at completion.
   - Schedule Durable Object alarm work for the earliest outstanding challenge expiry.
   - On alarm, delete expired challenge records in bounded batches, then schedule the next due cleanup.
   - Ensure concurrent challenge creation and alarm scheduling cannot leave expired records permanently orphaned.
   - Never rely on logical expiry alone as storage cleanup.

2. **Rate-bucket retention**
   - Add explicit expiry metadata to rate-limit records.
   - Remove expired buckets through the same bounded alarm cleanup mechanism.
   - Bound each cleanup pass and reschedule when more work remains.
   - Add a documented retention horizon and test that expired records are removed.
   - Keep raw client IP addresses out of storage and logs.

3. **Abuse/cardinality controls**
   - Preserve per-IP limits, but document that IP hashing does not prevent distributed-IP bypass.
   - Add a global route ceiling and a validated per-device ceiling only where the device identity is cryptographically established; do not trust caller-supplied device identifiers.
   - Fail closed if the global limiter cannot be updated atomically.

4. **Challenge-consumption policy**
   - Preserve one-use and concurrency guarantees.
   - Explicitly test and document that invalid proof consumes the challenge and requires a fresh challenge.
   - Do not reintroduce a race by verifying signatures before reserving a one-use challenge.

5. **Root/device lifecycle**
   - Design authenticated, auditable listing, disable/revoke, and key-rotation operations.
   - Do not expose these operations through public enrollment routes.
   - Require explicit authorization and independent Root verification for any lifecycle mutation.

## Required runtime tests

- Expired challenge is rejected and physically removed after alarm execution.
- Unexpired challenge survives cleanup.
- Cleanup processes more records than one batch over multiple alarm invocations.
- Expired rate bucket is removed; active bucket remains.
- Repeated scheduling and concurrent writes do not lose the next alarm.
- Global and per-IP ceilings behave atomically under concurrent requests.
- Invalid proof consumes the challenge; replay is rejected; a fresh challenge can succeed.
- Existing six PR #207 runtime tests remain green.

## Release gates

- Run under the local Cloudflare Workers runtime (workerd/Miniflare), not static-only tests.
- Keep this branch and its PR Draft/open/unmerged.
- No Worker deployment, Root registration, secret provisioning, production configuration change, or FCM/push work is authorized by this scope.
- No claim of background ringing, saved-friend calling, or two-phone end-to-end success.
