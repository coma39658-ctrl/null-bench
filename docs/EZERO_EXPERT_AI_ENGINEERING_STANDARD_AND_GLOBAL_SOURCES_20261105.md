# E-ZERO Secure Pair — International Senior Engineering + Responsible AI Development Standard
**Date:** 2026-11-05  
**Owner authorization:** research, propose, implement and test improvements in the isolated working branch. **No public deployment, spending, secret access or account/device privilege is implied**.  
**State:** engineering process active; final public phone trust/calling gate **NO-GO** pending evidence.

## 1. Objective — simple for everyone, rigorous behind the scenes
- First time: **Show QR → Scan (or private one-link fallback) → explicit Allow/Reject → Connected** only after verified secure transport.
- Returning: **Trusted Devices → Connect** with fresh proof, revocation checks, and minimal user interruptions.
- Android/iPhone, Urdu first (plus English and Arabic), large touch targets, error messages in ordinary language, Back/Cancel/Stop always visible.
- Authentication is not device enrollment; a synced Passkey does **not** prove which physical device owns a private P-256 key.
- No opaque JSON or long manual fingerprint/SDP fields in the main flow. Keep expert diagnostics behind an optional Advanced panel.

## 2. Engineering question discipline
Each code change gets an item in [machine-readable 25-question review](EZERO_EXPERT_AI_ENGINEERING_REVIEW_20261105.json). A qualified engineer or AI reviewer must address:
1. **Problem / user outcome:** What concrete customer pain is being removed? What is the observable completion criterion?
2. **Threat model:** What attacker can exploit the change? What happens under stolen devices, forwarded QR, replay, fake Origin and lost session?
3. **Authentication:** Which server-verified evidence (not browser booleans) establishes the account and distinct physical device keys? What is the actual WebAuthn RP/Origin?
4. **Architecture:** Is this the existing module's responsibility or does it add a second truth source, hidden state, or brittle dependency? Does the frontend and trusted API really share one HTTPS origin?
5. **Security controls:** Challenge nonce expiry, double-spend/replay, CSRF, SameSite, HTTPS, key rotation, rate limits, per-account isolation, user consent, active revocation.
6. **Performance / network:** What breaks on weak mobile data, Android/iOS background, carrier NAT, TURN relay, or constrained battery? Are latency/call completion user-observable?
7. **Privacy:** Why is each field needed? Is it optional? Where is it encrypted, stored and deleted? Do links, logs, screenshots and analytics leak QR or secrets?
8. **AI usefulness and limits:** Can an AI generate variants, test cases, localized UX and research summaries without acquiring more privileges? How are source validity, injection, output verification, tool budgets and human approvals enforced?
9. **Reliability / cost:** Failure message, retry state and rollback, resource quotas, billing cap, emergency kill switch, staging rollback, operational signals without personal data.
10. **Accessibility / internationalization:** WCAG 2.2, keyboard/screen reader, touch target, clear status, Urdu RTL and English/Arabic without language-purity lockouts.
11. **Supply chain:** Pinned dependency versions and GitHub Actions, least-privilege CI, secret scanning, SBOM and reproducible build.
12. **Evidence / release:** Which test proves a result? Simulation is **not** physical validation; a new feature can pass CI but public release must stay NO-GO until owner, security and device gates complete.

**Review states:** `LAB_PASS`, `OPEN`, `BLOCKED`, `UNKNOWN`; use `PASS_PHYSICAL` only when independently documented evidence actually exists (not in current schema). Evidence links are required for any `LAB_PASS`. There is deliberately no score or AI "confidence" that can override public deployment requirements.

## 3. Responsible engineering automation
**AI-proposed change pipeline**: Source → concise question/answer and confidence limits → scoped design decision → minimal patch → static safety checks → negative and adversarial tests → CI evidence → architecture/security review → physical pilot → explicit release approval.

