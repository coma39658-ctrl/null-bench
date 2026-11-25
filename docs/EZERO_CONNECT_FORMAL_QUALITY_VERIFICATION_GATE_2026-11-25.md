# E-ZERO Connect — Formal Quality & Verification Gate
Date: 2026-11-25
Branch: ezero-connect-global-rebuild-realtimekit-staging-20261125
Status: specification only; no production changes

## 1. Assurance claim and limits
The release target is evidence-backed correctness against explicit requirements, not an unqualified claim of "100% bug-free". Tests can establish specified properties for tested models and environments; they cannot prove every real-world device, carrier, OEM power policy, or provider outage behaves identically. Each result must be labelled MODEL/UNIT/INTEGRATION/EMULATOR/PHYSICAL/PRODUCTION.

## 2. Non-negotiable invariants
I1 Identity: a device identity is a P-256 public key plus a locally protected private key; private key material never leaves the device.
I2 Invite authenticity: an invite is accepted only when its signature verifies against the claimed key and canonical encoding.
I3 Freshness: invite nonce is single-use; expiry is enforced; replayed, expired, malformed, or wrong-origin invites are rejected.
I4 Mutual consent: a call cannot transition to CONNECTED until the callee explicitly accepts the matching live invitation.
I5 Trusted friend: a friend is SAVED only after both sides verify the same canonical identity/fingerprint and both required save proofs exist.
I6 No repeated QR: a SAVED relationship can reconnect without another QR scan, but still requires a fresh call invitation and recipient consent.
I7 Call isolation: each call has a unique unpredictable call ID; events from another, ended, or expired call cannot mutate its state.
I8 Authorization: server-issued room credentials are short-lived, scoped to one room/participant/role, and never exposed before authenticated friend authorization.
I9 Push minimization: push payload contains only opaque call reference, expiry, and authenticated routing metadata; no private keys, long-lived tokens, or media credentials.
I10 Idempotency: duplicate delivery of the same event does not create duplicate calls, friend records, or state transitions.
I11 Terminal states: ACCEPTED/REJECTED/CANCELLED/EXPIRED/ENDED are mutually exclusive terminal outcomes for one invitation; late events are ignored.
I12 User controls: camera/microphone are never activated before platform permission and explicit user action; no auto-answer.
I13 Privacy: logs and analytics exclude message bodies, private keys, access tokens, and unnecessary personal data.
I14 Compatibility: failure of the new provider path leaves the existing stable path unchanged; feature flag defaults OFF until release approval.
I15 Cost guard: no paid-plan upgrade, billing switch, or uncontrolled retry/poll loop; usage limits and circuit breakers are explicit.

## 3. Mathematical/state-machine model
Model invitation state as:
CREATED -> DELIVERED -> RINGING -> ACCEPTED -> JOINING -> CONNECTED -> ENDED
Alternative terminal paths: REJECTED, CANCELLED, EXPIRED, FAILED.
Permitted transitions must be explicit; all other transitions are rejected.
Safety properties:
- CONNECTED implies a prior valid DELIVERED, RINGING, and explicit ACCEPTED for the same call_id, recipient_device_id, and unexpired invitation.
- At most one terminal outcome per call_id.
- A stale event cannot move a terminal state backwards.
- One invitation cannot authorize two participants/devices unless a separately modelled group invitation permits it.
Liveness properties (conditional): if network/provider/OS delivery remains available and the user accepts before expiry, the client eventually reaches CONNECTED or a typed FAILED state; no promise of delivery under unavailable networks or OEM restrictions.

## 4. Required test families
A. Deterministic unit tests: canonical serialization, signature verify/fail, expiry boundaries, nonce consumption, role/room scoping, call transition table, localization keys.
B. Property-based tests: random malformed payloads, duplicate/reordered events, clock skew boundaries, Unicode names, network IDs, repeated accept/reject/cancel; assert invariants after every generated operation.
C. Fuzz tests: QR parser, signed invitation parser, WebSocket/provider event decoder, push payload parser; bounded memory/time and fail-closed behavior.
D. Model-based tests: generate event sequences from the state machine and compare implementation state to reference model.
E. Concurrency tests: simultaneous accept/reject, duplicate push, reconnect racing with call end, two devices accepting same invite; exactly one valid outcome.
F. Contract/integration tests: backend auth -> room credential -> Web SDK and Android SDK; expired/revoked tokens; unauthorized friend; provider errors; webhook signature validation.
G. Android lifecycle tests: foreground, background, process killed, screen locked, notification permission denied, full-screen intent unavailable, battery saver, Doze, Wi-Fi/mobile handover, Bluetooth/audio route, existing cellular call.
H. Media/network tests: audio/video permission, track publish/subscribe, ICE/TURN or SFU reconnect, packet loss, jitter, bandwidth reduction, camera rotation, app pause/resume, audio focus.
I. Privacy/security tests: secrets scan, dependency/SBOM scan, static analysis, authorization matrix, replay, spoofed sender, wrong-origin, log redaction, rate limits, abuse and denial-of-service bounds.
J. Accessibility/localization: Urdu RTL, Arabic RTL, English LTR, large text, screen reader labels, contrast, keyboard/back navigation.

