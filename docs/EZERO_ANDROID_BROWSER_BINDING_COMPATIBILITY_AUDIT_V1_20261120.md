# E-ZERO Android ↔ Browser Binding Compatibility Audit V1

Date: 2026-11-20
Branch: `ezero-android-package-isolated-staging53-20261120`
Status: **AUDIT ONLY — NO ENROLLMENT, TRUST, NETWORK, OR PRODUCTION CHANGE**

## Verified source facts

1. Android `BrowserPermanentIdentityVerifier` validates the permanent `EZERO2` QR using the configured browser identity origin `https://coma39658-ctrl.github.io`. Android local contact storage therefore records a browser permanent-identity fingerprint/public key.
2. The current web preview page `ezero-connect-app.html` loads `ezero_connect_identity_v1.js`, `ezero_connect_invite_v1.js`, and `ezero_connect_trust_v1.js`.
3. The current preview's invite implementation emits and accepts the `EZERO1.` temporary invite format. It generates a separate P-256 browser key in IndexedDB after consent. It does not emit an `EZERO2` permanent identity QR.
4. The preview trust helper uses `E-ZERO-TRUST-1` transcripts and colon-separated uppercase fingerprints (for example, `AA:BB:...`). Android installation identity currently uses lowercase 64-character SHA-256 hex.
5. The Android binding groundwork defines `EZERO-ANDROID-BIND-1`, with lowercase 64-character fingerprints and a nine-line canonical byte representation.
6. The isolated Cloudflare Trusted Inbox candidate is a different protocol, `EZERO-TRUSTED-INBOX-1`, uses a separate preview origin, is not referenced by the current public preview HTML, and is not deployed. Its current owner path requires an active browser tab.

## Compatibility decision

These identity and protocol formats are **not interchangeable**. A browser-generated preview key must not be silently treated as the permanent `EZERO2` owner key. An `EZERO1` invite must not be routed to the Android `EZERO2` verifier. Colon-separated fingerprints must not be compared as though they were lowercase hex fingerprints. The current Worker candidate must not be enabled by merely changing its origin constant.

## Required next gate

Before wiring Android enrollment or call invitations:

1. Select and document the authoritative browser owner identity for this Android-to-browser relationship. Preferred direction remains the already verified `EZERO2` identity, unless an explicit migration decision is approved.
2. Demonstrate that the browser owner can sign a domain-separated, exact-byte approval using the same public key that the Android `EZERO2` verifier already trusts. If the browser does not possess that private key, enrollment stays disabled.
3. Define one canonical fingerprint representation at each protocol boundary and add cross-language fixtures; do not alter the existing `EZERO2` format.
4. Bind origin, owner fingerprint, Android fingerprint, capability, nonce, and expiry into the approval. Enforce one-time consumption and explicit owner approval.
5. Only then add isolated integration tests for approval, replay rejection, revocation, and call-invite-only authorization.

## Explicitly not done

- No Android UI or contact-vault changes.
- No QR format changes.
- No network request or enrollment.
- No Worker deployment or public website deployment.
- No media, SDP, messaging, photos, call logs, or background delivery.
- No claim that Android-to-browser calls work.

## Evidence

- Android unit-test and APK CI run: `44754836081` — all 10 workflow steps completed successfully.
- This audit is a compatibility finding from source inspection, not a runtime or two-phone test.
