# E-ZERO Secure App — Friend Pair QR V0.1 implementation gate

Status: DESIGN CONTRACT ONLY / STAGING / NO RELEASE. Owner approved 2026-11-09.

## Required user journey
1. **My QR** shows a scannable, signed, time-bounded FRIEND_PAIR identity invitation immediately after explicit click, or shows an explicit actionable error. This is NOT a call offer and must never request microphone/camera permission.
2. **Scan friend's QR** opens the scanner after user action, or offers gallery decoding if camera unavailable. No hidden auto camera startup. Distinguish invalid, expired, wrong-origin, replayed, and permission-denied QR without leaking private payloads.
3. Receiver sees the friend's verified identity/fingerprint summary and chooses **Accept / Decline**. Sender independently approves the pairing. Never silently add a friend by visiting a URL.
4. Only after mutual approval, authenticated proof of possession, and verified identity binding may both devices save a friend record locally. A contact nickname is optional; remote display name/photo updates require explicit consent and never overwrite local nickname without user choice.
5. **Audio / Video** call controls operate only after selecting the saved friend; preserve existing frozen signed WebRTC call/answer/ICE engine, media permissions and hang-up behavior. Reconnect is separate from pairing and may require the other device to be online/foregrounded.

## Security and privacy acceptance
- QR: signed, scoped to FRIEND_PAIR, short-lived, single-use where server-backed replay control exists; no secret key or personal photo embedded; never treat a SHA-256 fingerprint alone as proof of identity.
- Validate origin, expiry, audience/purpose, nonce, signature, sender key possession and peer confirmation; fail closed when required signaling is unavailable.
- If no authenticated transport for remote approval, show "Cannot finish pairing offline" rather than claiming a friend was saved on both phones.
- No user chat, media, QR payload, photos, token or personally identifying details in telemetry, public logs, or CI artifacts.
- Local storage only with informed consent; provide friend removal and clear state transitions.

## Tests required before release
- Browser: Android Chrome, Android in-app browser fallback, iOS Safari/WebKit, desktop Chrome/Firefox; keyboard/screen reader, Urdu RTL, Arabic RTL, English LTR.
- Unit: QR generation/decoding, malformed input, expiry, replay, signature mismatch, purpose mismatch, origin mismatch, double-tap, revoked friend, refusal, no-network, gallery fallback.
- Integration: same verified friend on both devices, reloading friend list, direct call after pairing, mutual consent, hang-up and re-call; frozen WebRTC regression suite must PASS.
- CI and live: required GitHub Actions all PASS; verify actual Render/GitHub Pages asset SHA, CSP, Origin, HTTP and WSS; physical two-phone QR scan, mutual save and real two-way audio/video evidence PASS.
- Production remains unchanged while any check is FAIL, PENDING or UNKNOWN. Rollback SHA must be recorded before any future approved progressive release.

## Current evidence
- Source at TEST banner SHA `51d7aec556de`: front QR tile generates an audio call invitation, not a friend-pair QR; inspected `js/ezero_front_qr_hub_v0_1.js`.
- Render build intentionally disables GitHub-Pages-origin Trusted Inbox; inspected `scripts/build_ezero_secure_app_render_staging_20261107.py`.
- Owner photos: actual QR displayed on one phone; second-phone scan/save and call connection did not complete.
- No implementation, CI execution, live deployment or physical PASS asserted by this document.
