"use strict";

const fs = require("fs");
const vm = require("vm");

global.window = global;
window.EZERO_PUBLIC_AI_ENABLED = true;
window.EZERO_PUBLIC_AI_ENDPOINT =
  "https://ezero-qwen-lab-adapter.onrender.com/api/ezero-agent/v0.1/ask";
window.setTimeout = setTimeout;
window.clearTimeout = clearTimeout;

const source = fs.readFileSync(
  "js/ezero_qwen_public_agent_v0_1.js",
  "utf8"
);

vm.runInThisContext(source, {
  filename: "ezero_qwen_public_agent_v0_1.js"
});

const agent = window.EZERO_QWEN_PUBLIC_AGENT_V0_1;

if (!agent || typeof agent.ask !== "function") {
  throw new Error("PUBLIC_AGENT_RUNTIME_NOT_AVAILABLE");
}

async function expectReject(name, expectedMessage, fetchImpl) {
  global.fetch = fetchImpl;

  try {
    await agent.ask({
      question: "What is E-ZERO?",
      responseLanguage: "en",
      answerLength: "short"
    });

    throw new Error(name + "_DID_NOT_REJECT");
  } catch (error) {
    const message =
      error && error.message ? error.message : String(error);

    if (message !== expectedMessage) {
      throw new Error(
        name + "_WRONG_ERROR:" + message
      );
    }

    console.log("PASS:", name, "=>", message);
  }
}

(async function () {
  await expectReject(
    "INVALID_RESPONSE_FAIL_CLOSED",
    "AI_RESPONSE_SCHEMA_FAILED",
    async function () {
      return {
        ok: true,
        status: 200,
        json: async function () {
          return {
            status: "OK",
            answer: "Unsafe uncontracted answer",
            source_class: "OPEN_WEB_GENERAL",
            diagnostic_claim: false,
            evidence_authority: false
          };
        }
      };
    }
  );

  await expectReject(
    "AI_UNAVAILABLE_PROPAGATES_TO_VOICE_FALLBACK",
    "AI_GATEWAY_HTTP_503",
    async function () {
      return {
        ok: false,
        status: 503,
        json: async function () {
          return {};
        }
      };
    }
  );

  console.log("PUBLIC_AGENT_RUNTIME_GATES: PASS");
  console.log("PUBLIC_AI_ACTIVATION: STILL_OFF");
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});
