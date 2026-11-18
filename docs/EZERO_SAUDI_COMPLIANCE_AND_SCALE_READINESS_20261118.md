# E-ZERO Secure Connect — Saudi Compliance & Scale-Readiness Gate
**Status:** Engineering planning document; not a legal opinion, licence, permit, or regulator approval.  
**Date:** 2026-11-18  
**Scope:** E-ZERO app-to-app audio/video, messaging, identity/QR pairing, signalling, push notifications, optional paid support features, and a proposed 2,000–4,000 participant evaluation.

## 1. Non-negotiable release rule
Do not describe E-ZERO as Saudi-law approved, licensed, compliant, or generally available until the applicable Saudi authorities and qualified Saudi counsel have confirmed the required legal route in writing and every applicable condition has been met. A successful technical test, a private beta, a small user count, or a GitHub/Render deployment is not regulatory approval.

Keep all current work in isolated staging. Do not route production users to test infrastructure. Do not enable public sign-up, paid subscriptions, PSTN calling, public numbering, or broad distribution as a substitute for regulatory review.

## 2. Service boundary requiring written CST classification
The currently intended first product is app-to-app communication between E-ZERO accounts over the public internet. It is not intended to provide telephone numbers, PSTN termination/origination, or calls to ordinary mobile/landline numbers.

CST's published VVSP permit description specifically concerns virtual voice calls to and from public switched telephone networks (PSTN) using E.164 numbering over IP. This description does not by itself decide whether every app-to-app calling product is in or out of scope. The Telecommunications and Information Technology Act also contains broader licensing provisions for providing telecommunications services to the public. Therefore:
- Prepare a precise technical/service description and ask CST for written classification of the app-to-app model before any public commercial service or 2,000–4,000-person live user pilot.
- If PSTN/E.164 calling, public numbering, interconnection, or any other regulated telecom capability is added, stop that feature until the required CST permit/licence and conditions are obtained.
- Do not claim that the VVSP permit is definitely required for the present app-to-app-only model, or definitely not required; obtain a written determination.
- Do not design the product to evade carrier restrictions or to bypass Saudi network controls. Test lawful connectivity with Saudi operators and document limitations honestly.

Official starting points:
- CST VVSP permit description: https://www.cst.gov.sa/en/business/services/Permit-to-provide-virtual-voice-services-VVSP
- National Portal VVSP permit summary: https://my.gov.sa/en/services/25559
- CST Telecommunications and Information Technology Act: https://www.cst.gov.sa/en/regulations-and-licenses/acts-and-bylaws/acts/telecommunication-and-information-technology-act
- CST VVSP regulations: https://www.cst.gov.sa/en/regulations-and-licenses/regulations/regulations-of-the-provision-of-the-virtual-voice-services-vvsp

## 3. Saudi personal-data protection workstream
Treat account identifiers, profile names/photos, contact/friend relationships, device identifiers, IP/network metadata, call/message metadata, support requests, analytics, and push tokens as potentially personal data. Audio/video content and message content require especially strict privacy controls even where the service does not intentionally retain them.

Before a real-user pilot:
- Identify the controller and every processor/sub-processor; sign and review data-processing terms.
- Publish clear Arabic and English privacy notices (Urdu may also be offered) explaining purposes, lawful basis, data categories, retention, recipients, user rights, contact channel, and complaint route.
- Collect only data necessary for account security, connection, delivery, and abuse prevention; document each purpose.
- Build access, correction, deletion, objection/withdrawal, and complaint handling processes as applicable.
- Set documented retention periods and automatic deletion; no indefinite logs.
- Maintain a data inventory/map, processing register, vendor list, and data-flow diagram.
- Assess whether a Data Protection Officer, impact assessment, or other additional obligation applies to the actual processing and scale.
- Before any data is hosted, accessed, or processed outside Saudi Arabia, map the transfer and assess the PDPL and the Regulation on Personal Data Transfer Outside the Kingdom; use the required safeguards and minimum-necessary approach. Do not assume a vendor's region setting alone proves compliance.
- Establish a documented incident/breach triage and notification workflow with Saudi counsel, including applicable statutory timelines.
- Do not use contact lists, call metadata, messages, voice, or video for advertising, profiling, or sale.

Official starting points:
- SDAIA PDPL controller/processor guide: https://dgp.sdaia.gov.sa/
- SDAIA Regulation on Personal Data Transfer outside the Kingdom: https://dgp.sdaia.gov.sa/
- SDAIA transfer-risk assessment guidance: https://dgp.sdaia.gov.sa/

## 4. Security and privacy-by-design requirements
- End-to-end encryption for message and media content; verify the actual implementation and key lifecycle before making an E2EE claim.
- Private keys stay on the user's device and are never placed in QR codes, URLs, analytics, logs, or support bundles.
- A permanent personal QR must encode only a public identity/key or a non-secret resolvable identifier. It is distinct from a temporary call invitation QR. QR pairing requires explicit recipient consent and authenticated key binding.
- Provide device/session revocation, block/report, abuse throttling, rate limits, replay protection, signed pairing, and account recovery safeguards.
- No server-side call recording by default. Any optional recording feature requires a separate legal review and explicit informed consent of all relevant participants before implementation.
- No background microphone/camera activation, no auto-answer, no silent permission requests, and no ECU/device-like remote actuation. Audio/video begins only after explicit user action and OS permission.
- Minimize signalling logs; never log SDP, ICE credentials, tokens, private keys, message bodies, or media.
- Protect secrets with managed secret storage; rotate credentials; enforce least privilege; separate staging and production credentials, databases, workers, and domains.
- Conduct threat modelling, dependency and secret scanning, penetration testing, and independent security review before any large real-user cohort.
- Design a security incident response plan, vulnerability disclosure channel, backup/restore test, and disaster recovery plan.

