# E-ZERO Secure App — working TEST snapshot freeze (2026-11-09)

Status: FROZEN SOURCE REFERENCE / PARTIAL PHYSICAL TEST / NO PRODUCTION RELEASE.

## Immutable source
- Snapshot branch initially created at exact Git commit `51d7aec556dec935d74edf339d86f3794f5aa865` (before this documentation-only commit).
- Owner-tested Render URL: `https://ezero-secure-app-two-phone-test-20261107.onrender.com/ezero_trusted_friends_staging_20261106.html`.
- Both owner phone screenshots show visible `TEST · 51d7aec556de` badge; **badge is not proof of actual served asset SHA**.
- Do not move this snapshot branch, edit its app assets, or repurpose as release branch. Documentation-only audit addition preserves original code tree.

## Physical observations provided by owner
- Phone A: QR image displayed, scanner opened.
- Phone B: initially scanner/QR issues; after permissions, scanner opened and QR displayed.
- App UI reported real two-phone WebRTC connection established. This is a UI report, **not independently measured two-way audio/video**.
- A friend's name/photo and fingerprint appeared in saved-friends UI on one phone; mutual verified persistence on both devices not proven.
- Saved-friend call screen explicitly stated the call service was unavailable and instructed to use QR. Owner reported **call does not work** in this run.
- App offered QR/share link controls, but successful cross-device share and auto acceptance are not proven.

## Freeze and release gate
- PASS (owner observed): QR rendering and scanner camera open on both phones after permission.
- PARTIAL: friend list and connection-status display.
- FAIL (owner observed): saved-friend one-tap audio/video call in this test.
- UNKNOWN: full actual Render served asset SHA, WSS/ICE signaling health, CI on freeze, two-way media, replay/expiry defenses, iOS/WebKit, and public GitHub Pages parity.
- **NO RELEASE to production** until required CI, privacy/CSP/origin, live smoke, actual asset SHA and real two-phone audio/video/verified friend tests PASS.
- Future changes belong to isolated branches, with regression against exact snapshot and rollback SHA documented. Never overwrite previously successful call engine without evidence.

No credentials, QR payloads, personal names/photos, private user records or media retained here.
