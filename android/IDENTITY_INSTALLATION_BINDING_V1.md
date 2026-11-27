# E-ZERO account identity ↔ Android installation binding V1

Status: **PARTIAL STAGING PRIMITIVES — no binding endpoint, authoritative registry adapter, private service, binding persistence, or FCM dispatch is implemented/deployed.** The dual-signature verifier and Android P1363 installation-signing adapter exist in the unmerged staging PR only. This document does not authorize FCM dispatch.

## Why this is a separate protocol

The current friendship registry authenticates a participant P-256 key and stores a mutually approved relationship. The Android enrollment candidate independently authenticates an Android Keystore P-256 installation key under an operator-provisioned Root. Neither fact proves that the Android installation is controlled by the friendship participant.

Keep these identifiers separate:

- `identityFingerprint`: SHA-256 fingerprint of the exact account/friendship participant SPKI, canonical uppercase colon-separated octets in the friendship protocol.
- `installationFingerprint`: SHA-256 fingerprint of the exact Android Keystore SPKI, lowercase 64-character hex in the enrollment protocol.
- `installationId`: random opaque 128-bit-or-stronger ID generated and persisted by that Android installation; never use it as an authenticator.

A root-approved device is not automatically an account owner. A friendship participant is not automatically a registered Android device.

### Audited key custody — important implementation constraint

- `js/ezero_connect_identity_v1.js` creates the friendship identity P-256 key in browser WebCrypto, marks the private CryptoKey non-extractable, and stores it in IndexedDB database `ezero-connect-device-identity` under the current browser origin. Its `signCanonical` method can sign with that browser-held identity key.
- `android/app/src/main/java/com/ezero/connect/AndroidEnrollmentKeyStore.kt` creates a separate P-256 installation key in Android Keystore. It does not contain or import the browser friendship identity private key.
- `BrowserPermanentIdentityVerifier.kt` verifies a signed Root identity token; it does not provide the friendship identity private signing key to Android.
- Therefore Android cannot currently produce the identity signature merely by calling its installation Keystore. The identity signature must be produced by the existing browser identity key through a deliberately designed, user-consented bridge, or by a future independently reviewed identity-key migration. Do not export the non-extractable browser private key, copy it into Android, or treat Root approval as a substitute.
- The staging Android key helper now has `signCanonicalBytesP1363` to convert Android Keystore's DER ECDSA result into the 64-byte P1363 format expected by WebCrypto. This covers only the installation signature, not the missing browser-to-native identity-signature handoff.

## Binding ceremony

1. Android obtains a fresh server challenge scoped to the canonical origin, the exact `identityFingerprint`, `relationshipId`, `installationFingerprint`, and `installationId`. Challenge lifetime is at most 60 seconds and is one-use.
2. The trusted server checks the friendship Registry directly (server-to-server) and confirms the relationship is ACTIVE and includes the exact identity fingerprint. A browser-provided `authorized` flag or transcript is never trusted.
3. Android signs the canonical binding statement with its non-exportable installation key.
4. The account/friendship identity key signs the same canonical statement. This is the proof that the user controls the identity already approved in that relationship. If the client cannot access that identity key on Android, stop: define and test an explicit user-mediated identity-key handoff; do not substitute a device signature or Root approval.
5. The trusted server rechecks the relationship, enrolled device SPKI/fingerprint, active Root, challenge, nonce, and revocation state inside the final atomic write. It consumes the challenge and creates the binding only if all checks pass.
6. The binding record is scoped to one identity + one installation + one relationship. A device may have multiple explicit account bindings; one identity may have multiple explicitly approved installations. No implicit binding based on IP, phone number, display name, QR scan, FCM token, or possession of a Root-approved key.
7. Friendship revocation/block, identity-key rotation, device revocation, Root revocation, or user removal must disable affected bindings and prevent future push dispatch. Re-check live state at dispatch time; cached authorization is insufficient.

## Canonical signed statement

Use the versioned canonical format implemented by `canonicalBindingV1`; do not serialize arbitrary JSON for this protocol. Exact UTF-8 bytes are:

```text
EZERO_IDENTITY_INSTALLATION_BINDING_V1\n
protocol=EZERO_IDENTITY_INSTALLATION_BINDING_V1\n
origin=https://coma39658-ctrl.github.io\n
challengeId=<challengeId>\n
nonce=<nonce>\n
expiresAt=<13-digit Unix milliseconds>\n
relationshipId=<64 lowercase hex>\n
identityFingerprint=<uppercase colon-separated SHA-256 SPKI fingerprint>\n
installationFingerprint=<64 lowercase hex SHA-256 SPKI fingerprint>\n
installationId=<opaque base64url-like ID>\n
```

