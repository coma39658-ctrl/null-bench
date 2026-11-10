# E-ZERO Secure App CI run-level failure audit — 2026-11-10

Scope: staging-only; no production release, secrets, account or permissions changes.

## Verified observations
- PR #131 TEST02 at commit 2bc4e30 has a run-level failure notification.
- Signed QR/P2P workflow run https://github.com/coma39658-ctrl/null-bench/actions/runs/42672518281: API returned only job 129349069939 `two-mobile-chromium`, completed SUCCESS. Its job logs contain passing browser checks and Node deprecation warnings, not a demonstrated fatal error. The YAML at `.github/workflows/ezero_secure_connect_real_p2p_lab_20261104.yml` defines another job, `signed-identity-and-ui`, but it is absent from the retrieved job list.
- Local Preview workflow run https://github.com/coma39658-ctrl/null-bench/actions/runs/42672518256: API returned only `contract` job SUCCESS.
- Evidence Registry Validator run https://github.com/coma39658-ctrl/null-bench/actions/runs/42672511794: API returned no jobs.
- GitHub email subjects mark these runs failed; email bodies confirm the above job outcomes.
- GitHub connector's run-job endpoint returns the latest attempt's first page only. Therefore an omitted job is not proof it was never scheduled, and job-level PASS is not run-level PASS.

## Diagnosis status: UNKNOWN, not yet fixed
Obtain authoritative run conclusions, attempt numbers, check suites and all pages of jobs; inspect run annotations and workflow startup/validation errors. Determine whether job omission is due to paging, skipped/cancelled execution, invalid workflow configuration, or GitHub-side execution restrictions before editing YAML. Do not hide or relax required security checks to make CI green.

## Release blockers
Run-level CI FAIL/UNKNOWN; evidence registry UNKNOWN; actual two physical phones UNKNOWN; Render TEST/public Pages SHA, assets, CSP and smoke UNKNOWN. NO RELEASE. Frozen live calling baseline untouched.

## Next bounded step
Review run-level annotations in GitHub UI/API, reproduce with a staging-only diagnostic workflow only after identifying the failure, then run original regression suite. Never merge automatically.

## Additional verified Render TEST findings (2026-11-10)
- Read-only Render service inventory: `ezero-secure-app-two-phone-test-20261107`, service `srv-dbnis0lg1s2s73cquj1g`, is a static site connected to `coma39658-ctrl/null-bench` branch `ezero-profile-first-saved-friends-20261106`.
- Render autoDeploy and autoDeployTrigger are OFF; there is no automatic deployment of TEST02 PR #131 to this service.
- Render deploy history reports current LIVE deployment `dep-dbnlrc49v7es73d4i6qg` at commit `51d7aec556dec935d74edf339d86f3794f5aa865` on 2026-11-07, distinct from TEST02 commit `2bc4e30`. Therefore TEST02's staging deployment and exact-SHA smoke are NOT verified by the existing live Render TEST deployment.
- This is a confirmed *version mismatch for the intended TEST02 comparison*, not evidence of a malfunction in the older live Render service. Do not redeploy it without matching CI, assets and regression evidence.
- Attempted direct HTTP GET to the owned Render and GitHub Pages public URLs from the sandbox; DNS resolution failed in this environment. HTTP status, headers/CSP, served asset integrity and public SHA remain UNKNOWN, not FAIL.
- GitHub official documentation states invalid workflow YAML can generate failed workflow runs; investigate workflow-level annotations before changing any workflow permissions or required checks: https://docs.github.com/en/actions/how-tos/monitor-workflows/use-workflow-run-logs
- Render official docs explain live deploy SHA, branch and auto-deploy behavior: https://render.com/docs/deploys

## Safe remediation gate
Keep Render autoDeploy OFF and live SHA pinned. Establish authoritative run-level failure reason and complete original jobs, then test a *separate* isolated deployment only if approved and safe. No release or changes to existing calling baseline.

## Owner-supplied GitHub Actions annotation — confirmed (2026-11-10)
- The owner opened the **Annotations** section of run https://github.com/coma39658-ctrl/null-bench/actions/runs/42672518281 and supplied a screenshot showing **1 error and 1 warning**.
- Run-level error text: `Internal server error. Correlation ID: 7916462c-3a4a-41fa-979a-2dd78650e3f5`.
- Warning: `Node.js 20 is deprecated`; checkout@v4, setup-node@v4, setup-python@v5 are forced to run on Node.js 24. This is a separate warning, not demonstrated as the failure cause.
- `two-mobile-chromium` was SUCCESS; `signed-identity-and-ui` appears as an empty circle without a successful run in the graph. The annotation establishes a GitHub Actions internal server error for this run, not an application test failure. GitHub's underlying infrastructure cause remains unverified.
- Safe action: keep release blocked; preserve frozen calling code. Rerun failed jobs or workflow from GitHub Actions UI if available, then compare all job conclusions and run annotations. If reproducible, report the correlation ID and run URL to GitHub Support/status. Do not bypass required checks.

## Resolution update — rerun successful (2026-11-10)
- Owner triggered GitHub Actions **Re-run all jobs** on https://github.com/coma39658-ctrl/null-bench/actions/runs/42672518281 . Owner-supplied screenshot shows workflow **SUCCESS**, duration **1m 7s**.
- Independently rechecked GitHub job API after rerun: `signed-identity-and-ui` job 129985251333 **SUCCESS** (including signed QR/multilingual contract step), and `two-mobile-chromium` job 129985250586 **SUCCESS** (including browser endpoints step).
- The earlier GitHub Actions `Internal server error` annotation did not prevent this successful rerun; root infrastructure cause remains unconfirmed. No app code or workflow permission change was needed.
- Scope of PASS: this one rerun of PR #131's P2P workflow only. Other workflows, draft PR #128, current Render TEST SHA mismatch, public smoke, privacy consistency and real physical two-phone tests remain separately gated/UNKNOWN. **NO RELEASE**.
