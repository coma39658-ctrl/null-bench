# E-ZERO Secure Pair V1 — Same-Origin HTTP Session Boundary Laboratory
**Date:** 2026-11-05 | **No public deployment** | **Owner-approved staged development**
**Working Draft PR:** https://github.com/coma39658-ctrl/null-bench/pull/65

## Why this phase is necessary
The QR/Passkey/device proof modules already work in restricted unit and localhost browser simulations. A public system needs a **trusted HTTPS request boundary** that checks real HTTP method, Origin, Fetch Metadata, host, CSRF and cookies *before* doing even a narrow state change. This phase implements that boundary as a **module with no attached public Worker fetch listener**, and deliberately limits it to read-only status and own-session Logout.

### Isolated adapter
`secure_connect/pair_v1/same_origin_session_http_lab_v0_1.mjs`

- `createSameOriginSessionHttpLab({storage,serverOrigin})` constructs an injected test-only SQLite Durable Object session guard; the HTTPS origin is configured by the *server*, never taken from client claims.
- `GET /api/ezero-pair/v1/session/status`: observe-only session status, with no account ID, credential, token or trusted device rights in the response. Exact Origin is accepted; when browsers legitimately omit `Origin` on same-origin GET, `Sec-Fetch-Site: same-origin` is accepted as a separate read-only proof of source (requests without both are denied).
- `POST /api/ezero-pair/v1/session/logout`: requires exact HTTPS Origin **and** the host-only HttpOnly session cookie **and** a separate `X-EZERO-CSRF` synchronizer token; a successful transaction revokes exactly the requesting session and returns a server-only `Set-Cookie` clearing header. A missing Origin cannot be excused by `Sec-Fetch-Site` for a mutation.
- Never accept `same-site`, `cross-site`, unknown target host, URL query/hash, proxy-supplied forwarding headers, request bodies, unexpected methods or CORS preflight.
- Every response uses `Cache-Control: no-store, private, max-age=0`, `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy: same-origin`, `Vary: Origin, Sec-Fetch-Site`. No CORS allow-origin and no session/CSRF secrets in JSON or logs.
- **Every other route** including registration, login, phone pair, device activation, remote call and account recovery is **404 / NOT AVAILABLE**. The module has no deployment, no route registration, no automatic user account or auth session creation.
- The same-origin router does **not** make the existing Github Pages domain equal to the Cloudflare Worker domain. A stable canonical origin, final RP ID and private tested deployment are required before any real WebAuthn/passkey enrollment.

### Tests
`tests/test_ezero_pair_v1_same_origin_http_lab_v0_1.mjs`: genuine Node 22 `Request/Response` objects and real SQLite seeded lab session. Exercises normal same-origin status, missing GET Origin with strict Fetch Metadata, missing both, wrong/forged host, wrong Origin, cross-site/same-site requests, wrong cookie, missing/wrong CSRF, nonempty POST body, no CORS, no-store, 20 racing logout requests with exactly one success, and restart persistence of revocation. Verifies there is no login, account-bootstrap, call or trusted device API.

CI: `.github/workflows/ezero_one_qr_one_accept_lab_20261105.yml` enforces this contract plus all earlier Passkey, SQLite, two-browser encrypted WebRTC and actual *localhost-only* Cloudflare workerd tests.

### Release status
- **PASS (lab only):** existing authenticated cryptographic proof, SQLite persistence, one-tap QR/receiver accept, same-origin status/logout adapter once CI verifies it.
- **PARTIAL:** HTTP adapter is not wired to deployed Worker or real sessions.
- **BLOCKED:** actual independently verified account enrollment and recovery; safe production session issuance and CSRF token delivery; stable canonical domain and new WebAuthn RP; atomic activation, 90s enrollment QR consume and revocation/active-call eviction.
- **UNKNOWN:** Android/iPhone physical cross-network/WebAuthn, TURN and realistic mobile connectivity.
- **NO-GO:** public call rooms or trusted-pairing app; `ROOMS_ENABLED=false` unchanged, PR remains Draft.

### Standards / documentation
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Sec-Fetch-Site](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site)
- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [W3C WebAuthn](https://www.w3.org/TR/webauthn-3/)
