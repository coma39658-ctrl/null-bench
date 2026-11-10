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