The first line is a domain separator; each subsequent field is emitted in the exact order shown, with one LF after each value. Reject missing/extra keys, invalid origin, malformed IDs, and expiry beyond 60 seconds. Both signatures are base64url-encoded 64-byte IEEE-P1363 ECDSA P-256 signatures. The verifier accepts SPKI bytes fetched from the authoritative registries, never request-supplied keys. Current implementation tests exercise signature/fingerprint/expiry validation, but server-side one-use challenge storage and replay prevention remain unimplemented.

The statement contains these fields:

```json
{
  "protocol": "EZERO_IDENTITY_INSTALLATION_BINDING_V1",
  "origin": "https://coma39658-ctrl.github.io",
  "challengeId": "<server challenge id>",
  "nonce": "<server nonce>",
  "expiresAt": "<unix milliseconds as decimal string>",
  "relationshipId": "<active friendship relationship id>",
  "identityFingerprint": "<canonical friendship identity fingerprint>",
  "installationFingerprint": "<SPKI-derived Android installation fingerprint>",
  "installationId": "<opaque stable installation id>"
}
```

Both signatures cover the exact same canonical bytes. Verify the identity signature with the participant SPKI already stored in the active Friendship Registry relationship. Verify the installation signature with the exact SPKI stored in the active Android Enrollment Registry. Never accept a public key supplied only in the binding request.

## Server topology and trust boundary

- Public Android API may request a challenge and submit two signatures; it must not read FCM tokens or mutate registry records directly.
- A trusted private binding service verifies relationship state through a service binding to the authoritative Friendship Registry and verifies enrollment state through a private service binding to the Android Enrollment Registry.
- The private service writes the binding record and owns revocation/lookup. No public route may return raw FCM token, token ciphertext, encryption key, or service credential.
- Call controller supplies only the signed call invite and call metadata. Private service independently resolves the recipient identity to active installation bindings and performs final authorization checks before sending a data-only signed wake.
- Keep the FCM token encrypted at rest and decrypt only inside the private dispatch boundary. Do not return the token to the call controller.

## Required negative and concurrency tests

- Identity signature missing, invalid, wrong participant, or wrong relationship → reject.
- Installation signature missing, invalid, wrong SPKI, un-enrolled device, revoked device, or revoked Root → reject.
- Expired challenge, replayed challenge/nonce, mismatched origin, altered field order/bytes, or duplicate binding request → reject.
- Inactive/revoked/blocked friendship, participant removed, identity key rotated, or relationship mismatch → reject.
- Client-supplied fingerprint not equal to the hash of the registry-held SPKI → reject.
- Race friendship revocation vs binding creation and race device/Root revocation vs binding creation/dispatch → no stale active binding and no post-revocation wake.
- Attempt to call private service from browser/public Worker or without the exact service binding → reject.
- Logs contain no FCM token, private key, signature body, alias, or unnecessary personal data.

## Release gates

Do not implement FCM dispatch until the binding protocol, private Registry access, root trust ceremony, revocation propagation, negative tests, and two-phone device enrollment tests are complete. Do not deploy this design document or candidate Worker to production. Green CI is not evidence of audible ringing. Physical foreground/background/screen-off ringing remains **NOT VERIFIED** until observed on the target Android phones.


## Current implementation boundary (2026-11-27)

Implemented in the open, unmerged PR #231 staging branch:
- `verifyIdentityInstallationBindingV1` validates the exact field set, fixed origin, expiry, distinct identity/installation SPKI fingerprints, and both P-256 P1363 signatures.
- Android `signCanonicalBytesP1363` signs canonical bytes with the non-exportable installation key and converts DER to P1363.
- Contract tests cover valid dual signatures, installation signature not substituting for identity signature, fingerprint mismatches, malformed/expired statements, and origin/extra-field rejection.

Not implemented:
- Browser identity-key signature handoff to the Android app.
- Challenge issue/consume API or one-use nonce storage.
- Direct trusted reads from the Friendship Registry and Android Enrollment Registry.
- Atomic binding record creation/revocation and concurrency protection.
- Private Service Binding topology and FCM dispatch.
- Live FCM delivery or physical audible lock-screen ringing.

The next safe implementation step is to specify and test a consented browser-to-Android signature handoff. Only after that protocol is proven should the server binding endpoint and private registry adapters be written. The currently stored browser private key is non-extractable and must remain so.
