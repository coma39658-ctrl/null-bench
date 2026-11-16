# E-ZERO Security & Quality Audit — 2026-11-16 06:31 KSA

**Scope:** read-only review of owned E-ZERO repositories, staging services, CI evidence, public-page source, and narrowly filtered Gmail service/security/billing notices. This note is staging-only. No product files, production services, Workers, secrets, permissions, billing settings, or user data were changed.

## Executive result

**Overall: PARTIAL / NO RELEASE.** Several current source-level and CI checks pass, but public HTTP/assets could not be fetched from this execution environment, real physical two-phone evidence is absent, the specified Render test is older than the current GitHub Pages Secure App artifact, and Cloudflare Worker deployment provenance/live health are not verified. Keep all Secure App communications changes staged. Do not merge or deploy a new Secure App SHA.

## Secure App / communications

- Current default-branch SHA: a830a73f84ce0f9b0a116790d1330b00dcb9ec54
  - Commit: https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54
  - Current Secure App HTML blob SHA: de9d94c33c722472798e2f761353e69317ae26e2
  - Current root index.html blob SHA: a23cf1e803fe49392a5a1035fdfda15fa4ff4f41
- GitHub Pages build and deploy completed successfully for the current main SHA:
  - https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693
  - Build, status-report and deploy jobs all concluded success.
- Current main frozen Secure Connect regression gate:
  - https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589
  - The job used loopback/local Chromium browser tests, not physical phones. The media-evidence/cryptography/consent/10-minute-TTL step was skipped. This is not real two-phone proof.
- Evidence Registry Validator:
  - https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616 — success.

### Staging PRs and regression evidence

- Draft PR #128, signed 24-hour friend-of-friend contact card:
  - https://github.com/coma39658-ctrl/null-bench/pull/128
  - Head SHA: 3235b17df738f7583b7bbea3a7b3af521fe68c37
  - Security gate: https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792 — success.
  - Evidence validator: https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209782 — success.
  - Still draft/unmerged/undeployed. The third-party direct request to an unknown owner is not implemented; offline forwarded cards cannot be revoked before their 24-hour expiry; physical two-phone tests and the separately gated third-device flow are not verified.
- Draft PR #152, repeated saved-friend calls without forced QR:
  - https://github.com/coma39658-ctrl/null-bench/pull/152
  - Head SHA: 5036916c070bcec601233441c93e38ae0ac8ef48
  - Repeat-call QA: https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408006 — success.
  - Tests served the candidate on localhost; this is not physical-device evidence.
- Draft PR #156, visible Save Friend/contact-first flow:
  - https://github.com/coma39658-ctrl/null-bench/pull/156
  - Head SHA: 373ab6266fe54fe894dea5d011f06acc1ffdd03b
  - Two-mobile-browser video gate: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521180 — success, using isolated Chromium/fake-camera browser stacks.
  - Original-page no-QR gate: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230 — success, localhost only.
  - These are browser simulations, not Android/iPhone hardware.
- Latest no-QR/name-retention branch head:
  - 1f5b860fd7bd9aaaf8ee632a9c5c9893bcee8315
  - Saved-friend retention QA: https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688050 — success.
  - Earlier attempts on predecessor SHA 9940471aa21f462704e68d95efef81241f3437db failed/cancelled; the later branch-head runs passed. No physical-device proof was supplied.
- Draft PR #127 contains the proposed per-socket flood limit, 20-second pending-auth deadline and answered-QR replay protection:
  - https://github.com/coma39658-ctrl/null-bench/pull/127
  - These protections are not in the current main signaling Worker source.
- Draft PR #133 (Render-origin Trusted Inbox candidate) and #134 (manual staging deployment workflow) remain unmerged and not deployed:
  - https://github.com/coma39658-ctrl/null-bench/pull/133
  - https://github.com/coma39658-ctrl/null-bench/pull/134

### Render TEST 20261107

- Service: https://ezero-secure-app-two-phone-test-20261107.onrender.com/
- Render metadata says static site, currently live, auto-deploy disabled, public IP allow-list, branch ezero-profile-first-saved-friends-20261106.
- Latest live deploy SHA: 51d7aec556dec935d74edf339d86f3794f5aa865 (2026-11-07 17:20Z).
- Branch head SHA: 6b1f65627e9e414643f97c78baf498be3fa1ff5f. Git compare shows it is one commit ahead and that sole change is a CI workflow file; no static asset changed in that one-commit gap.
- However the deployed Render app HTML blob is 06b3010cff1ac7ad5b08c8f251f17aaabd0b8fe6, while current main Pages app HTML is de9d94c33c722472798e2f761353e69317ae26e2. Key contact-first, saved-friend and CSS assets also have different Git blob SHAs between Render deploy SHA and main. This Render URL is therefore not the current main Secure App artifact.
- Render build script at the deployed SHA adds SHA-256-derived asset cache versions, checks local asset presence, marks the page noindex and writes robots.txt Disallow. It deliberately disables the Trusted Inbox on the different Render origin and uses a Render-specific signaling Worker. Therefore this service cannot verify the GitHub Pages Trusted Inbox/saved-friend inbox path.
- The Render preview is still publicly reachable by design; noindex/robots is not access control. Do not place private user data there.
- A safe HEAD request to the Pages and Render URLs was attempted from the audit runtime, but DNS resolution was unavailable (curl status 000). This does not prove either service is down. Public HTTP status, response headers and actual asset GET/SHA remain UNKNOWN.

