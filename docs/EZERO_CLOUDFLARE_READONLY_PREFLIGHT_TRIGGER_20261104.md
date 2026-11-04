# E-ZERO Cloudflare Read-Only Preflight Trigger — 2026-11-04

Purpose: trigger the existing **E-ZERO Cloudflare Read-Only Account Permission Preflight** GitHub Action on the isolated feature branch after the repository owner configured GitHub Actions secrets.

- No credential, token, account identifier, or private URL is stored in this file.
- Preflight may issue only read-only Cloudflare API GET requests; it must report only coarse status labels.
- This commit does not deploy Cloudflare Workers, modify production, configure billing, or enable the pilot.
- Treat `TOKEN`, `WORKERS_SCRIPTS`, and `SQLITE_DURABLE_OBJECTS` independently. A green CI check alone is not proof of service permissions.
- `WRITE_DEPLOY_PERMISSION` and `PLAN_AND_BILLING` remain untested until a separate authorized, safe verification.
