# E-ZERO Connect signaling — isolated staging worker

This is a new, isolated signaling service for the clean E-ZERO Connect application. It does not import the previous signaling pilot and is not deployed.

## Local configuration

1. Install the pinned Wrangler CLI from the repository root.
2. Copy .dev.vars.example to .dev.vars in this directory.
3. Keep the local origin exact: http://127.0.0.1:8787.
4. Run Wrangler from this directory with --config wrangler.jsonc.

The checked-in PUBLIC_ORIGIN is deliberately a reserved .invalid placeholder. Replace it only in an isolated staging environment with the exact staging app origin. Do not use the production origin in this phase.

## Endpoints

- GET /health: non-sensitive health response.
- GET /v1/rooms/{32-char-room-id}?role=host|guest: WebSocket upgrade only.

## Handshake

The Worker sends a fresh 256-bit challenge. Each device signs a canonical transcript bound to the exact origin, room ID, invite nonce, role, fingerprint, public key, challenge and 30-second challenge expiry. The first role must also provide the signed 90-second EZERO1 invite. A reconnect to an existing room may omit the expired invite but must prove possession of the same device key and invite nonce.

The Worker stores only room metadata, public keys/fingerprints, role and expiry. Signaling messages are validated and forwarded without being persisted. The Durable Object uses the Hibernation WebSocket API and a single expiry alarm.

## Limits

- QR invite: 90 seconds.
- Room lifetime: maximum 10 minutes from invite issue.
- Challenge: 30 seconds.
- Max signaling message: 16 KiB.
- Max ICE candidate: 2 KiB.
- Max SDP string: 12 KiB.
- Per-socket rate: 20 messages per rolling second.
- Hashed-IP admission limits: 8 host-room attempts/minute and 20 guest-handshake attempts/minute, enforced by separate Durable Objects; raw IP addresses are not persisted.
- One host and one guest per room.

## Saved-friend call inbox (staging implementation)

- A call invite is accepted only after its caller signature, recipient fingerprint, origin, expiry and relationship ID validate.
- If the recipient has no authenticated inbox WebSocket, the Durable Object may retain exactly one signed invite envelope for that recipient until its original expiry (maximum 30 seconds). It does not persist SDP, ICE, media, chat, photos, caller-supplied display names, or private keys.
- On recipient reconnect, the queued invite is re-verified and delivered only if the original caller is still authenticated and has the matching pending call state.
- Accept, Decline, Cancel or expiry consumes the queued invite. A reconnect cannot extend the original expiry.
- This is an online-reconnect queue, not an FCM push service: it cannot wake a force-stopped app or guarantee a ringtone while the inbox socket is disconnected. FCM device enrollment, signed wake delivery and Android WebRTC handoff remain separate work.
- The implementation is isolated and not deployed. CI tests are required before considering any staging deployment.

## Deployment boundary

No Worker has been deployed. The wrangler.jsonc name and .invalid origin are staging placeholders. A real staging deployment requires an explicitly configured Cloudflare account, exact staging origin and dedicated Durable Object namespace. Production must not be targeted.
