# E-ZERO Trusted Inbox canonical wire contract — draft v1

Status: **STAGING CONTRACT DRAFT ONLY**. This document proposes one exact client/Worker contract for review. It does not enable the inbox, approve deployment, change the public site, or establish a physical-device result.

Contract owner decision required before implementation. Until then, keep `EZERO_TRUSTED_INBOX_CONFIG.enabled=false`.

## 1. Invariants

- Existing QR/WebRTC signaling remains a separate, frozen compatibility path.
- HTTPS page origin is exactly `https://coma39658-ctrl.github.io`; the Worker must compare the request Origin byte-for-byte with its configured `PUBLIC_ORIGIN`.
- All WebSocket frames are UTF-8 JSON objects. Unknown fields are rejected. No frame may contain private keys, SDP, ICE, media, chat bodies, profile photos, or long-lived credentials.
- Device identity is a P-256 key pair. The private key is non-extractable. The canonical fingerprint is uppercase hex with colon separators: 32 bytes, 95 characters, e.g. `AA:BB:...`.
- A successful WebSocket send means only “sent to socket”; it never means displayed, ringing, accepted, or connected.
- No auto-accept. User Accept is required before room-invite relay.
- Delivery, UI-rendered, ringing, accepted, room-invite-routed, and media-connected are distinct states.
- Foreground inbox does not provide background or screen-off wake. That requires a separate authenticated Android push design and physical tests.

## 2. Endpoint and identity

- Proposed Durable Object route: `/v1/inbox/{FINGERPRINT}`.
- `FINGERPRINT` is the uppercase colon-separated canonical fingerprint.
- The browser must not lowercase, strip separators, or otherwise normalize a value silently. Validate it against `^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$` before constructing the URL.
- Route mapping, Durable Object namespace and deployed Worker revision must be attested before the client flag can be enabled.

## 3. Challenge and signed hello

Worker sends exactly:

```json
{
  "type": "challenge",
  "payload": {
    "v": 1,
    "protocol": "E-ZERO-INBOX-HELLO-1",
    "origin": "https://coma39658-ctrl.github.io",
    "inboxFingerprint": "UPPERCASE:COLON:FINGERPRINT",
    "challenge": "base64url-encoded 32 random bytes (43 chars)",
    "challengeExpiresAt": 0
  }
}
```

- `challengeExpiresAt` is a Unix timestamp in milliseconds; challenge lifetime is at most 30 seconds.
- Client verifies exact version, protocol, origin, target fingerprint, nonce alphabet/length and expiry.
- Client signs UTF-8 bytes of the canonical JSON serialization of the following object (keys sorted lexicographically, no insignificant whitespace, strings encoded as JSON UTF-8):

```json
{
  "v": 1,
  "protocol": "E-ZERO-INBOX-HELLO-1",
  "origin": "https://coma39658-ctrl.github.io",
  "fingerprint": "CLIENT:UPPERCASE:COLON:FINGERPRINT",
  "inboxFingerprint": "TARGET:UPPERCASE:COLON:FINGERPRINT",
  "challenge": "EXACT_CHALLENGE_FROM_SERVER",
  "challengeExpiresAt": 0
}
```

Client sends exactly:

```json
{
  "type": "hello",
  "fingerprint": "CLIENT:UPPERCASE:COLON:FINGERPRINT",
  "publicKeySpki": "base64url-SPKI",
  "signature": "base64url-P256-ECDSA-SHA256-signature"
}
```

- Worker recomputes the fingerprint from SPKI, verifies the signature over the same canonical bytes, checks the pending challenge and rejects duplicate authenticated device sockets.
- The client role is local UI state only; it is not an authentication claim sent to the Worker.

Worker replies exactly:

```json
{
  "type": "inbox-ready",
  "fingerprint": "AUTHENTICATED:UPPERCASE:COLON:FINGERPRINT"
}
```

Client accepts ready only if the socket has completed the challenge/hello exchange and the fingerprint equals its own authenticated device fingerprint.

## 4. Saved-friend call invite

Caller sends exactly:

```json
{
  "type": "call-invite",
  "inviteCode": "EZERO-CALL1.BASE64URL_ENVELOPE"
}
```

The opaque invite envelope contains exactly `payload` and `signature`. Payload fields are exactly:

- `v` = 1
- `protocol` = `E-ZERO-SAVED-FRIEND-CALL-1`
- `origin`
- `callerFingerprint`
- `callerPublicKeySpki`
- `recipientFingerprint`
- `relationshipId`
- `callId`
- `nonce`
- `mode` = `audio` or `video`
- `issuedAt` and `expiresAt` in Unix milliseconds

