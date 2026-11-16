# E-ZERO continuous release audit — 2026-11-16

Status: **NO RELEASE / staging-only audit**  
Review mode: read-only source, GitHub Actions, Render metadata and narrowly scoped Gmail alert review. No active third-party probing was performed. Public HTTP requests from this execution environment could not be completed, so served headers and asset bytes remain UNKNOWN.

## Executive decision

No SHA qualifies for a new release in this review. Blocking conditions include missing physical two-phone evidence, incomplete live HTTP/Cloudflare smoke, the Render test SHA being stale relative to current candidates, a Secure Connect privacy/data-retention discrepancy, and failed CI on unrelated staging gates. No merge, deploy, production change, billing change, permission change, account creation or new tracking was performed.

## Secure App / communications

### Source and CI

- Current `main`: [a830a73f84ce0f9b0a116790d1330b00dcb9ec54](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54).
- [Pages build/deployment](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693) — PASS for that SHA.
- [Frozen Secure Connect Regression Gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589) — PASS, but this is isolated browser automation, not physical two-phone evidence.
- [Draft PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128), head `3235b17df738f7583b7bbea3a7b3af521fe68c37), remains draft. Its signed 24-hour contact-forwarding card is not the saved-friend direct-call fix. Its security/evidence checks passed historically, but the three-device staging workflow and physical-device evidence are absent. The card uses P-256 signatures, SHA-256 fingerprints and origin verification; expired/invalid cards are not visibly pruned from local storage and no per-card delete control was found.
- [Draft PR #131](https://github.com/coma39658-ctrl/null-bench/pull/131), head `0cb3b5b9a3fce8e2c979fad74523c4521f56fded`, remains draft, mergeable=false, 149 commits / 44 files. Its own description says not for release.
- The 15 Nov saved-friend/no-QR branches had successful local Chromium runs, including [original-page gate](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744500797) and [multi-call retention](https://github.com/coma39658-ctrl/null-bench/actions/runs/43743688050). Their evidence labels explicitly state mocked/isolated browser tests, not physical phones or live Cloudflare proof. The branch tested by the original-page gate is diverged from current `main`; it is not the same tested SHA.

### Render versions and origin

- Requested [Render test URL](https://ezero-secure-app-two-phone-test-20261107.onrender.com/) is a static, publicly reachable test service, branch `ezero-profile-first-saved-friends-20261106`, latest live deployment SHA `51d7aec556dec935d74edf339d86f3794f5aa865` (7 Nov). Auto-deploy is off. Its build script adds `?build=51d7aec` cache-busters and `noindex/nofollow`; these are not access controls.
- That Render build deliberately disables Trusted Inbox on the Render origin. Therefore it cannot prove the GitHub Pages-origin saved-friend/no-QR path.
- A separate simplified-home Render stage is live at [ezero-secure-simple-home-two-phone.onrender.com](https://ezero-secure-simple-home-two-phone.onrender.com/) on SHA `97978aa62c9a0df3bc887171f6b88618b5f95a67` (13 Nov). It is a different branch/service, not PR #128 or current `main`. Two earlier builds failed on `bb7fc2b` and `41b9502`; the later `97978aa` deployment succeeded.
- Public HTTP status, response CSP headers and actual served asset hashes could not be fetched from this execution environment. Exact public asset-SHA match is therefore UNKNOWN.

### Trusted Inbox / privacy

- Manual isolated Worker deployment workflow [42235178152](https://github.com/coma39658-ctrl/null-bench/actions/runs/42235178152) completed successfully on the dedicated staging branch. The last live smoke [42213918005](https://github.com/coma39658-ctrl/null-bench/actions/runs/42213918005) passed on 6 Nov, but tested only origin rejection and the signed short challenge; it explicitly did not test calls, friend writes, push, SDP or media.
- The Worker source uses exact Origin checks, WSS, P-256 proof-of-possession, a 20-second challenge, owner-controlled trust/revoke, and delivers only a short invitation to an already-connected tab. No offline push, media, SDP or message storage is implemented.
- **Privacy discrepancy:** the Worker persists a per-owner `trusted` fingerprint allowlist in Durable Object storage without an expiry. It also writes replay/cooldown metadata with an `expires` field; no explicit cleanup/TTL deletion was found. The policy page says there is no central contact directory for the current QR service and does not clearly disclose this persistent server-side fingerprint allowlist. The current main page enables the staging inbox, while the Render test disables it. The lab README still says the Worker is not deployed, conflicting with the successful manual deployment record. Owner review and a truthful retention disclosure are required before release.
- The Secure Connect policy page is versioned 5 Nov and distinguishes a QR-only current page from a separate experimental communications page; the current page combines saved friends, WebRTC audio/video and messaging/voice-note controls. The page/policy scope needs reconciliation.
- Main Secure Connect HTML has a restrictive meta CSP and versioned same-origin assets; this is not a verified HTTP response header. Main Null Bench `index.html` and AI Studio HTML have no CSP meta found. No SRI was found for the external GA4 script. No changes made.

## AI Studio / Qwen

- Qwen adapter candidate branch `qwen-public-agent-persona-web-boundary-v0.1`: SHA `39adf3a429503f86cdc1f248f9080af50548ee03`. Its daily QA run passed, but the workflow checks out a separate `ezero-v03-public-record-fallback-20261103` ref and does not constitute a full Python gateway regression for this adapter SHA.
- Render Qwen service remains on older live SHA `43178152ceab138345e89d438956acb0f8deeb40` from 9 Oct, branch `qwen-overview-release-prep-v0.1`, Free plan, auto-deploy off. The candidate SHA is not deployed there.
- The predeployment OpenRouter profile records `qwen/qwen3.8-27b:free`, `public_ai_enabled=false`, no paid fallback and no automatic model switching. The current [OpenRouter model page](https://openrouter.ai/qwen/qwen3.8-27b%3Afree) lists $0 pricing but reports 90.73% availability over the last 24 hours; [free-model limits](https://openrouter.ai/collections/free-models) are rate-limited (20 requests/minute and 50/day below the credit threshold). Provider account spend/balance is not exposed here; no credits were purchased.
- AI Studio page uses Cloudflare Worker endpoints for text and vision, not the Render Qwen service. Its live Cloudflare/API smoke was not verified. Web research/search flags remain false in the reviewed candidate; do not claim live source-backed search. Video handling is local preview plus one consented still frame, not full video understanding.
- Image submission requires an explicit checkbox, but its label is Urdu-only despite the 15-language UI. Microphone input uses browser SpeechRecognition; the provider disclosure appears after recognition starts and is Urdu-only. Local video-frame consent tests passed; real iOS/WebKit/TalkBack/VoiceOver tests remain unknown.
- Draft [PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157), head `0753ce4eba7c6de46266a15f84afb9a4eef7b5ec), adds truthful AI health states. AI-specific health and media tests passed, but Null Bench scope/graph gates failed before their runtime tests because the PR changes the shared `index.html`. This demonstrates file-level workstream coupling. Its health badge checks `siteaware-v0-3`, while the separate AI Studio page posts to `clock-v0-5` and the vision gateway; the badge does not prove all AI Studio endpoints are live. The health request also lacks an explicit timeout and the new status copy is English-only. Keep draft; no release.

