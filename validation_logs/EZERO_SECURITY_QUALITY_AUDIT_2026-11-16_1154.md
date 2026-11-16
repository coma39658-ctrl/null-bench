# E-ZERO Security / Quality Review — 2026-11-16 11:54 Asia/Riyadh

**Disposition: PARTIAL / NO RELEASE.** This review is read-only for product/runtime systems. One non-sensitive audit note is being added to the existing isolated audit branch only. No application source, main branch, user data, live audio/video/chat, Cloudflare or Render configuration, account permission, billing, analytics setting, or production deployment was changed.

## 1. Main repository and Pages deployment

- Repository: https://github.com/coma39658-ctrl/null-bench
- Current main SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54` (commit timestamp 2026-11-15 18:04:27Z); GitHub reports the commit signature as verified.
- The GitHub Pages build/deploy workflow completed successfully on this exact SHA: https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693
- The main commit has 11 check-runs, all completed successfully. This confirms the build/deploy job, not current CDN response bytes or physical-phone behavior.
- Current public GitHub Pages URL and the requested Render TEST URL could not be fetched by the available public-web access in this execution. HTTP status, response headers, live asset hashes, and Render deployed SHA are therefore **UNKNOWN**, not evidence that either service is down.
- A historical public URL/Render staging smoke did pass on 2026-11-08 (run https://github.com/coma39658-ctrl/null-bench/actions/runs/42507891268). It used Chromium/Firefox/WebKit browser simulations and a read-only curl smoke, but it is stale and does not prove today's deployment SHA or asset parity.
- Repository source references were inspected, but no current public response was available for a served-vs-source hash comparison.

## 2. Current source integrity, CSP and origins

Source-level observations on main:

| File | Git blob SHA | CSP meta | External script tags | Inline script tags | SRI |
|---|---|---:|---:|---:|---:|
| `index.html` | `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41` | 0 | 11 | 11 | 0 |
| `ezero_trusted_friends_staging_20261106.html` | `de9d94c33c722472798e2f761353e69317ae26e2` | 1 | 22 | 0 | 0 |
| `ezero_secure_connect_live_p2p_v0_1.html` | `f1ba0e834c412cdbc11b90efa0869971e199054c` | 1 | 4 | 0 | 0 |
| `ezero_secure_connect_communications_v0_3.html` | `7244fe297a8af1f1084407dfc79679671436df70` | 1 | 13 | 0 | 0 |
| `ezero_secure_connect_privacy_v0_2.html` | `e8088b849746231964674a8218ffd945ad5d9965` | 1 | 1 | 0 | 0 |

- The root `index.html` has no CSP meta and no SRI attributes. Its 11 inline scripts mean a future CSP must use carefully reviewed nonces/hashes rather than adding a broad `unsafe-inline` allowance. Actual HTTP response-header CSP remains unknown.
- The main trusted-friends staging page has a restrictive meta CSP with `default-src 'none'`, self-only scripts/styles, and explicit WSS allow-list entries for the owned pilot signaling and trusted-inbox staging origins. Its 22 script tags have no SRI.
- The standalone QR/entry page has `connect-src 'none'`; the communications v0.3 page has `connect-src 'self'`. The latter's ordinary auto-signaling config is currently `enabled:false`, so no active external WebSocket origin was found in that config.
- The trusted-inbox staging config is explicitly `enabled:true` and points to the staging WSS origin. The browser client requires user action before opening a socket; this is a staging configuration, not evidence of a successful live handshake.
- The service worker excludes third-party/AI responses from its cache and uses versioned same-origin app caching. No service-worker change was made.
- No SRI was found on any inspected page. Add SRI where static external scripts are used, and preserve strict CSP/explicit origin allow-lists. Do not infer response-header security from meta tags.

## 3. Secure App saved-friend / no-QR baseline

- Main page currently references `js/ezero_saved_friend_stage_people_v0_1.js?v=20261106stage1`.
- Draft PR #156 changes that script cache key to `v=20261116savefriend1`, makes the Save Friend panel visible before the first call while keeping the save button disabled until a real matching WebRTC peer is verified, and strengthens tests so an existing saved friend remains after a new QR pairing and repeated calls.
- PR #156: https://github.com/coma39658-ctrl/null-bench/pull/156
- PR #156 head SHA: `373ab6266fe54fe894dea5d011f06acc1ffdd03b`; base main SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`; still OPEN/DRAFT.
- The latest PR #156 head has 13/13 check-runs completed successfully: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197 and related run links below.
- Important provenance: the “two-phone” and “public real video” job labels are simulated CI. The workflow serves the candidate on localhost, uses headless Chromium/fake-camera browser contexts, and does not use two physical Android/iOS phones or the live Cloudflare Worker. The log's public-video assertions are browser-stack tests, not device evidence.
- A separate no-QR preview branch `ezero-noqr-friend-consent-status-fix-20261115` at SHA `1f5b860fd7bd9aaaf8ee632a9c5c9893bcee8315` has 13/13 check-runs PASS, but it is likewise local browser simulation, not a public release candidate.
- Earlier intermediate no-QR commits did fail CI; the current branch head is green, so the old failure notifications should not be mistaken for a failure of the latest PR #156 SHA.

