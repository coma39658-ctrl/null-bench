# E-ZERO Connect — Unified Native App Integration Gate V1

Date: 2026-11-28  
Status: **STAGING INTEGRATION BASELINE — NO FEATURE MERGE OR RUNTIME CLAIM**  
Branch: `ezero-connect-unified-native-integration-staging-20261128`  
Parent: server-authoritative saved-friend call-routing candidate `b06522852ba9c65187fc55e49336affdfa9af5d7` (PR #235).

## Goal

Bring the existing E-ZERO Connect experience into one separately packaged Android app without replacing the already-tested browser WebRTC media engine or weakening the current identity and saved-friend trust model.

The target app has one user-facing home and these connected areas:
1. Profile and verified identity
2. Permanent QR scan / gallery import / one-time friend approval
3. Trusted Friends list, search, profile photo and block/delete
4. Audio and video calling
5. Text chat, voice notes and image sharing
6. Call history and incoming-call notification/ringtone
7. Urdu, English and Arabic UI

The app must remain usable on a 4 GB Android phone. Heavy media features load only when needed.

## Important repository integration finding

The implementation is currently split across independent draft PR chains. These are **not one tested, merge-ready branch**. The branch ancestry and overlapping Android files differ, so blindly merging them risks dropping newer security fixes or overwriting the native host.

Relevant existing chains:
- PR #233 → #234 → #235: Android signed wake hardening, WebRTC handoff contract, server-authoritative saved-friend call routing.
- PR #228 → #229 → #230: browser-to-Android trusted-contact import, exact saved-friend gate, offline call queue.
- PR #231 → #232 → #233: authenticated FCM token registration and sender foundation.
- PR #243 → #245 → #246: browser/Android dual-signature identity binding and QR proof validator.
- PR #248 / #249: standalone app architecture and repository boundary audits.

All these PRs are draft/open candidates at the time of this integration plan. Their branch contents must be reconciled by file and test, not assumed to be cumulatively integrated. This branch intentionally starts from PR #235 so the call-routing and WebRTC handoff contract remains visible as the integration anchor.

## Target component map

| User-facing area | Existing implementation | Integration boundary |
|---|---|---|
| Android app shell | `android/app`, package `com.ezero.connect` | One native launcher and navigation shell |
| Profile / Root identity | Browser permanent identity + Android Keystore | Separate keys; explicit dual-signature binding only |
| QR and gallery | Native `QrCameraScanActivity`, `BrowserQrImageReader`; browser QR pages | One verified import protocol; no trust from a fingerprint alone |
| Friends | Browser trusted-friend store; Android encrypted `AndroidTrustedContactBundleV1` candidate | Consent-based signed export/import; block/revoke wins |
| Audio/video | Existing browser `EZERO_CONNECT_MEDIA` WebRTC engine | Reuse only; do not create a second media engine |
| Text / voice | Existing PWA communication panels and in-call message module | Reuse authenticated peer data channel; no new unauthenticated transport |
| Incoming ring | Android FCM service, signed wake verifier, CallStyle notification | Server-authorized saved friend + enrolled device + signed wake |
| Accept | Android receiver + pending-call handoff contract | One-use authenticated invite fetch, then origin-bound PWA handoff |
| Backend | Friendship Registry, inbox, offline queue, FCM sender candidates | One versioned Connect API; isolated staging environment |
| PWA assets | Existing shared static-site repository and service worker | New isolated app origin/scope before public cutover |

## Required integration order

### Gate I0 — Freeze and inventory (current)
- Preserve the existing browser call engine and production entry points.
- Keep PRs draft/unmerged while branches are reconciled.
- Record the exact source SHA for each component and identify overlapping edits.
- Do not combine unrelated worker deployment configuration.

### Gate I1 — Build one Android home without changing trust
- Keep package ID `com.ezero.connect` and current Android Keystore identities.
- Add a single navigation shell for Home, Friends, QR, Messages and Calls.
- Do not clear or migrate any existing local identity/contact store.
- Keep the current enrollment/QR diagnostic screens reachable behind a clearly labelled setup area.
- Add a strict allowlisted WebView host only after the canonical staging origin, CSP, navigation policy and media-permission path are tested.
- No permissive JavaScript bridge. Use an origin-checked, versioned WebMessageChannel for native/PWA messages.
- The PWA page must announce readiness before any one-use invite is delivered.

### Gate I2 — Identity and friend continuity
- Reconcile PR #228/#229 with PR #243/#245/#246.
- Browser Root private key remains non-exportable in origin-bound IndexedDB.
- Android installation private key remains non-exportable in Android Keystore.
- Bind identities only through fresh, expiring, one-use dual signatures and explicit user approval.
- Import only Root-signed, already-mutually-trusted contacts. Preserve block/revocation state.
- Do not treat the same Google account, display name, QR fingerprint or FCM token as proof of identity.

### Gate I3 — Connect one saved-friend call
- Reconcile PR #230 offline queue with PR #235 server-authoritative friend checks.
- Caller must be an active, mutually approved, non-revoked friend.
- Pending invite is recipient-bound, short-lived, one-use and replay protected.
- FCM carries only a signed wake hint, never SDP, ICE, message text, identity claims or bearer secrets.
- Android Accept performs authenticated invite fetch; Reject/cancel/expiry consumes the same call.
- PWA verifies the invite and saved-friend relationship, then uses the existing `EZERO_CONNECT_MEDIA` manager.
- No duplicate Accept prompt and no auto-answer.

### Gate I4 — Messages and profile
- Reuse existing PWA text/voice modules only after authenticated peer-channel verification.
- Profile name/photo are shared only after the verified friend relationship and explicit consent.
- Keep view-once/expiry semantics and bounded payload sizes.
- No background recording, no silent microphone/camera access and no server-side media archive.

### Gate I5 — Physical two-phone acceptance
Test each separately on real devices:
- foreground, background, locked screen and swiped-away app;
- notification permission, ringtone channel, full-screen intent policy and OEM battery controls;
- first QR pairing and repeat call from saved friend without QR;
- audio, video, text, voice note and image transfer;
- Accept, Reject, cancel, timeout, replay, blocked friend and revoked device;
- app restart, network change and offline recipient queue;
- memory and thermal behavior on a 4 GB device.

Force-stop behavior must be documented separately; do not promise delivery after Android force-stop.

## Branch reconciliation policy

1. Never merge all candidate branches wholesale.
2. Compare the exact base/head diffs for PR #228–#246 and list same-path conflicts.
3. Select one canonical source version for each Kotlin/JS/Worker file, backed by its tests.
4. Bring in one feature slice at a time with its tests; do not cherry-pick only production code while omitting tests or security contracts.
5. Run Android unit tests, Node/browser contract tests and Worker runtime tests before the next slice.
6. Keep WebRTC engine files unchanged unless a failing integration test proves a minimal adapter is required.
7. Keep all integration PRs draft until physical two-device acceptance and independent security review.

## Current gate table

| Gate | Status | Evidence / blocker |
|---|---|---|
| Native Android package exists | PARTIAL PASS | Package `com.ezero.connect` and Kotlin host exist on isolated branches |
| Standalone app architecture | DESIGN PASS | PR #248, draft |
| Repository boundary inventory | PARTIAL PASS | PR #249, draft |
| Server-authoritative friend call routing | STAGING CANDIDATE | PR #235, not merged/deployed |
| Android trusted-contact import | STAGING CANDIDATE | PR #228/#229 chain, not reconciled into this branch |
| Offline pending-call queue | STAGING CANDIDATE | PR #230, not reconciled/deployed |
| Browser ↔ Android identity binding | CRYPTO/QR CANDIDATE | PR #243/#245/#246, not reconciled |
| Native ↔ PWA secure WebView handoff | CONTRACT ONLY | PR #234; runtime bridge not implemented |
| FCM closed-app ringing | BLOCKED / UNPROVEN | No verified credentials, active sender route or two-phone physical proof |
| One unified app navigation | NOT STARTED | This branch records the integration target; no runtime UI changes yet |
| Production/public cutover | NOT AUTHORIZED / NOT STARTED | No live deployment or production change |

## Safety and release boundary

This commit is documentation-only. It does not merge any feature PR, alter Android app source, change Firebase, provision secrets, deploy a Worker, publish a new website path, change package signing, migrate user data, or touch production. No claim is made that the app modules are already connected or that closed-app ringing works.

The next implementation slice must be a small, reviewable Android navigation/WebView host change on this branch, with strict origin and permission tests, while retaining the current launcher behavior as a rollback path.
