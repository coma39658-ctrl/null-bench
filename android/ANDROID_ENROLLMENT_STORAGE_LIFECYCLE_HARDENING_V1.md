# E-ZERO Android Enrollment Storage Lifecycle Hardening — V1

Status: PARTIAL STAGING IMPLEMENTATION / NOT DEPLOYED

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

## Implementation progress — alarm cleanup slice

Implemented on branch `ezero-enrollment-alarm-cleanup-staging-20261125`:

- Challenge and rate-bucket expiry rows use a timestamp-sorted index.
- Durable Object alarms process at most 100 expiry rows per invocation.
- Expired challenge rows and expired rate buckets are deleted with their index rows.
- A stale rate-bucket index cannot delete a bucket refreshed into a newer window.
- Cleanup reschedules itself for the next expiry; overdue batches yield to another alarm after one second.
- Completion atomically consumes the challenge and removes its expiry index.
- Runtime tests added for expired challenge cleanup, unexpired challenge retention, multi-batch cleanup, and expired rate-bucket cleanup.

Not yet verified: these new tests must pass in the Cloudflare Workers runtime CI. Global abuse ceilings, validated device-level limits, Root/device lifecycle endpoints, and broader concurrency/scheduling race tests remain open. No deployment or Root registration has occurred.

## Implementation progress — shared rate ceilings

Added on branch `ezero-enrollment-global-rate-ceiling-staging-20261125`:

- The existing per-IP bucket and a shared per-route bucket are updated in one Durable Object storage transaction.
- Challenge route ceiling: 300 requests per minute across all source IPs; existing per-IP ceiling remains 10/minute.
- Root registration ceiling: 20 requests per hour globally; existing per-IP ceiling remains 3/hour.
- Shared buckets use fixed route identifiers, and IP-specific bucket keys remain SHA-256 digests; raw IP values are not persisted.
- Storage/transaction failure returns `RATE_LIMIT_UNAVAILABLE` (503) and does not proceed with enrollment.
- Runtime tests added for 301 concurrent requests across distinct IPs (exactly 300 accepted) and 11 concurrent requests from one IP (exactly 10 accepted).

Not implemented: per-device ceilings. Device identity must be established by a valid cryptographic proof before it can safely be used as an abuse-control identity. No deployment or production configuration change.

## Implementation progress — signed Root device lifecycle (staging candidate)

Added on branch `ezero-enrollment-root-lifecycle-staging-20261127`:

- `POST /v1/admin/root/devices/list` returns at most 100 device records belonging to the signing Root. It omits device public keys and other unnecessary material.
- `POST /v1/admin/root/devices/revoke` disables one device only when the active Root signs the exact command.
- Commands bind Root fingerprint, unique command ID, action, device fingerprint, 24-byte nonce, canonical E-ZERO audience and a maximum 60-second expiry.
- P-256/SHA-256 signature verification happens before an atomic transaction consumes the command ID. The transaction rechecks Root activity, rejects replay, updates device state and appends a privacy-minimized audit record.
- Replay records are retained for 24 hours; audit records are retained for 365 days and removed through bounded expiry alarms.
- Root lifecycle routes require the canonical browser Origin, JSON POST, per-IP and shared admin rate limits. No bootstrap secret or private key is stored in source.

### Remaining release blockers

- Root revocation and full Root key rotation/recovery are not implemented. Device listing/revocation is only a partial closure of H5.
- Android Keystore client, Root approval UI, and the native registration integration remain absent.
- The signed-command protocol and new Worker runtime tests must pass CI and receive independent security review.
- The 365-day audit retention policy requires human approval.
- This branch is isolated, not deployed. No Root has been registered and no FCM token or push sender is present.

## Follow-on implementation — authenticated FCM token registration (staging candidate)

Added to the isolated Worker candidate:

- `POST /v1/android/device-token` accepts a token only for an already-enrolled, active device.
- Android device P-256 proof-of-possession signs a canonical message binding the device fingerprint, SHA-256 digest of the FCM token, unique command ID, issue time, 24-byte nonce and canonical E-ZERO audience.
- The Worker checks the active enrollment record and re-verifies the enrolled public key fingerprint before accepting the signature.
- Commands older than 60 seconds, malformed tokens, invalid signatures and replayed command IDs are rejected.
- Token replacement and replay/audit records are committed in one Durable Object transaction. The raw token is stored only in the isolated server-side Durable Object for later FCM delivery; it is not returned in the response or written to logs.
- Device revocation now clears the stored FCM token and token digest as part of the same atomic state update.
- Tests cover valid token registration, replay rejection, forged device signature rejection, and rejection after device revocation.

### Boundaries

This is a server-side token-registration endpoint only. The Android `onNewToken()` client hook, authenticated token refresh from the native app, Firebase Admin sender credentials, actual FCM delivery, call-wake route and native Accept-to-WebRTC handoff are still not wired. No token has been registered and no push has been sent. The Worker remains isolated and not deployed.
