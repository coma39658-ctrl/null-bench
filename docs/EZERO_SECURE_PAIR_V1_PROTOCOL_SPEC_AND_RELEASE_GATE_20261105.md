# E-ZERO Secure Pair V1 — Protocol Specification and Release Gates
**Date:** 2026-11-05 | **Status:** PROPOSED / NOT IMPLEMENTED END-TO-END
**Owner project:** E-ZERO | **Existing integration:** `ezero_secure_connect_live_p2p_v0_1.html` and isolated Cloudflare call-room lab.
This is a separate pairing protocol, not proof that the current one-QR call lab already provides passkeys, trusted devices, or account security.

## 1. Separation of responsibilities
- **Account identity:** WebAuthn passkey credential bound to a server account and a verified RP ID. Synced passkeys are not proof of a particular physical device.
- **Device identity:** separately generated device signing key; public-key fingerprint and rotation/revocation state. Browser non-extractable WebCrypto keys are not guaranteed hardware-backed, and are not guaranteed to survive cleared site data.
- **Session transport:** short-lived authenticated session key, encrypted WebRTC DataChannel or independently authenticated E2EE relay. HTTPS/WSS alone is not E2EE.
- **OBD:** pairing never authorizes ECU access, writes, diagnostic execution, or background polling; separate explicit one-shot read-only consent remains required.

## 2. State machine
`IDLE → CREATED → QR_ISSUED → GUEST_CHALLENGED → GUEST_VERIFIED → HOST_APPROVAL_PENDING → MUTUALLY_APPROVED → CHANNEL_AUTHENTICATING → CONNECTED → ENDED`.
Alternate terminal states: `EXPIRED`, `REJECTED`, `REVOKED`, `FAILED`.
Server checks a monotonic transition with expected state and version, atomically, in a Durable Object. Approval is bound to `session_id, account_id, device_id, ephemeral_public_keys, purpose, expiry, protocol_version`. No unilateral approval transitions to CONNECTED.

## 3. Proposed API (not implemented)
- `POST /v1/pair/sessions`: authenticated host creates a 90-second, one-use QR challenge; rate limited.
- `POST /v1/pair/sessions/:id/join`: guest submits one-use nonce, device public key and signed challenge, not a raw bearer-only grant.
- `POST /v1/pair/sessions/:id/approve`: host's explicit consent and signature over exact session transcript; guest must also approve with account/device binding.
- `POST /v1/pair/sessions/:id/reject`: explicit rejection.
- `POST /v1/pair/sessions/:id/finish`: mutual authenticated key confirmation and consume-once QR.
- `POST /v1/devices/register`: user-authenticated device public-key registration.
- `POST /v1/devices/:id/revoke`: owner-authenticated revocation, active session invalidation.
- `POST /v1/devices/:id/reconnect`: fresh two-sided nonce challenge, signed by registered device keys; no QR when policy permits.
- `POST /v1/auth/webauthn/options` and `POST /v1/auth/webauthn/verify`: server-generated challenge, strict signature/counter/credential binding checks.
- `GET /v1/pair/sessions/:id/events`: origin-bound authenticated WebSocket for minimal signaling; strict per-session ACL and expiry.
All endpoints require appropriate auth, rate limiting, origin controls, size limits and audit metadata without keys, biometrics, or raw SDP. Exact API names and payloads are design proposals.

## 4. QR payload
`{v:1,session_id:<random 128+ bits>,nonce:<random 128+ bits>,host_ephemeral_public_key:<key>,expires_at:<server timestamp>,origin:<canonical origin>,purpose:"pair-device"}`, signed/bound by server and host device key. QR is a discovery capability, **not authorization**. No private key, biometric, account secret, long-lived device credential, or personal data. Expiry ~90 seconds, consume-once server-side, fresh retry. QR forwarding can still expose a challenge: reject unauthorized joins via device binding, host and guest explicit consent, and transcript verification.

## 5. WebAuthn verification
Server creates unpredictable challenge bound to account and pending pairing. Verify exact `clientDataJSON.type`, challenge, expected `origin`, authenticatorData `rpIdHash`, UV/UP flags according to policy, signature with registered credential public key, credential ownership, algorithm allowlist, and signCount with clone-detection limitations. Prevent duplicate challenge and expired assertions. Server stores public credential material, not biometrics.

## 6. Device keys and reconnect
Register a distinct device signing public key after user authentication. Require proof-of-possession; private keys remain local. Browser keys are not automatically hardware-backed or guaranteed durable. Reconnect uses fresh server nonces and mutual signatures tied to registered device IDs, session purpose and ephemeral ECDH transcript. Validate revocation status online, deny stale replay, rotate compromised keys, and require fresh explicit consent for sensitive actions. Revoked devices lose reconnect privileges; already-open sessions are terminated.

