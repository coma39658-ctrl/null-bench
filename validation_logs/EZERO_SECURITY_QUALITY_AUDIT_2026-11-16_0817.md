# E-ZERO Security & Quality Audit — 2026-11-16 08:17 Asia/Riyadh

**Decision: PARTIAL / NO RELEASE.** This is a read-only audit plus a staging-only audit note. No production code, live audio/video/chat, user data, Cloudflare configuration, Render deployment, billing, permissions, or account settings were changed.

## 1. Scope and method

Reviewed the owned `coma39658-ctrl/null-bench` repository, PR #128, PR #157, current isolated branches, GitHub Actions, Render service/deploy metadata, selected Gmail alert metadata/content, the private Qwen repository metadata and selected source files. Source-level inspection only where public HTTP was unreachable. No intrusive probes, credential tests, writes, or third-party targets were used.

Direct public HTTP attempts to both the GitHub Pages URL and the Render TEST URL failed at this runtime with DNS resolution errors; the web reader also reported the URLs inaccessible. This is **UNKNOWN**, not evidence that either service is down. Therefore no live HTTP status, response headers, served asset bytes, cache behavior, or live Worker Origin behavior is claimed.

## 2. GitHub Pages / main baseline

- Repository: https://github.com/coma39658-ctrl/null-bench
- Default branch commit: [a830a73f84ce0f9b0a116790d1330b00dcb9ec54](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54) — signed commit verification reported valid.
- Main `index.html` blob: `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`.
- Main Secure App page `ezero_trusted_friends_staging_20261106.html` blob: `de9d94c33c722472798e2f761353e69317ae26e2`.
- GitHub Pages build/deploy: [run 43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693) — build, report-build-status and deploy jobs all PASS.
- Main frozen Secure Connect regression: [run 43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589) — PASS.
- Evidence Registry Validator: [run 43744655616](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616) — PASS.

The Pages deployment run is associated with main SHA `a830a73...`; actual public HTTP delivery and its served SHA remain UNKNOWN until an external smoke succeeds.

## 3. Secure App branches and PR #128

### Draft PR #128

- [PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128) remains OPEN / DRAFT.
- Head: `3235b17df738f7583b7bbea3a7b3af521fe68c37`; base: `ezero-profile-first-saved-friends-20261106` at `6b1f65627e9e414643f97c78baf498be3fa1ff5f`.
- [Signed Contact Forwarding Security Gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792) — PASS.
- [Evidence Registry Validator](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209782) — PASS.
- Scope remains a signed, explicit-consent, 24-hour public contact card; no automatic trust or WebRTC call. Third-party direct contact requests are not implemented, and early revocation of an offline forwarded card is not supported before expiry. No real two-phone evidence was supplied. Keep DRAFT; do not merge or advertise as a permanent directory.

### Latest no-QR saved-friend staging branch

- Branch `ezero-noqr-friend-consent-status-fix-20261115`, head `1f5b860fd7bd9aaaf8ee632a9c5c9893bcee8315`.
- It is **9 commits ahead and 2 behind** main; no open PR was found for this branch.
- Latest branch runs PASS: [Saved Friend Name Retention](https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688050), [Frozen Regression](https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688005), [Signed QR / P2P lab](https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688018), [No-QR preview contract](https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688011), [Evidence Registry](https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688004), plus local device preview, AI video-frame consent and voice-share QA.
- The saved-friend retention workflow uses Chromium with a local server and mocked inbox; its own log explicitly says it is not physical-phone or live-Cloudflare proof. Older GitHub failure emails relate to earlier commits; the later branch head has passing runs. Do not merge this diverged branch without a clean comparison/rebase and all release gates.

## 4. Render Secure App TEST

Render API metadata reports the static site `ezero-secure-app-two-phone-test-20261107` as not suspended, with auto-deploy OFF, branch `ezero-profile-first-saved-friends-20261106`, public IP allow-list, and latest live deploy commit `51d7aec556dec935d74edf339d86f3794f5aa865`.

- Configured source branch head: `6b1f65627e9e414643f97c78baf498be3fa1ff5f`.
- Page blob at the Render deploy commit: `06b3010cff1ac7ad5b08c8f251f17aaabd0b8fe6`.
- Current main page blob: `de9d94c33c722472798e2f761353e69317ae26e2`.
- Staging build script blob: `9556035f183fbbe3011d8f1818e874f0eb378957`.

