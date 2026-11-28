# E-ZERO Connect — Repository Boundary Audit (Gate A, Pass 1)

Date: 2026-11-28  
Repository inspected: `coma39658-ctrl/null-bench` default branch `main`  
Tree evidence: 267 entries; GitHub tree response reported `truncated=false`.  
Status: PARTIAL — this is a web-repository audit, not a complete cross-repository/runtime inventory.

## Executive findings

1. Connect is currently embedded in the same static-site repository and origin as Null Bench / AI Studio. The Connect pages use relative asset paths and the shared root service worker / root-scope PWA setup.
2. The Connect communications page imports a large set of independent JS/CSS modules. A clean standalone extraction must first replace relative-path assumptions with explicit module/API boundaries.
3. The browser automatic-signaling feature is explicitly disabled by a checked-in feature flag. The existing manual invitation flow remains the fallback.
4. A Cloudflare Worker + Durable Object signaling pilot exists in the repository, but its checked-in config permits the canonical GitHub Pages origin, while a manual deployment workflow refers to a different source path, commit, Worker name and Render origin. This discrepancy must be reconciled before any deployment; no deployment is implied by the source file.
5. The checked-in PWA manifest for Connect declares root scope `./`, so it is not isolated from sibling pages on the current site. The general `service-worker.js` caches root site assets and deletes older cache names with the shared `ezero-null-bench-` prefix.
6. No Android Gradle project, Android manifest, Kotlin source, Firebase configuration, or push receiver appeared in the inspected 267-entry tree. These belong to a separate repository/artifact or are otherwise not present here; their location is UNKNOWN from this audit.
7. No production code or deployment configuration was changed.

## 1. Confirmed web entry points and modules

### Main communications page

`ezero_secure_connect_communications_v0_3.html` imports:
- CSS: `ezero_secure_connect_live_p2p_v0_1.css`, `ezero_secure_connect_one_tap_qr_v0_1.css`, `ezero_secure_connect_modern_communications_v0_3.css`, `ezero_secure_connect_quick_nav_v0_1.css`
- QR vendor: `js/vendor/ezero-qrcode-generator-mit.js`
- JS: live P2P, simple near/far, contacts, install/share, one-tap QR, modern communications, peer profile, people, auto-signaling config, auto-signaling pilot, quick navigation
- Page CSP currently says `connect-src 'self'`; this is an important constraint to reconcile with any external WSS signaling origin before enabling automatic signaling.

### QR / identity page

`ezero_secure_connect_live_p2p_v0_1.html` imports:
- `js/ezero_secure_connect_public_qr_v0_2.js`
- `js/ezero_secure_connect_remote_invite_v0_2.js`
- QR vendor library
- `secure-connect.webmanifest`
- CSP currently says `connect-src 'none'`, so this page is intentionally not a signaling client in its current checked-in form.

### Additional Connect pages and modules present

- `ezero_secure_connect_preview_v0_1.html`
- `ezero_trusted_friends_staging_20261106.html`
- `ezero_secure_connect_privacy_v0_2.html`
- `ezero_secure_connect_one_request_lab_20261106.html`
- Contact/call dock, immersive video, in-call messages, saved-friend stage, contacts, device identity, install/share, QR, peer profile, policy i18n and navigation modules under `js/`.
- Matching Connect styles are under `css/`.

These files are candidates for the Connect product boundary, but not all are necessarily production entry points. Each must be classified as current, legacy, staging, test fixture or unused before moving.

## 2. PWA and service-worker coupling

### Connect manifest

`secure-connect.webmanifest` declares:
- Name: E-ZERO Secure Connect
- `start_url: ./ezero_trusted_friends_staging_20261106.html`
- `scope: ./`
- standalone display
- icons from the repository root

`secure-connect-staging.webmanifest` also declares `scope: ./` and uses the trusted-friends staging page as its start URL.

### Shared service worker

`service-worker.js` uses cache name `ezero-null-bench-v7-ai-studio-v03-20261103`; its app shell includes `./`, `./index.html`, `./manifest.json` and root icons. Its activation handler deletes prior cache keys beginning `ezero-null-bench-`. It handles same-origin GET requests under its registration scope.

**Extraction risk:** moving Connect to a new origin with a separate service worker is the cleaner boundary. Do not change the existing shared worker or its cache deletion rules as part of Connect extraction; that could affect Null Bench / AI Studio users. Confirm the actual registration call and scope from the hosting/runtime before changing either worker.

## 3. Browser identity and storage

