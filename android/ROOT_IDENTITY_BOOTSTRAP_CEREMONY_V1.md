# E-ZERO Root Identity Bootstrap Ceremony V1

Status: SECURITY DESIGN + STATIC QA ONLY. No bootstrap endpoint is activated by this document. No secret is generated, stored, transmitted, or configured by this change. No Worker deployment or production change is authorized.

## Objective

Establish the first E-ZERO browser root identity without treating a self-signed key, email address, QR code, GitHub account, or possession of a public key as proof of authority.

The root is the existing browser P-256 identity. Its private CryptoKey must remain non-exportable in the browser's protected local key store. Android installations are subordinate devices and can never bootstrap or replace the root.

## Required independent trust anchors

Bootstrap is allowed only when all of the following are true:

1. The operator has independently authenticated access to the E-ZERO staging Worker deployment and its protected configuration.
2. A high-entropy one-time bootstrap secret is provisioned out-of-band into a protected Worker secret named `ROOT_BOOTSTRAP_SECRET`. It must never appear in source, QR, URL, browser storage, logs, CI output, or chat.
3. The exact expected root fingerprint is independently compared and pinned in protected configuration as `ROOT_BOOTSTRAP_EXPECTED_FP` (lowercase 64-character SHA-256 hex of the browser root SPKI). It is not accepted from the same request body as its own trust anchor.
4. The operator compares the fingerprint displayed by the browser against the independently configured fingerprint through a separate trusted channel before sending the bootstrap request.
5. The target is the isolated staging Worker only. Production and public friend-QR services are out of scope.

A secret alone is insufficient. A fingerprint supplied only by the requester is insufficient. A self-signed signature alone is insufficient.

## Ceremony

1. On the already-controlled browser, create or load the existing non-exportable P-256 root key. Never export or copy its private key.
2. Display the root SPKI-derived SHA-256 fingerprint locally in a human-readable grouped form and as exact lowercase hex for comparison. Do not expose the private key.
3. Through an independently authenticated deployment channel, set the exact expected fingerprint and a cryptographically random one-time bootstrap secret in protected Worker configuration. Do not paste either value into source code, public issues, QR, or chat.
4. Independently compare the browser fingerprint with the configured fingerprint. If any character differs, stop; do not register.
5. Send the root public SPKI and one-time secret over HTTPS to the isolated bootstrap endpoint. The endpoint recomputes the fingerprint from SPKI and requires an exact match with the protected expected fingerprint.
6. The endpoint atomically consumes the one-time bootstrap authorization before registration. Concurrent or repeated requests fail. It validates P-256 SPKI and stores only the public root key, fingerprint, creation timestamp, and status.
7. Remove/rotate the bootstrap secret and clear the expected-fingerprint bootstrap configuration according to the reviewed operational procedure. A used bootstrap authorization must never be reusable.
8. Verify registration by signing a fresh server challenge with the same browser key and validating it against the stored root public key. Do not infer success from HTTP 200 alone.
9. Only after verification may that root approve Android enrollment challenges and manage its subordinate devices.

## Failure and recovery

- Missing secret, missing expected fingerprint, malformed SPKI, fingerprint mismatch, expired authorization, replay, concurrent use, wrong environment, or invalid signature: fail closed.
- Never fall back to email identity, account login, a QR-supplied root public key, or a self-signed key.
- Root private key loss requires a separate documented recovery ceremony with independently verified ownership; do not silently replace the root.
- Root compromise requires revocation of the compromised root and all subordinate Android device bindings, followed by a separately verified recovery ceremony.
- Do not log secrets, raw SPKI, complete request bodies, signatures, or QR payloads. Emit only non-sensitive event codes and outcome categories.
- Never return bootstrap secrets or stored private material in API responses.

## Operational safeguards

- No automatic bootstrap on first page load.
- No silent root replacement or automatic rotation.
- Explicit human confirmation immediately before registration.
- Strict HTTPS origin allowlist; no redirects; bounded body size; rate limiting.
- Atomic single-use authorization consumption; replay and concurrent-request tests.
- Staging and production secrets/configuration must be separate.
- The initial expected fingerprint must be independently verified; it cannot be derived from untrusted request data.
- No FCM token registration or push wake activation during root bootstrap.

## Release gates

Before implementation or deployment:
1. Review the bootstrap endpoint and Durable Object atomic-consumption semantics.
2. Add tests for missing/mismatched fingerprint, missing secret, concurrent replay, sequential replay, wrong SPKI, invalid key type, wrong origin, oversize body, and secret redaction.
3. Define a human-operable fingerprint comparison method and recovery procedure.
4. Verify secret provisioning and removal capabilities in the hosting platform without exposing secret values.
5. Obtain separate explicit authorization before deploying even to staging.

This document changes no active Worker, no public site, no existing friend QR, no saved-friend records, and no call signaling.
