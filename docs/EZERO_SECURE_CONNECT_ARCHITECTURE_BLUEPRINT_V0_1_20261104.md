# E-ZERO Secure Connect — Research & Architecture Blueprint V0.1
Date: 2026-11-04 | Status: RESEARCH_CANDIDATE — NOT DEPLOYED | Owner: E-ZERO

## 1. Purpose / مقصد
Browser-first, permission-first, low-bandwidth, lawful communication for 1:1 calls, group audio/video, images/video, voice notes, text and single-view temporary content. E-ZERO AI Studio and existing public website stay unchanged during research. The communications service is a separate security boundary; it must NOT reuse OBD evidence data, Qwen tokens or existing AI session credentials.

**No claims of zero hacking risk, perfect anonymity, deletion of third-party copies, guaranteed VPN-free connectivity in every jurisdiction, or native-grade background calling reliability.** No advertising trackers by default; no automatic call or chat recording.

## 2. Non-negotiable product rules / بنیادی فیصلے
1. Mobile Chrome + installable PWA first, responsive Urdu/English/Arabic; Safari/Firefox tested as additional clients. Install, microphone, camera, notifications, microphone recording and contact access never start without consent.
2. HTTPS/WSS only. Enforce browser-origin, session and request authorization and CSRF protections. Reject blocked identities, unknown group members, reused invites, replayed ciphertext and expired tickets.
3. No telephone-number-based discovery, address book upload, third-party analytics pixels, ad tracking, default transcript storage, automatic downloads, persistent media caches or call recording.
4. No chat contents, attachments, E2EE session keys, passwords or raw invite secrets in application/HTTP logs or backups. Allow only purpose-bound minimal operational metadata where essential or lawfully required, with access controls, disclosed retention and deletion.
5. Server is a transient encrypted message queue and delivery/control plane, NOT a searchable chat archive. Unopened voice messages remain E2EE-encrypted until heard subject to disclosed maximum retention and legal/storage limits. Once read, no recoverable copies should remain in controlled stores.
6. Automatic expiry is best effort + server-enforced TTL. No client can prevent a recipient using screenshots, another camera, recording device or a modified browser.
7. Pre-public release approval: independent threat modeling, external security assessment, regulatory review and device/network test. No claims of legal certification, audited security or live availability before evidence.

## 3. User experience / صارف کی اسکرین
Main home screen has only four large actions: **Call**, **Message**, **Groups**, **Scan QR**. Secondary actions: Requests, Privacy, Settings and Help. Each conversation shows only presently available/queued items; after a single permitted view it disappears (with unambiguous EXPIRED or VIEWED result). No old conversation list by default. A voluntary encrypted address book (display name + verified public identity) can remain; do not store the conversation.
- Call: mute, speaker, camera on/off, flip camera, quality Auto/Low, group invite by permission, leave/hang up. No recorder.
- Voice: press and hold or explicit start/stop; send once; listening is one-time.
- Images/video: sender chooses a file and explicitly sends; recipient opens a **view-only streaming player**, with no Save/Download/Forward UI. Secret media is never deliberately persisted in browser storage; display the one-view countdown and an honest warning that screenshots or external capture cannot be prevented by a normal Chrome webpage.
- Groups: creator/moderator permission, signed membership changes, one-time group join codes. New member sees no prior unread content unless explicitly re-encrypted by sender; default no history.
- Install: user clicks Install or browser Add to Home Screen. No automatic install or redirects.

## 4. Architecture
PWA (static assets on CDN) <-> **HTTPS API + WebSocket signaling** (separate service)
                                     |-> passkey authentication + signed device public-key directory
                                     |-> invite redemption / membership authorization
                                     |-> transient E2EE ciphertext queue and TTL worker
                                     |-> minimal secure delivery acknowledgements
WebRTC clients <-> authorized STUN/TURN servers and **SFU** for group calls
E2EE keying: vetted Double Ratchet/PQXDH-compatible design for 1:1 messaging; IETF MLS (RFC 9420, RFC 9750) for asynchronous group key agreement, if compatible audited browser library is validated. For media, use an audited E2EE implementation built on encoded transforms/SFrame-like frame encryption; test support for each target device. DTLS-SRTP transit encryption alone is **not sufficient** to claim the SFU cannot access audio/video. The media E2EE key distribution must not be silently controlled by an unverified server.

