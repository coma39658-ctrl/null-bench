# E-ZERO Security / Quality Audit — 2026-11-16 09:16 Asia/Riyadh

**Disposition: PARTIAL / NO RELEASE.** This is a read-only source, CI, email-alert and bounded public-HTTP audit. No production code, user data, Cloudflare settings, Render settings, permissions, billing, or deployment were changed. The only write is this non-sensitive audit note on an isolated staging branch.

## Executive findings

1. GitHub Pages source is at main commit `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`. The Pages build/deploy, frozen Secure Connect regression and Evidence Registry Validator all completed successfully on that SHA. The live public HTTP request could not resolve DNS in this execution environment; this is **UNKNOWN**, not proof that the site is down.
2. Main's Secure App entry points to `ezero_trusted_friends_staging_20261106.html` (blob `de9d94c33c722472798e2f761353e69317ae26e2`). Its 32 relative local asset references resolve in the main repository tree. It has a strict meta CSP, no inline script blocks or style attributes, and no SRI `integrity=` attributes. Served HTTP headers and actual delivered asset hashes remain UNKNOWN.
3. The public main page loads GA4 `G-YTVCF5JZCY` immediately in `index.html` (blob `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`). No explicit GA4 consent API or visible analytics opt-in/opt-out was found in that file; no CSP meta was found there. The separate Secure Connect privacy page does not document the main site's GA4 load. No new tracking was added. Aggregate GA4 reports were unavailable in this run; no user-level analytics were accessed.
4. The main Secure App page loads the Trusted Inbox staging config with `enabled:true` (config blob `2e6eac44fa9b8d016a47806eecb8e37fde6a0d2a`) and the staging WSS hostname. The isolated deployment branch's config remains `enabled:false` (blob `6fbc3877f2ebf9744fb1c21c78a2e45b88594abd`). The manual deployment workflow succeeded on 2026-11-06 and its log reports Worker version `7ed9431e-977e-4027-8ca2-d4fc13953c0e`; the deployed Worker source blob is `982f6b0ed4910d0f69d2b65c3916a1f0419a2aa3`. However, no verified live WSS challenge/handshake or physical two-phone redial evidence was found. Source comments/docs still label this candidate “not deployed”, which conflicts with the successful deployment log. Treat this as a configuration/documentation drift and release blocker; do not toggle it or redeploy during this audit.
5. PR #128 remains OPEN/DRAFT. Its head is `3235b17df738f7583b7bbea3a7b3af521fe68c37`, targeting staging branch `ezero-profile-first-saved-friends-20261106`, not main. Its latest head runs (Signed Contact Forwarding Security Gate and Evidence Registry Validator) passed on 2026-11-08, but the evidence is old and does not prove live inbox, real-device, revocation or two-phone behavior.
6. Newer Secure App PR #156 remains OPEN/DRAFT at `373ab6266fe54fe894dea5d011f06acc1ffdd03b`. Nine related browser/CI workflows passed, including the “Two Mobile Browser Gate”; the PR explicitly says these are lab/browser tests and do not prove physical Android/iOS or live Cloudflare behavior. No merge.
7. AI Studio PR #157 remains OPEN/DRAFT at `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`. The AI health-truthfulness and Evidence Registry checks passed, but three Null Bench release gates failed because the AI change touches shared `index.html` and the Null Bench scope guards reject that cross-workstream diff. These are changed-file boundary failures, not proof of a Null Bench mathematical regression. Keep draft; do not weaken the Null Bench guards.
8. Qwen's private repository default branch is `qwen-public-agent-persona-web-boundary-v0.1`, SHA `39adf3a429503f86cdc1f248f9080af50548ee03` (verified commit). Daily AI Search & Evidence Auto QA passed on 2026-11-15. PR #40 (OpenRouter privacy/402 fail-safe) and PR #29 (public site-awareness) remain drafts. No live provider request was made; model availability, provider credits and spend cap are UNKNOWN.
9. The active GitHub ruleset requires only `frozen-two-phone-contracts`, has zero required approving reviews, and does not enforce strict required status checks. The branch-protection API reports required checks enforcement off. This is insufficient for the owner's full release gate. No ruleset or permission was changed.
10. Render TEST and GitHub Pages public HTTP HEAD requests both failed DNS resolution in this execution environment. This does not establish a service outage. Render service details were not queried because the Render connector requires explicit workspace selection; no workspace was selected. Render's actual deployed SHA for the named TEST URL remains UNKNOWN.

