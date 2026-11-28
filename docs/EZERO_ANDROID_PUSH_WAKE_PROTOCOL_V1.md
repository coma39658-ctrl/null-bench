# E-ZERO Android incoming-call push — V1 staging contract

Status: design contract only. NOT IMPLEMENTED, NOT DEPLOYED, and not a claim of incoming-call delivery.

This contract closes the gap between the Android FCM receiver and the current browser-only signaling worker. Keep the existing signaling Worker unchanged. Implement the push gateway as a separate isolated service/Worker and keep all feature flags OFF until the release gates below pass.

## Current verified boundary

- Android accepts only data-only FCM messages and requires an ECDSA server signature before parsing or displaying a call alert.
- The signed canonical message is exactly UTF-8:
  `EZERO_CALL_WAKE_V1\nwake_v=<wake_v>\ncall_id=<call_id>\nmode=<mode>\nexpires_at=<expires_at>\nnonce=<nonce>\n`
- Android uses SHA256withECDSA; the signature bytes are ASN.1 DER ECDSA, base64url encoded without padding in `server_sig`.
- Required wake fields: `wake_v=1`, `call_id`, `mode=AUDIO|VIDEO`, `expires_at` (Unix epoch milliseconds), `nonce` (16–128 URL-safe characters), and `server_sig`.
- Caller alias, photo, friend name, SDP, media, message text, and any user secrets MUST NOT be trusted from or included in the push payload. The app resolves the verified friend locally after authenticating the invitation.
- Android's local replay guard is defense in depth only. Server-side one-time invitation/nonce consumption is mandatory.
- The existing `signaling/cloudflare/src/worker.js` is WebRTC signaling only. Do not add push behavior to it or repurpose its public WebSocket route.

## Required trust chain

1. A person/device must already have an authenticated E-ZERO identity. A QR fingerprint alone is a public identifier, not proof that the requester owns the profile.
2. Bind the Android installation's P-256 public key to that authenticated identity through an explicit, signed, short-lived challenge. The server verifies proof of possession; the private key remains in Android Keystore.
3. Bind the FCM registration token to that enrolled installation only after the identity and device proof both pass. Token rotation replaces the prior token for that installation. Revoke/unlink removes the token and invalidates pending invitations.
4. Accept a call-wake request only from an authenticated caller whose identity is currently a saved, mutually approved friend of the recipient. Require explicit recipient acceptance in the Android call UI; never auto-answer.
5. The gateway creates a random call ID and nonce, expiry no more than 120 seconds ahead, stores a one-time server-side replay record, signs the exact canonical bytes above with a dedicated staging ECDSA P-256 private key, and sends FCM data-only high-priority payload.
6. Android verifies the pinned staging public key, expiry, mode, call ID, and nonce; consumes its local replay guard; then shows the incoming-call UI. The UI must show Accept and Decline, and only Accept starts microphone/camera after required runtime permission and user action.

## Proposed isolated API (not live)

- `POST /v1/push/device-challenge`: authenticated session requests a one-use challenge bound to account ID, installation ID, and expected public-key fingerprint. Short expiry; rate limited.
- `POST /v1/push/device-enroll`: submits challenge, SPKI public key, and installation-key signature. Server verifies challenge, origin/audience, expiry, account binding, and proof of possession before saving the installation.
- `POST /v1/push/device-token`: authenticated enrolled installation updates its FCM token; token never appears in logs or responses. Enforce size/format bounds and rate limits.
- `POST /v1/push/device-revoke`: authenticated owner revokes one installation and invalidates its pending wake records.
- `POST /v1/push/call-wake`: authenticated caller requests a wake for a currently trusted recipient. Server—not caller—chooses call ID, nonce, mode allowlist, expiry, signature, and destination token.

All routes require TLS, strict JSON schemas, bounded bodies, authentication, authorization, per-identity and per-IP rate limits, no-store responses, and generic error messages. Never accept a destination FCM token, caller alias, expiry, nonce, or server signature as caller-controlled authority.

## Storage and key handling

- Store only the minimum installation mapping, encrypted FCM token, verified identity binding, revocation state, and short-lived one-time call-wake records.
- Encrypt FCM tokens with a dedicated server-side encryption key; keep that key, Firebase service-account credential, and ECDSA signing private key in server secrets only. Never commit them, return them, or print them in CI logs.
- Use a dedicated Firebase staging project/app and least-privilege service account. Use OAuth2 to call the FCM HTTP v1 API; do not use legacy server keys.
- Keep signing and token-encryption keys separate. Publish only the reviewed staging ECDSA public SPKI key to Android. Key rotation requires an overlap plan and a new reviewed Android build.
- Server-side replay consumption must be atomic. A duplicate call ID or nonce must never produce a second accepted wake. Retain records through expiry plus a bounded safety margin.
- Do not store audio, video, SDP, chat, contact photos, or message content in the push service.

## Required tests before a physical build

- Valid device enrollment; wrong account, wrong key, altered challenge, expired challenge, reused challenge, revoked installation, and token rotation.
- Reject untrusted/non-mutual callers, unknown recipient, malformed payload, oversized body, unsupported mode, expiry over 120 seconds, invalid signature, duplicate nonce, duplicate call ID, and replay after worker restart.
- Confirm no token, private key, alias, or personal data appears in logs, error responses, analytics, or public repository.
- FCM sender handles invalid/unregistered tokens by revoking stale token; transient failures are bounded and never create an unbounded retry loop.
- Android tests verify the same canonical bytes and DER signature format as the server implementation.
- Verify notification channel, Android 13+ notification permission, full-screen intent/CallStyle policy and permission behavior, lock-screen visibility, and explicit Accept/Decline on supported Android versions.

## Release gates

1. Protocol and threat-model review.
2. Isolated staging gateway implementation with automated unit/integration tests.
3. Secrets provisioned by an authorized owner directly in the staging provider; never request secrets in chat.
4. CI green, no secret leakage, server public-key fingerprint independently reviewed and pinned.
5. Two physical Android phones: app foreground, background, screen locked, Wi-Fi, cellular, battery saver, notification permission denied/granted, expired invite, duplicate invite, decline, and revoke.
6. Record each result as PASS / FAIL / PARTIAL / UNKNOWN. FCM is best-effort; do not promise delivery after force-stop, network loss, OEM battery restrictions, or OS policy blocks.
7. Keep production feature flag OFF until all applicable gates pass and the user explicitly authorizes release.

## Explicit non-goals

No silent microphone/camera activation, no auto-answer, no background polling, no scraping of contacts, no arbitrary caller-provided display identity, no public Firebase credentials, no production deployment from this staging branch.