The caller signs canonical JSON bytes of the complete payload. Worker validates strict fields, signature, caller-key fingerprint, origin, recipient, 30-second maximum lifetime, replay nonce/call ID, and server-authoritative active friendship before routing. The local saved-contact list alone is never authorization.

Worker sends recipient exactly:

```json
{ "type": "incoming-call", "inviteCode": "EZERO-CALL1.BASE64URL_ENVELOPE" }
```

Worker sends caller one of the documented status frames: `invite-routed`, `unavailable`, `busy`, `replay-rejected`, or `friendship-not-authorized`. These are routing outcomes only, not display or ringing receipts.

## 5. Explicit response and room handoff

Recipient sends exactly:

```json
{ "type": "call-response", "callId": "32-character-call-id", "decision": "accept" }
```

or the same frame with `decision` = `decline`.

- Worker accepts a response only from the authenticated recipient socket bound to that pending call and before expiry.
- Decline clears pending state and does not relay a room invite.
- Accept changes both sockets to the accepted-call state; it does not mean media is connected.

After Accept, caller sends exactly:

```json
{
  "type": "call-room-invite",
  "callId": "32-character-call-id",
  "inviteCode": "EZERO1.SHORT_LIVED_SIGNED_ROOM_INVITE"
}
```

Worker treats the room invite as opaque and relays it only to the matching accepted peer. Recipient independently verifies signature, origin, expiry, caller fingerprint and room parameters before joining WebRTC. Only the WebRTC engine may report media-connected.

## 6. Cancellation and connection loss

- Cancel frame: `{"type":"call-cancel","callId":"..."}`.
- Cancellation clears matching pending/accepted state on both sockets.
- Socket close is offline/disconnected, never connected.
- A new connection requires a fresh challenge and proof; do not reuse a previous challenge or invite.

## 7. Intentionally unsupported in v1

- Client `trust` / `untrust` frames: unsupported until a separate server-authoritative dual-consent relationship protocol is implemented and tested.
- `received` / UI-rendered receipt: unsupported until the Worker defines an authenticated, replay-safe receipt contract. A socket send is not a display receipt.
- Push/FCM, background service, lock-screen ringtone, and wake delivery: out of scope for this foreground WebSocket contract.
- Chat, voice notes, image transfer, profile-photo transfer and group calls: out of scope.

## 8. Required shared test vectors before implementation approval

1. Positive challenge/hello vector shared by browser WebCrypto and Worker WebCrypto; assert byte-identical canonical transcript.
2. Negative hello vectors: one-byte signature tamper, key/fingerprint mismatch, wrong target, wrong origin, expired challenge, malformed nonce, unknown/duplicate field, wrong version and duplicate device socket.
3. Route vectors: malformed fingerprint, wrong case, missing separators, wrong path, wrong Origin and unexpected port.
4. Invite vectors: wrong caller/recipient, wrong origin, wrong relationship, expired/future invite, bad signature, tampered payload, malformed base64url, unknown field and replayed call ID/nonce.
5. State vectors: invite requires active registry authorization; explicit Accept only; Decline never relays room invite; wrong peer/call ID cannot respond; duplicate/busy recipient; cancel and disconnect cleanup.
6. Room vectors: only accepted caller can relay; wrong call ID/peer is rejected; recipient verifies the signed room invite independently.
7. Privacy vectors: no private key, SDP, ICE, media, profile photo, chat body or invite persistence.
8. Regression: existing QR/WebRTC suite passes unchanged.

## 9. Release gates

- [ ] Protocol owner approves this draft and freezes the canonicalization algorithm with test fixtures.
- [ ] Router path and Durable Object namespace are verified against the actual isolated staging deployment.
- [ ] Browser client and Worker implement this exact contract; no compatibility guessing or permissive field aliases.
- [ ] Positive and negative shared vectors pass in both runtimes.
- [ ] Existing QR/WebRTC regression tests pass unchanged.
- [ ] Exact Worker revision, environment, Origin and namespace are attested.
- [ ] Two physical devices pass foreground saved-friend audio/video tests.
- [ ] Separate Android push implementation passes background and locked-screen ringing on two physical devices.

No production deployment, public-site publication, inbox enablement, Firebase mutation, secret provisioning, APK replacement or signing change is authorized by this draft.
