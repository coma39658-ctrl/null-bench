# E-ZERO Android ↔ Browser Owner-Key Decision Record V1 — 2026-11-20

Status: SOURCE AUDIT / DESIGN DECISION ONLY. No enrollment, UI integration, network change, deployment, or production change.

## Decision summary

There is no single pre-provisioned global "website owner" identity established by the inspected code. The current isolated permanent-QR implementation models a **user/browser installation identity**:

- A P-256 ECDSA key pair is created for a browser installation after user consent and persisted as non-extractable CryptoKey material in same-origin IndexedDB.
- The permanent `EZERO2` token carries the public SPKI, its lowercase SHA-256 fingerprint, and a P-256 proof-of-possession signature.
- The signature canonical form is exactly:
  `EZERO-PERMANENT-IDENTITY-1\nhttps://coma39658-ctrl.github.io\n<spki-base64url>\n<fingerprint-lowercase-hex>`
- The Android `BrowserPermanentIdentityVerifier` verifies that exact origin-bound signature and returns the browser public key and fingerprint.
- The permanent QR is therefore a stable browser/device identity, not proof of a legal person, company ownership, or a universal website operator.

## Source evidence inspected

1. `js/ezero_saved_friend_stage_engine_v0_1.js` loads a previously consented device key from `EZERO_DEVICE_IDENTITY_STORE`, validates key-pair possession and fingerprint, and otherwise uses an ephemeral key until the user explicitly saves it.
2. `js/ezero_secure_connect_device_identity_v0_1.js` stores a non-extractable P-256 private CryptoKey and public key in IndexedDB; it provides no private-key export path.
3. `js/ezero_permanent_identity_qr_staging_20261118.js` builds `EZERO2` from the persisted browser key and signs the fixed canonical origin-bound identity statement. It verifies the signature before rendering/restoring the permanent QR.
4. `ezero_trusted_friends_staging_20261106.html` loads the identity store and permanent QR code in an isolated staging page. This source inspection does not prove that the latest public website deployment contains this implementation.
5. Android `BrowserPermanentIdentityVerifier.kt` verifies the same `EZERO2` canonical statement and origin. It does not establish ownership of the key or grant Android-to-browser trust.
6. The separate `ezero_connect_identity_v1.js` / `EZERO1` preview key and the `E-ZERO-TRUST-1` helper remain different identity/protocol systems. They must not be substituted for the `EZERO2` key.

## Compatibility conclusion

A safe route is technically plausible **if and only if** the Android app scans the browser's already established `EZERO2` QR and the browser proves possession of that exact same private key by signing a fresh, domain-separated Android-binding challenge. The browser must not create a second key and label it as the same identity.

The current Android `EZERO-ANDROID-BIND-1` helper is not yet the final cross-platform contract. It has a nine-line request canonicalization and cryptographic conversion tests, but no matching browser-side approval implementation, no challenge consumption service, and no end-to-end enrollment.

## Required implementation gates

1. **Public-web parity gate:** establish whether the isolated `EZERO2` generator and identity store are actually present in the intended staging website build. Do not assume source on the Android staging branch is deployed.
2. **Same-key gate:** Android displays the fingerprint obtained from the scanned `EZERO2` QR; browser approval must be signed by the IndexedDB private key whose public SPKI hashes to that exact fingerprint. Any mismatch fails closed.
3. **Fresh challenge gate:** use a cryptographically random nonce, exact HTTPS origin/audience, Android public-key fingerprint, browser-owner fingerprint, explicit capability `call-invite-only`, issued-at and expiry (maximum 90 seconds), and single-use consumption.
4. **Human approval gate:** browser shows the Android device fingerprint and capability and requires an explicit Approve action. Scanning alone is not approval. Android verifies the approval signature against the already scanned `EZERO2` public key.
5. **Cross-language fixtures:** one canonical byte fixture and signature fixture must be verified by both WebCrypto and Android/JCA tests. Normalize fingerprints at protocol boundaries without changing the existing `EZERO2` QR format.
6. **Revocation gate:** revocation, replay rejection, wrong-origin rejection, expiry, key mismatch, duplicate enrollment, and storage failure all fail closed.
7. **Call-only scope:** first binding grants only the explicitly named call-invite capability. It does not sync contacts, messages, media, photos, SDP, ICE, or call history.
8. **Release gate:** isolated automated tests first; then one consolidated physical two-phone test. No production deployment or changes to the frozen calling engine before all gates pass.

## Explicitly not done

- No browser signing API was added.
- No Android UI or contact-vault enrollment integration was added.
- No network endpoint or Worker was enabled.
- No QR format was changed.
- No public website or production service was deployed.
- No claim is made that Android-to-browser saved-friend calling works.

## Safety decision

Continue with a narrow, user-approved browser signing action that uses the existing `EZERO2` private key, after public-web parity and cross-platform canonical fixtures are proven. Never export or upload the private key. Never treat a fingerprint, QR scan, display name, or website origin as human/legal identity proof.
