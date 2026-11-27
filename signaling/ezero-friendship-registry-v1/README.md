# E-ZERO Mutual Friendship Registry V1 — Staging

## Purpose
This isolated Worker is the server-authoritative record for V1 mutual saved-friend approvals. It is not deployed by this change.

## Approval protocol
- Each device must explicitly sign the same canonical `E-ZERO-TRUST-1` transcript.
- The browser submits `protocol`, the locally derived SHA-256 `relationshipId`, the transcript, and one approval signature to `POST /v1/relationships/approve`.
- The Worker validates both participant P-256 public-key fingerprints and the submitted participant's ECDSA signature.
- The Durable Object records approvals by signer fingerprint. One valid signature yields `PENDING`; only two distinct participant signatures yield `ACTIVE`.
- Repeating the same signature is idempotent. A conflicting signature for the same participant is rejected.
- Approval requests require the exact configured PWA Origin. No wildcard CORS or public URL fallback is used.

## Call authorization
The signaling Worker uses its private Cloudflare Service Binding to call `POST /v1/authorize-call`. The registry checks:
- the relationship is ACTIVE;
- caller and recipient are exactly the two transcript participants;
- the call mode and 30-second expiry are valid; and
- call ID and nonce have not already been used.

Only an exact positive response permits the existing inbox Worker to route the call invite. Replays are rejected.

## Privacy and retention
The registry stores public keys, the signed consent transcript, signatures, status, and short-lived call replay identifiers. It does not store display names, phone numbers, message content, SDP, ICE candidates, audio, or video. Call replay identifiers expire with the call window and are capped.

## Explicit non-claims / remaining integration
- This PR does not deploy either Worker or create Cloudflare secrets.
- The existing browser V2 auto-save path is not yet wired to submit registry approvals. The current call invite's relationship ID must be generated from the same registered transcript before calls can pass the gate.
- No offline call queue, FCM sender, Android Accept-to-WebRTC handoff, or background ringing is activated.
- Production and the public site are unchanged.

## Validation
The staging QA workflow verifies signed two-party approval, pending-before-second-approval, active-after-second-approval, call authorization, replay rejection, and origin enforcement. Dry-run validation does not deploy.