## 5. Quantitative acceptance criteria
- 100% of defined state-transition table cases pass.
- 100% of invariant assertions pass across generated model/property test runs.
- 0 unresolved Critical/High security findings for the release scope.
- 0 leaked secrets in repository/build artifacts/logs.
- 0 unauthorized room-token issuance in negative authorization matrix.
- 0 duplicate active calls or duplicate friend records under duplicate/reordered event tests.
- No crashes, ANRs, or unhandled promise rejections in defined lifecycle test matrix.
- Media quality: record measured setup time, round-trip latency, jitter, packet loss, reconnect time, and audio/video freeze ratio; set thresholds after baseline measurements rather than inventing them.
- Physical test evidence required for claims about actual ringing, locked-screen behavior, camera/mic, and real network handover.

## 6. Test execution order and stop rules
G0 Read-only repository/account/SDK inventory; verify exact SDK versions and Android min/target SDK. No credentials or billing changes.
G1 Implement pure state machine + reference model + deterministic/property tests.
G2 Add provider adapter behind OFF-by-default feature flag; mock provider tests first.
G3 Validate server token authorization and webhook signatures with test credentials.
G4 Web + Android integration and lifecycle tests.
G5 One physical two-phone test only after G0-G4 are green; do not repeat old QR tests unless a changed component requires a new hypothesis.
G6 Release review; staging evidence only. Production deploy/merge, billing changes, account deletion, or new paid services require explicit approval.

Stop immediately on any invariant failure, secret exposure, unexpected charge, production mutation, or unexplained state transition. Record exact failing seed, event trace, build SHA, SDK versions, device/OS, and provenance.

## 7. Technical references reviewed
- NISTIR 8397: threat modelling, automated tests, static analysis, secrets scanning, black-box and structural tests, historical tests, fuzzing, web scanning, and dependency review.
- Cloudflare RealtimeKit docs (updated 2026-10-19): app backend owns identity/workflow; backend creates meetings/participants and issues participant tokens; SDK handles client session/media.
- Android Developers media-app notifications: dedicated incoming-call notification channel, ringtone audio attributes, high importance, and full-screen intent flow for locked-device call UX.
- Google DeepMind AlphaProof Code (2026-11-10): machine-checked proofs illustrate the value of precise specifications and proof-checking; this is not evidence that E-ZERO itself is formally verified.

## 8. Release evidence format
For each gate record: requirement ID, test ID, expected result, observed result, PASS/FAIL/BLOCKED, environment, commit SHA, SDK versions, timestamp, log/artifact reference, and reviewer. A green CI run is not a physical-device pass. Never report an unrun test as passed.


## 9. Threat intelligence, dark-web exposure, and adversary emulation
Purpose: use attacker knowledge to harden E-ZERO, strictly as defensive threat-informed engineering. Do not access, buy from, communicate with, or download from criminal marketplaces; do not acquire stolen credentials, private data, malware, or exploit kits. Use reputable public reports, vetted commercial feeds if separately approved, and lawful monitoring services.

### 9.1 Threat-intelligence sources and handling
- Map relevant attacker behaviors using MITRE ATT&CK; map defensive engagement/deception only in a controlled lab using MITRE Engage.
- Ingest high-confidence public advisories and exploited-vulnerability information (CISA KEV and vendor security advisories); record source, timestamp, confidence, expiry, affected component, and remediation.
- Evaluate MISP and OpenCTI as self-hostable CTI aggregation options; use STIX 2.1/TAXII 2.1 for normalized exchange where supported.
- Consider dark-web exposure monitoring only for E-ZERO-owned domains, brand identifiers, and authorized organization email domains. Prefer vendors that provide evidence provenance, false-positive handling, retention controls, deletion, and clear legal sourcing. Never search for or expose personal data unrelated to E-ZERO.
- Treat leaked-password alerts as an incident signal: do not store or test plaintext passwords. Notify the owner, force reset/revoke sessions where authorized, enable MFA/passkeys, and preserve minimal evidence.
- Threat feeds are untrusted input: validate schema, signatures where available, source reputation, freshness/TTL, deduplicate, and require human review before blocking or changing production behavior.

