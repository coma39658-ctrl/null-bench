# E-ZERO Connect — Android Native Host and Push Boundary Audit (Pass 2)

Date: 2026-11-28  
Repository: `coma39658-ctrl/null-bench`  
Source reviewed: isolated Android staging branches, especially `ezero-android-call-wake-hardening-staging-20261127`, with cross-checks against `ezero-android-incoming-trust-gate-staging-20261127` and `ezero-android-fcm-token-registration-staging-20261127`.  
Status: PARTIAL IMPLEMENTATION AUDIT — not a release or live-service test.

## Executive findings

The Android native host **does exist** in staging branches. The earlier Pass 1 statement that Android source was not in the default-branch tree remains correct for `main`, but the source is present on dedicated staging branches. This audit corrects the earlier uncertainty without treating staging code as production.

The native project uses:
- Android application ID / namespace: `com.ezero.connect`
- Version name: `0.1.0-staging`
- minSdk 24; targetSdk 35; compileSdk 35
- Kotlin / Android Gradle project under `android/`
- Firebase Messaging dependency and `IncomingCallMessagingService`
- AndroidX CallStyle incoming-call notification with ringtone channel and Accept/Reject actions

**Critical status:** FCM is not active end-to-end. The sender helper exists as a low-level isolated module but is not routed or deployed; required Firebase configuration and secrets are absent/unverified; the Android signing public-key pin defaults to blank; and Accept does not yet retrieve/authenticate an invite or hand off to the existing WebRTC call. No physical closed-app ringing proof is recorded.

## 1. Native Android package and build boundary

Reviewed `android/app/build.gradle.kts`:
- `namespace = "com.ezero.connect"`
- `applicationId = "com.ezero.connect"`
- `versionCode = 1`
- `versionName = "0.1.0-staging"`
- min SDK 24, target SDK 35, compile SDK 35
- Java 17 / Kotlin JVM target 17
- AndroidX Core, Activity, CameraX, ZXing, Core-Telecom and Firebase Messaging dependencies

Root Gradle declares Android Gradle Plugin 8.7.3, Kotlin 2.0.21 and Google Services plugin 4.6.0. The Google Services plugin is applied in the app only when `android/app/google-services.json` exists.

The enrollment Worker endpoint and wake-signature public SPKI are optional Gradle properties. Invalid or absent values become empty strings. This is a deliberate fail-closed default.

No package ID, signing identity or release keystore should be changed during separation. A new standalone app must preserve `com.ezero.connect` only if the existing app identity is intentionally continued; any package rename is a separate migration and update-path decision.

## 2. Android manifest and call notification components

Reviewed `android/app/src/main/AndroidManifest.xml`:
- INTERNET, CAMERA, POST_NOTIFICATIONS, VIBRATE, WAKE_LOCK, USE_FULL_SCREEN_INTENT and MANAGE_OWN_CALLS permissions
- `MainActivity` launcher activity
- `QrCameraScanActivity`
- non-exported `CallActionReceiver`
- non-exported `IncomingCallMessagingService` listening for `com.google.firebase.MESSAGING_EVENT`

Reviewed notification implementation:
- high-importance channel `ezero_incoming_calls_v1`
- system ringtone URI with notification-ringtone audio usage
- AndroidX `NotificationCompat.CallStyle.forIncomingCall`
- explicit Accept and Reject actions
- full-screen intent attached only when Android permits it
- notification is suppressed if notifications are disabled or a SecurityException occurs

These are implementation components, not evidence that an audible ring was delivered on a real phone. Android 13+ runtime notification permission, Android 14+ full-screen-intent policy, channel settings, OEM battery management, force-stop and device-specific behavior remain relevant.

## 3. Incoming FCM validation chain

The staged service performs this sequence:
1. Reject notification-payload messages; only data-only messages proceed.
2. Verify the exact allowlisted signed fields using `IncomingCallWakeSignatureVerifier`.
3. Parse a bounded call payload.
4. Persistently consume a nonce/call ID through `IncomingCallWakeReplayGuardV1`.
5. Only then show the CallStyle notification.

The verifier requires exactly six fields:
`wake_v`, `call_id`, `mode`, `expires_at`, `nonce`, `server_sig`.

It checks protocol version, AUDIO/VIDEO mode, call ID format, nonce format, expiry within 120 seconds and ECDSA/SHA-256 signature. The replay guard rejects a repeated nonce or call ID, removes expired records and caps its stored set at 128 entries.

The public SPKI is supplied through Gradle property `ezeroCallWakePublicKeySpkiBase64`. With the property absent, the pin is blank and verification rejects every wake. No matching independently verified sender key is recorded as provisioned.

## 4. Token registration and Firebase boundary

