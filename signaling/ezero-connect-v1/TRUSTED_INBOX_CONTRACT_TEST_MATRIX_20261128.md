# Trusted Inbox contract test matrix — staging only

Status: test design, not executable test evidence. The browser client remains disabled. No Worker deployment or physical-device result is implied.

## Test layers

1. Pure schema tests: parse and validate frames without sockets.
2. Cryptographic tests: create test-only P-256 keys, sign canonical transcripts, verify cross-runtime bytes.
3. Worker state tests: use fake WebSocket/DO harness to test routing and state transitions.
4. Browser integration tests: use test identity storage and mock server; never production keys.
5. Physical staging tests: two real devices, foreground first; background/locked screen only after push implementation exists.

## Required frame contract cases

| ID | Input / condition | Expected result |
|---|---|---|
| ROUTE-01 | Canonical valid recipient fingerprint and approved path | Upgrade may proceed to challenge |
| ROUTE-02 | Wrong path, wrong origin, explicit unexpected port, malformed fingerprint | Reject before authenticated session |
| CHAL-01 | Fresh challenge with exact version, origin, recipient, nonce encoding and expiry | Client may sign |
| CHAL-02 | Expired challenge, future timestamp outside skew, wrong target, wrong nonce length | Reject; no hello |
| HELLO-01 | Valid public key whose fingerprint matches and valid signature over exact canonical bytes | Authenticate socket |
| HELLO-02 | Signature modified by one byte | Reject |
| HELLO-03 | Public key/fingerprint mismatch | Reject |
| HELLO-04 | Unknown or duplicate fields, wrong role, unsupported version | Reject |
| READY-01 | Ready frame matches authenticated socket identity and protocol version | Client enters inbox-ready state |
| READY-02 | Ready before valid hello or identity mismatch | Reject/close |
| CALL-01 | Valid signed, unexpired invite to exact recipient and authorized relationship | Route invite to online recipient |
| CALL-02 | Expired invite, wrong origin/recipient, invalid signature, replayed nonce/call ID | Do not route |
| CALL-03 | Relationship absent, revoked, pending, or participant mismatch | Do not route |
| CALL-04 | Recipient offline or already busy | Return explicit unavailable/busy state; do not claim delivered |
| CALL-05 | Malformed invite, URL substituted for signed envelope, unknown fields | Reject |
| RESPONSE-01 | Recipient explicitly accepts or declines matching pending call | Notify caller; no automatic acceptance |
| RESPONSE-02 | Wrong call ID, wrong peer, expired pending call | Reject |
| RECEIPT-01 | Recipient UI confirms it rendered a verified incoming-call card | Send a receipt with a narrowly defined meaning |
| RECEIPT-02 | Socket send succeeds but UI did not render, tab hidden, or UI throws | Do not report displayed/ringing |
| TRUST-01 | Both participants have active server-authoritative relationship | Permit only scoped call authorization |
| TRUST-02 | Local contact alone, unilateral request, blocked/deleted relationship | Deny call authorization |
| STATE-01 | Duplicate device socket | Apply documented single-session policy |
| STATE-02 | Disconnect during pending/accepted call | Clear ephemeral state and notify peer |
| LIMIT-01 | Oversized frame, invalid JSON, rate-limit exceeded | Reject without state mutation |

## Cryptographic vector requirements

- Generate ephemeral P-256 test keys only.
- Freeze canonical JSON/transcript encoding and UTF-8 byte sequence in fixtures.
- Store public key, fingerprint, nonce, challenge timestamps, transcript bytes, signature and expected verification result.
- Include a positive vector and a one-byte-tampered negative vector for each signed message type.
- Run the same vectors in browser WebCrypto and Worker WebCrypto.
- Never include real user keys, real fingerprints, access tokens or production secrets in fixtures.

## State-machine assertions

- A socket is unauthenticated until challenge proof succeeds.
- A call invite is not accepted merely because it was routed.
- User Accept is required before the WebRTC room invite is relayed.
- A room invite is independently verified by the recipient before joining WebRTC.
- Delivery, UI display, ringing, user acceptance, and media-connected are distinct states.
- Closing the inbox socket never changes a call to connected.
- No private key, SDP, ICE, media, chat body, profile photo or long-lived invite is persisted by the volatile inbox.
- The old QR/WebRTC route continues to pass its existing regression suite independently.

## Release gates

- [ ] Protocol owner signs off one canonical versioned schema.
- [ ] Every case above has executable assertions.
- [ ] Browser/Worker crypto vectors pass in CI.
- [ ] Existing QR/WebRTC regression suite passes unchanged.
- [ ] Staging origin, Worker name, route and Durable Object namespace are verified.
- [ ] Two-device foreground test records exact app/build/commit and outcome.
- [ ] Push implementation separately proves screen-off ringing on two physical Android devices.

No inbox enablement, production release, Firebase mutation, secret provisioning or APK replacement is authorized by this test matrix.
