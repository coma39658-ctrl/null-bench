# One-time E-ZERO encrypted one-link call *DISABLED* staging hardening trigger
Date: 2026-11-04. Operator explicitly authorized safe staging updates for the E-ZERO communication technology.

This marker triggers a single update to exactly `ezero-secure-connect-call-lab-disabled`, already isolated on Cloudflare. Preflight must require its previous public health to report `STAGING_DISABLED`, pass local security tests and Wrangler dry-run, and refuse to touch any other worker.

Apply latest source protection only:
- separate browser-held 256-bit AES-GCM key and one-way WebSocket authentication hash; never send raw encryption key in headers,
- HMAC-SHA256 owner authorization with *random* 64-hex operator secret, 10-minute expiry and no link replay,
- strict global eight-room SQLite DO admission, approximate per-network handshake rate limiting, per-socket message budget, one callee only and revocation on disconnect/decline/hangup,
- no SDP/ICE/media stored, truncated/invalid invite rejection, automatic transient metadata erasure at expiry,
- preserve `ROOMS_ENABLED=false`, no `PILOT_OWNER_SECRET` installed by this task, no live call room, no public site updates, no billing actions and no TURN/SFU relay.

The final verification must independently GET /health (`STAGING_DISABLED`) and GET a room endpoint (HTTP 503) before recording success. Production rollout and real phone testing remain separate.
