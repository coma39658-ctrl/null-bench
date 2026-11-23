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
