# E-ZERO Release / Security Review — 2026-11-15 22:45 Asia/Riyadh

Scope: read-only review of owned E-ZERO GitHub, Render, Cloudflare-facing source configuration, GitHub Pages, CI and relevant Gmail alerts. No intrusive probes, no third-party targets, no secret values, no user-level data.

## Decision

**NO RELEASE.** Public HTTP/asset smoke, live headers, current deployed SHA confirmation, live Cloudflare signaling/AI smoke and physical two-phone evidence are incomplete. The current CI ruleset also does not enforce all owner release gates.

No product code, production deployment, account, permission, billing, analytics or user-data changes were made. This commit is an audit note only.

## GitHub / Secure App

- Main commit: [a830a73f84ce0f9b0a116790d1330b00dcb9ec54](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54) — signature verified.
- GitHub Pages workflow: [43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693) — SUCCESS for main SHA a830a73.
- Main frozen regression: [43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589) — SUCCESS; the media-evidence/consent/10-minute-TTL step was SKIPPED.
- PR #128: [draft PR](https://github.com/coma39658-ctrl/null-bench/pull/128), OPEN/DRAFT, head 3235b17df738f7583b7bbea3a7b3af521fe68c37. Signed Contact Forwarding Security Gate [42508209792](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792) and Evidence Registry Validator [42508209782](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209782) are SUCCESS; no merge.
- PR #152: OPEN/DRAFT, head 5036916c070bcec601233441c93e38ae0ac8ef48, mergeable=false. Repeat saved-friend calls [43739408006](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408006), frozen gate [43739408027](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408027), and signed QR/P2P [43739408063](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408063) are SUCCESS; frozen media evidence/consent/TTL remained SKIPPED.
- PR #156: OPEN/DRAFT, head f1c9748b61bab92db8c3fbb3a9841cb13c907b35. Original-page No-QR QA [43751310653](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310653), frozen gate [43751310643](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310643), signed QR/P2P [43751310699](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310699), local preview [43751310622](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310622), AI video consent [43751310656](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310656), and voice/share/install [43751310648](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310648) are SUCCESS. These are isolated Chromium/Playwright browser tests, not physical phones or live Cloudflare proof.
- Earlier PR #156 gate failure [43747113234](https://github.com/coma39658-ctrl/null-bench/actions/runs/43747113234) was traced in its job log to the loopback test server at 127.0.0.1:8769 refusing connection before the browser test; the same gate passed on f1c9748. This is a test-harness startup failure, not proof of a production defect.
- PR #130 Null Bench multilingual #try quick-start remains OPEN/DRAFT, head 4c2145e3f9fd5db14f225ab7a8aff2c3410e214c; mobile/a11y/manual browser, public smoke and release checks remain UNKNOWN.
- Ruleset [26684871](https://github.com/coma39658-ctrl/null-bench/rules/26684871) is active on the default branch only. It requires only `frozen-two-phone-contracts`; approving reviews=0, code-owner review=false and review-thread resolution=false. The Render staging branch is unprotected. This is a release-governance gap; no protection or permission settings were changed.

## Public HTTP, assets, CSP and origin

One passive GET was attempted for each owned public endpoint:
- GitHub Pages `https://coma39658-ctrl.github.io/null-bench/`
- Render Secure App TEST `https://ezero-secure-app-two-phone-test-20261107.onrender.com/`
- Qwen public clock `https://ezero-qwen-public-clock-v0-5.coma39658.workers.dev/health`
- Qwen vision Worker health
- Qwen Render adapter health

All returned curl HTTP 000 due DNS resolution failure (`Could not resolve host`). This does **not** prove the sites are down. No live response headers, CSP headers, asset bytes, deployed-page SHA or browser smoke could be verified.

### Secure Connect source review

- Unified Secure App page: [source](https://github.com/coma39658-ctrl/null-bench/blob/main/ezero_trusted_friends_staging_20261106.html), blob de9d94c33c722472798e2f761353e69317ae26e2.
- It has a strict meta CSP: `default-src 'none'`, self-only scripts/styles, self/data images, self/blob media, and exact WSS allowlist for the owned signaling and trusted-inbox Workers; `object-src`, `base-uri`, `form-action` and `frame-src` are denied. No inline event-handler attributes or third-party script hosts were found in this page.
- The page is marked `noindex,nofollow`, uses Urdu RTL by default and offers Urdu/English/Arabic. Its PWA manifest starts at the staging-named page; this is clearly a beta/test entry, not a polished stable production identity.
- The Trusted Inbox client is loaded by the staging HTML. It opens only after explicit user action, is foreground-tab-only, and does not provide background incoming-call notifications. The same-tab one-navigation resume is bounded to 60 seconds. No background/push-call capability is verified.
- The Render build script on branch `ezero-profile-first-saved-friends-20261106` is blob 9556035f183fbbe3011d8f1818e874f0eb378957. It restricts the static bundle, disables the GitHub-origin-bound Trusted Inbox for the separate Render origin, rewrites the signaling WSS origin for the Render test Worker, and adds build-SHA query strings to JS/CSS. Render's live deployment is commit 51d7aec556dec935d74edf339d86f3794f5aa865; branch head is 6b1f65627e9e414643f97c78baf498be3fa1ff5f, one commit ahead, with only the mutual-friends workflow file changed. The deployed commit and branch head are unsigned; this is staging only. The asset bytes are source-equivalent at those two refs, but live bytes remain unverified.
- QR-only and communications pages have their own restrictive CSPs. The communications page uses same-origin connect-src; its automatic-signaling feature flag is OFF in its public config. The experimental Trusted Inbox is a separate feature.
- Privacy policy [source](https://github.com/coma39658-ctrl/null-bench/blob/main/ezero_secure_connect_privacy_v0_2.html), blob e8088b849746231964674a8218ffd945ad5d9965, is trilingual and dated 5 Nov 2026. It distinguishes QR identity from the separate experimental WebRTC page, documents explicit profile sharing, optional local call history and the lack of background missed-call notifications. It does not claim independent certification or a completed penetration test.
- Root `service-worker.js` is scoped to same-origin paths and does not cache third-party endpoints or AI responses. It is network-first with cache fallback. It does not establish background call notifications.

### Main Null Bench / AI Studio source review

- Main `index.html` blob a23cf1e803fe49392a5a1035fdfda15fa4ff4f41 loads GA4 measurement G-YTVCF5JZCY immediately. No visible consent-mode initialization, cookie notice or opt-out was found in the source. It has no meta CSP or SRI attributes, contains inline scripts/styles and inline event handlers, and loads third-party resources. HTTP CSP headers could not be checked. This is a privacy/CSP blocker for further analytics or public-site expansion until the notice/consent and server-header position are reviewed.
- AI Studio page [source](https://github.com/coma39658-ctrl/null-bench/blob/main/ezero_ai_studio_v0_1.html), blob f1247d083428f822f789d2b5106a12b6930f7e91, has no meta CSP/SRI. It uses HTTPS Worker endpoints with `credentials: omit`, `redirect: error`, and `cache: no-store`. Image sending requires a separate explicit checkbox and Send; selected images are limited to 5 MB. Video is local preview only; one extracted frame can enter the same image-consent path. SpeechRecognition/webkitSpeechRecognition is browser-dependent; a clear notice about browser/OS speech-processing and provider retention should be added before claiming universal private voice handling.
- AI Studio has 15 UI languages; gateway answer languages are Urdu, English, Arabic and Hindi. Focus-visible styling, aria-live/status regions and reduced-motion handling exist. The QR Secure Connect privacy page is not a complete AI Studio prompt/voice privacy notice; no dedicated AI Studio notice describing chat processing, browser speech-recognition handling and provider retention was found. Actual VoiceOver/TalkBack/WebKit/Firefox/desktop accessibility tests were not run.
- Qwen browser agent keeps up to 12 messages (six user/assistant turns) in in-memory JS state, limits a question to 4,000 characters, answer to 12,000 and request timeout to 30 seconds. Gateway specifications require server-side approved-source resolution, retrieval hints bounded to five chunks, prompt-injection isolation, fail-closed responses, and no training or permanent memory from public chats.
- The v0.5 Qwen release commit [39adf3a](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/commit/39adf3a429503f86cdc1f248f9080af50548ee03) is signed/verified. Its workflow diff explicitly leaves paid web search, free-search activation, budget approval and SearXNG origin disabled; the general live web-search canary had failed/no-jobs alerts on 3–4 Nov. No v0.5 workflow run or live health result was available in this review.
- Render Qwen adapter service is Free plan, auto-deploy OFF, on branch `qwen-overview-release-prep-v0.1`; last live deployment SHA 43178152ceab138345e89d438956acb0f8deeb40 (9 Oct), while the repository default branch is at signed SHA 39adf3a. Its Render `healthCheckPath` is empty. Do not equate the old Render adapter deployment with the separate Cloudflare v0.5 public clock Worker used by the public AI Studio page. Private gateway source files could not be read through the available file endpoint in this run; live health and provider balance remain UNKNOWN.
- The authorized GA4 connector was not exposed as a callable tool in this run; no 30-minute, 24-hour, 7-day, 28-day, country, page or acquisition metrics were retrieved. No traffic estimate was made.

## Gmail / service alerts

- No new Cloudflare or Render messages were found after 14 Nov in the targeted Gmail searches.
- GitHub mail contained earlier 15 Nov staging failures on intermediate commits (including the Original Page Names/No-QR gate); the later f1c9748 run passed. The original failed gate log points to a localhost test-server startup race.
- Null Bench Distinct Edges, Degenerate Verdict and Professional Guide failures remain in Gmail from 14 Nov; no later verified pass was found in this review.
- Qwen real-market-search canary failures were dated 3–4 Nov; paid/external live web search remains unverified and explicitly disabled in the v0.5 workflow.

## Next blockers (no release)

1. Obtain successful public HTTP GETs and inspect headers/assets for GitHub Pages, Render TEST and owned Cloudflare Workers from a network with working DNS.
2. Confirm deployed asset SHA and CSP/origin against the exact tested commit; retain the Render origin split and disabled inbox on the Render preview.
3. Complete the skipped media-evidence/consent/TTL gate and independent security review.
4. Obtain real two-physical-phone Android/iOS/WebKit evidence for first QR pairing, repeated saved-friend no-QR audio/video, name retention, revocation, hangup/media cleanup and incoming foreground behavior.
5. Resolve main-site GA4 consent/privacy notice and AI Studio voice-processing disclosure; do not add user-behavior tracking.
6. Verify the v0.5 Worker and Qwen provider availability, CORS and actual cost/budget controls; do not claim live web search.
7. Align GitHub protection rules with the owner's full no-release criteria, using explicit platform approval before changing permissions.

