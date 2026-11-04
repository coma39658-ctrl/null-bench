import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
const js=fs.readFileSync("js/ezero_secure_connect_call_doctor_v0_1.js","utf8");
const html=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_live_p2p_v0_1.css","utf8");
new vm.Script(js,{filename:"ezero_secure_connect_call_doctor_v0_1.js"});
assert.match(html,/js\/ezero_secure_connect_call_doctor_v0_1\.js/);
for(const id of ["callDoctor","doctorVersion","doctorRun","doctorStatus",
  "doctorChecks","doctorReport","doctorCopy","doctorCopyStatus"]){
 assert.ok(html.includes('id="'+id+'"'),"missing Call Doctor control "+id);
}
assert.match(js,/VERSION="EZERO-CALL-20261104-DOCTOR-V1"/);
assert.match(js,/data-doctor-i18n/);
assert.match(js,/window\.isSecureContext/);
assert.match(js,/RTCPeerConnection/);
assert.match(js,/navigator\.mediaDevices\?\.getUserMedia/);
assert.match(js,/navigator\.permissions\?\.query/);
assert.match(js,/navigator\.serviceWorker\?\.controller/);
assert.match(js,/navigator\.onLine/);
assert.match(js,/actuallyConnected/);
assert.match(js,/t\("noInternetGuarantee"\)/);
assert.match(css,/\.doctor-check\[data-type="block"\]/);
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket\s*\(|MediaRecorder|localStorage|sessionStorage|indexedDB/.test(js),
 "Call Doctor must never contact servers or persist sensitive information");
assert.ok(!/getUserMedia\s*\(|getDisplayMedia\s*\(|\.requestPermission\s*\(/.test(js),
 "Readiness test must NEVER activate microphone/camera or show permission prompt");
assert.ok(!/\b(?:friendIdInput|remoteSignal|localSignal|myDigitalId|roomLink|sendText|myFingerprint|peerFingerprint)\b/.test(js),
 "Report must not read identity, SDP, sensitive call links or messages");
assert.ok(!/navigator\.userAgent\s*\+|navigator\.geolocation/.test(js),
 "No exact user agent or location export");
console.log("READ_ONLY_NO_NETWORK_NO_MEDIA_PROMPT_NO_USER_SECRETS: PASS");
console.log("TWO_PHONE_VERSION_COMPARISON_AND_HONEST_CALL_STATUS: PASS");
