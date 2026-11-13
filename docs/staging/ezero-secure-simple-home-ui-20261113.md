# E-ZERO Secure App — approved simple home UI (staging only)

Owner approval: 2026-11-13. Target is the compact military-green single-screen home mockup approved in chat. This is a UI-only change request, **not** permission to bypass release gates.

## One-screen experience
- Header: E-ZERO Secure App, language switch (Urdu, Arabic, English), profile and Back.
- Search field: search saved trusted friends locally, never upload search terms.
- Primary tiles: Add Friend (one QR or invite link, one explicit acceptance); My Friends (saved trusted contacts).
- Friend action row: Audio Call, Video Call, Private Chat, Voice Note, adjacent to selected friend; no scroll to a distant panel.
- New pairing: show the user's QR and scan friend's QR in a single panel; never request multiple codes. After mutual approval, persist only consented trusted contact metadata and permit one-tap reconnect.
- Clearly separate pending contact requests from trusted friends; no auto-trust from forwarded contact cards.
- Mobile-first responsive layout with >=44px tap targets, clear focus, accessible labels, RTL Urdu/Arabic, LTR English, reduced motion, visible error recovery and one consistent Back action.

## Frozen baseline and boundaries
- Do not replace or modify the proven WebRTC audio/video engine, signaling, TURN, call routing, chat storage or public entry URLs.
- Existing third-device audio/video success is owner-reported evidence; not a new automated regression result.
- Preserve origin checks, consent, ephemeral QR expiration, passkeys/WebCrypto, contact privacy and no call/message/QR/photo telemetry.
- No new analytics, trackers, paid service, permissions or account setup.
- Never modify Null Bench #try, AI Studio, Qwen or OBD UI in this workstream.

## Release gates (currently NOT MET)
- Isolated UI implementation and keyboard/screen reader/RTL/LTR tests.
- Required GitHub Actions all SUCCESS for exact candidate SHA; no pending/unknown/fail.
- Stage assets match candidate SHA; inspect public HTTP, CSP, origin, caching and asset integrity.
- Preserve calling baseline tests; physical two-phone audio/video and friend-reconnect tests on the exact candidate build, plus third-device smoke when feasible.
- Privacy policy and consent review, rollback SHA, explicit release record and progressive public smoke.
- **NO RELEASE** until every required gate is verified. Do not merge this branch or change production automatically.

## Audit 2026-11-13
- PR #128 was fetched: OPEN/DRAFT/UNMERGED, head 3235b17df738f7583b7bbea3a7b3af521fe68c37; separate contact-forwarding feature, not a UI release candidate.
- No physical phone tests performed in this audit. Public SHA/CSP/assets and full required CI not verified in this step: UNKNOWN.
- This file records approved UX requirements only. It does not assert that a functioning new UI was deployed.
