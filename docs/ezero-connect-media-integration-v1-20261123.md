# E-ZERO Connect — saved-friend media integration V1

Status: design and implementation gate; not enabled in the public/staging app yet.

## Baseline that must remain unchanged
- Keep the current QR identity and automatic encrypted local trusted-contact save flow.
- Keep the current signed P-256 device identity and origin-bound signaling handshake.
- Do not change the current QR format, 90-second one-use invite semantics, encrypted IndexedDB contact vault, or the existing production site.
- Do not enable audio/video buttons until the end-to-end tests pass.

## Phase A — foreground audio/video calling between saved friends
1. A user taps Audio or Video for a locally stored TRUSTED contact. No new QR scan is requested.
2. The caller creates a fresh, short-lived signed call-room invitation. It is routed to the selected friend's fingerprint through the isolated Trusted Friends inbox service; it is not placed in a public directory.
3. The receiver sees an incoming call card showing only a locally verified friend's identity and explicit Accept / Decline controls. No camera or microphone is opened before the user accepts or initiates the call.
4. On acceptance, both devices join the short-lived signaling room using the existing signed device-identity handshake.
5. The signaling service relays only bounded call control, SDP and ICE messages. It must not store media, SDP, chat bodies, voice notes or images.
6. The WebRTC peer connection must bind the remote identity to the expected saved fingerprint. UI may say Connected only after authenticated signaling and a real RTCPeerConnection connection state.
7. Hangup, decline, timeout, blocked contact, revoked contact, invalid signature, unexpected fingerprint, and network loss must fail closed and release local media tracks.

## Phase B — private in-call communication
- Text messages: WebRTC DataChannel only, bounded UTF-8 payloads, local-only display history unless the user explicitly enables local retention.
- Voice notes: user-initiated recording, visible recording state, explicit stop/send, bounded size and duration, sent over the authenticated DataChannel. Never record a call in the background.
- Images: explicit file selection and send, bounded MIME/type/size, chunked DataChannel transfer with integrity hash; reject executable or unsupported files.
- No server-side message, voice, image or call recording/storage. No false delivered/read claims.

## Phase C — Android incoming-call behavior
- Browser foreground ringing is not equivalent to app-closed or screen-off ringing.
- Native Android push delivery, notification channel, ringtone, Accept/Decline action and full-screen incoming-call UI are a separate release gate.
- Do not claim background ringing until a physical Android test passes with the app page closed and screen off, on Wi-Fi and mobile data, including denied/revoked notification permissions.

## Required automated gates
- Saved contact selection uses only encrypted local TRUSTED records; BLOCKED/REVOKED contacts cannot be called.
- Two synthetic device identities: direct invite delivery, accept, decline, busy, timeout, reconnect, hangup and stale invite rejection.
- Signature, fingerprint, room/role binding, origin, expiry, replay and message-size validation.
- Playwright two-browser test with fake media: audio track negotiation, video track negotiation, DataChannel open/close and no media capture before consent.
- Chat/voice/image payload limits, malformed payload rejection, transfer integrity and no server persistence.
- No legacy approval UI or manual copy/paste signaling reintroduced.
- CI PASS is not physical-device PASS. Keep the real two-phone gate explicit.

## Release gates
- Phase A may be enabled only after all automated gates and a real two-phone audio/video test pass.
- Phase B may be enabled only after DataChannel and payload-integrity tests pass.
- Phase C may be enabled only after native APK and screen-off/background physical tests pass.
- Merge to the shared staging branch and allow the isolated Render staging site to auto-deploy only after the relevant gate passes. Production remains untouched.

## Integration inspection — 2026-11-23 (before implementation)

The current clean-app signaling Worker is an invite-created, one-host/one-guest room with a maximum 10-minute lifetime. Its message allowlist already recognizes call control, SDP and ICE, but that does **not** provide a durable addressable inbox for a previously saved friend. A direct saved-friend call therefore cannot be implemented by simply enabling the disabled buttons or sending `call-invite` through an arbitrary room.

The older foreground inbox prototype is not reusable as-is:
- it reads a legacy `localStorage` fingerprint/name list rather than the current AES-GCM IndexedDB trust vault;
- it depends on the legacy `EZERO_DEVICE_IDENTITY_STORE`, not `EZERO_CONNECT_IDENTITY`;
- its fixed GitHub Pages origin and old call-page URL do not match this isolated Render staging origin;
- it assumes a browser tab remains open and is not proof of native background push/ringing.

The current trust API exposes a safe contact listing and `canReconnect(fingerprint)`, but deliberately does not expose the saved peer SPKI key through a narrow call-authentication lookup. A media adapter must not trust a fingerprint-only target or display name. Before implementation, add a reviewed, read-only trust-vault method that returns the peer public SPKI and relationship ID only for a locally TRUSTED contact, and returns nothing for BLOCKED/REVOKED contacts. This is an additive API change and must be covered by the frozen QR regression guard.

### Required isolated inbox protocol

- One stable inbox address per device fingerprint, with no public contact directory or discoverability endpoint.
- The owner opens a foreground WebSocket and proves possession of its P-256 private key by signing a fresh, origin-bound challenge. The Worker derives and verifies the fingerprint from the SPKI.
- The caller signs a short-lived call invitation bound to caller fingerprint, recipient fingerprint, relationship ID, call ID, mode, expiry and staging origin. Both sides independently verify the other device against their local TRUSTED vault record.
- The Worker routes only bounded call-control envelopes to an already connected recipient socket; it must not persist call payloads or keep SDP/ICE/media/chat content in Durable Object storage.
- Receiver explicitly accepts or declines. Acceptance creates a fresh ephemeral signaling room; the existing signed room handshake then binds WebRTC to the expected saved fingerprint.
- If recipient inbox is offline, show unavailable; do not claim delivered, ring, or queue an invite. Native push is a separate Phase C implementation and test gate.
- Rate-limit inbox connections and call attempts; reject replay, duplicate call IDs, self-call, blocked/revoked contacts, expired invitations, wrong origin and oversized messages. Close both sides on decline, hangup, timeout or revocation.

No QR/pairing, identity, vault, current app-shell or production files were changed during this inspection. This section records blockers and the safe implementation sequence; it is not a claim that direct calling is implemented.
