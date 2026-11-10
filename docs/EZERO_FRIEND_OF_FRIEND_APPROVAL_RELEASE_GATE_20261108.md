# E-ZERO Secure App — Friend-of-Friend Owner Approval (2026-11-08)

**State: DRAFT security candidate. Code and isolated tests only. NOT deployed.**
**Base:** signed public contact forwarding candidate, PR #128.
**Unchanged:** successful one-QR calling engine, public landing/call entry, existing Cloudflare room Worker, Render two-phone preview, private chat, media, contacts/trust database.

## Intended one-screen user story

1. Ali explicitly allows sharing a self-declared **owner-signed 24-hour contact card** with his E-ZERO identity. A saved friend Ahmad forwards Ali's public link to Bilal through WhatsApp, IMO, or E-ZERO.
2. Bilal opens the link; the browser checks Ali's signed digital identity, same website origin, validity and expiration. Bilal signs into his **own stored device key**, consents to disclose his chosen name and public fingerprint, and taps **Request contact**.
3. The isolated Cloudflare Durable Object verifies Bilal's **fresh P-256 signed challenge**, validates Ali's signed and unexpired card, enforces request cooldown, and delivers a **nonpersistent** request to Ali's **currently open and explicitly enabled** inbox. No background service or offline inbox is claimed.
4. Ali reads Bilal's self-declared name and fingerprint, and explicitly taps **Approve** or **Reject**. Server checks that Ali is authenticated as the original signed contact owner. **Approval alone does NOT make a trusted friend**.
5. If approved, Ali can separately tap **Audio** or **Video invitation** to start the **existing unchanged signed QR WebRTC call engine**. Only a NEW invite after `ezero:auto-call-starting` may be forwarded to the ONE approved pending browser, once, using the same-origin strict room capability.
6. Bilal sees **Open approved secure call invite**. A further explicit tap opens the unchanged signed guest call page; the guest must still accept and grant camera/microphone permission through the existing call controls. Both phones may save as friends only after actual verified connection and the established mutual-save consent flow.

## Cryptographic and privacy gates

- Owner and visitor independently authenticate over WSS with an ECDSA P-256 signature of a fresh, target-bound, origin-bound, role-bound, timestamped server challenge. The public key's SHA-256 must match the declared 64-hex device ID.
- Forwarded owner contact card is signed by the owner device and binds owner's identity/name/consent/expiry. The server independently verifies this card before relaying any request.
- Expiration: 20-second unauthenticated deadline, 2-minute visitor socket, 20-minute explicit owner inbox session, 24-hour signed share card.
- A requester may make one request per socket; dedupe/cooldown prevents the same device identity or request ID from flooding a target for 10 minutes. Message cap: 30 per socket per minute; socket cap: 6 per target.
- Server storage contains only bounded, temporary replay/cooldown metadata (pseudonymous device fingerprint, random request ID, expiry). It **never stores** names, public contact cards, private keys, room capabilities, SDP, chat content, audio/video or photos.
- Server memory and socket attachments can hold transient requests and a room capability while delivering to the approved browser. Cloudflare can observe this signaling; it is not an independently audited E2EE messaging service.
- Browser UI renders untrusted names via `textContent`. No cross-origin URLs, unapproved offers, auto-calling, automatic microphone activation or automatic friend trust.
- Blocked contacts remain blocked by the local client. Server-side global abuse control and explicit revocable owner allow/block lists are still required before launch.

## Default OFF

- `js/ezero_contact_request_inbox_config_20261108.js` has `enabled:false` and an empty WebSocket origin.
- A **new** Cloudflare Worker config is `signaling/cloudflare/wrangler.contact-requests-lab-20261108.jsonc`, with a distinct Worker/service name and Durable Object class.
- Public and already deployed Workers are untouched. No real owner/visitor traffic can flow without separately enabling and deploying a stage backend.
- The live test URL remains on its **previous** successful Render commit until a deliberate tested preview release.
- Render and GitHub Pages use different origins and call paths: each requires its **own exact-origin** stage configuration, CSP and Worker. Never reuse the GitHub Pages Worker across unrelated origins.

## Security test scope

`node tests/test_ezero_contact_request_inbox_stage_20261108.cjs`
uses generated nonextractable browser-compatible P-256 keys and an in-memory Durable Object fixture, testing:

- foreign Origin, secret query URL and non-WebSocket upgrade rejection;
- unauthorized owner impersonation and malformed challenge rejection;
- sender's signed identity and owner's signed contact card validation;
- owner offline: no stored pending request; live owner: verified one-shot request only;
- explicit denial and approval, role segregation, one-time decision;
- duplicate sender and request-ID cooldown; DOM receives public name only;
- approved-only single signed audio link relay; forged external URL, wrong call mode, rejected recipient and repeated link relay denied;
- Cloudflare hibernation-style socket-attachment reconstruction;
- pending auth expiration without disconnecting valid owner, malformed JSON flood, oversized frame and bounded owner session.

`tests/test_ezero_contact_request_ui_browser_20261108.mjs`
uses a real local headless Chromium mobile viewport to check that the public page stays unchanged without opt-in, the separate stage controls are visible only in contact mode, and disabled server configuration causes **zero WebSocket connections, zero media capture and zero trusted-friend grants**. This is simulated browser testing, not two physical phones or a deployed Cloudflare Worker.

## No-go release criteria

1. Staged Worker **not deployed** until bounded edge/global IP or identity handshake controls, cost limits and Cloudflare secret review are ready.
2. Physical real-two-phone test must verify forward link across WhatsApp/IMO, self-signed guest request, owner explicit approval/reject, guest one-tap call invite, real WebRTC audio/video and privacy/blocked cases on Android and iPhone/cross-network.
3. Fix browser push, durable background delivery or offline queues only via a separate opt-in/privacy-reviewed design. Do not imply them now.
4. Capture final signed regression, CodeQL and public CSP/headers; ensure a tested rollback. No production publishing before explicit release review.

References: [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html); [Cloudflare Durable Object hibernatable WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/).
