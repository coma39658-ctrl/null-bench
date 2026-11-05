"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const page=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const redirect=fs.readFileSync("c.html","utf8");
const core=fs.readFileSync("js/ezero_secure_connect_public_qr_v0_2.js","utf8");
const invites=fs.readFileSync("js/ezero_secure_connect_remote_invite_v0_2.js","utf8");
const short=fs.readFileSync("js/ezero_secure_connect_short_link_v0_2.js","utf8");
const policy=fs.readFileSync("ezero_secure_connect_privacy_v0_2.html","utf8");
const manifest=JSON.parse(fs.readFileSync("secure-connect.webmanifest","utf8"));
for(const [path,script] of [["public QR",core],["remote",invites],["short link",short]])
  new vm.Script(script,{filename:path});
for(const id of ["oneTapStartButton","oneTapStage","oneTapQr","oneTapStop","scanVideo",
  "remoteInviteButton","incomingPanel","acceptInviteButton","declineInviteButton",
  "shareAppButton","installAppButton","fallbackShare","copyPreparedLink","language"]){
  assert.match(page,new RegExp('id="'+id+'"'),"Required new public control: "+id);
}
for(const old of ["chooseNearby","chooseRemote","guidedOffer","guidedIncoming",
  "remoteSignal","callSetup","expertSetup","nearCopyIdentity","pasteFriend",
  "createOffer","acceptOffer","applyAnswer"]){
  assert.doesNotMatch(page,new RegExp('id="'+old+'"'),"Legacy manual form must not be public: "+old);
}
assert.doesNotMatch(page,/ezero_secure_connect_live_p2p_v0_1\.js|ezero_secure_connect_simple_near_far_v0_1\.js/);
assert.doesNotMatch(page,/\.onload\s*=|<iframe|<script[^>]+src=["']https?:\/\//);
assert.match(page,/connect-src 'none'/);
assert.match(page,/ezero_secure_connect_public_qr_v0_2\.js/);
assert.match(page,/ezero_secure_connect_remote_invite_v0_2\.js/);
assert.match(page,/ezero_secure_connect_privacy_v0_2\.html/);
assert.match(core,/crypto\.subtle\.generateKey\(\{name:"ECDSA",namedCurve:"P-256"\},false/);
assert.match(core,/window\.EZERO_PUBLIC_QR_CORE=Object\.freeze/);
assert.match(core,/signBoundReply:signedRemoteReply/);
assert.match(core,/getUserMedia\(\{[\s\S]*?audio:false/);
assert.match(invites,/crypto\.subtle\.verify/);
assert.match(invites,/signBoundReply/);
assert.match(invites,/location\.hash/);
assert.match(invites,/history\.replaceState/);
assert.match(invites,/\(display-mode: standalone\)/);
assert.match(invites,/navigator\.standalone===true/);
assert.match(invites,/beforeinstallprompt/);
assert.match(invites,/appinstalled/);
assert.match(invites,/navigator\.share/);
assert.match(invites,/localStorage\.setItem/);
assert.doesNotMatch(core+invites,/\bfetch\(|\bWebSocket\b|\bRTCPeerConnection\b|\bMediaRecorder\b|navigator\.contacts|navigator\.mediaDevices\.getDisplayMedia/);
assert.match(redirect,/js\/ezero_secure_connect_short_link_v0_2\.js/);
assert.match(short,/destination\.hash=location\.hash/);
assert.match(short,/location\.replace\(destination\.href\)/);
assert.equal(manifest.start_url,"./ezero_secure_connect_one_request_lab_20261106.html");
assert.equal(manifest.id,"./ezero_secure_connect_live_p2p_v0_1.html","Stable installed-app identity retained after single-page public upgrade");
assert.equal(manifest.scope,"./");
assert.deepEqual(manifest.launch_handler,{client_mode:"navigate-existing"});
assert.match(policy,/ذاتی ڈیٹا فروخت|نجی ڈیٹا فروخت|ڈیٹا فروخت/);
assert.match(policy,/اشتہار/);
assert.match(policy,/ریکارڈ/);
assert.match(policy,/دوسرا شخص|دوسرے افراد/);
assert.match(policy,/localStorage/);
assert.match(policy,/Facebook Messenger/);
console.log("PUBLIC_QR_ONLY_NO_OLD_MANUAL_COPY_PASTE_UI: CONTRACT_PASS");
console.log("SIGNED_EPHEMERAL_QR_AND_PRIVATE_KEY_BOUND_REPLY: CONTRACT_PASS");
console.log("UNIVERSAL_PUBLIC_SHORT_LINK_AND_CONSENT_REPLY: CONTRACT_PASS");
console.log("PWA_STANDALONE_NO_REINSTALL_CONTROL: CONTRACT_PASS");
console.log("NO_AD_SDK_NO_CALL_NO_RECORDING_AND_TRUTHFUL_PRIVACY_POLICY: CONTRACT_PASS");
