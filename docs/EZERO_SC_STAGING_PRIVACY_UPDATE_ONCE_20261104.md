# E-ZERO disabled staging privacy update — 2026-11-04

One-time trigger for updating only the existing separate Cloudflare Worker `ezero-secure-connect-signaling-lab` to the tested consented account erasure implementation.

Both unit security tests and two-mobile Chromium browser test run on the parent commit and pass. The update job must verify current remote staging is disabled before writing, must keep `PILOT_ENABLED=false`, and must confirm disabled `/health` after deployment. No main website edits, no public enrollment, no messaging relay, no paid services, no temporary secrets in the repository.

Signed `delete_account` removes the account and every bilateral friend and pending relationship to registered peers. A client must separately confirm the IndexedDB private key is erased before claiming full user-facing deletion. Short-lived anti-replay keys expire by the alarm sweep. Network provider operational logs are outside this application erasure control.
