# E-ZERO Android ↔ EZERO2 Browser Owner Approval — Stage 2

Date: 2026-11-20
Branch: `ezero-android-package-isolated-staging53-20261120`
Status: **BROWSER SIGNER + ANDROID VERIFIER IMPLEMENTED; AUTOMATED GATES RUNNING; NOT ENROLLED OR DEPLOYED**

## Implemented

- Added `js/ezero_android_binding_owner_approval_v1.js` and loaded it only from the isolated staging HTML, after the existing permanent EZERO2 identity code.
- The signer reads the already-saved browser identity from `EZERO_DEVICE_IDENTITY_STORE`; it requires the existing permanent proof and re-verifies it through `EZERO_PERMANENT_IDENTITY_QR.verify`.
- It signs with the same non-extractable P-256 private CryptoKey that corresponds to the permanent EZERO2 QR. It does not generate a second owner key or export any private key.
- It accepts only the exact nine-line `EZERO-ANDROID-BIND-1` canonical request, the fixed app origin, matching Android SPKI SHA-256 fingerprint, a fresh nonce, validity no longer than 90 seconds, and the exact `call-invite-only` capability.
- It displays a human approval prompt describing the owner fingerprint, Android fingerprint, and the narrow capability. Declining fails closed.
- Signature input is domain separated as `EZERO-ANDROID-BIND-APPROVAL-1\n` followed by the exact canonical request bytes.
- A browser-session nonce set rejects a second approval of the same owner/nonce pair. This is a local defense only; the future server must enforce durable atomic single-use consumption across sessions and devices.
- Added `AndroidBrowserBindingApprovalVerifier.kt`. It checks the exact scanned EZERO2 owner fingerprint, fixed origin, Android SPKI fingerprint, P-256 key type, expiry and 90-second maximum, nonce shape, domain-separated signature, and returns a verification result only. It does not enroll or save the Android installation.
- Added one shared test-only golden vector at `android/app/src/test/resources/ezero_android_browser_binding_golden_v1.properties`. It contains only test public keys/signatures and canonical bytes, explicitly marked test-only; both Node/WebCrypto and Kotlin/JCA tests consume the same vector. It is not a production identity or key.

## Automated evidence

Workflow: [E-ZERO Browser Owner-Key Binding — Isolated Gate](https://github.com/coma39658-ctrl/null-bench/actions/workflows/ezero-browser-owner-binding-stage.yml)

The passing run on the latest signer/test changes is recorded in GitHub Actions. The browser test checks:
- permanent EZERO2 owner proof is verified by the same owner public key;
- explicit confirmation is required;
- returned signature verifies with that exact EZERO2 public key;
- owner-key mismatch, wrong capability, expiry, expiry boundary, and same-session nonce replay are rejected;
- owner decline is rejected.

## Not implemented / not proven

- Android-side verifier exists as an isolated pure Kotlin component but is not wired into the app UI or contact vault.
- Shared cross-language golden fixtures are not yet consumed by both Kotlin and JavaScript tests.
- No challenge issuer, network endpoint, durable nonce ledger, revocation protocol, or call-invite transport is connected.
- No contact sync, messaging, media, SDP, ICE, call history, or background delivery is included.
- No public website, Render service, Cloudflare Worker, production app, or release APK was changed by this stage.
- CI success is not physical-device evidence and does not prove two-phone pairing or calls.

## Next gate

1. Add a Kotlin verifier for the domain-separated owner approval using the scanned EZERO2 SPKI, exact canonical request, owner/Android fingerprints, nonce, expiry and capability.
2. Add shared canonical/signature fixtures that pass in both Node/WebCrypto and Android/JCA.
3. Test wrong key, wrong origin, tampering, replay, expiry, revocation and user decline.
4. Only after those pass, consider isolated UI wiring. Keep it disconnected from the live call engine until a separately approved two-phone test.
