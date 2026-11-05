# E-ZERO Secure Pair V1 — normative protocol specification (DRAFT)
**Date:** 2026-11-05 · **Repo:** `coma39658-ctrl/null-bench` · **Public release:** NO
**Decision:** One QR + mutual cryptographic approval + trusted-device one-tap reconnect, with account Passkey distinct from device keys and secure transport.

## 0. Evidence and compatibility inventory
- Public `main` still serves `ezero_secure_connect_live_p2p_v0_1.html` with temporary P-256 signed identity QR and **manual** WebRTC offer/answer exchange. No WebAuthn registration/reconnect backend was found in the relevant repository default branches during initial code search.
- Existing isolated Cloudflare Worker `ezero-secure-connect-call-lab-disabled` implements WebSocket/SQLite Durable Objects, 10-minute ephemeral call rooms, HMAC operator invitation proof, global eight-room cap and approximate per-IP rate limiting. Remote `/health` previously confirmed `STAGING_DISABLED`; it must remain disabled.
- One-QR prototype is on `ezero-one-qr-incoming-call-consent-lab-20261105`, not merged or publicly deployed. It is a temporary call experiment, **not** this full Secure Pair identity/Trusted Devices product. Do not silently conflate its 10-minute call QR with Secure Pair's planned 90-second enrollment QR.
- The OBD dashboard and Qwen AI gateway remain independent. Pairing grants **zero** automotive ECU permissions, device writes, account administrator rights or vehicle diagnosis authority.

## 1. Trust model
**A. Account identity:** The user expressly creates or uses an account Passkey using WebAuthn. A secure server verifies the entire authenticator assertion or registration against its own nonce and trusted registry. Required on account enrolment and relevant sensitive changes; not every routine reconnect. Synced passkeys are often usable on more than one phone and **must not** be mistaken for physical-device attestation. Face ID/fingerprint/PIN is mediated by the OS; biometric templates never go to E-ZERO.
**B. Device identity:** Each browser installation gets a distinct long-lived non-extractable P-256 signing CryptoKey and a public JWK / SHA-256 fingerprint. Keys are stored *only when user accepts trusted device enrollment* (e.g., same-origin IndexedDB with structured-clone CryptoKey); durability depends on browser data and OS, not guaranteed hardware backing. Device public keys are registered against an authenticated account. A copied/synced account Passkey is not proof of this installation's device key. Device key rotation is explicit and requires new session-bound approval.
**C. Transport:** HTTPS/WSS for signaling and WebRTC DTLS/SRTP/SCTP where connectivity permits; user-approved TURN is optional and can add usage cost. For an app-data relay, implement verified E2EE separately; TLS alone is not E2EE. Never assert caller identity until authenticated account AND device AND session binding are verified. The signing key for temporary call QR is not promoted into a trusted-device record.

## 2. WebAuthn RP / origin policy
- Initial prototype origin: exactly `https://coma39658-ctrl.github.io`; RP ID: `coma39658-ctrl.github.io` (no path). Pages hosted at `/null-bench/` may use this RP ID, not `workers.dev` because the page origin owns the WebAuthn ceremony.
- Server must reject unexpected `clientDataJSON.origin`, `type`, challenge, crossOrigin/topOrigin (unless explicitly supported), and bad `authenticatorData.rpIdHash`; require UP/UV flags as policy demands, verify COSE algorithm/public key signature and credential ID/user-handle ownership, and replay/counter/backup semantics.
- Registration must verify challenge/attestation statement per configured attestation policy, parse authenticator-data/CBOR safely with length limits, store public key and credential metadata only. Do not create an account from an unverified client-supplied `verified:true`.
- Assertion verification must bind the exact server challenge, expected account, RP ID and origin. Successful assertion grants a short account session token bound to the authorized HTTPS user/session and critical operation. HttpOnly Secure SameSite cookies on an appropriate same-site origin or explicitly reviewed proof-of-possession tokens; do not expose session tokens in URL/QR.
- A future custom domain migration will require reviewed RP ID/origin and credential migration or new enrollment; do not invent broad origin allowlists.

