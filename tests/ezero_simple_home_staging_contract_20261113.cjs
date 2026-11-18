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
for(const file of ['js/ezero_saved_friend_stage_engine_v0_1.js','js/ezero_trusted_stage_signaling_v0_1.js','js/ezero_trusted_friends_controls_candidate_v0_1.js','js/ezero_auto_signaling_lab_config_20261106.js','js/ezero_trusted_inbox_stage_config_20261106.js','js/ezero_secure_connect_modern_evidence_stage_v0_1.js','js/ezero_permanent_identity_qr_staging_20261118.js','js/ezero_simple_home_staging_20261113.js','tests/test_ezero_public_video_mode_preservation_20261106.cjs','tests/test_ezero_audio_chat_voice_languages_20261106.mjs','tests/test_ezero_contact_first_call_20261106.mjs']){
 const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
 if(check.status!==0)throw new Error('JavaScript syntax check failed for '+file+':\n'+check.stdout+'\n'+check.stderr);
}
console.log('PASS JavaScript syntax checks for call, QR and voice-note modules');
const videoModeRun=spawnSync(process.execPath,['tests/test_ezero_public_video_mode_preservation_20261106.cjs'],{encoding:'utf8'});
if(videoModeRun.status!==0)throw new Error('Video-mode preservation test failed:\n'+videoModeRun.stdout+'\n'+videoModeRun.stderr);
console.log('PASS selected and locked audio/video mode regression test');
const page=fs.readFileSync('ezero_trusted_friends_staging_20261106.html','utf8');
const js=fs.readFileSync('js/ezero_simple_home_staging_20261113.js','utf8');
const css=fs.readFileSync('css/ezero_simple_home_staging_20261113.css','utf8');
const identityEngine=fs.readFileSync('js/ezero_saved_friend_stage_engine_v0_1.js','utf8');
const permanentQr=fs.readFileSync('js/ezero_permanent_identity_qr_staging_20261118.js','utf8');
const identityScanner=fs.readFileSync('js/ezero_trusted_stage_one_request_v0_1.js','utf8');
const modernEvidence=fs.readFileSync('js/ezero_secure_connect_modern_evidence_stage_v0_1.js','utf8');
const signaling=fs.readFileSync('js/ezero_trusted_stage_signaling_v0_1.js','utf8');
const signalingConfig=fs.readFileSync('js/ezero_auto_signaling_lab_config_20261106.js','utf8');
const trustedInboxConfig=fs.readFileSync('js/ezero_trusted_inbox_stage_config_20261106.js','utf8');
const builtRoot='dist_ezero_secure_app_two_phone_staging/';
const builtPage=fs.readFileSync(builtRoot+'ezero_trusted_friends_staging_20261106.html','utf8');
const builtSignalingConfig=fs.readFileSync(builtRoot+'js/ezero_auto_signaling_lab_config_20261106.js','utf8');
const builtTrustedInboxConfig=fs.readFileSync(builtRoot+'js/ezero_trusted_inbox_stage_config_20261106.js','utf8');
const trustedControls=fs.readFileSync('js/ezero_trusted_friends_controls_candidate_v0_1.js','utf8');
const checks=[
 ['new CSS is referenced',()=>assert.match(page,/css\/ezero_simple_home_staging_20261113\.css/)],
 ['new JS is referenced',()=>assert.match(page,/js\/ezero_simple_home_staging_20261113\.js/)],
 ['language preference script is referenced',()=>assert.match(page,/js\/ezero_language_preference_staging_20261118\.js/)],
 ['permanent QR script and stylesheet are referenced',()=>{assert.match(page,/js\/ezero_permanent_identity_qr_staging_20261118\.js/);assert.match(page,/css\/ezero_permanent_identity_qr_staging_20261118\.css/);}],
 ['offline QR decoder and Apache license are shipped locally',()=>{assert.match(page,/js\/vendor\/jsQR-1\.4\.0\.js/);assert.match(page,/js\/vendor\/jsQR-1\.4\.0\.LICENSE\.js/);assert.match(fs.readFileSync('js/vendor/jsQR-1.4.0.js','utf8'),/webpackUniversalModuleDefinition/);assert.match(fs.readFileSync('js/vendor/jsQR-1.4.0.LICENSE.js','utf8'),/Apache License/);}],
 ['EZERO2 is verified separately from expiring call invitations',()=>{assert.ok(identityEngine.includes("EZERO2"));assert.match(identityEngine,/verifyToken\(raw\)/);assert.match(permanentQr,/async function verifyToken/);}],
 ['camera scanner accepts permanent identity QR',()=>{assert.match(identityEngine,/!code\.startsWith\("EZERO2\."\)/);assert.match(identityScanner,/candidate\.startsWith\("EZERO2\."\)/);assert.match(identityScanner,/source:"permanent-qr"/);assert.match(identityScanner,/verifyToken\?\.\(candidate\)/);}],
 ['camera QR scanning has a local jsQR fallback for browsers without BarcodeDetector',()=>{assert.match(identityEngine,/typeof window\.jsQR==="function"/);assert.match(identityEngine,/decodeContext\.drawImage\(video/);assert.match(identityEngine,/window\.jsQR\(pixels\.data,width,height/);}],
 ['gallery scanner has native and local jsQR fallback',()=>{assert.match(permanentQr,/new BarcodeDetector/);assert.match(permanentQr,/window\.jsQR\(pixels\.data/);assert.match(permanentQr,/1600\/Math\.max/);assert.doesNotMatch(permanentQr,/fetch\(|XMLHttpRequest/);}],
 ['gallery QR is decoded locally without uploading the image',()=>{assert.match(permanentQr,/createImageBitmap\(file\)/);assert.match(permanentQr,/new BarcodeDetector/);assert.match(permanentQr,/file\.size>8\*1024\*1024/);assert.doesNotMatch(permanentQr,/fetch\(|XMLHttpRequest/);}],
 ['permanent identity text can be copied for remote pairing',()=>assert.match(permanentQr,/ezeroCopyPermanentIdentity/)],
 ['verified permanent QR offers explicit local friend save and trust',()=>{assert.match(permanentQr,/ezero:friend-verification/);assert.match(permanentQr,/ezero:friend-local-saved/);assert.match(permanentQr,/setFriendTrust/);assert.match(permanentQr,/nickname:true/);}],
 ['saved friend public key survives verified-call profile updates',()=>assert.match(fs.readFileSync('js/ezero_profile_first_verified_friends_v0_1.js','utf8'),/identitySpki/)],
 ['voice notes have a visible elapsed timer and 60-second ceiling',()=>{assert.match(page,/ezeroVoiceTimer/);assert.match(modernEvidence,/setTimeout\(stopMic,60000\)/);assert.match(modernEvidence,/60 سیکنڈ/);}],
 ['voice notes are chunked into bounded encrypted DataChannel frames',()=>{assert.match(identityEngine,/chunkSize=12000/);assert.match(identityEngine,/m\.kind==="voice-chunk"/);assert.match(identityEngine,/m\.kind==="voice-abort"/);}],
 ['multiple received voice notes are queued with bounded memory and expiry',()=>{assert.match(modernEvidence,/incomingQueue\.push/);assert.match(modernEvidence,/incomingQueue\.length\+\(incoming\?1:0\)>=10/);assert.match(modernEvidence,/expiresAt:Date\.now\(\)\+600000/);}],
 ['voice-note payload is bounded to 256 KiB',()=>{assert.match(modernEvidence,/256\*1024/);assert.match(identityEngine,/encoded\.length>350000/);}],
 ['audio/video mode is frozen and video cannot silently downgrade',()=>{assert.match(identityEngine,/CALL_MODE_MISMATCH/);assert.match(identityEngine,/VIDEO_TRACK_REQUIRED/);assert.match(identityEngine,/remoteVideoGuardTimer=setTimeout/);assert.match(identityEngine,/remoteVideoReady/);assert.match(signaling,/session\.mode/);assert.match(signaling,/window\.EZERO_ACTIVE_CALL_MODE=mode/);assert.match(signaling,/modeRadio\.checked=true/);assert.match(modernEvidence,/callModeLocked/);}],
 ['Render-built staging uses only isolated PR156 WebSocket Workers',()=>{assert.match(signalingConfig,/ezero-browser-signaling-pilot/);assert.match(trustedInboxConfig,/ezero-trusted-friends-inbox-staging/);assert.match(builtSignalingConfig,/ezero-browser-signaling-pr156-preview-v2/);assert.match(builtTrustedInboxConfig,/ezero-trusted-inbox-pr156-preview-v2/);assert.match(builtPage,/ezero-browser-signaling-pr156-preview-v2/);assert.match(builtPage,/ezero-trusted-inbox-pr156-preview-v2/);assert.doesNotMatch(builtPage,/ezero-browser-signaling-pilot|ezero-trusted-friends-inbox-staging/);}],
 ['trusted incoming calls open in-place without dropping the owner inbox',()=>{assert.match(signaling,/openInvite\(link\)/);assert.match(trustedControls,/window\.EZERO_AUTO_CALL\?\.openInvite/);assert.doesNotMatch(trustedControls,/window\.location\.assign\(selected\.invite\)/);}],

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
 ['single Add Friend entry opens permanent QR scan flow',()=>{assert.match(js,/if\(action==="add"\)/);assert.match(js,/ezeroScanPermanentFriendQr/);assert.match(js,/ezeroCreatePermanentQr/);assert.doesNotMatch(js,/پہلا فون/);}],
 ['pending call QR appears before signaling and is marked unusable until verified',()=>{const signal=fs.readFileSync('js/ezero_trusted_stage_signaling_v0_1.js','utf8');const one=fs.readFileSync('js/ezero_trusted_stage_one_request_v0_1.js','utf8');assert.ok(signal.indexOf('ezero:auto-invite-preview')<signal.indexOf('await connectSocket(session)'));assert.match(one,/ezero:auto-invite-preview/);assert.match(one,/copyBtn\.disabled=!ready/);assert.match(one,/ezero:auto-signal-error/);}],
 ['original advanced options are not deleted',()=>assert.match(js,/ezero-simple-more/)]
];
let failures=0;for(const [name,fn] of checks){try{fn();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
if(failures)process.exitCode=1;
