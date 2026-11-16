# E-ZERO Silent Security / Release Review — 2026-11-16

**Scope:** owner-authorized, read-only review of GitHub source/PR/Actions, narrow local CI work on an isolated branch, targeted Gmail alert review, and non-invasive public HTTP smoke attempts. No third-party systems were probed. No production merge, deploy, account, permission, or billing change was made.

## Executive result

**NO RELEASE.** The current main Pages commit has successful repository CI and a successful Pages deployment job, but live public HTTP/assets, Render service/deploy SHA, live Cloudflare Worker handshake, policy/analytics alignment, and physical two-phone evidence remain incomplete or unknown. Draft PRs remain drafts.

## 1. Main / GitHub Pages

- main HEAD: a830a73f84ce0f9b0a116790d1330b00dcb9ec54 — signed commit verification reported valid.
- Pages build/deploy: PASS, [run 43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693).
- Frozen Secure Connect regression: PASS, [run 43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589).
- Evidence Registry checks on this SHA: PASS, including [run 43770390583](https://github.com/coma39658-ctrl/null-bench/actions/runs/43770390583).
- The current SHA had eight completed check-runs; all eight conclusions were success.
- Source blob fingerprints (Git object SHAs, not live HTTP hashes):
  - index.html: a23cf1e803fe49392a5a1035fdfda15fa4ff4f41
  - ezero_trusted_friends_staging_20261106.html: de9d94c33c722472798e2f761353e69317ae26e2
  - ezero_secure_connect_privacy_v0_2.html: e8088b849746231964674a8218ffd945ad5d9965
  - secure-connect-staging.webmanifest: 9e18cdeba6b8db18018f73f429a29b3960812d15
- Live HTTP/assets: UNKNOWN. Read-only curl -I attempts for GitHub Pages and the Render TEST URL failed at DNS resolution in this runner. No HTTP status, response headers, served asset bytes, or live asset SHA was obtained. This is an environment-resolution failure, not proof that either site is down.
- The repository API reports main as protected, but protection.enabled=false and required status checks are off. Do not assume GitHub is enforcing the requested release gate.

## 2. Bounded Secure App staging fix completed

A single cache-busting correction was applied only to existing draft PR #156 branch ezero-visible-save-friend-cta-20261115:

- Changed the saved-friend people script URL from ?v=20261106stage1 to ?v=20261116savefriend1 in ezero_trusted_friends_staging_20261106.html, so browsers do not keep reusing a prior cached script after the Save Friend UI fix.
- Commit: [373ab6266fe54fe894dea5d011f06acc1ffdd03b](https://github.com/coma39658-ctrl/null-bench/commit/373ab6266fe54fe894dea5d011f06acc1ffdd03b).
- PR remains Draft and mergeable; no merge or deployment.
- All nine current Actions runs on this commit completed successfully:
  - [Original Page Names + No-QR Release Gate 43777521230](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230)
  - [Public Real Video / two-mobile-browser gate 43777521180](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521180)
  - [Frozen Secure Connect Regression 43777521197](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197)
  - [Signed QR / P2P lab QA 43777521221](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521221)
  - [Contact-First Audio/Video Sidebar QA 43777521200](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521200)
  - [Local Device Preview QA 43777521191](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521191)
  - [AI Studio Local Video Frame / Consent QA 43777521192](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521192)
  - [AI Studio Voice Share / Install QA 43777521187](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521187)
  - [Evidence Registry Validator 43777521184](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521184)
- These are local Chromium/browser simulations with mocked WebSocket/Worker endpoints and fake media. They are not physical Android/iOS phones or a live Cloudflare handshake.

## 3. Secure App PR and worker state

- [PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128): Draft, head 3235b17df738f7583b7bbea3a7b3af521fe68c37; two historical checks succeeded. It is based on the older 6b1f656... branch, not current main, and was last updated Nov 8. Owner approval/revocation, stranger-routing abuse checks, and physical-device evidence remain release blockers.
- [PR #152](https://github.com/coma39658-ctrl/null-bench/pull/152): Draft, head 5036916c070bcec601233441c93e38ae0ac8ef48; its browser/contract runs succeeded, but its base SHA ecc9a4d... is behind current main a830a73...; GitHub currently reports it not mergeable. Rebase/revalidation is needed before consideration.
- [PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156): Draft, latest head 373ab6266fe54fe894dea5d011f06acc1ffdd03b; nine current Actions checks PASS after the cache-bust fix. Physical-device and live-service gates remain outstanding.
- [PR #133](https://github.com/coma39658-ctrl/null-bench/pull/133): Draft Render-origin Trusted Inbox candidate, head e3e5340cf35691598055091d203989726d35fb41. Only the Evidence Registry Validator run [43286084992](https://github.com/coma39658-ctrl/null-bench/actions/runs/43286084992) was found for that head; the dedicated candidate test/deploy workflow was not confirmed as executed and no live Worker deployment was verified.
- Main Pages signaling config pins the exact GitHub Pages origin and a pilot WSS host. The separate PR #133 candidate pins the Render TEST origin and a different dedicated Worker name. These are distinct environment/origin pairs and must not be mixed.
- Main-page Trusted Inbox config references ezero-trusted-friends-inbox-staging.coma39658.workers.dev; PR #133 instead defines ezero-trusted-inbox-render-test for the Render TEST origin. Actual live endpoint identity and handshake remain UNKNOWN.
- The main signaling Worker source checks exact Origin, requires WebSocket upgrade, limits rooms to two peers, bounds message size, and uses a ten-minute room TTL. The candidate Trusted Inbox adds a signed P-256 challenge, 20-second hello deadline, 30-second caller cooldown, ten-minute replay window, eight-client DO limit, and fifty-friend cap. Neither source shows a global/per-IP request quota; add cost/abuse caps before broader public use.
- Targeted source scan of the reviewed friend/inbox files found no innerHTML, outerHTML, insertAdjacentHTML, eval, or document.write sinks.
- Current app CSP is source-level restrictive: default-src 'none', self-only scripts/styles, local/data images, blob media, and exact WSS hosts in connect-src; object-src 'none', base-uri 'none', form-action 'none', and frame-src 'none'. The main homepage has no CSP meta in its HTML source; actual response headers are UNKNOWN. A meta CSP cannot supply frame-ancestors; verify host headers when live HTTP access is restored.
- The PWA manifest provides standalone display and Urdu/RTL defaults, but no verified service-worker/offline or push-call capability. Background incoming calls while the page is closed are not implemented. TURN is not configured, so NAT/CGNAT reliability is not established.

## 4. Privacy, languages, accessibility and platform compatibility

- Secure Connect page defaults to Urdu/RTL; its policy has Urdu, English and Arabic sections. The main homepage language selector updates document language and direction. AI Studio defaults to Urdu/RTL and offers multiple language choices.
- Source contains accessible labels/status regions, aria-live, playsinline, keyboard focus styling, reduced-motion rules, and user-initiated camera/microphone controls. This is source review, not a screen-reader or formal WCAG audit.
- CI is Chromium-centric. No physical Android Chrome, iOS Safari/WebKit, in-app messenger browser, desktop Safari, or background/PWA call test was evidenced in this run.
- The Secure Connect policy distinguishes the identity page from experimental WebRTC communications, describes one-view text, six-second user-initiated voice notes, local profile sharing with consent, optional ten-minute local call history, and the absence of background missed-call notifications. Do not claim persistent accounts, push calls, or independently audited E2EE chat.

## 5. Analytics / privacy boundary

- Main index.html loads GA4 G-YTVCF5JZCY immediately and calls gtag('config', ...); no consent-mode default or site-wide privacy notice was found in the reviewed source.
- Existing custom events inspected: demo_network_generated sends only demo_type and edge_count; null_model_test_started sends only edge_count. No raw edge list, chat, call, QR, photo, or voice content was found in these event payloads.
- The Secure Connect privacy page does not describe the main homepage's GA4 collection. Resolve a website-wide notice/consent/opt-out and retention alignment before adding or changing analytics.
- No new tracking was added. No chat/call/QR/photo/voice data was added to analytics.
- The authorized Windsor/GA4 reporting actions were not exposed in this run, so 30-minute, 24-hour, 7-day, and 28-day aggregate reports are UNAVAILABLE, not zero.

## 6. AI Studio / Qwen

- [PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157), head 0753ce4eba7c6de46266a15f84afb9a4eef7b5ec, is Draft. Its AI health-truthfulness test passed ([run 43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376)), but three Null Bench scope gates failed because the AI change touches shared index.html/workflow/test files outside their allowed Null Bench-only diff:
  - [run 43763736301](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301)
  - [run 43763736350](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350)
  - [run 43763736216](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216)
  Keep Draft; do not weaken the Null Bench scope gates to force a pass. The shared homepage is a cross-workstream coupling point.
- Qwen adapter reviewed branch head: 39adf3a429503f86cdc1f248f9080af50548ee03; branch is unprotected and has no required checks configured.
- Latest daily AI QA [run 43699933545](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545) passed, but its workflow explicitly checks out ezero-v03-public-record-fallback-20261103 (branch head 1252b0d...), not the reviewed branch head. Treat this as a test-provenance gap.
- [Qwen PR #40](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40), head e83327a220ad3b4aee9ab3917e60b5f841a459a8, has two successful offline privacy/402-guard runs ([42497749021](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497749021), [42497479437](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497479437)). It enforces OpenRouter-only data_collection=deny, zdr=true, allow_fallbacks=false; synthetic 402 tests verify no retry, auto-top-up, or fabricated answer. Draft only; no live provider request or budget approval.
- [Qwen PR #29](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/29) has three successful candidate QA runs ([41691706007](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/41691706007), [41691705699](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/41691705699), [41691698127](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/41691698127)); it remains Draft and public live search is not enabled.
- Provider profiles identify a free model as free only at its 2026-10-03 selection time and a separate pay-as-you-go model selected 2026-10-07. Both profiles state public_ai_enabled=false. Current live availability, current price, provider retention terms, and a spend cap were not verified. Do not infer current free availability.
- The public AI gateway specification preserves deterministic evidence priority, bounded session context, fail-closed fallback, and explicitly forbids live self-training from public conversations. AI Studio image upload has an explicit consent control; actual provider/live service behavior remains unverified.

## 7. Gmail alerts reviewed

- Render: Nov 13 build failures for the separate service ezero-secure-simple-home-two-phone-20261113; this is not evidence that the requested Nov 7 Render TEST service failed. Render dashboard logs could not be opened in this run.
- Render: Nov 12 subprocessor notice effective Nov 20, 2026 names Anthropic, Grafana Labs, Temporal Technologies, and TypeSafe AI; the notice says all four are US-based and gives an objection deadline of Nov 20 under the DPA.
- Cloudflare: Oct 29 Observability pricing notice effective Dec 1, 2026. It states Free includes 0.5 GB ingestion/day with seven-day retention and pauses at the daily limit; Paid includes 50 GB ingestion and 10 GB-month storage per billing cycle, with $0.25 per additional GB ingested and $0.10 per additional GB-month stored. Workers Paid accounts are automatically moved to Paid Observability; account plan/usage was not inspected.
- Cloudflare: an Oct 29 password-change notice was found; no newer Cloudflare security alert was found in the reviewed window. Whether that change was owner-initiated is not inferred.
- GitHub: a Nov 14 non-deploy Mail Alert Health Gate Audit failed [run 43616198243](https://github.com/coma39658-ctrl/null-bench/actions/runs/43616198243) because a CRLF/exact-Origin test expected 0 but received 1. This is an isolated test failure, not proof of a live mail or calling outage. Code-scanning emails reviewed were setup notifications, not a specific new vulnerability finding.

## 8. Render / live environment access

- Public DNS/HTTP smoke did not complete in this runner.
- Render service metadata and deployment SHA were not read because the Render connector requires a workspace selection; no workspace was selected automatically.
- No live Cloudflare Worker handshake, billing setting, account permission, or service configuration was changed or claimed.

## Release gate

| Gate | Result |
|---|---|
| Main source SHA / signature | PASS |
| Main Pages build + deploy job | PASS |
| Main repository check-runs | PASS |
| PR #156 cache-bust fix + current CI | PASS (staging only) |
| PR #128 / #152 / #133 physical + live service evidence | UNKNOWN / incomplete |
| PR #157 AI scope CI | FAIL |
| Public HTTP + served asset SHA | UNKNOWN |
| Render TEST deploy SHA + headers | UNKNOWN |
| Cloudflare live origin/Worker smoke | UNKNOWN |
| Website GA4 disclosure/consent alignment | BLOCKED |
| Real two-phone Android evidence | MISSING |
| iOS/WebKit/desktop physical evidence | MISSING |
| Rollback-ready verified production candidate | NOT ESTABLISHED |

**Decision: NO MERGE / NO RELEASE / NO DEPLOY.** Keep all drafts isolated. The only write in this review was the cache-busting commit on PR #156 and this non-sensitive audit note on the existing audit-only branch. No production code, user data, account permissions, billing, secrets, or live services were changed.
