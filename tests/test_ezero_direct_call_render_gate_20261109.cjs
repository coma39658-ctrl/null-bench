#!/usr/bin/env node
"use strict";
/* TEST 02: fail-closed Render-origin direct-call contract.
 * This intentionally does not simulate a successful two-phone call.
 */
const fs=require("node:fs"),assert=require("node:assert/strict");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const builder=read("scripts/build_ezero_secure_app_render_staging_20261107.py");
const inbox=read("js/ezero_trusted_friend_foreground_client_candidate_v0_1.js");
const cfg=read("js/ezero_trusted_inbox_stage_config_20261106.js");
const dock=read("js/ezero_contact_first_call_dock_v0_1.js");
const html=read("ezero_trusted_friends_staging_20261106.html");
assert.match(builder,/cfg\s*=\s*cfg\.replace\(needle,\s*"enabled:false",\s*1\)/);
assert.match(builder,/Production-origin inbox must be disabled on preview/);
assert.match(inbox,/location\.origin===ORIGIN/);
assert.match(inbox,/TRUSTED_DEPLOYMENTS\[ORIGIN\]===CALL_PAGE/);
assert.match(inbox,/const ORIGIN=CONFIG\?\.expectedOrigin/);
assert.match(inbox,/const CALL_PAGE=CONFIG\?\.callPage/);
assert.match(inbox,/https:\/\/coma39658-ctrl\.github\.io/);
assert.match(inbox,/https:\/\/ezero-secure-app-two-phone-test-20261107\.onrender\.com/);
assert.match(cfg,/expectedOrigin:"https:\/\/coma39658-ctrl\.github\.io"/);
assert.match(cfg,/enabled:true/);
assert.match(dock,/if\(!api\?\.prepare\)return message\("noService"\)/);
assert.match(html,/ezero_trusted_friend_foreground_client_candidate_v0_1\.js/);
assert.match(html,/ezero_trusted_friends_controls_candidate_v0_1\.js/);
console.log("PASS: Render TEST direct-call is intentionally disabled by source build; do not mislabel as live.");
console.log("BLOCKED: requires separately deployed origin-bound authenticated inbox, updated allowlist and real two-phone evidence.");
