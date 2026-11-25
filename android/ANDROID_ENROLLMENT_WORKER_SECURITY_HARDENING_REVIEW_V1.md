# E-ZERO Android Enrollment Worker — Security Hardening Review V1

Status: **staging review only**. This document records code-review findings and release gates. It does not authorize deployment, Root registration, secret provisioning, merging, or production changes.

Reviewed candidate: 'ezero-android-enrollment-worker-integration-staging-20261125'  
Reviewed Worker: 'signaling/cloudflare/src/android_enrollment_candidate_v1.js'

## Confirmed design properties

- Android enrollment challenge and completion are separate proof-gated routes.
- A challenge binds a device public key fingerprint, nonce, audience, and expiry.
- Completion verifies both device proof-of-possession and an already registered Root approval.
- Challenge reservation is atomic before asynchronous signature verification, preventing concurrent replay of the same challenge.
- Raw client IP is hashed before it is used as a Durable Object rate-limit key.
- The candidate Worker is isolated and is not the active Worker.
- No FCM token, push sender, background call delivery, or call permission is implemented.

## Findings requiring closure before any deployment

### H1 — Expired, unused challenges have no demonstrated cleanup

Challenge creation stores challenge:<id> records. A record is deleted on completion, but abandoned or expired challenges are not currently shown to be removed by a scheduled or bounded cleanup path. Repeated challenge requests could therefore grow Durable Object storage.

Required remediation:
1. Define a maximum challenge retention window and storage budget.
2. Add bounded cleanup that cannot block request handling or delete live challenges.
3. Add tests proving expired records are removed and unexpired records remain.
4. Define behavior when cleanup fails or storage reaches its budget.

### H2 — Rate-limit records have no demonstrated expiry or cardinality bound

The rate-limit key is stable per route and hashed IP, and the stored window counter is overwritten on subsequent windows. This avoids one record per time window, but a new key can remain for every distinct IP ever seen. No expiry or bounded cardinality policy is currently demonstrated.

Required remediation:
1. Use a supported Durable Object storage expiry mechanism or bounded cleanup.
2. Verify actual expiry behavior in the Workers test runtime, not only source-pattern tests.
3. Set a retention period consistent with the abuse-control purpose.
4. Ensure cleanup cannot remove an active window counter.

### H3 — IP-only limits can be bypassed by distributed clients

Current limits are per route and IP. A distributed source can obtain multiple buckets. Keep IP throttling as one layer, but consider a second independent limit keyed by device fingerprint after it is validated, plus a global or Durable Object-level emergency ceiling.

Required remediation:
- Specify limits and response behavior for per-IP, per-device, and global ceilings.
- Avoid using unvalidated caller-supplied fingerprints as trusted identity.
- Add tests for spoofed fingerprints, multiple IPs, and concurrent requests.
- Do not claim that rate limiting prevents distributed denial of service.

### H4 — Invalid proof consumes a valid challenge

The completion path atomically deletes/reserves the challenge before checking the device and Root signatures. This prevents replay races, but anyone who obtains the challenge ID can submit an invalid completion and burn it, forcing a new challenge.

This is a deliberate fail-closed tradeoff, not automatically a defect. Before release, choose and document one policy:
- retain single-use reservation-before-verification and accept challenge-burn denial-of-service risk, with throttling and short expiry; or
- introduce an atomic state machine (issued → verifying lease → consumed) that preserves concurrency/replay protection while allowing safe recovery from failed verification.

Do not simply move deletion after signature verification: that could allow concurrent requests to race and both pass.

Required tests:
- two concurrent valid completions yield exactly one enrollment;
- invalid device proof does not enroll;
- invalid Root signature does not enroll;
- challenge expiry and replay fail closed;
- behavior after an interrupted verification is deterministic.

### H5 — Device and Root lifecycle controls are absent

The candidate stores active Root and device records but does not yet provide a reviewed listing, revocation, rotation, or audit workflow.

Required remediation:
- authenticated Root-only device listing;
- explicit device revocation and Root revocation;
- revocation takes effect for future enrollment and any future push authorization;
- append-only, privacy-minimized audit events for enrollment, denial, revocation, and Root rotation;
- documented recovery for lost Root browser storage and compromised devices;
- no raw secrets, private keys, FCM tokens, or raw IP addresses in audit records.

## Validation plan

The current CI source-contract checks are useful regression guards, but they do not demonstrate live Durable Object semantics. Before deployment, add an isolated Workers runtime test suite (for example, the repository's approved Miniflare/Wrangler test harness if present) covering:

1. Real Durable Object storage transaction and concurrent challenge completion.
2. Rate-limit windows, Retry-After, stable hashed-IP keys, and expiry.
3. Challenge expiry cleanup and storage bounds under repeated abandoned requests.
4. Distributed-IP and per-device limits.
5. Root/device listing and revocation authorization.
6. Worker restart/retry behavior and interrupted completion.
7. CORS and native Android Origin behavior on every route.

Record test runtime/version and distinguish static source checks from executable Worker behavior.

## Release gates

- [ ] H1–H5 reviewed and closed or explicitly accepted by a named human release authority.
- [ ] Worker-runtime tests pass; static tests alone are insufficient.
- [ ] Root fingerprint compared over a separate trusted channel.
- [ ] Bootstrap secret generated and provisioned only in the platform secret manager.
- [ ] Candidate Worker deployed only to a separately approved staging environment.
- [ ] Root registration separately authorized and audited.
- [ ] Device listing/revocation tested before any real device enrollment.
- [ ] Production deployment separately approved.

## Explicit non-claims

This enrollment work does not implement or prove FCM token registration, push sending, incoming call ringing while the app is closed, saved-friend calling, or two-phone end-to-end calling. Those remain separate workstreams and require physical device tests.
