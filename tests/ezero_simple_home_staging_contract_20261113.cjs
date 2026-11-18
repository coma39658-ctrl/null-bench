#!/usr/bin/env node
/* Staging-only static UI contract. Not a live device or end-to-end test. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const page=fs.readFileSync('ezero_trusted_friends_staging_20261106.html','utf8');
const js=fs.readFileSync('js/ezero_simple_home_staging_20261113.js','utf8');
const css=fs.readFileSync('css/ezero_simple_home_staging_20261113.css','utf8');
const checks=[
 ['new CSS is referenced',()=>assert.match(page,/css\/ezero_simple_home_staging_20261113\.css/)],
 ['new JS is referenced',()=>assert.match(page,/js\/ezero_simple_home_staging_20261113\.js/)],
 ['original WebRTC signaling is retained',()=>assert.match(page,/ezero_trusted_stage_signaling_v0_1\.js/)],
 ['original saved friend dock is retained',()=>assert.match(page,/id="ezeroContactFirstDock"/)],
 ['Arabic, Urdu and English strings',()=>{for(const x of ['ur:','ar:','en:'])assert.ok(js.includes(x));}],
 ['home has no duplicate audio/video/QR controls',()=>{for(const x of ['data-ezero-home=\"audio\"','data-ezero-home=\"video\"','data-ezero-home=\"myqr\"','data-ezero-home=\"scan\"','data-ezero-home=\"gallery\"'])assert.ok(!js.includes(x),x);}],\n ['audio/video remain together in the saved-friend dock',()=>{assert.match(page,/id=\"ezeroContactFirstDock\"/);const dock=fs.readFileSync('js/ezero_contact_first_call_dock_v0_1.js','utf8');for(const x of ['ezeroContactAudio','ezeroContactVideo'])assert.ok(dock.includes(x));}],
 ['no call on page load',()=>assert.match(js,/panel\.addEventListener\("click"/)],
 ['accessible live status and focus',()=>{assert.match(js,/aria-live/);assert.match(css,/:focus-visible/);}],
 ['mobile responsive layout',()=>assert.match(css,/@media\(max-width:420px\)/)],
 ['simple search forwards to existing friends search',()=>{assert.match(js,/ezeroFriendSideSearch/);assert.match(js,/dispatchEvent\(new Event\("input"/);}],
 ['incoming call panels stay visible',()=>{assert.match(js,/ezeroOneJoinPanel/);assert.match(js,/ezeroTrustedFriendsLab/);}],
 ['saved friends are selected through the existing contact drawer',()=>{assert.match(js,/ezeroFriendListToggle/);assert.match(js,/ezeroFriendSideSearch/);}],
 ['single Add Friend entry opens the existing QR invitation flow',()=>{assert.match(js,/if\(action===\"add\"\)/);assert.match(js,/ezeroAutoStart/);assert.match(js,/دوست شامل کرنے کے لیے ایک عارضی QR دعوت تیار کریں/);}],
 ['pending call QR appears before signaling and is marked unusable until verified',()=>{const signal=fs.readFileSync('js/ezero_trusted_stage_signaling_v0_1.js','utf8');const one=fs.readFileSync('js/ezero_trusted_stage_one_request_v0_1.js','utf8');assert.ok(signal.indexOf('ezero:auto-invite-preview')<signal.indexOf('await connectSocket(session)'));assert.match(one,/ezero:auto-invite-preview/);assert.match(one,/copyBtn\.disabled=!ready/);assert.match(one,/ezero:auto-signal-error/);}],
 ['original advanced options are not deleted',()=>assert.match(js,/ezero-simple-more/)]
];
let failures=0;for(const [name,fn] of checks){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
if(failures)process.exitCode=1;
