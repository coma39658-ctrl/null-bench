# E-ZERO Connect — Standalone App Separation Architecture (Staging)

Status: DESIGN ONLY / NOT A RELEASE AUTHORIZATION  
Date: 2026-11-28  
Owner: E-ZERO  
Scope: Prepare E-ZERO Connect to become an independently deployable Android and web application without disrupting the existing E-ZERO site or other E-ZERO products.

## 1. Target outcome

E-ZERO Connect must be separable as its own product, with its own release cycle, app identity, frontend, backend contracts, operational configuration, and data boundaries. The existing E-ZERO website and OBD/dashboard products must continue to work independently.

This document establishes boundaries and migration gates. It does not move production traffic, change the current public entry point, migrate user data, or modify signing keys.

## 2. Non-negotiable safety rules

- Keep the current working audio/video call path frozen until a replacement passes equivalent two-device tests.
- Do not merge staging code into the production branch or deploy production as part of this architecture task.
- Never export, copy, log, or upload browser or Android private keys.
- Browser friendship identity (P-256 WebCrypto, IndexedDB on the canonical origin) and Android installation identity (P-256 Android Keystore) remain distinct keys with an explicit consented signature-binding protocol.
- No identity, friend, message, call, or media data is moved between origins without an explicit, reviewed migration plan and user consent.
- Push credentials, root pins, service secrets, and signing material are provisioned only through secret managers; never commit them.
- A green unit/CI test is not proof of physical device behavior. Closed-app/lockscreen incoming ringing remains unproven until tested on at least two real Android devices.
- Preserve evidence labels: PASS, FAIL, PARTIAL, UNKNOWN. Do not promote UNKNOWN to PASS.

## 3. Proposed product boundary

### E-ZERO Connect app
Owns:
- Connect UI and localization (Urdu, English, Arabic)
- Profile presentation, trusted-friend list, requests, block/delete
- QR/invite and consented identity binding
- Text, voice notes, image transfer and call history
- Audio/video call session orchestration
- Android app shell, runtime permissions, foreground service and incoming-call UI
- Connect-specific privacy controls and user-facing diagnostics

### E-ZERO platform (optional shared infrastructure)
May provide only versioned, documented capabilities through explicit interfaces:
- Account-independent service discovery and health
- Shared static brand assets and public documentation
- Approved observability with privacy-preserving metadata

No Connect feature may depend on undocumented DOM elements, global variables, filesystem paths, or implicit database tables belonging to the main E-ZERO site.

### Other E-ZERO products
OBD Dashboard, Null Bench, and future industrial tools remain separate products. They must not import Connect runtime code or receive Connect private data by default.

## 4. Deployment topology

Target topology:
- Web: dedicated Connect frontend origin (for example, a future connect-specific domain) with its own CSP, service worker scope, cache namespace, and release pipeline.
- Android: dedicated applicationId/package, signing configuration, app links, notification channels, and independent versioning.
- API: versioned Connect API with authentication and explicit authorization at every sensitive operation.
- Realtime: isolated signaling and call-session service; TURN credentials short-lived and scoped.
- Push: FCM/APNs adapter with server-side sender credentials, authenticated wake payloads, replay protection, and explicit device registration.
- Data: separate Connect data stores/collections and backups; encryption at rest and transport; retention/deletion policy.
- Environments: local/test, staging, and production use separate origins, keys, service bindings, and data. Staging must never share production secrets.

The exact hosting provider and domain are implementation choices; do not create a production service or incur new paid resources under this design document.

## 5. Internal module contracts

Recommended modules (initially logical boundaries; physical extraction happens later):

- `connect-app-shell`: navigation, responsive layout, accessibility, localization.
- `connect-identity`: browser identity read/sign operations and Android installation identity adapter. No key export.
- `connect-friends`: friend requests, active relationship registry adapter, block/revoke.
- `connect-messaging`: text, voice-note and image metadata, delivery/read state, retention.
- `connect-calls`: call state machine, WebRTC orchestration, call history.
- `connect-notifications-android`: push receipt, call notification, ringtone, Accept/Decline, lifecycle handling.
- `connect-platform-adapters`: HTTP, WebSocket, push, storage, clock and media adapters.
- `connect-observability`: redacted diagnostics and evidence records.

Each module exposes typed interfaces and does not import another module's private implementation. Cross-module communication uses documented events or interfaces. Avoid a monolithic shared global state.

## 6. Identity and origin migration warning