The staged Android client contains `AndroidPushTokenRegistrationV1`:
- waits for server-enrolled state;
- obtains the current FCM token only if Firebase initializes;
- signs a canonical registration statement with the non-exportable Android Keystore installation key;
- sends the token over HTTPS to a restricted `workers.dev` enrollment endpoint;
- does not log or persist the raw FCM token locally.

The staged token-registration contract describes encrypted server-side token storage, device/root revocation checks, nonce replay prevention and a 90-day token expiry. These are candidate Worker contracts, not proof of a deployed endpoint.

Current blockers:
- `google-services.json` is absent from the reviewed staging source and Firebase runtime initialization is not verified.
- Firebase project ownership/configuration and Google Play services availability on test devices are not confirmed here.
- token-encryption secret and Worker deployment are not confirmed.
- no live token registration request or server-side stored token was verified.

Never put service-account JSON, FCM tokens, signing private keys or token-encryption keys in source, PR text or an APK.

## 5. Server-side sender boundary

`signaling/cloudflare/src/fcm_call_wake_sender_v1.js` contains a low-level FCM HTTP v1 sender helper:
- creates a short-lived P-256/SHA-256 signed wake;
- converts WebCrypto P1363 signature to DER for Android interoperability;
- exchanges a service-account JWT assertion for a Google OAuth token;
- sends a data-only high-priority FCM message.

The associated staging document explicitly marks the helper **NOT ROUTED, NOT DEPLOYED, NOT CREDENTIALLED**. It has no public route and does not authorize callers, check saved-friend relationships, look up recipient installation trust or persist an invitation. It must only be called after those controls are implemented in a separate trusted path.

Required secret names documented for a dedicated staging Worker are:
- `FCM_SERVICE_ACCOUNT_JSON`
- `CALL_WAKE_SIGNING_PRIVATE_KEY_PKCS8_BASE64URL`

These values were not read, retrieved or provisioned. Their existence is UNKNOWN. Do not assume that Firebase account ownership alone supplies these server credentials.

## 6. Accept/Reject and WebRTC handoff

Reviewed `CallActionReceiver.kt`:
- cancels the local notification;
- Reject returns without starting a call;
- Accept launches `MainActivity` with a pending call ID/action marker.

The reviewed `MainActivity` is an enrollment/preparation UI. The sender and Android hardening documents explicitly state that authenticated invite retrieval and Accept-to-existing-WebRTC handoff are not complete.

AndroidX Core-Telecom registration declares baseline VoIP and video capabilities, but registration alone does not create, answer, or connect a call.

Therefore:
- a CallStyle notification is not proof of a connected call;
- tapping Accept is not yet proof of WebRTC answer;
- no automatic answer is permitted;
- the existing working browser audio/video engine must remain frozen until the native handoff passes equivalent two-device tests.

## 7. App separation boundary recommendation

The Android host should become an independent native Connect app module with explicit interfaces:
- `identity/enrollment`: Android Keystore, Root approval and revocation
- `push/wake`: FCM token lifecycle, signed wake validation and replay guard
- `incoming-call-ui`: ringtone channel, lock-screen UI, Accept/Reject
- `call-handoff`: authenticated invite fetch and explicit user-approved WebRTC handoff
- `qr`: camera/gallery QR decoding and signed envelope parsing
- `profile/friends`: local trusted-friend presentation, only after verified binding

Keep the PWA/browser client as a separate adapter. Do not share private keys or treat browser-origin IndexedDB and Android Keystore as one key store. Connect's API and trust protocol should be versioned and independent of Null Bench/AI Studio.

## 8. Acceptance gates

| Gate | Required evidence | Current status |
|---|---|---|
| Android package inventory | Gradle, package ID, SDK levels and manifest | PASS — staging source inspected |
| Notification implementation | CallStyle, ringtone channel, Accept/Reject receiver | PASS — source inspected only |
| FCM token client | Firebase init + signed token registration + deployed endpoint | PARTIAL / NOT LIVE |
| Wake signature | Independently verified public pin + matching server signer | BLOCKED — default pin blank |
| FCM sender | credentials, isolated secrets, trusted authorization route and deployed sender | BLOCKED — helper not routed/deployed/credentialled |
| Saved-friend trust | authoritative active Registry and revocation at dispatch | BLOCKED / NOT COMPLETE |
| Accept-to-WebRTC | authenticated invite fetch and explicit call handoff | BLOCKED / NOT COMPLETE |
| Physical ringing | two-device tests foreground/background/locked/swiped-away and OEM settings | NOT RUN / UNKNOWN |

## Safety boundary

This report is documentation only. No Firebase project was changed; no secret was read or created; no Worker was deployed; no APK was built or signed; no production app or WebRTC engine was changed. Staging source and automated unit tests must not be described as live FCM or physical ringing proof.
