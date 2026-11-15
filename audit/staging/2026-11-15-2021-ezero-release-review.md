# E-ZERO staging-only audit — 2026-11-15 20:21 Asia/Riyadh

Scope: read-only checks of owned systems. This note is not a production approval. No user records, tokens, emails, call content, or QR data included.

## Verified
- PR #128 OPEN/DRAFT, head 3235b17df738f7583b7bbea3a7b3af521fe68c37, base ezero-profile-first-saved-friends-20261106. https://github.com/coma39658-ctrl/null-bench/pull/128
- Render TEST service ezero-secure-app-two-phone-test-20261107 exists, not suspended; branch ezero-profile-first-saved-friends-20261106; autoDeploy off. Render configuration alone does not verify public availability or deployed asset SHA.
- Gmail GitHub Actions notifications dated 2026-11-15 show FAIL for repeat saved-friend calls without QR (commits 75643c7, e379fcb, 6722611) and saved-friend no-QR incoming lab (commits ab22e6a, f0bb0a4, 06142f5, 443d52f, 3f75aaf, 6657a41). Failure cause not established by job logs; notifications are not a substitute for logs.
- Public HTTP HEAD from this execution environment: GitHub Pages and Render TEST both DNS resolution failed, curl HTTP 000. This is an environment-level UNKNOWN, not proof that either service is down.

## Blockers
- Required CI matrix, new failure job logs, current deployed SHA/asset hashes, HTTP headers/CSP/origin/integrity, browser accessibility across Android/iOS/WebKit/desktop, privacy notice consistency, and real physical two-phone smoke remain UNKNOWN.
- AI/Qwen live provider functionality and aggregate GA4 trend not verified in this review.
- No live deploy, account permission, billing, tracking, user data or production changes performed.

## Gate
NO RELEASE for Secure App. Keep PR draft and staging isolated. Verify failure logs, frozen regression and real two-phone evidence before considering release. Static Null Bench guide-only changes have their own separate gate; never apply communications physical-device checks to guide-only changes.


## 22:09 Asia/Riyadh follow-up — 2026-11-15

### Main branch and deployment evidence
- Current protected `main` HEAD is `a830a73f84ce0f9b0a116790d1330b00dcb9ec54` (GitHub signature verified): https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54
- PRs #149, #150, #154 and #155 are merged. #155 is the saved-friend retention / no-repeat-QR original-page change. Its main-push Actions at this exact SHA: Pages build+deploy run 43744654693 SUCCESS; Frozen Secure Connect Regression Gate run 43744655589 SUCCESS; Evidence Registry Validator run 43744655616 SUCCESS.
- Important qualification: the frozen gate's `Verify isolated media evidence cryptography, consent controls and ten-minute TTL` step was SKIPPED. This is Chromium/isolated-browser evidence, not physical two-phone evidence. The successful Pages workflow confirms its deploy job completed, but public HTTP smoke and live asset hashes could not be independently verified.
- The active main ruleset requires only `frozen-two-phone-contracts`; it has zero required approving reviews and does not require Evidence Registry or a physical-device proof check. Do not treat that minimum ruleset as equivalent to the owner's full release gate.
- PR #128 remains OPEN/DRAFT at head `3235b17df738f7583b7bbea3a7b3af521fe68c37`: https://github.com/coma39658-ctrl/null-bench/pull/128
- PR #152 remains OPEN/DRAFT at head `5036916c070bcec601233441c93e38ae0ac8ef48`: https://github.com/coma39658-ctrl/null-bench/pull/152

### Isolated test-only follow-up
- PR #156 remains OPEN/DRAFT: https://github.com/coma39658-ctrl/null-bench/pull/156
- Its prior run 43747113234 FAILED at test line 213 while waiting for the first QR invitation. Inspection showed the test seeded an existing saved friend before the test's stated first-contact QR flow, which could switch the UI into saved-friend direct-call mode.
- Narrow test-only correction committed to the same staging PR branch: `f1c9748b61bab92db8c3fbb3a9841cb13c907b35` — move the existing-friend fixture until after the first QR invite is generated. No product source, call engine, identity store, Render, Cloudflare, or main files changed.
- No Actions run for the new commit was visible at review time. Its test status is UNKNOWN until GitHub Actions executes and all required checks pass. Do not merge or deploy this PR.

