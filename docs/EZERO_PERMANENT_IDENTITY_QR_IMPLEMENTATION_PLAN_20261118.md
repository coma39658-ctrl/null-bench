# E-ZERO Permanent Personal QR — Implementation Plan and Acceptance Gate

**Date:** 2026-11-18  
**Branch:** `ezero-pr156-render-preview-20261116`  
**Status:** Engineering plan based on source inspection; feature is not implemented or accepted.  
**Production:** No production files, services, or credentials changed.

## 1. Verified current implementation

The staging page currently has two different identity concepts:

1. `ezero_saved_friend_stage_engine_v0_1.js` creates a signed `EZERO1` identity payload containing the public key, SHA-256 fingerprint, a random 12-byte challenge code, and a 10-minute expiry. The current QR is therefore a rotating/expiring signed identity challenge, not a permanent static personal QR.
2. `ezero_secure_connect_device_identity_v0_1.js` stores an opt-in non-extractable P-256 private key in same-origin IndexedDB. `ezero_secure_connect_peer_profile_staging_v0_1.js` persists that key after the user explicitly saves their profile. The profile gate checks that the persisted key fingerprint matches the current page identity.
3. `ezero_profile_first_verified_friends_v0_1.js` requires explicit sender invitation and recipient Accept, validates the signed offer/answer, and stores a verified peer fingerprint locally. This is a useful foundation, but local friend storage is browser-origin/device scoped.
4. The simplified home currently does not render a dedicated permanent “My QR” control. Its Add Friend entry exposes the existing temporary call-invitation flow. The HTML's older identity QR workspace is not the permanent identity QR requested here.

These are source-level observations only. They do not prove physical-phone pairing, durable recovery after browser data deletion, background notifications, or production readiness.

## 2. Required product distinction

Do not merge these into one QR:

- **My permanent QR:** stable public identity reference for the user's device/account. It contains no private key, secret, session token, SDP, ICE credentials, or personal phone number.
- **Temporary call invitation:** short-lived, single-use call setup token. It expires and is never presented as the user's permanent QR.

The permanent QR may remain visually unchanged while the cryptographic identity remains active. Revocation or key rotation must invalidate it and clearly create a replacement identity.

## 3. Proposed permanent QR envelope

Use a versioned, origin-scoped public identity envelope, for example:

`EZERO-PUBLIC-IDENTITY-1.<public-key>.<fingerprint>.<signature>`

The signature must cover a canonical domain-separated payload containing the protocol version, service origin, public key and fingerprint. The fingerprint must be recomputed from the decoded public key and compared in constant time where practical. The parser must reject oversized, malformed, wrong-origin, unsupported-version, mismatched-key, and invalid-signature payloads.

A permanent QR is public, so replay of the QR itself is not authorization to become friends. Pairing must still use a fresh server-issued or cryptographically random one-time challenge, mutual explicit consent, signed key binding, replay protection, and a visible verification result. The one-time challenge must be separate from the permanent QR payload.

## 4. Identity lifecycle

1. On explicit profile setup, create or load the device key in IndexedDB; verify the public/private pair and fingerprint.
2. Render “My QR” from the stable public identity envelope only after key persistence and self-verification succeed.
3. On another device, scan a friend's permanent QR (camera or gallery image), parse and verify it, then show the friend's public fingerprint and profile preview.
4. Create a fresh pairing request bound to both identities and a one-time nonce.
5. Recipient sees the request and must explicitly Accept. No auto-accept and no camera/microphone activation.
6. Both devices save the same peer public identity/fingerprint only after signed protocol completion. A failed or partial handshake must not create a trusted friend.
7. Subsequent audio/video calls use the saved peer identity and trusted inbox/signalling. They must not request another QR.
8. Provide revoke/block/remove and safe key-rotation flows. Explain that clearing browser storage or losing a device may require re-pairing unless an independently reviewed account recovery system is added.

## 5. Gallery QR support

Gallery scanning is a first-class scan path, separate from profile-photo selection. It must:
- accept only supported image MIME types and enforce a small file-size limit;
- decode locally in the browser; do not upload the image to a server;
- reject non-E-ZERO QR content without navigating to arbitrary URLs;
- stop camera tracks after scanning and release image/object URLs;
- show clear Urdu, Arabic and English error states;
- never silently fall back to temporary call-invite handling when the scanned code is a permanent identity QR.

## 6. UI acceptance requirements

- Show a persistent, clearly named “My QR / میرا مستقل QR / رمز QR الخاص بي” entry in the simple home or profile, visible on every supported phone after identity setup.
- Show “Scan friend's QR” and “Choose QR from gallery” on both phones.
- Explain that each person scans the other person's permanent QR once, then explicitly accepts the friend request.
- Keep temporary “Call QR” under a separate label and never call it “My QR”.
- After mutual pairing, selecting a saved friend must offer direct Audio, Video and Chat actions without QR.
- Keep the existing successful WebRTC media engine isolated; do not refactor call transport while adding identity presentation.
- Never claim incoming ringing while the browser is closed until an independently tested push/native notification implementation exists.

## 7. Required automated tests before any physical phone retest

1. Stable public identity QR is byte-for-byte stable across reloads while the key is unchanged.
2. Private key is non-extractable and never appears in QR, DOM text, URL, logs, localStorage, analytics or server requests.
3. Same-origin key restore succeeds; wrong-origin, corrupt, missing, or mismatched key fails closed with a recovery explanation.
4. QR parser validates version, origin, public key, fingerprint and signature; rejects tampering and oversized input.
5. Permanent QR does not expire during normal use; pairing nonce and call invite do expire and are single-use.
6. Both devices can scan the other device's permanent QR, and each side must accept the matching request.
7. One-sided acceptance, replay, duplicate request, self-scan, key mismatch, stale nonce, revoked key and blocked friend never create a trusted contact.
8. Gallery image scan and camera scan produce the same verified identity result; malformed/non-E-ZERO images fail safely.
9. Saved-friend direct audio and video calls work without QR after pairing; video failure must never silently downgrade to audio.
10. Regression tests confirm no changes to current media permissions, call accept/decline, hangup, and signed WebRTC media flow.
11. Test storage deletion, private browsing, browser reinstall, device change and key revocation.
12. Urdu, Arabic and English labels, keyboard/screen-reader access, low-end Android performance and slow-network behavior pass.

## 8. Release gate

Keep this work in isolated staging with Render auto-deploy disabled. Run source-contract tests, browser automation with synthetic media, security checks, and staging deploy verification before asking for one consolidated physical-phone retest. Do not alter production or represent this feature as complete until all acceptance checks pass.

Permanent QR identity, bilateral pairing, gallery scan, and direct saved-friend calling are **not accepted as complete** by this plan. Saudi legal classification, privacy/vendor review, and pilot approval remain separate gates.