## 4. PR #128 and trusted-inbox staging blockers

- PR #128: https://github.com/coma39658-ctrl/null-bench/pull/128
- Still OPEN/DRAFT; head SHA `3235b17df738f7583b7bbea3a7b3af521fe68c37`; base is `ezero-profile-first-saved-friends-20261106`, not main.
- Eight recorded checks on that head completed successfully, but the evidence is from 2026-11-08 and is stale.
- The PR body explicitly says unknown-owner direct contact requests are not implemented; a forwarded offline contact card cannot be revoked before its 24-hour expiry. It must not be presented as a permanent contact directory or direct stranger-call feature.
- The old three-browser/public-smoke run #42507891268 passed, including a read-only curl of the public Pages and Render staging URLs. It does not match the current main SHA and did not verify asset hashes or real phones.
- Historical Render Trusted Inbox CI failure (run https://github.com/coma39658-ctrl/null-bench/actions/runs/43284714363): a workflow attempted to load JSONC using Node `require()`, causing a syntax error; the runtime test also had one P-256 owner-authentication assertion fail (8/9 tests passed). Historical static safety run #42982382962 had one valid owner-authentication test rejected as unauthorized (8/9 passed). These are old staging failures; no live inbox activation was attempted.
- Current trusted-inbox handshake, request routing, owner accept/reject/block, abuse quotas, revocation, TTL/retention, and physical A/B/C-phone end-to-end evidence remain unverified.

## 5. AI Studio / Null Bench workstream isolation

- Draft PR #157: https://github.com/coma39658-ctrl/null-bench/pull/157
- Head SHA `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`; 16 check-runs include 3 failures and 13 successes.
- The AI health-status contract test passes, but three Null Bench gates fail: distinct-edge, degenerate-verdict, and professional-guide. Their logs show the strict scope guards reject the shared `index.html` and the added AI workflow/test files as `UNAUTHORIZED_FILE_CHANGE` / `UNEXPECTED_RUNTIME_OR_PRIVACY_FILE_CHANGE`. Do not bypass or weaken those gates. Keep AI Studio changes isolated from Null Bench `#try`.
- Current main `index.html` initializes `EZERO_PUBLIC_AI_ENABLED=true` before the asynchronous health check; a network/health failure can leave an overly optimistic initial “Governed AI Live” status. PR #157 changes the initial state to “Checking” and failure to “unverified”; this is not releasable while the cross-workstream gates fail.
- No live AI health request was available in this execution. Do not claim current public AI, live search, video analysis, or provider availability.

## 6. Qwen adapter, privacy and cost

- Private repository: https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter
- Default branch: `qwen-public-agent-persona-web-boundary-v0.1`.
- Latest daily offline QA: PASS on 2026-11-15, run https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545 (SHA `39adf3a429503f86cdc1f248f9080af50548ee03`).
- Draft PR #40 (privacy/credit guard) adds OpenRouter-only `data_collection=deny`, `zdr=true`, `allow_fallbacks=false`, and fail-closed HTTP 402 handling without retry, auto-top-up, or paid substitution. Unit tests are offline; no live provider call or billing action was made. The PR remains DRAFT and the guard is not established as deployed.
- Draft PR #29 adds read-only fixed-public-site awareness with URL, redirect, size, origin and content limits; its workflow uses dry-run/mock checks and does not deploy live web research.
- The inspected gateway has exact public-origin validation, HTTPS-only public upstream, request/body/history limits (up to 12 history messages), rate/concurrency controls, and a one-inference concurrency cap. It forwards bounded history to the provider; provider retention/processing terms are not independently verified. No hard monetary spend cap was found in the inspected config. Request limits are not a guaranteed dollar cap.
- Do not self-train on user chats. Require clear user disclosure/consent before sending conversation history to a provider, confirm provider retention terms, and add an owner-approved hard spend cap before any paid profile is enabled.

## 7. Privacy, GA4, languages and accessibility

- Main `index.html` immediately loads GA4 measurement `G-YTVCF5JZCY` without an explicit consent API or opt-out found in the inspected source.
- Existing events send demo type and edge count, test-start edge count, and completion metadata (node/edge counts, null sample/swap counts, observed transitivity, null mean/SD and z-score). The inspected event payloads do not include raw edge lists, chat/call content, QR data or photos. These are still user-activity/derived-statistic telemetry; no new tracking was added.
- The Secure Connect privacy page is scoped to the current QR page and describes a separate experimental communications page. It does not yet document the current Trusted Inbox staging request metadata, server-side abuse logs, revocation, retention, or all third-party staging origins. Clarify policy scope and update it before any inbox/contact-forwarding release.
- Urdu, Arabic and English UI/policy strings are present. This source review does not prove screen-reader, keyboard-only, contrast, dynamic RTL/LTR or real-device accessibility.
- Latest PR #156 CI uses Chromium simulation; older PR #128 used Chromium, Firefox and WebKit browser simulation. No current physical Android Chrome, iOS Safari/WebKit, desktop screen-reader or assistive-technology evidence is attached to the candidate SHA.

## 8. GitHub protection / release governance

- Active repository ruleset: https://github.com/coma39658-ctrl/null-bench/rules/26684871
- It applies to the default branch, but only requires `frozen-two-phone-contracts`; strict status enforcement is false; required approving reviews are zero; last-push approval and code-owner review are not required.
- Branch-protection detail endpoint returned 403 to this integration, but the ruleset itself is readable. The current ruleset is weaker than the owner's manual NO-RELEASE policy. No ruleset or permission changes were made.
- Main's 11 check-runs and PR #156's 13 check-runs are green, but public HTTP/asset parity, privacy policy, live third-party smoke and physical two-phone evidence are not green/verified.

## 9. Gmail / Render / Cloudflare alerts

- Render build failure notice dated 2026-11-13: service `ezero-secure-simple-home-two-phone-20261113`, build exit status 1, commit `bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca`. This is a different service from the requested `ezero-secure-app-two-phone-test-20261107`; do not infer that the named TEST service failed.
- Render DPA notice dated 2026-11-12: four US subprocessors become effective 2026-11-20 — Anthropic, Grafana Labs, Temporal Technologies, and TypeSafe AI. No objection was sent and no billing/account change was made.
- No Cloudflare security or billing alert was found in the last seven days of targeted Gmail search.
- GitHub notifications include the historical Trusted Inbox CI failures above and the current PR #157 scope-gate failures. The latest Mail Alert Health Gate run on the updated branch succeeded: https://github.com/coma39658-ctrl/null-bench/actions/runs/43616268311; the adjacent earlier attempt failed, so the failure email is not evidence of a new GitHub platform incident.
- Render account-level service/deploy/metrics inspection was not performed because a workspace was listed but not explicitly selected/confirmed for this run. No new paid account, permission, workspace setting, or billing change was made.

## 10. Analytics availability

- No authorized Windsor/GA4 reporting action was exposed in this execution. Completed 30-minute, 24-hour, 7-day and 28-day active users, sessions, pageviews, countries, landing pages and acquisition sources are **UNKNOWN**. No traffic estimate was invented and no user-level analytics were queried.

## Evidence links

- Main commit: https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54
- Pages deploy on that SHA: https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693
- PR #128: https://github.com/coma39658-ctrl/null-bench/pull/128
- PR #128 signed-contact checks: https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792
- PR #128 historical public smoke: https://github.com/coma39658-ctrl/null-bench/actions/runs/42507891268
- PR #156: https://github.com/coma39658-ctrl/null-bench/pull/156
- PR #156 frozen regression: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197
- PR #156 original-page/no-QR gate: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230
- PR #156 local two-browser call test: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521200
- PR #156 fake-camera browser video gate: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521180
- PR #157: https://github.com/coma39658-ctrl/null-bench/pull/157
- PR #157 distinct-edge failure: https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350
- PR #157 degenerate-verdict failure: https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301
- PR #157 professional-guide failure: https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216
- Qwen daily QA: https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545
- Qwen PR #40: https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40
- Qwen PR #29: https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/29
- Active main ruleset: https://github.com/coma39658-ctrl/null-bench/rules/26684871

## Final release gate

**NO RELEASE.** Blockers: public HTTP/response headers and served asset SHA parity UNKNOWN; current Render and Cloudflare live smoke incomplete; no current physical two-phone evidence; Secure Connect privacy scope needs an inbox/communications addendum; SRI absent; main-site GA4 has no explicit consent/opt-out; PR #157 has three workstream-boundary failures; repository ruleset requires no approval and only one non-strict check. Keep all application changes staged and preserve the existing main/live app.
