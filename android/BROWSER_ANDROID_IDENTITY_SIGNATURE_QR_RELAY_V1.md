# E-ZERO browser ↔ Android identity-signature relay V1

Status: **DESIGN-ONLY STAGING CONTRACT**. No live QR relay, challenge API, binding endpoint, or FCM dispatch is implemented by this document.

## Purpose

The browser already owns the friendship identity P-256 private key as a non-extractable WebCrypto CryptoKey in IndexedDB. Android owns a separate P-256 installation private key in Android Keystore. This protocol transports only a short-lived identity signature from the browser to Android; it never transports either private key.

The user-facing ceremony should be one explicit consent action on the browser and one scan on the Android device. It is a pairing-time operation, not part of normal saved-friend calling.

## Preconditions — fail closed

The relay MUST NOT start until all are true:

1. The server has issued a fresh, one-use binding challenge with lifetime no longer than 60 seconds.
2. The challenge is scoped to the canonical E-ZERO origin, an ACTIVE Friendship Registry relationship, the exact Registry participant identity fingerprint, and the exact Android installation fingerprint and installation ID from the authoritative Enrollment Registry.
3. The browser origin is exactly `https://coma39658-ctrl.github.io` and the browser identity module reports the same identity fingerprint as the challenge.
4. The browser UI displays the friend/relationship and target device context and obtains a fresh affirmative user action. Consent is not inferred from page load, QR display, camera permission, or prior pairing.
5. The challenge has not expired and has not already been used. The server remains the final authority and atomically consumes it during binding creation.

No challenge issuer or authoritative dual-registry lookup is currently implemented. Therefore this contract is not yet executable end-to-end.

## Relay format

The browser calls the existing `EZERO_CONNECT_IDENTITY.signInstallationBinding(statement, true)` only after the explicit consent action. That method signs the exact canonical V1 bytes and returns a P1363 Base64URL signature; it does not export the private key.

The browser encodes the following exact, bounded envelope into a QR for the Android app to scan:

```json
{
  "type": "EZERO_BINDING_IDENTITY_PROOF_V1",
  "statement": {
    "protocol": "EZERO_IDENTITY_INSTALLATION_BINDING_V1",
    "origin": "https://coma39658-ctrl.github.io",
    "challengeId": "<server-issued opaque ID>",
    "nonce": "<server-issued nonce>",
    "expiresAt": "<13-digit Unix milliseconds>",
    "relationshipId": "<64 lowercase hex>",
    "identityFingerprint": "<uppercase colon-separated SHA-256 SPKI fingerprint>",
    "installationFingerprint": "<64 lowercase hex>",
    "installationId": "<opaque installation ID>"
  },
  "signature": "<64-byte P1363 signature encoded Base64URL>",
  "encoding": "P1363_BASE64URL"
}
```

The QR payload is public proof material, not a bearer authorization token. It MUST contain no private key, FCM token, token ciphertext, service credential, root secret, or personal contact data. Reject unknown fields, oversized payloads, wrong protocol, malformed encodings, wrong origin, and expiry outside the 60-second window.

## Android scan behavior

1. Android accepts this QR type only while a matching, unexpired server challenge is pending locally.
2. Android compares every statement field against the locally pending challenge and the installation key fingerprint held by Android Keystore.
3. Android stores the received signature only as short-lived pending proof, bound to the exact challenge ID and statement hash. It MUST NOT mark the friend or installation as trusted.
4. Android creates its own installation signature over the exact same canonical bytes using `AndroidEnrollmentKeyStore.signCanonicalBytesP1363`.
5. Android submits the statement and both signatures to the future public binding-submit API. The server fetches both public keys from authoritative registries and verifies both signatures itself.
6. The server rechecks ACTIVE friendship, enrollment, Root/device status and revocation, atomically consumes the challenge, and persists the binding. Any mismatch or race fails closed.
7. Android clears pending proof on success, expiry, cancellation, challenge replacement, or account/device revocation.

## Security and UX requirements

- No JavaScript interface exposed to arbitrary web origins. Prefer QR relay over a general-purpose WebView bridge.
- No private CryptoKey export, PKCS#8 serialization, clipboard transfer, localStorage copy, or key migration.
- The browser signing call must be directly downstream of a visible user gesture; consent cancellation produces no signature.
- QR is single-use and short-lived. Replaying it, scanning it on another installation, or changing any statement byte must fail.
- Android must not trust client-supplied SPKI, fingerprint, `authorized` flags, display names, or QR presence as registry authorization.
- Keep the normal saved-friend call path independent from this ceremony; no repeat QR for already bound, active friends.
- Keep the current audio/video engine unchanged while this identity layer is developed and tested.
- Logs must not include signatures, QR contents, tokens, or personal data.

## Required tests before implementation is considered complete

- Consent denied, dismissed, or absent → no signature and no state mutation.
- Browser identity missing, non-extractable policy broken, or fingerprint mismatch → reject.
- Wrong origin, wrong relationship, wrong installation, malformed field set, altered bytes, oversized QR, invalid P1363 signature → reject.
- Expired challenge, replay, duplicate scan, concurrent submit, challenge replacement, and cross-device scan → reject.
- Android process death between scan and submit → pending proof expires and cannot be replayed.
- Friendship revocation, device revocation, or Root revocation before final write → reject.
- Successful test proves only the browser and Android signatures; a separate physical two-phone test is still required for the full ceremony.

## Release boundary

This is a design artifact only. Do not merge or deploy it as production code. PR #243's executable WebCrypto test proves the cryptographic signing halves in a test harness, not the live QR transport or registry authorization. PR #244's private Registry read adapter remains staging-only and is not yet a verified private service topology. FCM and audible lock-screen ringing remain **NOT VERIFIED**.
