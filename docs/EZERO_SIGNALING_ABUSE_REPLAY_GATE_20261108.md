# E-ZERO Secure App — Signaling Abuse & QR Replay Defense, 2026-11-08

**Status: code + deterministic local tests PASS; NOT DEPLOYED.**

## Scope / محفوظ دائرہ
- Only `signaling/cloudflare/src/worker.js` on the isolated **security candidate** branch changes. The existing GitHub Pages calling HTML, tested audio/video engine, authenticated clients, Cloudflare production Worker and Render staging service are not changed.
- Preserve the earlier user-verified one-scan + mutual approval flow. Incoming QR does **not** auto-start a call or open camera/microphone.
- Keep connection metadata minimal: only SHA-256 proofs, expiry and one Boolean for consumed invitation; **never** persist SDP, media, messages, QR tokens or people/contact lists on the Durable Object.

## Changes (staging)
1. **Signed invite single use:** First validated guest SDP answer sets `guestConsumed=true` in the expiring room record. After a completed answer, the same QR guest capability cannot authenticate again. If the guest's WebSocket drops **before** sending an answer, a renewed attempt is allowed until room expiry.
2. **Message flood protection:** 60 application-level messages per WebSocket per rolling 60-second window; all app pings and malformed JSON count. Over limit ⇒ close 1008 with `RATE_LIMIT`. The per-socket counter is stored in a Cloudflare hibernation-safe `serializeAttachment`, not in process-global state.
3. **Anonymous handshake deadline:** Pending sockets are closed after 20 seconds and cannot indefinitely consume the maximum four room connections. A single Durable Object alarm coordinates pending socket deadlines and the authenticated room expiration without prematurely hanging up an active caller.
4. **Existing protections retained:** Exact allowed `Origin`, WSS only, high-entropy room and proof values, two authenticated peers, bounded SDP envelopes, valid role-specific SDP, 10-minute expiry, and authenticated one-time offer/answer forwarding.
5. **No audio/video pipeline rewrite, no TURN changes, no new user permissions, no background recording.**

## Verified simulated test cases
- Origin reject, query-string secrets reject, non-WebSocket upgrade reject.
- Four pending sockets cap; fifth refused; anonymous sockets closed after 20 seconds and slots reclaimed.
- Early anonymous timeout does not close verified host or discard valid ten-minute room.
- Wrong guest proof rejected; interrupted guest can rejoin *before* completed answer.
- One host offer + one guest answer forwarded, signed signaling and room authorization preserved.
- Completed-invite guest replay rejected even after guest socket disconnects.
- App ping flood, malformed-JSON flood, and oversized message rejected.
- Ten-minute expiry cleans all auth metadata; repeated alarm remains safe.
- Original positive two-peer signaling regression also PASS.
- CI workflow `E-ZERO Isolated Signaling Abuse and Replay Gate` PASS on GitHub.

## Further security before ANY Cloudflare deployment
- Inspect and enforce **global** per-IP/account/ASN WebSocket handshake quotas at the Cloudflare edge. Per-room rate limiting alone does **not** stop attackers creating large numbers of random rooms, and cannot prevent all DoS attacks.
- Ensure Durable Object billing and CPU/connection limits, DDoS controls, abuse alerts, and CSP with exact staging Origin. Audit secrets and credentials.
- Independently test hibernation/restart, clock skew, concurrent connects, connection drops, QR replay, cross-network NAT/TURN and real-phone voice/video quality.
- Review security impact of one-time guest invitation on network recovery; ensure a new QR is easy to generate after an answered session drops.
- Deploy only an **isolated test** Worker after approval and positive compatibility tests. Never deploy to the existing successful Worker as part of this candidate.

Sources: OWASP WebSocket Security Cheat Sheet (https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), Cloudflare Durable Object hibernatable WebSockets (https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