The source page SHA differs from current main. The build script creates a separate test-only bundle, adds a short commit query parameter to local JS/CSS URLs, rewrites the signaling Worker hostname for Render, disables the Trusted Inbox on the different origin, adds a test banner and `noindex`/robots restrictions. The script does not provide a per-asset signed manifest, and the generated live bundle could not be fetched. **Asset parity is not verified; this is a release blocker.**

Render event history for the last seven days returned no service events for this test site or the Qwen service. This is not a substitute for public HTTP smoke.

## 5. CSP, Origin and browser security

The source Secure App page includes a meta CSP with `default-src 'none'`, same-origin scripts/styles, self/data images, self/blob media, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, and `frame-src 'none'`; it contains no `unsafe-eval`. It also uses a `no-referrer` meta policy.

The CSP `connect-src` allows the pilot signaling Worker and Trusted Inbox Worker. The Render build script rewrites the signaling Worker URL and disables the Inbox client config, but the Inbox origin remains in the CSP allowlist. Narrowing the staging allowlist to only required origins is a least-privilege improvement.

A meta CSP is not proof of HTTP response-header policy. `frame-ancestors` cannot be enforced through a meta CSP; HSTS, `X-Content-Type-Options`, `X-Frame-Options`/HTTP `frame-ancestors`, `Permissions-Policy`, and actual response CSP headers remain unverified because HTTP could not be reached. The actual Cloudflare Worker allow-origin list, rate limits, replay controls and live health could not be read through an account connector in this run.

## 6. Repository protection