### CSP, integrity and origins

- Secure App HTML has a restrictive CSP meta policy (default-src none, self-hosted scripts/styles, data images, blob media, exact WebSocket origins) and noindex/nofollow. It has no SRI integrity attributes on its local script/style references. A CSP meta element is not proof of equivalent HTTP response headers; headers could not be fetched.
- Main homepage index.html and AI Studio HTML contain no CSP meta and no SRI attributes in source; they include inline scripts. Actual response-header CSP, HSTS, Permissions-Policy, Referrer-Policy, COOP/COEP and cache headers remain UNKNOWN.
- Current main Secure App config enables a pilot signaling Worker and a separate staging Trusted Inbox Worker. The main tree contains the signaling Worker source, but its README says it is not deployed/verified; the Trusted Inbox Worker implementation/deployed SHA is not present in the main tree. Exact Cloudflare deployment version and live handshake are UNKNOWN.
- The main signaling Worker source checks exact Origin, limits a room to two authenticated WebSockets, uses 10-minute room expiry and one signed SDP signal per socket, and does not store media/chat/SDP payloads. It does not currently contain the draft PR #127 per-socket/global flood limits or 20-second pending-handshake deadline.
- Render staging intentionally disables the Trusted Inbox because its origin differs. Do not treat its QR signaling smoke as proof of saved-friend inbox or incoming-call behavior.
- The page says incoming calls require the page to remain open and the user to opt in. Background/closed-browser push ringing is not implemented or verified.

### Privacy and UX

- The Secure Connect policy describes the QR identity page plus a separate experimental communications page, local profile sharing, optional local call history and a 10-minute call-history expiry. Current saved-friend code stores friend names/fingerprints locally; the policy does not clearly specify the saved-friend list's own retention and delete/block lifecycle. Reconcile that wording before another release.
- The app is Urdu-first (lang=ur, RTL) with Urdu/English/Arabic controls and accessible status/label markup. Static source review is not a substitute for screen-reader, keyboard, real Android Chrome, iOS Safari/WebKit or desktop browser testing.
- WebRTC/WebSocket/Web Crypto/PWA mechanisms are present. Barcode/Web Speech support varies by browser; the AI Studio speech input depends on browser-provided SpeechRecognition. No real WebKit/iOS test evidence is available.
- No live incoming-call push, no guaranteed TURN path and no independently validated universal NAT traversal were found in the requested Render test. The UI should continue to call the product experimental.

## GitHub release protection

- Active ruleset: https://github.com/coma39658-ctrl/null-bench/rules/26684871
- It protects the default branch and requires frozen-two-phone-contracts, but requires 0 approving reviews and does not require all relevant CI workflows. The branch-protection endpoint itself was not readable by this integration (403); the repository ruleset was readable.
- This ruleset alone does not enforce the owner's stricter gate of every required CI check passing, no pending/unknown checks, privacy agreement, exact deployed asset SHA, live third-party smoke and physical two-phone evidence. No ruleset or permission change was made.

## AI Studio / Qwen

- Current AI Studio page blob SHA: f1247d083428f822f789d2b5106a12b6930f7e91
- AI Studio source points to Cloudflare Worker chat and image endpoints. It requires an explicit checkbox before image/frame upload, limits image size to 5 MB and supported formats, and routes a selected video frame through the image-consent path (local video preview only, not full-video analysis). Voice recognition is user-started and may use the browser's speech provider; browser support varies.
- AI conversation storage is opt-in and local (IndexedDB/local transcript); share/export actions are user-initiated. The chat sends the submitted question and bounded recent history to its configured gateway. Upstream provider retention terms and live endpoint health were not independently verified.
- The homepage Qwen card says Public AI Off, while the AI Studio source has configured Cloudflare endpoints. Since public HTTP/health could not be checked, actual public AI availability is UNKNOWN. Do not claim live web search, current prices or video understanding. The UI itself warns when fresh sources are absent.
- Qwen adapter default branch: qwen-public-agent-persona-web-boundary-v0.1, SHA 39adf3a429503f86cdc1f248f9080af50548ee03.
- Its Render lab service is on separate branch qwen-overview-release-prep-v0.1, deployed/head SHA 43178152ceab138345e89d438956acb0f8deeb40, auto-deploy off, free plan, no Render health-check path. This lab service is not the Cloudflare endpoint hard-coded by the AI Studio page.
- Latest scheduled AI QA on the adapter branch passed:
  - https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545
  - Selected source/safety/multilingual and no-unapproved-live-search/paid-activation checks passed; this is not a live provider/billing smoke.
