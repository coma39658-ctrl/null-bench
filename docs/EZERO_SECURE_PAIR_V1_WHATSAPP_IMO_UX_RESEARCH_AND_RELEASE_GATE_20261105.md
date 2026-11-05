# E-ZERO Secure Pair V1 — WhatsApp / imo Research & Easy-First UX Gate
**Date:** 2026-11-05 | **Status:** source-reviewed UX contract and isolated candidate; **NOT PUBLICLY DEPLOYED**

## Verified official product UX, not claims about proprietary internals
- WhatsApp Business help: [Link a companion phone with QR](https://faq.whatsapp.com/878854700132604/?cms_platform=android). A companion phone first displays a QR. The primary phone opens **Linked devices → Link a device**, authenticates locally by biometric or phone PIN where requested, and scans QR. No user-entered SDP/ICE JSON or manual digital fingerprint.
- WhatsApp help: [Manage/unlink linked devices](https://faq.whatsapp.com/1428782138011916/?cms_platform=web) and [About linked devices](https://faq.whatsapp.com/378279804439436/?cms_platform=android). Users review and revoke devices. Merely possessing a QR is not an appropriate account authentication substitute.
- imo official: [How to Log In to imo Web](https://imo.im/blog/guides/how-to-log-in-imo-web-browser) (2026-04-22), offering QR-based login or phone verification. A mobile imo account exists first.
- imo official: [Manage Devices](https://imo.im/en/faq/How-to-manage-devices-on-imo) including trusted-device selection, remove, and multi-device policy; [multi-device homepage prompt](https://imo.im/blog/features/imo-launches-homepage-prompt-feature) shows online device status and permits revocation.
- Cloudflare official: [Durable Objects Hibernatable WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), supporting real-time signaling and lower idle duration charges. This is an implementation candidate, not public proof.

**Boundary:** These are public user-visible procedures and documented features; we cannot inspect WhatsApp/imo private pairing key derivation or copy proprietary code. E-ZERO must implement its own reviewed security protocol.

## E-ZERO primary UX to ship only after safety/mobile gate
**Initial peer pairing**:
1. Phone B: **Show call/pair QR**. Nothing else, no account owner secret.
2. Phone A: **Scan QR once**. An explicit gesture opens camera only on A; if camera unavailable, a short private invitation link is the fallback. No manual JSON, SDP or peer fingerprint copy.
3. Both digital/device identities and account policy verify in the background. Phone B displays **Allow / Reject** with trusted display information; first-time account/device enrollment requires adequate local passkey/PIN verification and both sides' cryptographic approval.
4. Show **Connecting** until real WebRTC verified connected; never claim that QR or an accepted request is a live call.
5. **Connected → End call**; user can inspect **Trusted devices** and revoke access after genuine server-backed registration.

**Reconnection:** Trusted-device picker → Connect. Fresh server nonce, P-256 signatures by *both* device keys, unrevoked account/device registry. No repeated QR if existing session policy safely permits. Never turn a temporary call QR or local contact-list label into a permanent trusted device.
**Background:** Foreground tab can show live request; background/closed app requires separately consented push and platform-specific testing. Never promise WhatsApp-style ringing in the background in an untested PWA.

## New simplified UI in the isolated branch
- `ezero_secure_connect_live_p2p_v0_1.html`: One-QR section appears immediately after welcome, before all older tools. `#oneQrAdvanced` contains the old manual identity and copy/paste offer/answer paths under an optional summary; no lost functionality.
- `js/ezero_secure_connect_one_link_lab_v0_1.js`: dedicated compact QR camera slot reuses the original bounded camera scanner and the same signed SHA-256 identity verifier; Cancel closes the existing stream; all user-visible strings support Urdu/English/Arabic.
- Core QR UI: `Show my QR`, `Scan QR`, `Accept`, `Reject`, `End`, readable status, and privacy action only.
- `css/ezero_secure_connect_live_p2p_v0_1.css`: touch-friendly scan area; advanced tools remain reachable, but hidden by default.
- `tests/test_ezero_secure_connect_one_link_browser_v0_1.mjs`: checks no manual JSON visible by default and verifies one-tap camera/cancel + actual two-browser encrypted WebRTC. Separate old regression tests explicitly expand advanced tools to guard backward compatibility.
- Broken-camera or remote fallback `#oneQrShareLink`: after the host creates an ephemeral room, **one user click** invokes the platform's native share sheet or copies the private URL. It never displays raw SDP/ICE or the Cloudflare operator secret. The guest opens the link; the same signed identity and host approval still apply. The bearer link may be forwarded; it is not verified identity nor credential enrollment.
- A browser-based camera cannot be relied on while the page is backgrounded. The foreground call request must show only when open; real mobile background use is a separate push/consent feature, not yet supported.

## Distinguish current call QR and future permanent device pairing
- The current *experimental temporary 1:1 calling* link has up to 10-minute lifetime, signed ephemeral P-256 identity and session AES-GCM encrypted SDP. The sole holder of a forwarded link could still try to request guest seat; receiver's consent is essential. This is NOT automatically a verified person, a real account, an enrolled device, or a 90-second single-use Secure Pair V1 registration.
- The separate *planned device-enrollment QR* must expire in roughly 90 seconds, be server-consumed atomically one time, bind a verified account and both device keys to the session, and require server-validated passkey plus two mutually signed approvals; do not reuse the calling bearer as an enrollment credential.
- In the current lab, both device-signature ledger signatures produce `BOTH_SIGNED_UNAUTHORIZED` and `authorized:false` until the complete reviewed account/credential/session path exists.
- Native platform biometric prompts can only be requested through supported WebAuthn ceremonies, not by taking fingerprint images, and may require an additional explicit user action.

## Test / public release gates
1. **Regression:** automatic QR one-accept and optional manual fallback both pass synthetic Chromium. Microphone remains off before explicit call consent. CSP stays strict; no logs/analytics of QR.
2. **Security:** synthetic ES256 WebAuthn and vetted CBOR registration tests pass; these are not independent proof that actual iOS passkeys are ready.
3. **Persistence:** SQLite account challenge and pending-only device registry reject replay, invalid device, expired nonce, revoke and account mismatch; signed bilateral approval cannot self-activate trust.
4. **Real devices:** Android Chrome and iPhone Safari, phone A/B roles, camera fails, remote link, phone browser closed/background, weak network, media permission denied, genuine WebAuthn biometrics, repeated QR and revoked devices must be independently verified.
5. **Security review:** real account authenticator registration/assertion server, safe cookie/token issuance, per-account session state, atomic challenge consumption across components, device key rotation and revocation, WebRTC/TURN costs and honest E2EE claims.
6. **Only then:** explicit public merge/deploy approval and measured low-cost Cloudflare plan. Keep `ROOMS_ENABLED=false` until all required checks pass.

**Evidence vocabulary:** SPECIFIED ≠ TESTED_IN_SIMULATION ≠ VERIFIED_ON_PHYSICAL_PHONES ≠ PUBLIC_DEPLOYED.
