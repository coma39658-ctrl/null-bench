# E-ZERO Push Phase B — staging contract

This branch contains an isolated Web Push envelope validator, a root service-worker push/click handler, and deterministic tests. The service-worker handler is passive until a subscription receives a push; it does not register itself, request permission, create subscriptions, or send pushes.

## Verified implementation

- The accepted envelope contains exactly `v`, `type`, `requestId`, `issuedAt`, `expiresAt`, and `mode`.
- Request lifetime is at most 90 seconds. SDP, ICE, media, contact data, message text, caller identity, and secrets are not accepted.
- A valid push can show only a generic “Incoming call request” notification.
- Notification click can focus/open a page and send an `EZERO_INCOMING_CALL_WAKEUP` message. It never accepts a call, enables microphone/camera, or starts WebRTC.
- Contract and mocked service-worker tests are included in CI.

## Important integration boundary

The current `service-worker.js` is at the repository root and is also the existing Null Bench PWA service worker. The E-ZERO Connect page is on that same origin/root scope. Registering a second root-scoped worker or blindly registering this shared worker from the Connect page could replace or interfere with the existing PWA worker and its cache behavior.

Therefore the app does **not** register a service worker yet, and the page does **not** consume the wake-up message yet. Before wiring either side, isolate E-ZERO Connect onto a dedicated origin or a dedicated sub-path with its own correctly scoped service worker. Do not broaden cache scope or alter the existing Null Bench PWA routing as a shortcut.

## Not implemented / not verified

- User-gesture-only notification permission and PushSubscription registration.
- Authenticated subscription ownership tied to a verified, saved friend/device identity.
- Server-side push delivery with VAPID private key held only in staging secrets.
- A live signed-request lookup and expiry/revocation validation after app wake-up.
- Native Android FCM delivery for the installed Android Host app.
- Real-device background/locked-screen/browser-closed delivery and ringtone behavior.

The existing WebRTC calling path remains unchanged and must stay frozen.

## Consent and call flow

A push is only a wake-up hint. It never accepts a call, enables microphone/camera, or establishes a WebRTC session. The recipient must open E-ZERO, validate the live signed request and recipient binding, then explicitly accept. Expired or revoked requests must be shown as expired/missed.

## Next gated work

1. Choose and implement an isolated E-ZERO Connect hosting/service-worker scope without disturbing the existing PWA.
2. Add user-gesture-only notification permission and subscription registration on that isolated scope.
3. Implement authenticated server-side delivery with VAPID private key held only in the staging secret store; bind each subscription to a verified recipient device.
4. Connect wake-up to a live signed-request fetch/validation path; reject replay, expiry, revocation, spoofing and unauthorized recipients.
5. Add rate-limit and no-sensitive-payload tests.
6. Test on two real Android phones: foreground, background, locked screen, browser closed, denied permission, DND and offline.
7. Separately verify native Android FCM if the installed Android Host is expected to ring independently of its browser page.
8. Do not merge or deploy until all automated and real-device gates pass.

A powered-off or offline phone cannot receive a live incoming-call push. Android battery restrictions, notification permission and DND can also affect delivery.

## Signaling backend audit (2026-11-25)

The existing `signaling/ezero-connect-v1/worker.mjs` accepts WebSocket-upgrade requests for room/rendezvous signaling and rejects ordinary HTTP requests. Its configured origin guard is not a push authorization mechanism. The accompanying README states that the Worker has not been deployed and that a real staging deployment requires an isolated origin and dedicated Durable Object namespace.

No authenticated push-subscription registry, VAPID delivery endpoint, recipient-device binding, or live signed-call-request lookup exists in this Worker today. Do not add a public POST push route to the WebSocket signaling handler. Implement push as a separately authenticated service or a separately reviewed route with explicit subscription ownership, sender proof, replay protection, rate limits and server-only VAPID secrets.

Render account inspection found existing E-ZERO static preview sites, but no currently listed dedicated push-delivery web service. Existing previews must not be repurposed or have their branch/deploy settings changed as a shortcut.
