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
- One host and one guest per room.

## Deployment boundary

No Worker has been deployed. The wrangler.jsonc name and .invalid origin are staging placeholders. A real staging deployment requires an explicitly configured Cloudflare account, exact staging origin and dedicated Durable Object namespace. Production must not be targeted.
