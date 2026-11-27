# E-ZERO account identity ↔ Android installation binding V1

Status: **DESIGN CONTRACT ONLY — not implemented or deployed.** This document defines the next isolated staging step after the 2026-11-27 code audit. It does not authorize FCM dispatch.

## Why this is a separate protocol

The current friendship registry authenticates a participant P-256 key and stores a mutually approved relationship. The Android enrollment candidate independently authenticates an Android Keystore P-256 installation key under an operator-provisioned Root. Neither fact proves that the Android installation is controlled by the friendship participant.

Keep these identifiers separate:

- `identityFingerprint`: SHA-256 fingerprint of the exact account/friendship participant SPKI, canonical uppercase colon-separated octets in the friendship protocol.
- `installationFingerprint`: SHA-256 fingerprint of the exact Android Keystore SPKI, lowercase 64-character hex in the enrollment protocol.
- `installationId`: random opaque 128-bit-or-stronger ID generated and persisted by that Android installation; never use it as an authenticator.

A root-approved device is not automatically an account owner. A friendship participant is not automatically a registered Android device.

## Binding ceremony

1. Android obtains a fresh server challenge scoped to the canonical origin, the exact `identityFingerprint`, `relationshipId`, `installationFingerprint`, and `installationId`. Challenge lifetime is at most 60 seconds and is one-use.
2. The trusted server checks the friendship Registry directly (server-to-server) and confirms the relationship is ACTIVE and includes the exact identity fingerprint. A browser-provided `authorized` flag or transcript is never trusted.
3. Android signs the canonical binding statement with its non-exportable installation key.
4. The account/friendship identity key signs the same canonical statement. This is the proof that the user controls the identity already approved in that relationship. If the client cannot access that identity key on Android, stop: define and test an explicit user-mediated identity-key handoff; do not substitute a device signature or Root approval.
5. The trusted server rechecks the relationship, enrolled device SPKI/fingerprint, active Root, challenge, nonce, and revocation state inside the final atomic write. It consumes the challenge and creates the binding only if all checks pass.
6. The binding record is scoped to one identity + one installation + one relationship. A device may have multiple explicit account bindings; one identity may have multiple explicitly approved installations. No implicit binding based on IP, phone number, display name, QR scan, FCM token, or possession of a Root-approved key.
7. Friendship revocation/block, identity-key rotation, device revocation, Root revocation, or user removal must disable affected bindings and prevent future push dispatch. Re-check live state at dispatch time; cached authorization is insufficient.

## Canonical signed statement

Use a versioned, cross-language canonical format with exact key order and strict field validation. Suggested fields:

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
