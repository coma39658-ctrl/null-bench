# E-ZERO Android call-wake hardening V1

Status: **STAGING CODE — AUTOMATED QA REQUIRED — NOT ACTIVE**

This change hardens the Android side of the existing data-only FCM wake contract.

## Implemented in this branch

- The backend P-256 public SPKI pin is supplied at build time using the Gradle property `ezeroCallWakePublicKeySpkiBase64`.
- An absent or malformed pin remains empty; the verifier fails closed. No private key or Firebase credential is included in the APK.
- The verifier accepts exactly six FCM data fields: `wake_v`, `call_id`, `mode`, `expires_at`, `nonce`, and `server_sig`. Unknown fields are rejected.
- A bounded persistent replay guard rejects a reused nonce or call ID, removes expired entries, caps storage at 128 wakes, and persists acceptance before a notification is shown.
- Android unit tests cover signature verification, malformed fields, expiry bounds, replay, and bounded storage.

## Build configuration

The reviewed staging public SPKI can be supplied to Gradle as:

```sh
gradle -p android :app:testDebugUnitTest :app:assembleDebug -PezeroCallWakePublicKeySpkiBase64='<STAGING_PUBLIC_SPKI_BASE64>'
```

Do not set this property until the matching private key is generated and stored only in the isolated Worker secret store, and the public-key fingerprint is independently checked. The default build deliberately has no pin and will reject every call wake.

## Still blocked / not proven

- The FCM sender helper is still not connected to a trusted public Worker route.
- The enrollment Worker still lacks a server-authoritative saved-friend relationship registry and an authenticated short-lived invite fetch endpoint. A caller-provided relationship ID alone is not proof of friendship.
- No matching signing key has been provisioned, no Firebase project config/service-account permission has been verified, and no Worker secrets have been provisioned.
- The Android host still has no completed authenticated invite fetch and Accept-to-existing-WebRTC handoff.
- No live FCM delivery, audible ringtone, lock-screen presentation, or two-device background call has been tested.

These remaining gates are intentional fail-closed boundaries. This branch does not deploy a Worker, change production, or modify the existing browser calling engine.
