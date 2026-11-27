# E-ZERO Offline Call Queue V1 — staging implementation contract

Status: **PARTIAL IMPLEMENTATION IN PR #240 — NOT ROUTED, NOT DEPLOYED, NOT END-TO-END VERIFIED**

Parent security baseline: PR #238 (signed P-256 saved-friend call authorization). This document defines the next isolated server stage. It does not change the current WebSocket inbox, browser WebRTC engine, pairing UI, production Worker, or Android APK.

## Implementation snapshot (reviewed 2026-11-27)

The isolated Durable Object module now exists at `signaling/ezero-offline-call-queue-v1/worker.mjs`. Its implemented internal interface is `POST /internal/v1/create`, guarded by the `X-EZERO-Queue-Internal` shared secret; its recipient-device actions are `POST /v1/claim` and `POST /v1/reject`. It enforces one pending call per installation, bounded payload/expiry, call and nonce replay checks, P-256 recipient-installation proof, and a serialized one-time claim/reject transition. Unit coverage is in `tests/test_ezero_offline_call_queue_v1.mjs`.

This is a queue primitive, not the full contract described below. The module does **not** itself consult the Friendship Registry, verify the caller-signed invite, resolve an ACTIVE root-approved device enrollment, look up or protect an FCM token, enforce caller/device rate limits, or send FCM. Its internal shared-secret check authenticates only the caller holding that secret; the upstream service must perform all authorization checks before creation. No public route or Durable Object binding is active. The Android app does not yet call `/v1/claim` or `/v1/reject`, and its Accept action remains a placeholder without WebRTC handoff.

The proposed public-facing endpoint shapes later in this document remain target interfaces, not implemented routes. Do not infer route activation from the presence of the Durable Object class or passing unit tests.

## Goal

Wake an enrolled recipient Android installation when it has no active WebSocket, retain the already caller-signed invitation briefly, and let that same installation fetch the invitation exactly once after the user accepts. FCM is a wake-up hint only; it never carries the invite, SDP, ICE, caller alias, relationship secret, or bearer credential.

## Required trust chain

1. The existing call controller verifies the caller's signed `E-ZERO-SAVED-FRIEND-CALL-1` invite and obtains the Registry's server-authoritative authorization result. The Registry must confirm an ACTIVE, non-revoked, mutually approved relationship, caller and recipient fingerprints, mode, call ID, nonce, canonical origin, and expiry.
2. The recipient fingerprint must resolve to an ACTIVE, root-approved Android installation. The FCM token must have been registered by that installation using its enrolled device-key proof. A token by itself is never device identity.
3. The recipient device must have a locally verified saved-friend record for the caller before it displays the trusted caller name. Push-supplied names are forbidden.
4. Only after steps 1–3 succeed may the backend atomically create the pending-call record and invoke the isolated FCM sender.
5. Android verifies the server-signed wake, freshness, exact schema, and persistent replay guard. It must then fetch/authenticate the pending invitation before showing the trusted incoming-call UI. If fetch/authentication fails, no trusted caller identity or call acceptance is shown.

## Proposed isolated interfaces

### Create pending call (internal service-to-service only)

`POST /internal/v1/calls/pending`

- Must not be publicly callable by arbitrary browser clients.
- Caller is the already-authenticated inbox/call controller, using an authenticated service binding or equivalent unforgeable Worker-to-Worker identity.
- Request contains the verified signed invite, caller/recipient fingerprints, relationship ID, and server authorization context. It must not accept client-supplied `authorized: true`.
- Re-check the Registry authorization server-side; do not trust an Origin header as authentication.
- Resolve recipient fingerprint to one ACTIVE enrolled installation and its current FCM token.
- Enforce call-ID and nonce uniqueness, one active pending/ringing call per recipient, per-caller/per-device rate limits, block/revocation state, and short TTL.
- Atomically persist the pending invite before attempting FCM. If FCM fails, retain it only until expiry and return a retry-safe delivery status; do not create duplicate calls on retry.

### Fetch pending call (recipient device only)

`POST /v1/android/calls/{call_id}/accept`

- Authenticate the exact enrolled installation with a fresh P-256 device-key proof over method, path, call ID, timestamp, nonce, and request-body hash.
- Bind the proof to the recipient fingerprint and installation ID stored in the pending record.
- Atomically transition PENDING → CLAIMED and return the caller-signed invite only to the matching recipient installation.
- A second fetch, wrong device, wrong recipient, expired call, revoked relationship, blocked friend, cancelled call, or replayed proof must fail closed.
- The Android app must verify the caller invite and local saved-friend relationship again before handoff to the existing PWA WebRTC engine.

