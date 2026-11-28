# Browser ↔ Android QR proof V1 — canonical byte contract

This addendum freezes the canonical bytes used by the browser and Android for the identity-installation binding proof. It is a protocol contract, not an authorization service.

## Canonicalization

The UTF-8 message is the following nine fields, in exactly this order, separated by a single LF byte (0x0A), with no trailing LF:

1. `EZERO_IDENTITY_INSTALLATION_BINDING_V1`
2. `https://coma39658-ctrl.github.io`
3. `challengeId`
4. `nonce`
5. `expiresAt` (exactly 13 decimal Unix-millisecond digits)
6. `relationshipId` (64 lowercase hexadecimal characters)
7. `identityFingerprint` (32 uppercase hexadecimal byte pairs separated by colons)
8. `installationFingerprint` (64 lowercase hexadecimal characters)
9. `installationId`

Both P-256 keys sign these exact bytes with SHA-256 ECDSA. Browser WebCrypto uses IEEE-P1363 64-byte signatures. Android Keystore signatures must be converted from provider DER to the same P1363 representation before transport.

## Android local validation

The Android QR parser may check JSON field set, exact protocol/origin, bounds, expiry (future and no more than 60 seconds), local installation fingerprint/ID match, and 64-byte signature encoding. These checks are only input validation. Android MUST NOT treat them as proof of browser authenticity, active friendship, enrollment, or call permission.

The private binding service remains responsible for fetching the authoritative public keys from the Friendship and Enrollment Registries, verifying both signatures, checking active/revocation state, and atomically consuming the challenge. Until that service exists and is independently tested, no binding is trusted.

## Parser limitations

The initial Android parser is a local fail-closed gate only. The server must independently parse raw JSON with duplicate-key rejection and canonicalize from typed fields; it must never trust Android's canonical byte output or validation result.