Proposed evaluation stack: tiny vanilla JS/TypeScript PWA, open-source **LiveKit SFU** (self-host/managed evaluation) with E2EE, Coturn-compatible lawful relay option and WebSocket signaling service. Use an existing audited protocol library rather than inventing cryptography. Current GitHub Pages is suitable for STATIC PWA only; live calls require backend deployment and a budget.

## 5. Identity, SHA-256, scan and invite
- Generate one unique high-entropy device public/private key pair using audited browser crypto or crypto module. Private key never placed in QR or sent to the server. Bind identity to a passkey/WebAuthn sign-in and signed device registrations (account/device recovery carefully threat-modeled).
- SHA-256(public identity key) = verifiable fingerprint / tamper-evidence display, **NOT a password, not account access and not proof of message origin on its own**. Device signature proves key possession; QR scan + human confirmation protects against impersonation and wrong-identity addition.
- QR contains: official HTTPS origin, version, opaque public account ID, device identity fingerprint, cryptographically random nonce, one-time invitation reference, expiry and an authenticated binding/signature. Never include a private key or persistent session token.
- One-time code: high-entropy random secret, **not a truncated bare SHA-256**. For manually entered code use a server-managed short-lived code with strict attempt limits, expiry, replay defense and two-sided consent. Prefer full 128-bit random QR token with 5-minute lifetime; manual codes need strong anti-guessing controls.
- Opening a link only opens the public consent/preview screen; recipient must accept, verified peer must accept, and the server authorizes joining. Link alone must NEVER add a friend, join a call or start camera/microphone.
- Users may revoke a code, remove devices/friends, block contacts and rotate compromised keys; changing a safety fingerprint alerts peers.

## 6. VPN-free and speed policy
- Use WebRTC ICE / STUN / TURN and established SFU, with legitimate UDP and TCP/TLS relay candidates where available/allowed, network quality adaptation, audio-only fallback and transparent connectivity diagnostics. No VPN requirement is built into the app; if local ISP/firewall/regulatory policy blocks traffic, show CONNECTIVITY_RESTRICTED / RELAY_UNAVAILABLE instead of covert tunneling or bypassing restrictions. No claim of guaranteed VPN-free access on all networks.
- IP privacy vs cost/latency is a real trade-off. Privacy-first relay/SFU path keeps participants from directly learning one another's IPs, but the relays, hosting provider and ISP can still see some network metadata. Relay increases bandwidth cost and sometimes latency.
- Audio-first default, Opus adaptive bitrate, optional 360p video, manual 720p when network permits, simulcast/adaptive subscriptions for group video, turn off offscreen video, bounded retries, connectivity diagnostics with NO sensitive dumps.
- Lightweight targets (aspirational; NOT verified): under 250 KB gzipped initial JS/CSS excluding lazy media and crypto SDKs; usable initial screen within 2.5s on reference 4G Android; avoid background camera/mic and constant polling. WebSocket reconnect with exponential backoff. Do not sacrifice E2EE for speed.
- Incoming calls while the browser is closed depend on push permission, OS delivery and browser service-worker limitations; **PWA cannot promise identical always-on ringing to native WhatsApp/IMO**.

## 7. Encryption and server privacy
- Message encryption on sender device; distinct authenticated per-message encryption keys/nonces, receiver-side decrypt, server only stores opaque ciphertext+delivery metadata.
- Ratcheted keys rotated per protocol and membership change; keep group roster authenticated. Crypto key provisioning, revoked-device handling, browser storage protection and backup exclusions are required.
- Strict role-based membership checks and group moderation; block/report flows can be user-initiated and consensual without passive message ingestion.
- Use CSP, Trusted Types where supported, input sanitization, dependency pinning, signed/reviewed releases, least-privilege secrets, abuse rate limiting, origin checks and WSS authentication. Treat compromised web origin and malicious browser extensions as serious risks.
- Explicit privacy disclosure: backend needs some transient routing/contact metadata, hosting/network operators may retain legally required logs, and authorized users can copy content externally. Do not promise zero traceability.