The active default-branch ruleset [E-ZERO Secure Connect Protection](https://github.com/coma39658-ctrl/null-bench/rules/26684871) includes deletion protection, non-fast-forward protection, a pull-request rule, and one required check: `frozen-two-phone-contracts`. However, required approving reviews are set to **0** and the ruleset does not require every relevant CI workflow. This is weaker than the owner's manual NO-RELEASE rule. No ruleset or permission was changed.

## 7. AI Studio / Qwen

### Public AI Studio source

Main AI Studio page blob: `f1247d083428f822f789d2b5106a12b6930f7e91`. Source-level review found Urdu/English/Arabic UI and reply choices (plus Hindi reply choice), explicit checkbox consent before selected images are sent, local-only video preview, and a user-selected single frame path rather than full-video upload. Voice features depend on browser-native speech recognition/synthesis and installed language voices. These are source claims, not live-provider verification. Accessibility markup includes labels and live status regions; no full WCAG/screen-reader audit was run.

### Draft PR #157 — AI health truthfulness

- [PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157) remains OPEN / DRAFT; head `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec`, base main `a830a73...`.
- The AI health-status contract run [43763736376](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736376) PASS; frozen Secure Connect and local video/voice tests also PASS.
- Three related release gates FAIL: [Null Bench Degenerate Verdict](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301), [Null Bench Distinct Edges](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), and [Null Bench Professional Guide](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216).
- Job logs show the failures occur in strict changed-file/diff allowlists before the Null Bench math/browser tests: `UNAUTHORIZED_FILE_CHANGE` and `UNEXPECTED_RUNTIME_OR_PRIVACY_FILE_CHANGE`. The PR changes shared `index.html` plus its AI-specific workflow/test; the Null Bench gates do not yet have a reviewed exact exception for this AI-only block. This is a CI scope-guard failure, not evidence that the core degree-preserving calculation failed. Keep the PR draft; do not bypass or weaken those guards. Resolve with a separate, narrowly scoped review of the exact AI-only diff or isolate the AI status code without mixing Null Bench behavior.

### Qwen repository and provider budget

- Private repository default branch `qwen-public-agent-persona-web-boundary-v0.1`, head `39adf3a429503f86cdc1f248f9080af50548ee03`, signature verified.
- Render Qwen service remains on free plan, auto-deploy OFF, branch `qwen-overview-release-prep-v0.1`, live deploy SHA `43178152ceab138345e89d438956acb0f8deeb40`; it is not the current default-branch SHA.
- [Qwen PR #40](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/40) remains DRAFT. Its privacy/credit guard runs [42497749021](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497749021) and [42497479437](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/42497479437) PASS. It sets OpenRouter `data_collection=deny`, `zdr=true`, `allow_fallbacks=false` only for the exact OpenRouter endpoint; HTTP 402 fails closed without retry, while bounded 429 retry remains. Tests use a mocked 402; no paid/live provider request was made.
- Provider profile says FREE at selection time, no automatic fallback/model switch, server-side key only, and `public_ai_enabled=false`. Free availability and current provider budget are UNKNOWN, not guaranteed.
- [Qwen PR #29](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/pull/29) remains a staging site-awareness candidate. Its fixed public Pages GET is allowlisted, bounded by a 3.5-second timeout and 180 KiB response cap, rejects redirects and omits credentials. Offline candidate runs pass, but live site fetch and public Worker deployment are not verified.

## 8. Null Bench #try and analytics

The current `#try` section runs the degree-preserving null-model test locally in the browser: sample/paste an edge list, preserve each node's degree through edge swaps, avoid self-loops/duplicate edges, and compare observed clustering with the null distribution (mean/SD, 95% interval and z-score). The page explicitly says an unusual result is relative to that null model and does not establish causality or a physical law; small networks/few samples can be unstable.

Main `index.html` loads GA4 measurement `G-YTVCF5JZCY` and calls `gtag('config', ...)` directly. Source search found no Consent Mode call or cookie/analytics opt-in UI in this page. No new tracking was added. The authorized Windsor.ai GA4 report connector was not exposed among the available tools in this run, so 30-minute, 24-hour, 7-day, 28-day and country/page/source aggregates are **UNAVAILABLE**, not zero. No user-level analytics were requested or accessed.

## 9. Gmail / Render alerts

Gmail searches after 2026-11-14 found no matching new Cloudflare, Render or billing alerts. GitHub notification emails did contain failed workflow alerts for earlier Secure App commits and the current draft PR #157; the later no-QR branch head has subsequent passing CI as listed above. Render event history returned an empty last-seven-day list for the two reviewed services. This does not establish Cloudflare account health or billing status.

## 10. Browser, accessibility, privacy and open-standard notes

- The Secure App uses browser APIs and open standards including WebRTC, Web Crypto/ECDSA/SHA-256, WSS, a PWA manifest and local browser storage. The Render test builder keeps the Trusted Inbox disabled across the different origin.
- Source UI includes Urdu/English/Arabic selectors, RTL support, camera/microphone permission prompts, explicit profile/photo consent, voice-note send consent, local call-history opt-in and 10-minute local-history expiry language. Policy says no server call archive and warns that SDP/share providers may expose network metadata.
- The page also states background push/missed-call delivery is not available. No end-to-end encrypted chat or passkey/WebAuthn enrollment is evidenced by this reviewed page.
- Current saved-friend preview QA installs Chromium only. It is not a real Android/iOS device test and does not validate iOS Safari/WebKit, Android Chrome, screen readers, low-memory phones or real network traversal. A separate two-Chromium P2P lab also remains synthetic.
- The Secure Connect policy describes the separate experimental communications page and its local retention/consent boundaries. The broader Null Bench homepage's unconditional GA4 load still needs a transparent privacy notice/consent review before any additional analytics or behavior telemetry.

## 11. Blockers and actions

1. **NO RELEASE:** public Pages and Render HTTP smoke/headers/assets remain UNKNOWN due DNS/network unavailability.
2. Render TEST is on an older isolated source/deploy SHA; page blob differs from current main and no served asset manifest/hash confirmation exists.
3. No live Cloudflare Worker Origin/health/rate-limit/replay verification was possible.
4. PR #128 lacks third-party contact request, early revocation and physical two-phone evidence.
5. PR #157 has three failed Null Bench release gates due strict scope guards; keep it DRAFT.
6. Active default-branch ruleset requires only one CI context and zero approvals; it does not enforce the owner's full all-checks/approval policy.
7. Existing GA4 load has no consent API/UI visible in main index; GA4 aggregate connector unavailable in this run.
8. No real Android/iOS/WebKit/desktop-device or accessibility assistive-technology evidence.

**Work performed:** source/API/GitHub Actions/Gmail/Render metadata review and this staging-only audit note. No production code edit, merge, deployment, live security probe, external provider call, billing change, permission change, or account creation.
