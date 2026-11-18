#!/usr/bin/env node
/* PR156 isolated room-signaling Worker origin contract; static only. */
const fs=require("node:fs");
const assert=require("node:assert/strict");
const config=JSON.parse(fs.readFileSync("signaling/cloudflare/wrangler.pr156-preview-v2-20261116.jsonc","utf8"));
const worker=fs.readFileSync("signaling/cloudflare/src/worker.js","utf8");
const builder=fs.readFileSync("scripts/build_ezero_secure_app_render_staging_20261107.py","utf8");
const origin="https://ezero-save-friend-pr156-preview-v2.onrender.com";
const endpoint="wss://ezero-browser-signaling-pr156-preview-v2.coma39658.workers.dev";
assert.equal(config.name,"ezero-browser-signaling-pr156-preview-v2");
assert.equal(config.vars.PUBLIC_ORIGIN,origin);
assert.equal(config.durable_objects.bindings[0].name,"ROOMS");
assert.equal(config.durable_objects.bindings[0].class_name,"SignalRoom");
assert.ok(worker.includes("env.PUBLIC_ORIGIN"));
assert.ok(worker.includes("SignalRoom"));
assert.ok(builder.includes(endpoint));
assert.ok(builder.includes('new_ws = "'+endpoint+'"'));
console.log("PASS PR156 room-signaling Worker origin, Durable Object and Render builder contract");
