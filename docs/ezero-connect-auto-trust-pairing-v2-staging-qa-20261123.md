# E-ZERO Connect automatic trusted pairing v2 — staging QA

Date: 2026-11-23

## Change
PR #196 was merged into the isolated staging branch `ezero-connect-qr-renderer-20261120`.

The inviter deliberately creates/shares a signed, single-use 90-second invite. The invitee deliberately scans or opens it. After the existing signaling Worker authenticates both devices and forwards each peer's signed P-256 challenge proof, each phone independently verifies that proof and saves its own encrypted local trusted-contact record.

The v2 path removes the extra bilateral approval and separate Save step. Duplicate `peer-ready` events and a fresh invite from an already-trusted fingerprint do not create a second active contact entry.

## Safety boundaries
- Staging only; production is unchanged.
- The signaling Worker, invite signature format, device identity module, and audio/video engine were not changed by PR #196.
- Calls and chat remain disabled in the current clean-build preview.
- The Worker remains authoritative for challenge expiry.
- Each phone reports only its own local persistence result. One phone's save does not prove the other phone saved.
- Blocking and server-enforced revocation remain separate follow-up work; do not infer those features from this pairing change.

## Automated evidence
At commit `a4eb03bced29edd023c3904cdd4a79fd0eff1c7a`:
- `clean-mobile-shell`: success.
- `frozen-two-phone-contracts`: success; legacy call-engine sources unchanged.
- `validate-evidence`: success.
- Browser-backed trust tests cover two device identities, matching relationship IDs, idempotent save, fresh-QR duplicate prevention, and invalid peer signature rejection.
- Worker bundle validation was a dry run only, not a Worker deployment.

## Remaining release gate
A new Render static-site deployment must become live, followed by physical testing on two phones:
1. Host creates QR and waits for the visible 90-second expiry.
2. Guest scans or imports the QR.
3. Both phones independently show the verified friend in their local list.
4. Close/reopen the page and confirm the friend remains saved.
5. Confirm a later call/reconnect can be initiated from the saved friend without another QR only after the relevant calling feature is enabled and verified.

CI success is not physical two-phone proof.
