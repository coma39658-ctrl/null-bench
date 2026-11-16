# E-ZERO Security / Quality Audit — 2026-11-16 09:38 Asia/Riyadh

**Disposition: PARTIAL / NO RELEASE.** This is a bounded, read-only audit with one non-sensitive audit-note write on an isolated branch. No production code, main branch, user data, Cloudflare/Render configuration, account permissions, billing, analytics settings, or deployments were changed.

## Executive result

1. GitHub main remains at a830a73f84ce0f9b0a116790d1330b00dcb9ec54. The GitHub Pages build/deploy workflow completed successfully on this exact SHA (run 43744654693). The main commit has 11 reported check-runs, all completed successfully. This confirms the GitHub build artifact was produced, not that the live CDN response was reachable or that real phones passed.
2. Public HEAD requests to the owned GitHub Pages URL and the named Render TEST URL both failed DNS resolution from this execution environment. No HTTP status, response headers, live asset digest, or Render deployed SHA could therefore be confirmed. This is UNKNOWN, not evidence that either service is down.
3. Static source references resolve in the repository tree: 34/34 local references in the Secure App page and 22/22 in main index.html. Served-file SHA parity remains UNKNOWN until public HTTP is reachable.
4. The Secure App page has a restrictive meta CSP and self-hosted scripts, but no SRI integrity attributes. The root index and AI Studio HTML have no CSP meta and no SRI attributes. Actual response-header CSP is UNKNOWN because the public HTTP probes could not resolve DNS.
5. Main Secure App source still loads an experimental Trusted Inbox configuration with enabled=true and a staging WSS origin. The page loads the config and inbox client, while the client source comment says it is not loaded/deployed. The client explicitly does not open a WebSocket or initialize persistent identity on page load; this is a source/configuration and documentation mismatch, not proof of an unsolicited connection. No live handshake was possible.
6. The current main Secure App page hides the Save Friend panel by default and says QR-free repeat calling is still experimental. The saved-friend client requires a fresh signed invite for its call method. PR #156 makes the panel visible while keeping saving gated on a verified live peer, but remains Draft. Its browser tests are isolated local Chromium with a mocked Worker, not physical two-phone evidence.
7. The Secure Connect privacy page describes the current public experience as QR/identity exchange and says it is not a full audio/video/chat service, while the main Secure App page loads WebRTC video and signed-media/evidence modules. The privacy page does not disclose the main site's GA4 analytics or an analytics opt-out. Resolve policy scope and consent before any release.
8. Main index.html loads GA4 G-YTVCF5JZCY immediately, with no explicit consent API or opt-out detected. The inspected events send demo type, node/edge counts, sample/swap counts, and derived null-model statistics; they do not send the raw edge list or chat/call/QR/photo fields in those event payloads. Computation is local, but derived telemetry leaves the browser. No new tracking was added.
9. PR #128 remains OPEN/DRAFT at head 3235b17df738f7583b7bbea3a7b3af521fe68c37, based on staging branch ezero-profile-first-saved-friends-20261106, not main. Its eight recorded check-runs passed, but they are old. The PR body says unknown-owner direct contact requests are not implemented and forwarded offline cards cannot be revoked before their 24-hour expiry.
10. PR #156 remains OPEN/DRAFT at 373ab6266fe54fe894dea5d011f06acc1ffdd03b, based on main. Its 13 recorded check-runs all passed. The workflow explicitly runs a localhost Playwright Chromium scenario with a mocked Worker; it does not establish real Android/iOS devices or live Cloudflare behavior.
11. PR #157 remains OPEN/DRAFT at 0753ce4eba7c6de46266a15f84afb9a4eef7b5ec. Its 16 check-runs include three failures: Null Bench professional-guide, degenerate-verdict, and distinct-edge gates. Job logs show shared index.html / unrelated file changes rejected by scope guards (UNAUTHORIZED_FILE_CHANGE / UNEXPECTED_RUNTIME_OR_PRIVACY_FILE_CHANGE). The AI health-truthfulness contract checks pass, but the cross-workstream boundary failures must not be bypassed.
12. The active main ruleset requires only frozen-two-phone-contracts, uses non-strict status enforcement, and requires zero approving reviews. The branch is marked protected, but the branch-protection detail endpoint was not accessible to this integration. Existing rules do not demonstrate the owner's full release gate.
13. Qwen's private adapter daily offline QA passed on 2026-11-15 (run 43699933545). Public AI remains disabled in the inspected provider profiles; the browser is not given the API key, automatic provider fallback is disabled, and evidence/diagnostic authority is false. The gateway validates the exact public origin, requires HTTPS in public mode, rejects private/localhost upstreams, and applies in-memory rate/concurrency limits. It forwards the supplied conversation history (bounded to 12 messages) to OpenRouter; provider retention/processing terms and live availability were not verified. A paid profile is marked pay-as-you-go at selection time; no hard monetary spend cap was identified in the inspected profile/config. No live provider request was made and no chat was used for training.
14. Qwen PR #40 (privacy/402 credit guard) and PR #29 (read-only site awareness) remain Draft. Their recorded checks passed on older commits; this is not a current provider or budget smoke test.
15. Gmail review found a Render staging build failure on 2026-11-13 for a different service/branch, with exit status 1 (commits bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca and 41b950267d599151d79a79025da6a00bf0b1dd8b). These notices do not identify the requested 2026-11-07 Render TEST service. A Render DPA notice dated 2026-11-12 says four US subprocessors become effective 2026-11-20: Anthropic, Grafana Labs, Temporal, and TypeSafe AI. No objection or billing change was made. No Cloudflare security/billing email was found in the seven-day Gmail search.
16. The GitHub Mail Alert Health Gate had a failed attempt on an older 2026-11-14 commit; a later run on the updated audit branch head succeeded (run 43616268311). The failure notification delivered on 2026-11-16 relates to the earlier failed attempt, not a confirmed platform incident.
17. No authorized GA4 reporting action was exposed in this execution. Completed 7/28-day users, sessions, pageviews, countries, and acquisition sources are UNKNOWN; no traffic estimate was invented.

