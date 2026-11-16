# E-ZERO silent security / release review — 2026-11-16 04:45 Asia/Riyadh

Scope: read-only inspection of `coma39658-ctrl/null-bench`, draft PRs #128/#156/#157, the requested Render test service, the published GitHub Pages workflow, the Qwen adapter, and relevant Gmail notices. No production writes, deployments, permission changes, account creation, billing changes, or user-data access were performed. A read-only HTTPS GET attempt was made only against owned E-ZERO URLs.

## Executive gate

**NO RELEASE.** Public HTTP/served-asset parity, Render-specific Worker handshake, physical two-phone evidence, privacy/analytics alignment, and full required CI evidence are not all verified. Keep all related PRs Draft and all communications changes staging-only.

## Null Bench main / GitHub Pages

- Main SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`.
- Main commit signature: verified valid.
- Pages deployment run: [43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693) — PASS at the same main SHA.
- Frozen regression run: [43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589) — PASS.
- Evidence validator: [43744655616](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616) — PASS.
- Current source blob SHAs: `index.html` `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`; `service-worker.js` `88873630331efafead77eef5c430ba0eaabeda1d`; Secure Connect communications page `7244fe297a8af1f1084407dfc79679671436df70`; privacy page `e8088b849746231964674a8218ffd945ad5d9965`.
- Direct read-only HTTPS GET from this execution environment failed before HTTP with DNS resolution error for GitHub Pages and the two owned Render hosts. Therefore HTTP status, response headers, actual served body SHA, and served asset SHA are **UNKNOWN**, not failed or zero.

### Main release ruleset

The active default-branch ruleset is named **E-ZERO Secure Connect Protection**. It requires only `frozen-two-phone-contracts`; strict status policy is false; required approving reviews are 0; code-owner review and last-push approval are not required. This does not enforce the complete CI/privacy/public-smoke/physical-device gate requested by the owner. No ruleset or permission was changed.

## Draft PRs / staging branches

### PR #128
- [Draft PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128)
- Head `3235b17df738f7583b7bbea3a7b3af521fe68c37`; base branch `ezero-profile-first-saved-friends-20261106`, base SHA `6b1f65627e9e414643f97c78baf498be3fa1ff5f).
- Eight historical check-runs are green, including signed-contact contract runs [42508209792](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792) and [42508203894](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508203894).
- Draft only; base is not main. Third-party unknown-recipient inbox, revocation, spam/rate controls, and physical two-phone verification remain absent. No merge.

