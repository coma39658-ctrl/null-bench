import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./signaling/cloudflare/wrangler.android-enrollment-candidate-v1.jsonc"
      },
      miniflare: {
        bindings: {
          ROOT_BOOTSTRAP_SECRET: "test-only-not-a-production-secret"
        }
      }
    })
  ],
  test: {
    include: ["tests/worker-runtime/**/*.test.js"],
    testTimeout: 30000,
    hookTimeout: 30000,
    maxWorkers: 1
  }
});
