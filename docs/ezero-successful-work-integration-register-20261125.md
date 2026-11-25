# E-ZERO Successful Work Integration Register — 2026-11-25

Status: STAGING INTEGRATION REGISTER ONLY. This branch is isolated and is not connected to production or the public Render preview.

## Integration base
- Base branch: ezero-root-approval-browser-staging-20261125
- Integration branch: ezero-successful-work-integration-staging-20261125

## Verified successful components (source branches retained)
1. Browser Root Approval signer
   - Source: ezero-root-approval-browser-staging-20261125
   - Evidence: workflow run 45542593923 succeeded, including LF canonical-message regression.
   - Scope: callable browser signer using existing non-exportable browser P-256 key. UI and challenge transport are not yet integrated.

2. Android enrollment protocol, AndroidKeyStore key and QR envelope/router
   - Source: ezero-android-keystore-enrollment-client-staging-20261125
   - Evidence: Android QA run 45553380551 succeeded; source safeguards, Android unit tests and isolated debug APK assembly succeeded.
   - Artifact check: no downloadable workflow artifact was published for run 45553380551.
   - Scope: key creation and QR parsing/verifying primitives; end-to-end root enrollment is not yet integrated.

3. Root-approved enrollment contract
   - Source: ezero-android-root-approved-enrollment-contract-20261125
   - Evidence: workflow run 45539441264 succeeded (6/6 contract tests).
   - Scope: protocol contract only; bootstrap ceremony and production trust provisioning remain outstanding.

4. Candidate enrollment Worker and device-management routes
   - Source: ezero-android-root-enrollment-worker-candidate-20261125
   - Evidence: workflow run 45540012012 succeeded; device-management QA run 45540489976 succeeded (7/7 management tests and Wrangler dry-run).
   - Scope: isolated candidate only; not deployed or connected to production.

5. Evidence registry / public AI safety checks
   - Evidence validator run 45553380514 succeeded, including evidence registry and browser contract/external-link checks.

## Integration rules
- Do not merge this branch into the default branch or any auto-deploy/public-preview branch.
- Do not deploy the candidate Worker.
- Preserve the working calling baseline and all existing friend/identity data.
- Never treat a QR's self-presented key as a trusted Root. Root trust must be provisioned and verified independently.
- Keep secrets, FCM tokens and private keys out of logs and QR payloads.
- Keep all successful source branches intact until integration tests pass.

## Remaining integration gates
1. Select and provision a pre-trusted Root public key through an independently verified bootstrap ceremony.
2. Connect browser Root Approval UI to authenticated challenge retrieval and signing.
3. Connect Android request display, approval scanning, signature verification and enrollment state persistence.
4. Connect Android enrollment to the isolated Worker candidate; test expiry, replay, wrong audience, revocation and one-use challenge consumption.
5. Add artifact upload/retention to Android QA workflow and verify the APK download.
6. Run end-to-end two-phone enrollment, then saved-friend direct audio/video calling.
7. Integrate push/FCM only after key pinning and signed-call verification; physically test background and locked-screen ringing.
8. Run full regression suite before any preview or production deployment.

## Current truth
The listed component-level checks are green, but they do not establish an integrated, two-phone enrolled-and-callable system. This register records verified successes without overstating system readiness.
