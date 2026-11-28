# E-ZERO Connect — Clean Build Plan

**Date:** 2026-11-20  
**Branch:** `ezero-connect-clean-build-20261120`  
**Design source:** archived visual reference commit `d8e1203bdc6fbc5e2f02ac8bad5a56ff3f4004c7`  
**Product decision:** new implementation only; legacy application archived, not imported.

## Direction

The approved forest-green, minimal, mobile-first E-ZERO Connect design is the product's visual baseline. The app is being rebuilt as a clean product, not as a wrapper around the old staging page.

## Archive completed

- `archive/ezero-legacy-saved-friends-20261120` → `373ab6266fe54fe894dea5d011f06acc1ffdd03b`
- `archive/ezero-connect-visual-preview-20261120` → `d8e1203bdc6fbc5e2f02ac8bad5a56ff3f4004c7`
- Legacy PR #156 was closed as superseded; its branch and source history remain recoverable.

## Clean architecture

1. **Application shell:** new mobile-first interface; no legacy HTML or legacy JS imports.
2. **Identity:** WebCrypto device key, signed short-lived QR invite, mutual consent, explicit revocation. Private keys never leave the device.
3. **Trusted contacts:** local encrypted contact records tied to verified device fingerprints. No fabricated presence or history.
4. **Signaling:** separate, authenticated WebSocket service with short-lived room credentials, origin checks, rate limits, expiry and minimal retention.
5. **Calls:** user-initiated audio/video only; mode is explicit and immutable for a call; no auto-answer or silent downgrade. Media permission only after tapping Call.
6. **Messaging:** separately scoped text, image and voice-note channels; honest delivery states; no invented end-to-end encryption claims.
7. **Notifications:** only after platform-specific Web Push tests. No promise that an offline or powered-off phone will ring.

## Current honest status

The existing `ezero-connect.html` is a design preview. It is not a messenger. The clean-build application shell must remain marked as preview/staging until identity, live signaling, calls, messaging and physical Android-to-Android verification pass. The old page must not be used as a hidden runtime fallback.

## Release gates

- [ ] No legacy app/controller imports in the new app.
- [ ] Identity key creation, signed QR, expiry, replay protection, mutual approval, revocation and recovery tests.
- [ ] Real Worker WebSocket handshake, origin validation, room authorization and expiry tests.
- [ ] Two-browser contract tests for audio and video, no downgrade, hangup and reconnect.
- [ ] Two real Android devices on same Wi-Fi and separate networks.
- [ ] Text/image/voice message delivery and consent tests.
- [ ] Mobile accessibility, Urdu/Arabic/English, low-bandwidth and privacy review.
- [ ] Independent security review of identity/signaling/data retention.
- [ ] Rollback plan and production smoke test.

Only after these gates pass should the new app replace the old public entry point. No production deploy is made by this branch.
