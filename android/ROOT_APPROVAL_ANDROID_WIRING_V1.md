# Android Root approval wiring V1

Status: isolated Android staging integration. This is local cryptographic verification only; it does not complete backend enrollment.

## Connected path

1. Android must already have a Root public key pinned using the independent 64-character fingerprint comparison in `AndroidRootTrustPinV1`.
2. The Android app accepts a short-lived `EZERO_ANDROID_ENROLL_REQUEST_V1` QR only when its device fingerprint matches the public identity held by this installation.
3. The pending request is saved in app-private preferences. The request's Android P-256 proof-of-possession is verified when the approval is processed.
4. The app accepts an `EZERO_ANDROID_ENROLL_APPROVAL_V1` QR only when a pending request exists and the separately pinned Root key is available.
5. `AndroidEnrollmentApprovalGateV1` verifies the request proof, exact request/approval binding, audience, expiry, P-256 Root key, Root fingerprint pin, and Root ECDSA signature.
6. On success, the pending request is consumed locally and the challenge ID plus approval fingerprints are stored. The same last-consumed challenge cannot be accepted again on this installation.

## Explicit limits

- No live challenge fetch, request QR display, Worker enrollment completion, server-side atomic challenge consumption, device registry activation, Firebase/FCM registration, or push sender is connected here.
- A local verified approval is NOT server enrollment, friend trust, or call authorization.
- Root pinning still requires the user to compare the full fingerprint through a separate trusted channel. The QR is not its own trust anchor.
- Production site, existing QR identity baseline, live calling path, and production Workers are untouched.

## QA

Unit tests cover successful joined verification, wrong Root pin, and tampered Android device proof. Android build and regression workflows must pass before this branch is considered for merge or APK distribution.
