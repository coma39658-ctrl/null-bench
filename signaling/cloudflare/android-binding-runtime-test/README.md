# Android binding workerd runtime test

This directory is a test-only Cloudflare Workers Vitest project.

Run locally:

```sh
npm install --legacy-peer-deps --no-audit --no-fund
npm run test:runtime
```

It loads only `wrangler.jsonc` in this folder, whose only Durable Object binding is the test class. The config has no routes, no credentials, and `workers_dev: false`. Do not use this test config for deployment.

The CI runner executes local workerd/SQLite simulations; this is not a remote Cloudflare account deployment.
