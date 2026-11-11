# E-ZERO Secure App — Unified communications TEST 02+ acceptance specification (2026-11-09)

Status: REQUIREMENTS AND TEST PLAN ONLY. Not a claim of implementation, CI PASS or deployment. Preserve frozen real QR audio/video calling baseline; staging-only development and no automatic production release.

## Single friend conversation screen
- Header: friend avatar, chosen contact nickname and verified profile name distinguished, online/last-seen only if opted in, back button, safety/fingerprint view.
- Immediate visible actions: audio call, video call, voice note, photo attachment. Never make video launch audio by accident.
- Chat: text composer, send state, incoming/outgoing bubbles, timestamps, delivery/receipt states only when actually confirmed, photo thumbnails and full-screen view, voice-note waveform/timer/stop/playback.
- Call history: incoming, outgoing, missed, declined, answered, time, call type, duration only when measured; one-tap redial. Call log metadata is NOT a recording. Local retention and deletion controls must be explicit.
- Incoming call: visible caller name/avatar, ringtone where permitted, explicit Accept/Decline, camera/mic permissions, end call, no automatic answer.
- Tri-lingual Urdu/Arabic/English, RTL, accessible focus, minimum 44px targets, reduced motion, offline/connection errors inline near button, no duplicate panels.

## Test priority
P0 (before next two-phone TEST 02): existing QR call regression; mutual saved-friend consent; Render-origin authenticated WSS; direct audio and video no QR; accept/decline/hangup; stable call history; privacy and origin tests.
P1 (after P0 passes, before unified release): text delivery/receipts, multiple voice notes with explicit stop and timer, photo send/receive, preview and delete, large-file limits and safe file types, offline failures and retries without duplicate sends.
P2: group admin permissions, optional filters, contact forwarding, notification enhancements, optional evidence export with user consent.

## Security acceptance
- WebRTC DTLS-SRTP; no downgrade to plaintext; authenticated WSS, exact Origin allowlist, per-message authorization, replay protection, nonce expiry, size/rate limits, no logging of private media/message contents.
- Contacts: consent, block/unblock, unrecognized caller reject, saved identity fingerprint verification and privacy-respecting online indicator.
- Attachments: bounded image size and pixel count, magic-byte verification, image re-encoding to remove metadata where feasible, no SVG/HTML/script execution, safe rendering, no auto-download, no EXIF leakage by default.
- Voice messages: independent MediaRecorder lifecycle, stop/release mic, no call-stream reuse, recording duration display, consent-based retention; SHA-256 of exported file only if evidence mode chosen and correctly verified.
- Deletion: view-once/10-min-after-view policy must be accurately enforced and disclosed; cannot guarantee removal of recipients' external copies/screenshots. Do not promise zero server storage if relay/offline queue exists; document exact processing.
- Browser limits: PWA/background ringing and notification delivery cannot be guaranteed when browser is closed without platform-specific push permission/infrastructure.
- Tests: unit, integration, adversarial origin/auth/replay/oversize tests, UI accessibility, Android/iOS browser compatibility, staging SHA, two-phone real-world evidence. PASS/FAIL/UNKNOWN separately for each feature.

## External standards reviewed
- https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
- https://www.rfc-editor.org/rfc/rfc8827.html
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
- https://faq.whatsapp.com/743219147158705/?cms_platform=android
- https://about.fb.com/news/2022/03/new-voice-message-features-on-whatsapp/

## Release gate
NO RELEASE until P0 direct calls have verified signaling, CI, SHA and user-observed real two-phone PASS. P1 features must independently pass before advertised as working. No automatic overnight coding or continuous CI is implied by this document.
