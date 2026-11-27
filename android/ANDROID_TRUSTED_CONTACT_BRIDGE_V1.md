# E-ZERO browser-to-Android trusted-contact bridge V1

Status: isolated staging candidate. No production change, no Worker deployment, no push delivery, and no physical two-phone verification.

## Why this bridge is required
The existing browser friend list is stored in encrypted IndexedDB. The native Android host has a separate app sandbox and cannot read Chrome's IndexedDB. A native push receiver must not treat a caller-supplied fingerprint or display name as proof that the caller is a saved friend. The browser's existing Root identity therefore exports only a contact that is already marked TRUSTED.

## Browser export
- The user explicitly selects one contact and presses Export.
- EZERO_CONNECT_TRUST.exportTrustedContactBundle rejects unless explicit consent is true and exactly one matching contact is locally TRUSTED.
- It recomputes the relationship ID from the canonical transcript and checks that the local Root and remote public key match the saved transcript.
- It exports the public remote key, fingerprint, display name, trust version, transcript, and the original v1 dual approvals or v2 peer handshake proof.
- It binds the canonical origin, Root fingerprint/SPKI, issue/expiry time (90 seconds), and a fresh 24-byte nonce.
- The existing non-exportable browser Root key signs the exact payload. No private key or FCM token is exported.
- The export page displays a QR and copyable payload. The page does not create or alter a friend relationship.

## Android import
- QR scanner, gallery scanner, and copy/paste use the same strict import path.
- The Android app requires its independently pinned Root key; an unpinned or mismatched Root is rejected.
- It verifies the Root P-256 signature, fixed origin, 90-second export expiry, nonce, transcript hash/relationship ID, local Root participant, remote public-key fingerprint, and original v1 dual approvals or v2 signed peer handshake.
- Only after all checks pass is the contact saved.
- Contact records are encrypted with AES-256-GCM using a non-exportable Android Keystore key; only ciphertext is stored in private app preferences.
- A BLOCKED contact cannot be re-imported over the block. One active record per remote fingerprint is enforced; store capacity is bounded at 200 contacts.
- The importer is idempotent for the same relationship ID.

## Validation
- Browser Playwright trust test checks explicit export consent, exact relationship binding, Root signature and payload fields.
- Android unit tests verify both v1 dual-approval and v2 peer-proof bundles, Root pin mismatch, tampering, expiry, origin and relationship mismatch.
- Android unit tests and staging APK assembly run in CI.
- These automated tests do not prove the import on a physical Android phone.

## Not implemented by this bridge
- No FCM sender or call-wake route.
- No native inbox subscription or authenticated pending-invite fetch.
- No signed wake public key is pinned.
- No native call invite is resolved against this local contact store yet.
- No Accept-to-WebRTC handoff, incoming ringtone, closed-app wake, or locked-screen ringing is enabled or verified.
- Existing browser WebRTC signaling and production are unchanged.

The next safe stage is to bind the Android inbox to this verified local contact store, add one-use server-side pending-call retrieval, and only then add signed data-only FCM wake delivery. The server must not send a ring for an untrusted sender, and FCM data must remain a wake hint rather than identity proof.