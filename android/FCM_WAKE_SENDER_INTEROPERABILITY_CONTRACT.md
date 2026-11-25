# E-ZERO Android wake sender interoperability contract

Status: STAGING IMPLEMENTATION SPECIFICATION ONLY. This document does not create credentials, configure Firebase, deploy a sender, or activate incoming calls.

## Canonical signed bytes (must match Android exactly)

The sender signs UTF-8 bytes with ECDSA over P-256 and SHA-256. The signature sent as `server_sig` must be the ASN.1 DER ECDSA signature encoding accepted by Android `Signature.getInstance("SHA256withECDSA")`, then Base64URL encoded without padding.

The exact byte sequence is:

```text
EZERO_CALL_WAKE_V1
wake_v=1
call_id=<opaque-call-id>
mode=<AUDIO-or-VIDEO>
expires_at=<base-10-unix-epoch-milliseconds>
nonce=<base64url-random-nonce>
```

There is one LF (byte 0x0A) after every line, including the final nonce line. No CR bytes, JSON serialization, whitespace normalization, Unicode normalization, or extra fields are included in the signed bytes.

## Field constraints

- `wake_v`: exactly `1`.
- `call_id`: 8–128 characters from `A-Z a-z 0-9 _ -`; random and opaque.
- `mode`: exactly `AUDIO` or `VIDEO`.
- `expires_at`: decimal Unix epoch milliseconds; must be later than sender time and no more than 120,000 ms in the future.
- `nonce`: 16–128 characters from `A-Z a-z 0-9 _ -`; cryptographically random and unique per wake.
- `server_sig`: Base64URL without padding of DER-encoded ECDSA signature bytes.

The FCM message must be data-only. The sender must not include caller names, phone numbers, message text, SDP, media, invite URLs, credentials, or other private content.

## Sender-side acceptance and replay controls

Before sending, the backend must:
1. Authenticate the initiating caller and verify the existing signed identity and saved-friend relationship.
2. Confirm the recipient Android installation is root-approved, active, not revoked, and has a current FCM token.
3. Enforce a maximum 120-second expiry, per-caller cooldown, per-device rate limit, and bounded payload size.
4. Generate a fresh nonce and persist its one-time use state atomically with the call wake record.
5. Sign only the canonical bytes above using a server-side private key held in the isolated staging secret store.
6. Send only the allowlisted data fields at high priority where permitted by FCM policy.
7. On duplicate/replayed nonce or call ID, reject; on cancel/reject/timeout/revocation, invalidate the pending invite.

The server must never trust an FCM token as identity or authorization. FCM is only a wake-up transport; the Android client must verify the signature and then fetch/consume the matching short-lived signed invite before Accept can proceed.

## Key publication and rotation

- Generate the signing key only in the isolated staging secret environment.
- Publish only the DER SubjectPublicKeyInfo (SPKI) public key and its SHA-256 fingerprint.
- Independently verify the fingerprint through a separate trusted channel before pinning it in Android.
- Never commit the private key, service-account credential, FCM token, or signing secret.
- Key rotation requires a versioned overlap period and explicit client pin update; unknown versions fail closed.

## Required interoperability tests

Use a deterministic test-only key pair and fixture, never a production secret. Backend and Android tests must independently assert the exact canonical byte array, DER signature verification, Base64URL encoding, altered-field rejection, invalid/expired timestamps, unknown version rejection, and duplicate nonce rejection.

## Release boundary

No Firebase project change, credential creation, secret-store mutation, Worker deployment, production change, public-site change, or release signing is authorized by this specification. Incoming ringing remains NOT ACTIVE until enrollment, sender, signed wake verification, invite handoff, and two-device physical acceptance all pass.
