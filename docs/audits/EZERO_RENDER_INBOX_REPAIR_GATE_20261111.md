# E-ZERO Secure App — Render trusted-inbox repair gate (2026-11-11)

Scope: isolated staging audit only; no deployment, production change, credentials, private user records or screenshots.

## Confirmed read-only findings
- Render TEST service srv-dbnis0lg1s2s73cquj1g is static, autoDeploy off, branch ezero-profile-first-saved-friends-20261106. Latest live deployment dep-dbnlrc49v7es73d4i6qg uses 51d7aec556dec935d74edf339d86f3794f5aa865 (Nov 7).
- Owner-observed TEST page shows same SHA and saved-friend direct-call unavailable; saved-friend selection and UI buttons function, but this is not a live call pass.
- scripts/build_ezero_secure_app_render_staging_20261107.py deliberately changes trusted inbox enabled:true to enabled:false and retains strict fail-closed check.
- js/ezero_trusted_inbox_stage_config_20261106.js pins expectedOrigin to https://coma39658-ctrl.github.io and WSS to the existing trusted-friends staging inbox, not Render TEST.
- Separate Cloudflare Render-origin signaling worker configuration exists (ezero-browser-signaling-render-test), but signaling/QR rooms are NOT equivalent to an authenticated saved-friend direct-call inbox. Worker deployment, health and signed handshake remain UNKNOWN.
- TEST 02 direct-call static-security and frozen-two-phone-contracts GitHub checks are owner-observed PASS, not proof of all CI or real two-device calling.

## Safe implementation sequence (not executed)
1. Verify dedicated owned Render-origin authenticated inbox (distinct from QR signaling): exact Origin allowlist, signed device challenge, replay protection, TTL, bounded rate and payload, explicit consent, blocklist, no message/media persistence.
2. Create immutable per-deployment TEST config binding HTTPS origin, exact call page and dedicated WSS endpoint; reject mismatched origin and unexpected host/path. Do not simply toggle enabled or reuse production-origin challenge.
3. In a separate implementation branch, modify only TEST build assets and scoped CSP connect-src after server verification; keep existing production QR/WebRTC untouched.
4. Add negative security tests (wrong origin, expired/replayed nonce, unknown/blocked peer, forged signature, declined call, absent receiver), build tests, frozen QR regression, and browser accessibility tests.
5. Verify all required CI, Render deployed commit and downloaded asset fingerprints, endpoint health, privacy and rollback. Only then obtain consented real two-phone incoming-card, accept/decline, audio/video, hangup evidence.

## Current gates
- Root-cause source inspection: PASS.
- Authenticated Render-origin inbox: UNKNOWN / NOT VERIFIED.
- New exact-SHA TEST deployment: NOT DONE.
- Complete CI and live CSP/assets: UNKNOWN.
- Real two-phone direct call: NOT PASSED.
- Release decision: NO RELEASE.

References: PR #131 https://github.com/coma39658-ctrl/null-bench/pull/131 ; source docs/audits/EZERO_TEST_02_RENDER_DIRECT_CALL_IMPLEMENTATION_GATE_20261109.md .
