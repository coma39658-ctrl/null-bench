#!/usr/bin/env node
/* Staging-only static UI contract. Not a live device or end-to-end test. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const page=fs.readFileSync('ezero_trusted_friends_staging_20261106.html','utf8');
const js=fs.readFileSync('js/ezero_simple_home_staging_20261113.js','utf8');
const css=fs.readFileSync('css/ezero_simple_home_staging_20261113.css','utf8');
const signaling=fs.readFileSync('js/ezero_trusted_stage_signaling_v0_1.js','utf8');
const builder=fs.readFileSync('scripts/build_ezero_secure_app_render_staging_20261107.py','utf8');
const checks=[
 ['Render preview binds its own isolated signaling Worker',()=>assert.match(builder,/ezero-browser-signaling-render-test\.coma39658\.workers\.dev/)],
 ['Render preview replaces pilot Worker rather than sharing production',()=>assert.match(builder,/data\.replace\(old_ws, new_ws, 1\)/)],
 ['QR creation requires confirmed server ready response',()=>{assert.match(signaling,/m\.t==="ready"&&m\.role===s\.role/);assert.match(signaling,/settle\(\)/);}],
 ['QR invite event is not dispatched before server acknowledgement',()=>{const a=signaling.indexOf('async function start()');const b=signaling.indexOf('function openedInvite()',a);assert.ok(a>=0&&b>a);assert.ok(!signaling.slice(a,b).includes('ezero:auto-invite-ready'));}],
 ['signaling has a bounded connection timeout',()=>assert.match(signaling,/setTimeout\(\(\)=>\{try\{ws\.close\(\)/)],

 ['new CSS is referenced',()=>assert.match(page,/css\/ezero_simple_home_staging_20261113\.css/)],
 ['new JS is referenced',()=>assert.match(page,/js\/ezero_simple_home_staging_20261113\.js/)],
 ['original WebRTC signaling is retained',()=>assert.match(page,/ezero_trusted_stage_signaling_v0_1\.js/)],
 ['original saved friend dock is retained',()=>assert.match(page,/id="ezeroContactFirstDock"/)],
 ['Arabic, Urdu and English strings',()=>{for(const x of ['ur:','ar:','en:'])assert.ok(js.includes(x));}],
 ['audio/video actions use existing call buttons',()=>{for(const x of ['ezeroContactAudio','ezeroContactVideo'])assert.ok(js.includes(x));}],
 ['no call on page load',()=>assert.match(js,/panel\.addEventListener\("click"/)],
 ['accessible live status and focus',()=>{assert.match(js,/aria-live/);assert.match(css,/:focus-visible/);}],
 ['mobile responsive layout',()=>assert.match(css,/@media\(max-width:420px\)/)],
 ['simple search forwards to existing friends search',()=>{assert.match(js,/ezeroFriendSideSearch/);assert.match(js,/dispatchEvent\(new Event\("input"/);}],
 ['incoming call panels stay visible',()=>{assert.match(js,/ezeroOneJoinPanel/);assert.match(js,/ezeroTrustedFriendsLab/);}],
 ['saved contacts do not silently fall back to another QR',()=>{assert.match(js,/if\(hasFriends\)/);assert.match(js,/ezeroFriendSidePanel/);assert.match(js,/EZERO_FRIEND_ACCESS/);}],
 ['first-time pairing exposes existing invite controls without auto-calling',()=>{assert.match(js,/ezeroAutoStart/);assert.match(js,/ezeroAutoShare/);assert.match(js,/کوئی کال شروع نہیں ہوئی/);}],
 ['front QR hub is never collapsed by simplified home',()=>assert.match(js,/section\.id==="ezeroFrontQrHub"/)],
 ['front QR remains protected during navigation',()=>assert.match(js,/protectedIds\.has\(target\.id\)/)],
 ['My QR uses visible front QR handler',()=>assert.match(js,/ezeroFrontAudioQr/)],
 ['gallery uses existing QR picker',()=>assert.match(js,/ezeroOneGalleryInvite/)],
 ['original advanced options are not deleted',()=>assert.match(js,/ezero-simple-more/)]
];
let failures=0;for(const [name,fn] of checks){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
if(failures)process.exitCode=1;