- Provider profiles mark the free OpenRouter model as free at selection time and pre-deployment only; the paid profile is pay-as-you-go at selection time. Both profiles set public_ai_enabled false and forbid browser API keys/automatic model switching. Current price, free-tier availability, provider credit and a hard daily spend cap are not verified. No paid account, key, billing or environment setting was created/read/changed.
- Gateway source has exact GitHub Pages origin allowlisting, bounded question/history/body sizes, per-client/global rate limits and one concurrent inference; no-secret health-log regression tests exist. Live Worker deployment/version and upstream provider retention remain UNKNOWN.
- Draft AI status PR #157 has a failed Null Bench professional-guide scope gate:
  - https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216
  - The scope guard failed and later guide tests were skipped. Keep it draft; do not merge.

## Null Bench public guide and analytics

- The Urdu/English/Arabic quick-start is in main and the latest Pages deployment. It correctly explains degree-preserving edge rewiring, observed clustering versus the selected null baseline, null samples/swap attempts, interval/z-score and the absence of a public random-seed control. It clearly says exploratory statistical output does not prove causation, medical/vehicle diagnosis or physical safety.
- Existing GA4 is loaded in main index.html before page content. Source-level events send demo type/edge count and graph-derived test metrics (node/edge counts, sample/swap counts, transitivity, null mean/SD and z-score). No chat, call, QR or photo payload was found in these events.
- The public page source has no visible cookie/analytics opt-in, opt-out or retention control. The quick-start guide discloses GA4, but this is not a complete consent/retention policy. No new tracking was added.
- The authorized Windsor.ai googleanalytics4 connector was not exposed in this execution's connected tool list. Therefore 30-minute, 7-day and 28-day aggregate users/sessions/pageviews/countries/acquisition reports are UNAVAILABLE here. No traffic was inferred from empty Render metrics and no user-level records were accessed.
- One low-cost next improvement: resolve the existing GA4 notice/consent/opt-out/retention policy before adding any new analytics or behavior/error tracking. Do not change the tracker without owner approval.

## Gmail service/security/billing review

Filtered review window: 2026-11-08 through 2026-11-16. No Cloudflare security/billing alert and no Render billing alert was found in the matching mail.
- GitHub Advanced Security message for PR #129 was a Code Scanning setup/onboarding notice, not a reported vulnerability finding.
- Render's 2026-11-13 simple-home staging build failure (commit bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca) was followed by successful staging deploys; latest listed successful deploy was 97978aa62c9a0df3bc887171f6b88618b5f95a67 on 2026-11-13 08:57Z. The failure is historical, not the latest deploy state.
- Render's 2026-11-12 DPA/subprocessor notice says four US-based subprocessors (Anthropic, Grafana Labs, Temporal Technologies and TypeSafe AI) are scheduled to be added on 2026-11-20. The notice states an objection deadline of 2026-11-20. No objection or account change was made.
- The Mail Alert Health Gate Audit had an earlier failed attempt at SHA 89b2571b4537caf1d0af333abf2650bd57e6db93 (https://github.com/coma39658-ctrl/null-bench/actions/runs/43616198243), followed by attempt 2 success at SHA 81e54f7ffb3b0b38ddb420308619cd4ba32d46cd (https://github.com/coma39658-ctrl/null-bench/actions/runs/43616268311).

## Final gate

**NO RELEASE.** Required blockers:
1. No real physical two-phone evidence, including Android-to-Android and Android-to-iOS/WebKit.
2. Requested Render TEST is not the current main Pages artifact; key HTML/JS/CSS blob SHAs differ.
3. Public HTTP response headers and live asset GET/SHA could not be verified from this runtime because DNS resolution was unavailable.
4. Cloudflare signaling/Trusted Inbox deployment SHA, origin smoke and current live health are not verified; Trusted Inbox source provenance is incomplete in main.
5. Main signaling Worker lacks the draft flood/handshake controls; PR #127 is still draft.
6. Saved-friend retention/delete semantics need a clear privacy-policy reconciliation.
7. Main ruleset does not require all CI or any approving review.
8. AI Studio live endpoint/provider health, current pricing/credits and upstream retention are unknown; PR #157 has a failed scope gate.
9. GA4 aggregate connector is unavailable here; existing consent/opt-out/retention notice needs review before further analytics.

**Actions taken:** read-only source/CI/Gmail/Render review and this non-sensitive audit note on an isolated branch only. No product code change, merge, deployment, Cloudflare action, new permission, paid account or billing change. Preserve the current live app and user data.
