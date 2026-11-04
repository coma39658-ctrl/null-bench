"use strict";
const assert = require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const js=fs.readFileSync("js/ezero_secure_connect_live_p2p_v0_1.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_live_p2p_v0_1.css","utf8");
const vendor=fs.readFileSync("js/vendor/ezero-qrcode-generator-mit.js","utf8");
const simple=fs.readFileSync("js/ezero_secure_connect_simple_near_far_v0_1.js","utf8");
const contacts=fs.readFileSync("js/ezero_secure_connect_contacts_v0_1.js","utf8");
const preview=fs.readFileSync("ezero_secure_connect_preview_v0_1.html","utf8");
new vm.Script(js,{filename:"live_p2p.js"});
new vm.Script(vendor,{filename:"ezero_qrcode_generator_mit.js"});
new vm.Script(simple,{filename:"ezero_secure_connect_simple_near_far_v0_1.js"});
new vm.Script(contacts,{filename:"ezero_secure_connect_contacts_v0_1.js"});
assert.match(vendor,/Licensed under the MIT license/);
assert.match(preview,/id="ezeroRealTwoPhoneTest"[^>]*href|href="\.\/ezero_secure_connect_live_p2p_v0_1\.html" id="ezeroRealTwoPhoneTest"/);
assert.match(html,/content="default-src 'none'; script-src 'self'/);
assert.match(html,/connect-src 'self'/);
assert.ok(!/https?:\/\//.test(html),"No remote origins injected in HTML");
assert.match(html,/ezero-qrcode-generator-mit\.js/);
assert.match(html,/id="language"/);
for(const lang of ["ur","en","ar"]) assert.match(html,new RegExp('value="'+lang+'"'));
for(const action of ["createOffer","acceptOffer","applyAnswer","copySignal","shareSignal","hangup","sendMessage","viewMessage","openPolicy","closePolicy","scanQR","stopScan","verifyFriend","copyIdentity"]){
  assert.match(html,new RegExp('id="'+action+'"'),action+" present");
}
assert.match(html,/id="callDiagnostic"/);
assert.match(html,/data-i18n="diagStart"/);
assert.match(js,/p\.oniceconnectionstatechange/);
assert.match(js,/iceConnectionState==="failed"\) status\("iceNoRoute"\)/);
assert.match(js,/p\.connectionState==="failed"\) status\("iceNoRoute"\)/);
assert.match(js,/CustomEvent\("ezero:call-status"/);
assert.match(js,/status\("offerReady"/);
assert.match(js,/status\("answerReady"/);
assert.match(simple,/addEventListener\("ezero:call-status"/);
assert.match(js,/missingOffer/);
assert.match(js,/fingerprintMismatch/);
for(const id of ["qrScanStatus","contactsTitle","friendDisplayName","saveVerifiedFriend","friendSearch","friendsList","friendsStatus"]){
  assert.match(html,new RegExp('id="'+id+'"'),"Visible QR diagnostics and friend list control "+id);
}
assert.match(html,/ezero_secure_connect_contacts_v0_1\.js/);
assert.match(js,/scanDeadlineTimer=setTimeout/);
assert.match(js,/\},20000\)/,"Bounded 20-second QR scanner");
assert.match(js,/function scanMessage\(/);
assert.match(js,/qrScannedOk/);
assert.match(js,/qrSignatureBad/);
assert.match(js,/qrCameraDenied/);
assert.match(js,/qrNotFound/);
assert.match(js,/qrWrongType/);
assert.match(js,/ezero:friend-verification/);
assert.match(contacts,/ezero:friend-verification/);
assert.match(contacts,/verifiedCandidate=e\.ok===true && e\.signed===true/);
assert.match(contacts,/localStorage\.setItem/);
assert.match(contacts,/name:x\.name,fp:x\.fp/);
assert.match(contacts,/MAX_CONTACTS=50/);
assert.match(contacts,/textContent=text/);
assert.ok(!/\b(fetch|XMLHttpRequest|WebSocket|MediaRecorder|navigator\.contacts)\b/.test(contacts),
  "Contacts feature never uploads identity or records a call");
assert.match(html,/id="myQr"/);
for(const id of ["chooseNearby","chooseRemote","nearbyPanel","remotePanel","shareIdentity",
   "nearCopyIdentity","pasteFriend","callSetup","guidedOffer","guidedShare",
   "guidedCopy","guidedIncoming","guidedContinue","guidedStatus","expertSetup"]) {
  assert.match(html,new RegExp('id="'+id+'"'),id+" required for simplified public flow");
}
assert.match(html,/<details id="callSetup"/);
assert.match(html,/<details id="expertSetup"/);
assert.match(simple,/navigator\.share/,"Native messaging share requires user gesture");
assert.match(simple,/navigator\.clipboard\.readText/,"Paste requires explicit tap");
assert.match(simple,/signal\.type==="offer"/,"Invite and reply identified without technical user choice");
assert.match(simple,/\$\("applyAnswer"\)\.click\(\)/,"The guided fallback applies verified answer to existing core logic");
assert.ok(!/fetch\(|XMLHttpRequest|WebSocket|MediaRecorder|localStorage|sessionStorage|indexedDB/.test(simple),
  "Simplifying pairing does not add a tracking, storage or signaling backend");
assert.match(html,/id="myDigitalId"/);
assert.match(html,/id="myFingerprint"/);
assert.match(html,/id="peerFingerprint"/);
assert.match(html,/id="identityPeerStatus"/);
assert.match(html,/data-i18n="policy1"/);
assert.match(html,/data-i18n="policy7"/);
assert.match(html,/data-i18n="policy6"/);
assert.match(js,/RTCPeerConnection/);
assert.match(js,/createOffer\(\)/);
assert.match(js,/createAnswer\(\)/);
assert.match(js,/setRemoteDescription/);
assert.match(js,/getUserMedia\(/);
assert.match(js,/createDataChannel\("ezero-ephemeral"/);
assert.match(js,/crypto\.subtle\.generateKey\(\{name:"ECDSA",namedCurve:"P-256"\},false/);
assert.match(js,/crypto\.subtle\.verify\(\{name:"ECDSA",hash:"SHA-256"\}/);
assert.match(js,/crypto\.subtle\.digest\("SHA-256"/);
assert.match(js,/BarcodeDetector/);
assert.match(js,/facingMode:\{ideal:"environment"\}/);
assert.match(js,/expectedPeerFingerprint!==s\.fp/);
assert.match(js,/expectedPeerFingerprint!==s\.fp/);
assert.match(js,/Date\.now\(\)\+300000/);
assert.match(js,/unreadExpiry=setTimeout\(discardIncoming,600000\)/);
assert.match(js,/localStream\.getTracks\(\)\.forEach\(x=>x\.stop\(\)\)/);
assert.match(js,/window\.addEventListener\("pagehide"/);
assert.ok(!/\bMediaRecorder\b|\bfetch\(|\bXMLHttpRequest\b|\bWebSocket\b|\bindexedDB\b|\blocalStorage\b|\bsessionStorage\b/.test(js),
  "No recording, app upload/signaling backend or persistent message storage");
assert.ok(!/navigator\.mediaDevices\.getUserMedia\(/.test(js.slice(0,js.indexOf('$("scanQR").addEventListener'))),
  "Camera requests do not run in setup function outside explicit click handler");
const keys=[...new Set([...html.matchAll(/data-i18n="([a-zA-Z0-9]+)"/g)].map(x=>x[1]))];
const en=js.split('    en: {')[1]?.split('    ar: {')[0]||"";
const ar=js.split('    ar: {')[1]?.split('\n    }\n  };')[0]||"";
for(const key of keys) {
  assert.match(en,new RegExp('\\b'+key+':'),"English missing "+key);
  assert.match(ar,new RegExp('\\b'+key+':'),"Arabic missing "+key);
}
assert.match(css,/@media\(max-width:520px\)/);
assert.match(css,/\.qr-layout/);
assert.match(css,/\.scan-video\[hidden\]/);
console.log("SHA256_SIGNED_SESSION_QR_AND_EXPLICIT_SCAN: CONTRACT_PASS");
console.log("REAL_MANUAL_WEBRTC_VIDEO_AUDIO_AND_DATA_CHANNEL: CONTRACT_PASS");
console.log("NO_AUTOMATIC_MIC_CAMERA_OR_SESSION_RECORDING: CONTRACT_PASS");
console.log("TRILINGUAL_ALL_PAGE_STATIC_LABELS: CONTRACT_PASS");
console.log("USER_CONSENT_CLEAR_PRIVACY_AND_FIVE_MINUTE_MESSAGE: CONTRACT_PASS");
console.log("SIMPLE_NEAR_QR_FAR_MESSAGE_UI_AND_SMART_OFFER_ANSWER: CONTRACT_PASS");
console.log("CALL_CONNECTION_DIAGNOSIS_BY_REAL_ICE_STATE: CONTRACT_PASS");
console.log("QR_SIGNED_SUCCESS_FAILURE_CAMERA_TIMEOUT_AND_LOCAL_NAME_SHA256_LIST: CONTRACT_PASS");