### 9.2 Adversary model for E-ZERO
Test likely abuse cases: account/device impersonation; QR substitution and replay; stolen or revoked device; push spoofing and replay; call-ID guessing; unauthorized room-token requests; broken object-level authorization; WebSocket/event injection; malicious deep links; dependency/supply-chain compromise; secrets in build artifacts; denial-of-service and resource exhaustion; social engineering and notification abuse; Android exported-component/intent abuse; insecure local storage and backup leakage; log/analytics leakage; downgrade and provider failover confusion.

### 9.3 Authorized red-team / purple-team test plan
- Only test E-ZERO-owned repositories, preview services, test accounts, and devices explicitly in scope. No scanning or exploitation of provider infrastructure, public third-party systems, other users, or real dark-web targets.
- Start with passive inventory and configuration review; then static analysis, dependency/SBOM review, secret scanning, dynamic application testing, API authorization tests, and controlled adversary emulation.
- Create a threat-to-control matrix: ATT&CK technique -> E-ZERO attack surface -> expected detection/prevention -> test case -> evidence -> residual risk.
- Use benign synthetic identities, synthetic push payloads, fake secrets, and isolated test data. Any decoy/honeytoken must be fictitious and isolated; it must never collect real users' credentials or private content.
- Red-team findings are not "fixed" by disabling essential controls. Fix root causes, add regression tests, and verify both security and usability.
- A human approves any production-facing block, account lock, takedown, credential revocation, or external notification.

### 9.4 Additional security gates
K. Threat modelling: STRIDE per component and abuse-case analysis for identity, QR, API, signaling, media, push, storage, and admin surfaces.
L. Standards-based checks: OWASP ASVS 5.0 for web/API; OWASP MASVS for Android/mobile; NIST SSDF (SP 800-218) for development and release; NIST secure software verification guidance; CIS Controls mapping where applicable.
M. Supply chain: generate SBOM (CycloneDX or SPDX), pin dependencies, verify provenance/signatures, scan known vulnerabilities, review transitive dependencies, and test reproducible build/provenance where feasible.
N. Runtime defenses: least privilege, short-lived scoped tokens, rate limits, abuse throttles, replay protection, secure headers/CSP, TLS, safe error handling, privacy-preserving audit logs, and alerting for anomalous auth/call patterns.
O. Incident readiness: documented credential rotation, device revocation, session invalidation, provider outage/failover, data breach triage, backup/restore, and user notification playbooks.
P. Dark-web/credential exposure response: validate alert independently; assess whether it concerns E-ZERO-controlled identifiers; rotate/revoke only affected credentials; document source confidence and avoid retaining illicitly obtained material.

### 9.5 New acceptance criteria
- Every in-scope high-risk ATT&CK/STRIDE scenario has a mapped control and a test or a documented accepted residual risk.
- No unauthorized access to another user's friend list, profile, messages, call metadata, or media room.
- No replayed invite/push, forged caller identity, cross-call event injection, or privilege escalation succeeds in the staging threat suite.
- No secret or personal data appears in client bundles, crash reports, CI logs, or threat-intelligence artifacts.
- Every CTI indicator has provenance, confidence, first-seen/last-seen, expiry, and a review decision; stale/low-confidence indicators never trigger automatic production blocking.
- Dark-web monitoring is limited to explicitly authorized E-ZERO identifiers and does not ingest stolen datasets or unrelated personal information.
- Security test report includes scope, methods, limitations, findings, remediation, retest evidence, and residual risk; no blanket "secure" claim based solely on a scan.

## 10. Additional reference frameworks
- OWASP ASVS 5.0 (web/API verification requirements) and OWASP MASVS (mobile application security verification).
- NIST SP 800-218 SSDF (secure development lifecycle); NIST SP 800-150 (cyber threat information sharing); NISTIR 8286A Rev.1 (risk-informed threat intelligence).
- MITRE ATT&CK (adversary tactics/techniques), MITRE Engage (controlled adversary engagement/deception), and CIS Controls v8.1 mappings.
- CISA guidance on cyber decoys (September 2026): use isolated fictitious decoys/honeytokens and integrate detections with incident response.
- CTI exchange: STIX 2.1 / TAXII 2.1; evaluate MISP and OpenCTI for normalization and analyst workflow.