## Evidence links

- Main commit: https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54
- GitHub Pages build/deploy on main SHA: https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693
- Main frozen Secure Connect regression: https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589
- Main Evidence Registry validation: https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616
- PR #128: https://github.com/coma39658-ctrl/null-bench/pull/128
- PR #128 signed-contact check: https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792
- PR #156: https://github.com/coma39658-ctrl/null-bench/pull/156
- PR #156 frozen regression: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521197
- PR #156 local two-browser test: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521221
- PR #156 original-page/no-QR gate: https://github.com/coma39658-ctrl/null-bench/actions/runs/43777521230
- PR #157: https://github.com/coma39658-ctrl/null-bench/pull/157
- PR #157 distinct-edge failure: https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350
- PR #157 degenerate-verdict failure: https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301
- PR #157 professional-guide failure: https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216
- Qwen daily offline QA: https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545
- Qwen private adapter head SHA: 39adf3a429503f86cdc1f248f9080af50548ee03

## Required blockers before any Secure App release

- Obtain successful public HTTP smoke for the exact Pages and Render TEST URLs, then compare deployed SHA and all served asset hashes with the tested source SHA.
- Obtain live, owned staging WSS/Worker origin and signed challenge/receipt smoke; do not infer this from source or CI.
- Obtain fresh real two-phone evidence for first QR pairing, friend save, repeated audio/video calls, saved-friend redial without QR, names retained on both devices, incoming call behavior, and honest delivery receipts.
- Resolve the Trusted Inbox enabled staging configuration and stale source comments/docs without touching the live call engine until isolated tests prove the change.
- Align the Secure Connect privacy policy with the actual features and disclose third-party analytics; add clear consent/opt-out and minimization before changing or expanding tracking.
- Keep PR #157 isolated from Null Bench; do not weaken Null Bench scope guards to make the AI Studio PR pass.
- Strengthen main release governance only through an owner-reviewed ruleset change; current ruleset does not require approvals or strict status freshness.
- Confirm Render workspace selection with the owner before any account-level service inspection. Do not choose a workspace on the owner's behalf.
- Obtain authorized aggregate GA4 reporting access before reporting audience trends.

## Checks performed / not performed

- PASS: GitHub repository, branch, PR, ruleset, commit and workflow metadata inspection.
- PASS: source-level CSP, origin, script-reference, GA4 payload, language and Qwen gateway review.
- PASS: repository-tree asset reference checks (34/34 Secure App; 22/22 index).
- PASS: PR #156 check-run inspection (13/13 success); PR #128 recorded checks (8/8 success); Qwen daily offline QA (success).
- FAIL: PR #157 has three scope-gate failures as listed above.
- FAIL: owned public HEAD probes could not resolve DNS in this environment; no HTTP status or headers obtained.
- UNKNOWN: live Render deployed SHA, live Worker handshake, current CDN asset digests, physical two-phone behavior, iOS/WebKit/Android accessibility, current OpenRouter availability/cost, GA4 aggregates.
- NOT RUN: intrusive scanning, exploit attempts, third-party probing, production mutation, live provider requests, billing or permission changes.

**Final decision: NO RELEASE.** This note is evidence of the audit performed, not a deployment approval or claim of physical validation.


## Audit-note validation

- Audit-only branch: ezero-audit-readonly-20261116-0938
- Audit-note commit: https://github.com/coma39658-ctrl/null-bench/commit/8fe277fa291d7a543a71f18f20eb30249f15354c
- Evidence Registry Validator for that commit: PASS — https://github.com/coma39658-ctrl/null-bench/actions/runs/43819203422
- Compare against main: only the two audit markdown files are added; no source code or production artifact changes.
