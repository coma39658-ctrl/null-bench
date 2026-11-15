# E-ZERO silent security and release-gate review — 2026-11-16 01:31 AST

**Scope:** read-only repository, CI, Render metadata, and narrowly scoped Gmail alert review. This note is staging-only. No production deployment, merge, billing change, account creation, permission change, secret rotation, or user-data access was performed.

## Executive result

**Release decision: NO RELEASE.** The current main commit has successful repository checks and a successful GitHub Pages deployment workflow, but fresh public HTTP/asset verification, Render asset parity, privacy/consent alignment, and real two-phone evidence are not complete. A successful browser simulation is not physical-device proof.

## GitHub main and public Pages

- Repository: [coma39658-ctrl/null-bench](https://github.com/coma39658-ctrl/null-bench)
- Default branch: `main`
- Current main SHA at review: `a830a73f84ce0f9b0a116790d1330b00dcb9ec54`
- Commit signature: GitHub API reported the commit signature as verified.
- [GitHub Pages build/deployment run 43744654693](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744654693): **PASS** for the same SHA.
- [Frozen Secure Connect Regression Gate 43744655589](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655589): **PASS** for the same SHA.
- [Evidence Registry Validator 43744655616](https://github.com/coma39658-ctrl/null-bench/actions/runs/43744655616): **PASS** for the same SHA.
- The commit check-runs endpoint returned seven completed checks, all successful.
- Public URL: https://coma39658-ctrl.github.io/null-bench/
- Fresh HTTP GET/headers could not be verified from this execution environment: DNS resolution failed in the container and the web fetcher could not access the host. Therefore current public response headers, content, asset hashes, and deployed SHA parity are **UNKNOWN**. The successful Pages workflow is not a substitute for a fresh public smoke.

## Isolated Secure App branches and draft PRs

The branch search returned at least 200 `ezero*` branch names across Secure App, AI Studio, OBD, Null Bench, and other experiments. Keep these workstreams separate; do not bulk-merge or delete branches. The Render base branch `ezero-profile-first-saved-friends-20261106` reports `protected=false`. The GitHub branch-protection endpoint for `main` returned HTTP 403 to this integration, so main's required-protection configuration is **UNKNOWN**.

### Draft PR #128 — signed contact forwarding

- [PR #128](https://github.com/coma39658-ctrl/null-bench/pull/128) remains **OPEN / DRAFT**.
- Base: `ezero-profile-first-saved-friends-20261106` at `6b1f65627e9e414643f97c78baf498be3fa1ff5f`.
- Head: `ezero-signed-contact-forwarding-stage-20261108` at `3235b17df738f7583b7bbea3a7b3af521fe68c37`.
- [Signed Contact Forwarding Security Gate 42508209792](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209792): **PASS** on the PR head.
- [Evidence Registry Validator 42508209782](https://github.com/coma39658-ctrl/null-bench/actions/runs/42508209782): **PASS** on the PR head.
- [Three-device browser matrix and read-only public smoke 42507891268](https://github.com/coma39658-ctrl/null-bench/actions/runs/42507891268): Chromium, Firefox, and WebKit simulation jobs plus its public URL smoke **PASS** on earlier SHA `aa8b420092db4f6f62ef1ebe820be50e1f02428e`; the simulation explicitly used no real media or backend and is not physical-phone evidence.
- The PR body and implementation gate say that routing a request from an unknown third party to the card owner is not implemented, and the owner cannot revoke an already forwarded offline card before its 24-hour expiry. Do not advertise this as a complete contact-request or permanent-directory feature.
- No real two-phone evidence was found. Keep draft.

### Draft PR #152 — repeat saved-friend calls without QR

- [PR #152](https://github.com/coma39658-ctrl/null-bench/pull/152) remains **OPEN / DRAFT** and reports `mergeable=false`.
- Head SHA: `5036916c070bcec601233441c93e38ae0ac8ef48`.
- [Repeat Direct Calls QA 43739408006](https://github.com/coma39658-ctrl/null-bench/actions/runs/43739408006): **PASS** in isolated Playwright/Chromium simulation, including repeat video/audio, no surprise QR, and media cleanup.
- The PR itself requires two physical Android phones on the same current public origin. That evidence is not present. Browser-closed or screen-locked incoming calls also remain a separate Web Push feature, not solved by this PR.
- Keep draft.

### Draft PR #156 — visible Save Friend control

- [PR #156](https://github.com/coma39658-ctrl/null-bench/pull/156) remains **OPEN / DRAFT**.
- Head SHA: `f1c9748b61bab92db8c3fbb3a9841cb13c907b35`.
- [Original Page Names + No-QR Release Gate 43751310653](https://github.com/coma39658-ctrl/null-bench/actions/runs/43751310653): **PASS** on the latest observed PR head.
- An earlier run on SHA `a1d0bf5d8cc352be2540ec243c4f8221850847a5` failed at the multi-call/name-retention browser step; the later head's workflow passed. This is a resolved earlier CI failure, not physical-device proof.
- Save remains gated on a real connected peer and verified fingerprint. Keep draft pending real-device and live-origin checks.

### Current main baseline

- Main SHA `a830a73f84ce0f9b0a116790d1330b00dcb9ec54` has successful Pages build/deployment, frozen Secure Connect regression, and evidence-registry checks.
- [Current main commit](https://github.com/coma39658-ctrl/null-bench/commit/a830a73f84ce0f9b0a116790d1330b00dcb9ec54)
- Main CI success does not establish real two-phone media, third-party Worker health, or current public asset parity.

## Render Secure App TEST

Target: https://ezero-secure-app-two-phone-test-20261107.onrender.com/

- Render service is a public static site, with auto-deploy disabled.
- Configured branch: `ezero-profile-first-saved-friends-20261106`; observed branch HEAD: `6b1f65627e9e414643f97c78baf498be3fa1ff5f`.
- Latest live Render deploy observed: commit `51d7aec556dec935d74edf339d86f3794f5aa865`, deploy `dep-dbnlrc49v7es73d4i6qg`, status **live**. This differs from the configured branch HEAD; current HTML/assets could not be fetched to prove parity. Treat asset SHA match as **UNKNOWN / blocker**, not PASS.
- Build command is `python3 scripts/build_ezero_secure_app_render_staging_20261107.py`; publish directory is `dist_ezero_secure_app_two_phone_staging`.
- The staging build script rewrites the pilot signaling Worker origin to the Render-test Worker, disables the GitHub-Pages-origin trusted inbox on the different Render origin, adds a visible TEST banner, adds a short build SHA to the banner and cache-busts local JS/CSS URLs. These are useful isolation controls.
- The source page uses a restrictive meta CSP (`default-src 'none'`, same-origin scripts/styles, constrained image/media sources, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-src 'none'`). The build script rewrites the signaling WSS origin. The preview source still includes the separate trusted-inbox WSS origin in its CSP even though that inbox is disabled in this preview; remove unused origins in a future isolated change. Actual HTTP CSP/security headers and served asset hashes remain **UNKNOWN** because fresh HTTP access failed.
- Render events query returned no events. No current deploy or fresh two-phone evidence was established.
- A separate Render service, `ezero-secure-simple-home-two-phone-20261113`, had build-failure notices on 13 November (exit status 1) for commits `bb7fc2b340fe7ce6ea860dd6e86de5b05248e2ca` and `41b950267d599151d79a79025da6a00bf0b1dd8b`. This is a different service from the requested 7-Nov TEST URL.

## AI Studio / Qwen

- Private repository: [coma39658-ctrl/ezero-qwen-lab-adapter](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter)
- Reviewed branch: `qwen-public-agent-persona-web-boundary-v0.1`; observed SHA `39adf3a429503f86cdc1f248f9080af50548ee03` (3 November).
- [Daily AI Search & Evidence Auto QA 43699933545](https://github.com/coma39658-ctrl/ezero-qwen-lab-adapter/actions/runs/43699933545): **PASS** on 15 November. Its steps are offline/source/safety regressions and explicitly reject unapproved live search or paid-provider activation; this does not prove live web search or provider availability.
- Render Qwen service is on `qwen-overview-release-prep-v0.1`, auto-deploy disabled, free plan. Latest live deploy observed is older commit `43178152ceab138345e89d438956acb0f8deeb40` from 9 October. Deployed service version therefore does not match the currently reviewed default branch; live health/provider availability is **UNKNOWN**.
- Source review found exact Origin allowlisting, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, suppressed HTTP request logging, sanitized upstream error labels, bounded request size, process-local limits (10/client and 60/global per 60 seconds), one concurrent inference slot, and SHA-256-locked read-only knowledge files.
- The gateway sends the submitted question and bounded conversation history to the configured external Qwen provider. Provider retention/training terms, a live spend cap, current provider credits, and actual availability were not verifiable from the connected read-only surfaces. Do not claim zero retention or live search without provider evidence.
- The public-agent specification states that the specification itself does not implement web browsing. Keep open-web answers explicitly unverified unless a live, source-backed retrieval path is actually tested.

### AI Studio status PR #157

- [PR #157](https://github.com/coma39658-ctrl/null-bench/pull/157) remains draft.
- The intended health-status behavior has a passing targeted workflow, but the staging branch also triggered unrelated Null Bench gates that failed their scope checks: [Distinct Edges 43763736350](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736350), [Degenerate Verdict 43763736301](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736301), and [Professional Guide 43763736216](https://github.com/coma39658-ctrl/null-bench/actions/runs/43763736216).
- The PR changes the shared `index.html` for AI Studio status. The Null Bench release gates reject that cross-section file change. Keep draft; isolate the AI status module or revise the workflow boundaries before any release. Do not weaken the Null Bench gates merely to make this PR green.

## Privacy, analytics, accessibility, and user-data boundaries

- Main `index.html` loads GA4 measurement `G-YTVCF5JZCY` immediately in the document head; no visible consent-default/opt-in gate was found in the inspected head.
- Existing GA4 events send aggregate graph/test metadata (counts, sample/swap settings, clustering summary and z-score), not the raw edge list or chat content in the inspected event payloads. The multilingual quick-start document discloses GA4 page/event metadata, but the inspected Secure QR privacy policy is scoped to the QR service and does not explain this Null Bench analytics behavior. Review the public notice, lawful basis/consent and opt-out before any analytics changes.
- A legacy, unlinked `null_bench_public.html` file contains a different GA4 measurement ID `G-Z8Y7D81JSX`; it was not referenced by the current `index.html` and was not treated as live.
- No new error tracking or user-behavior instrumentation was added. Do not collect chat/call content, QR payloads, photos, audio, video, private identifiers, or raw user graph inputs for analytics.
- The public quick-start doc covers Urdu, English, and Arabic and explicitly says the tool is exploratory, not causal proof or physical/medical diagnosis. The reviewed browser matrix covers Chromium/Firefox/WebKit simulation for the earlier PR #128 commit; it does not replace Android/iOS physical testing, VoiceOver/TalkBack checks, keyboard/screen-reader audits, or desktop/mobile live-origin testing.
- The GA4 aggregate reporting connector was not exposed as a callable read-only report action in this execution. No user counts, countries, sessions, or traffic trends are asserted.

## Gmail alert review

- GitHub notifications on 15 November reported multiple failed Secure App no-QR/name-retention CI runs on earlier commits; later PR #152/#156 runs and current main regression checks passed as recorded above.
- The GitHub Code Scanning email on 8 November was an enablement/setup notice for PR #127, not a specific vulnerability finding.
- No new Cloudflare security or billing alert was found in the targeted recent-mail search.
- Render sent a separate build-failure notice on 13 November and a subprocessor notice on 12 November: four US-based subprocessors are scheduled to be added on 20 November 2026. Review the Render DPA/privacy implications before placing additional user data on the platform.
- No matching GitHub/Cloudflare/Render billing or invoice alert was found in the targeted recent-mail search.

## Release blockers and next safe steps

1. Obtain fresh public HTTP smoke for GitHub Pages and the exact Render TEST URL from a network with DNS access; record status, response headers, final URL, content SHA, and every referenced JS/CSS asset SHA.
2. Reconcile Render deployed SHA `51d7aec...` with the configured branch HEAD `6b1f656...`; do not redeploy merely to make them match.
3. Complete real two-phone Android evidence on the same current public origin for first QR pairing, saved-friend repeat audio/video without QR, approvals, names retained, teardown, reject/block, and offline cases. Add iOS/WebKit real-device checks separately.
4. Keep PR #128 draft until stranger request routing, owner revocation, abuse limits, and real-device tests exist.
5. Keep PR #152/#156 draft until physical-device evidence and live Worker/Render smoke are complete.
6. Resolve GA4 disclosure/consent/opt-out policy alignment before adding or changing analytics.
7. Confirm main branch protection/required checks through an authorized GitHub view; the current integration received 403 for branch-protection details.
8. Reconcile the Qwen Render deployment with the reviewed branch and verify provider health, retention terms, and spend cap without exposing credentials.
9. Keep PR #157 draft until AI Studio and Null Bench file/test boundaries no longer collide.

**Final gate:** no release, no merge, no deployment. All unknowns remain explicitly UNKNOWN; no physical or live capabilities are claimed.
