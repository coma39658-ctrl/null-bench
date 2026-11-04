# E-ZERO Secure Connect — Global Caller & Public Needs, Trust/Safety and UX V0.1
Date: 2026-11-04 | Status: RESEARCH / DESIGN ONLY — NO CALL SERVICE, NO PUBLIC DEPLOYMENT
Owner: E-ZERO | Language priority: Urdu, Arabic, English; progressive language expansion
Connects to (research only): EZERO_SECURE_CONNECT_ARCHITECTURE_BLUEPRINT_V0_1_20261104.md and EZERO_SECURE_CONNECT_EPHEMERAL_PROTOCOL_V0_1_20261104.md.

## 1. Research findings and product decision
- GSMA State of Mobile Internet Connectivity 2026: 4.8 billion mobile internet users, 59% of world population by end-2025; digital access remains limited by affordability, digital skills and connectivity. Optimize entry-level phones, cheap data, older users, unreliable networks and simple onboarding rather than video-only demos.
- ITU Global Connectivity Report 2025: availability, quality, affordability, devices, skills and security are interdependent. A fast app requiring a new flagship phone, strong internet or difficult account setup fails the target population.
- Public app patterns: Signal offers configurable private usernames/QR/link, identity safety-number verification and call links with moderator approval; learn interaction patterns, do not claim Signal compatibility or copy its brand.
- Security agencies (CISA 2025, NCSC March 2026) warn about fake linked-device QR, phishing, impersonation and spyware. QR does NOT authenticate a person's true identity on its own; combine verified public-key fingerprint, active signed approval, passkey/WebAuthn and suspicious-device alerts.
- Accessibility: W3C WCAG 2.2 encourages readable UI, clear focus, screen reader labels, adequate touch targets and live caption accessibility. Transcripts/captions can conflict with strict "no retained plaintext": ONLY generate locally, on explicit consent, ephemeral in memory, never upload/retain by default.
- Chrome/PWA calling constraints: web push requires user permission and may be delayed or restricted in background, even after installing PWA. Never guarantee native app-like always-on ringing. Actual PSTN/emergency calling and regulated telephony require separate permissions and legal analysis.

## 2. Users / callers and their high-priority jobs-to-be-done
| Group | Primary need | Default UX / measure |
| --- | --- | --- |
| Family & international contacts | Reliable simple free/low-cost voice, easy contact addition, optional video | Audio-first; 1-tap accepted contact calling, clear ring/connect/error; low-data toggle |
| Low-bandwidth / prepaid data | Work on cheap Android and patchy networks, no VPN demanded | Opus audio, adaptive bitrate, downshift video to audio, relay candidate fallback where lawful; disclose data usage |
| Elderly / low digital skills | Large legible controls; never mistake Decline for Accept | Four primary buttons, 44px preferred touch controls, plain labels, high contrast, spoken optional status |
| Deaf or hard-of-hearing callers | Text alternative and accessibility | Optional strictly local ephemeral live captions if available; typed live chat, keyboard/screen-reader accessibility |
| People who need discretion | No phone number discovery, no chat/call archive, explicit invitation consent | Passkey, verified QR or random invite, pseudonymous display names, block, timer, locally opt-in notifications |
| Groups, families and small teams | Organizer approval, moderation, simple private group call | Moderator controls, visible speaking roster, add/kick/leave/revoke, group membership rekey, no auto-admission |
| Businesses and workshop operators | Reach verified people without spam or data harvesting | Verified organization display (not identity-proof by itself), call hours, business/unknown caller prompt, separate work/personal IDs |
| High-risk individuals/field teams | Strong safety against impersonation and device linking | New-device alerts, independent safety fingerprint confirmation, short-lived invites, revocation; NEVER call it military-grade or certified |
| International travelers / rural users | Unpredictable firewall/carrier restrictions | ICE/STUN/TURN/SFU legally permitted candidate testing, diagnostics, do not promise universal VPN-free calling |
| Caller unable to talk openly | Quiet incoming call / optional call request | Silent mode, accept/reject without microphone auto-on, prevent auto answer, do not expose sensitive preview on lock screen |
| Parents/young users | Stop harassment, unsolicited invites and abuse | Unknown caller requests, invite expiry, child-protection policy, report/block with minimum retained metadata |
| Everyone | No forced ads or surprise charges | Permanent zero ad SDK/tracking product policy and transparent fair-use limits; optional paid capacities only after user disclosure |

