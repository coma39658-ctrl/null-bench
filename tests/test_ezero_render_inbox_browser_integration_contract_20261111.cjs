"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const page=read("ezero_trusted_friends_staging_20261106.html");
const client=read("js/ezero_trusted_friend_foreground_client_candidate_v0_1.js");
const controls=read("js/ezero_trusted_friends_controls_candidate_v0_1.js");
const qr=read("js/ezero_trusted_stage_one_request_v0_1.js");
const build=read("scripts/build_ezero_secure_app_render_staging_20261107.py");
const worker=read("signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js");
test("integration contract: scripts load in order before guarded UI",()=>{
 const names=["ezero_trusted_stage_one_request_v0_1.js","ezero_trusted_inbox_stage_config_20261106.js","ezero_trusted_friend_foreground_client_candidate_v0_1.js","ezero_trusted_friends_controls_candidate_v0_1.js"];
 const offsets=names.map(n=>page.indexOf(n));
 assert.ok(offsets.every(n=>n>=0));
 assert.deepEqual(offsets,[...offsets].sort((a,b)=>a-b));
 assert.match(controls,/if\(!root\|\|!api\?\.enabled\?\.\(\)\)return/);
});
test("integration contract: one fresh QR engine invitation is relayed, not forged",()=>{
 assert.match(qr,/ezero:auto-invite-ready/);
 assert.match(controls,/document\.addEventListener\("ezero:auto-invite-ready"/);
 assert.match(controls,/await api\.callSavedFriend\(fp,kind,link\)/);
 assert.match(client,/FRESH_SIGNED_QR_INVITE_REQUIRED/);
 assert.match(client,/validUrl\(invite,mode\)/);
});
test("integration contract: incoming call requires visible card and explicit acceptance",()=>{
 assert.match(controls,/document\.hidden\|\|!active/);
 assert.match(controls,/paintIncoming\(\)/);
 assert.match(controls,/api\.confirmIncomingVisible\(packet\.from,packet\.callId\)/);
 assert.match(controls,/window\.location\.assign\(selected\.invite\)/);
 assert.match(worker,/if\(msg\?\.t==="received"\)/);
 assert.match(worker,/pendingAck===msg\.callId/);
});
test("integration contract: QR media and Render preview remain isolated",()=>{
 assert.match(build,/cfg = cfg\.replace\(needle, "enabled:false", 1\)/);
 assert.match(build,/new_ws = "wss:\/\/ezero-browser-signaling-(?:render-test|qr-inbox-20261112)\.coma39658\.workers\.dev"/);
 assert.match(page,/ezero_trusted_stage_signaling_v0_1\.js/);
 assert.match(page,/ezero_trusted_stage_one_request_v0_1\.js/);
 assert.doesNotMatch(worker,/getUserMedia|RTCPeerConnection|Mode 04/);
});
test("integration contract: incoming trust is checked in browser and server",()=>{
 assert.match(client,/const known=friend\(m\.from\)/);
 assert.match(client,/if\(!known\)/);
 assert.match(worker,/if\(!trust\.includes\(person\.fp\)\)/);
 assert.match(worker,/if\(!current\.includes\(a\.fp\)\)/);
});
