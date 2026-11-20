# E-ZERO Incoming Call Wake — Stage 6 Public-Key Pin Configuration

Status: isolated configuration and unit tests only. No real staging key has been generated or pinned.

## Configuration contract

- Android reads only `EZERO_CALL_WAKE_STAGING_PUBLIC_KEY_SPKI_BASE64` at build time.
- The value must be Base64-encoded DER SubjectPublicKeyInfo for an EC public key on a 256-bit curve.
- The Gradle configuration rejects malformed Base64, non-EC keys, and non-256-bit EC curves.
- Android runtime independently parses the configured public key and fails closed when the value is blank or invalid.
- The corresponding private key must remain only in the isolated server-side secret store.
- Public key material may be included in the APK. Private key material, passwords, FCM credentials and tokens may not.

## Current behavior

- CI does not set the public-key environment variable; therefore this branch continues to reject all incoming wake messages.
- Unit tests use ephemeral in-memory test keypairs only. They do not establish a real sender identity or activate incoming ringing.
- The Android application ID and WebRTC, QR, contacts, messaging and media paths are unchanged.

## Required before a real staging pin

1. Generate a new isolated staging P-256 keypair in a trusted environment.
2. Store the private key only in the isolated sender's secret manager.
3. Export the public SPKI and independently calculate its SHA-256 fingerprint.
4. Have the owner verify the fingerprint through a separate trusted channel.
5. Supply only the verified public SPKI to the staging build environment.
6. Run Android and sender interoperability tests with that exact keypair, then conduct two-device physical tests.

## Explicit non-actions

No key generation, secret-store mutation, GitHub secret creation, Firebase configuration, FCM registration/sending, Worker route, Durable Object binding, remote deployment, public release, or production integration.
