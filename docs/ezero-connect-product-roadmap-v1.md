# E-ZERO Connect — Product Roadmap v1

**Status:** Product scope and staged implementation plan  
**Owner:** E-ZERO  
**Principle:** Ship verified capabilities in small, isolated releases. Never present a planned or simulated feature as working.

## Product promise

A simple, privacy-first communication app for everyday people: one trusted-friend list for messages and calls, clear consent, low data use, and an interface that works well on modest Android phones and slower networks.

## Core experience

- **Identity and signup:** display name, optional profile photo, unique E-ZERO ID, and device-bound passkey where supported. Email is optional, not a prerequisite.
- **Recovery:** a separately designed recovery kit / trusted-device recovery flow. Explain clearly that losing every trusted device and recovery method may mean losing the account. Never promise recovery that is not implemented.
- **First connection:** scan a short-lived, single-use QR or open a short invite link; show the other person's identity; require explicit approval on both sides.
- **Trusted friends:** save once, then start later calls and chats directly from the friend list without repeating QR pairing. Search, online/last-seen privacy controls, pin, mute, block, remove, and report.
- **Unified conversation:** text, voice notes, photos, files, and call history in one conversation timeline. Delivery/read state only when technically reliable and privacy settings allow it.
- **Calls:** audio/video selection must be explicit; video must never silently downgrade to audio. Incoming calls show caller identity and Accept / Decline. Clear mic/camera permission prompts, mute, speaker, camera switch, and hang-up.
- **Groups:** invite/approval, admin and moderator roles, member permissions, join/leave controls, and group reporting. Add only after one-to-one messaging/calls are stable.
- **PWA:** install-to-home-screen, app-like navigation, deep links, and safe session restoration. Do not imply browser push works on every platform.

## Privacy and security baseline

- End-to-end encryption for messages and calls using reviewed, maintained protocols; do not invent custom cryptography.
- QR/invite tokens are short-lived, single-use, scoped, and rate-limited.
- Device keys are protected by platform cryptography where available; never expose private keys in logs or URLs.
- No ads, no sale of personal data, no hidden call recording, and no message-content analytics.
- Clear retention settings: delete for me, delete for everyone where supported, view-once media, and timed expiry with honest limitations (screenshots / external capture cannot be fully prevented).
- User-controlled export and account deletion, including clear explanation of backups and retention windows.
- Block/report, spam throttling, invite abuse limits, suspicious-login alerts, and session/device management.
- Security headers, origin checks, CSRF protection where applicable, input validation, dependency updates, audit logs without message content, and independent security review before broad public launch.
- Privacy policy and terms in Urdu, Arabic, and English; plain-language permission explanations.

## Reliability and accessibility

- Adaptive bitrate / network-aware media quality and graceful recovery after temporary network loss.
- TURN relay for restrictive networks; test mobile data, Wi-Fi, carrier NAT, and cross-region paths.
- Low-data mode, audio-only fallback only after user confirmation, and battery-conscious behavior.
- Clear offline / reconnect / failed-send states; queued messages must not be described as delivered.
- Support Android Chrome first, then iOS Safari and desktop browsers with capability-specific messaging.
- RTL/LTR correctness, keyboard navigation, screen-reader labels, readable contrast, reduced motion, large touch targets, and accessible call controls.
- Localization: Urdu, Arabic, English, including correct RTL layout and date/time formatting.

## Release phases and gates

### Phase 0 — Product shell and honest public page
- Publish the approved E-ZERO Connect visual identity and a clear preview disclaimer.
- Keep sample profiles visibly marked as examples.
- Do not make decorative buttons look operational.
- Gate: mobile layout, links, accessibility basics, no broken assets, no change to the frozen call engine.

### Phase 1 — Identity and trusted contacts
- E-ZERO ID, device identity/passkey, optional email, QR/gallery QR, short invite link, mutual consent, friend save, direct saved-friend selection, block/remove.
- Gate: real two-device persistence, origin-bound signed invites, replay/expiry tests, recovery threat model, no automatic call acceptance.

### Phase 2 — One-to-one calling reliability
- Preserve the verified audio/video engine; explicit call mode, incoming call UI, accept/decline, mute/speaker/camera controls, call log.
- Add TURN and network recovery only in isolated staging.
- Gate: real Android-to-Android tests across Wi-Fi and mobile networks, audio/video mode integrity, no regressions in the frozen baseline.

### Phase 3 — Messaging and media
- Text, multiple voice notes with duration and upload progress, images/files with size limits, delivery states, per-chat mute, safe previews.
- End-to-end encryption and deletion/retention semantics before enabling sensitive media.
- Gate: real two-device send/receive, interrupted network, duplicate/replay, storage, abuse, and privacy tests.

### Phase 4 — Notifications and PWA
- Push notifications for incoming calls/messages where browser and OS support them; explain unsupported cases and fallback behavior.
- Install prompt, app icon, deep links, notification permission only after contextual explanation.
- Gate: device/browser compatibility matrix, opt-in notification controls, no promise of ringing when the OS/browser cannot deliver it.

### Phase 5 — Groups and advanced controls
- Group chats/calls, admin roles, invite links, moderation, message search, pinned messages, optional disappearing messages, trusted-device management.
- Gate: group membership authorization, admin escalation tests, abuse/report workflow, load tests.

### Phase 6 — Public launch readiness
- Independent security review, privacy/legal review for target markets, incident response, backups and restore drills, service monitoring, rate limits, cost controls, support/contact channel, status page.
- Gate: documented operational owner, tested rollback, data deletion verification, incident runbook, no critical/high unresolved security findings.

## Explicitly not promised until implemented and verified

- Ringing when the recipient's phone is off, browser is closed, or notifications are disabled.
- Guaranteed account recovery without a working recovery factor.
- Absolute prevention of screenshots or external recording.
- Universal browser compatibility, perfect connectivity, or uninterrupted calls.
- End-to-end encryption, push notifications, group calls, or cloud sync unless their implementation and tests are present.

## Evidence labels

Every feature in public release notes must be labelled **VERIFIED**, **STAGING**, **PREVIEW**, or **PLANNED**, with test scope and known limitations. A passing unit/contract test is not proof of a real two-phone production workflow.

## Current baseline note (2026-11-19)

The current E-ZERO Connect page is a visual/navigation preview. It links to the existing Secure Connect staging page. The visual preview does not itself implement signup, messaging, push notifications, account recovery, or production calls. Keep the existing call engine and production entry flow unchanged while this roadmap is implemented in isolated branches and staging.
