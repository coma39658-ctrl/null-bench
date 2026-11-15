# E-ZERO Security / Quality Review — 2026-11-16 00:27 Asia/Riyadh

Scope: read-only checks of owned E-ZERO GitHub, Render, GitHub Pages, Cloudflare-facing source configuration, current GitHub Actions, Qwen/AI Studio and relevant Gmail alerts. Public probes were limited to HEAD/GET against the two owner-supplied E-ZERO URLs. No third-party targets, secrets, OTPs, personal user records, private messages or user-level analytics were accessed.

## Decision

**NO RELEASE.** The public Pages and Render URLs did not resolve DNS from the review environment, so live HTTP/assets/headers/CSP/origin and deployed content remain UNKNOWN. Physical two-phone evidence is still absent. The current GitHub ruleset does not enforce all owner release gates. The new AI Studio staging fix's own test passes, but its draft PR triggers unrelated Null Bench CI failures and other checks remain in progress.

No production deployment, rollback, Cloudflare configuration, Render billing, permissions, account, tracker, user data, Secure App calling engine or OBD workstream was changed. One narrowly scoped AI Studio UI-status correction was made only on an isolated staging branch and kept in a draft PR.

## GitHub / Secure App

- Repository default branch: `main`.
- Current main SHA: [a830a73f84ce0f9b0a116790d1330b00dcb9ec54](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54); GitHub commit verification: **verified / valid signature**.
- [Pages build/deploy run 43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693): SUCCESS for that SHA.
- [Frozen regression run 43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589): job SUCCESS, but the media evidence / consent / 10-minute TTL step was **SKIPPED** for this branch.
- [Evidence Registry run 43744655616](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616): SUCCESS.
- [PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128): OPEN/DRAFT, head `3235b17df738f7583b7bbea3a7b3af521fe68c37`, base `ezero-profile-first-saved-friends-20261106`, no review submissions. Its scope is optional signed 24-hour contact forwarding, not the saved-friend no-QR call fix. The PR body states that unknown-owner direct contact requests are not implemented and an offline forwarded card cannot be revoked before expiry.
- [PR #152](https://github.com/coma39658-ctrl/null-bench/pull/152): OPEN/DRAFT, head `5036916c070bcec601233441c93e38ae0ac8ef48`. Its 13 latest head check-runs were SUCCESS, including the repeat saved-friend video and audio/no-QR Chromium tests. An earlier run [43738167215](https://github.com/coma39658-ctrl/null-bench/actions/runs/43738167215) failed at the repeated-video step on an earlier SHA; later head run [43739408006](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408006) passed. These are isolated browser contexts/mock signaling, not physical devices.
- [PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156): OPEN/DRAFT, head `f1c9748b61bab92db8c3fbb3a9841cb13c907b35`; all 11 observed head check-runs SUCCESS. It keeps Save Friend visible while save remains gated on a real verified peer. No physical two-phone proof.
- For PR #128, #152 and #156, the legacy combined-status endpoint reported `pending` with zero legacy statuses while the explicit Actions check-runs were complete; treat the status discrepancy as unresolved rather than as extra PASS evidence.

### Governance

Active ruleset: [E-ZERO Secure Connect Protection](https://github.com/coma39658-ctrl/null-bench/rules/26684871). It requires only the `frozen-two-phone-contracts` context, sets required approving reviews to zero, and does not require code-owner review or review-thread resolution. It does not independently enforce physical two-phone evidence, live third-party smoke, privacy-policy consistency, staging asset SHA parity or rollback readiness. Branch-protection endpoint access was denied to the integration, so no broader protection claim is made.

## Public HTTP, assets, CSP and Render

- Owner-supplied GitHub Pages URL: `https://coma39658-ctrl.github.io/null-bench/`.
- Owner-supplied Render TEST URL: `https://ezero-secure-app-two-phone-test-20261107.onrender.com/`.
- Passive HEAD and GET for both returned curl DNS resolution failure, HTTP `000`, zero bytes. This is an environment DNS failure, **not proof that either service is down**. No response headers, live CSP, origin, content hash or asset bytes could be confirmed.
- Render service exists, is not suspended, and has Auto-deploy OFF. It is a static site on branch `ezero-profile-first-saved-friends-20261106`.
- Latest Render live deploy: SHA `51d7aec556dec935d74edf339d86f3794f5aa865`. Current branch head: `6b1f65627e9e414643f97c78baf498be3fa1ff5f`. Git compare shows one commit ahead, with only `.github/workflows/ezero_secure_app_mutual_friends_20261106.yml` changed; no app-asset source mismatch was found. Actual served bytes remain UNKNOWN because live GET failed. No recent Render service events were returned.
- Source page `ezero_trusted_friends_staging_20261106.html` has `lang=ur`, RTL default, Urdu/English/Arabic choices, `noindex,nofollow`, a restrictive meta CSP (`default-src 'none'`, self-only scripts/styles, limited owned WSS `connect-src`, no objects/frames), no inline scripts, no inline event handlers or style attributes, and a linked tri-lingual privacy page. It contains no GA4 script and has no external script host.
- The page has no SRI attributes. The meta CSP does not provide a response-header `frame-ancestors` policy; server/edge headers such as HSTS, `X-Content-Type-Options`, `Permissions-Policy` and clickjacking protection remain UNKNOWN. Do not infer header protection from the HTML meta tag.
- The PWA manifest explicitly says background call notification is unavailable. No background missed-call delivery claim is supported.

## Privacy, accessibility and browser coverage

- Secure App privacy page is linked and includes Urdu, English and Arabic sections. It documents explicit local call-history opt-in, limited local retention, no automatic call recording and the current background-notification limitation. It does not claim reliable background missed-call notifications.
- Secure App source exposes camera/microphone permission controls, profile-sharing consent and optional call-history consent. No user data was read or changed.
- Source-level accessibility indicators include 27 `aria-label` attributes, 3 `alt` attributes and a dialog; this is not a screen-reader audit. Chromium automation does not prove iOS Safari/WebKit, real Android devices or desktop assistive-technology behavior. No current physical two-phone evidence.
- The root Null Bench `index.html` is separate from the Secure App page: it has `lang=en`, `translate=no`, a 15-language selector and an immediately loaded GA4 script (`G-YTVCF5JZCY`) with no visible consent/opt-out notice or privacy-policy link in that page. The separate Secure App privacy page does not document that root-page GA4 load. Do not add or expand tracking until disclosure, consent, minimization, retention and opt-out are resolved. No new tracker was added.

## AI Studio / Qwen — one bounded staging fix

Source review found the root page initialized `EZERO_PUBLIC_AI_ENABLED=true` and immediately used that request-permission flag to display “Governed AI Live” before the asynchronous Worker health check. If the health request failed or returned non-2xx, the UI could retain a false live claim.

A narrowly scoped AI Studio-only correction was staged:
- Branch: [staging/ai-health-status-truthfulness-20261116](https://github.com/coma39658-ctrl/null-bench/tree/staging/ai-health-status-truthfulness-20261116)
- Draft PR: [#157](https://github.com/coma39658-ctrl/null-bench/pull/157)
- Latest head: `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`.
- The UI now separates request permission from health status: initial “Checking”, explicit “Live” only after the complete health contract, and “availability unverified” for HTTP/network failures. No live Worker/API call is made by the test; no provider, endpoint, budget, analytics, Null Bench `#try`, Secure App calling, or production code outside this AI Studio status block was changed.
- [AI health truthfulness push test 43763729675](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763729675): SUCCESS.
- [Evidence Registry push validation 43763729651](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763729651): SUCCESS.
- [AI health truthfulness PR check 43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376): SUCCESS.
- [Evidence Registry PR check 43763736190](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736190): SUCCESS.
- [AI Studio Voice Share/Install QA 43763736200](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736200): SUCCESS.
- [AI Studio Video Frame/Consent QA 43763736194](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736194): SUCCESS.
- PR-wide checks also triggered unrelated Null Bench workflows. [Professional Guide gate 43763736216](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216), [Distinct Edges 43763736350](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350) and [Degenerate Verdict 43763736301](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301) FAILED at their source/scope-boundary steps because the PR touches the shared root `index.html` outside their allowed Null Bench-only change sets. This demonstrates cross-workstream CI coupling; no Null Bench code was intentionally changed.
- Secure Connect Signed QR, Frozen Regression and Local Device Preview PR runs were still in progress at the last check. The PR remains DRAFT and must not be merged.

### Qwen deployment and provider controls

- Private Qwen repository default branch: `qwen-public-agent-persona-web-boundary-v0.1`, SHA `39adf3a429503f86cdc1f248f9080af50548ee03`.
- [Daily AI Search & Evidence QA 43699933545](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545): SUCCESS on that SHA.
- Render Qwen service uses a separate release-prep branch `qwen-overview-release-prep-v0.1`, deployed SHA `43178152ceab138345e89d438956acb0f8deeb40`; Auto-deploy OFF, Free web-service plan, no health-check path configured. The repository default branch and Render deployment branch are distinct.
- Current deployed gateway source scan shows bounded token limits, a 120-second timeout and bounded 429 retry, but no explicit monetary budget/credit cap or gateway-level consent/retention control in that file. Provider balance and live availability are not exposed.
- [PR #40](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40) remains DRAFT. Its [OpenRouter privacy/402 guard test 42497749021](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497749021) passed with a fake/stubbed 402 response; real provider sandbox compatibility and live provider status remain unverified. It is not deployed. No live web-search claim is supported by this evidence.

## Gmail / analytics

- Gmail search after 2026-11-15 found no new relevant Cloudflare or Render security/service/billing alert. One OpenRouter “new models” message was promotional, not a billing/security alert.
- No Cloudflare account connector or live Worker health result was available in this run. No account, permission, billing, auto-top-up or provider configuration was changed.
- The GA4 reporting connector was not callable in this run. 30-minute, 24-hour, completed 7-day/28-day aggregate reports, country breakdown, landing pages and acquisition sources are **UNAVAILABLE**, not zero. No user-level analytics were accessed.

## Final gate

**NO RELEASE / NO MERGE.** Reasons: live public HTTP and asset bytes UNKNOWN; live Worker/Render smoke incomplete; no physical two-phone proof; media evidence step skipped in main frozen gate; main ruleset lacks owner-required approval/physical evidence enforcement; root-page GA4 consent/privacy discrepancy; PR #157 has unrelated Null Bench CI failures and some Secure Connect checks were still in progress. The main branch and existing production deployments were not changed by this review.
