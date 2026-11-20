# E-ZERO Incoming Call Wake — Stage 7 FCM Enrollment Design Gate
Date: 2026-11-20
Status: DESIGN ONLY — NOT IMPLEMENTED, NOT DEPLOYED

## Purpose
Define the minimum safe contract required before an Android installation may receive an incoming-call wake through Firebase Cloud Messaging (FCM). This document is a review gate, not an implementation authorization.

## Explicit non-goals
- No Firebase project selection or configuration.
- No service-account credential, FCM server key, private signing key, or device token creation/storage.
- No GitHub secret or environment mutation.
- No Worker route, Durable Object binding, backend endpoint, or deployment.
- No Android UI, notification, ringtone, lock-screen, Telecom, QR, contacts, media, chat, or WebRTC changes.
- No production/public website changes.

## Trust model
1. A device installation creates its own non-exportable P-256 identity key in Android Keystore.
2. The server must authenticate a fresh enrollment challenge and verify an owner-authorized approval proof before associating any push address with that installation.
3. The server must verify the Stage 6-pinned public wake-signing key configuration before any wake payload can be accepted by the Android client.
4. FCM is a transport/wake hint only. It is not proof of caller identity, call authorization, or permission to answer.
5. The client must independently verify the signed, short-lived wake payload and then fetch/consume a separately authenticated call invitation. It must never auto-answer.

## Enrollment contract — required fields
- protocol_version: fixed supported version.
- installation_id: random, opaque, per-installation identifier; never derived from hardware identifiers.
- installation_public_key: P-256 public key only; private key remains in Android Keystore.
- challenge_id and challenge_nonce: server-issued, single-use, short-lived values.
- owner_approval: domain-separated signature over the exact canonical enrollment bytes.
- push_token: FCM registration token, supplied only after proof verification and only to the authenticated enrollment endpoint.
- created_at / expires_at: server timestamps; client timestamps are advisory only.

No profile photo, contact list, phone number, chat content, SDP, ICE candidate, call audio/video, or call history belongs in enrollment records.

## Server-side acceptance rules
- Require TLS and authenticated owner/device proof.
- Bind the challenge to the owner, installation public-key fingerprint, and exact protocol version.
- Enforce expiry, nonce uniqueness, replay protection, and atomic one-time consumption.
- Reject unknown fields, malformed encodings, unsupported algorithms, duplicate installation identities, and mismatched owner partitions.
- Apply per-installation and per-owner rate limits before persistence.
- Do not let an FCM token alone create, replace, or reactivate a trusted installation.
- Token rotation requires a fresh authenticated proof; revocation must invalidate the token association.
- Keep push tokens encrypted at rest, access-controlled, excluded from logs, and subject to documented retention/deletion.
- Never put call content or caller-supplied identity claims in FCM payloads.

## FCM payload boundary
FCM payload may contain only an opaque event identifier, protocol version, short expiry, and a signed wake envelope required by the already-defined Stage 5 contract. Do not include names, phone numbers, photos, message text, SDP, ICE, or media URLs. A wake is only a prompt to retrieve a verified invitation.

## Revocation and lifecycle
- Owner can revoke an installation; revocation is immediate and idempotent.
- Uninstall/reinstall creates a new installation identity.
- Invalid, expired, replayed, or revoked invitations fail closed.
- Token refresh cannot silently restore a revoked installation.
- Cleanup must preserve audit evidence needed for abuse prevention while deleting expired push-token associations according to a reviewed retention schedule.

## Required gates before implementation
1. Owner approves the exact Firebase project and its environment (staging only).
2. A separately authorized operator creates/handles Firebase credentials in the provider's secret store; credentials never enter Git, chat, build logs, or APK.
3. Stage 6 public SPKI pin is reviewed and supplied as a public build input; matching private key remains server-side.
4. A backend endpoint is designed with explicit owner authentication, challenge lifecycle, quota, replay, revocation, and retention tests.
5. Independent security review confirms token confidentiality, log redaction, owner partition isolation, and no token-only trust.
6. CI proves contract and runtime behavior; physical Android tests separately prove FCM delivery, ringtone, lock-screen policy, and cancellation.
7. Separate explicit approval is required before any staging deployment or production integration.

## Evidence labels
- DESIGN: this document only.
- CI: automated checks, when added in a later authorized implementation stage.
- RUNTIME: deployed staging endpoint exercised in its actual runtime.
- DEVICE: physical Android delivery and ringing verified.
- PRODUCTION: explicitly approved production rollout.

A DESIGN or CI result must never be reported as proof of RUNTIME, DEVICE, or PRODUCTION behavior.
