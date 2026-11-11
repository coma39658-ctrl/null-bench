#!/usr/bin/env node
"use strict";
/* E-ZERO TEST-only offline negative gate: prevent conflating QR signaling with
 * authenticated saved-friend inbox. No network, credentials or user data. */
const fs=require("node:fs");
const assert=require("node:assert/strict");
const read=p=>fs.readFileSync(p,"utf8");
const builder=read("scripts/build_ezero_secure_app_render_staging_20261107.py");
const worker=read("signaling/cloudflare/src/worker.js");
const renderCfg=JSON.parse(read("signaling/cloudflare/wrangler.render-two-phone-test-20261107.jsonc"));
const inboxCfg=read("js/ezero_trusted_inbox_stage_config_20261106.js");
const client=read("js/ezero_trusted_friend_foreground_client_candidate_v0_1.js");
const renderOrigin="https://ezero-secure-app-two-phone-test-20261107.onrender.com";
assert.equal(renderCfg.vars.PUBLIC_ORIGIN,renderOrigin);
assert.equal(renderCfg.name,"ezero-browser-signaling-render-test");
assert.match(worker,/\/v1\/rooms\//);
assert.doesNotMatch(worker,/\/v1\/trusted\//);
assert.match(client,/\/v1\/trusted\//);
assert.match(client,/location\.origin===ORIGIN/);
assert.match(builder,/cfg\s*=\s*cfg\.replace\(needle,\s*"enabled:false",\s*1\)/);
assert.match(inboxCfg,/expectedOrigin:"https:\/\/coma39658-ctrl\.github\.io"/);
assert.doesNotMatch(inboxCfg,/expectedOrigin:"https:\/\/ezero-secure-app-two-phone-test-20261107\.onrender\.com"/);
console.log("PASS: offline guard confirms QR signaling worker is not authenticated trusted inbox.");
console.log("BLOCKED: Render direct-call remains disabled pending a verified dedicated inbox.");
