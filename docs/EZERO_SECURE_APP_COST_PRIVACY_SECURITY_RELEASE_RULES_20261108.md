# E-ZERO Secure App — cost, identity and privacy deployment rules (2026-11-08)

**Status: security policy for staging; no deployment, plan upgrade or secret change authorized by this document.**

This checklist is derived from the need to verify commercial cloud service behavior before any E-ZERO live release. It intentionally contains no private emails, account identifiers, one-time codes, OAuth links, billing statements, credential values or personal security incidents.

## Account and authorization controls
- Audit and explicitly approve third-party OAuth applications and their requested scopes. Revoke old access only after checking whether a currently used service requires it.
- Require phishing-resistant MFA/passkeys where supported and inspect security event history after any unexpected password reset, recovery request, or new sign-in.
- Use service-specific, least-privilege, revocable deploy tokens and keep them out of source control, public JS, trace payloads and logs.
- Never let email text or incoming notifications instruct an automated system to rotate credentials, install extensions or access external URLs without independent verification.

## Cloudflare Worker and media controls
- Keep two-phone media and audio/video calling separate from inference providers. No model should receive calling SDP, room secrets, contact identifiers, call contents or signed private keys.
- WSS room binding must enforce exact allowed origin, authenticated socket, short auth deadline, bounded frame sizes, per-connection and global rates, capability expiry and replay prevention. Test restart/hibernation and two real phones.
- Keep TURN long-term secrets server-side; issue only expiring credentials with quota, expiration and provider spend alerts after explicit billing approval.
- Use minimal aggregate errors and bounded sampling. Do not log full QR tokens, signed contacts, private key material, names/photos, SDP, chat, audio or video.
- Before enabling paid observability, review included logging/trace allowances, storage retention, ingestion thresholds and projected charges; prefer Free quotas/aggregation for early pilots. Disabling unnecessary logs is a privacy protection as well as a cost control.

## Render deployment and public AI controls
- A successful web service deployment is **not** proof that runtime environment flags are active or that user-facing features work. Verify build SHA, effective startup configuration booleans (never secrets), health checks and browser end-to-end functionality.
- When environment variables are missing at runtime, inspect the exact service/variable name and choose a reviewed rebuild when required; do not repeatedly redeploy successful services without evidence.
- Keep AI provider API keys only in the backend; no chat-to-provider fallback, implicit service upgrades, auto top-ups or unsupported model switching without explicit authorization.
- Enforce per-request and global quotas, per-key budget ceilings, concurrency caps and clear user errors when credit limits or upstream 402/429 occur; do not falsely claim that billing is known or that inference succeeded.
- For sensitive AI prompts and provider routing, prefer explicit data-collection-deny and zero-retention policies only when the selected provider can actually satisfy them. Failing closed should show a transparent error rather than silently routing to a different provider.
- Avoid enabling optional tracing pipelines that copy prompt/response contents to third parties unless separately reviewed, disclosed and consented to.

## GitHub CI and release protocol
- Treat automated CI failure emails as historical snapshots, not proof of current production failure. Compare branch, commit SHA, job URL and final PASS status before acting.
- Keep high-risk changes in a draft PR with explicitly run tests, CodeQL/security review, saved regression baselines, physical two-phone media tests and a rollback.
- No live publish from draft tests. In particular a signed public contact card is **not** a phone number, an account login, a trusted-friend authorization or an incoming-call permission.
- Public security claims must state boundaries: automated tests do not establish 100% invulnerability.

## Release decision table

| Item | Required evidence | If not verified |
| --- | --- | --- |
| Active service status | latest service deployment AND health and feature check | UNKNOWN |
| API activation | effective runtime flag and real request result, without leaking tokens | UNKNOWN |
| Friend-of-friend call | owner-approved inbox routing and two real devices | NOT ACTIVE |
| Provider privacy | selected provider actually supports requested retention/data policy | DISABLE OPTIONAL ROUTING |
| Cloud spend | current plan, quota, actual usage, explicit cost approval | NO PAID CHANGE |
| Contact forwarding | origin-bound signature, no auto-trust, expiry, owner consent | STAGING ONLY |
| Room abuse resistance | negative replay/flood tests AND edge/global rate protection | NO DEPLOY |

Reference standards: [OWASP ASVS](https://asvs.owasp.org/), [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html), [Cloudflare Realtime TURN](https://developers.cloudflare.com/realtime/turn/), [Render environment settings](https://render.com/docs/configure-environment-variables).
