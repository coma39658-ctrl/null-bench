/* Offline, no network: stage-only QR UI contract guard. */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('ezero_trusted_friends_staging_20261106.html','utf8');
const stage=fs.readFileSync('js/ezero_friend_pair_qr_entry_stage_v0_1.js','utf8');
const hub=fs.readFileSync('js/ezero_front_qr_hub_v0_1.js','utf8');
assert.match(html,/ezero_friend_pair_qr_entry_stage_v0_1\.js\?v=20261109pair1/);
assert.match(html,/id="myQr"/);
assert.match(html,/id="scanQR"/);
assert.match(stage,/id="ezeroPairShow"/);
assert.match(stage,/id="ezeroPairScan"/);
assert.match(stage,/source=\$\("myQr"\)/);
assert.match(stage,/scan\.click\(\)/);
assert.match(stage,/e\.detail\?\.signed===true/);
assert.doesNotMatch(stage,/getUserMedia\s*\(/);
assert.doesNotMatch(stage,/localStorage\.setItem|sessionStorage\.setItem|fetch\s*\(|new WebSocket\s*\(/);
assert.match(hub,/own\.addEventListener\("click",\(\)=>start\("audio"\)\)/);
console.log('PASS: distinct signed identity QR and scan controls are mounted; frozen call hub unchanged (static contract only)');