## 8. Ephemeral content requirements (separate protocol file)
- Text: display once then remove after acknowledged reveal; sender may revoke before delivery.
- Voice: E2EE pending queue until recipient explicitly starts playback, under a disclosed maximum unopened retention. A first-play window is bounded by **voice note duration + five minutes** for network recovery; stream/decrypt small chunks, promptly discard consumed plaintext/keys/chunks and purge ciphertext/key access at completion or hard deadline. There is no in-app save, download or replay.
- Sensitive text and images: first authorized reveal starts a maximum 5-minute expiry; no second view. Earlier close, completion or revocation removes access sooner. The sender controls whether non-sensitive conversations use a different policy; **no permanent server chat archive by default**.
- View-once video clip: the first authenticated **playback start** fixes a server deadline at **clip duration + five minutes**, e.g. 10 minutes -> 15 minutes and 12 minutes -> 17 minutes. This is an upper-bound continuity/grace window, NOT permission to download, save, forward, replay or restart the clock. Expire sooner if the single playback ends/close/revoke under the stated policy. A paused clip cannot indefinitely extend access. Enforce server TTL and signed receipts.
- Group view-once: per-recipient delivery/consumption state; no unbounded retention for a peer who never opens. A disclosed unopened message expiry is still needed for storage, law, spam and forgotten devices.
- Every controlled system copy, queued ciphertext and related keys must be subject to deletion/erasure (including backup policies). **Browser or OS media buffers cannot be perfectly zeroized or externally controlled.**
- View-once limitations, timers and actual deletion status must be visible; never call a failed deletion SUCCESS.

## 9. Operating cost / affordability
- **Permanent free-to-user product requirement (owner clarified 2026-11-04):** no subscription, in-app purchase, per-minute charge, paid tier or feature paywall for account creation, approved QR/one-time-code contacts, one-to-one voice/video calls, voice notes, private text and view-once media, and basic private groups/group calls. No banners, pop-ups, forced sponsored content, ad SDKs, contact monetization, selling message contents or hidden usage fees. Mobile data usage charged by the user’s carrier is outside E-ZERO control; disclose it clearly. The free promise needs sustainably funded infrastructure and published fair-use/abuse safeguards, never fake unlimited server capacity.
- Estimate monthly cost by simultaneous audio/video minutes, bandwidth egress, TURN fraction, SFU instances, storage of unread encrypted items and push infrastructure, not by static website views alone.
- Prefer a small number of regions for initial pilot, scaling only with measured users. Evaluate self-hosted SFU vs managed provider and hosting/data-residency requirements. Meter and cap beta concurrency rather than permitting uncontrolled bills.
- **Public promise:** core secure communication is free for all users in the pilot and intended global service, subject to clearly published abuse-prevention and fair-use capacity controls; no basic communication feature will be reserved for paying users. If the project cannot fund safe global operation, reduce staged rollout or capacity honestly rather than quietly switching the free core to a paid model. Do not claim the product is globally operating before launch.

## 10. Saudi Arabia + global legal gate
- CST Communications and IT Act may govern publicly offered services, and classifications, licenses or registrations depend on exact operating model. **Do not assume an app-to-app calling service is automatically exempt.** Obtain scoped written professional/regulator guidance before Saudi public launch.
- CST's Virtual Voice Services (VVSP) permit specifically concerns calls to/from PUBLIC telephone networks with international numbering; it does not by itself establish what a browser-only app-to-app messenger requires. PSTN interconnect is OUT OF SCOPE for v0.1.
- Saudi PDPL/Implementing Regulations govern purpose, consent/legal basis, erasure, transfers, user rights and breach response. Actual deletion must consider backups and any mandated retention. Cross-border hosting needs review. There may be lawful retention requirements inconsistent with a literal zero-log promise.
- No VPN evasion, hidden traffic disguising, surveillance, stalking, scraping contacts or bypassing court/authority orders. Provide truthful privacy notices and user safety/reporting without default message archiving.
- Publication gate requires a local Saudi regulatory opinion, privacy impact assessment and a per-country deployment checklist for international operation.

## 11. Threat-model and QA checklist
- Attackers: spammer/guesser, malicious invite receiver, compromised device/browser extension, insider with server access, hostile SFU, network interception, phishing QR/link, XSS/CSWSH, replay, leaked push token, malicious group administrator, DDoS/abuse.
- Controls: passkey, signed device identity, QR fingerprint verification, strong invite entropy/replay/expiry, E2EE including media, encrypted at rest queues, strict message authorization, abuse limits, key rotation, no content logs, rollback, dependency scanning, regular independent security reviews.
- Test cases: Android Chrome/desktop Chrome/iOS Safari where possible; permission denied, microphone/phone interruptions, 2G/3G/4G/5G/Wi-Fi, NAT and TURN only, blocked networks, group 3/8/12 users, low-end device, packet loss 2/5/10%, call join/leave, identity change, invite replay, XSS, bogus media MIME/size, lost delivery ACK, expiring while paused, dead clients, duplicate offline push, server crash and cleanup/recovery.
- Evidence statuses for each test: PASS / FAIL / PARTIAL / UNKNOWN; separate local simulation from genuine carrier/mobile testing. No 'zero hacking risk' claim.

