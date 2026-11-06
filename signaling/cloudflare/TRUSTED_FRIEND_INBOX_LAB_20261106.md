# E-ZERO Trusted Friend Inbox — isolated server candidate (2026-11-06)

Status: **LAB ONLY, NOT DEPLOYED OR LINKED TO PUBLIC QR CALLING.**

## Phase B1 completed on isolated branch

- Added `js/ezero_trusted_friend_foreground_client_candidate_v0_1.js`: browser companion to the proposed authenticated Cloudflare inbox.
- Uses the existing opted-in IndexedDB device identity API from draft PR #87. Validates locally persisted public key/fingerprint and signs the server's fresh challenge; no private key is exported.
- User-action methods: `openOwnerInbox()` (foreground socket), `setFriendTrust(fp,allowed)` (explicit reciprocal trust control), `callSavedFriend(fp,kind,invite)` (send an already-created QR call invitation to a saved friend). Incoming messages are event callbacks only, **not automatically accepted, opened or recorded**.
- Added `tests/test_ezero_trusted_friend_foreground_client_20261106.cjs` with mocked WebSocket routing and real P-256 WebCrypto signatures; test checks opt-in trust, signed challenge, valid short invitation, revocation, and no implicit sockets on page load. Its GitHub CI completed successfully.
- Added `js/ezero_trusted_friends_controls_candidate_v0_1.js` and its isolated UI test. It is a separate, disabled-by-default lab panel: locally saved friend names get explicit Trust/Revoke, Audio and Video controls. Clicking a friend's call uses the existing signed QR engine to generate a fresh offer and sends that single-use invitation through the trusted inbox. Incoming invites only display a Review button; user must explicitly open and accept the existing WebRTC page. A 30-second timeout releases stalled local attempts, with no background retries.
- **Not wired to the public front-end or active Cloudflare Worker**. The lab controls are not included in production HTML, no friend calling or backend routing is deployed, and the user-facing one-accept no-QR flow has not been validated on two real phones. This lab still requires consent-saved identity from draft PR #87, an isolated deployed Worker, and a physical-phone test.



Goal confirmed by the owner: a friend is saved after the first real QR call; on later visits their saved card can initiate audio/video ringing without another QR scan. The recipient explicitly accepts. The current public QR call remains the known working fallback.

## Existing prerequisites

- Local P-256 signing key storage with explicit consent is in separate draft PR #87, **not publicly released**.
- The actual one-request/one-accept QR WebRTC implementation is publicly released on `main` and has had a successful real two-phone call.
- Today's server-side candidate is `src/trusted_inbox_candidate_v0_1.js` on this branch. It is **not** imported by `worker.js`, not in Wrangler deployment config and not referenced in public HTML.

## Phase B2 staging integration — 2026-11-06

- Created isolated `ezero_trusted_friends_staging_20261106.html` with its own staged copies of the QR/WebRTC engine and saved-contacts UI. The existing working public page and production QR scripts remain unchanged.
- Staged page loads the opt-in IndexedDB ECDSA device identity store, shows **Save Friend** after a verified actual WebRTC connection, and preserves the identity/friend list across browser reloads. Both phones must explicitly save each other during the first call; changing phones or clearing storage requires new pairing.
- Staging QR invitations route directly back to the same staging path, so both parties retain the same stable device keys instead of redirecting one side to the production page.
- Fixed a second-call failure on same-document `#room` navigation: after hangup a fresh QR link forces a safe explicit page re-entry rather than remaining on the old page and hiding **Accept**.
- Added a staged Trusted Friends foreground panel and client. **Trusted Inbox remains disabled** (`js/ezero_trusted_inbox_stage_config_20261106.js` has `enabled:false`, blank WSS); the new secure direct-call backend is **not live**.
- GitHub's dedicated staging CI verified actual two Chromium browser WebRTC connections (first QR and redial), both phones' explicit Save Friend, non-extractable key storage, and reload preserving saved friend identity. These are browser/locally mocked signaling tests, not two physical Android devices or real QR-free calling.
- Added `wrangler.trusted-staging.jsonc` and a separately permissioned, **manual-only** Cloudflare deployment workflow for `ezero-trusted-friends-inbox-staging`. This is **deployment preparation only**. No Worker was deployed, no Cloudflare secrets were changed, and this branch's workflow is not dispatchable as a standard workflow until registered on the default branch. Never merge/deploy automatically.

**Remaining gates:** audit exact recipient authorization and cross-call fingerprint binding; deploy separate trusted staging Worker with least-privilege credentials; verify WSS URL and exact CSP; enable the staging client only after verification; test no-QR contact redial with both physical phones in the foreground and explicit Accept, 5 consecutive cycles and reload. Test network/TURN fallback, revocation and stale/missing contacts. Do not claim production-ready push or background ringing.

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
