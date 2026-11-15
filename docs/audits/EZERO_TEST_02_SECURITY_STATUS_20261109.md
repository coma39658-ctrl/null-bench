# TEST 02 security audit — 2026-11-09

Scope: owned E-ZERO staging branch only. No production or Render changes, no secrets, no active attacks, no user data access.

## Completed (source inspection)
- Confirmed dedicated Render builder rewrites trusted inbox enabled:true -> enabled:false and asserts disabled output (PASS static source observation).
- Confirmed foreground inbox enforces exact origin, call path and signed challenge. New stage code pins origin/page to explicit allowlisted deployment entries; client still checks exact location.origin (PASS static source observation).
- Confirmed existing saved-friend call UI requires an enabled inbox API, otherwise shows unavailable message (PASS static source observation).
- Created isolated GitHub Actions workflow at .github/workflows/ezero_direct_call_security_gate_20261109.yml, commit fa8928f6036643f05309077c06071bcfc7b50452. The workflow includes node --check, fail-closed contract test, and Render static bundle build.

## Not yet verified
- GitHub Actions execution: UNKNOWN. Available commit workflow lookup returned zero PR-triggered runs; this is NOT evidence of PASS or FAIL for push workflows.
- Browser runtime test, exact public asset SHA, dedicated authenticated Render-origin inbox, Cloudflare Worker allowlist and signed challenge handshake: UNKNOWN.
- Real saved-friend call without QR, incoming call card, explicit acceptance and audio/video: NOT PASSED (old Render TEST owner observed failure).
- Privacy/CSP/rollback/full baseline regressions: UNKNOWN.

## Risk and next actions
- Do not enable inbox simply by removing origin validation or toggling enabled:true. Provision/verify a dedicated Render-origin server with authenticated signed challenge and narrow allowlist first.
- Inspect actual CI status and test logs; resolve any failures in isolated staging.
- Run consented two-phone foreground acceptance tests only after live staging deployment and exact SHA checks.

## Decision
NO RELEASE: security tests are not fully executed/verified; physical two-phone direct-call evidence missing. Existing working QR audio/video baseline and production remain untouched.