The file `js/ezero_secure_connect_device_identity_v0_1.js` is explicitly labeled as a staging isolated local identity store:
- IndexedDB DB: `ezero_secure_connect_device_identity_staging_v0_1`
- Store: `device`
- Record key: `current`
- P-256 ECDSA private CryptoKey must be non-extractable.
- Comment explicitly says this is a local trusted-device prerequisite, not a remote call inbox.

Separately, prior Root identity work records a browser identity database `ezero-connect-device-identity` on the canonical GitHub Pages origin. These are distinct database names and must not be conflated or migrated without a user-consented identity-binding protocol.

A full storage-key audit across all imported modules is still pending. No private-key export/copy is allowed.

## 4. Signaling service and deployment mismatch

### Checked-in pilot Worker

`signaling/cloudflare/src/worker.js`:
- signaling-only; no media/chat storage by design
- `GET /v1/health`
- WebSocket route `/v1/rooms/{32-char-room}`
- requires exact `Origin === env.PUBLIC_ORIGIN`
- uses Durable Object class `SignalRoom`
- room TTL 10 minutes; bounded signal/message sizes
- requires authenticated hello before a socket receives a host/guest role

### Checked-in Wrangler config

`signaling/cloudflare/wrangler.jsonc`:
- Worker name `ezero-browser-signaling-pilot`
- entry `src/worker.js`
- `workers_dev: true`
- PUBLIC_ORIGIN is canonical GitHub Pages origin
- Durable Object binding `ROOMS` → `SignalRoom`

### Manual staging workflow

`.github/workflows/ezero-connect-signaling-worker-manual-staging-deploy.yml` references:
- checkout commit `955fae745c15830231719caa48c1262a438eae11`
- working directory `signaling/ezero-connect-v1`
- Worker name `ezero-connect-signal-staging-20261120`
- allowed origin `https://ezero-connect-live-clean-staging-20261121.onrender.com`

These values do not match the current default-branch pilot config/path. The workflow is manual-dispatch only. Treat deployment target, source commit and actual secret availability as UNKNOWN until reconciled against the exact workflow checkout commit and Cloudflare account. Do not dispatch it or infer a live Worker hostname from these files.

### Automatic signaling client

`js/ezero_auto_signaling_config_v0_1.js` sets:
- `enabled: false`
- empty `websocketOrigin`
- version 0.1
- 10-minute maximum room

The pilot client exits unless the flag is enabled and a valid WSS origin is supplied. This means automatic signaling is OFF in the checked-in default configuration. The manual invitation path remains available.

## 5. Android and push boundary — not present in this repository tree

The inspected repository tree contains no:
- `settings.gradle` / `build.gradle` Android project files
- `AndroidManifest.xml`
- Kotlin/Java source tree
- `google-services.json`
- Firebase Messaging service or push receiver

This does not prove no Android implementation exists elsewhere. It means Android package ID, signing identity, notification channel, foreground service, FCM sender, push token lifecycle, native ringtone and screen-off behavior cannot be inventoried from this repository. Cross-repository identification is required before app separation work proceeds.

## 6. Recommended safe target layout

- Separate web origin and PWA scope for Connect.
- Separate Connect service worker and cache namespace; do not reuse the shared Null Bench worker.
- Separate Connect-specific Worker/DO namespace, environment and secrets.
- Versioned APIs for identity, friends, signaling, messaging and push.
- Keep the existing static site as a compatibility/redirect surface during staged migration.
- Use explicit, consented identity binding; do not copy private keys or silently transfer origin-bound IndexedDB state.
- Keep the currently working audio/video path frozen until the new staging shell passes equivalent two-device tests.

## 7. Next evidence gates

| Gate | Work | Current status |
|---|---|---|
| A1 | Static-site tree and Connect entry-point inventory | PARTIAL PASS — 267-entry tree inspected; candidate modules classified |
| A2 | All imports, storage keys, CSP and service-worker registration | PARTIAL — two main HTML pages and core config inspected; full import graph remains |
| A3 | Worker/DO route, config and deployment target reconciliation | BLOCKED / UNKNOWN — workflow/config mismatch |
| A4 | Android project and FCM integration inventory | UNKNOWN — not in this repository |
| A5 | Dependency graph and standalone shell contract tests | NOT STARTED |
| A6 | Isolated staging shell and physical two-device test | NOT STARTED |

## Release and safety boundary

This audit is documentation only. No deployment was run. No secrets were read or copied. No Android package was changed. No production entry page, service worker, Worker, Durable Object, database or user identity was modified. Closed-app/screen-off ringtone remains unproven until a real physical Android two-device test.
