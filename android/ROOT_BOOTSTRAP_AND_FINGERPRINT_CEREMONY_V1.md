# E-ZERO Root bootstrap and fingerprint ceremony V1

Status: **procedure draft for review only — not authorized for deployment or Root registration**.

## Purpose and trust boundary

The browser Root identity is the existing non-exportable P-256 key on the canonical E-ZERO origin. Only its public SPKI and SHA-256 fingerprint may leave that browser. A valid ECDSA signature proves possession of a key; it does not by itself prove that the key belongs to the intended E-ZERO owner. The registry authorization decision must therefore depend on an independently confirmed fingerprint and an administrative bootstrap secret.

## Fingerprint confirmation — mandatory before pinning

1. Open the existing Root public identity page only on `https://coma39658-ctrl.github.io`, on the browser/device that already holds the Root identity. Do not create a new Root key to make this step pass.
2. Load the identity and record the 64-character lowercase SHA-256 fingerprint. The page must show public material only; never export or request the private key.
3. On the Android device, inspect the candidate Root fingerprint presented for pinning. Compare all 64 hex characters with the Root page value over a separate, already trusted channel (for example, a direct voice call using a separately known number, or an in-person comparison). Do not use the enrollment QR, the same browser session, the same chat thread, or a link supplied alongside the candidate as the independent channel.
4. Enter/confirm the independently received 64-character value in the Android pin flow. The Android gate recomputes SHA-256 from the supplied SPKI and refuses the pin if the displayed value or independently confirmed value differs.
5. If even one character differs, stop. Do not accept, retry with a different QR, or replace the stored pin until the discrepancy has been investigated and the legitimate Root identity has been independently re-established.

## Administrative bootstrap secret

- Generate a high-entropy random secret (at least 32 random bytes) in the authorized administrative environment.
- Store it only as the candidate Worker secret named `ROOT_BOOTSTRAP_SECRET` using the platform's secret manager. Never place it in Git, JSONC vars, source files, a browser page, an APK, QR payloads, issue comments, chat, shell history, or logs.
- Restrict access to the secret to the designated administrator. Do not send it to the Android app or ordinary browser client.
- The `/v1/admin/root-register` route also requires the canonical browser Origin. Registration must use the public Root SPKI obtained from the existing identity page and the exact fingerprint independently confirmed above.
- Record a non-secret audit entry: date/time, operator, Root fingerprint, candidate Worker version and approval reference. Do not record the secret.
- The current repository has no secret provisioned and no Root has been registered by this procedure. Do not run the registration route as part of staging QA.

## Rotation, recovery and incident response

- A Root key rotation requires a separately approved change: independently confirm the new fingerprint, authorize it out-of-band, record the old/new fingerprints, and define whether old Root approval is revoked before or after transition.
- If the browser storage is lost, do not silently create a replacement key and treat it as the same Root. Use a separately documented recovery authority and independent identity check; absent that, stop enrollment.
- If the bootstrap secret may have leaked, rotate it in the secret manager before further admin use and review available audit evidence. Never paste the old or new secret into a support conversation.
- If a device is lost or compromised, enrollment alone is not sufficient: signed device listing/revocation and audit controls are release blockers.

## Current implementation boundaries

- Android's `AndroidRootTrustPinV1.pinAfterIndependentConfirmation` enforces equality between the manually independently confirmed fingerprint and the fingerprint recomputed from the candidate SPKI.
- The Root identity page displays only public SPKI and fingerprint; it does not upload or register them.
- The Worker candidate contains an admin registration route but is not deployed; no secret is configured and no Root registration has been performed.
- This procedure is not a claim that independent confirmation, bootstrap, rotation, recovery, or revocation has been physically exercised.

## Approval gate

Before any staging deployment, a human operator must review and approve this procedure, independently compare the Root fingerprint, provision the secret through the platform secret manager, and authorize a separate staging-only registration exercise. Production deployment remains a separate explicit approval.
