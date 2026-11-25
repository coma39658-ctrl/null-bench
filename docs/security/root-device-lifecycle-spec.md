# E-ZERO Root and Device Lifecycle — Security Specification

Status: staging design only. This document does not authorize deployment, Root registration, secret provisioning, device enrollment, or production changes.

## 1. Purpose and scope

Define the security contract for future Root/device lifecycle operations after the Android enrollment Worker has passed isolated runtime tests and bounded-storage/rate-limit hardening.

The lifecycle surface may eventually support:
- authenticated, read-only listing of the active Root identity and enrolled devices;
- auditable device revocation;
- controlled device-key rotation;
- read-only audit-history retrieval.

This specification does not implement or expose those endpoints.

## 2. Non-negotiable trust boundaries

1. The canonical Root identity origin remains `https://coma39658-ctrl.github.io`.
2. A QR code or enrollment challenge is a transport/bootstrap mechanism, not proof that a Root is trusted.
3. Root trust must be established out-of-band by checking the complete 64-hex-character SHA-256 fingerprint through a separately trusted channel (for example, in-person or trusted voice confirmation).
4. The Root bootstrap secret must contain at least 32 cryptographically random bytes and exist only in the platform secret manager. It must never appear in source control, PR text, chat, QR payloads, APKs, browser storage, logs, command history, or test fixtures.
5. No Root is registered and no bootstrap secret is provisioned by this change.
6. No caller-supplied device identifier, display name, IP address, or client timestamp may establish authority.
7. Existing audio/video calling and production entry flows remain untouched.

## 3. Proposed operation model

### Read-only operations
- Root identity status: return only public identity metadata, fingerprint, key version, and registration status.
- Device inventory: return opaque device ID, public-key fingerprint, enrollment time, last-seen time if available, status, and key version. Never return private keys, tokens, bootstrap material, or raw IP addresses.
- Audit history: return bounded, paginated, append-only events with stable cursors and server timestamps.

All read operations require authenticated Root/device authorization, explicit Origin policy for browser clients, and strict response minimization. Native clients with absent Origin may be allowed only through a separately authenticated native-client path; absent Origin is not itself authentication.

### Mutating operations
- Revoke device: Root-authorized, target device identified by server-issued opaque ID; require idempotency key, reason code, and an audit event.
- Rotate device key: require proof of possession by the currently authorized key plus proof of possession of the proposed new key; require Root authorization and an atomic version transition.
- Rotate Root key: separate high-assurance ceremony; not part of ordinary device rotation. Require out-of-band fingerprint confirmation, dual-control or equivalent recovery policy, explicit rollback/recovery plan, and append-only audit event.

No operation may silently recreate a Root, downgrade a key version, or reactivate a revoked device.

## 4. Authorization and protocol requirements

- Every request is authenticated with a short-lived, audience-bound, purpose-bound proof.
- Bind signatures to HTTP method, canonical path, request-body digest, challenge/nonce, key version, and expiry.
- Enforce single-use nonces and replay rejection atomically.
- Use server time; reject expired or excessively future-dated proofs.
- Enforce per-IP and global rate ceilings already established in the enrollment Worker, plus authenticated-principal ceilings after identity proof.
- Fail closed if authorization, durable storage, audit append, or rate-limit transactions are unavailable.
- Use constant-time comparison for secret-derived MACs and fingerprints where applicable.
- Validate canonical Origin and path; do not treat CORS as an authorization mechanism.
- Avoid leaking whether a device ID exists before caller authorization.

## 5. Audit integrity and retention

Audit events must include:
- server-generated event ID and timestamp;
- actor public-key fingerprint and authorization scope;
- action and target opaque ID;
- outcome and stable reason code;
- idempotency key digest (never the raw key);
- key version and request correlation ID.

Audit records are append-only from the application perspective. Mutations and their audit events must commit atomically. No secrets, private keys, raw IP addresses, full tokens, or personal message/call content may be logged. Define retention and export policy before implementation; deletion/retention jobs must be bounded and tested.

## 6. Concurrency, failure, and recovery

- Concurrent revocation and key rotation must serialize per target device.
- Exactly one conflicting state transition may succeed; all others return a stable conflict result.
- Repeated idempotent requests must return the original result without duplicating audit events.
- Partial writes are forbidden: state change without audit event, or audit event without state change.
- Revoked credentials must be rejected immediately by every protected operation.
- Storage failure, alarm failure, or audit failure must never permit unmetered or unaudited mutation.
- Recovery must not restore revoked keys or lower the monotonic key version.

## 7. Required isolated runtime tests before implementation is accepted

1. Unauthenticated Root/device inventory is rejected.
2. Authenticated read-only inventory exposes only allowlisted public fields.
3. Foreign browser Origin is rejected; allowed native absent-Origin requests still require cryptographic proof.
4. Replayed, expired, wrong-audience, wrong-method, wrong-path, or wrong-body proofs are rejected.
5. Concurrent duplicate revocation yields one state transition and one audit event.
6. Repeated idempotent revocation returns the stable original result.
7. Concurrent key rotations serialize and cannot roll back key versions.
8. Revoked devices cannot call any protected lifecycle route.
9. Audit append failure rolls back the state mutation.
10. Storage/limiter failure returns fail-closed errors.
11. Enumeration attempts do not reveal device existence to unauthorized callers.
12. Pagination is bounded, stable, and does not skip or duplicate events.
13. No secrets or raw IP addresses appear in logs, responses, artifacts, or fixtures.
14. Root rotation requires the separate out-of-band ceremony and cannot be invoked through ordinary device APIs.

## 8. Release gates

This design may proceed to implementation only after:
- review of the current enrollment and abuse-control implementation;
- an explicit endpoint and data-schema review;
- threat-model review covering lost Root device, compromised device, recovery, and insider abuse;
- runtime tests for authorization, atomicity, replay, concurrency, audit integrity, and revocation propagation;
- independent confirmation of the Root fingerprint through a trusted out-of-band channel.

Deployment, Root registration, secret provisioning, production configuration changes, and any public release require separate explicit approval.