#!/usr/bin/env node
/* PR156 isolated Trusted Inbox origin and frontend wiring contract.
 * Static checks only; deployment and signed live handshake are separate gates.
 */
const fs=require("node:fs");
const assert=require("node:assert/strict");
const worker=fs.readFileSync("signaling/cloudflare/src/trusted_inbox_pr156_preview_v2.js","utf8");
const config=JSON.parse(fs.readFileSync("signaling/cloudflare/wrangler.trusted-pr156-preview-v2.jsonc","utf8"));
const client=fs.readFileSync("js/ezero_trusted_friend_foreground_client_candidate_v0_1.js","utf8");
const frontendConfig=fs.readFileSync("js/ezero_trusted_inbox_stage_config_20261106.js","utf8");
const page=fs.readFileSync("ezero_trusted_friends_staging_20261106.html","utf8");
const origin="https://ezero-save-friend-pr156-preview-v2.onrender.com";
const workerUrl="wss://ezero-trusted-inbox-pr156-preview-v2.coma39658.workers.dev";
assert.equal(config.name,"ezero-trusted-inbox-pr156-preview-v2");
assert.equal(config.vars.PUBLIC_ORIGIN,origin);
assert.ok(worker.includes('const ORIGIN="'+origin+'"'));
assert.ok(worker.includes('const INVITE_PATH="/ezero_trusted_friends_staging_20261106.html"'));
assert.ok(worker.includes("verifyHello"));
assert.ok(worker.includes("crypto.subtle.verify"));
assert.ok(worker.includes("RECIPIENT_OFFLINE"));
assert.ok(worker.includes("ONE_CALL_PER_SOCKET"));
assert.match(client,/const ORIGIN=location\.origin;/);
assert.match(client,/EZERO-TRUSTED-INBOX-1/);
assert.match(page,/ezero_trusted_inbox_stage_config_20261106\.js/);
assert.match(frontendConfig,/enabled:true/);
assert.ok(frontendConfig.includes('websocketOrigin:"'+workerUrl+'"'),
  "Foreground inbox client must target the verified isolated PR156 Worker");
assert.ok(frontendConfig.includes('version:"pr156-preview-v2-20261119"'));
assert.ok(page.includes(workerUrl),
  "Page CSP must allow the isolated PR156 WebSocket endpoint");
assert.ok(page.includes("wss://ezero-browser-signaling-pilot.coma39658.workers.dev"),
  "Existing QR/WebRTC signaling endpoint must remain unchanged");
assert.equal(config.durable_objects.bindings[0].name,"TRUSTED_INBOXES");
assert.equal(config.durable_objects.bindings[0].class_name,"TrustedInbox");
console.log("PASS PR156 preview Trusted Inbox origin, frontend config, CSP, invite path, signature and Durable Object contract");