## 7. Threats and explicit failure modes
- Expired/reused QR: reject; show one-tap retry.
- Forwarded QR: never treat QR possession alone as identity or consent.
- Origin/RP ID mismatch or invalid WebAuthn signature: reject.
- Unknown, replaced, rotated or revoked device key: reject and require full fresh pairing.
- One-sided approval: pending then expire/reject; never connect.
- Race/replay/duplicate join: atomic consume-once in DO; bound nonce and transcript.
- Network loss: close/expire room, clear temporary secrets and media tracks; offer fresh retry.
- Background/mobile browser limits: no promise of incoming ring when page closed; optional push later only with consent.
- Remote connectivity: measure STUN/TURN reachability and cost; E2EE must not rely solely on TLS or TURN.
- No evidence that this protocol prevents a compromised phone, shoulder surfing or maliciously forwarded QR without user checks.

## 8. UX (three actions maximum, only when necessary)
First time: **Connect → Scan one QR → Approve** on receiver; originator approves new device as well. Platform may require Face ID/fingerprint/device PIN through WebAuthn; no biometric data transferred.
Trusted reconnect: **Trusted devices → Connect**, with cryptographic checks and policy-based confirmation; no automatic privileged access.
UI states: `Connect / Connecting / Approval required / Connected / Disconnect / Retry`. Hide raw SDP, JSON, secret, fingerprint except optional safety comparison.

## 9. Test matrix / release gates
All expected, not current PASS:
- Valid fresh QR + both signed approvals: PASS expected.
- Expired, reused, forwarded-to-unauthorized-device QR: REJECT expected.
- Invalid WebAuthn signature, challenge, origin, RP ID, credential binding: REJECT expected.
- Wrong, revoked, rotated device key: REJECT expected.
- One-sided approval, replay, duplicate race: REJECT expected.
- Trusted reconnect with fresh challenge: PASS expected; revoked reconnect: REJECT expected.
- Different networks, Android Chrome, iPhone Safari, background limits, network drop: physically test.
- OBD without explicit read-only permission: REJECT expected.
- Real E2EE and signed session transcript: independent review required.
Release only after full security review, Android + iPhone device tests, bounded Cloudflare cost and production configuration approval.

## 10. Existing-code compatibility and current evidence
Current `null-bench` one-link call lab uses ECDSA-signed browser identities, AES-GCM encrypted SDP, WebRTC, and Cloudflare DO admission; **it is NOT the V1 WebAuthn/trusted-device pairing protocol**. The one-QR pilot branch `ezero-one-qr-incoming-call-consent-lab-20261105` added an experimental server-minted room proof and foreground receiver approval. In GitHub run 42024303375, the real local Worker job passed; two-Chromium one-QR browser job FAILED with a timeout waiting for the receiver's incoming request. This failure must be investigated before any claim of functional one-QR UX. Production and public Cloudflare rooms remain disabled in source. No merge or deployment authorized by this specification.

## 11. Implementation order
1. Keep existing branches and functionality unchanged; diagnose failing one-QR browser test.
2. Add negative tests for expired/reused/forwarded QR and approval race.
3. Add server-side pairing state machine and transcript signatures in isolated staging.
4. Add WebAuthn registration/assertion with exact RP ID and origin checks.
5. Add device registration/revocation and fresh-challenge reconnect.
6. Test actual Android Chrome and iPhone Safari, including remote networks and permissions.
7. Conduct security review and obtain explicit production-release approval.

## 12. Trusted reconnect signing scaffold — implementation evidence (2026-11-05)
- `secure_connect/pair_v1/trusted_reconnect_proof_v0_1.mjs` introduces a versioned, domain-separated reconnect transcript binding **both** device key hashes, both nonces, one server nonce, server session ID, account ID, issue/expiry, purpose and device roles.
- Independent ECDSA P-256 device signatures are checked against **server-supplied** public-key registry records; unknown/revoked/rotated keys, wrong account, wrong purpose, expired transcripts or altered peer/nonces fail. No public or network code imports this lab module.
- Signature validity deliberately returns `authorized:false`. The included replay gate is **in-memory for tests only** and always returns `authorized:false`; a real system needs an atomic Durable Object challenge-consumption transaction, verified WebAuthn account session, account/device registry, independent user consent, revoke propagation and security review.
- `tests/test_ezero_secure_pair_v1_trusted_reconnect_v0_1.mjs` runs positive and adversarial crypto/nonce/revoke/expiry tests in CI. GitHub Actions [42028911897](https://github.com/coma39658-ctrl/null-bench/actions/runs/42028911897) completed with both job groups **PASS**, including the preexisting 2-browser QR WebRTC and local workerd regressions.
- This is a **LAB PROOF STEP ONLY**, not a deployed Trusted Devices feature, not a biometric/passkey implementation and not a grant of E-ZERO OBD access.