### PR #156
- [Draft PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156)
- Head `373ab6266fe54fe894dea5d011f06acc1ffdd03b`; base main `a830a73f84ce0f9b0a116790d1330b00dcb9ec54).
- Thirteen check-runs are green. Relevant runs: [No-QR release gate 43777521230](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230), [Frozen regression 43777521197](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197), [two-mobile Chromium gate 43777521180](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521180).
- The workflow/evidence explicitly describes isolated two-browser Chromium/WebRTC with mocked Worker, not physical phones or live Cloudflare proof. Keep Draft.

### PR #157 (AI Studio)
- [Draft PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157)
- GitHub PR metadata head is `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`, while the PR body cites `e2dce0b95e93c8e215783609a6c13d037c3518c8`: stale/mismatched evidence metadata.
- The AI health truthfulness check [43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376) passes, but three required scope/regression checks fail: [distinct-undirected-edges 43763736350](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), [degenerate-null-verdict 43763736301](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301), and [professional-guide gate 43763736216](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216).
- Main `index.html` still initializes `EZERO_PUBLIC_AI_ENABLED=true` and renders the “Governed AI Live” status before a successful health contract is known; if the health request fails, the old label can remain. PR #157 is intended to correct this, but failed gates and SHA mismatch block release.

## Render TEST — requested 2026-11-07 service

- URL: https://ezero-secure-app-two-phone-test-20261107.onrender.com/
- Render reports the latest live deploy at SHA `51d7aec556dec935d74edf339d86f3794f5aa865` (2026-11-07 17:20Z), from branch `ezero-profile-first-saved-friends-20261106`.
- Current branch head is `6b1f65627e9e414643f97c78baf498be3fa1ff5f`, one commit beyond the deployed SHA. Both the deployed commit and branch head are unsigned; branch is unprotected. Service auto-deploy is off.
- Build script blob SHA `9556035f183fbbe3011d8f1818e874f0eb378957`; it builds `ezero_trusted_friends_staging_20261106.html` plus the tri-lingual privacy page, uses a noindex/nofollow landing page and robots disallow, and appends a build-SHA query to local JS/CSS URLs for cache separation. This is cache-busting, not proof of per-file SRI integrity.
- The build script replaces the pilot WSS endpoint with `wss://ezero-browser-signaling-render-test.coma39658.workers.dev`, checks the Render-origin WSS is in the preview CSP/config, and keeps the GitHub Pages inbox disabled on this different origin. The source CSP still includes an additional trusted-inbox WSS origin even though that inbox is disabled; review whether that unused allowance can be removed.
- The Render-specific Worker deployment/config and real handshake were not verified. The checked-in pilot Wrangler config still sets `PUBLIC_ORIGIN=https://coma39658-ctrl.github.io`, so it must not be assumed to be the Render Worker configuration.
- The newer simplified Render service is a separate origin and service. Its latest deployment [commit 97978aa62c9a0df3bc887171f6b88618b5f95a67](https://github.com/coma39658-ctrl/null-bench/commit/97978aa62c9a0df3bc887171f6b88618b5f95a67) is live from 2026-11-13 08:57Z. The earlier Render build-failure email for that separate service was superseded by this later successful deployment. Do not treat it as proof that the requested 2026-11-07 service was updated.

## Signaling / origin security (source review only)

- Checked-in Worker source: `signaling/cloudflare/src/worker.js`, blob SHA `eeccff56301b35b9c9e4422fe00774b50df19cc9`.
- Exact `Origin === PUBLIC_ORIGIN` checks at the Worker and Durable Object; WebSocket upgrade required; random 32-character room IDs; SHA-256 proofs; two authenticated sockets; one signed SDP signal; 10-minute room expiry; max SDP 145,000 characters; no SDP payload persistence.
- No per-IP/global room-creation rate limit or token-bucket control was found in this Worker source. This is a public-endpoint abuse/cost blocker to address before wider rollout.
- Checked-in Wrangler config is the GitHub Pages pilot origin, not evidence of the separate Render Worker deployment.
- Secure Connect page has a restrictive meta CSP, `no-referrer`, and noindex. Actual HTTP response headers (CSP, HSTS, Permissions-Policy, Referrer-Policy) remain unknown because public HTTP smoke did not complete. A meta CSP is not a substitute for all response headers.

## Privacy / analytics

- Secure Connect privacy page is tri-lingual (Urdu/English/Arabic) and describes WebRTC metadata/IP exposure, STUN, third-party messenger logs, local profile image consent, optional local call history, and the lack of guaranteed background missed-call notifications. It also explicitly says the product is not an independently audited or certified communications platform.
- Main Null Bench `index.html` loads GA4 `G-YTVCF5JZCY` immediately, without an observed consent-mode default or opt-out gate. `null_model_test_completed` sends node/edge counts and derived transitivity/null mean/null SD/z-score. The Secure Connect QR-page policy does not document this main-site GA4 behavior; if treated as a site-wide policy, it is incomplete. Do not add any new tracking until notice, consent, minimization, aggregation, retention and opt-out are resolved.
- No chat, call, QR, photo, voice, private message or user-level data was read or sent by this review.

## AI Studio / Qwen

- Qwen default branch commit: `39adf3a429503f86cdc1f248f9080af50548ee03`; latest daily QA [43699933545](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545) — PASS, 13 check-runs green.
- Draft [Qwen PR #40](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40): head `e83327a220ad3b4aee9ab3917e60b5f841a459a8), old base `qwen-overview-release-prep-v0.1`; two privacy/402 guard checks pass. Draft [PR #29](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/29): head `805c4224f249ae2bd2276c0ce85a7d07a0856993), old base `ezero-web-research-budget-v0.1`; three offline source-awareness checks pass.
- Gateway source blob SHA `fbfaf251bb396e90b97590792eb719cbaffb3d94`: exact origin allowlist; defaults 10 requests/client/minute, 60 global/minute, one concurrent inference; 32 KB request body; 4,000-character question; at most 12 history messages with 4,000 characters each; 100/200/320 output tokens; 120-second timeout; one bounded 429 retry. HTTP access logs are disabled and upstream errors are reduced to safe labels.
- These are source defaults; actual environment overrides, live provider health, real spend cap, and provider billing were not read. Do not claim live public search or live provider availability from CI alone.

## Gmail notices reviewed

- Render subprocessor notice dated 2026-11-12: four US-based subprocessors become effective 2026-11-20; objection window ends 2026-11-20. This is a legal/data-processing notice, not an incident.
- Render build-failure email dated 2026-11-13 concerns the separate simplified-home staging service; a later deployment on that service succeeded at 08:57Z.
- No new Cloudflare security/billing incident or invoice was verified in the relevant search. The visible Cloudflare email was general promotional content.
- GitHub notifications include PR #157 scope/regression failures. No account compromise or exposed secret was established by this Gmail review.
- No billing setting, plan, account, credential, permission or paid provider was changed.

## Analytics access

Windsor/GA4 reporting actions were not exposed to this run. 30-minute active users, 24-hour/7-day/28-day users, sessions, pageviews, countries, landing pages and acquisition sources are **UNKNOWN**. No estimates were made from Render request metrics.

## Release blockers / next safe checks

1. Restore DNS/public HTTP access for read-only GET of GitHub Pages and the exact Render TEST URL; capture response status, headers, final URL, served HTML SHA and every local asset SHA.
2. Confirm Render TEST served build SHA and its exact Render Worker `PUBLIC_ORIGIN`; complete live Worker handshake only on the owned staging service.
3. Obtain physical two-phone evidence; current CI is browser simulation only.
4. Resolve GA4 consent/privacy disclosure and minimize existing event parameters before adding any tracking.
5. Fix PR #157's head-SHA/body mismatch and failing scope/regression gates; do not widen it into Null Bench runtime changes.
6. Review signaling rate limits and remove unused WSS CSP allowances where confirmed safe.
7. Confirm full main ruleset/required checks and human approval policy before any progressive release.

No production deployment or merge was performed.

## Addendum — Cloudflare notices and isolated abuse-guard candidate

- Gmail contains Cloudflare account **password-reset** and **password-changed** notices on 2026-10-29, four minutes apart. This review did not follow links, inspect recovery codes, expose any token, or change credentials. Whether the change was owner-initiated is unknown; treat it as an owner-verification item, not proof of compromise.
- Gmail also contains a Cloudflare Observability pricing notice dated 2026-10-29, effective 2026-12-01. The notice states: Free includes 0.5 GB/day ingestion and seven-day retention; Workers Paid includes 50 GB ingestion and 10 GB-month storage per billing cycle, then $0.25 per extra GB ingested and $0.10 per extra GB-month stored. Non-Workers-Paid/non-Enterprise accounts remain on Free; Workers Paid accounts transition to a Paid Observability subscription automatically. The actual account plan and projected usage were not read, so no charge is inferred and no billing action was taken.
- [Draft security PR #127](https://github.com/coma39658-ctrl/null-bench/pull/127), head `ff8b834826096d2fbd64f62e463a9faf176b4384`, is based on `ezero-render-instant-actions-physical-pilot-20261108`, not main. It adds a 60-message/minute per-socket limit (including malformed JSON and app pings), 20-second unauthenticated handshake timeout, four pending-socket cap, and answered-QR replay protection. Deterministic local fake-DO tests pass: [run 42498554662](https://github.com/coma39658-ctrl/null-bench/actions/runs/42498554662) and [run 42498549699](https://github.com/coma39658-ctrl/null-bench/actions/runs/42498549699); evidence validation passes. CodeQL is **neutral**, not a clean PASS. The PR itself correctly warns that per-room/per-socket controls do not provide global per-IP/edge handshake quotas. The candidate is Draft and not deployed; main/live Worker still lacks these staging-only additions.
- The GitHub Advanced Security bot email on PR #127 is a Code Scanning setup/onboarding notice, not a confirmed vulnerability finding.