## Exact evidence and links

### GitHub Pages / main

- Main commit: [a830a73](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54)
- [Pages build and deployment — run 43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693) — PASS
- [Frozen Secure Connect Regression Gate — run 43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589) — PASS (isolated browser/CI evidence, not physical phones)
- [Evidence Registry Validator — run 43744655616](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616) — PASS
- Main `index.html` blob: `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`
- Secure App page blob: `de9d94c33c722472798e2f761353e69317ae26e2`
- Privacy page blob: `e8088b849746231964674a8218ffd945ad5d9965`
- Public HTTP probe: `curl -I` could not resolve `coma39658-ctrl.github.io`; response status, headers, cache and served SHA are UNKNOWN.

### Secure App / Trusted Inbox

- [PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128) — OPEN/DRAFT, head `3235b17df738f7583b7bbea3a7b3af521fe68c37`
- [PR #128 Signed Contact Forwarding Security Gate — run 42508209792](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792) — PASS (2026-11-08)
- [PR #128 Evidence Registry Validator — run 42508209782](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209782) — PASS (2026-11-08)
- [PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156) — OPEN/DRAFT, head `373ab6266fe54fe894dea5d011f06acc1ffdd03b`
- PR #156 latest passing runs: [two-mobile-browser gate 43777521180](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521180), [contact-first QA 43777521200](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521200), [frozen regression 43777521197](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197), [original-page/no-QR gate 43777521230](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230), [signed QR/P2P lab QA 43777521221](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521221), [local device preview QA 43777521191](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521191), [Evidence Registry 43777521184](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521184), [AI video-frame QA 43777521192](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521192), [voice-share/install QA 43777521187](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521187) — all PASS at the same PR head.
- [Trusted Inbox staging deploy — run 42235178152](https://github.com/coma39658-ctrl/null-bench/actions/runs/42235178152) — PASS on 2026-11-06; deploy log reports `ezero-trusted-friends-inbox-staging`, Worker version `7ed9431e-977e-4027-8ca2-d4fc13953c0e`.
- Candidate Worker source blob: `982f6b0ed4910d0f69d2b65c3916a1f0419a2aa3`. Source includes exact Origin check, 20-second signed P-256 challenge, max 8 clients per recipient object, max 50 friends, 30-second cooldown, 10-minute replay window and no offline delivery/media/chat storage. No global edge/IP rate limiter is visible in this candidate source.
- Main config is enabled and points to `wss://ezero-trusted-friends-inbox-staging.coma39658.workers.dev`; staging branch config is disabled. The separate automatic signaling flag remains disabled. The Trusted Inbox live-smoke script exists, but no successful live handshake run was verified.
- The Secure App page is Urdu/RTL by default with Urdu/English/Arabic selector, explicit camera/mic consent, opt-in profile sharing, optional local call history with 10-minute expiry, and a back-to-home link. The policy describes WebRTC, one-view text, user-initiated six-second voice notes, profile sharing and local history. No physical Android/iPhone, Safari/WebKit, VoiceOver/TalkBack or desktop browser evidence was available.
- Page CSP is a restrictive meta policy with exact WSS hosts; `default-src 'none'`, self-only scripts/styles, no objects, base URI or forms. The main `index.html` itself has no CSP meta. Actual response security headers/HSTS remain UNKNOWN.

### AI Studio / Qwen / Null Bench

- AI Studio page source blob: `f1247d083428f822f789d2b5106a12b6930f7e91`; Urdu default, voice/image consent UI and ARIA annotations are present in source. Real mobile/WebKit accessibility remains untested.
- [AI Studio PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157) — OPEN/DRAFT, head `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`
- [AI health status truthfulness — run 43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376) — PASS
- [AI Evidence Registry — run 43763736190](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736190) — PASS
- Null Bench guards rejected the shared `index.html` diff: [Degenerate verdict run 43763736301](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301), [Distinct edges run 43763736350](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), [Professional guide run 43763736216](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216) — FAIL. Logs show the changed-file boundary check failing on `index.html`; no Null Bench algorithm test ran after that guard.
- Qwen default branch `qwen-public-agent-persona-web-boundary-v0.1` SHA `39adf3a429503f86cdc1f248f9080af50548ee03`; [Daily AI Search & Evidence Auto QA — run 43699933545](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545) — PASS.
- [Qwen PR #40](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40) — OPEN/DRAFT, head `e83327a220ad3b4aee9ab3917e60b5f841a459a8`; isolated OpenRouter `data_collection=deny`, `zdr=true`, `allow_fallbacks=false` and HTTP 402 fail-safe tests passed in [run 42497749021](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497749021). No provider request, spend or live availability was verified.
- [Qwen PR #29](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/29) remains draft; public site-awareness uses an allowlisted GET with bounded timeout/response size in its candidate, not a verified live deployment.
- GA4 connector report action was not available in this run. No 30-minute, 24-hour, 7-day, 28-day, country, page or acquisition figures were read. Missing analytics is UNKNOWN, not zero.

### Gmail alerts / Render / Cloudflare

- No new Cloudflare security, service or billing email was found in the last 7 days.
- Render sent two duplicate build-failed notices on 2026-11-13 for the different service `ezero-secure-simple-home-two-phone-20261113`, exit status 1. The reported commits were `bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca` and `41b950267d599151d79a79025da6a00bf0b1dd8b`. This is not the named 2026-11-07 TEST URL, and no current service state is inferred from it.
- Render's 2026-11-12 DPA notice says four US subprocessors become authorized on 2026-11-20: Anthropic (AI/ML), Grafana Labs (monitoring/observability), Temporal (workflow orchestration), and TypeSafe AI (AI/ML). No billing alert was found. No objection or account change was made.
- Render workspace listing exposed a workspace, but the connector requires the owner to select the workspace before service inspection. No workspace was selected, and no service mutation was attempted.
- The 2026-11-16 GitHub email for Mail Alert Health Gate attempt #2 relates to a 2026-11-14 CRLF fixture failure. A later run [43616268311](https://github.com/coma39658-ctrl/null-bench/actions/runs/43616268311) passed after the fixture was corrected to use actual LF bytes; treat this as a resolved audit-test failure, not a current service outage.
- The Render TEST URL also failed DNS resolution in this execution environment. HTTP status, CSP/headers and served asset SHA are UNKNOWN.

## Release decision and next safe gates

**NO RELEASE.** Reasons: live public HTTP and Render smoke unavailable; actual Render deploy SHA unknown; Trusted Inbox live WSS handshake unverified; real two-phone Android/iOS evidence absent; main-vs-staging Trusted Inbox config drift; main-site GA4 consent/privacy gap; ruleset does not require human approval or the full required CI set; AI Studio PR has cross-workstream gate failures.

Next bounded work should remain isolated: (a) reconcile Trusted Inbox enabled/disabled source and deployment documentation only after live owner-approved smoke; (b) run physical Android-to-Android and Android-to-iPhone foreground call/redial cycles; (c) separate AI Studio status changes from the shared Null Bench `index.html` boundary without weakening Null Bench guards; (d) obtain explicit owner decision on GA4 consent/opt-out and Render's 2026-11-20 DPA notice; (e) verify Render workspace/service SHA and public HTTP/asset parity after owner selection.

No production code, public main branch, deployed app, audio/video/chat engine, user data, tracking configuration, Cloudflare account, Render service, permission or billing setting was changed in this audit.


## Audit-note validation caveat

- Audit-only commit: `dd564bdf5101f1ca6330d2ada14d81a445d5e2bd`; audit file blob: `040030e33a95515c0650fad780aa1224c7fdcaad`.
- The branch-scoped Evidence Registry Validator run [43816564940](https://github.com/coma39658-ctrl/null-bench/actions/runs/43816564940) completed successfully, but its API-reported `head_sha` is the base main commit `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`, not the audit commit above. Therefore it is **not** accepted as audit-commit-specific validation evidence. Audit-note-specific CI status remains UNKNOWN; the note remains isolated and unmerged.
