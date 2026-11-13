#!/usr/bin/env node
/* Staging-only, read-only source-contract regression checks.
 * These checks do NOT prove live two-phone calling or backend reachability.
 */
const fs=require('node:fs');
const assert=require('node:assert/strict');
const read=p=>fs.readFileSync(p,'utf8');
const dock=read('js/ezero_contact_first_call_dock_v0_1.js');
const inbox=read('js/ezero_trusted_friend_foreground_client_candidate_v0_1.js');
const profile=read('js/ezero_profile_first_verified_friends_v0_1.js');
const config=read('js/ezero_trusted_inbox_stage_config_20261106.js');
const cases=[
 ['saved friend action uses selected fingerprint',()=>assert.match(dock,/api\?\.prepare\?\.\(selected,target\.dataset\.modernSelect\)/)],
 ['first-time QR pairing remains reachable',()=>assert.match(dock,/if\(!contacts\(\)\.length\)return/)],
 ['unknown friend cannot receive inbox invitation',()=>assert.match(inbox,/if\(!known\)\{emit\("unrecognized"/)],
 ['explicit incoming call acceptance is retained',()=>assert.match(profile,/button\?\.id==="ezeroAutoAccept"/)],
 ['saved calls require a trusted local contact',()=>assert.match(inbox,/!FP\.test\(fp\)\|\|!friend\(fp\)/)],
 ['inbox is restricted to owned public origin',()=>assert.match(inbox,/location\.origin===ORIGIN/)],
 ['incoming request does not auto-answer',()=>assert.match(inbox,/never an auto-accept/)],
 ['no socket is started on page load',()=>assert.match(inbox,/No WebSocket or persistent identity initialization happens on page load/)],
 ['inbox config remains explicitly staging',()=>assert.match(config,/pre-release-test/)],
 ['recipient must accept before saving friend',()=>assert.match(profile,/pairIntent\.role==="recipient"&&d\.signalType!=="offer"/)]
];
let failed=0;
for(const [name,fn] of cases){try{fn();console.log('PASS',name)}catch(e){failed++;console.error('FAIL',name,e.message)}}
console.log('Source contracts:',cases.length-failed,'PASS,',failed,'FAIL');
if(failed)process.exitCode=1;
