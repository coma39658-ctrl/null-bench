# E-ZERO Trusted Inbox V1 — wire contract and client migration gate

Status: staging design record only. This document does not enable, deploy, or authorize the inbox. The existing QR/WebRTC signaling path remains the supported call path until a separately reviewed client implementation passes the gates below.

## Authority and compatibility rule

For the current isolated Worker implementation, the authoritative wire protocol is the code in:
- `signaling/ezero-connect-v1/inbox_worker.mjs`
- `signaling/ezero-connect-v1/inbox_protocol.mjs`
- `signaling/ezero-connect-v1/saved_friendship_authorization_v1.mjs`

The legacy browser candidate `js/ezero_trusted_friend_foreground_client_candidate_v0_1.js` is not wire-compatible. Do not make the Worker accept legacy aliases, weaken exact-field checks, or enable the legacy client by changing configuration. Keep `js/ezero_trusted_inbox_stage_config_20261106.js` fail-closed.

## Transport and address

- Transport: secure WebSocket (WSS), foreground browser socket only.
- Request: `GET /v1/inbox/{recipientFingerprint}` with WebSocket Upgrade.
- `recipientFingerprint`: exactly 32 uppercase hexadecimal bytes separated by colons, e.g. `AA:BB:...:FF`.
- `Origin` must exactly equal the staging `PUBLIC_ORIGIN` configured on the Worker.
- The browser CSP must allow only the exact verified staging Worker origin when a future client is integrated.
- No production hostname, endpoint, Durable Object namespace, or secret is implied by this document.

## Authentication handshake

1. Worker sends exactly the challenge envelope shape:
   `{ "type":"challenge", "payload": { "v":1, "protocol":"E-ZERO-INBOX-HELLO-1", "origin":string, "inboxFingerprint":string, "challenge":string, "challengeExpiresAt":number } }`
2. Browser validates all fields, exact origin and target fingerprint, challenge expiry, and the expected protocol identifier. The challenge is base64url encoding of 32 random bytes; its encoded length is 43 characters.
3. Browser sends exactly:
   `{ "type":"hello", "fingerprint":string, "publicKeySpki":string, "signature":string }`
4. Signature is ECDSA P-256 / SHA-256 over UTF-8 bytes of canonical JSON for this exact object:
   `{ "v":1, "protocol":"E-ZERO-INBOX-HELLO-1", "origin":origin, "fingerprint":fingerprint, "inboxFingerprint":inboxFingerprint, "challenge":challenge, "challengeExpiresAt":challengeExpiresAt }`
   Canonical JSON sorts object keys recursively; no newline-delimited legacy transcript is accepted.
5. Worker recomputes SHA-256 of decoded SPKI and compares it to the uppercase colon-separated fingerprint, verifies the signature and challenge deadline, then replies:
   `{ "type":"inbox-ready", "fingerprint":authenticatedFingerprint }`
6. Any malformed, extra, missing, expired, mismatched, or unverifiable field fails closed. A second live socket for the same authenticated fingerprint is rejected.

## Call invitation and routing

- Caller sends exactly `{ "type":"call-invite", "inviteCode":signedEZEROCALL1Envelope }`.
- The invite code is independently verified by `verifyCallInvite`: protocol `E-ZERO-SAVED-FRIEND-CALL-1`, caller key/fingerprint binding, recipient binding, origin, relationship ID, audio/video mode, call ID, nonce, issue/expiry window, and caller signature.
- Worker must obtain a positive server-side saved-friendship authorization and require the returned `relationshipId` to equal the signed invite's relationship ID. Registry errors, mismatches, or missing authorization must never fall back to local browser contacts.
- On success the recipient receives `{ "type":"incoming-call", "inviteCode":sameSignedInvite }`; caller receives `{ "type":"invite-routed", "callId":string, "expiresAt":number }`.
- If no authenticated recipient socket is online, caller receives `{ "type":"unavailable", "callId":string }`. This is foreground-only delivery, not push or background ringing.
- The recipient must show an incoming-call prompt and send only after explicit user choice:
  `{ "type":"call-response", "callId":string, "decision":"accept"|"decline" }`.
- Caller receives `{ "type":"call-response", "callId":string, "decision":"accept"|"decline" }`. Acceptance changes the Worker call state; it does not itself establish WebRTC.
- After acceptance, caller may relay the separately signed, short-lived existing room invite:
  `{ "type":"call-room-invite", "callId":string, "inviteCode":"EZERO1...." }`.
  Recipient receives the same invite in a `call-room-invite` frame. Both endpoints must continue to validate the existing WebRTC room invite locally.
- Cancellation uses `{ "type":"call-cancel", "callId":string }`. The Worker clears the associated volatile call state and notifies the peer when connected.

## Deliberately unsupported legacy operations

The current Worker does not implement the legacy client's `trust`, `untrust`, or `received` frames, nor the legacy `t` message discriminator, `/v1/trusted/{lowercaseFingerprint}` route, same-origin call-page URL invite, or legacy newline signature transcript. A future client must not display these operations as successful. Trust relationship changes remain server-authoritative; a local contact list is not authorization.

## Explicit non-goals

- No offline message/call queue is implied.
- No push notification, FCM sender, Android wake delivery, ringtone, lock-screen UI, or closed-app delivery is implemented by this foreground Worker contract.
- No audio, video, SDP, chat body, media, profile photo, or private key is routed or stored by this inbox.
- No auto-answer; a human must explicitly accept.
- No production deployment, Firebase/secret change, APK replacement, or public feature enablement.

## Client integration acceptance gates

Before enabling a new client, add automated contract tests proving:
1. exact WSS path, fingerprint encoding, Origin and CSP match the isolated deployment;
2. challenge parsing, 32-byte base64url challenge, canonical signed transcript and ready response match byte-for-byte;
3. unknown fields, wrong identity, expired challenge, bad signature and duplicate identity fail closed;
4. signed invite and server-side relationship authorization are enforced before routing;
5. recipient accept/decline and caller/recipient state transitions match the Worker;
6. unavailable foreground recipient is reported honestly; no pending state is created;
7. the old QR/WebRTC flow remains unchanged and passes its regression suite.

Then run an isolated two-device foreground test against the exact staging Worker. Closed-app/screen-off ringing requires a separate authenticated push/wake implementation and physical test; it must not be claimed from these tests.
