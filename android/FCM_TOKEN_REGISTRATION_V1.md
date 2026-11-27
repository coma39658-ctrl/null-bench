# E-ZERO Android FCM token registration V1

Status: **STAGING CODE ONLY — NOT DEPLOYED, NOT CONNECTED TO FIREBASE**

The isolated enrollment candidate now contains `PUT /v1/android/devices/current/push-token`. This endpoint accepts a token only from a root-approved, active Android installation whose request is signed by that installation's enrolled P-256 key. The token is encrypted with AES-256-GCM before it is persisted in the enrollment Durable Object.

## Request contract

JSON body fields:

- `device_fp`: lowercase SHA-256 fingerprint of the Android installation SPKI (64 hex chars).
- `issued_at`: decimal Unix epoch milliseconds, within ±120 seconds of server time.
- `nonce`: cryptographically random Base64URL value, 16–128 characters.
- `fcm_token`: FCM registration token, 20–4096 characters. Never log or return it.
- `device_signature`: Base64URL without padding of the DER ECDSA signature from Android `SHA256withECDSA`.

The installation signs these exact UTF-8 bytes (LF after every line, including the final line):

```text
EZERO_ANDROID_PUSH_TOKEN_V1
device_fp=<device_fp>
issued_at=<issued_at>
nonce=<nonce>
token_sha256=<lowercase SHA-256 hex of fcm_token>
```

The server converts the DER signature to WebCrypto P1363 and verifies it against the SPKI stored at enrollment. It independently recomputes the token hash; the caller cannot choose the hash.

## Server gates and storage

- The device must be active and its root identity must still be active.
- Timestamp skew is limited to 120 seconds.
- Nonces are atomically consumed per device; the bounded replay window retains at most 128 recent nonces.
- A duplicate nonce is rejected with 409.
- Token registration is rate-limited by the candidate Worker's existing per-IP fixed-window limit.
- Missing `TOKEN_ENCRYPTION_KEY_BASE64URL` fails closed with 503.
- The secret must be a random 32-byte AES key encoded as unpadded Base64URL and provisioned only in the isolated staging Worker secret store. Never commit it or put it in an APK.
- AES-256-GCM uses a fresh 96-bit IV and device-fingerprint-bound additional authenticated data. Only ciphertext, token hash, update time, expiry and active state are persisted.
- Tokens expire after 90 days unless refreshed. Revoking the enrolled device or its root blocks future registration.

## Not yet implemented

- Android `FirebaseMessagingService.onNewToken` now calls the authenticated registration client. After Worker-confirmed enrollment, the app requests the current FCM token and attempts registration using the non-exportable Android Keystore key; exact LF-delimited signing bytes have a unit test.
- No FCM sender exists; no service-account credential is configured, and no `google-services.json`/Firebase runtime configuration has been provisioned in this branch.
- No signed call-wake public key is pinned in Android.
- No signed invite fetch / Accept-to-WebRTC handoff is wired.
- No Worker deployment or physical-device token-registration test has occurred; the staging encryption secret is not provisioned.

Therefore this endpoint alone does **not** enable incoming ringing. Keep this branch isolated and draft until the Android client, sender, key ceremony, live staging deployment, and two-device physical acceptance tests all pass.