The existing browser Root/friendship identity is origin-bound through IndexedDB at `https://coma39658-ctrl.github.io`. A future standalone Connect origin will not automatically see that IndexedDB database. Android Keystore identity is also installation-bound.

Therefore:
1. Do not simply change the website origin and assume identity survives.
2. Do not copy browser private keys to Android or a new browser origin.
3. Preserve the old origin as a compatibility/identity recovery surface until a reviewed migration exists.
4. Use an explicit, user-consented challenge/signature ceremony to bind a new installation or origin to an already trusted identity.
5. Verify the exact Root trust anchor independently; a fingerprint displayed by the same page is not independent proof.
6. Revoke old devices and relationships through authoritative server-side state, not only local storage.

## 7. API and data rules

- Version every public API path and schema.
- Enforce authorization on the server for each relationship, message, call, and device action.
- Use one-use, short-lived challenges and atomic replay prevention.
- Recheck active relationship and device/root revocation at both write and dispatch boundaries.
- Keep push payloads minimal; do not include message bodies, private keys, or sensitive profile data in wake payloads.
- Store media outside public web roots; use short-lived authorized URLs.
- Define retention, deletion, export, and backup restore behavior before enabling persistent messaging.
- Avoid storing call audio/video unless a separately consented recording feature is designed (not in current scope).

## 8. Android low-resource performance budget

Target baseline for 4 GB devices:
- Start with 360p/480p adaptive video, low frame rate under constrained conditions, and a conservative bitrate.
- Prefer hardware codec when available; gracefully fall back to audio-only if memory, thermal state, or network quality degrades.
- Stop camera/microphone capture immediately on call end or permission loss.
- Avoid background polling and duplicate WebSocket connections.
- Bound image/voice-note size, queue length, and in-memory media buffers.
- Test cold start, background/foreground transitions, screen-off calls, battery optimization, and weak-network recovery on physical devices.

These are design targets, not measured performance claims.

## 9. Release and migration gates

### Gate A — Boundary inventory
Map all current Connect entry points, scripts, storage keys, service workers, API endpoints, Worker/DO bindings, Android components, and secrets. Mark each as Connect-owned, shared, or legacy.

### Gate B — Contract tests
Add tests proving:
- Connect modules do not import OBD/dashboard runtime modules.
- Staging and production origins/configuration are distinct.
- No secret or private-key material appears in built artifacts or logs.
- Every sensitive endpoint checks active relationship/device authorization.
- No write/call action is possible from read-only Root identity preview.
- Existing call flow contract remains unchanged during extraction.

### Gate C — Parallel staging shell
Build a separate Connect shell that consumes the same stable interfaces. Do not replace the current entry point. Use test identities and synthetic data only.

### Gate D — Two-device validation
Run QR pairing, saved-friend reconnect, text, voice note, image, audio/video, app-background, screen-off, push wake, accept/decline, network loss/recovery on two real Android devices. Record device models, OS versions, timestamps, logs, and exact outcomes. Closed-app ringing must be physically verified before any such public claim.

### Gate E — Data and identity migration rehearsal
Rehearse with disposable test identities; verify rollback, duplicate prevention, revocation, and account recovery. Never use real user keys in a rehearsal.

### Gate F — Independent release approval
Only after all prior gates pass, present a release diff, data impact, hosting cost, rollback plan, and evidence summary for explicit production approval.

## 10. Rollback strategy

- Keep the existing public E-ZERO entry point and working call implementation available throughout staging.
- Use separate staging service names, origins, credentials, and data stores.
- Do not perform destructive schema changes; use additive, versioned migrations.
- Keep the old client compatible during the transition.
- A rollback must restore the previous app artifact and service routing without requiring key export or deleting the user's existing local identity.
- If any gate fails, stop at the last known-good staging version and report the exact failure.

## 11. Current status and limitations

- This is an architecture proposal only.
- No production code has been extracted or replaced by this document.
- Existing browser identity is origin-bound; new-origin continuity is not solved by deployment alone.
- Browser-to-Android consented signing relay remains a separate implementation task.
- Root trust-anchor provisioning and authenticated push dispatch remain separate security prerequisites.
- Android closed-app/lockscreen ringtone behavior remains UNKNOWN until physical validation.

## 12. Decision record

Accepted direction: E-ZERO Connect should be independently deployable while remaining interoperable with E-ZERO through explicit, versioned contracts.

Not authorized by this document: production merge, production deploy, domain cutover, package signing changes, real-user data migration, secret provisioning, or enabling unverified push/call behavior.
