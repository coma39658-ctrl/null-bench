# E-ZERO Android Binding Stage 4 Part 4 — Revocation Runtime Gate

Status: isolated test-only candidate; Draft PR; not merged or deployed.

## Purpose
Verify that the already implemented per-owner revocation quota behaves atomically under concurrent valid owner actions, and that one owner's challenge quota cannot consume another owner's allowance.

## Runtime checks
- Seed six active binding records in a real SQLite-backed Durable Object.
- Submit six distinct, cryptographically valid owner-signed revocations concurrently.
- Require exactly five successful revocations in the fixed 10-minute owner window; the remaining device stays active and returns RATE_LIMITED.
- Create two independently verified permanent owners with distinct deterministic Durable Object identities.
- Exhaust the five-challenge allowance for owner A and verify owner B still receives its own five challenges.

## Boundaries
- Test-only Durable Object runtime; no Worker route, production namespace/configuration, migration, remote deployment, Android/browser UI, calls, chat, or media integration.
- Existing EZERO2 owner proof, signature domain, canonical bytes, and permanent identity are unchanged.
- This validates backend quota/isolation behavior only; it does not authorize production use or claim physical-device call success.
