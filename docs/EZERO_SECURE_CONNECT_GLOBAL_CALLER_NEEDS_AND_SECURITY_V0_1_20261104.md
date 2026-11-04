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
| Everyone | **Free communication and no ads or hidden fees** | No user charges for ordinary private messaging, audio/video calls, QR verification and basic group calls; no ads or data sale; disclosed fair-use capacity and carrier data charges |

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
- **Owner-mandated free service:** do not charge end-users for basic video/audio calls, encrypted private messages, one-listen notes, QR contacts or small group calling. No premium call quality paywall, in-app purchase, mandatory ads or subscription. Develop the first proof of concept using existing equipment, open-source tools and free quotas WITHOUT investor capital or mandatory owner payment. Do not enable an infrastructure resource that automatically bills above a quota. Measure egress/TURN/SFU costs and publish capacity restrictions honestly; zero-budget proof-of-concept is not unlimited global capacity.
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

## 9. Explicit high-quality video and superb audio user requirement (2026-11-04)
The owner prioritizes **clear high-quality video calls, strong intelligible audio calls and excellent voice notes**. The product target is not "always 1080p": it is **the best stable, authenticated quality the actual devices and permitted network can sustain**.
- Video target: default responsive **720p at up to 30 fps** (only a device-capture preference, not a claim about transmitted frames); explicit **1080p at up to 30 fps** when both endpoints, codec, battery, bandwidth, thermal headroom and service tier support it; automatic **360p at 15 fps** data-saver / congested fallback. Where network quality degrades, preserve audio before video fidelity and allow camera-off audio-only seamlessly.
- Screen/frame/audio metrics: measure **sender camera actual getSettings**, WebRTC outbound encoded dimensions/fps/bitrate, receiver decoded frames/fps, RTT/jitter, packet loss, available send/receive bitrate, audio concealment and reconnection time **separately**. High camera resolution alone does not prove high delivered call quality.
- Group video: use SFU adaptive subscriptions / simulcast, pause unused video layers and minimize handset uplink; validate server bandwidth costs. Prefer 1:1 premium frame consistency over high-res claims; video E2EE must remain enabled and peer-approved.
- Audio call: Opus codec where supported, request browser `echoCancellation`, `noiseSuppression` and `autoGainControl` where supported, audio-first packet priority, bound latency/reconnect; test speaker, wired/Bluetooth headset and low-cost phones. On packet loss evaluate Opus in-band FEC per RFC 8854 with actual controlled measurements; excessive noise processing can harm audio quality on some devices, so provide fallback.
- Voice messages: simple press-to-record, clear start/stop indication, pre-send review, quality modes (default Opus ~48–64kbps design candidate; exact chosen bitrate depends on devices and network), chunked authenticated E2EE delivery, no required forwarding or file downloading for recipients; one-listen expiry hard deadline = first listening start + original voice length + at most 5 minutes. Receiver's media is not retained as an accessible permanent file; sender can explicitly cancel a draft before transmission.
- Caller UX: explicit camera/microphone prompts, all permissions reversible, actual slow-network warning and quality mode; never show "HD connected" until live WebRTC receiver telemetry confirms it. Do not promise guaranteed audio clarity in congested environments.
- Pilot progression: local-only Chrome camera/mic/voice draft test first (NO network or remote calls), secure signaling/authentication next, E2EE 1:1 audio then video with real Saudi Wi-Fi/4G/5G and lawful TURN, small groups after. No public calling claims until phase-specific QA.
- Compliance and safety: a normal browser cannot prevent external recipient recording/screenshots or guarantee a VPN-free path across every country/operator. The web preview should not automatically record, upload, save or advertise media.

References:
- MDN constraints & actual camera settings: https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints
- MDN MediaRecorder (voice note recording): https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- RFC 8854 WebRTC packet loss/FEC audio: https://www.rfc-editor.org/rfc/rfc8854.html
- LiveKit adaptive video / simulcast / Dynacast: https://docs.livekit.io/transport/media/advanced/

## 9. Mandatory premium-quality media targets (user clarification, 2026-11-04)
These are **engineering targets, not tested performance or existing features**. Build the communication system inside the existing dormant AI Agent/Assist Hub area on the homepage, while leaving the already-functional separate AI Studio button untouched. The existing "Voice Guide" is website guidance, not a peer-to-peer calling feature; do not mislabel it as a live voice call.
- **1:1 video:** dynamically adapt resolution 180p/360p/540p/720p HD and offer 1080p as an opt-in target only when CPU, bandwidth, battery and peer capability allow. Prioritize frame continuity, lip sync, latency and intelligible speech over maximum resolution. Codec negotiation: H.264/VP8 baseline interoperability, VP9/AV1 when device/browser support is verified. Never promise universal 1080p or 60fps.
- **1:1 audio:** Opus with echo cancellation, automatic gain control and noise suppression where supported; clear speaker/earpiece, mute/unmute, Bluetooth/headset routing per platform; keep microphone disabled until accepted and permission granted. Measure packet loss, jitter, audio dropouts, and reconnect recovery. Prefer intelligible audio over video in constrained networks.
- **Voice messages:** explicit hold-to-record or start/stop with visible mic indicator, playback preview before send, cancellation and delete-before-send. End-to-end encrypt media chunks before transport; pending voice remains encrypted until first authorized listen under disclosed unread TTL. After first listen starts, maximum access = original voice duration + 300 seconds; consumed chunks are purged as progress is acknowledged and all remaining access ends on completion/expiry. No in-app save/download/forward/replay and no transcript by default. Do not claim screenshots or external recording impossible.
- **Group calls:** SFU with adaptive subscriptions, active speaker indication, moderator approvals, per-member E2EE keying, lower video quality for non-speakers and per-device bandwidth caps. Initial participant count is a measured pilot constraint, not a marketing promise.
- **Connection policy:** ICE/STUN/TURN over legally permitted network transports, audio-only fallback, region-aware SFU placement, user-visible network quality indicator and clear failure codes. Never covertly evade ISP or country blocks; VPN-free is a target where permitted, not a universal guarantee.
- **Security gate:** verify actual media E2EE in group calls; DTLS-SRTP to an SFU alone does not make the SFU unable to hear media. No default call recording, no ad SDKs, no media plaintext in persistent browser caches, server content logs or push.
- **Test matrix:** 2 real Android phones (entry-level and mid-range), Chrome and a second supported browser, Saudi mobile carrier and Wi-Fi, low-bandwidth 3G/4G, speaker/headset/Bluetooth, background/foreground, 2/5/10% packet loss, relay-only, camera denial, microphone denial, 10/12-minute voice and video notes with deadline assertions. Record PASS/FAIL/PARTIAL/UNKNOWN and measured bitrate/resolution, latency, jitter, reconnect times, battery and data use.
- **UX:** four main Connect actions (Call, Message, Groups, QR); one-tap accept audio, separately opt-in camera for video, call quality selector Auto/Data Saver/HD, accessibility and Urdu/Arabic/English labels. Preserve existing separate AI Studio and existing voice guidance until an explicit tested replacement exists.

