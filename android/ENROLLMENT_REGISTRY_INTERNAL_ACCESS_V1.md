# E-ZERO Android enrollment registry — private service access contract V1

Status: **DESIGN ONLY — no private service Worker, service binding, token retrieval, or revocation endpoint is deployed.**

## Goal

Allow only the trusted E-ZERO call controller to verify a recipient's currently enrolled Android installation and obtain its FCM token for server-side delivery. A browser, Android client, QR payload, caller, or public Worker route must never receive an FCM token or token-decryption key.

## Required Cloudflare topology

Use two separate Workers:

1. **Public enrollment Worker** — handles only proof-gated Android challenge, completion, and FCM-token registration endpoints. It writes enrollment state to `AndroidEnrollmentRegistry`. It must not expose token lookup/decryption or arbitrary device listing.
2. **Private enrollment service Worker** — `workers_dev: false`, no public route/custom domain, and no public URL. It binds to the existing Durable Object class using the external `script_name` binding and is called only through an explicit Cloudflare Service Binding from the trusted call-controller Worker. It exposes a narrow RPC interface, not a public HTTP endpoint.

Cloudflare documents that Service Bindings invoke another Worker without a publicly accessible URL, and that a Worker can bind to a Durable Object class exported by another Worker using `script_name`. Confirm the deployed service name and binding in the isolated staging configuration before use.

## Narrow private methods

The private Worker should expose only:

- `resolveRecipientInstallation(accountIdentityFingerprint, installationId)`
  - Require an active server-side Registry relationship between the account identity and the exact root-approved installation.
  - Return only installation ID, installation fingerprint, active/revocation state, token expiry, and an opaque delivery handle. Do not return the raw token to the call controller if the private Worker can dispatch directly.
- `dispatchSignedCallWake(deliveryHandle, signedWake)`
  - Decrypt token inside the private service, send data-only FCM using a dedicated service credential, then discard plaintext token from application memory.
  - Never return token or ciphertext to the caller.
- `revokeInstallation(accountIdentityFingerprint, installationId, reason)`
  - Require an authenticated root/admin action and atomically disable token use and future registration.
- `revokeRoot(rootFingerprint, reason)`
  - Disable all installations and tokens beneath that root.

No method may accept `authorized:true`, caller-provided ownership claims, or client-supplied root approval as authorization. The service must read the authoritative Registry and enrollment state itself.

## Account-to-installation binding

The protocol must preserve three distinct values:

- `recipientIdentityFingerprint`: account/friendship participant identity from the signed invite and Friendship Registry.
- `recipientInstallationFingerprint`: SHA-256 fingerprint recomputed from the enrolled Android SPKI.
- `installationId`: opaque stable ID for that specific Android installation.

Before dispatch, the call controller must verify the signed invite, active mutual friendship, block/revocation status, call expiry, recipient account identity, and the Registry's active binding from that account to this exact installation. Device possession alone does not prove account ownership.

## Token storage and delivery

- Store only AES-256-GCM ciphertext, token hash, updated time, expiry, and active state in the Durable Object.
- Keep the 32-byte encryption key and FCM service credential only in private Worker secrets; never put either in Android, Git, QR, logs, or public Worker vars.
- Private service decrypts only immediately before FCM send. Prefer private-service-side send so the token never leaves that trust boundary.
- FCM message is data-only and contains only a short-lived signed wake envelope: call ID, mode, expiry, nonce, version, signature. No SDP, ICE, chat, caller-provided alias, invite URL, or media.
- Enforce per-account, per-installation, and per-IP rate limits; deduplicate call IDs; cap expiry at 30 seconds; record outcome without token or personal data.

## Root trust and revocation prerequisite

The current candidate's `/v1/admin/root-register` accepts a root SPKI only when the separately provisioned `ROOT_BOOTSTRAP_SECRET` is supplied. This is an operator bootstrap mechanism, not account login and not proof that an arbitrary root key belongs to the E-ZERO account.

Before any real enrollment:
- Independently obtain the exact public SPKI and fingerprint of the already-established E-ZERO Root identity.
- Provision it through a controlled out-of-band operator ceremony; never let an enrolling Android device self-register its own Root.
- Record who approved the fingerprint, when, and by which release/ceremony reference, without recording private keys.
- Implement and test root and installation revocation before FCM dispatch.
- Ensure root revocation invalidates every child installation and token atomically.

## Required negative tests

- Public Internet cannot reach the private service Worker.
- A Worker without the explicit service binding cannot call private methods.
- Wrong caller Worker, missing binding, stale signed request, replayed nonce, wrong account identity, wrong installation ID, wrong installation fingerprint, revoked root, revoked installation, blocked friendship, expired call, and mismatched invite all fail closed.
- No public endpoint returns raw FCM token, ciphertext, encryption key, or service credential.
- Revocation racing with dispatch cannot send a wake after revocation commits.
- Logs and errors contain no FCM token, signed invite body, alias, or secret.

## Release gates

Do not deploy or wire this service until the exact DO storage binding is verified against the isolated enrollment Worker, root provisioning/revocation is implemented, the private Worker has no public ingress, FCM sender credentials and wake signing key are configured in staging secrets, and all negative tests pass. Then test real FCM on two Android phones with foreground, background, screen-off, app-swiped-away, permission denied, battery optimization, reject, expiry, cancellation, and network loss. Force-stop must be tested separately because Android may block delivery.

A green unit/CI result is not proof of audible ringing. Audible lock-screen ringing remains **NOT VERIFIED** until physically observed on the target devices.