## 3. Session states (strict)
`CREATED → QR_ISSUED → SCANNED → B_VERIFIED → A_APPROVED → PAIRED → CHANNEL_CONNECTING → CONNECTED`.
Any state may transition to `EXPIRED`, `REJECTED`, `REVOKED` or `FAILED`, with no automatic access.
- `CREATED`: only an authenticated device A initiates session.
- `QR_ISSUED`: server stores a hash of a cryptographically random 128+ bit single-use token, random session ID, device A pubkey hash, account ID, `expires=issued+90s`, exact purpose `PAIR`.
- `SCANNED`: B uses QR once, signs server challenge with its per-installation key; if unregistered, B enrolls only after successful account authentication plus fresh B-side user verification.
- `B_VERIFIED`: server verifies B WebAuthn challenge/account and B device signature, confirms actual B user gesture (not a plain booleans from the page), and displays a clear human-readable request on A.
- `A_APPROVED`: A's session-bound device signature, fresh nonce and explicit UI approval, verified server-side. A sees verifiable peer label and cryptographic short comparison (optional but recommended for unfamiliar device).
- `PAIRED`: only after A and B *both* approve the **same** session, account, device keys and purpose. Mark QR consumed atomically; write the minimum encrypted/hashed trusted-device record.
- `CHANNEL_CONNECTING`: derive per-session key material, prove both endpoints, use encrypted WebRTC signaling. Do not silently open microphone/camera; browser permission remains explicit.
- `CONNECTED`: only if authenticated session and actual transport state connected. Never derive from QR scan alone.
- `REJECTED`, `EXPIRED`, `REVOKED`: terminal for this request, revoke tokens, close open channels, require new gesture for retry.

## 4. QR payload V1 — NO bearer account authorization
```json
{"v":1,"type":"EZERO_SECURE_PAIR_V1","sid":"<128-bit-random-ID>",
 "nonce":"<128+-bit-random-one-use-token>",
 "issued":0,"expires":0,"origin":"https://coma39658-ctrl.github.io",
 "purpose":"PAIR","aKeyHash":"<SHA256-of-public-device-key>"}
```
This JSON is illustrative fields, not an implemented credential. Use canonical bounded encoding and strict parser with explicit length (<=1024 bytes), server matching, single use and expiry **90s** measured from server time. Never include owner HMAC key, WebAuthn assertion, device private key, cookie, biometric sample, SDP, direct phone number or persistent account secret. A QR can be photographed/forwarded; both identities, signatures, session and two explicit approvals are required even after scanning. Do not let the caller invent arbitrary expiry.

## 5. Proposed API contract (not implemented)
- `POST /v1/pair/session`: authenticated A; create exact-purpose session and short QR challenge (rate-limited, <=90s).
- `POST /v1/pair/scan`: B; consume server-checked QR attempt, issue separate device and WebAuthn challenges; anti-replay before response.
- `POST /v1/webauthn/register/options` / `/verify`: enrolled account and fresh server challenge.
- `POST /v1/webauthn/assert/options` / `/verify`: verify RP/origin, UV and credential binding.
- `POST /v1/device/register`: public key plus signed binding to authenticated account/device.
- `POST /v1/pair/approve`: A or B signs `SHA256(protocol_version|sid|purpose|peer_key_hash|nonce|expires|decision)`; server verifies per-device key and the exact stage. No bare `approved:true` semantics.
- `GET /v1/pair/status?sid=...` or authenticated WSS events: only short status, no raw private identity data to outsiders; no background device polling by default.
- `POST /v1/pair/reject`: caller/recipient explicit reject, immediate invalidation.
- `POST /v1/trusted/reconnect`: known, unrevoked device; fresh mutual challenge signed by BOTH device keys; server role and policy checks; skip new QR, but never skip binding.
- `GET /v1/trusted/devices`: only authenticated account's devices and minimal user-defined display labels.
- `POST /v1/trusted/revoke`: passkey re-verification or other sufficiently strong existing account authority; immediate session and server-token invalidation, notify open transports, forbid reconnect. No access to ECU.
- `POST /v1/pair/rotate-device-key`: user-confirmed key replacement, logged and bound to fresh authentication; old key revoked.