## 3. Caller screens — default order
**Home (four choices only):** Call | Message | Groups | Scan QR. Show a small incoming request badge, not a distracting feed. No publicly searchable people directory.
**Incoming call:** verified display identity / "not verified" warning, mode (voice/video), Accept audio only, Accept video (separate camera consent), Decline, Block; no microphone/camera opening before user action. Unknown callers cannot ring repeatedly at unlimited rate.
**In call:** big Mute, Speaker, Video toggle, switch camera, End, Invite (approved members only), quality indicator (good/fair/weak), optional local ephemeral captions. No record button. "Recording by other participants cannot be prevented" privacy notice in info.
**Failed call:** clear CALLER_UNAVAILABLE, BUSY, PEER_DECLINED, PERMISSION_DENIED, RELAY_UNAVAILABLE, NETWORK_RESTRICTED, ENCRYPTION_FAILED, CONNECTION_LOST, SERVER_CAPACITY_LIMIT statuses; a single explicit Retry button. Never say "Connected" before media path and authenticated remote identity verified.
**One-view item:** Send -> ENCRYPTED_PENDING -> first authorized reveal/play -> countdown -> CONSUMED/EXPIRED/PURGE_PENDING/PURGED/PURGE_FAILED. Hide save/download/forward/export. Text/image: first open + max 5 min; audio/video: media duration + max 5 min from first play (e.g. 10 min video = 15 min, 12 min = 17 min). Complete playback or close may expire earlier. No repeat playback, no resetting on reload/pause.
**Groups:** private by default, finite room capacity tested empirically; creator-verified invite + optional admin approval, signed member joins/removals, prominent moderator list, speaker and participant list, group leave/close control. If member removed, distribute new media keys using vetted audited protocol.

## 4. Security and privacy — required protections
1. E2EE with independently reviewed messaging/media keying. WebRTC DTLS-SRTP protects transit; separate E2EE is required to hide contents from SFU. Use proven libraries and key-verification experience; NEVER invent custom cryptography.
2. Identity safety: random device key pairs, passkey or equivalent strong authentication, SHA-256(public identity key) fingerprint, QR only displays verifiable invite details; both sides must confirm. Alert on fingerprint change/device linking; protect against copied QR, swapped web origin, phishing and fake support accounts.
3. Strict authorization to calls, groups and content; ACL enforced server-side. Anti-guessing/replay, invite expiry, rate limits, abuse throttling, limits on group additions and multi-device management. Screens never expose someone else's phone number or IP by default (relay privacy has costs and still leaks metadata to infrastructure).
4. Text/media once-only delivery with authenticated server-based deadlines and bounded unread queue; encrypted ciphertext only, no server searchable chat archive, no unconsented call recording/transcripts, no message contents in push/logs. Verify purge and backup retention; display PURGE_FAILED when deletion unverified. Legal retained routing/operational metadata disclosed.
5. Never download or save confidential media *through our UI*. Avoid decrypted-media persistent browser caches/IndexedDB and use no-store responses, short-lived access tokens, streaming chunks. **Absolute no-save/screenshots is impossible for a normal Chrome site/PWA**: modified browsers, screenshots, external cameras and malicious recipients can copy. Optional native Android FLAG_SECURE helps many OS screenshots but is not perfect and requires a separate signed app; do not promise it from a PWA shortcut.
6. Audit app using OWASP ASVS 5.0, specifically WebRTC, auth, sessions, API permissions, cryptography, file handling, browser security and security logging. Risk review for supply-chain dependencies, CSP and XSS. Independent security assessment before release; avoid unbounded retention of fingerprints or IP logs.
7. Safety: block/mute/report without exposing contents by default. Explicitly warn that voluntarily sending evidence for abuse review creates separately consented data requiring a visible retention policy; default reporting captures only minimal spam/identity metadata.
8. No spyware/surveillance/tracking features, no invisible contact imports, no third-party advertising SDKs, no browser-fingerprinting. Explicit camera/microphone/notification consent and revocation, visible permission indicators.
9. Distinguish high-privacy civil use from regulated emergency, government or military communication. **No military-grade, classified, emergency-dispatch, wiretap-proof or 100% unhackable claims**. Any classified/corporate/defence use requires competent external accreditation and lawful record-retention controls. Our initial pilot is public civil communications, not an official emergency-number service.

## 5. Fast/affordable and no VPN requirement — lawful capability profile
- PWA loads a minimal shell; camera, crypto, translation and video layers lazy loaded by feature. Initial shell size and startup time are test *targets*, not achieved measurements.
- Adaptive codec/protocol: Opus, low bitrate audio first, low-video mode for weak signal, auto-paused offscreen video for group calls; explicit Data Saver; packet loss/jitter / battery validation on low-end phones.
- ICE connection candidate checks then lawful TURN fallback where available, appropriate regional servers and latency monitoring. An operator/ISP/national restriction is not bypassed covertly. Return truthful failure if service is unavailable under local rules; obtain local carrier tests and regulatory approval.
- Group calls routed via an evaluated SFU such as LiveKit, no compulsory media recording/egress service. Verify end-user media keys: transport encryption alone does not mean server-blind E2EE.
- Transparent optional premium capacities: e.g. larger groups or extended calls if operating cost requires, never monetize sensitive message text, caller numbers or contact graph. Price must be displayed before consent and tested against realistic egress/TURN/SFU costs.
- Push notification: only generic encrypted alert, no message text/voice or sensitive sender ID on lock screen; PWA background delivery is best-effort, not guaranteed. Provide online/offline state without a permanent readable call log.