### Failure evidence and remaining Secure App blockers
- No-QR incoming lab: run 43735872281 FAILED at its test-only scope guard (`UNEXPECTED_PRODUCTION_FILE_CHANGE`); browser steps were skipped.
- Repeat saved-friend calls: run 43738619724 FAILED after two video redial cycles passed; a later test wait timed out at line 371. PR #152 remains draft.
- Original-page Save Friend gate: run 43747113234 FAILED at line 213 before first invitation was observed. The test-only fixture adjustment above is not yet verified.
- Public probes from this execution environment returned DNS resolution failure / HTTP 000 for both the Render TEST URL and GitHub Pages URL. This is an environment-level UNKNOWN, not proof the services are down.
- Render TEST service still points to branch `ezero-profile-first-saved-friends-20261106`, last LIVE deploy commit `51d7aec556dec935d74edf339d86f3794f5aa865` (2026-11-07), with auto-deploy off. It has not been shown to contain main SHA `a830a73`. Service configuration and deploy history are not a public asset smoke test.
- Static source inspection: Secure App HTML has a strict meta CSP (default-src none; self-only scripts/styles; narrowly allowed owned WSS origins; object/base/form/frame blocked), exact same-origin/path checks in the foreground client, Urdu RTL page and Urdu/English/Arabic selector. 35 relative asset references all exist in the `a830a73` Git tree; zero inline script tags, zero inline style attributes and zero SRI attributes. These are repository-source findings only; response headers and deployed asset hashes remain UNKNOWN.
- No physical two-Android-phone validation, live Cloudflare inbox handshake, live Render HTTP smoke, iOS/WebKit/desktop matrix, privacy-policy parity review, or screen-locked Web Push test was obtained. Web Push remains a separate unimplemented opt-in feature; powered-off devices cannot receive an immediate call.

### AI/Qwen and Null Bench privacy observations
- Qwen adapter default branch HEAD remains `39adf3a429503f86cdc1f248f9080af50548ee03` (2026-11-03). Daily read-only AI QA run 43699933545 on 2026-11-15 SUCCESS; its steps compile modules, run free-search/price-evidence/public-AI regressions and reject unapproved paid/live-search activation. It does not prove live provider/search readiness.
- Render Qwen service is intentionally pinned to `qwen-overview-release-prep-v0.1` at `43178152ceab138345e89d438956acb0f8deeb40`, which matches its last LIVE Render deploy (2026-10-09); auto-deploy is off and the service plan is Free. This is distinct from the newer default-branch QA SHA.
- Main `index.html` still loads GA4 measurement `G-YTVCF5JZCY` immediately, with no Consent Mode call or cookie/opt-out text found in that source. The three observed event payloads contain only aggregate graph/demo fields (counts and null-model summary statistics), not chat/call/QR/photo or user identifiers. Do not add tracking until explicit consent, notice, retention and opt-out are verified.
- The GA4 aggregate connector was not exposed to this review runtime; no audience numbers were inferred or fabricated.

### Alerts and decisions
- Gmail: no new Cloudflare security/billing alert in the latest review window. A Cloudflare Observability pricing notice (2026-10-29) says volume-based logs/traces pricing begins 2026-12-01; Free Observability remains free with a daily ingestion cap, while Workers Paid customers may incur overage charges. No plan or billing change was made.
- Render sent a subprocessor notice (2026-11-12) effective 2026-11-20 adding Anthropic, Grafana Labs, Temporal and TypeSafe AI, all US-based. DPA objection deadline stated in the notice: 2026-11-20. No email or account change was made.
- No new tracking, permissions, paid accounts, billing, production config, call engine, user data or live Render deployment changes were made.
- Decision remains **NO RELEASE**: public HTTP/assets/CSP response verification, privacy review, live third-party smoke and real two-phone evidence are incomplete; the new PR #156 test fix has no post-fix CI result yet. No rollback was performed because no safe rollback evidence or user-approved production change was available.
