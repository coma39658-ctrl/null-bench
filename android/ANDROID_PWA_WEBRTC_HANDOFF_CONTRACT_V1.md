# E-ZERO Android ↔ existing PWA WebRTC call handoff V1

Status: **STAGING DESIGN CONTRACT — NOT IMPLEMENTED / NOT ACTIVE**

## Decision

Keep the existing browser WebRTC engine in `js/ezero_connect_media_v1.js` as the only media engine. Do not add a second native WebRTC stack and do not rewrite the already-tested browser audio/video path.

The Android application is currently a native enrollment host. It does not embed the PWA, does not expose the media manager, and its Accept action currently opens `MainActivity` with a placeholder status. This document defines the secure integration boundary before implementation.

## Required end-to-end flow

1. **Caller authorization:** the signaling backend authenticates the caller's device key and proves a server-authoritative, mutually approved, non-revoked relationship to the recipient fingerprint. A caller-supplied `relationshipId` alone is not authorization.
2. **Pending invite:** backend verifies the caller-signed `EZERO-CALL1.` invite, binds it to the recipient's root-approved Android installation, stores it in a short-lived recipient queue, and atomically enforces call-ID/nonce replay protection, expiry, busy state, and rate limits.
3. **Wake:** backend sends only a data-only, server-signed FCM wake containing `wake_v`, opaque `call_id`, `mode`, `expires_at`, `nonce`, and `server_sig`. No name, invite URL, SDP, ICE, chat content, or bearer secret is allowed in FCM.
4. **Native verification and ringing:** Android verifies the exact signed wake against a pinned public key and persistent replay guard before showing the CallStyle notification. Caller display name is obtained only from the locally verified saved-friend record; never trust push-supplied aliases.
5. **Accept:** the native Accept action launches the app and requests the pending invite over an authenticated HTTPS endpoint. The endpoint authenticates the enrolled installation with a device-key proof, checks call ID, expiry, recipient binding and one-time consumption, then returns the short-lived caller-signed invite. Reject/cancel/timeout consumes or revokes the same pending call.
6. **Origin-bound handoff:** Android loads only the exact canonical HTTPS PWA origin in a dedicated WebView activity. No permissive JavaScript interface, arbitrary navigation, mixed content, file access, or untrusted origin is allowed. The invite is delivered through an origin-targeted WebMessageChannel after the page declares readiness; never place invite material in a URL, clipboard, logs, or generic exported intent.
7. **Existing engine verification:** PWA verifies the invite with `EZERO_CONNECT_SAVED_CALLS.verifyIncomingCallInvite`, checks the local saved-friend relationship and recipient identity, then uses the existing `EZERO_CONNECT_MEDIA` manager and current authenticated signaling protocol. Microphone/camera permissions remain user/system controlled. The WebRTC engine and its peer handshake are not bypassed.
8. **Accept semantics:** one deliberate Accept action must be sufficient. After native Accept and successful invite handoff, the PWA may accept the verified pending call once; it must not show a second Accept prompt. Duplicate, stale, replayed, mismatched, or already-consumed invites fail closed.
9. **Return path:** in-call status, remote media, hangup, and call completion are surfaced by the existing PWA UI. Android foreground service/Telecom integration is a separate reviewed stage; it must not claim call continuity when the WebView is destroyed.

## WebView security boundary

- Exact origin allowlist: the canonical E-ZERO Connect HTTPS origin only; no wildcard subdomains.
- TLS required; block cleartext, mixed content, external redirects, unknown schemes, and untrusted popups.
- Do not expose a broad `addJavascriptInterface`. Prefer origin-targeted `WebMessagePort` / `postWebMessage` with a strict, versioned message schema and one-time correlation ID.
- Native-to-page message contains only the fetched short-lived invite and opaque call ID; it contains no device private key, FCM token, OAuth token, service-account material, or root secret.
- Page-to-native messages are limited to readiness, validated call lifecycle events, and user-initiated permission requests. Validate origin, message size, schema, state transition, and call ID.
- Keep media permissions explicit and scoped to the trusted origin. No automatic camera/microphone grant.
- If WebView/PWA load fails, do not report the call connected; preserve a clear fallback status and allow the caller's invite to expire safely.

## Backend work still required

- Server-authoritative two-party friendship registry, with both signatures over the same canonical transcript, bound to fingerprints and revocation state.
- Authenticated invite creation/validation and one-time recipient fetch endpoint.
- Durable short-lived pending-call queue that wakes a recipient even when no WebSocket is connected; deliver the invite to the authenticated inbox after app reconnects.
- FCM sender integration with enrolled Android installation records and current encrypted token; secrets live only in isolated staging secret storage.
- Atomic replay, expiry, busy, cancellation, rate-limit, and cleanup behavior.
- Active Worker entrypoint wiring and isolated staging deployment only after contract tests pass.

## Required tests before physical-device test

- WebView origin allowlist, redirect, mixed-content, unsafe-scheme, and JavaScript-bridge negative tests.
- Device-proof authorization and recipient-bound one-time invite fetch tests.
- Mutually approved relationship, revoked/blocked friend, mismatched fingerprint, wrong device, replay, expiry, duplicate Accept, and cancellation tests.
- Offline recipient queue -> signed FCM wake -> app resume -> one-time fetch -> WebSocket delivery tests.
- Existing browser WebRTC regression suite remains green; add tests for push-originated incoming call using the same manager without bypassing peer verification.
- APK build and artifact retrieval must both succeed before asking the user to install.

## Release gates

No production merge, public website change, or active Worker route is authorized by this design document. Do not mark FCM ringing, lock-screen presentation, or Android Accept-to-WebRTC as PASS until a real two-device test confirms them. Test foreground, background, locked screen, swiped-away app, notification/full-screen permission, battery restrictions, and the device's OEM behavior separately. Android force-stop may prevent FCM delivery and must be reported as a platform limitation, not hidden.

## Current evidence snapshot

- Existing JS WebRTC engine is present and has prior two-device staging success; preserve it.
- Android native host currently has no WebView/WebRTC integration.
- Android signed-wake verification and persistent replay guard are in the isolated staging PR #233; public-key pin and live sender are not activated.
- FCM sender helper is isolated and not routed/deployed.
- Existing inbox Worker routes only to currently connected WebSockets; it does not queue offline invites.
- No active Firebase sender, pending invite fetch route, authoritative server friendship registry, or physical Android background-ringing evidence is established.
