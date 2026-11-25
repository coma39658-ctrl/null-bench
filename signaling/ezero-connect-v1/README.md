# E-ZERO Connect signaling — isolated staging worker

This is a new, isolated signaling service for the clean E-ZERO Connect application. It is separate from the previous signaling pilot and must only be deployed to the dedicated staging Worker.

## Staging configuration

- Worker: `ezero-connect-call-preview-20261125`
- Browser origin: `https://ezero-connect-pr216-preview-20261125.onrender.com`
- Worker endpoint: `wss://ezero-connect-call-preview-20261125.coma39658.workers.dev`

The exact browser origin is configured as `PUBLIC_ORIGIN` in `wrangler.jsonc`. Do not use the production origin.

## Local configuration

1. Install the pinned Wrangler CLI from the repository root.
2. Copy `.dev.vars.example` to `.dev.vars` in this directory.
3. For local development only, set the origin to `http://127.0.0.1:8787`.
4. Run Wrangler from this directory with `--config wrangler.jsonc`.

## Endpoints

- `GET /health`: non-sensitive health response.
- `GET /v1/rooms/{32-char-room-id}?role=host|guest`: WebSocket upgrade only.

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

The manual GitHub Actions workflow deploys only this isolated staging Worker and its Durable Object migrations. It requires dedicated repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. If either is missing, deployment fails closed. Production must not be targeted.
