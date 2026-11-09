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

## Source inspection — staged QR UI, 2026-11-09
- Inspected `ezero_trusted_friends_staging_20261106.html` at the audit base. Existing separate `#myQr` display and `#scanQR` scanner controls exist, plus `#oneTapQr` preview.
- Inspected `js/ezero_secure_connect_one_tap_qr_v0_1.js`: preview is a clone of `#myQr`, not an independent QR generator. Thus an empty source QR necessarily leaves this preview empty.
- One-tap handler opens a camera/scanner flow and explicitly checks `window.BarcodeDetector` and `navigator.mediaDevices.getUserMedia`. This is a potential browser compatibility blocker; it is NOT established as the cause on the owner's Render TEST page, which may use different assets.
- Do not change the frozen WebRTC or signed-identity generator before identifying the actual TEST page asset SHA and click handler. Next isolated step: identify actual TEST entry HTML and JS bundle, reproduce QR render in mobile browser test, and only then fix the relevant control.
- This is source inspection PASS, QR bug fix NOT DONE, physical scan UNKNOWN. NO RELEASE.

## Scheduled read-only release/analytics review — 2026-11-09
- Audit branch latest source inspected: `8076496039707a3cc2c5e79e530bc137b40149ab`; associated PR-triggered workflow runs returned an empty list, **NOT** a CI PASS.
- Live HTTP HEAD probes from the audit environment for GitHub Pages `https://coma39658-ctrl.github.io/null-bench/` and Render TEST `https://ezero-secure-app-two-phone-test-20261107.onrender.com/` both failed DNS resolution (curl exit 6). This environment cannot attest live availability, SHA, assets, CSP or Origin; failure does not establish that owner devices cannot reach sites.
- Gmail read-only search after 2026-11-08 surfaced two failed Friend-of-Friend Owner Approval Security Gate notifications (commits `462ed12` and `a702033`) and GitHub Advanced Security PR comment notices #126/#127/#129. No new billing alert established by this limited search; do not infer no billing issue exists.
- Windsor.ai authorized GA4 account 549358039, completed 2026-11-02 through 2026-11-08 daily rows: sessions 55, pageviews 160; daily active-users are **not additive**. Country breakdown sessions: Saudi Arabia 53, Jordan 1, Qatar 1; country active-users may overlap across dimensions. Data covers configured GA4 property, not all E-ZERO services. Latest-day completeness not guaranteed.
- 28-day window 2026-10-12 through 2026-11-08 daily rows have missing dates; do not treat missing as zero or sum daily unique users. Global 7/28-day active-user totals, realtime active users, acquisition, landing pages and exact deployed SHA remain UNKNOWN in this run.
- Proposed ethical next improvement: simple multilingual Urdu/Arabic/English QR-first quick-start in a dedicated staging UI, separate from Null Bench #try and AI Studio. No release, no tracking changes, no user contacts.
- Release gate: BLOCKED due to incomplete CI, live smoke, privacy/asset verification and physical two-phone QR/voice/video evidence. No production, credentials, billing or privacy settings changed.