## 5. Infrastructure and cross-border hosting gate
Current staging infrastructure is not evidence of Saudi hosting or regulatory approval. Inventory every service and data location: static hosting, signalling, Durable Objects, TURN/STUN, analytics, crash reporting, email, push providers, payment processor, backups, support tooling, and remote administrator access.

For each vendor record:
- legal entity, country/region, service and data categories;
- processing/sub-processing role and contract;
- encryption, access controls, retention, deletion, breach notice and audit terms;
- international transfer mechanism and risk assessment where applicable;
- exit/export plan and deletion confirmation.

Review the NCA Cloud Cybersecurity Controls CCC-2:2024 and other NCA controls for applicability to E-ZERO's actual entity, customers, hosting role, and data classification. Do not assume every control applies identically to every private app; document applicability with counsel/security reviewers.

Official NCA starting point: https://nca.gov.sa/en/regulatory-documents/controls-list/ccc/

## 6. Two-stage 2,000–4,000 test programme
### Stage A — synthetic engineering load test
Use 2,000–4,000 simulated clients first. This is a technical capacity test, not a public-user launch. Use synthetic accounts and non-personal test data. Measure:
- successful registration/pairing, QR scan, mutual save and saved-friend direct call;
- audio/video connection success by carrier/network class and device tier;
- call setup latency, dropped-call rate, reconnect behaviour, packet loss, jitter, bitrate adaptation and battery/data use;
- TURN relay ratio and cost per call-minute;
- signalling concurrency, message delivery, push delivery, queue behaviour and rate limits;
- abuse resistance, denial-of-service controls, privacy leakage, and recovery after service failure.

Set numerical pass thresholds before the run; preserve raw test evidence and distinguish PASS, FAIL, PARTIAL, and UNKNOWN. No fabricated success rates.

### Stage B — closed real-user pilot
Only after written CST classification, Saudi legal review, privacy/security readiness, user-facing terms/notices, vendor/data-transfer review, and incident-response readiness:
- start with a small, invited cohort and explicit informed consent;
- increase cohort size in controlled waves (for example 50, 250, 1,000, then up to 2,000–4,000 only if each gate passes);
- provide a clear support/contact and withdrawal route;
- collect only minimal telemetry, with documented retention;
- pause immediately on a material privacy/security incident, unlawful use, or failed safety gate.

The exact permitted pilot scale, duration, and conditions must be confirmed with CST/counsel; the staged numbers above are an engineering proposal, not permission.

## 7. Revenue model guardrails
- Basic app-to-app audio/video and essential messaging should remain free as the product goal, subject to validated operating costs and legal review.
- No advertising, ad tracking, sale of personal data, or sponsored interruptions.
- Any optional subscription or voluntary support must be transparent, low-cost, clearly cancellable, and never silently activated.
- Paid extras should be non-essential (for example, optional extra storage or business administration tools) and must not weaken encryption, privacy, safety, or basic access.
- Publish prices, renewal terms, tax treatment, refund/cancellation rules, and payment-provider data flows before accepting money.
- Do not launch payments until the operating entity, consumer terms, accounting/tax treatment, and payment compliance are reviewed.

## 8. Required documents before real-user pilot
1. CST service-classification request and written response / required permit pathway.
2. Saudi legal memo covering telecom, e-commerce/consumer, entity, payment, IP, and applicable platform obligations.
3. Data inventory, processing register, data-flow and hosting-location map.
4. Privacy notice, terms of service, acceptable-use policy, retention/deletion schedule, and consent UX.
5. Processor/sub-processor agreements and international transfer assessment/safeguards.
6. Security threat model, penetration-test report, incident/breach response plan, vulnerability process.
7. Abuse, child-safety, harassment, spam, impersonation, block/report, and law-enforcement request handling policies reviewed by counsel.
8. Pilot protocol, participant consent, support process, metrics, pause/rollback plan.
9. Cost model for signalling, TURN, storage, push, support, and payment fees.
10. Corporate/entity and accounting plan for any commercial operation.

## 9. Current engineering status — do not overstate
As of this document date, the isolated Render preview service is configured with auto-deploy disabled and points to branch `ezero-pr156-render-preview-20261116`. Its latest observed deployment is live on commit `226a9ff2450dd4e6184134d511b52f64d2e22e12`. This proves only that the staging static site deployed. Existing automated browser tests are simulated and do not prove a 2,000–4,000-person real-world service, permanent personal QR identity, Saudi carrier-wide reachability, legal compliance, or production readiness.

The current page copy itself says saved-friend calls are experimental and the recipient may need the page open. The current visible QR flow describes a call-invitation QR and explicitly distinguishes it from an identity QR. Therefore permanent personal QR identity, reliable background incoming-call notifications, and fully verified saved-friend direct calling remain acceptance criteria—not completed claims.

## 10. Release gates
**Gate 0 — engineering staging:** source review, automated tests, synthetic calls, no production changes.  
**Gate 1 — security/privacy design:** threat model, data map, vendor map, encryption and retention review.  
**Gate 2 — legal classification:** written CST determination and Saudi counsel sign-off for the proposed pilot model.  
**Gate 3 — closed pilot approval:** required entity/permits/registrations, terms, notices, consent, support and incident process in place.  
**Gate 4 — controlled pilot:** cohort waves with measurable pass thresholds and stop conditions.  
**Gate 5 — commercial release:** required legal entity, licences/permits, consumer/payment/tax obligations and final security review complete.

No gate is passed by assumption. Record evidence and approvals for every gate.
