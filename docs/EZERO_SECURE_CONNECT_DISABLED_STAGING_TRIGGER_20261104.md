# E-ZERO Secure Connect — isolated disabled staging deployment authorization, 2026-11-04

Operator has explicitly authorized completing the E-ZERO communication development session with controlled changes. This single file is the narrow trigger for the separate `ezero-secure-connect-signaling-lab` Cloudflare deployment workflow.

**Scope:** CREATE ONLY a new staging Worker, never overwrite another Worker or update the public E-ZERO site. Run real signed-friend tests and Wrangler compile first. Deploy with `PILOT_ENABLED=false`, without `PILOT_JOIN_SECRET`, and without background polling, content storage, TURN/SFU, billing changes or recording. Verify `/health` reports `enabled:false`.

**Do not claim communication is fully online.** Incoming calls and automatic remote SDP/ICE exchange are not implemented; QR/persistent friends require separate opt-in and two physical phone tests. Deploy permission may be missing and this attempt must fail safely rather than escalate privileges.

Do not edit this marker again merely to rerun deployments.
