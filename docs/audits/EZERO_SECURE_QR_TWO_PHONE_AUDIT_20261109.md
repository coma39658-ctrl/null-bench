# E-ZERO Secure App — QR Two-Phone Audit (2026-11-09)

Scope: isolated staging-only evidence note; no production changes. Base commit: `4c2145e3f9fd5db14f225ab7a8aff2c3410e214c`.

## Observed from owner-supplied mobile screenshot
- Friend-selection panel and audio/video call buttons visible.
- A button labeled in Urdu equivalent to "Scan friend's call QR" visible.
- No separately labeled "Show my QR" button visible within the supplied viewport.
- Screenshot alone does not prove QR generation is absent elsewhere or that scanner works.

## Automated baseline evidence
- Seven pull-request-triggered Actions for base SHA reported completed/success, including Frozen Secure Connect Regression, Signed QR/P2P Lab QA, Local Device Preview QA, AI Studio voice/video and Evidence Registry Validator.
- Sample run: https://github.com/coma39658-ctrl/null-bench/actions/runs/42535242471
- Combined commit statuses returned an empty status array, not an all-required-checks attestation.

## Gate status
- Two physical phones QR scan, mutual approval, audio both ways, video both ways, hang-up and reconnect: UNKNOWN (owner-assisted physical test required).
- Public deployed SHA/assets/CSP/Origin and Render TEST live smoke: UNKNOWN.
- Production release: BLOCKED / NO RELEASE.

## Next safe test sequence
1. On phone A, tap the existing "Scan friend's call QR" button; record whether camera permission/scanner/error appears.
2. On phone B, locate its QR display or invite control; avoid sending real QR contents or private links to public issues.
3. If the two distinct actions are genuinely missing, prepare a UI-only staging change with separately labeled "Show my QR" and "Scan friend's QR" controls, preserving the frozen WebRTC engine, signed invitation and consent rules.
4. Run affected frozen regressions and browser/accessibility tests before any physical call test.

No secrets, OTPs, personal contact data or QR payloads included. No deployment or user data mutation.

## Owner's physical two-phone observation — update 2026-11-09
- Owner provided screenshots from two physical phones showing the same TEST UI label `51d7aec556de`.
- Both show separate buttons equivalent to "My call QR" and "Scan friend's QR". Earlier concern that these controls were missing is superseded for this TEST page.
- Owner reports that pressing the QR control does not open/display a usable QR code. Root cause is NOT VERIFIED: profile prerequisites, JavaScript runtime, origin/signaling, QR render, or UI state remain hypotheses.
- TEST page text requires a name, profile photo, explicit profile sharing consent and saving before first friendship. Do not assume this is the failing gate without observing the exact error.
- A screenshot shows the TEST page in an in-app browser frame on one phone; camera permissions and browser restrictions should be checked without changing the frozen call engine.
- No QR payload, user profile, digital identity hash, image, or private invite was copied into this audit.

## Revised immediate test — physical gate
1. On phone A, use the TEST page, press "My call QR" once; capture only the visible status/error (redact personal data).
2. If an explicit profile prerequisite appears, complete it locally with consent and retry; do not upload profile data.
3. If no visible response, record browser type, whether QR panel appeared, and any non-sensitive console error if available.
4. Only after a QR appears, phone B scans and both users explicitly approve. Confirm Connected and two-way audio/video on devices.
5. All changes remain staging-only. NO RELEASE while real-device and live smoke checks are unknown.