- AI may research read-only public documentation, compare APIs, suggest code, audit differences, generate adversarial tests, and interpret failures.
- AI cannot declare that a real phone passed because Chromium passed, claim a new account is verified from a client boolean, approve itself to create trusted devices, merge protected code, expand secrets, change billing, enable public WebSockets, perform vehicle writes or erase evidence.
- All retrieved web pages and model outputs are untrusted inputs to the application. Use strict server-side policies and existing vetted cryptographic verifiers.
- Release decisions rely on deterministic tests, trusted identity records, independent human review and phone evidence. The model can assist but does not become the authorizing principal.
- Avoid unbounded autonomous loops, background polling or expensive AI calls. Prefer low-cost one-shot tests, auditable CI and a visible user action.
- Errors: Urdu/English code and recovery hint, stop only on major security risk; do not fabricate normal, Verified, Connected, or Pass.

## 4. Research crosswalk (official international sources, checked 2026-11-05)
| Source | Relevant design decision |
|---|---|
| [W3C WebAuthn Level 3 Recommendation, 25 Aug 2026](https://www.w3.org/TR/webauthn-3/) | Exact Origin/RP ID, authenticator user consent, crypto challenges; select final canonical hostname before enrolling production passkeys |
| [FIDO Alliance Passkeys](https://fidoalliance.org/passkeys/) | Synced vs device-bound credentials, biometrics remain local, require a distinct device-key and pairing approval |
| [NIST SP 800-63B-4 (2025)](https://csrc.nist.gov/pubs/sp/800/63/B/4/final) | Authenticator lifecycle, session risk, phishing-resistant user identity, owner/recovery plan |
| [OWASP ASVS 5.0 (2025)](https://asvs.owasp.org/) | Review requirements for authentication, sessions, access control, logging and verification |
| [Cloudflare Worker-first assets](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) | Worker executes before static asset requests; reserved auth API never bypasses policy |
| [OWASP GenAI 2026](https://genai.owasp.org/2026/09/01/owasp-genai-security-project-unveils-2026-top-10-for-llm-applications-new-agent-control-standard-and-sponsors-as-community-tops-30000-members/) and [NIST AI 600-1](https://www.nist.gov/publications/artificial-intelligence-risk-management-framework-generative-artificial-intelligence) | Prompt injection, information leaks, excessive agent authority, risk mitigation and AI evaluation |
| [W3C WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/) | Accessibility review for mobile, touch targets, keyboard/screen reader, localization |
| [Google SRE practices](https://sre.google/sre-book/service-best-practices/) | Measure real user outcomes, availability/latency, error budgets, rollback |
| [OpenSSF Scorecard](https://openssf.org/projects/scorecard/) | CI least privilege, pinned dependencies, review, source/release risks |

## 5. This phase — concrete changes, not only questions
- Safe Urdu mobile-first preview source: `secure_connect/pair_v1/preview_worker_lab/public/index.html` with no JS, login or data collection.
- Isolated Cloudflare Worker + `wrangler.jsonc`: `workers_dev=false`, `run_worker_first=true`, no auth/room DO binding, no production deployment. `/api/**` and `/secure-pair/**` are **503 disabled**, including if an environment flag claims enabled. Root static page only. All unknown paths denied. CSP, no-store and noindex headers.
- `tests/test_ezero_secure_pair_v1_preview_worker_contract_v0_1.mjs`: checks root, privacy headers, no secret assets, no bypass, no account/call grants even on forged flags.
- `tests/test_ezero_secure_pair_preview_workerd_local_v0_1.mjs`: tests actual **localhost Cloudflare workerd** and static assets using the real preview config; no Worker public deployment.
- `scripts/ezero_expert_ai_review_gate_v0_1.mjs`: offline CI validates 25 review prompts, evidence, priorities, next actions, no-go release and AI safety rules. It does **not** call a model or auto-deploy.
- Existing QR/Passkey/device evidence and same-origin CSRF session tests remain required in the same CI. The old public site is unchanged.

## 6. Unfinished mandatory P0 release work
Independently verified real owner/account + recovery; choose final same-origin HTTPS host and RP; authenticated endpoint and session issuance (not lab observation); 90-second one-use enrollment and true two-party trusted-device activation; stolen-phone revocation and live socket eviction; physical Android/iPhone Passkeys, QR, calls and cross-network TURN; cost/abuse controls; third-party security review; explicit owner sign-off. See [release gates](EZERO_SECURE_PAIR_V1_RELEASE_GATES_20261105.json).

**Public status: NO-GO.** Experimental preview and academic/standards research do not equal a public login/calling product. The old deployed app and Cloudflare public-call settings remain untouched.
