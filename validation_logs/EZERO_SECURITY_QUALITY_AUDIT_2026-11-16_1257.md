# E-ZERO Security / Quality Audit — 2026-11-16 12:57 Asia/Riyadh

## Scope and decision

Read-only review of owned GitHub repositories, PR metadata, Actions evidence, Render service/deploy metadata, selected Gmail vendor/CI alerts, and repository source. Only ordinary HTTPS GET attempts were made against the two named public URLs; no intrusive probes, credential tests, account changes, billing changes, production writes, or third-party scans were performed.

**Decision: NO RELEASE.** Keep all candidate changes staged. No application code, production deployment, user data, provider settings, permissions, or billing were changed in this run. The only repository write is this non-sensitive audit note on the existing audit-only branch.

## Version and GitHub Pages

- Repository: `coma39658-ctrl/null-bench`, default branch `main`.
- Current main SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`.
- [Main commit](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54).
- Latest successful Pages build/deployment run observed: [#43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693), on the same SHA `a830a73f84ce0f9b0a116790d1330b00dcb9ec54).
- Latest main scheduled QA run observed: [#43844469190](https://github.com/coma39658-ctrl/null-bench/actions/runs/43844469190): 1 of its 2 jobs succeeded and the weekly mobile-browser job was skipped. Separately, all check-runs currently associated with the main SHA total 12 success and 1 skipped across multiple runs.
- The main SHA and latest successful Pages build SHA match at source/build level. The actual served Pages body, response headers, and deployed asset hashes were not verified.

## Public HTTP and source asset checks

The following GET attempts could not resolve DNS in this execution environment; the web fetcher also could not open either URL. This is an execution-network limitation, **not evidence that either site is down**:

- https://coma39658-ctrl.github.io/null-bench/
- https://ezero-secure-app-two-phone-test-20261107.onrender.com/

Source-level checks on main `index.html`:
- 22 script tags: 11 external/local-src tags and 11 inline script blocks.
- 11 referenced local JS/CSS assets were found in the main source tree; all 11 files exist and GitHub returned blob SHAs.
- No `integrity=` attributes were found.
- No CSP meta element was found in the main landing page source. The actual HTTP CSP header remains UNKNOWN.
- GA4 loads at page start from `googletagmanager.com` and immediately calls `gtag('config', 'G-YTVCF5JZCY')`; no consent-mode or opt-out call was found in this page source.
- The `#try` anchor exists in main `index.html`. The public quick-start at `docs/null-bench-quickstart-ur-en-ar.md` exists in Urdu, English, and Arabic, links to the official `#try` URL, explains degree-preserving rewiring and result fields, and warns that exploratory results do not establish causation, medical/vehicle diagnosis, or physical proof. It also discloses that the public runner has no separate random-seed control.

Because the public body could not be fetched, source asset existence is not equivalent to live asset SHA parity. Mark served SHA parity **UNKNOWN**.

## Secure Connect CSP, origin, and privacy

- Main Secure Connect page source `ezero_trusted_friends_staging_20261106.html` contains a restrictive CSP meta policy: `default-src 'none'`, self-only scripts/styles, bounded image/media sources, and `connect-src` restricted to self plus the named pilot signaling and Trusted Inbox WSS origins. It also denies objects, base URI, forms, and frames.
- The inspected page has 22 script tags and no SRI attributes. Its scripts are self-hosted; live HTTP headers and runtime CSP enforcement were not verified.
- The Secure Connect privacy page `ezero_secure_connect_privacy_v0_2.html` has a restrictive meta CSP and Urdu/English/Arabic content. It documents local non-exportable ECDSA P-256 keys, SHA-256 fingerprints, and temporary pending-invite identifiers/fingerprints in browser localStorage with an approximately 10-minute expiry.
- The privacy page does not contain a specific Trusted Inbox disclosure or wording for server-side request metadata, abuse logs, retention periods, or revocation. This remains a privacy-policy gap before any Inbox/contact-request feature is enabled.
- The Render build script at the old test SHA explicitly disables the production-origin Trusted Inbox for the different Render origin and expects a separate Render-origin signaling Worker. Therefore the specified Render test is not evidence that Trusted Inbox or PR #128 works on that origin.

## Secure App pull requests and CI

### PR #128

- [Draft PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128) remains open and unmerged.
- Head SHA: `3235b17df738f7583b7bbea3a7b3af521fe68c37`.
- Base is the older staging branch `ezero-profile-first-saved-friends-20261106`, not `main`.
- Eight recorded check-runs are successful, but they are historical checks (latest observed 13 November), not fresh live-device evidence.
- Its own description says this is a signed 24-hour forwarding card, not a permanent directory; a third-party direct contact request is not implemented and early revocation is not available. Do not advertise it as a complete friend-request or permanent directory feature.

### PR #156

- [Draft PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156) targets `main`; head SHA `373ab6266fe54fe894dea5d011f06acc1ffdd03b`.
- All 13 recorded check-runs are successful, including the frozen regression, saved-friend/no-QR contract, and browser preview checks.
- The Save Friend panel is visible while saving remains disabled until a currently verified WebRTC peer and explicit consent exist.
- Inspection of the “two-phone-public-video” and “two-mobile-chromium” logs shows local `127.0.0.1:8769` HTTP serving and Playwright Chromium/headless browser tracks. These are useful automated browser simulations, **not two physical Android/iPhone devices**. No physical two-phone evidence was produced in this run.

### PR #157 — AI Studio front-status truthfulness

- [Draft PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157) head SHA is `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`.
- Its staged change correctly makes the landing-page AI badge start as “Checking”, only show “Governed AI Live” after the exact `ONLINE`, `public_ai_enabled=true`, `evidence_authority=false` contract, and show unverified on HTTP/network failure.
- The current main landing-page block still sets `EZERO_PUBLIC_AI_ENABLED=true` and renders the “Governed AI Live” label before the asynchronous health response. This is a user-facing truthfulness defect; the PR is a reasonable fix but is not releasable yet.
- Current PR #157 check-runs: 13 success, 3 failure. The failures are the Null Bench distinct-edge, degenerate-verdict, and professional-guide source-boundary gates. Their first scope-check steps fail and subsequent tests are skipped. Do not bypass these gates. The AI-only change is touching shared `index.html`, so the path/scope contract needs a properly isolated CI design before release.

## Render TEST services

Specified service `ezero-secure-app-two-phone-test-20261107`:
- Static site, branch `ezero-profile-first-saved-friends-20261106`, auto-deploy off, public IP allowlist `0.0.0.0/0`, pull-request previews off, not suspended.
- Latest observed live deployment: commit `51d7aec556dec935d74edf339d86f3794f5aa865`, deployed 7 November 2026.
- This is stale relative to current main `a830a73f...` and PR #156 head `373ab626...`; it does not contain the current Save Friend panel candidate.
- Render HTTP request/latency/bandwidth metric arrays were empty and service events returned no entries. Empty metrics are **not** a traffic count and were not interpreted as zero users or downtime.
- Public HTTP smoke and served asset SHA parity remain UNKNOWN.

A newer separate staging service, `ezero-secure-simple-home-two-phone-20261113`, is on branch `ezero-secure-simple-home-ui-stage-20261113`. Its latest observed live deployment is `97978aa62c9a0df3bc887171f6b88618b5f95a67` on 13 November. Two earlier build-failure emails concerned this separate service; the later live deployment shows a subsequent successful build, so those alerts are not evidence of a currently failed latest deployment. Its public HTTP smoke was not possible in this run.

## Gmail alerts reviewed

- Render sent two 13 November build-failure notifications for the separate simple-home staging service, with failed commits `bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca` and `41b950267d599151d79a79025da6a00bf0b1dd8b`. The later live deployment is the 13 November commit above.
- Render's 12 November DPA notice says four US subprocessors (Anthropic, Grafana Labs, Temporal, TypeSafe AI) are scheduled for 20 November 2026. The notice states an objection deadline of 20 November. No objection or reply was sent; this is an owner/legal decision.
- No Cloudflare vendor email was found in the targeted 14-day Gmail search. No matching billing/payment email was found in the targeted Render/Cloudflare/GitHub alert searches.
- A GitHub email reports attempt #2 of Mail Alert Health Gate run [#43616198243](https://github.com/coma39658-ctrl/null-bench/actions/runs/43616198243) failed at “Reproduce and prevent false CORS failure on curl CRLF”. A separate successful Mail Alert Health Gate run [#43616268311](https://github.com/coma39658-ctrl/null-bench/actions/runs/43616268311) exists on a different SHA, but it predates the later failed attempt and is not a successful rerun of it.

## AI Studio / Qwen and Null Bench

- Main AI Studio page exposes Urdu, English, and Arabic (and additional language choices), an explicit checkbox before sending a selected image, and local-only video preview. Its visible copy says AI video analysis is not active and a selected frame requires consent before sending. This is preferable to claiming full-video AI analysis.
- The AI Studio page's own health check requires `status=ONLINE`, `public_ai_enabled=true`, and `evidence_authority=false`; the false-live issue is in the separate main landing-page badge described under PR #157.
- Qwen adapter current branch `qwen-public-agent-persona-web-boundary-v0.1` head SHA is `39adf3a429503f86cdc1f248f9080af50548ee03`. Daily QA run [#43843798732](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43843798732) is green, but its workflow explicitly checks out the different baseline branch `ezero-v03-public-record-fallback-20261103` at SHA `1252b0db6b6b36c70596d5d8bafd2a40819d247e`. It does not prove that the current Qwen branch SHA was tested.
- Qwen specification says English grounded behavior is acceptable but Urdu generation quality is poor and public multilingual output should use verified translation layers where available.
- The QA workflow explicitly keeps public web research, budget approval, and free-search activation disabled. No live provider availability or hard monetary spend cap was verified; no paid provider request was made.
- Qwen PR #40 (OpenRouter privacy/HTTP 402 fail-closed) and PR #29 (read-only published-site awareness) remain Draft. Their recorded checks are historical; neither establishes live provider compatibility or production web search.
- Windsor/GA4 report tools were not exposed in this run. Therefore 30-minute, 24-hour, 7-day, 28-day, country, landing-page, and acquisition metrics are **UNKNOWN**, not zero. No user-level analytics were requested or inferred.

## Release governance and blockers

The active default-branch ruleset [E-ZERO Secure Connect Protection](https://github.com/coma39658-ctrl/null-bench/rules/26684871) requires only `frozen-two-phone-contracts`; strict status enforcement is false, required approving reviews are zero, and last-push approval/review-thread resolution are not required. This is weaker than the owner's stated release policy.

Release blockers:
1. Public Pages and Render HTTP/header smoke unavailable; deployed body and served asset SHA parity UNKNOWN.
2. The specified Render test service is on an old SHA and does not test PR #156.
3. No real two-physical-phone evidence; Chromium/local-server tests are simulations.
4. Trusted Inbox server-side metadata, abuse logging, retention, and revocation are not specifically disclosed in the privacy page.
5. PR #157 has three failing scope-boundary gates; the main landing page still has a premature AI-live badge.
6. Main latest scheduled run has a skipped weekly mobile-browser check; no WebKit/Safari or physical Android/iOS result was produced.
7. Qwen daily QA tests a different branch SHA; current candidate validation is incomplete.
8. The default-branch ruleset lacks the owner's required strict status and approval protections.
9. GA4 consent/opt-out is not evidenced in main `index.html`; do not add new behavior tracking without explicit consent, minimization, aggregation, retention, and opt-out.

**Final status: PARTIAL / NO RELEASE.** Keep PRs staged. Preserve the existing live app, audio/video/chat, user data, public production, and billing. No application code or settings were changed; no vendor or user email was sent.
