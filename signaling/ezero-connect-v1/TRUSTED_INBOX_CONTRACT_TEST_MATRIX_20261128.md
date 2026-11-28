# Trusted Inbox contract test matrix — staging only

Status: partial automated coverage is now present. The browser foreground client remains fail-closed/disabled by PR #251. No production release or physical-device result is implied.

## Evidence recorded on 2026-11-28

- PR #252 head `d946981800a2481ba6cb3611c087cbf22e909ec1`.
- GitHub Actions run `46119343770`: **E-ZERO Connect Clean Build Shell QA — success**.
- Both jobs passed: `clean-mobile-shell` and `frozen-two-phone-contracts`.
- The clean-build job passed syntax checks, Wrangler dry-run validation (no deployment), existing QR/call regression tests, signed invite validation, the inbox Worker unit harness, friendship authorization tests, and two live staging smoke tests.
- Live smoke tests reached the configured staging app/Worker endpoints, completed a signed challenge handshake, then used two independently generated ephemeral P-256 test identities and two WebSocket connections to route a signed saved-friend invite, receive explicit Accept, and relay an opaque room invite.
- The live test ran in a headless browser/CI context. It is **not** two physical phones, does not establish microphone/media connectivity, and does not test Android background or locked-screen ringing.
- The live test does not prove that the deployed Worker binary/configuration is identical to this repository commit. Deployment provenance and Durable Object namespace attestation remain open.
- The PR remains a draft, unmerged. The existing QR/WebRTC source boundary passed its dedicated frozen-baseline job.

## Test layers

1. Pure schema and cryptographic tests: test-only P-256 identities, canonical transcripts and signed envelopes.
2. Worker state tests: fake socket harness for routing, acceptance, replay, busy/offline, cancellation and disconnect behavior.
3. Browser/Worker integration: live staging endpoint with ephemeral identities; never production keys.
4. Physical staging tests: two real devices, foreground first; background/locked screen only after a separately implemented push path exists.

## Required frame contract cases

| ID | Input / condition | Current evidence |
|---|---|---|
| ROUTE-01 | Canonical valid recipient fingerprint and approved path | Live staging route exercised; exact deployed revision still un-attested |
| ROUTE-02 | Wrong path, wrong origin, explicit unexpected port, malformed fingerprint | Not yet fully covered by a negative live route suite |
| CHAL-01 | Fresh challenge with exact version, origin, recipient, nonce encoding and expiry | Live signed challenge handshake passed |
| CHAL-02 | Expired challenge, future timestamp outside skew, wrong target, wrong nonce length | Not yet covered by a complete negative vector suite |
| HELLO-01 | Valid public key whose fingerprint matches and valid signature over exact canonical bytes | Live signed authentication passed |
| HELLO-02 | Signature modified by one byte | Not yet covered by an explicit tamper vector |
| HELLO-03 | Public key/fingerprint mismatch | Not yet covered by an explicit inbox handshake negative test |
| HELLO-04 | Unknown or duplicate fields, wrong role, unsupported version | Not yet covered by a complete negative frame suite |
| READY-01 | Ready frame matches authenticated socket identity and protocol version | Live inbox-ready identity check passed |
| READY-02 | Ready before valid hello or identity mismatch | Not yet covered by an explicit negative state test |
| CALL-01 | Valid signed, unexpired invite to exact recipient and authorized relationship | Unit harness and live staging invite route passed |
| CALL-02 | Expired invite, wrong origin/recipient, invalid signature, replayed nonce/call ID | Replay is covered; remaining negative invite vectors are incomplete |
| CALL-03 | Relationship absent, revoked, pending, or participant mismatch | Registry allow path and several fail-closed authorization cases tested; full lifecycle matrix incomplete |
| CALL-04 | Recipient offline or already busy | Unit harness passed unavailable and busy assertions |
| CALL-05 | Malformed invite, URL substituted for signed envelope, unknown fields | Not yet covered as a complete negative matrix |
| RESPONSE-01 | Recipient explicitly accepts or declines matching pending call | Accept passed live and unit tests; decline still needs an explicit test |
| RESPONSE-02 | Wrong call ID, wrong peer, expired pending call | Not yet covered by a complete negative response suite |
| RECEIPT-01 | Recipient UI confirms it rendered a verified incoming-call card | No display receipt contract implemented/verified |
| RECEIPT-02 | Socket send succeeds but UI did not render, tab hidden, or UI throws | No display receipt contract implemented/verified |
| TRUST-01 | Both participants have active server-authoritative relationship | Registry authorization allow path tested |
| TRUST-02 | Local contact alone, unilateral request, blocked/deleted relationship | Some registry deny/error cases tested; full relationship lifecycle remains open |
| STATE-01 | Duplicate device socket | Worker source has a duplicate-session guard; explicit test still required |
| STATE-02 | Disconnect during pending/accepted call | Accepted-call disconnect cleanup passed in unit harness |
| LIMIT-01 | Oversized frame, invalid JSON, rate-limit exceeded | Oversized/invalid/rate-limit matrix remains incomplete |

## Cryptographic vector requirements

- Generate ephemeral P-256 test keys only.
- Freeze canonical JSON/transcript encoding and UTF-8 byte sequence in fixtures.
- Store public key, fingerprint, nonce, challenge timestamps, transcript bytes, signature and expected verification result.
- Include positive and one-byte-tampered negative vectors for each signed message type.
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

## Remaining release gates

- [ ] Protocol owner signs off one canonical versioned schema for the browser foreground client and Worker.
- [ ] Complete the negative cases marked incomplete above with executable assertions.
- [ ] Browser/Worker positive and negative crypto vectors pass in CI.
- [ ] Existing QR/WebRTC regression suite passes unchanged.
- [ ] Attest the exact deployed staging Worker revision, origin, route and Durable Object namespace.
- [ ] Two-device foreground test records exact app/build/commit and outcome.
- [ ] Push implementation separately proves screen-off ringing on two physical Android devices.
- [ ] Verify actual WebRTC audio/video media after the recipient accepts; signaling relay alone is insufficient.

No inbox enablement, production release, Firebase mutation, secret provisioning or APK replacement is authorized by this test matrix.
