# E-ZERO Incoming Call Wake — Stage 8 Enrollment Endpoint Contract Gate
Date: 2026-11-20
Status: CONTRACT DESIGN ONLY — NO ENDPOINT IMPLEMENTED OR DEPLOYED

## Purpose
Define the server API boundary for a future staging-only Android push-token enrollment implementation. This is a protocol/API design artifact. It does not authorize Firebase project selection, credentials, endpoint implementation, route registration, Durable Object binding, deployment, or Android integration.

## Stage 7 dependency
The Stage 7 FCM enrollment trust model remains authoritative. A push token is an opaque delivery address, never an identity credential. Every state-changing operation requires authenticated owner and installation proof.

## Proposed API surface (not live routes)
All paths below are names for review only; no Worker route exists:
- POST /v1/android/enrollment/challenges — issue a short-lived, owner-scoped challenge.
- POST /v1/android/enrollments — consume a valid challenge and create a pending/approved token association only after owner approval proof.
- POST /v1/android/enrollments/{installation_id}/token-rotation — replace a token only with fresh proof.
- POST /v1/android/enrollments/{installation_id}/revocation — idempotently revoke the installation and token association.
- GET /v1/android/enrollments/{installation_id} — return minimal owner-scoped status, never the token.

## Request and response boundaries
- Challenge request: protocol version, opaque installation ID, installation public key, authenticated owner context. Server creates challenge ID, cryptographically random nonce, created/expires timestamps.
- Enrollment request: challenge ID, nonce, exact canonical proof, public key, opaque FCM token. Token is accepted only after all proof checks pass.
- Rotation request: fresh challenge and owner/device signature binding old installation, new token digest, protocol version, and operation purpose.
- Revocation request: installation ID, fresh owner authorization, idempotency key.
- Responses: protocol version, opaque IDs, state enum, server timestamps, stable machine-readable error code. Never echo token, nonce after consumption, signature material, or private data.
- Status response may disclose only installation ID, key fingerprint, lifecycle state, created/expiry/revoked timestamps, and coarse token-present boolean to the authorized owner.

## State machine
CHALLENGE_ISSUED -> ENROLLMENT_ACTIVE -> TOKEN_ROTATION_PENDING -> ENROLLMENT_ACTIVE
ENROLLMENT_ACTIVE -> REVOKED
CHALLENGE_ISSUED -> EXPIRED
Any invalid proof, replay, owner mismatch, revoked identity, or unsupported version -> REJECTED (no state mutation).

A revoked installation is terminal. Reinstall creates a new random installation ID and a new key; no token refresh can reactivate a revoked identity.

## Atomicity and persistence requirements
- Challenge consumption, quota reservation, enrollment creation, and token association must be one atomic transaction.
- Unique constraints: challenge ID, nonce digest, owner + installation ID, installation public-key fingerprint, and idempotency key scoped to owner + operation.
- Store only a keyed digest for lookup/audit where practical; if the raw FCM token must be retained for delivery, encrypt it at rest with managed key material, isolate access to the sender component, and exclude it from logs/traces/errors.
- Never persist challenge plaintext after consumption; never log request bodies, signatures, raw tokens, authorization headers, or cryptographic secrets.
- Owner partition is derived from authenticated server context, never trusted from a client-supplied owner ID.
- Rate limits must be checked and consumed atomically with state mutation; rejected invalid signatures must not burn a valid owner's quota unless a separate abuse bucket is explicitly specified.

## Error contract
Stable errors: AUTH_REQUIRED, OWNER_PROOF_INVALID, INSTALLATION_PROOF_INVALID, CHALLENGE_NOT_FOUND, CHALLENGE_EXPIRED, CHALLENGE_REPLAYED, OWNER_PARTITION_MISMATCH, INSTALLATION_REVOKED, TOKEN_INVALID, RATE_LIMITED, VERSION_UNSUPPORTED, STATE_CONFLICT.
Errors reveal no token, owner existence, key material, or cross-owner record details. Unknown fields are rejected.

## Privacy and data minimization
Never store profile photos, contact lists, phone numbers, chat messages, call history, SDP, ICE, media URLs, audio, or video in this enrollment subsystem. Do not expose raw tokens through read APIs. Define token retention/deletion and audit retention separately; expired and revoked token associations are removed according to a reviewed schedule.

## Required test matrix before implementation
1. Valid owner + device proof creates exactly one association.
2. Token-only request cannot enroll, rotate, or reactivate.
3. Expired, replayed, malformed, wrong-version, and wrong-owner challenges fail closed.
4. Concurrent challenge consumption creates at most one enrollment.
5. Concurrent token rotations cannot overwrite a newer accepted token.
6. Revocation is immediate, idempotent, and terminal.
7. Owner A cannot read, rotate, revoke, or infer Owner B records.
8. Invalid proof does not consume the legitimate quota; valid concurrent operations enforce configured limits atomically.
9. Raw tokens, signatures, request bodies, and authorization headers never appear in logs or error responses.
10. Status endpoint never returns a raw push token.
11. Retention cleanup deletes expired/revoked token associations without deleting active or unknown records.
12. FCM delivery and Android ringing remain separate DEVICE evidence gates.

## Explicit non-goals and approval gates
- No Firebase project/configuration or provider credentials.
- No FCM token acquisition, registration, sender, or delivery.
- No Worker route, Durable Object binding, migration, remote runtime, or deployment.
- No Android app, UI, notification, ringtone, lock-screen, QR, contact, media, chat, or WebRTC changes.
- No public website or production change.
- Before endpoint implementation, owner must approve the exact staging Firebase project and separately authorize credential handling. Before any remote staging deployment, obtain separate explicit deployment approval. Production always requires separate approval.

## Evidence labels
DESIGN = this API contract only.
CI = static/contract guard tests only.
RUNTIME = isolated implementation exercised in its actual local runtime.
DEVICE = physical Android FCM delivery/ringing.
PRODUCTION = separately approved production rollout.
DESIGN/CI cannot be represented as RUNTIME, DEVICE, or PRODUCTION.
