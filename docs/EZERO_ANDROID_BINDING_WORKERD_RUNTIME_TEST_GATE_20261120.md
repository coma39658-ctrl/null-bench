# E-ZERO Android Binding — workerd Runtime Test Gate

Date: 2026-11-20
Branch: `ezero-android-binding-runtime-test-20261120`
Target PR base: `ezero-android-binding-ledger-stage3-20261120`

Status: **LOCAL WORKERD / SQLITE RUNTIME GATE PASS — NO REMOTE DEPLOYMENT.**

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
7. Expected denials return an explicit rejected-status RPC result with a machine-readable code, preventing expected replay/validation denials from surfacing as unhandled isolate-level promise rejections.

All keys are generated for the test and never committed. No real identity, user QR, or contact data is used.

## Verified CI evidence

- Runtime workflow [44762036360](https://github.com/coma39658-ctrl/null-bench/actions/runs/44762036360), commit `ec2b1b7c85234735f928384bb1ccb7c83dcd15df`: **3 passed, 0 failed, 0 unhandled errors** inside Cloudflare's local workerd runtime.
- Evidence Registry Validator [44762072122](https://github.com/coma39658-ctrl/null-bench/actions/runs/44762072122), final documentation commit `d4883ef9da5a5a6ec94a40a009e7b9b0007a4eca`: PASS.
- The runtime tests exercise the actual Durable Object class with SQLite-backed local storage, simultaneous RPC replay, eviction/restart persistence, and owner-signed revocation.

## Explicit boundaries

- This is local workerd/SQLite runtime testing, not a Cloudflare account deployment or real remote namespace.
- No Worker fetch route or public endpoint is added.
- No Wrangler deploy command, Cloudflare token, or namespace deployment is used.
- No Android app, browser UI, contact vault, call engine, production website, or live calling flow is modified.
- A separate review is required before adding any network route or remote staging namespace.

## Next gate after CI

The local workerd gate is now passing. Next review resource bounds, challenge/revocation record retention, durable cleanup, and per-owner rate limiting. Then prepare a dedicated remote staging namespace plan with explicit account/permission checks. Do not expose a public route or deploy a remote namespace until a separate security review and explicit release gate.
