# E-ZERO Secure App — Differentiation and security acceptance V0.1 (2026-11-09)

STAGING SPEC ONLY; NOT IMPLEMENTED OR DEPLOYED. Preserve frozen QR audio/video baseline. No production merge.

## Product improvements (priority after direct-call P0)
1. Unified friend screen with audio/video/voice/photo/chat/call history in one place, accessible Urdu/Arabic/English and RTL. Visible buttons near tap, no duplicate cards.
2. Verified identity card: distinguish self-asserted profile name, user-edited nickname and cryptographically verified device fingerprint. Never label a name as legally verified.
3. Privacy dashboard per friend: block, revoke trusted status, mute, retention, delete local history, media permission; clearly distinguish local deletion from recipient copies.
4. Adaptive low-bandwidth mode with visible connection state, optional audio-only fallback after consent, retry limits and graceful errors. Preserve working WebRTC engine; consider perfect negotiation only after regression proof.
5. Voice-note explicit stop/timer, multiple notes, mic release; never leave a live recorder/call unintentionally active.
6. Photo exchange: bounded size, verified raster type, EXIF minimization, recipient consent, encrypted transit, view-once/10-min policy with limitations disclosed.
7. Call log: incoming/outgoing/missed/declined with timestamps and duration if measured; NOT a recording. Call recording only with explicit participant consent and legal review.
8. Optional SHA-256 evidence manifest for exports, clear distinction between integrity hash and identity/authenticity proof.

## Required adversarial and reliability tests
- Origin mismatch and unauthorized WebSocket upgrade denied; signed nonce expiry and replay denied; per-message auth, rate/size limit, blocked/unknown caller denied.
- Incoming call never starts media before acceptance; audio/video button mapping, decline, missed call, timeout, hangup, two simultaneous calls, network interruption, and permission denial.
- Chat: duplicate suppression, ordered delivery, sender authentication, offline failures; don't claim delivered until acknowledged.
- Media: file-type sniffing, malicious SVG/HTML blocked, oversized images rejected, metadata stripping, content security policy and safe object URL cleanup.
- Privacy: verify what server stores; no false zero-storage claims; local retention and deletion limitations disclosed; no analytics of private message contents.
- Accessibility: keyboard, screen reader labels, RTL layouts, 44px targets, contrast, language switching and back navigation.
- Compatibility: Android Chrome and iOS Safari, PWA installed/non-installed, permission/reconnect states, same and different networks.
- Frozen QR regression and staged asset SHA match; signed WebRTC audio/video real two-phone test before release.

## Authoritative technical references
- OWASP WebSocket Security Cheat Sheet https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- OWASP WebSocket Testing Guide https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/11-Client-side/10-WebSockets/
- MDN WebRTC perfect negotiation https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
- MDN signaling and video calling https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling

## Release gates
P0: direct-call dedicated Render-origin authenticated signaling + CI + verified asset SHA + real two-phone audio and video PASS. P1 features individually tested before advertising. No overnight background programming implied; CI executes on configured GitHub triggers. No automatic production release.
