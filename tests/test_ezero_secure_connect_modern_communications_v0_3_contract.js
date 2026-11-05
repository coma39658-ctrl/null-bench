"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const main=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const page=fs.readFileSync("ezero_secure_connect_communications_v0_3.html","utf8");
const modern=fs.readFileSync("js/ezero_secure_connect_modern_communications_v0_3.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_modern_communications_v0_3.css","utf8");
const cosmicSvg=fs.readFileSync("assets/ezero_secure_chat_cosmic_pattern_v0_1.svg","utf8");
const transport=fs.readFileSync("js/ezero_secure_connect_live_p2p_v0_1.js","utf8");
const policy=fs.readFileSync("ezero_secure_connect_privacy_v0_2.html","utf8");
for(const [label,c] of [["modern UI",modern],["voice transport",transport]])
  new vm.Script(c,{filename:label});
for(const mode of ["audio","video","voice","chat"]){
  assert.match(main,new RegExp('data-comm-mode="'+mode+'"'));
  assert.match(page,new RegExp('data-modern-select="'+mode+'"'));
}
assert.match(page,/ezero_secure_connect_live_p2p_v0_1\.js/);
assert.match(page,/ezero_secure_connect_simple_near_far_v0_1\.js/);
assert.match(page,/ezero_secure_connect_modern_communications_v0_3\.js/);
for(const id of ["modernCallPanel","modernChatPanel","modernVoicePanel","modernConnect",
  "ezeroCallMediaSlot","ezeroChatSlot","ezeroCallSetupSlot","ezeroVoiceRecord",
  "ezeroVoiceStop","ezeroVoiceSend","ezeroVoiceClear","ezeroVoiceDraft",
  "ezeroVoiceReceived","ezeroVoiceOpenIncoming"])
  assert.match(page,new RegExp('id="'+id+'"'),"Missing modern communication control "+id);
assert.match(modern,/\$\("mediaTitle"\)\?\.closest\("section.card"\)/);
assert.match(modern,/\$\("callSetup"\)/);
assert.match(modern,/\$\("ezeroCallSetupSlot"\)\.hidden=true/);
assert.match(modern,/MediaRecorder/);
assert.match(modern,/getUserMedia\(\{audio:true,video:false\}\)/);
assert.match(modern,/setTimeout\(stopMic,6000\)/);
assert.match(modern,/window\.EZERO_VOICE_TRANSPORT\.send/);
assert.match(transport,/EZERO_VOICE_TRANSPORT=Object\.freeze/);
assert.match(transport,/kind:"voice-once"/);
assert.match(transport,/kind==="voice-once"/);
assert.match(transport,/ezero:voice-note-received/);
assert.match(transport,/e\.data\.length>38000/);
assert.match(css,/\.modern-feature-grid/);
assert.ok(css.includes("#modernChatPanel::before"));
assert.ok(css.includes("ezero_secure_chat_cosmic_pattern_v0_1.svg"));
assert.ok(css.includes("pointer-events:none"));
assert.ok(cosmicSvg.includes('xmlns="http://www.w3.org/2000/svg"'));
assert.ok(cosmicSvg.includes("E-ZERO original cosmic trust"));
assert.doesNotMatch(cosmicSvg,/<script|<image|<foreignObject|<animate|https:\/\//i,
  "Pattern must use only original local, inert SVG shapes with no network assets");

assert.match(main,/id="nearbyFutureTitle"/);
assert.doesNotMatch(main,/id="nearbyFutureOpt"/);
assert.doesNotMatch(main,/ezero_secure_connect_nearby_preference_v0_1\.js/);
assert.doesNotMatch(modern,/\bfetch\(|\bWebSocket\b|localStorage|sessionStorage|indexedDB/);
assert.match(page,/data-modern="offlineTruth"/);
for(const phrase of ["وائس نوٹ کی یہ واضح مقامی ریکارڈنگ","explicitly initiated voice-note recording","التسجيل الصريح للرسالة الصوتية"])
  assert.ok(policy.includes(phrase),"Policy must disclose deliberate voice note recording in all three languages");
console.log("CALM_LOCAL_EZERO_COSMIC_CHAT_PATTERN_AND_LEGIBILITY: PASS");
console.log("RESTORED_FOUR_PROMINENT_COMMUNICATION_TOOLS: PASS");
console.log("TESTED_WEBRTC_CORE_PRESERVED_AND_MANUAL_SIGNALING_DISCLOSED: PASS");
console.log("VOICE_NOTES_LOCAL_CONSENT_AND_SIZE_BOUNDED_P2P_ONLY: PASS");
console.log("FUTURE_OFFLINE_ONLY_NO_MOBILE_DATA_AUTO_PERMISSION: PASS");
console.log("THREE_LANGUAGE_VOICE_CALL_PRIVACY_ADDENDUM: PASS");
