# E-ZERO Android ↔ EZERO2 Browser Owner Approval — Stage 2

Date: 2026-11-20
Branch: `ezero-android-package-isolated-staging53-20261120`
Status: **CROSS-PLATFORM CRYPTOGRAPHIC TEST GATES PASS; NOT ENROLLED, NOT INTEGRATED, NOT DEPLOYED**

## Implemented

- Added `js/ezero_android_binding_owner_approval_v1.js` and loaded it only from the isolated staging HTML, after the existing permanent EZERO2 identity code.
- The signer reads the already-saved browser identity from `EZERO_DEVICE_IDENTITY_STORE`; it requires the existing permanent proof and re-verifies it through `EZERO_PERMANENT_IDENTITY_QR.verify`.
- It signs with the same non-extractable P-256 private CryptoKey that corresponds to the permanent EZERO2 QR. It does not generate a second owner key or export any private key.
- It accepts only the exact nine-line `EZERO-ANDROID-BIND-1` canonical request, the fixed app origin, matching Android SPKI SHA-256 fingerprint, a fresh nonce, validity no longer than 90 seconds, and the exact `call-invite-only` capability.
- It displays a human approval prompt describing the owner fingerprint, Android fingerprint, and narrow capability. Declining fails closed.
- Signature input is domain separated as `EZERO-ANDROID-BIND-APPROVAL-1\\n` followed by the exact canonical request bytes.
- A browser-session nonce set rejects a second approval of the same owner/nonce pair. This is only a local defense; the future server must enforce durable atomic single-use consumption across sessions and devices.
- Added `AndroidBrowserBindingApprovalVerifier.kt`. It checks the exact scanned EZERO2 owner fingerprint, fixed origin, Android SPKI fingerprint, P-256 key type, expiry and 90-second maximum, nonce shape, domain-separated signature, and returns a verification result only. It does not enroll or save the Android installation.
- Added one shared test-only golden vector at `android/app/src/test/resources/ezero_android_browser_binding_golden_v1.properties`. It contains only test public keys/signatures and canonical bytes, explicitly marked test-only; both Node/WebCrypto and Kotlin/JCA tests consume the same vector. It is not a production identity or key.

## Automated evidence — PASS

- Android workflow run [44758720275](https://github.com/coma39658-ctrl/null-bench/actions/runs/44758720275), commit `3f7923831dbc2a30f77fa764ec9bafb1e8ddf4cd`: completed successfully. Android unit tests, APK compilation, staging signer verification, application ID verification, and artifact upload all passed.
- Evidence validator run [44758720276](https://github.com/coma39658-ctrl/null-bench/actions/runs/44758720276), same commit: completed successfully.
- Browser owner-approval gate run [44758540414](https://github.com/coma39658-ctrl/null-bench/actions/runs/44758540414): passed on the corrected browser signer/test source.
- The shared golden fixture is now consumed by both Node/WebCrypto and Kotlin/JCA tests. The Android run above confirms the Kotlin fixture-loading fix and the shared-vector test passed.

## Not implemented / not proven

- Android-side verifier is not wired into the app UI or contact vault.
- No challenge issuer, network endpoint, durable atomic nonce ledger, server-side replay prevention, revocation protocol, or call-invite transport is connected.
- An older isolated Trusted Inbox candidate uses a distinct `EZERO-TRUSTED-INBOX-1` hello/signature format and a different preview origin. It is not compatible with `EZERO-ANDROID-BIND-1` and must not be connected or treated as the binding server.
- No contact sync, messaging, media, SDP, ICE, call history, or background delivery is included.
- No public website, Render service, Cloudflare Worker, production app, or release APK was changed by this stage.
- CI success is not physical-device evidence and does not prove two-phone enrollment or calls.

## Next gate

1. Design a server-side challenge/nonce ledger for the exact `EZERO-ANDROID-BIND-1` canonical request and existing EZERO2 owner identity.
2. Require atomic, durable, single-use nonce consumption with expiry, origin/audience binding, owner/Android fingerprints, exact capability, and revocation.
3. Add server-side tests for concurrent replay attempts, expiry, wrong origin/owner/device/capability, revoked binding, and owner decline.
4. Only after those gates pass, consider isolated UI wiring. Keep it disconnected from the live call engine until a separately approved two-phone test.
