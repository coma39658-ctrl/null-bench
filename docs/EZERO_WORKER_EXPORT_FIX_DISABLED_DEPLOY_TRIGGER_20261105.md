# E-ZERO Cloudflare isolated DISABLED staging: one-time Worker startup fix
Date: 2026-11-05. This marker explicitly triggers only the workflow
`.github/workflows/ezero_worker_exports_disabled_fix_deploy_once_20261105.yml`
on branch `ezero-secure-connect-real-worker-preflight-20261105`.

Owner's prior authorization: safely improve experimental E-ZERO Secure Connect for two real Android phones while preserving privacy and the disabled public pilot.

## Exact allowed effect
- Verify actual Cloudflare Worker entrypoint no longer exports primitive numeric constants that stopped workerd initialization. Verify Node unit tests, Wrangler compile-only and a **real local two-WebSocket worker test** with synthetic nonsecret owner value.
- Verify only isolated Worker `ezero-secure-connect-call-lab-disabled` exists in this Cloudflare account and remote GET /health reports `STAGING_DISABLED` BEFORE touching it.
- Deploy the corrected Worker entrypoint **only to that existing isolated staging Worker**, with checked configuration `ROOMS_ENABLED=false` and no `PILOT_OWNER_SECRET` provisioning.
- Verify remote GET /health still returns `STAGING_DISABLED` and room GET returns 503 after deployment. Do not accidentally announce readiness of live calls.

## Prohibited
- No public E-ZERO GitHub Pages, `main` merge, invitation sharing, mic/camera, recordings, AI or production service updates.
- Never modify account billing or create new Cloudflare Workers or secrets.
- Never set `ROOMS_ENABLED=true` on a public Worker.
- Do not read, print, modify or rotate private account tokens (CI provides existing scope-limited credentials).
- Fail closed on any preflight, permission, capability, CI or remote state mismatch.

The local synthetic owner secret is a test fixture and MUST NOT be copied into the real Worker. Actual two-phone pilot and owner-provisioned private secret remain future work.