## 12. Sequential release roadmap
Phase 0 — **current research**: architecture, threat model, regulatory classification, operator feasibility; NO PUBLIC CODE DEPLOYMENT.
Phase 1 — **identity & QR pilot**: verified device identity, one-time add code, user authorization, no media, local browser tests.
Phase 2 — **1:1 encrypted ephemeral messages**: read/view-once protocol, TTL workers, at-rest queues, expiry and failure tests.
Phase 3 — **1:1 voice**: WebRTC, secure signaling, E2EE, STUN/TURN, real Saudi carrier/Wi-Fi testing.
Phase 4 — **1:1 video**: video quality adaptation, camera consent, encrypted media, real-world QoS.
Phase 5 — **small groups**: MLS-compatible identity/keying, encrypted group calls with SFU, moderation, room caps.
Phase 6 — **public release candidate**: independent pentest, legal clearance, cost caps, DPIA, resilience, localization, accessibility, privacy policy. THEN explicitly authorize production cutover.
Stop/go decisions made per phase; do not roll experimental comms into the existing live AI website.

## Sources consulted (verified 2026-11-04)
1. WebRTC Security Architecture (RFC 8827): https://www.rfc-editor.org/rfc/rfc8827.html
2. WebRTC IP Address Requirements (RFC 8828): https://www.rfc-editor.org/rfc/rfc8828.html
3. MDN WebRTC signaling/STUN/TURN: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
4. MDN WebRTC Encoded Transforms: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Using_Encoded_Transforms
5. IETF Messaging Layer Security MLS (RFC 9420): https://www.rfc-editor.org/rfc/rfc9420.html
6. MLS Architecture (RFC 9750): https://www.rfc-editor.org/info/rfc9750/
7. Signal Double Ratchet specification: https://signal.org/docs/specifications/doubleratchet/
8. MDN WebAuthn / passkeys: https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Passkeys
9. MDN Web Crypto SHA-256: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
10. MDN PWA background limitations: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
11. LiveKit SFU & self-hosting: https://docs.livekit.io/reference/internals/livekit-sfu/ and https://docs.livekit.io/transport/self-hosting/
12. LiveKit E2EE: https://docs.livekit.io/transport/encryption/
13. OWASP WebSocket Security: https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html
14. OWASP Cryptographic Storage: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
15. Saudi CST Communications/IT Act: https://www.cst.gov.sa/regulations-and-licenses/acts-and-bylaws/acts/telecommunication-and-information-technology-act
16. Saudi CST VVSP permit scope: https://www.cst.gov.sa/business/services/Permit-to-provide-virtual-voice-services-VVSP
17. Saudi SDAIA PDPL implementing regulations: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/PDPL2/
18. Saudi SDAIA destruction guidance: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/PersonalDataDestruction/

## 13. Secret media non-saving / capture threat model (user clarified 2026-11-04)
- **Desired product behavior:** no built-in save/download/forward actions for received secret text, audio, images or video; no permanent content history. Each permitted viewing/listening session is one-time and has duration-specific expiry.
- Video examples: 10-min clip -> maximum 15-min viewing session; 12-min clip -> maximum 17-min session, starting on first authenticated play. For voice use its own duration + up to five minutes, with progressive consumption. For image/text first authorized reveal + max five minutes. The five minutes is an additional recovery *allowance*, not a guaranteed extension after completed playback.
- Deliver ciphertext chunks only after authorized one-time claim; decrypt inside transient memory and decode progressively; disable media context menus and do not expose save/share controls, export APIs or plaintext URLs; keep no content in IndexedDB, localStorage, Cache Storage, offline queue, service-worker pre-cache, default browser/PWA history or push. For sensitive response use Cache-Control: no-store; short-lived bound delivery token; worker cleanup; memory/object URL cleanup on end. These measures **reduce casual saving, but cannot prevent a determined recipient copying decrypted bytes with modified browser/debugger/network interception or external recording**. All sensitive items must be encrypted end-to-end before entering the service.
- A normal website/PWA **cannot reliably block the phone OS from taking screenshots or screen recordings**. Permissions-Policy display-capture only controls screen capture initiated by the page's own API, not operating-system screenshots. Hiding right-click and CSS user-select are not security controls. Show a clear privacy limitation before opening sensitive content.
- **Optional future Android native shell** may set Android FLAG_SECURE on confidential views to block many screenshots, recordings and recents thumbnails; test across OS versions, screen sharing and devices. It remains imperfect and does not protect against filming with another device. A native shell is a distinct app requiring its own user approval, build/signing/release and assessment, not silently installed by the Chrome shortcut.
- Server stores only encrypted unread delivery queue with bounded TTL and essential legally mandated metadata, without searchable content archive. Explicit storage-erasure states and failure handling required; no promise of no traces on recipient device or network-provider systems.
- Never use this design to claim complete copy prevention or perfect secrecy; security goal is **strong controlled-access protections plus transparent limitations**.
- Browser security sources: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control ; https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/display-capture ; https://developer.android.com/security/fraud-prevention/activities ; https://mas.owasp.org/MASTG/best-practices/MASTG-BEST-0014/