## Null Bench / analytics

- Main source SHA: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`; `index.html` blob SHA `a23cf1e803fe49392a5a1035fdfda15fa4ff4f41`.
- The trilingual professional guide and Urdu/English/Arabic quick-start are present and linked to `index.html#try`. The guide gate passed on its docs-only staging PR; subsequent Pages build/deployment passed. The guide accurately describes degree-preserving edge rewiring and says exploratory statistical results do not prove causation or physical diagnosis.
- Main `index.html` loads GA4 `G-YTVCF5JZCY` and emits demo/test-start/test-complete events with network counts/configuration/duration; no visible consent/default-denied gate was found. Legacy `null_bench_public.html` remains in the repository with a second GA4 ID `G-Z8Y7D81JSX` and similar events. No raw graph edge list, chat, call, QR or photo payload was found in these events. No new tracking was added.
- The named Windsor/GA4 aggregate reporting action was not exposed in this execution; 7/28-day users, sessions, pageviews, country and acquisition reports are **UNAVAILABLE**, not zero. No user-level analytics were accessed and no Render metrics were used to infer traffic.
- Proposed low-cost adoption improvement (not applied): review and canonicalize the legacy standalone page to the single `index.html#try` entry point after checking inbound links; reconcile the two GA4 IDs and consent notice before any further event tracking.

## Gmail alerts reviewed

- Render legal subprocessor notice dated 12 Nov: four US-based providers (Anthropic, Grafana, Temporal, TypeSafe AI) become authorized on **20 Nov 2026** unless objected to under the DPA. No objection or settings change was made.
- Render build-failure notices on 13 Nov correspond to two failed attempts on the separate simple-home stage; later deployment `97978aa` is live.
- GitHub non-deploy mail-health audit [run 43616198243](https://github.com/coma39658-ctrl/null-bench/actions/runs/43616198243) failed again when rerun: the CRLF/LF exact-Origin test still has one assertion failure (`1 !== 0`). This is an isolated test failure, not evidence of a production security incident.
- No new Cloudflare security/service/billing alert and no new billing alert were found in the targeted review.

## Release governance and blockers

- Active repository ruleset protects the default branch and requires only `frozen-two-phone-contracts`; required approvals are 0 and code-owner review is not required. The required check is browser automation, not physical-device evidence. Branch-protection details endpoint was not accessible to this integration. No ruleset/permission changes were made.
- **NO RELEASE** until: physical two-phone audio/video evidence on the exact candidate SHA; live public HTTP and Cloudflare/Render smoke on that same SHA; actual served asset integrity verified; privacy policy and Trusted Inbox retention disclosure reconciled; all required CI green on the exact SHA; and rollback confirmed.
- No production data or live calling baseline was changed. No secrets, OTPs, private email addresses, personal user details or provider keys are recorded in this note.
