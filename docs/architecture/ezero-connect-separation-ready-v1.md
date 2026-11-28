# E-ZERO Connect — Separation-Ready Architecture (Staging)

Status: DESIGN PROPOSAL — not an implementation, deployment, or security certification.

## Goal
Make E-ZERO Connect independently buildable and deployable as a web app and later a standalone Android app without forcing a rewrite or disrupting the existing E-ZERO / Null Bench site. Keep the current working calling baseline isolated until replacement paths pass equivalent tests.

## Product boundary
Connect owns profile presentation and verified friend directory; one-time QR/invite onboarding and permanent friend relationship UX; text, voice notes, image messaging and call history; audio/video call session orchestration and incoming-call UX; privacy, block, delete and consent controls.

The host E-ZERO site owns only a launch link or optional shared navigation. It must not own Connect runtime state or be required for Connect to start.

## Proposed component boundaries
1. connect-shell: app entry, routing, language selection (Urdu / Arabic / English), responsive UI and installability.
2. connect-identity: browser device identity, Android installation identity, consent screens, public-key display and proof verification. Private keys remain non-exportable in their original keystores.
3. connect-friends: QR/invite parsing, mutual approval, relationship state, trusted-device list, block/delete.
4. connect-messaging: text, image, voice-note metadata and delivery state. Media storage/retention is explicit and consent-based.
5. connect-calls: WebRTC session lifecycle, audio/video controls, call log and incoming-call state.
6. connect-notifications: push registration, signed wake validation, Android notification channel and full-screen intent policy. This module is incomplete until real FCM delivery and locked-screen ringing are tested on physical devices.
7. connect-platform-web: browser storage, service worker, WebRTC and browser permission adapters.
8. connect-platform-android: Android Keystore, FCM, Telecom/notification integration, camera/microphone and lifecycle adapters.
9. connect-contracts: versioned, platform-neutral DTOs and API schemas. No UI component may call Worker/DO endpoints directly.
10. connect-backend: private signaling, friendship registry, inbox/queue and dispatch services. Every public operation must authenticate, authorize, enforce expiry/replay protection and re-check revocation at dispatch.

## Dependency direction
UI -> use-cases -> domain/contracts <- platform adapters.
Backend adapters implement contracts. Domain modules do not import browser globals, Android classes, Workers or Durable Object SDKs. Cross-module calls use typed interfaces; no circular dependencies.

## Identity and origin migration
- The existing browser identity is origin-bound to https://coma39658-ctrl.github.io and its IndexedDB database. A new hostname or standalone app has a different storage boundary.
- Never copy or export the browser private key to migrate identity.
- A future migration must be a user-consented, short-lived, one-use challenge signed by the existing browser key and verified by an independently pinned Root trust anchor. Bind proof to destination app/origin, installation fingerprint, relationship ID, nonce and expiry.
- Android installation keys remain distinct, non-exportable Android Keystore keys.
- Public SPKI/fingerprint display is informational until matched against an independently trusted out-of-band value. Self-displayed identity is not a trust anchor.
- A parser PASS is not a signature-verification PASS, enrollment, friendship or call authorization.

## API and backend rules
- Keep Workers and Durable Objects behind versioned interfaces (/v1/...); internal registry reads use private service bindings and secrets, never public ingress.
- Enforce one-use challenges atomically, short expiry (maximum 60 seconds for enrollment proof), replay rejection, active-relationship checks and revocation checks at both write and dispatch.
- Do not expose internal secrets, Root bootstrap material, signing keys or private identity keys to clients.
- No FCM sender credential or wake-signing pin is assumed to exist. Missing credentials/pins must fail closed; do not simulate successful push delivery.
- Do not route an incoming call to a connected foreground socket and describe that as background/closed-app ringing.

## Data and privacy
- Separate identity, friend relationships, messages, media references and call metadata into distinct stores/contracts.
- Minimize server-retained content. Do not record calls. Message/media retention must be explicit, bounded and user-controlled.
- Block/delete must affect authorization and dispatch, not merely hide a row in the UI.
- Do not claim end-to-end encryption for a path until key agreement, message encryption, attachment encryption, rotation and negative tests are implemented and independently reviewed.

## Standalone packaging strategy
Phase A — isolate without behavior change:
- Introduce the Connect module boundary and adapter interfaces in a staging branch.
- Keep the existing page and calling implementation as the compatibility adapter.
- Add contract tests for routing, identity boundaries, friend state, call lifecycle and failure states.

Phase B — independent web build:
- Build Connect to its own artifact and deploy to a separate staging origin.
- Keep it clearly marked as a separate test environment. Do not assume origin-bound browser identity is shared with the current site.
- Test fresh install, same-origin persistence, permissions, network loss/recovery and two-device calls.

Phase C — Android app:
- Package the same domain/contracts behind Android platform adapters.
- Use Android Keystore for installation keys and FCM only after credentials, sender identity and signing pin are provisioned securely.
- Validate ringtone + Accept/Decline while foreground, background, app swiped away and screen locked, on at least two physical Android devices.

Phase D — controlled cutover:
- Preserve the existing app as rollback target.
- Migrate only after explicit user consent and proof validation.
- Roll out to a small test cohort first; monitor failures; retain a tested rollback path.
- Production cutover requires release gates and explicit approval for the exact release.

## Required release gates
- Static/security tests pass; no secrets in repository or client bundle.
- Contract and compatibility tests pass.
- Existing audio/video baseline remains green.
- Browser two-device QR, save-friend and direct reconnect tests pass.
- Physical Android incoming-call tests prove audible ringtone and Accept/Decline in all required app/lifecycle states. Until then status is PARTIAL / UNKNOWN, not PASS.
- 4 GB RAM Android profile: bounded video resolution/FPS/bitrate, memory and thermal testing.
- Independent Root trust-anchor verification and revocation tests pass.
- Privacy, retention, block/delete and failure-state review passes.
- Rollback tested before any production cutover.

## Non-goals for this staging document
This document does not move code, change the live app, change DNS/origin, configure credentials, deploy a service, merge a PR or claim any unproven capability. It establishes the extraction plan and safety contracts only.
