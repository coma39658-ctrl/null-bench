# E-ZERO Secure Connect — zero-cost signaling server decision (2026-11-04)

**Decision:** Use a new, isolated Cloudflare Workers Free + SQLite Durable Object staging service, **not** the existing Qwen/AI Worker, for the initial friend-invitation and consent handshake. Keep the public GitHub Pages website and AI Studio unchanged until this separate service has passed deployment and physical-phone tests.

## Why this is the best initial fit

* Cloudflare Workers Free: 100,000 Worker requests per day (shared account-level free plan limit). SQLite Durable Objects are also available on the Free plan, with a separate 100,000 DO requests/day and 13,000 GB-s/day allocation; free limits are **not** unlimited and exceeding limits fails rather than magically scaling.
* Durable Objects coordinate two phones, and support WebSocket Hibernation for later real-time call signaling and low idle cost.
* Render Free would cold-start after 15 minutes without inbound traffic, approximately one minute to wake up. It is a backup experiment, not the primary platform for incoming calls.
* Cloudflare free STUN at `stun.cloudflare.com` helps some networks find a route. A TURN relay is a separate media service, not the Worker. Cloudflare Realtime currently advertises a shared 1,000 GB/month free SFU/TURN allowance followed by $0.05/GB outbound; these are **separate** services, subject to account/billing restrictions, and must not be silently activated.
* Pricing, eligibility and capacity must be rechecked before any production commitment.

Sources:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/realtime/turn/faq/
- https://developers.cloudflare.com/realtime/sfu/platform/pricing/
- https://render.com/docs/free/

## Stage 1: consent-first friend invitations

A sender chooses **Share personal invitation**, rather than generic **Share public E-ZERO website**. The temporary account key signs an invitation. The server returns a random high-entropy invitation ID and two separate bearer capabilities, one for the sender and one for the recipient. The recipient link carries only a join capability in the URL **fragment** (not a query parameter). A person opening the link sees the sender's signed SHA-256 public-key fingerprint and the question **“Add this person as a friend?”**, with **Approve** and **Decline** options. Approval is explicit; install permission is a different action.

The sender must also approve the request before either side claims a mutually confirmed connection. Without sender approval, show **REQUEST_PENDING** rather than **CONNECTED**. A server-stored pending state is not a delivered call. No auto-install, silent friend-adding, call-start, microphone, camera or contact-book upload.

Temporary room data: signed public IDs, two hashed random bearer capabilities, expiration, friend-request state, and a single pending requester's signed public ID. No messages, voice, video, screenshots, call recordings, phone book, payment details, private keys, call history or ad trackers. The room expires after ten minutes; provider logs/backups may have separate retention and must be reviewed. Contacts locally saved by explicit user choice can hold only name and SHA-256 fingerprint and MUST be reverified per session.

**Important existing limitation:** the current site's cryptographic private key is ephemeral and changes on reload. The current signed QR expires in ten minutes. Permanent “accounts”, installing the app and background friend requests require a later explicitly consented, non-exportable persistent device key and secure server account registration, key-rotation/revocation and notification design. A friend-request link is not a global account ID.

## Stage 2: real audio/video signaling (only after stage 1 passes)

Use authenticated hibernating WebSockets or equivalent short-lived channels to exchange WebRTC offer/answer and ICE candidates **only after both parties approve**. Network information and public keys are metadata, not secret-proof E2EE. Media continues peer-to-peer with WebRTC DTLS/SRTP; never send raw media or record conversations in the signaling Worker. Optional TURN credentials must be short-lived and generated server-side, with visible user-facing relay/data-cost quotas. Block paid features until billing limits and consent are configured.

## Deployment and privacy release gates

1. Dedicated staging Worker name `ezero-secure-connect-signaling-staging`; do not replace AI worker or AI Studio. Start disabled with `EZERO_PUBLIC_ENABLED=false`, and no workers.dev URL/routes.
2. Only the GitHub Pages origin may use CORS. Validate signed public IDs, token entropy and expiry server-side; allowlisted endpoint methods, maximum request sizes, controlled error codes, explicit request approval, same-ID/self-invite rejection, no unbounded retries or timers.
3. CI contract and browser integration: PASS/FAIL/PARTIAL/UNKNOWN; verify successful QR + consent; wrong/expired/replayed links; denied camera; weak network; one and two mobile networks; no false CONNECTED claims; server storage contains no message/media.
4. Minimum metadata collection and retention policy, abuse controls, user blocking/reporting, legal review (Saudi Arabia and destination jurisdictions), full threat model and independently reviewed cryptography.
5. Production release only after Cloudflare account confirms usable **Workers Scripts**, Workers Free/DO entitlements, secure credential storage, live service health, successful two-real-phone tests, predictable cost caps and user approval. The older E-ZERO Cloudflare Worker previously encountered **No access to the specified service**; this document does not claim that Cloudflare deployment is permitted.

## Explicit current status

- **SELECTED:** Cloudflare Workers Free + SQLite Durable Objects
- **STAGING CANDIDATE:** implementation and tests in an isolated GitHub branch
- **NOT YET DEPLOYED:** live signaling, automatic friend request delivery, persistent account IDs, TURN and background incoming calls
- **COST TODAY:** no new service or charge activated by this branch.
