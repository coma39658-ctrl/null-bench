# E-ZERO Android ↔ Browser Identity Binding — Design Gate V1

Status: DESIGN ONLY — NOT IMPLEMENTED, NOT ENROLLED, NOT DEPLOYED.

This document defines the safe boundary between:
- the browser's existing `EZERO2` permanent identity; and
- the Android app's per-installation P-256 key held by Android Keystore.

They are different cryptographic identities. A matching display name, QR scan, or locally saved browser contact does not make them the same identity.

## Current verified baseline

- Android generates a P-256 `secp256r1` key pair in Android Keystore.
- Android private key material is not exported.
- Android can sign bounded canonical messages using `SHA256withECDSA`.
- Android verifies the browser's `EZERO2` signature against the fixed browser identity origin.
- The Android friend vault stores the verified browser fingerprint and public key locally.
- No enrollment, server contact sync, or call signaling is performed by this local identity groundwork.
- The isolated Trusted Inbox candidate authenticates the owner as the target browser fingerprint and accepts a caller only when that caller fingerprint is explicitly trusted by the owner. It currently requires the owner's active browser tab.

## Non-negotiable invariants

1. Never substitute an Android installation fingerprint for a browser `EZERO2` fingerprint.
2. Never treat scanning or verifying a QR as consent to enroll, save, or trust.
3. Both devices must approve the binding: the Android user confirms the browser identity; the browser owner explicitly approves the Android installation key.
4. Signatures prove key possession, not a person's legal identity or account ownership.
5. Every challenge is origin-bound, audience-bound, nonce-bound, short-lived, and single-use.
6. Replays, malformed encodings, unknown protocol versions, expired challenges, mismatched fingerprints, and duplicate enrollment fail closed.
7. Revocation must invalidate the Android installation key's authorization for future calls. Reinstalling or rotating the key requires a new approval.
8. No private key, raw secret, or unencrypted contact list is uploaded.
9. The protocol must not enable media, message, photo, or call-history transfer. It only authorizes a later call-invitation signaling step.
10. The production app, public site, and frozen working WebRTC baseline remain untouched until isolated tests and a two-phone regression gate pass.

## Proposed protocol: explicit Android caller enrollment

The Android installation is an additional trusted caller identity; it does not replace the browser owner identity.

### Phase A — Android creates an enrollment request

After the user chooses **Link this phone** and confirms the verified browser contact, Android creates a random 256-bit nonce and a short expiry (maximum 90 seconds). It builds a versioned request containing:

- protocol: `EZERO-ANDROID-BIND-1`
- audience/origin: exact configured browser/Trusted Inbox origin
- owner fingerprint: verified browser `EZERO2` fingerprint
- Android installation public key: SPKI P-256
- Android installation fingerprint: SHA-256 of the exact SPKI bytes
- nonce and issued-at / expires-at values
- requested capability: `call-invite-only`

Android signs the canonical UTF-8 representation with its non-exportable installation key. The request is encoded as a separate `EZEROA1.` token/QR namespace. It must never be passed to the existing `EZERO2` verifier.

### Phase B — Browser owner explicitly approves

The browser page scans the `EZEROA1` request and independently validates:
- exact protocol and allowed origin;
- SPKI encoding, P-256 curve and fingerprint;
- Android signature over the exact canonical bytes;
- nonce, expiry, audience and owner fingerprint;
- that the Android fingerprint is not the browser owner's own fingerprint;
- that the request has not already been consumed.

The page displays the Android fingerprint and asks the owner to approve or reject. Only an explicit approval adds the Android fingerprint to the browser owner's trusted-caller set. A scan or a successful signature check alone never adds trust.

The owner approval is bound to the exact request nonce, Android fingerprint, owner fingerprint, and capability. It is signed by the browser's existing permanent identity key, or by an equivalent browser-held owner signing key whose binding to the `EZERO2` identity is independently verified. If the browser implementation cannot securely access that signing key, enrollment remains disabled; do not replace this with an unsigned approval.

