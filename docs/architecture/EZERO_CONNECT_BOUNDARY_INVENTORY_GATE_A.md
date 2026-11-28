# E-ZERO Connect Boundary Inventory — Staging / Gate A

Date: 2026-11-28  
Status: PARTIAL INVENTORY — repository-wide implementation audit still required  
Related architecture: `docs/architecture/EZERO_CONNECT_APP_SEPARATION_V1.md`  
Safety: no production files, routing, keys, data, or deployment configuration changed.

## Purpose

Record what is already evidenced about the current Connect implementation, what belongs to the future standalone app, and what must still be inspected before extraction. This is an inventory, not a claim that all dependencies have been found.

## 1. Evidence-backed components

| Component | Current known evidence | Ownership proposal | Status |
|---|---|---|---|
| Browser friendship identity | `js/ezero_connect_identity_v1.js`; IndexedDB database `ezero-connect-device-identity`; P-256 WebCrypto identity on canonical origin | Connect identity module | Known from prior inspected implementation |
| Root identity read-only preview | PR #247: `staging/ezero-root-public-identity.html` and copied identity module | Connect identity diagnostics / recovery surface | QA PASS; public Pages availability UNKNOWN |
| Android installation identity | `AndroidEnrollmentKeyStore.kt`; non-exportable P-256 Android Keystore key | Connect Android identity adapter | Known from prior inspected implementation |
| Android Root proof verifier | `BrowserPermanentIdentityVerifier.kt` verifies signed Root identity token | Connect identity verification adapter | Known; does not itself hold browser private key |
| Android QR proof parser | PR #246; strict fail-closed structural parser | Connect pairing module | Structural parser tests PASS; not friendship or call authorization |
| Browser/Android dual-signature contract | PR #243; browser and Android keys remain distinct | Connect identity-binding protocol | Crypto contract tests PASS; live consented relay not yet implemented |
| Active friendship Registry read adapter | PR #244 internal read endpoint | Connect friends/authorization adapter | Internal read adapter candidate; deployment/binding status must be verified |
| Call authorization | PR #238 active relationship checks and invite validation | Connect call authorization service | Staging code evidence; end-to-end dispatch still incomplete |
| Offline call queue | PR #240 internal guarded queue and one-time claim/reject | Connect call queue service | Staging component; Registry checks and push dispatch not complete |
| Android incoming-call candidate | PR #231 enrollment/token registration candidate | Connect notifications / incoming call module | Incomplete; no verified FCM dispatch or closed-app ringing |
| Frozen call path | Existing audio/video baseline and frozen regression workflow | Connect calls module | Preserve unchanged until physical equivalence tests pass |

## 2. Proposed ownership boundaries

### Connect-owned (to extract behind interfaces)
- Profile, friends, pairing QR, identity binding and device registry client
- Chat, voice notes, image transfer and call history
- WebRTC call state, signaling client and TURN credential handling
- Android camera/microphone permissions, incoming-call UI, ringtone, foreground service and push receiver
- Connect-specific localization, privacy controls and diagnostics

### Shared platform candidates (only through documented APIs)
- Static public brand assets and documentation
- Generic health/status endpoints
- Redacted operational telemetry

### Explicitly separate
- OBD Dashboard and its read-only evidence pipeline
- Null Bench / AI Studio functionality not required by Connect
- Any unrelated E-ZERO worker, storage, credentials or customer data

## 3. Dependencies that must be enumerated from the actual code

The following are not yet fully inventoried and remain UNKNOWN until repository and runtime configuration inspection is complete:

1. All HTML entry points and script imports that render Connect UI.
2. All CSS, localization dictionaries, icons and image assets used by Connect.
3. Service worker registrations, scopes, cache names and PWA manifest.
4. All localStorage, IndexedDB, CacheStorage and Android persistent storage keys.
5. Every Worker, Durable Object class, route, binding, environment variable and origin allowlist used by Connect.
6. WebSocket signaling, TURN/STUN providers, credential lifetimes and network fallback.
7. Android Gradle modules, package/applicationId, manifest components, services, receivers, notification channels and permissions.
8. Firebase project association, FCM sender configuration, APNs equivalents (if any), push token lifecycle and server-side dispatch.
9. Data stores, schema versions, media storage, retention/deletion and backup/restore.
10. Build pipelines, signing, artifact provenance, staging/production separation and release rollback.

No secret values should be copied into this inventory. Record only secret *names*, owning service, and whether a staging-only value exists.

## 4. Known blockers to a safe standalone origin

- Browser identity IndexedDB is origin-bound to `https://coma39658-ctrl.github.io`; a new Connect domain will not automatically access it.
- Android installation identity is installation-bound and separate from browser identity.
- No private key export or copying is permitted.
- A user-consented, short-lived challenge/signature ceremony is needed to bind an existing trusted identity to a new origin or installation.
- Root trust anchor must be independently verified; self-displayed fingerprint is not sufficient.
- Private Registry/service binding and authoritative revocation checks must be confirmed before enabling public ingress.
- Firebase sender credentials and authenticated wake-signature pin were not present in the inspected staging candidates.
- Closed-app and screen-off incoming ringtone remains UNKNOWN until tested on physical Android devices.

## 5. Required next inspection sequence

1. Inspect repository tree on the default branch and relevant staging branches; classify all Connect files and imports.
2. Inspect Worker/DO source and deployment manifests; map each route to its environment and binding.
3. Inspect Android Gradle tree, manifest and services; map runtime permissions and lifecycle.
4. Inspect browser storage and service worker contracts; document origin and migration dependencies.
5. Build a dependency graph; identify shared files that must become interfaces before moving.
6. Add architecture boundary tests before any runtime extraction.
7. Only then create a parallel standalone shell with synthetic test identities and separate staging services.

## 6. Exit criteria for Gate A

Gate A is complete only when every relevant file, runtime component, persistent store, network endpoint, secret *name*, deployment binding and cross-product dependency is either:
- assigned to Connect,
- assigned to shared platform with a documented API,
- assigned to another E-ZERO product, or
- explicitly marked unused/legacy with evidence.

Unknowns must not be silently classified as unused.

## 7. Current decision

This inventory is PARTIAL. It documents previously verified implementation facts and explicit unknowns. It does not authorize production merge, deployment, domain cutover, signing changes, real-user data migration, or modification of the frozen call implementation.
