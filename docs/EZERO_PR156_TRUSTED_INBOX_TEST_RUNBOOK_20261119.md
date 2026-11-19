# E-ZERO PR156 Trusted Inbox — Test Order & Runbook

## Safety boundary
These checks target only the isolated PR156 preview Worker:
- Worker: `ezero-trusted-inbox-pr156-preview-v2`
- WebSocket: `wss://ezero-trusted-inbox-pr156-preview-v2.coma39658.workers.dev`
- Allowed page origin: `https://ezero-save-friend-pr156-preview-v2.onrender.com`

Do not point this suite at production. It uses one-time synthetic P-256 identities and a temporary Durable Object identity. It does not use real contacts, media, SDP, message bodies, or recordings. The live test adds and then revokes its synthetic trust entry.

## Ordered test sequence
1. Origin, route, invite-path, signature and Durable Object static contract.
2. Replay, cooldown, revocation, active-socket close, offline behavior and no-persistence static contract.
3. Live smoke syntax validation.
4. Live Worker health/origin gate (performed by the workflow before the runner).
5. Signed owner challenge/response.
6. Synthetic caller trust and signed caller handshake.
7. Audio invitation reaches the active owner tab.
8. Exact application receipt returns to caller.
9. Repeated Call ID is rejected as `REPLAY`.
10. New Call ID inside cooldown is rejected as `COOLDOWN`.
11. Owner revocation persists and closes active caller socket.
12. Revoked caller is rejected on the next handshake.

## Run locally (Node.js 22)
From the repository root on the isolated preview branch:

```bash
npm install --no-save --ignore-scripts --no-audit --no-fund ws@8
node tests/ezero_pr156_preview_trusted_inbox_ordered_runner_20261119.cjs
```

The live portion requires network access to the isolated staging Worker. A local static PASS is not a live security PASS.

## GitHub Actions
Push changes to branch `ezero-pr156-render-preview-20261116`. The workflow
`.github/workflows/ezero-pr156-preview-trusted-inbox.yml` runs the ordered suite.
Required repository secrets are `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`; values are checked but never printed.

## PASS / FAIL interpretation
- `PASS`: that individual assertion completed.
- `EZERO_PR156_TRUSTED_INBOX_ORDERED_SUITE_PASS`: all ordered checks, including live smoke, passed.
- Any non-zero exit or missing live result is FAIL / NOT VERIFIED, not a partial success.
- Passing this suite does not validate two-phone audio/video media, push notifications,
  production deployment, Saudi regulatory compliance, or load for thousands of users.
