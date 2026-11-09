# E-ZERO Secure App — TEST 02: saved-friend direct calling (no QR)

Date: 2026-11-09. Isolated branch from verified TEST source commit 51d7aec556dec935d74edf339d86f3794f5aa865. No production deployment.

## Scope
- After a one-time signed QR identity verification and mutual approval, both phones retain the same verified friend identity.
- Both devices open the same TEST origin, enable foreground incoming calls, and keep the page open.
- Phone A selects the saved friend and taps Audio; Phone B receives an authenticated incoming call card with caller name, audio kind, Accept/Decline, and a user-visible ring indication. Only explicit Accept starts media.
- Repeat with Video. Camera permission is requested appropriately and both sides receive live video and audio.
- Neither flow requests another QR scan. No auto-answer, no permission escalation, no call recording.

## Evidence gates
1. Device A/B: exact public asset SHA and same test build — UNKNOWN.
2. Both devices: mutually saved verified contact after consent — UNKNOWN.
3. Foreground signaling inbox reachable and authorized on both devices — UNKNOWN.
4. Direct audio request delivered to B; incoming card rendered; explicit Accept; two-way audio — UNKNOWN.
5. Direct video request delivered to B; incoming card rendered; explicit Accept; two-way audio and video — UNKNOWN.
6. Decline, timeout, hangup, mic/camera release, and no unwanted background polling — UNKNOWN.
7. CI, CSP, origin, integrity, baseline QR audio/video regression — UNKNOWN.

## Known owner-observed baseline
- QR audio call PASS (owner-observed two-phone test).
- QR video call PASS (owner-observed two-phone test).
- QR-free saved-friend call not yet verified. Previous UI reported calling service unavailable; root cause not confirmed.

## Release decision
NO RELEASE. This is a test specification only, not a claim of an implemented or successful direct-call feature. Preserve original working WebRTC/QR engine, data, and production. Collect redacted device observations and objective CI evidence before considering narrowly scoped changes.
