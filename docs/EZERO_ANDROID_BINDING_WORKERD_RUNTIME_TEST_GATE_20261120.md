# E-ZERO Android Binding — workerd Runtime Test Gate

Date: 2026-11-20
Branch: `ezero-android-binding-runtime-test-20261120`
Target PR base: `ezero-android-binding-ledger-stage3-20261120`

Status: **TEST HARNESS ADDED — WAITING FOR CI. NO DEPLOYMENT.**

## Why this gate exists

The prior 17/17 gate exercised the adapter against a transaction-serializing in-memory fake. That verifies the adapter contract but cannot establish Cloudflare Durable Object runtime compatibility or SQLite-backed persistence.

This branch adds a separate test-only project using Cloudflare's Workers Vitest integration (`@cloudflare/vitest-plugin`) so the class executes inside local `workerd` with a SQLite-backed Durable Object namespace.

## Test-only configuration

- Package directory: `signaling/cloudflare/android-binding-runtime-test/`
- Wrangler config: `wrangler.jsonc`, class binding `ANDROID_BINDING_LEDGER`, migration tag `v1-test-only`.
- `workers_dev: false`; no routes, custom domains, secrets, account credentials, or public Worker handler.
- The Wrangler config is referenced only by Vitest. It is not included in any deployment workflow and is not the existing signaling Worker config.
- GitHub Actions installs test dependencies and runs local Vitest/workerd only.

## Runtime tests

1. Generate ephemeral P-256 owner and Android keys in memory; prove the permanent EZERO2 identity and verify the Android enrollment signature.
2. Send two simultaneous approval-consumption RPCs for the same nonce; exactly one may succeed.
3. Evict the Durable Object instance, reconnect to the same ID, and verify active binding and consumed nonce state persist.
4. Verify a consumed approval cannot be replayed after eviction.
5. Revoke with a fresh owner-key signature and verify revocation replay fails.
6. Reject a forged permanent owner proof before challenge creation.

All keys are generated for the test and never committed. No real identity, user QR, or contact data is used.

## Explicit boundaries

- This is local workerd/SQLite runtime testing, not a Cloudflare account deployment or real remote namespace.
- No Worker fetch route or public endpoint is added.
- No Wrangler deploy command, Cloudflare token, or namespace deployment is used.
- No Android app, browser UI, contact vault, call engine, production website, or live calling flow is modified.
- A separate review is required before adding any network route or remote staging namespace.

## Next gate after CI

If the runtime gate passes, inspect and record actual SQLite-backed persistence and concurrency evidence. Then review resource bounds, challenge/revocation record retention, and per-owner rate limiting before proposing a remote staging namespace. Do not expose a public route until a separate security review and explicit release gate.