### Reject/cancel/expiry

- Recipient Reject consumes/revokes the pending call using the same device proof.
- Caller Hangup cancels the pending call using authenticated caller identity and call ID.
- Expiry is enforced on every read/write, with storage TTL cleanup as a secondary mechanism.
- Queue state is minimal: opaque call ID, relationship ID, caller/recipient fingerprints, recipient installation ID, signed invite, mode, issued/expiry timestamps, nonce hash, status, and audit-safe event timestamps. Never store media, chat content, SDP, ICE, or private keys.

## Durable storage and concurrency

- Use one Durable Object per recipient installation (or another single-writer key) so call admission, busy state, replay protection, claim, cancel, and expiry are atomic.
- Do not rely on eventually consistent KV for one-time claims or replay prevention.
- Cap pending records and body sizes; reject overload explicitly.
- Store only the minimum data needed for the short invite lifetime. Encrypt sensitive invite material at rest if the chosen platform/storage boundary does not already provide an adequate documented protection.
- Never log FCM tokens, signed invites, device proofs, access tokens, service-account JSON, or private keys.

## FCM wake contract

- Reuse `signaling/cloudflare/src/fcm_call_wake_sender_v1.js` only after the queue and authorization checks pass.
- Data-only HIGH-priority message; TTL must not exceed the pending invite expiry.
- Allowed fields only: `wake_v`, `call_id`, `mode`, `expires_at`, `nonce`, `server_sig`.
- The server signing public key must be independently fingerprint-verified and pinned in the staging Android build. Empty/missing pin remains fail-closed.
- FCM delivery is best-effort. The durable pending invite remains authoritative; app reconnect can discover/fetch a valid pending call through authenticated sync.
- Do not claim force-stopped Android apps can always be woken. Report OEM battery, notification permission, full-screen intent permission, and force-stop limitations separately.

## Mandatory tests before route activation

- No FCM call before successful signed-invite and active-relationship authorization.
- Forged/unsigned invite, wrong origin, wrong caller key, revoked/blocked relationship, wrong recipient, unapproved/unregistered device, stale token, and wrong installation all rejected.
- Duplicate call ID, duplicate nonce, simultaneous call, busy recipient, rate-limit, FCM send failure, queue retry, expiry, cancellation, and race between Accept/Reject tested.
- Device A cannot fetch Device B's invite; a second claim cannot fetch it again.
- FCM contains only the six allowed fields and never contains the invite or identity metadata.
- Android verifies server signature and replay guard, fetches invite, verifies caller signature and saved-friend identity, and only then displays trusted incoming-call UI.
- Existing browser WebRTC, saved-friend reconnect, QR, and two-device call suites remain green.

## Release gates

1. Contract and unit tests pass.
2. Queue module and FCM sender are wired only in a new isolated staging Worker with separate Durable Object binding and secrets.
3. Static/dry-run and staging integration tests pass; no production route or production secret is touched.
4. Android staging public-key pin is independently checked and build artifact is preserved.
5. Two physical phones verify foreground, background, locked screen, swiped-away app, notification/full-screen permissions, Accept, Reject, cancel, and actual WebRTC handoff.
6. Only then may the stage be described as end-to-end PASS. Force-stop remains a separately documented Android platform condition.

## Known integration gaps to close

- The queue module's internal creation guard is a staging shared secret only; integrate it behind a trusted service binding or equivalent non-browser service identity, and re-check Registry authorization, active mutual friendship, block/revocation, device enrollment, and recipient-key provenance before every create.
- The current queue routes (`/internal/v1/create`, `/v1/claim`, `/v1/reject`) differ from the target API shapes above. Add an authenticated Worker adapter that binds each Durable Object to the exact recipient installation; do not expose the raw class directly.
- The queue currently has no caller-authenticated cancellation route, FCM dispatch, Android queue-backed authenticated fetch, or Accept-to-WebRTC bridge.
- The current Android `MainActivity` Accept handler is still a placeholder and does not fetch a pending invite or hand off to WebRTC. Reject currently dismisses only the local notification; it does not consume the server queue.
- The native messaging service verifies a server-signed wake and persistent replay guard, then shows the alert. The queue-backed authenticated invite fetch is not integrated; therefore a wake is not yet proof of a fetchable, authorized call.
- The low-level FCM sender is a transport helper, not a call authorization route. No active Worker entrypoint invokes it.
- The existing browser inbox remains WebSocket-oriented; offline queue creation and wake routing are not yet wired to it.
- No Firebase live delivery, audible lock-screen ringing, or native-to-WebRTC physical test is claimed by this document.
