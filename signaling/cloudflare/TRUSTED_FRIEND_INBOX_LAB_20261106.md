# E-ZERO Trusted Friend Inbox — isolated server candidate (2026-11-06)

Status: **LAB ONLY, NOT DEPLOYED OR LINKED TO PUBLIC QR CALLING.**

Goal confirmed by the owner: a friend is saved after the first real QR call; on later visits their saved card can initiate audio/video ringing without another QR scan. The recipient explicitly accepts. The current public QR call remains the known working fallback.

## Existing prerequisites

- Local P-256 signing key storage with explicit consent is in separate draft PR #87, **not publicly released**.
- The actual one-request/one-accept QR WebRTC implementation is publicly released on `main` and has had a successful real two-phone call.
- Today's server-side candidate is `src/trusted_inbox_candidate_v0_1.js` on this branch. It is **not** imported by `worker.js`, not in Wrangler deployment config and not referenced in public HTML.

## Candidate protocol (not production-ready)

- Per-recipient SHA-256 public-key fingerprint Cloudflare Durable Object, reached at `/v1/trusted/<recipient_fp>`. Exact browser Origin and WSS upgrade required.
- Each new socket gets a fresh 20-second challenge. Client signs `EZERO-TRUSTED-INBOX-1\n<origin>\n<recipient_fp>\n<role>\n<caller_fp>\n<nonce>\n<timestamp>` with its locally kept, non-exportable P-256 private key.
- Server verifies ECDSA, independently hashes SPKI public key and compares fingerprint. Only that fingerprint's owner can modify the local friend allowlist, capped at 50 contacts.
- Trusted caller may deliver **one** short-lived, existing QR-pilot invitation to the recipient's **already connected** browser tab. No offline storage or push notifications. Owner still must explicitly approve the call using the existing WebRTC acceptance mechanism.
- Only short-term cooldown/replay metadata is retained server-side. Caller may not send arbitrary chat messages, SDP or media. Owner can revoke a trusted caller, closing their active socket.

## Still required before honest no-QR calling

1. Combine stable device identity and verified peer enrollment with **mutual opt-in** after the first signed WebRTC session; verify distinct devices and fingerprints. Do not auto-save contacts, and do not equate profile name or avatar with identity.
2. Build a browser **foreground inbox client**, with a real clickable Saved Friends -> Call action. The caller signs a challenge, and recipient receives an incoming invitation and **accepts or declines**; do not activate mic/camera before acceptance.
3. Connect the new call request to the current signed SDP/RTCPeerConnection pipeline using a **fresh ephemeral room, offer and answer on each call**. Call status must be evidence-bound; do not falsely claim a ringing/connected device.
4. Do more security tests: challenge expiry/race, authorization on every call, replay across hibernation, rate-limit bounds, revocation, requester impersonation, public-origin/CSP, CSRF-like and cross-site WebSocket attempts, malicious clients, storage-cleared identity and trusted-list reset.
5. Test two real phones with app in foreground, reload after first save, 5 successive call/hangup/redial cycles, and different Wi-Fi/mobile networks. Set up TURN if direct connectivity fails; the QR pilot's success on one pair/network does not prove universal coverage.
6. Background incoming calls and installed-PWA push need separate permissioned implementation. **Do not promise ringing when app is closed.**

## Deployment isolation

- No Cloudflare deployment, modification of deployed Worker, new DNS, API secret, production flag, or auto-push in this branch.
- New candidate uses its own Durable Object class and requires a separate, reviewed Wrangler migration and staged namespace.
- No user data migration or local trust registration performed.
- The public QR flow stays available as a fallback until genuine, authenticated no-QR redial passes live acceptance.

## Security/architecture references

- https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
- https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify
