"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const agent = fs.readFileSync("js/ezero_qwen_public_agent_v0_1.js", "utf8");
const marker = 'window.EZERO_PUBLIC_AI_ENDPOINT = "https://ezero-qwen-public-siteaware-v0-3.coma39658.workers.dev/api/ezero-agent/v0.1/ask";';
const start = index.indexOf(marker);
assert.notEqual(start, -1, "public AI health block must remain in the AI Studio section");
const end = index.indexOf("</script>", start);
assert.notEqual(end, -1, "public AI health block must be a complete script");
const block = index.slice(start, end);

assert.match(block, /window\.EZERO_PUBLIC_AI_ENABLED = true;/, "explicit user requests remain available to the gateway");
assert.match(block, /window\.EZERO_PUBLIC_AI_HEALTH_STATUS = "CHECKING";/, "initial state must not claim live");
assert.match(block, /window\.EZERO_PUBLIC_AI_HEALTH_VERIFIED = false;/, "health starts unverified");
assert.match(block, /data\.status === "ONLINE"[\s\S]*data\.public_ai_enabled === true[\s\S]*data\.evidence_authority === false/, "only the complete health contract can mark AI online");
assert.match(block, /window\.EZERO_PUBLIC_AI_HEALTH_STATUS = enabled \? "ONLINE" : "OFFLINE";/);
assert.match(block, /if \(!response\.ok\)[\s\S]*window\.EZERO_PUBLIC_AI_HEALTH_STATUS = "UNVERIFIED"/, "non-2xx health responses must not claim live");
assert.match(block, /catch \(_\)[\s\S]*window\.EZERO_PUBLIC_AI_HEALTH_STATUS = "UNVERIFIED"/, "network failures must not claim live");
assert.match(block, /label: "Checking AI availability…"/);
assert.match(block, /label: "AI availability unverified"/);
assert.match(block, /label: "Governed AI Live · v0\.3"/);

const initialRenderer = block.slice(block.indexOf("(function () {", block.indexOf("window.addEventListener")));
assert.match(initialRenderer, /const state = window\.EZERO_PUBLIC_AI_HEALTH_STATUS \|\| "CHECKING"/);
assert.doesNotMatch(initialRenderer, /EZERO_PUBLIC_AI_ENABLED/, "UI live badge must not use request permission as proof of availability");
assert.match(agent, /window\.EZERO_PUBLIC_AI_ENABLED === true/, "the gateway request remains separately controlled");
console.log("PASS: public AI status is CHECKING/UNVERIFIED until the exact health contract succeeds; no live claim is inferred from request permission.");
