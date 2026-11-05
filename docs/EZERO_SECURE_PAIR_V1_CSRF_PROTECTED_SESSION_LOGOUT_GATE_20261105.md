# E-ZERO Secure Pair V1 — Same-Origin CSRF-Protected Logout Gate
**Date:** 2026-11-05  
**Development status:** isolated synthetic/SQLite laboratory PASS  
**Production deployment status:** NO-GO; Draft PR #65 unmerged; public Cloudflare rooms disabled.

## Why this stage matters
An HttpOnly session cookie is sent automatically by a browser. Even with SameSite=Strict, a state-changing production endpoint needs exact-Origin checks and a separately bound CSRF mechanism. Existing lab session verification intentionally allowed GET observation only; it did not have a browser-initiated mutation for secure logout.

The objective is **one simple “Log out” action** in a future app, not a technical page asking the user to type tokens or use Termux. All CSRF and cookie checks happen behind the scenes.

## New source changes
- `secure_connect/pair_v1/account_session_guard_sqlite_lab_v0_1.mjs`: separate 256-bit random CSRF synchronizer token, domain-separated SHA-256 verifier in the new SQLite `ezero_v1_session_csrf_lab` table. The server-side `logoutOwnSessionWithCsrfLab` requires a *matching* host-only session cookie, distinct CSRF token, **exact HTTPS Origin** and **POST**. It transactionally checks the session, account and passkey are active and unexpired before setting `revoked_at`. Only a future trusted server may use `serverOnlyClearCookie` as its `Set-Cookie` header. This method **does not** authorize a call, pairing or other state change.
- `secure_connect/pair_v1/passkey_atomic_finish_sqlite_lab_v0_1.mjs`: when the optional observe-only session path verifies a real WebAuthn assertion, challenge consumption, authenticator counter advancement, session-secret digest storage, and independently hashed CSRF synchronizer storage all commit in **one SQLite transaction**. Any failure rolls back all records. The CSRF token is returned as `serverOnlyCsrfToken` only to a future same-origin trusted response builder, **not** a URL, log, cookie or public API. No such route is exposed yet.
- `tests/test_ezero_pair_v1_session_guard_sqlite_v0_1.mjs`: wrong/missing/reused CSRF, stolen cookie without CSRF, wrong origin, GET instead of POST, duplicate cookie, replayed logout, immediate revocation and restart persistence.
- `tests/test_ezero_secure_pair_v1_webauthn_reg_to_login_v0_1.mjs`: cryptographically verified synthetic ES256 registration → login → hash-bound session and CSRF in SQLite; injected failure of the CSRF `INSERT` proves counter and nonce roll back; 20 concurrent login finishes produce one success. Correct CSRF logout invalidates the cookie; replay and cross-origin attempts fail.

## Test evidence
**GitHub Actions run [42051040410](https://github.com/coma39658-ctrl/null-bench/actions/runs/42051040410):** two independent jobs **PASS**. The browser job covers the security tests, QR UI, one-accept synthetic phone views, and previous regressions. The second runs the existing real Cloudflare `workerd` on **localhost only**. Cloudflare production was NOT modified.

## Why public release remains blocked
1. Current account rows are `PREVERIFIED_LAB_ONLY` test fixtures. Independent account ownership, recovery, and approved onboarding do **not exist** in this release candidate.
2. The GitHub Pages RP/Origin and `*.workers.dev` host are distinct. The future authenticated frontend/API must live at ONE stable same-origin HTTPS host; finalize hostname and WebAuthn RP ID before enrolling real users.
3. The CSRF-verified method only revokes the *requesting* observe-only session. Full session issuance, secure router/CSP/CORS/no-store policy, account recovery, rate limits, revoked-phone active-call eviction and a full audit still require implementation.
4. Device registry remains `PENDING` or `REVOKED`; a two-signature evidence candidate is NOT active Trusted Device pairing. One-use 90-second enrollment QR consumption and truly atomic activation need review.
5. Physical Android Chrome/iPhone Safari, different networks and telecom providers, microphone/camera permissions, background limitations, TURN reliability/cost and recovery testing remain unverified.
6. `ROOMS_ENABLED=false`, Draft PR, and the automated public GO/NO-GO gate stay in force.

## User experience goal
**First pairing:** Open app → Show/Scan one QR (or send a private link) → approve → show Connected only after measured secure transport.
**Later:** Trusted Devices → Connect → approve when policy requires → Connected.
**Safety:** No manual passwords in chat, no QR or session token in logs, no unapproved ECU access and no public deployment on synthetic-only evidence.

## External standards
- OWASP CSRF Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OWASP Session Management: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- W3C WebAuthn: https://www.w3.org/TR/webauthn-3/