## 14. Owner's free communication mandate — immutable product acceptance gate (2026-11-04)
- **No user fees** for secure text messages, single-use media, one-to-one audio/video, normal voice messages, verified contact QR and essential group communication. No mandatory ads, paid subscription or hidden premium restriction on those functions.
- No harvesting conversation, address book, social graph, device identity or live call content for advertising or selling. Operate essential observability with minimal, disclosed purpose-limited metrics, not user tracking.
- **Zero new financial investment at prototype phase (owner clarified 2026-11-04):** use existing Android/Termux, open-source components and genuinely free quotas; no investor financing, paid servers, subscription plans, paid API usage or owner outlay may be assumed. Live media relays, SFU capacity, abuse response and independent audits eventually cost resources: plan measured pilots and pause at hard free-tier limits rather than triggering charges. External grants/donations/sponsorships are NOT assumed and require a separate user choice. Do not promise unlimited worldwide capacity without verified sustainable funding.
- Maintain fair-use anti-abuse controls based on demonstrable service sustainability, not pay-to-speak: rate limits for unsolicited invites, enforced small-group capacity, adaptive media quality, emergency denial of malicious usage and clearly explained capacity messages. Avoid silently penalizing ordinary users or charging unexpectedly.
- Global and VPN-free where lawful and network supported are **deployment goals**, not guarantees. Use staged regions and public availability matrix; mobile carrier data charges remain independent.
- This product mandate overrides the earlier tentative idea of paid feature tiers in this design. Any future monetization change requires a separately requested product decision, a privacy/cost evaluation and explicit notice—never assumed or silently rolled out.

## 15. Zero-capital pilot implementation & vendor billing guard (2026-11-04)
- **Phase A (genuinely zero new spending):** static mock homepage inside existing dormant Assist Hub, preserve separate live AI Studio, local QR/public-key identity proof in secure context, client-only encrypted message demonstration (no network or real confidential delivery). Keep user data out of GitHub Pages and local storage by default. GitHub Pages not permitted as a free production host for commercial SaaS; verify suitable hosting terms before launch.
- **Phase B (free local browser test):** two browsers/devices on a user-authorized test network using WebRTC DataChannel, then voice and adaptive video. Signaling manually exchanged or a locally operated temporary test-only endpoint; no publicly accessible signaling service or TURN automatically assumed. Explicit media permission; no cloud bills or provider keys.
- **Phase C (no-cost quota-verified pilot):** evaluate free signaling and Cloudflare Realtime TURN/SFU only after confirming account eligibility, credentials, contract, usage ceiling, and a technically enforced financial hard cap. Current docs list 1,000 GB/month shared TURN/SFU free egress and 100,000 Workers requests/day, but charges apply outside free allowance; never enable usage with uncontrolled overages. Budget cap = zero charges, with admission control and clear capacity-full status.
- **Phase D:** publish any new paid infrastructure proposal only with user review; do NOT activate paid usage or promise global scale silently. Global availability, regulatory/legal compliance and cryptographic media privacy require independent audits and real carrier tests.
- **No paywall:** all core user features remain free, no card or compulsory ads; cost mitigation uses codec adaptation, short encrypted queues, small group limits, load testing, capacity controls and fair-use abuse prevention.
- **No hidden storage:** unread encrypted queue is transient and bounded; completed texts and media discarded with honest purge status, with legally required minimal metadata treated separately.
References: https://developers.cloudflare.com/realtime/sfu/platform/pricing/ ; https://developers.cloudflare.com/workers/platform/limits/ ; https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/github-pages-limits
