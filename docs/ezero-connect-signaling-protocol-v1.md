# E-ZERO Connect — Authenticated Signaling Protocol v1

Status: Stage 5 design contract. New service only; the older signaling pilot is not imported.

## Service boundary

Deploy a dedicated Cloudflare Worker + Durable Object namespace for the clean E-ZERO Connect app. Use exact configured origins; staging and production origins are separate. No wildcard origins. WebSocket signaling is a relay only; media travels peer-to-peer where possible and through TURN when required.

## Room lifecycle

- A room is created from a valid, signed, one-time invite envelope.
- The room ID is random and 192 bits; the invite nonce is 192 bits.
- QR invite expiry is at most 90 seconds.
- A connected signaling room expires after at most 10 minutes.
- Only one host and one guest role may be active in a room.
- Reconnect is permitted only for the same verified device fingerprint and within the original expiry.
- Closing, revoking trust, expiry or explicit hangup closes both sockets and deletes room state.

## Signed connection handshake

The Worker issues a fresh random challenge for each WebSocket role. Each device signs a canonical challenge transcript containing:
- protocol version;
- room ID and invite nonce;
- exact request origin;
- role (host or guest);
- device fingerprint and public SPKI key;
- challenge bytes and expiry.

The Worker derives SHA-256(public SPKI) and verifies that it matches the supplied fingerprint, then verifies the ECDSA P-256 signature. It does not accept a display name, QR image, room ID or fingerprint alone as authentication.

The guest's public key is forwarded to the host for verification and mutual-consent flow. The Worker does not mark a relationship trusted; only the clients can verify both signatures on the Stage 4 relationship transcript and save after local approval.

## Allowlisted message types

Only forward:
- `trust-request`, `trust-approval`, `trust-decline`;
- `call-invite`, `call-accept`, `call-decline`, `hangup`;
- `offer`, `answer`, `ice-candidate`;
- `profile-metadata` (strictly bounded and consented).

Reject all other message types. Validate JSON shape, role, room state and size before forwarding. Never allow a client to select another room or role after handshake.

## Data handling and limits

- Never persist SDP, ICE candidates, message bodies, voice, images, QR invite secrets or profile photos.
- Do not log payloads, signatures, invite URLs, fingerprints, display names or room secrets.
- Durable Object state may contain only room ID, invite nonce, expiry, role-to-fingerprint/public-key mapping, and connection state.
- Suggested limits: 16 KiB per signaling message, 2 KiB per ICE candidate message, 20 messages/second per socket with burst control, 1 room per invite nonce.
- Rate-limit room creation and failed handshakes. Close malformed, oversized, expired, duplicate-role or wrong-origin connections.
- No online/missed-call presence is persisted or fabricated.

## Security tests

- wrong Origin, non-WSS, invalid method/path, malformed JSON and oversized message;
- invalid signature, wrong public-key fingerprint, wrong role, replayed challenge and expired invite;
- second host, second guest, room guessing, room mismatch and cross-room forwarding;
- expired room cleanup and both sockets closed;
- hangup, decline, revoke and client disconnect cleanup;
- assert that SDP/ICE/message payloads are never written to durable storage or logs.

## Deployment gate

The Worker must first run under an isolated staging name and origin with a dedicated Durable Object namespace. Verify actual staging WebSocket connectivity from two browsers, then two physical Android devices. Do not reuse old pilot Worker names or production namespaces. No production deploy until all gates pass.
