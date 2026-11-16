# E-ZERO Security / Quality Audit — 2026-11-16 15:48 Asia/Riyadh

## Decision

**NO RELEASE.** This run performed read-only repository, CI, Render metadata, source-integrity, and selected Gmail alert reviews. The only write is this non-sensitive audit note on the isolated branch `ezero-audit-readonly-20261116-1548`, created from main SHA `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`.

No application code, production deployment, user data, provider settings, account permissions, or billing settings were changed. No intrusive probes, credential tests, Worker mutations, or third-party scans were performed. Only ordinary HTTPS GET attempts were made against the two named owned public URLs; DNS resolution was unavailable in this execution environment.

## Repository, main SHA, and GitHub Pages

- Repository: `coma39658-ctrl/null-bench`; default branch: `main`.
- Current main SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`.
- [Main commit](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54); GitHub reports its signature as verified.
- [GitHub Pages build/deploy run #43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693) completed successfully on the same SHA. Its build, artifact upload, and deploy jobs all succeeded.
- [Frozen Secure Connect regression run #43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589) completed successfully. It uses loopback HTTP and isolated Chromium browser contexts; it is not a physical two-phone test. The optional media-evidence cryptography/consent/TTL step was skipped.
- [Evidence Registry Validator #43744655616](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616) succeeded.
- Main AI Studio automated mobile/source QA runs [#43844469190](https://github.com/coma39658-ctrl/null-bench/actions/runs/43844469190) and [#43846311346](https://github.com/coma39658-ctrl/null-bench/actions/runs/43846311346) succeeded on the same main SHA.
- The active repository ruleset applies to the default branch and requires the `frozen-two-phone-contracts` check. The ruleset does not require an approving review (required approval count is zero). Staging branches inspected are unprotected. The direct branch-protection endpoint returned 403 from the current integration; no extra permission was requested.

The Pages workflow establishes the deployed source/build SHA, but the actual public response body, response headers, and served asset hashes remain **UNKNOWN** because live HTTP could not be reached from this environment.

## Public HTTP, assets, CSP, and origin

Attempts to GET these owned URLs failed at DNS resolution; the web fetcher also could not open them. This is an execution-network limitation, not evidence that the sites are down:

- https://coma39658-ctrl.github.io/null-bench/
- https://ezero-secure-app-two-phone-test-20261107.onrender.com/
- https://ezero-secure-app-two-phone-test-20261107.onrender.com/ezero_trusted_friends_staging_20261106.html

Source checks on main:

- Secure Connect page blob SHA: `de9d94c33c722472798e2f761353e69317ae26e2`.
- 34/34 local script, stylesheet, manifest, icon, and local-page references exist in the main Git tree; their source blob SHAs were enumerated. This is source-tree integrity only, not proof of deployed asset parity.
- The page has 22 external script tags, zero inline scripts, zero inline style blocks/attributes, zero inline event handlers, and zero SRI attributes.
- The page's meta CSP is restrictive: `default-src 'none'`, self-only scripts/styles, self/data images, self/blob media, self plus the named pilot and inbox WSS origins, self-only manifest, and denied objects/base/forms/frames. Referrer policy is `no-referrer`.
- Actual HTTP CSP and other response headers are unknown. A meta CSP cannot provide `frame-ancestors`; verify response-header CSP, HSTS, Permissions-Policy for camera/microphone, and clickjacking protections from a network where the live service is reachable.
- The Render build script isolates the static output, adds a staging banner with a build SHA, cache-busts local JS/CSS with a build-specific query, disables the Trusted Inbox on the different Render origin, and rewrites the signaling WSS origin to the dedicated Render test Worker. This is a sound isolation design in source, but the generated live output could not be inspected.
- The main landing page `index.html` has no CSP meta in the inspected source. Its actual response headers remain unknown.

## Secure App / PR #128

- [Draft PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128) remains open, unmerged, and draft.
- Base branch: `ezero-profile-first-saved-friends-20261106`, base SHA `6b1f65627e9e414643f97c78baf498be3fa1ff5f`.
- Head branch: `ezero-signed-contact-forwarding-stage-20261108`, head SHA `3235b17df738f7583b7bbea3a7b3af521fe68c37`.
- Current head's [Signed Contact Forwarding Security Gate #42508209792](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792) and [Evidence Registry Validator #42508209782](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209782) succeeded on 8 November. The earlier three-device browser run passed on an older SHA, not this PR head.
- The staged feature is a user-consented, owner-signed 24-hour public contact card using ECDSA P-256/SHA-256. It does not auto-trust, create a friend, or initiate a call.
- The PR description explicitly says direct third-party contact requests to an unknown owner are not implemented and early revocation of a forwarded offline card is unavailable. It is not a complete friend-request system or permanent directory. Keep it draft.
- No real physical two-phone evidence was produced. Browser simulations are not equivalent to Android/iOS devices.

## Render staging

Specified service `ezero-secure-app-two-phone-test-20261107`:

- Static site, branch `ezero-profile-first-saved-friends-20261106`, auto-deploy disabled, public access, and not suspended.
- Latest observed live deploy: [commit 51d7aec556dec935d74edf339d86f3794f5aa865](https://github.com/coma39658-ctrl/null-bench/commit/51d7aec556dec935d74edf339d86f3794f5aa865), 7 November.
- Branch head is `6b1f65627e9e414643f97c78baf498be3fa1ff5f), one commit ahead. The compare shows that single intervening commit changes only `.github/workflows/ezero_secure_app_mutual_friends_20261106.yml`; runtime asset parity is therefore plausible but still **UNKNOWN** until the served HTML and asset hashes can be fetched.
- The separate newer staging service `ezero-secure-simple-home-two-phone-20261113` has a later successful deployment at [commit 97978aa62c9a0df3bc887171f6b88618b5f95a67](https://github.com/coma39658-ctrl/null-bench/commit/97978aa62c9a0df3bc887171f6b88618b5f95a67). Two 13 November build-failure notices concerned earlier commits [bb7fc2b](https://github.com/coma39658-ctrl/null-bench/commit/bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca) and [41b9502](https://github.com/coma39658-ctrl/null-bench/commit/41b950267d599151d79a79025da6a00bf0b1dd8b); the later successful deployment supersedes those intermediate failures.
- The specified older Render test build deliberately disables the Trusted Inbox because its Worker origin is different. Therefore this URL cannot validate the main-origin Trusted Inbox or PR #128 contact forwarding.
- Render HTTP smoke, live CSP headers, and served asset SHA parity remain **UNKNOWN**.

## Privacy and tracking

- Main `index.html` blob SHA: `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`.
- It loads GA4 measurement `G-YTVCF5JZCY` immediately and calls `gtag('config', ...)`; no consent-mode or opt-out call was found in the inspected source.
- No general Null Bench privacy/cookie policy page or visible analytics consent/opt-out link was found in the main repository tree. Do not add new user-behavior tracking. Before any new tracking, require explicit consent, minimization, aggregate-only events, no chat/call/QR/photo/audio/video payloads, disclosed retention, and opt-out.
- The authorized Windsor/GA4 reporting actions were not exposed in this run. Therefore 30-minute active users, 24-hour/7-day users, countries, landing pages, acquisition sources, sessions, and pageviews are **UNAVAILABLE**, not zero. No traffic was inferred from Render metrics.
- The main Secure Connect page's `js/ezero_trusted_inbox_stage_config_20261106.js` sets the inbox `enabled:true` and points to the staging WSS origin. The linked privacy policy describes temporary local invitation data and says there is no central server-side contact database, but does not disclose Trusted Inbox server-side request metadata, abuse logs, retention, owner revocation, or deletion. This is a privacy-policy discrepancy and a release blocker until the policy and implementation are reconciled.
- The Render build explicitly disables that inbox on its separate origin, so the Render page is not evidence of inbox behavior.

## AI Studio / Qwen bounded review

- Current main `index.html` sets `window.EZERO_PUBLIC_AI_ENABLED = true` and renders “Governed AI Live” before the asynchronous Worker health response. If the health request fails, the catch path does not clear that initial claim. This is a user-facing truthfulness defect.
- [Draft PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157) proposes the correct “Checking / Online / Off / Unverified” status distinction. Current head SHA is `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`.
- The targeted AI health-status contract [#43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376) passed, as did the frozen Secure Connect regression [#43763736365](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736365). However, three required Null Bench scope gates failed at their source-boundary checks: [degenerate verdict #43763736301](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301), [distinct edges #43763736350](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), and [professional guide #43763736216](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216). Their subsequent test steps were skipped. Do not bypass these gates or merge PR #157.
- The PR description still records an older head SHA and only two successful checks; it is stale relative to the current head and the three failures above.
- The private Qwen adapter's scheduled QA run #43843798732 succeeded, but its workflow checks out a separate candidate ref rather than the current branch head. It therefore does not establish current-branch validation. The workflow is offline/read-only, does not call a live Worker/provider, and asserts that live search and budget activation remain disabled.
- The Qwen deployment specification and provider profiles keep public AI disabled. The free OpenRouter Qwen profile is selected for pre-deployment testing; the paid profile is pre-activation only and also has `public_ai_enabled=false`. The Render Qwen gateway service is on the free plan. Provider availability, actual spend cap, and live health were not verified.
- Gateway source has an explicit Origin allowlist and in-memory rate controls (10 requests/client/minute, 60 global/minute, one concurrent inference, 2,048 tracked clients). The client key is the source IP held in the in-memory limiter; disclose/minimize this transient rate-limit data and avoid persistent request/chat logging. The agent spec prohibits live self-training and keeps external web content separate from governed E-ZERO evidence.

## Gmail vendor notices

- Render's 12 November DPA notice schedules four US subprocessors (Anthropic, Grafana Labs, Temporal, TypeSafe AI) for 20 November 2026; its stated objection deadline is 20 November. No email was sent and no objection was submitted. This is an owner/legal decision.
- Cloudflare's 29 October Observability notice says the Free plan includes 0.5 GB/day ingestion with seven-day retention and pauses ingestion at the daily limit; the Paid plan includes 50 GB ingestion and 10 GB-month storage, with additional ingestion/storage priced at $0.25/GB and $0.10/GB-month. The account's current plan was not verified; no billing change was made.
- No matching new Cloudflare security notice or billing/payment email was found in the targeted 14-day / 30-day searches. No new GitHub Dependabot/secret-scanning alert was found; the relevant GitHub emails were CI workflow notifications.
- The earlier Mail Alert Health Gate audit failure was followed by a later successful non-deploy run [#43854647230](https://github.com/coma39658-ctrl/null-bench/actions/runs/43854647230) on a newer audit commit; its CRLF/CORS fixture, Worker/client source, and frozen calling checks succeeded.

## Workstream status and blockers

- **Secure App: PARTIAL.** Main source/deployment CI is green, but physical two-phone evidence, public HTTP/header smoke, served asset SHA parity, and Trusted Inbox privacy-policy reconciliation are missing. PR #128 remains draft and incomplete.
- **AI Studio / Qwen: PARTIAL / UNKNOWN.** The health-status bug is confirmed; PR #157 has three failing scope gates. The private adapter QA is green but tests a different checkout ref. Live Worker/provider health and spend cap remain unknown.
- **Null Bench: PARTIAL.** Pages build/deploy source SHA is confirmed, but public HTTP smoke and GA4 aggregates are unavailable; the existing GA4 load has no consent/opt-out path in the inspected source.

## Next safe gates

1. Retry only ordinary GET smoke and response-header/asset-hash comparison when the owned public URLs are reachable.
2. Reconcile the Trusted Inbox behavior, privacy notice, metadata retention, revocation, and exact origin before enabling or advertising it.
3. Obtain real same-SHA two-phone evidence on physical Android/iOS devices; browser simulations do not satisfy this gate.
4. Keep PR #128 draft. Fix PR #157's cross-section scope/CI boundary and refresh its evidence description before any review.
5. Make the Qwen daily QA test the intended current branch (or clearly label the separate candidate) before treating it as current-branch evidence.
6. Review Cloudflare Observability plan/usage before 1 December and Render's subprocessor notice before 20 November; no plan or billing changes were made.

**Final gate: NO RELEASE.** No candidate SHA meets all live HTTP, asset integrity, privacy, CI, and physical-device requirements in this run.
