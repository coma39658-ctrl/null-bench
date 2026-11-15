# E-ZERO Release / Security Review — 2026-11-16 01:12 Asia/Riyadh

Delta from the earlier staging audit note `2026-11-16-0027-ezero-release-review.md`. Read-only review of owned E-ZERO repositories, GitHub Actions, Render service metadata, the supplied public URLs, and relevant provider mail. Public HTTP checks were limited to GET/HEAD attempts. No third-party targets, credentials, OTPs, private email addresses, phone numbers, chat/call contents, QR data, photos, or user-level analytics were accessed.

## Decision

**NO RELEASE / NO MERGE.** The public Pages and Render URLs still could not be resolved from the review environment, so actual HTTP status, response headers, served asset bytes and live origin/CSP remain UNKNOWN. Physical two-phone evidence is not present. The Secure App privacy page does not match the currently published calling/voice/message UI. The AI-health draft still triggers three Null Bench scope-guard failures.

No production deployment, rollback, live call/media engine, user data, Cloudflare configuration, Render settings, billing, account, permission or tracking configuration was changed. This review added only this non-sensitive note to the existing audit-only branch.

## GitHub / Secure App

- Current `main` source SHA: [a830a73f84ce0f9b0a116790d1330b00dcb9ec54](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54).
- Current `index.html` blob SHA: `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`.
- [GitHub Pages build/deploy run 43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693): SUCCESS for `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`. This proves the Pages workflow completed, not that the public URL or every served asset was independently fetched.
- [Frozen Secure Connect regression run 43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589): SUCCESS on main; see the earlier audit note for the skipped physical-media evidence step.
- [PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128) remains OPEN/DRAFT, head `3235b17df738f7583b7bbea3a7b3af521fe68c37`. Its signed 24-hour forwarding-card security gate [42508209792](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792) passed. The PR itself states that an unknown-owner request flow is not implemented and a forwarded offline card cannot be revoked before expiry. This is not proof of two-phone calling or a permanent public directory.
- [PR #152](https://github.com/coma39658-ctrl/null-bench/pull/152), head `5036916c070bcec601233441c93e38ae0ac8ef48`: the 10 observed head workflow runs completed SUCCESS, including [repeat direct calls without QR](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408006), [frozen regression](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408027), signed-QR lab and local-device preview. It remains DRAFT. Its own release gate requires two physical Android phones; Chromium/mocked signaling is not physical evidence. Screen-locked/browser-closed incoming calls still require a separate Web Push implementation.
- [PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156), head `f1c9748b61bab92db8c3fbb3a9841cb13c907b35`: the 8 observed head workflow runs completed SUCCESS, including [original-page no-QR gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310653) and [frozen regression](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310643). It remains DRAFT; Save Friend is visible but saving remains disabled until a real verified peer exists. No physical-device evidence.
- [PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157) is still DRAFT. Its current head is `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`; the PR body still cites an earlier head SHA and earlier evidence links. On the current head, [Distinct Edges](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), [Degenerate Verdict](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301) and [Professional Guide Release Gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216) FAILED before functional tests, at source/scope checks. Logs show the shared `index.html` and AI-health workflow/test files were outside the Null Bench-only change allowlist (`UNAUTHORIZED_FILE_CHANGE` / `UNEXPECTED_RUNTIME_OR_PRIVACY_FILE_CHANGE`). Other AI Studio and Secure Connect staging checks completed SUCCESS. Keep this PR isolated and draft; do not bypass the scope guards.

### Governance

The active [E-ZERO Secure Connect ruleset](https://github.com/coma39658-ctrl/null-bench/rules/26684871) applies to the default branch. It requires only `frozen-two-phone-contracts`, sets required approving reviews to zero, and does not require code-owner review or review-thread resolution. Strict required-status policy is false. The ruleset has no bypass actor, but it does not independently enforce the owner's physical two-phone, public HTTP, privacy, asset-parity or rollback gates. The classic branch-protection endpoint returned 403 to the connected integration; no extra permission was requested or changed.

## Public HTTP, assets, CSP and Render

- Passive GET/HEAD attempts to [GitHub Pages](https://coma39658-ctrl.github.io/null-bench/) and [the supplied Render TEST URL](https://ezero-secure-app-two-phone-test-20261107.onrender.com/) failed at DNS resolution in the review environment. This is **not** evidence that either service is down. No response headers, status code, body, asset bytes, live CSP or live origin could be confirmed.
- The target Render static site is configured with Auto-deploy OFF and points to `ezero-profile-first-saved-friends-20261106`. Latest live deploy: [commit 51d7aec556dec935d74edf339d86f3794f5aa865](https://github.com/coma39658-ctrl/null-bench/commit/51d7aec556dec935d74edf339d86f3794f5aa865). Current source branch head is `6b1f65627e9e414643f97c78baf498be3fa1ff5f`, one commit ahead; that commit is a CI verification change, not an app-asset update. The deployed source therefore matches the branch content at the last live build, but actual served asset hashes remain UNKNOWN.
- The Render build script embeds a 12-character build SHA in the staging banner and adds SHA-based cache-busting query strings to local JS/CSS. This is version/cache control, not per-file SRI. The output includes `robots.txt` disallowing crawl. The source page uses a restrictive **meta** CSP: self-only scripts/styles, limited owned WSS connections, no objects or frames, and no inline scripts/styles. A meta CSP is not proof of response-header CSP; `frame-ancestors`, HSTS, nosniff, Permissions-Policy and other edge headers remain UNKNOWN.
- The Render staging build intentionally disables Trusted Inbox on its different origin because the existing signed challenge is bound to the GitHub Pages origin. QR/WebRTC room signaling remains in the staging copy. Therefore this Render URL cannot, by itself, prove the saved-friend Trusted Inbox direct-call path.
- A newer simplified-home Render staging service has a later live deploy [commit 97978aa62c9a0df3bc887171f6b88618b5f95a67](https://github.com/coma39658-ctrl/null-bench/commit/97978aa62c9a0df3bc887171f6b88618b5f95a67). Two earlier build attempts on Nov 13 failed (`bb7fc2b`, `41b9502`), but the later Nov 13 deploy completed LIVE and superseded them. Auto-deploy remains OFF. No public HTTP smoke was possible.

## Privacy, accessibility and tracking

- The Secure App privacy page is dated 5 November 2026 and describes a QR-only service: it says the page does not activate microphone/calls, does not run MediaRecorder, and does not provide a full audio/video or chat service. The current Secure App page contains audio/video call controls, voice-message controls and private-message UI. **This is a material policy/content discrepancy and a release blocker** until the policy is reviewed and made accurate for the actual deployed feature set.
- The main `index.html` loads GA4 immediately and calls `gtag('config', ...)` without a visible consent default/choice gate or analytics notice in that file. No new tracking was added. Do not add error/behavior tracking until explicit opt-in, minimization, aggregate-only reporting, no chat/call/QR/photo capture, retention and opt-out are implemented and documented.
- The main page root has `translate=no` / `notranslate`, while its manual language selector updates document `lang` and `dir`; Urdu, Arabic and English are present in the public guide. Manual language selection is available, but browser auto-translation is intentionally suppressed. The public support link also embeds a direct phone number; confirm it is an approved business contact before retaining it publicly (the number is deliberately not copied into this note).
- The Null Bench quick-start accurately describes degree-preserving edge rewiring, null samples, swap attempts, observed clustering, null mean/SD, 95% interval and z-score. It notes that the public UI has no random-seed control and explicitly says exploratory results do not establish causation, diagnosis or physical proof.

## AI / Qwen — high-level only

- The private AI adapter's latest daily offline QA workflow completed SUCCESS on Nov 15. Its current gateway source requires an explicit server-side public-enable flag, uses an exact GitHub Pages origin allowlist, bounds request/history sizes, rate limits requests and concurrent inference, and suppresses normal request-body logging. Its client-IP limiter uses the TCP peer address; behind a reverse proxy this requires a live-path check to ensure users are not all grouped under the proxy address.
- The public AI status correction remains a draft staging change; current main UI status is based on a client-side enable flag, while the draft attempts to wait for a live health contract. The draft does not itself perform live provider/Worker smoke.
- Provider profiles remain pre-activation/selection evidence, not current price or availability proof. The public web-research specification says it does not itself implement browsing. No live source-backed web search, public video retrieval, provider balance, current pricing or spend cap was verified. Do not claim these capabilities are live or enable paid usage.

## Gmail / provider notices / analytics

- Render mail included two Nov 13 build-failure notices for the newer simplified-home staging service; a later Nov 13 deploy completed LIVE, so those notices are historical attempts rather than proof of the current deploy failing.
- Render also sent a legal subprocessor notice effective **20 November 2026**, adding Anthropic, Grafana Labs, Temporal Technologies and TypeSafe AI (US-based). Review the DPA/privacy disclosures before that date if E-ZERO data is processed by affected Render features.
- The Cloudflare mail found in the review window was promotional, not a security/service/billing alert. The billing/invoice search returned no relevant provider billing notices. GitHub Code Scanning emails inspected were setup notifications, not a concrete vulnerability report. This does not substitute for a code-scanning dashboard review.
- The non-deploy [Mail Alert Health Gate Audit run 43616198243](https://github.com/coma39658-ctrl/null-bench/actions/runs/43616198243) FAILED one CORS-origin regression test (CRLF/LF exact-origin handling); it is a CI failure, not evidence of a provider email alert.
- The authorized GA4 report connector was not exposed as a callable tool in this run. 30-minute, 24-hour, completed 7-day/28-day, country, landing-page and acquisition reports are **UNAVAILABLE**, not zero. No traffic estimate was made from Render metrics.

## Check summary

| Check | Result |
|---|---|
| GitHub main SHA / Pages workflow | PASS (workflow only) |
| GitHub Pages public HTTP + asset bytes | UNKNOWN (DNS unavailable) |
| Target Render deploy metadata | PASS (deploy record; HTTP/asset smoke UNKNOWN) |
| Render staging asset SHA parity | PARTIAL (source compare only; served bytes unknown) |
| Secure App CSP source | PARTIAL (meta CSP inspected; response headers unknown) |
| PR #128 security contract | PASS (CI only; draft, physical evidence absent) |
| PR #152 / #156 automated browser and contract CI | PASS (drafts; physical two-phone evidence absent) |
| PR #157 | FAIL (3 Null Bench scope gates) |
| Privacy-policy consistency | FAIL / BLOCKER |
| Physical two-phone evidence | UNKNOWN / BLOCKER |
| Live Cloudflare / third-party smoke | UNKNOWN / BLOCKER |
| GA4 aggregate analytics | UNAVAILABLE |
| New tracking / billing / permission changes | NONE |

**Final gate: NO RELEASE.** Keep all drafts isolated. Do not merge or deploy until every required CI check passes, privacy policy matches actual features, staging and served asset SHAs match, third-party live smoke succeeds, and real two-phone evidence is recorded.