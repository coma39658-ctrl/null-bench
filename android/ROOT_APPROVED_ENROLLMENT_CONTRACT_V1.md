# E-ZERO Android root-approved enrollment — contract v1

Status: isolated staging contract and cryptographic tests only. No endpoint, storage, Firebase registration, FCM sender, or Worker deployment is active.

## Security boundary

The browser E-ZERO root identity and Android installation key are different P-256 identities. Android private keys remain in Android Keystore. The root identity must explicitly approve the exact Android SPKI fingerprint. A self-signed root key supplied by the enrolling phone is NOT an authority.

**Critical prerequisite:** the backend needs an independently authenticated root-identity registry/session that proves the approving browser key is already an authorized E-ZERO root identity. Until that trust anchor exists, enrollment completion MUST reject every root, even if its signature is mathematically valid. A public key and its own signature cannot establish account authority.

## Proposed flow

1. Android creates/retains its non-exportable P-256 key and sends only SPKI + fingerprint to an HTTPS challenge endpoint.
2. Backend validates SPKI curve, recomputes SHA-256 fingerprint, creates random one-use nonce, challenge ID, exact audience/origin, and expiry <= 90 seconds.
3. Android signs canonical challenge bytes with its installation key. Backend verifies possession and binds the challenge to that exact SPKI/fingerprint.
4. Browser root session independently authenticates the existing root identity. User sees the exact device fingerprint and approves it explicitly.
5. Browser signs a canonical approval statement binding root fingerprint, Android fingerprint, challenge ID, nonce, audience, and expiry.
6. Backend verifies root membership through its trusted root registry/session, verifies root signature and device proof, atomically consumes the challenge, and creates an active device binding.
7. Root can list and revoke enrolled devices. Revocation blocks all future token updates and sends.

## Canonical encoding

UTF-8, LF only, fixed field order, final LF; no JSON signing.

Challenge:
```
EZERO_ANDROID_ENROLL_CHALLENGE_V1
challenge_id=<base64url>
device_fp=<lowercase-sha256-hex>
nonce=<base64url>
audience=<exact-origin>
expires_at=<unix-ms-decimal>
```

Root approval:
```
EZERO_ANDROID_ROOT_APPROVAL_V1
root_fp=<lowercase-sha256-hex>
device_fp=<lowercase-sha256-hex>
challenge_id=<base64url>
nonce=<base64url>
audience=<exact-origin>
expires_at=<unix-ms-decimal>
```

Both signatures use ECDSA P-256 / SHA-256 with DER encoding. Challenge proof is made by Android key; approval signature is made by the already-authorized browser root key.

## Required backend invariants

- Recompute fingerprints from DER SPKI; never trust caller-provided fingerprints.
- Verify P-256 key type/curve and proof-of-possession.
- Check exact audience/origin; reject wildcard origins.
- Root must already be authenticated/registered; do not auto-register roots from enrollment requests.
- Challenge is one-use, short-lived, bound to exact device key, and consumed atomically with enrollment.
- Reject replay, expiry, wrong key, wrong root, wrong audience, malformed/oversized payloads.
- Store FCM token only after enrollment; never log or return it.
- Token refresh requires Android-key proof and active root approval.
- Root revocation atomically disables token refresh and push delivery.
- Never include private keys, FCM tokens, caller aliases, invite URLs, SDP, messages, photos, or media in logs/push payloads.

## Release gates

This contract is not a live API. Next implementation must be an isolated Worker candidate with persistent replay-safe storage and tests; only after review may a separately authorized staging deployment be considered. Firebase secrets, public site, production Worker, QR identity, friend list, and WebRTC baseline remain untouched.
