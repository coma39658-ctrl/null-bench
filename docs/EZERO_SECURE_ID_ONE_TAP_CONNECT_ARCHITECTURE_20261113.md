# E-ZERO Secure ID + One-Tap Connect — architecture decision (2026-11-13)

Status: DESIGN APPROVED FOR STAGING IMPLEMENTATION; NOT LIVE OR SECURITY-AUDITED.
Do not replace or regress the proven two-phone WebRTC audio/video engine.

## User journey
1. One-time profile setup (name, photo, consent), unique non-enumerable account identifier, device-bound cryptographic identity and optional WebAuthn passkey.
2. Invite by short, expiring, single-use HTTPS link or searchable Secure ID (only opt-in discoverability). QR is optional, never mandatory.
3. Recipient explicitly accepts a signed friend request; both parties persist authenticated public-key identities and local display names.
4. From then on, tap saved friend -> Audio/Video -> signed call invite delivered to authenticated inbox -> recipient accepts -> existing WebRTC engine connects.
5. On key change, pause trusted status until user verifies; block/revoke and recovery supported.

## Backend contract
- One canonical HTTPS origin for identity and passkeys; origin changes require new credential enrollment/migration, not silent trust transfer.
- Signed, authenticated, replay-resistant short-lived friend requests and call invitations, with nonce, expiry, intended recipient and sender public-key binding.
- WebSocket signaling with verified delivery ACK and distinct statuses: QUEUED, DELIVERED, RINGING, ACCEPTED, CONNECTING, CONNECTED, FAILED, EXPIRED, REJECTED.
- A delivery ACK never means WebRTC CONNECTED. Connection proof comes from peer connection and media flow.
- Strict Origin/CORS and authorization; bounded rate limits; no private keys or TURN credentials in static bundles.
- STUN plus expiring TURN credentials; enforce resource limits and avoid unbounded retry loops.
- Push notifications only after explicit consent and platform capability checks; no claim of guaranteed background ringing.
- E2EE media via WebRTC DTLS-SRTP; independent application-level E2EE design/review for chat and stored voice notes.
- No server-side call recording; retention and metadata policies must be documented accurately.

## Staging acceptance gate
1. Server health + origin allowlist and authorized inbox handshake PASS.
2. One new friend request, verified acceptance and persistence on both devices PASS.
3. Saved-friend audio and video delivery + recipient acceptance + two-way media PASS.
4. Wrong identity, blocked sender, expired/replayed link and disconnected recipient fail safely.
5. Reconnect after reload without QR, key-change warning and fallback network path PASS.
6. Regression of frozen WebRTC baseline PASS.
Do not deploy or ask for repeated phone testing until the first two backend gates pass.
Keep staging and production isolated. Never mark source-only tests as live-call evidence.

## Primary standards
- W3C WebAuthn Level 3 (2026): https://www.w3.org/TR/webauthn-3/
- MDN WebRTC signaling: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
- MDN perfect negotiation: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
- MDN ICE/STUN/TURN: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Protocols
- Apple web push: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- Signal safety numbers: https://support.signal.org/hc/en-us/articles/360007060632-What-is-a-safety-number-and-why-do-I-see-that-it-changed