### Phase C — Android verifies approval

Android receives the approval through a bounded, authenticated return channel or a second QR scan. It verifies the browser signature using the already verified `EZERO2` public key and checks exact equality of:
- owner fingerprint;
- Android installation fingerprint;
- request nonce;
- capability;
- expiry and protocol version.

Only after successful verification and a final Android-side user confirmation may the app mark this browser contact as linked to this installation. The local contact record must preserve both fingerprints as separate fields.

### Phase D — Later call authorization

For a later call invitation:
- owner target remains the browser `EZERO2` fingerprint;
- caller identity is the Android installation fingerprint;
- the caller signs the fresh Trusted Inbox challenge with the Android Keystore key;
- the owner-side trusted list must contain that exact Android fingerprint;
- call invitation remains limited to the existing allow-listed audio/video invite format;
- no call is reported as delivered until the active owner tab validates and acknowledges it.

The current Worker candidate is not yet wired to Android and is not deployed. The current candidate's active-tab requirement means this design does not provide background ringing or offline delivery.

## Revocation and key rotation

- Owner can revoke an Android installation by its exact fingerprint.
- Revocation closes matching active caller sockets and prevents future handshakes.
- Android can unlink locally, but local unlink alone does not revoke server-side trust; the owner-side revoke action is authoritative.
- Lost phone: owner revokes the installation; a new phone enrolls with a new key and fresh approval.
- Key replacement, app data clear, or reinstall creates a new identity and requires re-enrollment.
- No silent key migration or fingerprint aliasing.

## Required test gates before implementation

### Static / unit tests
- canonical encoding deterministic across Kotlin and browser JavaScript;
- SPKI fingerprint exactness;
- Android JCA ECDSA DER signature and browser WebCrypto P1363 conversion;
- wrong origin, wrong audience, wrong owner, wrong fingerprint;
- expired, future-dated, malformed, oversized, replayed and duplicate requests;
- wrong capability / unknown protocol version;
- no auto-trust after scan;
- no contact save before both approvals;
- revocation and key rotation semantics;
- Android private key never serialized or logged.

### Isolated integration tests
- synthetic Android caller key enrolls against synthetic browser owner key;
- browser rejects a valid but unapproved request;
- browser approval is bound to exact nonce and Android fingerprint;
- Android rejects altered, stale, wrong-owner, or wrong-capability approval;
- trusted Android caller can pass the signed challenge;
- untrusted, revoked, replayed and wrong-target callers fail closed;
- no SDP/media/message/photo/call-log payload is accepted.

### Physical two-phone release gate
1. Existing Build54 app opens and existing camera/gallery `EZERO2` scan still works.
2. Explicit Android-to-browser enrollment succeeds once.
3. A saved and approved Android installation can send a call invitation to an active owner tab.
4. Audio and video use the already-tested WebRTC path without modifying its core.
5. Revoke, reconnect, app restart, network interruption and key rotation behave correctly.
6. No background/offline ringing is claimed unless separately implemented and physically verified.

## Current decision

**HOLD implementation of enrollment and call wiring.** First add shared canonicalization fixtures and unit tests for Android Keystore signing/verification. Do not connect the Android app to the candidate Worker until the owner-side browser signing/approval path is demonstrated. Do not deploy this candidate or change the public site as part of this design step.

## Evidence status

- Android local installation-key groundwork: code present; Build54 CI build and unit-test workflow passed.
- Browser `EZERO2` QR verification: code present; prior app camera/gallery operation was user-confirmed.
- Cross-platform enrollment: NOT IMPLEMENTED.
- Android Trusted Inbox handshake: NOT IMPLEMENTED.
- Two-phone call through Android saved-friend list: NOT VERIFIED.
- Background ringing / offline delivery: NOT IMPLEMENTED.
