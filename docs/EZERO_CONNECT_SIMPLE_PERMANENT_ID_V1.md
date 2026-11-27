# E-ZERO Connect — Simple Permanent Contact & Calling Design v1

Status: staging design decision. This document is a build contract, not proof of implementation or security certification.

## Product promise

A person sees one permanent E-ZERO ID and one QR. A friend scans once, both approve once, and the friend remains in the contact list. Future calls and messages start from the saved contact. The user does not scan again for normal use.

The UI stays small: My QR, Scan QR, Contacts, Audio, Video, Message. Security checks happen automatically in the background. Never show cryptographic jargon during normal use.

## Keep three identities separate

1. **E-ZERO account ID** — stable public contact address, generated once by the service. It is not a phone number and contains no secret. It survives profile edits and device replacement.
2. **Device key** — unique P-256 signing key per device, generated in secure context and kept non-extractable in the platform keystore where available. The server stores only public key material and device status.
3. **Contact relationship** — mutual approval record between two E-ZERO account IDs, bound to the verified device keys that approved it. The existing signed trust transcript remains proof of consent; it must not be confused with the public contact address.

Do not use a temporary room ID, invite nonce, WebSocket ID, fingerprint alone, display name, avatar, or FCM token as the permanent E-ZERO ID.

## QR v1

The permanent QR contains only a versioned public contact envelope:
- protocol version;
- canonical E-ZERO origin;
- stable E-ZERO account ID;
- public-key fingerprint / identity key version;
- optional signature from the account identity key.

It must not contain a private key, password, recovery secret, FCM token, call token, room secret, or long-lived bearer credential. The QR can be copied safely as an address, but scanning it alone never adds a friend or authorizes a call.

A QR stays stable while the account ID and identity-key version stay valid. If identity keys rotate, the directory publishes the current verified key set and the old QR resolves to the same account. A revoked account or invalid key must fail closed.

## One-time add flow

1. Scanner reads QR and requests the public account profile from the directory.
2. UI displays the verified E-ZERO ID, name and avatar (clearly marked as profile metadata).
3. Scanner taps Add friend.
4. The other side receives one approval request and taps Accept or Decline.
5. Both sides sign the same canonical relationship transcript using their active device keys.
6. Both clients verify the two approvals and save the contact locally.
7. Show one clear result: Friend saved. Do not keep the user on a multi-step diagnostic screen.

A scan is not consent. A display name or avatar is never identity proof. Duplicate scans resolve to the existing contact and do not create duplicate relationships.

## Directory and call routing

Add a small dedicated directory API, separate from the current ephemeral pairing room:
- POST /v1/accounts/register — register an account ID with a proof-of-possession challenge;
- GET /v1/accounts/{ezeroId} — return only public profile and active public device-key metadata;
- POST /v1/devices/register — register/rotate a device public key and push token after signed proof;
- POST /v1/devices/revoke — revoke a lost device after account re-authentication;
- POST /v1/calls/resolve — resolve a saved E-ZERO ID to eligible active devices and issue a short-lived call attempt.

The directory must never return FCM tokens or private routing data to another user. Push tokens are server-side only, protected at rest, scoped to the device, and replaceable. Enforce authorization, exact origin where applicable, request size limits, per-account/IP rate limits, idempotency keys and audit-safe event codes. Do not log tokens, QR payloads, contact lists, message bodies, SDP, ICE or call secrets.

Use the existing Cloudflare Durable Object signaling path for the live WebSocket call session after directory resolution. Do not replace the working media engine in this phase.

## Incoming call delivery

- If recipient is connected: deliver the authenticated call invitation over the existing signaling session.
- If recipient is backgrounded/offline: send a high-priority, short-TTL FCM wake/call event to the registered Android device.
- FCM carries only a random call ID, expiry, protocol version and opaque wake hint. It must not carry SDP, ICE, private keys, FCM tokens, or sensitive message content.
- Android app fetches call details over an authenticated channel, validates caller authorization and expiry, then integrates with Android Core-Telecom / CallStyle incoming-call UI.
- Ring only after a valid call invitation is verified. Always require explicit accept/decline; never auto-answer.
- A missed/expired call ends cleanly. No unbounded wake retries.
- FCM and Android delivery are best-effort under OS, network, battery, permission and force-stop constraints; never promise ringing in every device state.

## Media and privacy

- Keep WebRTC audio/video and the current call-mode binding. Audio must not silently become video or vice versa.
- Use authenticated signaling and DTLS-SRTP media. Use TURN with short-lived credentials for restrictive mobile networks; do not expose long-lived TURN secrets.
- Prefer relay-only mode when the user selects a privacy option; disclose that it may increase data/operating cost.
- Never record calls on the E-ZERO server. Do not persist SDP/ICE or media in the directory.
- Push payloads are wake hints, not the media or signaling transport.

## Recovery and device loss

- Account ID remains stable when a device is replaced.
- New device enrollment requires a passkey / platform credential or a one-time recovery method, then a new device key.
- Lost-device revocation invalidates its directory registration and push token immediately.
- Never restore trust merely from a copied QR, display name, avatar, or local contact export.
- If a recovery mechanism is not implemented and verified, clearly state that account recovery is not yet available; do not claim a permanent recoverable account.

## Reduce manual testing with automated gates

Use one deterministic automated suite to cover:
- valid/invalid QR envelope, tampering, wrong origin, unknown ID and key rotation;
- duplicate scan idempotency;
- both-side accept, decline, one-sided approval, replay and revocation;
- directory authorization, enumeration resistance, rate limits and no token disclosure;
- same-device reconnect, competing-device takeover rejection and reconnect after network loss;
- push token rotation, revoked-device rejection, expired call and duplicate push idempotency;
- no SDP/ICE/FCM token/private key in logs or directory responses;
- call mode preservation, explicit accept/decline and hangup cleanup.

Then use a single physical Android release gate with a short scripted run:
1. scan and save once;
2. call from saved contacts;
3. repeat with recipient app backgrounded and screen off;
4. repeat once across different networks;
5. revoke a test device and verify it cannot receive calls.

A green unit/CI suite reduces repeated manual work but cannot prove Android background ringing, OEM battery behavior, camera permissions, microphone permissions, or real network/TURN operation. These require the one physical release gate.

## Migration and non-regression

- Preserve the existing mutual-trust transcript, encrypted local contacts, saved-friend UI and current WebRTC audio/video engine.
- Add stable E-ZERO ID as a separate field; do not reinterpret the existing relationshipId as an account ID.
- Existing trusted contacts continue to work during migration. Do not delete or silently rewrite existing IndexedDB records.
- Keep initial pairing Worker and saved-friend rendezvous as separate paths until tests prove the new directory route. Then route saved-friend calls through stable IDs.
- Keep all changes on isolated staging branches and preview services. No production deploy or merge as part of this design step.

## Release truth labels

- **PASS**: automated contract passed.
- **PARTIAL**: one component passed but end-to-end flow is incomplete.
- **UNKNOWN**: not tested or no reliable evidence.
- **FAIL**: reproducible failure.

A design document, mocked test, or green CI job is not proof of real two-phone calling or background ringing.
