# E-ZERO Android Incoming Call Ringer — Staging Architecture

Status: design/implementation gate; NOT implemented, NOT deployed, NOT enabled on the public site.

Base: PR156 preview commit e7be1da41f976a4ebc746be151ade93ead37ffe3.
Isolation: branch `ezero-android-incoming-call-ringtone-staging-20261120` only.
Existing QR/WebRTC audio/video engine and the public entry page must remain unchanged.

## User experience target

After one-time Android setup and notification permission:
- A trusted saved friend calling causes the receiving Android phone to ring automatically.
- The lock screen / notification presents caller identity and Accept / Reject.
- No separate "enable inbox", "push", "reconnect", or ringtone button on each call.
- Accept opens the existing signed WebRTC invitation and still requires explicit acceptance.
- Reject, caller cancel, timeout, trust revocation, or hang-up stops the ring and clears the alert.
- No auto-answer, no media/SDP/message/recording stored by the wake-up service.

## Important platform boundary

The current product is a browser PWA, not an Android native application. The existing PR156 inbox is a foreground WebSocket and explicitly requires an open tab. The current service worker has no Push API handlers.

A service worker plus Web Push can wake an installed PWA on supported Android/browser configurations, but the Web Notifications API does not provide a reliable, app-controlled, continuous ringtone or a guaranteed native incoming-call screen. Notification sound is controlled by Android/browser notification channels and user/system settings. Force-stop, revoked notification permission, battery restrictions, browser restrictions, or offline device can prevent delivery.

For the requested phone-like call UX, the reliable target is a small Android host app using Android's call-notification APIs (CallStyle notification, ringtone/audio focus and appropriate foreground-service behavior; full-screen intent only where Android grants/permits it). It must hand off to the existing HTTPS PWA/WebRTC call page for the actual call. This is a separate Android shell, not a rewrite of the working WebRTC engine.

## Architecture proposal

1. Android host app registers one installation-specific push endpoint with the isolated staging backend after explicit first-run permission/consent.
2. Registration is bound to the existing non-exportable P-256 device identity and saved-friend trust model. The server stores only the minimum endpoint/key material required for delivery.
3. A trusted caller submits a short-lived, signed call wake-up request through the isolated Trusted Inbox.
4. The backend validates signature, saved-friend trust, replay window, cooldown, rate limits and expiry before sending an encrypted push wake-up.
5. Android receives the wake-up and posts the incoming-call CallStyle notification with caller alias, ringtone and Accept/Reject actions. The app does not auto-answer.
6. Accept opens the existing signed invite; the existing WebRTC engine validates the invite and performs the media connection.
7. All terminal states cancel the notification and stop ringtone/audio focus. Push payload contains only opaque call ID, mode, expiry and integrity metadata; never SDP, media, chat, photos or recordings.

## Staging implementation gates

- G0: confirm Android host approach, package ID, supported Android versions, distribution/signing route. No Android project exists in the inspected PR156 tree.
- G1: implement Android shell and notification permission onboarding; one-time setup only.
- G2: implement push subscription lifecycle and isolated backend delivery. Never deploy Worker workflows without reviewing and explicitly approving their external side effects.
- G3: implement CallStyle/ringtone lifecycle, lock-screen behavior, notification actions and cancellation.
- G4: automated tests for invalid signatures, replay, expiry, cooldown, revoked trust, duplicate delivery, offline recipient, notification cancellation and no sensitive payload.
- G5: real-device acceptance on at least two physical Android phones: receiver app backgrounded, swiped away, screen locked, network present; verify audible ring, caller identity, Accept/Reject, audio/video handoff, and cancellation.
- G6: test force-stop and notification-disabled behavior explicitly and document Android limitations; never claim these cases work unless physically verified.

## Release / evidence rules

- This branch is isolated. Do not merge, publish, deploy, change Cloudflare production, or alter public pages without separate explicit approval.
- Synthetic browser tests are not physical Android evidence.
- A static test PASS does not prove push delivery or audible ringing.
- Do not claim a ringtone is working until two physical Android devices pass the complete G5 flow.
- Preserve all existing PR156 QR, saved-friend, WebRTC, replay/revocation, cleanup and network-recovery tests.
