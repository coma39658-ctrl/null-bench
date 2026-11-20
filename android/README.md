# E-ZERO Android incoming-call host (isolated staging)

This is a native Android notification host scaffold. It is deliberately separate from the existing web/PWA and WebRTC code.

## Current status
- Native Android project scaffold and incoming-call notification lifecycle are staged here.
- Incoming FCM data is parsed by a dedicated strict validator; deterministic unit tests cover IDs, call modes, expiry boundaries and ensure caller identity is never trusted from push data.
- The staging CI now runs Android unit tests before compiling the debug APK.
- AndroidX Core-Telecom 1.0.0 and `MANAGE_OWN_CALLS` are added; the app registers audio/video capabilities with Android Telecom on supported devices.
- Telecom registration is groundwork only: no incoming Telecom call is created until signed invite verification and the existing WebRTC answer/reject handoff are integrated.
- FCM project configuration is not present. Push delivery is therefore NOT active.
- The signed E-ZERO wake-up API and existing WebRTC invite handoff are not yet integrated.
- Accept currently opens the host activity with a pending-call marker; it does not claim to connect a call.
- No APK build, physical-device test, public deployment, Worker deployment, or production change is claimed.

## Firebase setup gate
Register Android package `com.ezero.connect` in a Firebase project, enable Firebase Cloud Messaging, and place its downloaded `google-services.json` in `android/app/`. The Google Services Gradle plugin is applied only when that file exists. Do not commit service-account credentials or FCM HTTP v1 private keys. The JSON client config is not a server credential, but keep project ownership under the E-ZERO owner's account.

FCM Android delivery requires Google Play services on the device. See:
- https://firebase.google.com/docs/android/setup
- https://firebase.google.com/docs/cloud-messaging/android/get-started

## Wake-up payload contract (data-only)
Expected fields:
- `call_id`: opaque ID, 8–128 URL-safe characters
- `mode`: `AUDIO` or `VIDEO`
- `expires_at`: Unix epoch milliseconds, no more than 120 seconds in the future
- `caller_alias`: ignored by the Android client; caller display name must be resolved from a locally trusted identity only after the signed invite is authenticated

The backend must authenticate the caller's signed request, verify saved-friend trust, replay window, expiry, cooldown and rate limits BEFORE sending FCM. The client-side checks here are defensive validation only; they do not replace backend signature/trust verification. Push payload fields are wake-up hints only and must never be treated as proof of caller identity. Do not put SDP, media, message text, photos, recordings, private keys or long-lived auth tokens in FCM payloads.

## Android behavior
- Core-Telecom registration declares baseline VoIP plus video-call capability on Android 8.0+; devices below API 26 report unavailable.
- Registration does not answer, ring, or establish media by itself. The next gate is wiring Telecom callbacks to the verified E-ZERO invite lifecycle.
- Android 13+: request notification permission at runtime.
- Incoming call uses a high-importance notification channel and AndroidX CallStyle.
- Accept and Reject are explicit actions. There is no auto-answer.
- Full-screen intent is optional and only attached when Android reports it is allowed. Android 14+ policy and user settings may restrict it.
- Notification/ringtone behavior is subject to Android channel settings, notification permission, device settings, OEM battery controls, network availability and force-stop behavior.

## Build
Open the `android/` folder in Android Studio, or use Gradle with Android SDK installed:
```sh
gradle :app:assembleDebug
```
A successful build would only validate compilation. It would not validate push delivery, ringtone audibility, lock-screen behavior, or WebRTC handoff.

## Next implementation gates
1. Configure Firebase app and verify token lifecycle without logging tokens. The Android Firebase app config (`google-services.json`) is still required before FCM can initialize.
2. Implement authenticated device registration against an isolated backend.
3. Implement backend-signed, short-lived wake-up delivery and cancellation.
4. Bind Accept to the existing signed WebRTC invite flow without changing the WebRTC engine.
5. Test on two physical Android devices, including background, screen lock, reject, cancel, timeout and force-stop limitations.
