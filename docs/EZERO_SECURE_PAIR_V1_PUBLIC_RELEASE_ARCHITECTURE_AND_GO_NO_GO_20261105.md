# E-ZERO Secure Pair V1 — Public Release Architecture and GO/NO-GO
**Date:** 2026-11-05
**Current decision:** **NO-GO for live account pairing or Cloudflare public call rooms**; local proof advances safely.
**Working PR:** https://github.com/coma39658-ctrl/null-bench/pull/65 (DRAFT, unmerged)

## User contract: WhatsApp-simple, independently implemented
First use: **Show QR → Scan QR (or share private link if camera broken) → Check/Allow → Connected** only after verified WebRTC transport. Following uses: **Trusted Devices → Connect → Allow → Connected**; no manual SDP/ICE JSON or 64-character operator secret. App-level grants are NOT implied by QR possession, a synthetic key signature or test fixture.

## Verified foundation (synthetic or localhost only)
- Native-style one-QR/one-accept WebRTC in mobile Chromium: automatic encrypted offer/answer signaling, signed P-256 ephemeral identities, user-driven microphone/camera, stop/cancel, camera-broken private link, old manual fallback.
- Cloudflare workerd local-only testing: one-room invite and receiver consent. Original `ROOMS_ENABLED=false` remains unchanged; test-only localhost may override it.
- Vetted SimpleWebAuthn v14 ES256 registration and login, exact server-issued challenge, Origin and RP ID, UV, COSE/credential registry, signature-counter and challenge atomic SQLite persistence.
- Both signed peer approvals, pending keys, revoked device/account checks and an evidence-only atomic join; no Trusted Device grant.
- **NEW:** `account_session_guard_sqlite_lab_v0_1.mjs` checks 256-bit opaque session secrets as domain-separated SHA-256 token verifiers; host-only `__Host-` cookie structure, exact HTTPS Origin, 15-minute maximum / 5-minute idle limits, account/credential revoke, replay and persistent logout. This guard NEVER grants access and refuses mutation requests without future audited CSRF handling.
- **NEW:** `PairV1SqliteAtomicPasskeyFinishLab.finishForObservationSessionLab` optionally commits a hashed **observe-only** 256-bit cookie verifier in the **same SQLite transaction** as a verified WebAuthn assertion's counter advance and challenge consume; error/duplicate rejects and rolls back all changes. It is explicitly NOT an authenticated production session or device-trust activation. Caller has no public HTTP route; its cookie value may be returned ONLY as a `Set-Cookie` response by a future trusted same-origin server, never JSON/log/localStorage/QR/redirect.

## Critical architecture choice: SAME ORIGIN for authenticated app
**Currently:** WebAuthn experimental RP ID = `coma39658-ctrl.github.io` and expected Origin = `https://coma39658-ctrl.github.io`. The signaling Worker is under `*.workers.dev`. A Worker on `workers.dev` cannot issue a `__Host-` cookie for the `github.io` host. Using browser JS tokens/localStorage or cross-site cookies as shortcuts would weaken security and may fail due to third-party cookie blocking.

**Recommended release structure** (host/domain still to be verified):
1. Keep existing GitHub Pages E-ZERO/Null Bench as a public informational shell and safe navigation entry; do not silently replace it.
2. Host the dedicated authenticated Secure Pair frontend, exact RP-ID bound WebAuthn ceremony routes, and authorized pairing/calling backend **under one HTTPS host** using Cloudflare Workers Static Assets + Worker API routes + SQLite Durable Object namespace. A stable owner-controlled custom domain is preferable for production; a `workers.dev` pilot host needs its own independent platform/security checks and could require passkey re-enrollment if origin/RP-ID changes.
3. Before enrollment, choose the canonical hostname, update `PAIR_V1_ORIGIN` and `PAIR_V1_RP_ID` across frontend/backend, regenerate test fixtures, and test native passkeys on the final origin. Never copy an old `github.io` credential to a different RP ID or silently accept another Origin.
4. Secure cookies: `Secure; HttpOnly; SameSite=Strict; Path=/`, no Domain, server-side only; exact Origin/CSRF token enforcement for state changes; rate limits, recovery, logout, revoke all sessions, no-store on sensitive responses.
5. Separate the **10-minute temporary CALL-room private link** from the future **90-second one-time account DEVICE-ENROLLMENT QR**. The former is a bearer invitation and can be forwarded; it MUST NOT add Trusted Devices.

**Official references:** OWASP session management (https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet), Cloudflare Workers static assets (https://developers.cloudflare.com/workers/static-assets/), Worker custom domains (https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), SQLite Durable Objects transactions (https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/), W3C WebAuthn (https://www.w3.org/TR/webauthn-3/).

## Public release gates and honest status
| Gate | Pass criteria | Current evidence |
|---|---|---|
| Static UX and encrypted browser lab | One QR, one accept, camera-broken link, cancel/media consent, no manual SDP, negative checks | **PASS — synthetic/local** |
| SQLite cryptographic registries | Registration→auth, counter, challenge, both device signatures, negative replay/expiry/revoke | **PASS — synthetic/local** |
| Secure account ownership and recovery | Real user proves control, recovery and lockout no client `verified` flag | **NOT IMPLEMENTED** |
| Trusted Account Session | Account session issued after verified ownership, secure same-origin cookies, strict CSRF, rate limits and revoke propagation | **PARTIAL — observation-only lab** |
| Trusted Device Activation | Atomic single-use 90-second enrollment QR + owner session + both signed approvals + device activation/revoke | **NOT IMPLEMENTED** |
| Same-origin production host & RP | Stable canonical origin with HTTPS, confirmed DNS or approved workers.dev pilot, final-origin passkey tests | **UNDECIDED/UNKNOWN** |
| Two physical phones | Android Chrome and iPhone Safari (or available alternate platforms), distinct networks, camera broken, permissions, background/closed tab, call end | **NOT VERIFIED** |
| TURN/network/cost | Cross-carrier WebRTC route, bounded free/paid use, rate limit and abuse guard | **UNKNOWN** |
| Security/privacy review | Threat model, account takeover, revoked device immediate eviction, no secret leaks, signed release approval | **NOT VERIFIED** |

**Conclusion: current public auth/calling remains NO-GO.** Even all green GitHub tests cannot prove real phone behavior or a production account session. This doc is a build and release target, not permission to deploy unsafe unfinished features.

## Next concrete implementation path
1. Choose and verify stable same-origin HTTPS hostname for the authenticated pilot; preserve the old GitHub Pages public site.
2. Implement independently verified account bootstrap/recovery and user-controlled consent without exposing secrets.
3. Add backend HTTP router and WebAuthn begin/finish with atomic session issuance **on the final origin**, CSRF/Origin/rate-limit policy and no-store; no production issue until review.
4. Add one atomic Durable Object device-trust transition, real revocation/active call eviction and truly one-time 90s QR binding two device keys.
5. Enroll/test actual Android+iPhone, remote cellular/Wi-Fi, user-driven media, lost/compromised phone and broken-camera link.
6. Review performance/security/cost, stage limited pilot, then merge and publicly enable calling ONLY on explicit final release check.

## Safety invariants
- Account, call and OBD authorization are independent. E-ZERO OBD stays authorized, one-shot, read-only Mode 01/03/09; NEVER Mode 04, writes or actuation.
- No secret/token in repository, URL query, browser console, analytics or logs.
- Negative cases fail closed with clear Urdu error/status. Public user sees simple buttons; technical evidence and manual testing remain optional.
