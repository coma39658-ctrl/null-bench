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
- The main homepage registers service-worker.js with scope /null-bench; it uses network-first for same-origin GET requests and falls back to its cache when offline. That worker can control the Secure Connect page after the user has visited the homepage, but the Secure Connect HTML itself does not register the worker. Offline behavior was not live-tested. No Push API/background call-notification implementation was found. The Secure Connect manifest provides standalone display and Urdu/RTL defaults. TURN is not configured, so NAT/CGNAT reliability is not established.

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
- Main homepage source currently displays an initial Public AI Off label while setting the request-enable flag true before the health fetch. PR #157 separates the visible CHECKING/UNVERIFIED health state from request permission; a failed health probe still permits a user request attempt, with the gateway remaining authoritative. This behavior must be clearly explained and verified against the live gateway before any public claim of AI availability.
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


## Follow-up review — 2026-11-16 03:29 Asia/Riyadh

### Current source and Pages evidence
- Repository default branch is `main`. Current main SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`, commit dated 2026-11-15 18:04:27Z; GitHub reports the commit signature as verified.
- Source blob SHAs at that commit: `index.html` `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`; `ezero_trusted_friends_staging_20261106.html` `de9d94c33c722472798e2f761353e69317ae26e2`; `ezero_secure_connect_privacy_v0_2.html` `e8088b849746231964674a8218ffd945ad5d9965`; `service-worker.js` `88873630331efafead77eef5c430ba0eaabeda1d`.
- Main Pages build/deployment run `43744654693` succeeded on the same main SHA; frozen Secure Connect regression run `43744655589` and Evidence Registry Validator `43744655616` also succeeded. These prove GitHub Actions completion, not independent verification of the served response.
- Public HTTP check was attempted with read-only HEAD/GET against the exact Pages and Render TEST origins. The execution resolver returned `curl: (6) Could not resolve host` for both; the browser fetch also could not access either URL. Therefore public status code, response headers, deployed asset bytes/SHA, Render service health and live origin are **UNKNOWN**. This environment DNS failure is not evidence that either site is down.
- Render workspace listing returned a workspace, but the Render connector requires explicit workspace selection by the owner before listing services/deploys. This non-interactive run did not select a workspace or inspect service settings, logs, metrics or billing.

### Secure App PRs and CI
- PR [#128](https://github.com/coma39658-ctrl/null-bench/pull/128) remains OPEN / DRAFT. Head `3235b17df738f7583b7bbea3a7b3af521fe68c37`; base is the older `ezero-profile-first-saved-friends-20261106` at `6b1f65627e9e414643f97c78baf498be3fa1ff5f`, not current `main`. Its signed-contact security gate runs `42508203894` and `42508209792` passed, but this does not prove physical devices or a live Worker. The PR body explicitly says third-party direct contact requests are not implemented and an offline forwarded card cannot be revoked before its 24-hour expiry. Keep Draft.
- PR [#156](https://github.com/coma39658-ctrl/null-bench/pull/156) remains OPEN / DRAFT on current main base `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`; head `373ab6266fe54fe894dea5d011f06acc1ffdd03b`. All 10 associated workflow runs completed successfully, including [Original Page Names + No-QR gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230), [Frozen Secure Connect regression](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197), [two-mobile-browser video gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521180), and [Evidence Registry Validator](https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521184). The candidate makes the Save Friend panel visible while keeping the save button disabled until a real matching peer is connected, and refreshes the saved-friend script cache key. The workflow serves localhost and uses Playwright Chromium with fake camera/media and mocked signaling; it is **not** two physical Android phones, iOS/WebKit, or a live Cloudflare handshake. Keep Draft until the missing physical and public-origin evidence exists.
- The already-existing main commit `a830a73f84ce0f9b0a116790d1330b00dcb9ec54` contains the saved-friend name retention/no-repeat-QR work and passed the frozen regression workflow. No new production change or rollback was made in this review.

### AI Studio / Qwen sequence
- PR [#157](https://github.com/coma39658-ctrl/null-bench/pull/157) remains Draft at head `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`. Its focused AI health-truthfulness test passed [run 43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376), but three unrelated Null Bench scope gates failed: [degenerate verdict](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301), [distinct edges](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), and [professional guide](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216). Each failed at its file-boundary enforcement step; later test steps were skipped. Two additional checks were cancelled. Do not merge this SHA while any required CI is failed/cancelled.
- **Correction to the prior note:** current main `index.html` sets `window.EZERO_PUBLIC_AI_ENABLED = true` and immediately renders the “Governed AI Live” label before the asynchronous health response (source lines 4157 and 4197–4203). The earlier wording that the initial label was “Public AI Off” was inaccurate. PR #157 correctly introduces CHECKING/UNVERIFIED states, but its overall CI remains blocked as above. No live AI availability is claimed.
- Private Qwen adapter default-branch SHA `39adf3a429503f86cdc1f248f9080af50548ee03` passed the daily AI QA [run 43699933545](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545). Qwen PR [#40](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40) remains Draft; its two offline OpenRouter privacy/HTTP-402 tests passed ([42497749021](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497749021), [42497479437](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497479437)), but live provider compatibility, actual budget/spend cap and deployment remain UNKNOWN. Qwen PR [#29](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/29) remains Draft; its site-awareness candidate tests passed, but public live search is not enabled.

### Privacy, origin, CSP and accessibility
- Main `index.html` loads GA4 `G-YTVCF5JZCY` immediately and calls `gtag('config', ...)` before any visible consent gate; it also emits the existing coarse events `demo_network_generated`, `null_model_test_started`, and `null_model_test_completed`. No new tracking was added. The Secure Connect privacy page contains no GA4/Google Analytics disclosure; the page's Open Graph text says “No hidden fees, ads or tracking.” Website-wide notice, consent, opt-out and retention alignment must be resolved before adding or changing analytics.
- Secure Connect HTML uses a restrictive **meta** CSP: `default-src 'none'`, same-origin scripts/styles, `img-src 'self' data:`, `media-src 'self' blob:`, and `connect-src 'self'` plus the exact pilot signaling and staging inbox WSS hosts; object, base, forms and frames are denied. Static inspection found 22 external script tags, zero inline script blocks and zero inline event handlers in this HTML. Meta CSP is not proof of server response headers; actual HTTP CSP remains UNKNOWN.
- Main Secure Connect page config points to `ezero-browser-signaling-pilot.coma39658.workers.dev` and `ezero-trusted-friends-inbox-staging.coma39658.workers.dev`. The separate Render-origin candidate in PR #133 uses a different Render origin and dedicated Worker. Do not mix these origin/Worker pairs.
- Secure Connect root is Urdu/RTL; the main homepage root is English with per-section Urdu/Arabic/English content. Source includes responsive viewport-fit, a PWA manifest and a same-origin GET-only network-first service worker. Physical Android/iOS, Safari/WebKit, VoiceOver/TalkBack, keyboard-only and desktop screen-reader checks were not run. No background push-call notification or TURN-backed cross-NAT reliability was proven.
- The current policy describes temporary local call-history/profile behavior and states that the product is not a persistent account or independently audited communicator. Keep user-facing claims within those limits. New error analytics must remain opt-in, minimal, aggregate-only, and must never include message/call content, QR payloads, images, audio, contact identifiers or private user details.

### Gmail alert review
- Recent GitHub email notifications on 2026-11-15 include failures for earlier Secure App PR #156 commits; the latest head `373ab626` now has 10 successful workflow runs, so the earlier failures are superseded for that exact candidate SHA.
- PR #157's 2026-11-15 failed-scope notifications correspond to the three failed CI gates listed above.
- Render's 2026-11-13 build-failure email is for `ezero-secure-simple-home-two-phone-20261113`, not the specified 2026-11-07 Render TEST service. Render's 2026-11-12 subprocessor notice becomes effective 2026-11-20.
- No newer Cloudflare security/billing alert was found in the searched mail window. Existing notices remain: Cloudflare Observability pricing change effective 2026-12-01 and password-change notice dated 2026-10-29. No billing, account, permission or provider settings were changed.

### Release decision
**NO RELEASE.** PR #128 and #156 remain Draft; PR #157 has failed CI gates. Public Pages/Render HTTP and served asset SHA, response CSP headers, live Worker handshake, provider budget/availability, privacy/GA4 consent alignment, and real physical two-phone evidence are not verified. Preserve current main and production unchanged.


### Additional correction — GA4 event payload minimization
- A closer source read of main `index.html` (lines 2808–3000) shows the existing GA4 completion event sends per-run numeric research output fields: `node_count`, `edge_count`, `null_samples`, `swap_attempts`, `observed_transitivity`, `null_mean`, `null_sd`, `z_score` when defined, and `outside_95_percent_interval` when defined. The start event sends `edge_count`; demo generation sends `demo_type` and `edge_count`. Raw edge lists, graph text, chats, calls, QR payloads, images and audio are not included in these event calls.
- Correction: these are **per-run research metrics**, not merely coarse audience events. They may reveal a user's analysis output even though they do not contain the graph itself. They are sent by the page's existing GA4 integration without a visible consent gate in the reviewed source. No GA4 event-level/user-level report was accessed, and no new tracking was added.
- Before continuing or expanding analytics, the owner should decide whether these research-result fields are necessary. Align the website privacy notice, explicit consent/opt-out and retention with actual GA4 behavior; prefer aggregate-only metrics and avoid transmitting per-run result values unless clearly disclosed and consented. Do not silently change the existing tracker in this review.
- The main homepage has no CSP meta tag in the reviewed source and contains inline scripts as well as the external GA4 loader. Actual HTTP response CSP headers remain UNKNOWN; any strict server-side CSP must be tested against the current page rather than assumed from the Secure Connect meta policy.
