# E-ZERO Android Device Registration & Push Contract

Status: PREPARATION SPECIFICATION. A local Android Keystore P-256 key primitive and SHA-256 public-key fingerprint helper now exist in staging. No enrollment API, root approval, FCM token registration, FCM sender, signed wake verification, or Worker deployment is active.

Scope: isolated branch `ezero-android-incoming-call-ringtone-staging-20261120`. The public QR/WebRTC engine, public site, and production Workers remain unchanged.

## 1. Verified current boundary

- The Android host can parse a short-lived wake-up hint and display a CallStyle notification when a Firebase message is delivered.
- `google-services.json` is absent; Firebase initialization, token delivery, and push delivery are not active.
- `IncomingCallMessagingService.onNewToken` does not register a token anywhere.
- The PR156 Trusted Inbox candidate authenticates browser P-256 identities, enforces saved-friend trust/replay/cooldown, and delivers only to an already-connected owner browser tab. Its own source comment explicitly says there is no offline delivery.
- Browser identity private keys are non-exportable WebCrypto keys in browser-origin IndexedDB. They are not available to the native Android app.
- Android Telecom registration is only capability registration. It does not create an incoming call or bridge to WebRTC. The new Android Keystore helper is local key storage/signing groundwork only; no device is enrolled or trusted by creating this key.
- Therefore the existing browser identity and the Android installation must NOT be treated as the same device identity without a deliberate authenticated linking ceremony.

## 2. Required identity model

Use two distinct key roles; never export either private key:

1. **E-ZERO account/root identity:** existing browser-origin P-256 identity. It remains the authority that explicitly approves a new Android installation.
2. **Android installation identity:** a new P-256 signing key generated and retained by Android Keystore (non-exportable). The public SPKI and SHA-256 fingerprint may be registered.

The server-side device record must bind:
- root identity fingerprint;
- Android installation fingerprint and public SPKI;
- FCM registration token (server-side only; never logged or exposed to other clients);
- creation time, last token refresh time, expiry/revocation state;
- a bounded, non-sensitive device label if the user chooses one.

Do not silently copy a browser private key into Android storage, reuse a fingerprint for a different key, or trust a device merely because it knows an FCM token.

## 3. Enrollment protocol (must be implemented before token registration)

1. Android generates its non-exportable signing key using `AndroidInstallationIdentity.getOrCreatePublicIdentity()` and can sign bounded canonical challenge bytes with `sign(...)`. The helper exposes only public SPKI Base64 and its SHA-256 fingerprint. This local primitive is not yet called by the app UI or network layer. Obtain an FCM token only after Firebase configuration is present.
2. Android requests a short-lived enrollment challenge from the isolated backend using its public key and proof-of-possession signature.
3. The existing trusted browser identity displays a one-time QR/code (target lifetime 90 seconds). The browser signs an explicit approval statement binding the exact Android public-key fingerprint, challenge nonce, intended root identity, and expiry.
4. Backend verifies both proofs, one-time nonce, origin/audience, expiry and replay state; it then creates the device binding. The browser must show the user which device was approved.
5. Revocation by the root identity immediately invalidates the device binding and prevents future push delivery.

No enrollment based only on a caller-supplied fingerprint, display name, FCM token, or unsigned deep link is acceptable. A device must not be auto-trusted merely because it is logged into the same Google account.

## 4. Device registration and token refresh

- Proposed API shape (names are provisional, not live endpoints):
  - `POST /v1/android/enrollment/challenge`
  - `POST /v1/android/enrollment/complete`
  - `PUT /v1/android/devices/current/push-token`
  - `DELETE /v1/android/devices/current`
- Every mutation must be authenticated with the Android installation key and bound to an active root-approved enrollment.
- Token refresh is idempotent and replaces only the token for the authenticated installation.
- Reject expired/revoked installations, malformed tokens, oversized bodies, wrong audience, replayed nonces, and unknown key fingerprints.
- Never put FCM tokens, authorization secrets, private keys, invite URLs, SDP, media, messages, photos, or recordings in logs.
- Server-side FCM credentials belong only in an isolated secret store (for example, a dedicated staging Worker secret or sender service), never in Git, APK assets, browser JavaScript, or FCM payloads.
- Store only the minimum data needed for delivery; protect the FCM token at rest and support explicit device revocation/deletion.

## 5. Incoming-call wake-up contract

The caller must first pass the existing signed-identity and saved-friend authorization checks. The backend must then check recipient enrollment, expiry, replay, per-caller cooldown, per-device rate limits, and revocation before sending a data-only high-priority FCM message.

The Android payload allowlist is deliberately small:
- `wake_v`: protocol version;
- `call_id`: opaque, random call reference;
- `mode`: `AUDIO` or `VIDEO`;
- `expires_at`: Unix epoch milliseconds, no more than 120 seconds ahead;
- `nonce`: one-time random wake-up nonce;
- `server_sig`: signature over a canonical encoding of the preceding fields.

The Android host must verify `server_sig` with a pinned staging public key before showing an actionable call alert. Key rotation needs an explicit versioned overlap plan. Unknown fields are ignored; caller-supplied aliases are never displayed. Resolve caller name/photo only from authenticated invite identity plus the local trusted-contact record.

After the wake-up, Android must fetch/consume the matching short-lived signed invite through an authenticated endpoint before Accept can proceed. A push notification alone is not proof of a valid call.

## 6. Accept, Reject, cancel, and timeout

- **Accept:** explicit user action only. Revalidate the invite, root/device binding, saved-friend trust, expiry and replay state; then hand off to the existing signed WebRTC invitation flow. Do not modify or replace the working WebRTC engine.
- **Reject:** revoke/consume the pending invite server-side and stop the local alert/ringtone.
- **Caller cancel / trust revocation / timeout:** deliver a best-effort cancellation event, clear local notification/ringtone, and make the invite unusable on the next validation.
- Duplicate, delayed, expired, or replayed wake-ups must not resurrect a dismissed call.
- No auto-answer. No claim of connected media until the existing WebRTC layer reports a real authenticated connection.

## 7. Required isolated test gates

Automated backend/client contract tests must cover:
- root approval required; unapproved Android key rejected;
- key possession, wrong-key and wrong-root rejection;
- enrollment nonce replay, expiry, wrong audience and signature tampering;
- FCM token rotation, duplicate refresh, token secrecy in logs, and device revocation;
- saved-friend trust, caller signature, replay, cooldown and rate limiting;
- invalid server signature, altered payload, unknown version, expired wake-up and duplicate call ID;
- no caller alias accepted from FCM;
- Accept revalidates the signed invite; Reject/cancel/revocation/timeout invalidate it;
- no sensitive call content in push payload or persistent storage.

## 8. Physical acceptance gate

On at least two physical Android devices, test foreground, background, screen locked, app swiped away, notification permission denied, channel muted, battery optimization, network loss, caller cancellation, reject, accept, timeout, and force-stop.

Record device model, Android version, app build SHA, permission state, network state and exact outcome. Do not infer audible ringing from a successful CI build. Android force-stop, denied notifications, offline state, OEM restrictions, and Android 14+ full-screen-intent policy may prevent delivery or lock-screen presentation; document observed behavior, never promise an unconditional ring.

## 9. Explicit non-goals / release guard

This specification does not authorize or perform Firebase project changes, secret creation, Worker deployment, public-site changes, production changes, app-store publication, or release signing. Those remain separate gates. Until root-approved enrollment, backend sender, signed wake verification, invite handoff and physical acceptance all pass, status remains **NOT ACTIVE / NOT VERIFIED**. The Android Keystore key helper alone does not change that status.
