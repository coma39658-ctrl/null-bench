# E-ZERO Push Phase B — staging contract

This branch adds only the first, isolated Web Push envelope contract and its unit tests. It does not register a service worker, request notification permission, create PushSubscriptions, send pushes, or change production.

## Envelope

Exactly these fields are accepted: `v`, `type`, `requestId`, `issuedAt`, `expiresAt`, and `mode`. The request lifetime is at most 90 seconds. Caller identity is intentionally omitted from the operating-system notification because it must be verified in the app before display. SDP, ICE, media, contact data, message text, and secrets are rejected as unknown fields.

## Consent and call flow

A push is only a wake-up hint. It never accepts a call, enables microphone/camera, or establishes a WebRTC session. The recipient must open E-ZERO, validate the live signed request, and explicitly accept. Expired requests must be shown as expired/missed.

## Next gated work

1. Wire the contract into the existing service worker without broadening cache scope or disturbing other PWA routes.
2. Add user-gesture-only notification permission and subscription registration.
3. Implement authenticated server-side delivery with VAPID private key held only in the staging secret store.
4. Add replay, expiry, revocation, spoofing, rate-limit and no-sensitive-payload tests.
5. Test on two real Android phones: foreground, background, locked screen, browser closed, denied permission, DND and offline.
6. Do not merge or deploy until all automated and real-device gates pass.
