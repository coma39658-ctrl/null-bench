# E-ZERO Secure Connect — free Cloudflare friend service (STAGING V0.1)

**Status: source code and automated tests only. Not deployed, not available to users, not a live call server.**

**Owner / project:** E-ZERO · community service · no investors · no ads · no data sale.

## Why this is the chosen platform

Cloudflare Workers Free + SQLite-backed Durable Objects let us run a small, hard-bounded friend-signaling pilot on a provider already used for E-ZERO work. The official Workers Free quota is 100,000 requests/day; Cloudflare's SQLite Durable Objects have their own free compute/storage limits and fail when exceeded. These are **shared account limits**, not an entitlement for unlimited users. No payment method, paid plan, SFU/TURN resource or production deployment is assumed.

Official references, checked November 4, 2026:

- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/limits/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/

## Code locations

- `secure_connect/cloudflare/signaling_worker_v0_1.mjs` — server-only signed request verification, invite inbox, consent/decline, accepted friend IDs and local clearing of expired requests.
- `secure_connect/cloudflare/wrangler.jsonc` — a **distinct staging Worker** configured `PILOT_ENABLED=false`; new SQLite-backed Durable Object binding.
- `secure_connect/client/signaling_client_v0_1.mjs` — explicit-consent local ECDSA P-256 identity, non-extractable signing private key in IndexedDB, SHA-256 public-key fingerprint, signed requests, public invitation URL hash.
- `secure_connect/tests/test_signaling_worker_v0_1.mjs` — Node's real WebCrypto tests, wrong signatures, request replay rejection, invitation consent, rejection, and both-sided removal.
- `.github/workflows/ezero_secure_connect_signaling_lab_v0_1.yml` — safe CI. There is deliberately **no automatic wrangler deploy, secret, paid service, public flag or production merge**.

## Minimal friend workflow

1. The sender *explicitly* chooses to create a persistent local identity. Its private signing key is non-extractable and stays in the phone browser's IndexedDB. The public SHA-256 fingerprint is the user ID.
2. The sender explicitly registers the public key through the protected staging Worker using a pilot access secret. This is an opt-in pilot; the secret **must never be embedded into the public web page or share link**.
3. The sender shares `https://coma39658-ctrl.github.io/null-bench/ezero_secure_connect_live_p2p_v0_1.html#friend=<64-hex-fingerprint>` (eventually this links to the enrolled friend page). The fragment is not sent in the HTTP request to the website host. The link does not contain a private key or password.
4. The recipient opens the link, sees the sender's public fingerprint, and explicitly taps **Send friend request**. Installing the app does **not** silently create a friendship.
5. The sender, while logged in, checks their incoming requests and explicitly taps **Accept** or **Decline**. Only then does the server return friendship status and both accounts appear in authenticated friend lists. The sender's human name cannot be authenticated from a fingerprint alone.
6. A local nickname may be stored in the user's own browser. The backend does not receive names, photos, contacts, SDP, voice, video, chat bodies or private keys.

## Safety and budget constraints

- **Pilot stays disabled** unless operator explicitly sets both `PILOT_ENABLED=true` and an independent secret `PILOT_JOIN_SECRET` (minimum 16 characters).
- Strict GitHub Pages origin CORS, strict JSON schema, 4 KiB request cap, POST-only API; `GET /health` reveals only limited staging info.
- Every operation includes ECDSA signature over type, sender ID, recipient ID, decision, registered public key (for enrollment), timestamp and cryptographic nonce. The Worker checks signed public-key SHA-256 and bounded clock skew; a Durable Object rejects replayed nonces.
- Pilot server maximum 100 registered accounts, 24 signed requests per account per minute, 20 pending incoming, 50 listed friends. Expired pending requests and replay nonces are eligible for automatic timed cleanup; explicit removal deletes both directional friendship entries.
- No silent friend additions; no auto-calling; no background polling; no device address-book uploads. No usage fees are charged by our app. Carrier data charges still apply.
- Free-plan resource ceilings apply. Turning on paid Cloudflare products, payment methods, overage pricing, TURN/SFU or public deployment requires separate verified operator action and a real hard budget cap.
- This code is a **limited pilot candidate** and not security-audited. Crypto authenticates possession of a signing key; it **does not authenticate the real-world human** or guarantee protection against a malicious browser extension, device compromise or the recipient's own recordings.
- This is a centralized directory storing public account keys, fingerprints, friendship states, timestamps and anti-replay/rate data. Cloudflare infrastructure may have its own operational metadata/logs. It does not retain media or conversations.

## Deployment gate — not performed

An authorized operator must first confirm the existing Cloudflare account, current free plan, **Workers Scripts** and Durable Objects permissions, quotas, and that enabling this separate Worker will not produce a bill. Existing E-ZERO staging deployment previously failed with `No access to the specified service`; it must not be bypassed by generating tokens or deploying with unknown billing exposure.

After reviewing the code, create an independent staging Worker in a safe Cloudflare environment, configure a secret with `wrangler secret put PILOT_JOIN_SECRET` (never commit the real secret), and explicitly enable the pilot. On two physical phones, test account creation, signed invite, visibility of the sender ID, accept/decline, reverse list, rejection and deletion. Audit server logs, abuse/rate limits, storage cleanup and complete origin restrictions. Only then consider connecting the public mobile UI to this backend.

## Not included

- No production or auto-enabled friend backend.
- No remote signaling of SDP/ICE for automatic calls.
- No TURN/SFU relay, group video, push notifications, background incoming calls or WhatsApp parity.
- No guarantee that opening/installing a link makes two people friends without approval.
- No mass user signups or monetary commitments.
