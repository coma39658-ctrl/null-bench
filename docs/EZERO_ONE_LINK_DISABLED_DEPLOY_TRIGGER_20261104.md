# E-ZERO One-Link Encrypted Call — one-time DISABLED staging deployment

Date: 2026-11-04. Repository owner authorized controlled staging for a robust two-phone communication proof. This marker triggers ONE new Cloudflare Worker named `ezero-secure-connect-call-lab-disabled`, distinct from existing Workers.

Safety contract:
- Require tests and Wrangler dry-run before deployment.
- Refuse to overwrite an existing Worker or exceed the Free Workers count ceiling.
- Use SQLite-backed Durable Objects and WebSocket Hibernation; no media relay, content archive, recording, analytics, public friend signup, billing change, account tokens in logs or paid TURN server.
- `ROOMS_ENABLED=false` at all times in this task. The Worker exposes only a harmless health endpoint; all private room routes must return 503.
- Browser lab includes explicit create/join, accept/decline, start and hangup; ephemeral 256-bit fragment secret encrypts signed SDP using AES-GCM in browser. Cloudflare receives only ciphertext over WSS, with 10-minute maximum room lifetime once enabled in a future separate review.
- Two mobile-sized Chromium endpoints simulated a complete WebRTC call with encrypted signaling and no automatic microphone. This is NOT a pass of real physical phones or public production.
- No merge to `main` and no public E-ZERO website activation.

The staging workflow must refuse when preflight fails; no permission escalation.