## 6. Responsible platform behavior and caller protection
- Unknown callers must request permission before persistent contact; approval can be withdrawn. Rate-limit unknown callers independently from friend call permissions. Emergency safety UI: report abusive account, block, silence unknown callers and group-moderator emergency remove.
- Call end must close device tracks, signaling subscriptions, media peer connections and temporary keys; group calls cannot secretly continue microphone capture in background.
- Identity verified badge only after cryptographic fingerprint check or authorized organization verification; name/photo alone doesn't establish authenticity.
- Avoid disabling important device accessibility aids in the name of privacy. Sensitive screens may mask OS app-switcher previews when platform supports it, but screen-capture prevention must be honestly documented.
- Never retain precise GPS, address book, phone number, contact graph, device advertising ID or persistent behavioral analytics without a specific necessary and consented purpose.

## 7. Test and rollout priorities
| Phase | Essential acceptance tests / release evidence |
| --- | --- |
| 0: research | Confirm Saudi CST service classification, SDAIA PDPL/data-residency, privacy notice, high-risk threat model and independent review; competitor feature-gap |
| 1: identity | Mobile QR and signed passkeys, mutual approval, malicious QR reject, revoked key/device, fake-site protection; 1:1 contact add |
| 2: messaging | E2EE read-once, expired media cannot reopen, no-download UI, no persistent plaintext, server purge states including fault handling |
| 3: voice calling | Android Chrome and iOS Safari/desktop test, 4G/Wi-Fi weak path, TURN-only legal fallback, low battery, mute/kill mic, consent and call quality |
| 4: video | 1:1 camera flip, adaptive video, fallback audio, E2EE with untrusted SFU, media+5 min expiry, handset heat/CPU/data use |
| 5: groups | admin admit/reject, 3/8/12 verified members, group ejection/rekey, speaker indicators, membership safety |
| 6: independent launch gates | third-party pentest, incident response/abuse policy, accessibility, country legal approvals, billing cost cap, independent real phone/network tests |

Record **PASS/FAIL/PARTIAL/UNKNOWN** separately for automated simulation, browser emulator and **real phone/carrier** tests. No live deployment until Phase 6 release gates clear; this file is design evidence only.

## 8. Research source links, checked 2026-11-04
- GSMA 2026 mobile internet usage: https://www.gsmaintelligence.com/research/the-state-of-mobile-internet-connectivity-2026
- ITU Global Connectivity Report 2025: https://www.itu.int/itu-d/reports/statistics/global-connectivity-report-2025/
- Signal private usernames and QR: https://support.signal.org/hc/en-us/articles/6712070553754-Phone-Number-Privacy-and-Usernames
- Signal call links/moderator approval: https://support.signal.org/hc/en-us/articles/7860719423002-How-to-create-and-share-call-links
- Signal safety-number changes: https://support.signal.org/hc/en-us/articles/360007060632-What-is-a-safety-number-and-why-do-I-see-that-it-changed
- CISA spyware, malicious linking codes and app impersonation: https://content.govdelivery.com/accounts/USDHSCISA/bulletins/3fcdc06
- NCSC March 2026 messaging security: https://www.ncsc.gov.uk/news/ncsc-warns-of-messaging-app-targeting
- W3C WCAG 2.2: https://www.w3.org/WAI/WCAG22/understanding/
- W3C caption accessibility guidance: https://www.w3.org/WAI/media/av/captions/
- WebRTC STUN/TURN: https://webrtc.org/getting-started/peer-connections
- LiveKit SFU adaptive: https://docs.livekit.io/reference/internals/livekit-sfu/
- LiveKit E2EE and key limitations: https://docs.livekit.io/transport/encryption/
- PWA push/background: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- Android FLAG_SECURE caveats: https://developer.android.com/security/fraud-prevention/activities
- OWASP ASVS 5.0: https://asvs.owasp.org/
- CST VVSP (PSTN calls only, not proof of rules for all app-to-app services): https://www.cst.gov.sa/en/business/services/Permit-to-provide-virtual-voice-services-VVSP
- SDAIA data deletion and retention policies: https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/ElaborationandDevelopingPrivacyPolicyGuideline/
