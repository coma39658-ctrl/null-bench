# E-ZERO Android enrollment Worker candidate V1

Status: **isolated code candidate only — NOT DEPLOYED and NOT wired to the active Worker**.

## Files
- `src/android_enrollment_candidate_v1.js`: root pre-registration, Android challenge, signed device proof, signed root approval, and active enrollment binding.
- `wrangler.android-enrollment-candidate-v1.jsonc`: separate candidate configuration with its own Durable Object class.
- Existing `wrangler.jsonc`, live signaling Worker, QR flow, friend store, Render Preview, Firebase project, and APK are unchanged.

## Trust anchor
A root can only be added through `POST /v1/admin/root-register` using the out-of-band `ROOT_BOOTSTRAP_SECRET` secret. This is an explicit administrative bootstrap, not self-registration. The secret must be provisioned through the platform secret manager and must never enter source control, browser code, logs, or an APK. No secret is present in this repository.

The bootstrap ceremony itself is still an operational security dependency: before any staging deployment, define who holds the secret, how the initial root SPKI fingerprint is verified out-of-band, rotation, recovery, and audit procedure. Do not infer root authority from a Google account email.

## Implemented candidate routes
- `POST /v1/admin/root-register`: secret-gated registration of a P-256 root SPKI.
- `POST /v1/android/enrollment/challenge`: validate Android P-256 SPKI, recompute SHA-256 fingerprint, issue 90-second nonce/challenge.
- `POST /v1/android/enrollment/complete`: verify Android proof-of-possession and root signature over exact canonical approval; root must already be active in registry; atomically reserve/consume challenge before asynchronous crypto checks; persist active device binding.

The candidate has no FCM token endpoint, FCM sender, push delivery, device listing/revocation route, browser root-approval UI, or Android client integration yet. It does not make incoming calls ring. It stores public SPKIs and enrollment metadata only. The current rate limiter hashes the Cloudflare edge client IP before persistence; it does not store raw IPs. The fixed-window counters are per route and IP and need operational review before deployment.

## Release blockers
1. Review and test the administrative bootstrap ceremony and secret rotation/recovery.
2. Add root-authenticated device listing and revocation with signed, replay-protected commands.
3. Add browser root-approval UX showing the exact Android fingerprint and origin.
4. Add Android Keystore proof/signing client and integration tests.
5. Add abuse controls, quotas, expiry cleanup, data retention and audit policy.
6. Only then consider a separately approved staging deployment. Never point the active Worker at this module until its own review and explicit deployment approval.
7. FCM integration is a separate later stage; do not store FCM tokens until enrollment, revocation, sender authorization and signed wake validation are complete.

## Canonical crypto
UTF-8, LF-only, fixed field order, final LF. ECDSA P-256/SHA-256 DER signatures. Challenge is 90 seconds and binds the exact device key, nonce, challenge ID and fixed E-ZERO audience. Root approval binds root fingerprint, device fingerprint, challenge ID, nonce, audience and expiry.