No endpoint above is a live public capability. Sensitive endpoints require exact Origin, CSRF protections (if cookies), small request limits, per-account/per-device/per-IP and global quotas. Cloudflare DO transaction serializes token consume and pairing; no upgrade on an untrusted client boolean.

## 6. Trusted reconnect / revocation
Trusted record: immutable `account_id, device_public_key_hash, device_public_key, display_name, paired_at, last_seen, status, record_version` only; delete/revoke semantics defined. No private device keys at the server. Signed reconnect challenge has **fresh nonce, both keys, account, purpose and expiry**; verify server-side. Device A/B explicit approval for unusual location, changed keys or long-inactive devices; normal approved policy can allow one-tap connection.
When any device is lost/revoked: atomically update status to revoked; refuse all future reconnects, invalidate pending sessions and ask active clients to close. Network loss must not allow existing offline stale credentials to grant new access.

## 7. Human-first UX & accessibility
Main page: `Connect`, `Connected`, `Disconnect`. First-time: A tap Connect → QR → B scan → OS passkey/B user verification when needed → A Allow/Reject → automatic encrypted handshake. Already trusted: select trusted device → one tap reconnect; no passkey prompt if current policy safely permits it. QR scanner unavailable: share private short-lived deep link with **same** verification, no manual JSON. Status in Urdu and English initially, Arabic where existing E-ZERO UI already supports it. No generic "Error" and no sensitive data in logs or screenshots.
Meaningful reason codes: `NETWORK_UNAVAILABLE`, `QR_EXPIRED`, `QR_REUSED`, `ORIGIN_NOT_ALLOWED`, `RP_ID_MISMATCH`, `WEBAUTHN_INVALID`, `DEVICE_KEY_MISMATCH`, `PEER_APPROVAL_PENDING`, `USER_REJECTED`, `DEVICE_REVOKED`, `NO_ICE_ROUTE`. Single "Retry securely" creates a new session; never retries authorization silently.

## 8. Security / cost / launch gates
1. First verify and independently test WebAuthn verifier; no fake/prototype assertion in production.
2. Write failing negative tests for forged origin, RP ID, challenge, invalid signature, wrong key, expired and replayed QR, single-sided consent, revoked device, forwarded QR, stale reconnect and illegal ECU operations.
3. Use isolated test account and separate Cloudflare Staging, not the previous `ROOMS_ENABLED=false` public call Worker without an explicit reviewed rollout plan. Prefer existing bindings, strict 8-room cap, no extra paid services. No auto billing changes.
4. Validate actual Android Chrome and iPhone Safari Passkey ceremonies (may differ by platform); test QR camera unavailable and distant link; account for iOS background push limitations.
5. Verify audit, explicit device revoke, failure and cleanup; real WebRTC on WiFi and separate carriers with honest TURN cost/status; security review.
6. Public rollout only after full PASS evidence. **Until then NO production trusted-device persistence, NO account creation, NO public call rooms.**

## 9. Evidence labels as of document creation
- Design: SPECIFIED (not a test result).
- Existing signed ephemeral identity and simulated two-browser WebRTC: prior test PASS.
- One-QR prototype server-minted invite on local workerd: PASS, **but not V1 account authentication**.
- One-QR browser peer request and real Android + iPhone: under test / not verified.
- WebAuthn, trusted-device persistence, account-linked revocation, device-bound attestation: **NOT IMPLEMENTED**.
- Secure Pair V1 independent security review / public integration: **NOT STARTED**.

