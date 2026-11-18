# E-ZERO Permanent QR + SHA-256 — Binding Product Rule

**Date:** 2026-11-18  
**Applies to:** isolated staging branch `ezero-pr156-render-preview-20261116`  
**Status:** Isolated staging implementation present; automated acceptance coverage is in progress; physical-device and mutual-consent end-to-end validation remain pending.

## Non-negotiable user requirement

Every user/device has one personal, permanent E-ZERO QR identity. The user displays the same QR whenever they want to add a friend. Each friendship is paired once, with mutual consent. Once saved, either person can call the other repeatedly from the friends list without scanning, displaying, generating, refreshing, or exchanging any QR code again.

The QR identity remains stable for the lifetime of its associated public/private key. It changes only after explicit user-initiated revocation, compromise recovery, or a documented key rotation. A key rotation must clearly explain that existing friends need a secure re-verification/update flow; never silently replace an identity.

## SHA-256 identity requirements

- The identity fingerprint is SHA-256 over the canonical DER/SPKI-encoded public key, rendered as exactly 64 lowercase hexadecimal characters.
- The QR payload carries the public key and its fingerprint, with a versioned canonical signed envelope and service-origin binding.
- On scan, independently recompute SHA-256 from the decoded public key and require an exact match with the embedded fingerprint.
- Verify the signature and protocol version. Reject tampering, wrong origin, malformed/oversized payloads, unsupported versions, and fingerprint mismatch.
- SHA-256 is a cryptographic fingerprint, not proof of a person's civil identity. Show a human-readable fingerprint comparison on first pairing where practical.
- Never put private keys, passwords, call tokens, SDP, ICE credentials, phone numbers, or other secrets in the permanent QR.

## Separate identity from pairing and calling

1. **Permanent identity QR:** reusable and stable; never single-use and never expires during normal operation.
2. **First-time friend pairing:** a fresh, short-lived nonce/challenge and signed key-binding handshake; recipient must explicitly Accept. The nonce is single-use and expires. Both devices save the same verified peer fingerprint/public key only after the protocol completes successfully.
3. **Every subsequent call:** the saved friend's stable fingerprint/public key selects the peer. The existing trusted inbox/signaling issues a fresh per-call authorization/session token as needed. That token is not a QR and is not shown as a QR. No friend re-pairing, QR scan, or repeated friendship approval.
4. **Call session:** each call has fresh WebRTC/ICE/session material. It is not a new identity and must not change the permanent QR.
5. **Reinstall/device loss:** do not pretend browser-local non-extractable keys can be recovered after browser data loss. Until a separately reviewed recovery design exists, explain that re-pairing may be required.

## UI and user-flow acceptance

- Both phones always have a visible “My permanent QR / میرا مستقل QR” entry after identity setup.
- Both phones have camera scan and gallery-image scan for a friend's permanent QR.
- A user scans the other person's permanent QR only during initial friendship pairing.
- Mutual approval saves the friend on both sides, bound to the verified SHA-256 fingerprint.
- The friends list persists across normal reloads on the same browser origin.
- Audio, video and chat actions are available directly from a saved friend.
- Repeated calls, app reloads, reconnects, and call failures do not prompt for QR or replace the saved identity.
- Do not display the temporary call invitation/session token as “My QR”.
- Video must never silently downgrade to audio.
- All user-facing flows must be simple and localized in Urdu, Arabic and English.

## Mandatory regression tests

1. Generate identity, save profile, reload page at least 10 times: fingerprint and permanent QR payload remain identical.
2. Generate a call session repeatedly: permanent QR and fingerprint remain unchanged.
3. Run 100 sequential mock calls with the same saved friend: no QR generation/scan/pairing UI is invoked after initial pairing.
4. Both parties scan the other's permanent QR once; each explicitly accepts; both save the exact same peer fingerprint.
5. A failed, one-sided, replayed, expired, or mismatched pairing never saves a trusted friend.
6. Tamper with public key, fingerprint, signature, version, or origin: reject.
7. Revocation and key rotation invalidate the old QR and follow an explicit safe friend-update flow.
8. After reload, saved friend list and stable fingerprint restore; corrupted/missing storage fails visibly and never silently creates a new trusted identity.
9. Direct saved-friend audio/video calls do not require QR; verify signed peer identity and call session authorization on every connection.
10. Gallery and camera scan return identical verified identity results and never upload the QR image.
11. Existing WebRTC media engine, call accept/decline, permissions, hangup, privacy and no-ads requirements remain regression-tested.
12. Keep tests separated into source contracts, browser synthetic-media tests, staging integration tests, and eventual physical-device tests. Never present one category as proof of another.

## Source inspection note (2026-11-18)

The isolated staging implementation now creates a separate versioned `EZERO2` permanent public-identity payload using an opt-in non-extractable P-256 key in same-origin IndexedDB. It derives SHA-256 over the public SPKI key and signs a canonical envelope. The existing short-lived `EZERO1` call invitation remains separate. Camera and gallery scanners verify the permanent token locally before exposing the explicit local Save Friend action; QR images are not uploaded. The gallery path was corrected on 2026-11-18 to use the same permanent-identity verifier and save form as camera scanning, rather than the legacy temporary-ID verifier.

**Origin continuity update (2026-11-18):** the staging implementation now signs against the stable existing application origin `https://coma39658-ctrl.github.io` rather than `location.origin`. The unit test must prove the same key/QR verifies from a different preview hostname and rejects a signature bound to an unrelated origin. This canonical app identifier must be retained by any production port; changing it later requires a versioned migration/re-pairing plan. Also, the present Save Friend implementation writes the peer locally and requests trusted-inbox permission where available; this alone is not proof that both devices completed a mutually accepted pairing and both saved each other. A two-sided signed challenge/acceptance handshake and rollback behavior must be demonstrated before declaring mutual pairing complete.

## Release boundary

This requirement is not complete merely because this document exists. Implement in isolated staging, add automated acceptance coverage, run it, inspect the deployment, and only then request one consolidated physical-phone test. Production remains untouched. Saudi legal classification, PDPL/vendor review, and permission for any real-user pilot remain separate release gates.