References:
- WebRTC getUserMedia constraints: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- WebRTC RTCRtpSender parameters: https://developer.mozilla.org/en-US/docs/Web/API/RTCRtpSender/setParameters
- Opus audio codec RFC 6716: https://www.rfc-editor.org/rfc/rfc6716
- WebRTC security RFC 8827: https://www.rfc-editor.org/rfc/rfc8827.html
- LiveKit adaptive stream: https://docs.livekit.io/home/client/tracks/subscribe/

## 10. Zero-capital, zero-investor, free-for-all policy (owner-confirmed 2026-11-04)
- **Starting capital = 0 SAR** as an engineering constraint: build with existing Android/Termux and connected GitHub tools, open-source components, static local prototypes, and documented free tiers only. Do not assume new server purchases, paid subscriptions, rented machines, investors, venture finance or paid certificates. Developer time, existing phone, electricity and carrier data are real in-kind resources, not literally zero economic cost.
- **End-user price = 0:** never require payment, card, subscription, ad viewing or upgrades for normal secure text/voice/video messages, 1:1 voice/video calls, verified invites or essential groups. E-ZERO does not pay users' carrier data charges; disclose that clearly.
- **No ads or sale of personal data:** funding must never depend on selling message content, contact graphs, caller identity, tracking or forced advertisements. Future sponsorship/donations are not part of this zero-capital first prototype and require a separate owner choice; do not sneak them in.
- **No overage risk:** production and development must reject usage safely when a free quota/cap is exhausted; billing-disabled resource preferred. Where a vendor requires a payment method or can charge after the free tier, treat it as *not zero-risk* until a hard cap and opt-in are verified. Monitoring alone is not a cap.
- **Practical initial implementation:** offline static PWA and consent-first identity/QR prototype, then two-browser local WebRTC P2P with manually exchanged signaling and no paid signaling backend; add genuine hosted signaling only when a lawful compatible no-cost service and usage cap are verified; for tough NAT networks need TURN which may have limits. Real global calling requires reliable media relays, anti-abuse, uptime, E2EE review and funding; cannot claim that zero-capital prototype is a fully functioning global service.
- **Technical trade-off:** start P2P audio-first and adapt video. When direct connection is unavailable, display CONNECTIVITY_UNAVAILABLE and optional lawful relay path when genuinely provisioned; never promise all networks work VPN-free or silently use a paid service. Group calls need an SFU or bounded P2P mesh and its security/performance limits must be disclosed.
- **Hosted frontend:** GitHub Pages can showcase a static prototype, but GitHub's published limits prohibit using Pages as a free hosting platform for a commercial SaaS or online business. Do not run the production communication business on Pages based on the assumption that GitHub permits it. Choose a terms-compliant production host after a separate review.
- **Cloudflare free quotas are research candidates, not deployed resources:** Workers Free presently has 100,000 requests/day; Cloudflare Realtime SFU/TURN presently shares 1,000 GB/month free egress, then usage charges may apply. Check account eligibility, billing activation, secret storage, per-product pricing and enforceable no-charge caps before any activation. Cloudflare's managed RealtimeKit pricing is separate; do not confuse it with serverless Realtime SFU.
- **Global release gate:** do not announce service available worldwide until tested on representative networks, languages, browsers and local regulatory classifications; stagger pilot availability, publish support matrix and real metrics. Security and legal review are not optional just because the platform is free.

Verified official references as of 2026-11-04:
- Cloudflare Workers Free limits https://developers.cloudflare.com/workers/platform/limits/
- Cloudflare Realtime SFU and TURN tier https://developers.cloudflare.com/realtime/sfu/platform/pricing/
- Cloudflare TURN https://developers.cloudflare.com/realtime/turn/
- Cloudflare RealtimeKit per-participant pricing (different product) https://www.cloudflare.com/plans/
- WebRTC signaling is separate from media https://webrtc.org/getting-started/peer-connections
- GitHub Pages commercial SaaS restriction https://docs.github.com/en/enterprise-cloud@latest/pages/getting-started-with-github-pages/github-pages-limits