## Standards / platform sources
- W3C WebAuthn L3 Recommendation (2026): https://www.w3.org/TR/2026/REC-webauthn-3-20260825/
- Apple Passkey browser APIs: https://developer.apple.com/documentation/authenticationservices/passkey-use-in-web-browsers
- Cloudflare Durable Objects WebSockets: https://developers.cloudflare.com/durable-objects/best-practices/websockets/
- MDN Web Crypto non-extractable CryptoKey: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/generateKey

**No evidence of physical device pairing, biometric data handling, attestation or public release is implied by this specification.**

## 10. Next-stage isolated implementation evidence (2026-11-05)
**IMPORTANT:** all modules below are independent laboratory code. No authentication route was connected to the public or disabled Cloudflare call Worker. `ROOMS_ENABLED=false` remains unchanged. Proof and account authorizations are still DENIED even when signatures verify.

1. **WebAuthn authentication assertion verifier (partial):** `secure_connect/pair_v1/webauthn_assertion_verify_lab_v0_1.mjs`. A restricted ES256-only authentication verifier using a server-supplied, previously registered SPKI public key, strict 32-byte 90-second challenge, credential/account binding, exact `webauthn.get` type, exact `https://coma39658-ctrl.github.io` origin, exact `coma39658-ctrl.github.io` RP ID SHA-256 hash, UP/UV flags, backup flags, signature count and canonical DER signature converted for WebCrypto. Extension/attestation data and unsupported algorithms are deliberately rejected. Signed assertions return `authorized:false` until atomic nonce consumption, authenticated session issuance and registration provenance are implemented. Credential **registration** and complete FIDO metadata/CBOR/attestation support are not implemented; production should prefer a reviewed WebAuthn library.
2. **Persistent single-use challenge ledger (partial):** `secure_connect/pair_v1/pair_challenge_sqlite_lab_v0_1.mjs`, SQLite DO-compatible transactionSync + compare-and-set update with `RETURNING`, storing nonce hashes only. Expired/reused/wrong account or wrong credential challenges fail closed. Storage operations still return `authorized:false`. The caller **must** enforce account authentication and actual signature verification before invoking `consume`; this is not an exposed network API.
3. **Pending-only device registry (partial):** `secure_connect/pair_v1/trusted_device_sqlite_lab_v0_1.mjs` stores checked P-256 public-key SPKI and SHA-256 hash as **PENDING**, uniquely indexed, supports persisted one-way revocation and rejects restaging revoked keys. There is intentionally **NO method to activate a Trusted Device**, no real account ownership verifier, and no browser-facing management endpoint.
4. **Automated tests:** `tests/test_ezero_secure_pair_v1_webauthn_assertion_v0_1.mjs`, `tests/test_ezero_secure_pair_v1_sqlite_challenge_v0_1.mjs`, `tests/test_ezero_secure_pair_v1_sqlite_devices_v0_1.mjs`. The tests cover real WebCrypto signatures, user verification, challenge replay/expiry, wrong RP/origin, wrong account, failed credential lookup, persistent SQLite reload, twenty competing consume attempts, one-way revoke, and no implicit Trusted Device or ECU permission.

**Before calling Secure Pair V1 implemented:** add reviewed WebAuthn credential **registration** and challenge issuance; bind account authentication and session cookies/tokens to origin; create an atomic transaction recording both freshly signed device approvals, consuming the QR exactly once and activating only the intended records; verify immediate revocation across live connections; integrate with browser/PWA and independently test actual Android Chrome and iPhone Safari on distinct networks and constrained WebRTC/TURN paths. Retain `UNKNOWN/PARTIAL` for any unverified step.

**Standards:** W3C WebAuthn Level 3 (https://www.w3.org/TR/webauthn-3/), Cloudflare DO SQLite storage transaction docs (https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/).
