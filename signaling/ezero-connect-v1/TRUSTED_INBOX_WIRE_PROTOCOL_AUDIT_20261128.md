# Trusted Inbox wire-protocol compatibility audit — 2026-11-28

## Status

Source review of the current browser client and isolated Worker shows that the foreground handshake and saved-call message shapes are now substantially aligned. A cross-component test in the staging test branch exercises the browser-generated signed hello against the real Worker class and verifies the authenticated ready frame in both directions.

This is source/test evidence only. No Worker deployment is verified, the foreground inbox must remain fail-closed, and no physical two-device or Android background-ringing result is established.

## Current source-level alignment

| Area | Current browser client | Current Worker | Assessment |
|---|---|---|---|
| WebSocket route | `/v1/inbox/{uppercase-colon-fingerprint}` | Same route family; validates uppercase colon-delimited SHA-256 fingerprint | ALIGNED IN SOURCE |
| Challenge | Parses `type:"challenge"` and the versioned payload | Emits the same versioned payload | ALIGNED IN SOURCE |
| Challenge entropy | Requires 43-character base64url encoding of 32 bytes | Generates 32 random bytes and base64url-encodes them | ALIGNED IN SOURCE |
| Signed hello | Sends `type:"hello"`, fingerprint, SPKI and signature | Strictly parses those exact fields | ALIGNED IN SOURCE |
| Signed transcript | Signs canonical JSON containing protocol, origin, identity fingerprint, inbox fingerprint, challenge and expiry | Verifies the same canonical JSON fields | CROSS-COMPONENT TEST ADDED |
| Fingerprint | Uppercase colon-delimited SHA-256 representation | Computes and validates the same representation | ALIGNED IN SOURCE |
| Ready | Requires `type:"inbox-ready"` and matching local fingerprint | Emits `type:"inbox-ready"` with authenticated fingerprint | CROSS-COMPONENT TEST ADDED |
| Call invite | Sends `type:"call-invite"` with opaque `EZERO-CALL1.` code | Verifies signature, expiry, replay and saved-friend authorization before routing | SHAPE ALIGNED; negative/security coverage remains |
| Call response | Sends `type:"call-response"` with call ID and explicit accept/decline | Validates pending peer/call state and relays explicit decision | SHAPE ALIGNED IN SOURCE |
| Room handoff | Sends `type:"call-room-invite"` with opaque `EZERO1.` code after explicit acceptance | Relays opaque room invite only for the accepted active call | SHAPE ALIGNED IN SOURCE |
| Cancellation | Sends `type:"call-cancel"` | Handles pending/active call cancellation | SHAPE ALIGNED IN SOURCE |

## Remaining gaps and unsupported behavior

1. No client/Worker trust or untrust message API is part of this inbox v1. Friendship authorization must continue to come from the authoritative saved-friend registry; do not add a socket shortcut.
2. No delivery receipt semantics are implemented. A successful WebSocket send or `invite-routed` response must not be described as displayed, delivered to the user, ringing, or connected.
3. Error/status events are emitted as Worker `type` frames and surfaced to the client event callback. A complete stable public error catalogue and UI mapping remain to be specified.
4. Additional shared negative vectors are still required for malformed routes, wrong origin/fingerprint, stale/future challenge, malformed or tampered signatures, unknown fields, replay, expired invite, unauthorized friendship, duplicate sockets, busy recipient, disconnect and cancellation races.
5. The exact deployed Worker, origin, route, Durable Object binding and protocol version have not been verified in a live deployment.

## Security and product constraints

- Keep the staging inbox disabled/fail-closed until deployment and runtime gates pass.
- Keep the existing QR/WebRTC signaling path separate and unchanged.
- Worker-side signed-invite verification and authoritative saved-friend authorization remain mandatory.
- Never auto-accept calls. Incoming-call presentation, explicit user acceptance, room-invite verification and media connection are separate states.
- Do not export private keys. Browser device keys remain non-extractable.
- Inbox remains foreground-only/volatile; do not store private keys, SDP, media, profile photos or message bodies.
- Foreground protocol tests do not establish Android push delivery or screen-off ringing. Those require separate FCM/Android implementation and physical locked-screen tests on two devices.

## Required release gates

- [x] Current source route, fingerprint, challenge, hello and ready shapes reviewed for alignment.
- [x] Add a cross-component browser-client-to-real-Worker signed-hello conformance test.
- [ ] Complete shared positive/negative vectors for call invite, response, room handoff, cancellation and error/status frames.
- [ ] Complete malformed-input, origin, replay, expiry, relationship, duplicate-socket, busy-recipient and disconnect tests.
- [ ] Verify volatile-only handling and absence of sensitive payload persistence.
- [ ] Verify exact staging deployment and live health/handshake evidence before enabling the inbox.
- [ ] Run two-device foreground calls while preserving the existing QR/WebRTC baseline.
- [ ] Separately implement and physically verify FCM/Android background and screen-off ringtone/Accept/Decline behavior.

## Explicit non-claims

This audit does not establish that the inbox is deployed, that saved-friend calls work on physical devices, that Android push ringing works, or that any physical two-device test has passed.
