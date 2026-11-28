# Trusted Inbox wire-protocol compatibility audit — 2026-11-28

## Status

Audit only. No protocol adapter is approved, no Worker deployment is verified, and the foreground inbox must remain fail-closed. This document records source-level incompatibilities found between the browser foreground client and the isolated signaling Worker. A passing source audit is not a runtime handshake or a two-device test.

## Confirmed incompatibilities

| Area | Browser client expects/sends | Worker expects/sends | Required resolution |
|---|---|---|---|
| WebSocket path | `/v1/trusted/{lowercase-hex-fingerprint}` | DO route is `/v1/inbox/{uppercase-colon-fingerprint}` | Select one canonical route and fingerprint encoding; validate at every boundary |
| Challenge frame | `{t:"challenge", nonce, target, opened, expires}` | `{type:"challenge", payload:{v,protocol,origin,inboxFingerprint,challenge,challengeExpiresAt}}` | Specify one versioned schema and strict parser |
| Challenge nonce | 32 URL-safe characters | 32 random bytes encoded base64url (normally 43 characters) | Specify exact entropy and encoding |
| Hello frame | `{t:"hello",role,fp,pub,sig}` | `{type:"hello",fingerprint,publicKeySpki,signature}` | Align exact field names and reject unknown fields |
| Signed transcript | Newline-joined `EZERO-TRUSTED-INBOX-1` fields | Canonical JSON object with `E-ZERO-INBOX-HELLO-1` protocol fields | Define a single canonical byte-level transcript and test signatures cross-implementation |
| Fingerprint | Lowercase 64-character hex without separators | Uppercase 32-byte hex with colon separators | Define one canonical representation; normalize only at a validated boundary |
| Ready frame | `{t:"ready",role}` | `{type:"inbox-ready",fingerprint}` | Align authenticated-ready frame and bind it to the role/identity |
| Incoming call | `{t:"incoming",from,callId,kind,invite}` where invite is a same-origin call-page URL | `{type:"incoming-call",inviteCode}` where inviteCode is a signed `EZERO-CALL1.` envelope | Do not convert an opaque signed invite into a URL without a reviewed verifier/adapter |
| Outgoing call | `{t:"call",kind,callId,invite}` | `{type:"call-invite",inviteCode}` | Align exact request and preserve server-side signature, expiry, replay and relationship checks |
| Trust updates | Client sends `trust` / `untrust`; expects `trust-updated` | No corresponding trust/untrust message handler found | Implement only through authoritative friendship registry with explicit dual consent |
| Receipt | Client sends `{t:"received",from,callId}` | No matching receipt handler found | Define delivery acknowledgement semantics; never treat socket send as displayed/ringing |
| Error vocabulary | Client expects `{t:"error",code}` | Worker emits several `type`-based status frames | Publish a versioned error/status catalogue |

## Security and product constraints

1. Keep the staging client disabled until the exact Worker deployment, origin, route, Durable Object binding, and protocol version are verified.
2. Keep the existing QR/WebRTC signaling path separate and unchanged.
3. The Worker must continue to verify the signed call invite and authoritative saved-friend relationship before routing.
4. No call may be auto-accepted. Incoming-call display, user acceptance, WebRTC room invite verification, and media connection are separate states.
5. Do not label an invite delivered, displayed, ringing, or connected based only on a WebSocket send.
6. No private key export. Browser device keys remain non-extractable; public-key proof and signatures are verified.
7. Foreground inbox tests do not establish background or screen-off ringing. That requires Android push delivery and physical locked-screen testing on two devices.

## Required implementation gates

- [ ] Choose and version one canonical wire protocol.
- [ ] Add shared positive and negative contract vectors for route, fingerprint, challenge, hello signature, ready, call invite, response, receipt, trust update and errors.
- [ ] Verify browser and Worker produce/consume byte-identical signed transcripts.
- [ ] Test malformed JSON, unknown fields, wrong origin, wrong fingerprint, stale challenge, replayed nonce, expired invite, unauthorized relationship, duplicate socket, busy recipient and disconnected peer.
- [ ] Test that no private key, SDP, media, profile photo or message body is stored by the inbox.
- [ ] Verify exact staging deployment and health/handshake evidence before enabling the flag.
- [ ] Run two-device foreground call tests while preserving the current QR/WebRTC baseline.
- [ ] Separately implement and physically verify FCM/Android background and screen-off ringing.

## Explicit non-claims

This audit does not establish that the inbox is deployed, that saved-friend calls work, that Android push ringing works, or that any physical two-device test has passed.
