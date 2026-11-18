#!/usr/bin/env node
/* Staging-only static UI contract. Not a live device or end-to-end test. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const languageRun=spawnSync(process.execPath,['tests/test_ezero_language_preference_staging_20261118.cjs'],{encoding:'utf8'});
if(languageRun.status!==0)throw new Error('Language preference runtime test failed:\n'+languageRun.stdout+'\n'+languageRun.stderr);
console.log('PASS language preference runtime regression test');
const permanentQrRun=spawnSync(process.execPath,['tests/test_ezero_permanent_identity_qr_staging_20261118.cjs'],{encoding:'utf8'});
if(permanentQrRun.status!==0)throw new Error('Permanent QR runtime test failed:\n'+permanentQrRun.stdout+'\n'+permanentQrRun.stderr);
console.log('PASS permanent QR runtime regression test');
const page=fs.readFileSync('ezero_trusted_friends_staging_20261106.html','utf8');
const js=fs.readFileSync('js/ezero_simple_home_staging_20261113.js','utf8');
const css=fs.readFileSync('css/ezero_simple_home_staging_20261113.css','utf8');
const identityEngine=fs.readFileSync('js/ezero_saved_friend_stage_engine_v0_1.js','utf8');
const permanentQr=fs.readFileSync('js/ezero_permanent_identity_qr_staging_20261118.js','utf8');
const checks=[
 ['new CSS is referenced',()=>assert.match(page,/css\/ezero_simple_home_staging_20261113\.css/)],
 ['new JS is referenced',()=>assert.match(page,/js\/ezero_simple_home_staging_20261113\.js/)],
 ['language preference script is referenced',()=>assert.match(page,/js\/ezero_language_preference_staging_20261118\.js/)],
 ['permanent QR script and stylesheet are referenced',()=>{assert.match(page,/js\/ezero_permanent_identity_qr_staging_20261118\.js/);assert.match(page,/css\/ezero_permanent_identity_qr_staging_20261118\.css/);}],
 ['EZERO2 is verified separately from expiring call invitations',()=>{assert.match(identityEngine,/EZERO2\\\\\./);assert.match(identityEngine,/verifyToken\(raw\)/);assert.match(permanentQr,/async function verifyToken/);}],
 ['camera scanner accepts permanent identity QR',()=>assert.match(identityEngine,/!code\.startsWith\("EZERO2\."\)/)],
 ['gallery QR is decoded locally without uploading the image',()=>{assert.match(permanentQr,/createImageBitmap\(file\)/);assert.match(permanentQr,/new BarcodeDetector/);assert.match(permanentQr,/file\.size>8\*1024\*1024/);assert.doesNotMatch(permanentQr,/fetch\(|XMLHttpRequest/);}],
 ['permanent identity text can be copied for remote pairing',()=>assert.match(permanentQr,/ezeroCopyPermanentIdentity/)],
 ['original WebRTC signaling is retained',()=>assert.match(page,/ezero_trusted_stage_signaling_v0_1\.js/)],
 ['original saved friend dock is retained',()=>assert.match(page,/id="ezeroContactFirstDock"/)],
 ['Arabic, Urdu and English strings',()=>{for(const x of ['ur:','ar:','en:'])assert.ok(js.includes(x));}],
 ['home has no duplicate audio/video/QR controls',()=>{for(const x of ['data-ezero-home=\"audio\"','data-ezero-home=\"video\"','data-ezero-home=\"myqr\"','data-ezero-home=\"scan\"','data-ezero-home=\"gallery\"'])assert.ok(!js.includes(x),x);}],
 ['audio/video remain together in the saved-friend dock',()=>{assert.match(page,/id=\"ezeroContactFirstDock\"/);const dock=fs.readFileSync('js/ezero_contact_first_call_dock_v0_1.js','utf8');for(const x of ['ezeroContactAudio','ezeroContactVideo'])assert.ok(dock.includes(x));}],
 ['no call on page load',()=>assert.match(js,/panel\.addEventListener\("click"/)],
 ['accessible live status and focus',()=>{assert.match(js,/aria-live/);assert.match(css,/:focus-visible/);}],
 ['mobile responsive layout',()=>assert.match(css,/@media\(max-width:420px\)/)],
 ['simple search forwards to existing friends search',()=>{assert.match(js,/ezeroFriendSideSearch/);assert.match(js,/dispatchEvent\(new Event\("input"/);}],
 ['incoming call panels stay visible',()=>{assert.match(js,/ezeroOneJoinPanel/);assert.match(js,/ezeroTrustedFriendsLab/);}],
 ['saved friends are selected through the existing contact drawer',()=>{assert.match(js,/ezeroFriendListToggle/);assert.match(js,/ezeroFriendSideSearch/);}],
 ['single Add Friend entry opens the existing QR invitation flow',()=>{assert.match(js,/if\(action===\"add\"\)/);assert.match(js,/ezeroAutoStart/);assert.match(js,/پہلا فون/);}],
 ['pending call QR appears before signaling and is marked unusable until verified',()=>{const signal=fs.readFileSync('js/ezero_trusted_stage_signaling_v0_1.js','utf8');const one=fs.readFileSync('js/ezero_trusted_stage_one_request_v0_1.js','utf8');assert.ok(signal.indexOf('ezero:auto-invite-preview')<signal.indexOf('await connectSocket(session)'));assert.match(one,/ezero:auto-invite-preview/);assert.match(one,/copyBtn\.disabled=!ready/);assert.match(one,/ezero:auto-signal-error/);}],
 ['original advanced options are not deleted',()=>assert.match(js,/ezero-simple-more/)]
];
let failures=0;for(const [name,fn] of checks){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
if(failures)process.exitCode=1;
