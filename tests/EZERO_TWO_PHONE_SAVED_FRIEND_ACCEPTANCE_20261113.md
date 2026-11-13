# E-ZERO Secure App — two-phone saved-friend call acceptance gate
Date: 2026-11-13
Branch: ezero-secure-simple-home-ui-stage-20261113
Scope: staging only. This checklist is not proof of a successful live call.

## Prerequisites
- Both Android/iOS phones open the *same reviewed staging build* on HTTPS.
- Each has consent-saved device identity and a profile name/photo.
- A prior signed QR pairing and real connected call verified both device fingerprints.
- Both friends are present in each other's trusted contacts, neither blocked.
- Recipient explicitly enables the foreground Trusted Inbox, and keeps the tab open.
- No production changes; preserve the original working WebRTC engine.

## Two-phone checks
1. A selects saved friend B and presses Audio. No QR or code required on either side.
2. A receives honest 'sent' state, never a false connected indicator.
3. B receives an incoming card showing A's saved name and audio type.
4. B explicitly taps Review, then Accept in the original signed WebRTC flow.
5. Check WebRTC connection state on both phones and actual two-way audio.
6. Hang up; repeat with Video, verify remote video *and* two-way audio.
7. Confirm friend remains saved on both devices after reload and one-tap reconnect.
8. Deny incoming call; verify no microphone/camera starts without consent.
9. Block A on B; verify B cannot receive trusted invitation from A.
10. Close B's tab; verify A receives failure/timeout rather than fake delivery.
11. Switch Urdu/Arabic/English and verify action labels, names and status.
12. Verify no regressions in first-time QR, chat, voice note, back navigation.

## Evidence recording (no secrets or personal data)
Record each step as PASS / FAIL / PARTIAL / UNKNOWN. Store only:
build SHA, browser versions, device types, coarse network type,
WebRTC connection state, call type, observed UI status, and test time.
Never commit tokens, SDP, IP addresses, personal phone numbers,
private keys, recorded calls or photos.

## Release gate
Do not mark LIVE_TWO_PHONE_PASS until two real devices demonstrate both
audio and video end to end. Source contract CI success alone is not enough.
Do not merge or publish to production until a reviewed staging build
passes this gate and baseline regression checks.
