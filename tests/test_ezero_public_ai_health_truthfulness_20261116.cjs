"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const index = fs.readFileSync("index.html", "utf8");
const agent = fs.readFileSync("js/ezero_qwen_public_agent_v0_1.js", "utf8");
const marker = 'window.EZERO_PUBLIC_AI_ENDPOINT = "https://ezero-qwen-public-siteaware-v0-3.coma39658.workers.dev/api/ezero-agent/v0.1/ask";';
const start = index.indexOf(marker);
assert.notEqual(start, -1, "public AI health block must remain in the AI Studio section");
const end = index.indexOf("</script>", start);
assert.notEqual(end, -1, "public AI health block must be a complete script");
const block = index.slice(start, end);

function makeEnvironment(fetchImpl) {
  const elements = {
    ezeroQwenFrontStatus: { textContent: "", style: {} },
    ezeroQwenFrontDescription: { textContent: "" },
    ezeroQwenFrontOpen: { textContent: "" }
  };
  let loadHandler = null;
  const window = {
    addEventListener(name, handler) {
      if (name === "load") loadHandler = handler;
    }
  };
  const document = {
    getElementById(id) {
      return elements[id] || null;
    }
  };
  vm.runInNewContext(block, { window, document, fetch: fetchImpl });
  return { window, elements, loadHandler };
}

(async function main() {
  // The page must never display a live badge before the asynchronous health check.
  const initial = makeEnvironment(async () => { throw new Error("not called before load"); });
  assert.equal(initial.elements.ezeroQwenFrontStatus.textContent, "Checking AI availability…");
  assert.equal(initial.window.EZERO_PUBLIC_AI_HEALTH_STATUS, "CHECKING");
  assert.equal(initial.window.EZERO_PUBLIC_AI_HEALTH_VERIFIED, false);

  // Only the complete, non-authoritative public health contract may display Live.
  const online = makeEnvironment(async () => ({
    ok: true,
    json: async () => ({
      status: "ONLINE",
      public_ai_enabled: true,
      evidence_authority: false
    })
  }));
  assert.equal(online.elements.ezeroQwenFrontStatus.textContent, "Checking AI availability…");
  await online.loadHandler();
  assert.equal(online.elements.ezeroQwenFrontStatus.textContent, "Governed AI Live · v0.3");
  assert.equal(online.window.EZERO_PUBLIC_AI_HEALTH_VERIFIED, true);
  assert.equal(online.window.EZERO_PUBLIC_AI_ENABLED, true);

  // A valid but disabled/unsafe health response must not display Live.
  const offline = makeEnvironment(async () => ({
    ok: true,
    json: async () => ({
      status: "ONLINE",
      public_ai_enabled: true,
      evidence_authority: true
    })
  }));
  await offline.loadHandler();
  assert.equal(offline.elements.ezeroQwenFrontStatus.textContent, "Public AI Off");
  assert.equal(offline.window.EZERO_PUBLIC_AI_ENABLED, false);

  // HTTP errors and network failures are UNKNOWN, not ONLINE or fabricated zeroes.
  const httpFailure = makeEnvironment(async () => ({ ok: false }));
  await httpFailure.loadHandler();
  assert.equal(httpFailure.elements.ezeroQwenFrontStatus.textContent, "AI availability unverified");
  assert.equal(httpFailure.window.EZERO_PUBLIC_AI_HEALTH_VERIFIED, false);

  const networkFailure = makeEnvironment(async () => { throw new Error("offline"); });
  await networkFailure.loadHandler();
  assert.equal(networkFailure.elements.ezeroQwenFrontStatus.textContent, "AI availability unverified");
  assert.equal(networkFailure.window.EZERO_PUBLIC_AI_HEALTH_VERIFIED, false);

  // Request permission remains separate; the agent's backend request gate is unchanged.
  assert.match(agent, /window\.EZERO_PUBLIC_AI_ENABLED === true/);
  console.log("PASS: initial/checking, verified-online, disabled, HTTP-error and network-error states are truthful.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
