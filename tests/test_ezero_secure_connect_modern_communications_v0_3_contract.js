"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const main=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const page=fs.readFileSync("ezero_secure_connect_communications_v0_3.html","utf8");
const modern=fs.readFileSync("js/ezero_secure_connect_modern_communications_v0_3.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_modern_communications_v0_3.css","utf8");
const cosmic=fs.readFileSync("assets/ezero_secure_chat_cosmic_pattern_v0_1.svg","utf8");
const transport=fs.readFileSync("js/ezero_secure_connect_live_p2p_v0_1.js","utf8");
const profile=fs.readFileSync("js/ezero_secure_connect_peer_profile_v0_1.js","utf8");
const chatComposer=fs.readFileSync("js/ezero_secure_connect_chat_composer_v0_1.js","utf8");
const people=fs.readFileSync("js/ezero_secure_connect_people_v0_1.js","utf8");
const policy=fs.readFileSync("ezero_secure_connect_privacy_v0_2.html","utf8");
for(const [label,c] of [["modern UI",modern],["voice transport",transport],["local peer profile",profile],["safe chat composer",chatComposer],["people and 10-minute history",people]])
  new vm.Script(c,{filename:label});
for(const mode of ["audio","video","voice","chat"]){
  assert.match(main,new RegExp('data-comm-mode="'+mode+'"'));
  assert.match(page,new RegExp('data-modern-select="'+mode+'"'));
}
assert.match(page,/ezero_secure_connect_live_p2p_v0_1\.js/);
assert.ok(page.includes("ezero_secure_connect_peer_profile_v0_1.js"));
assert.ok(page.includes("ezero_secure_connect_chat_composer_v0_1.js"));
for(const id of ["ezeroMessagesOpen","ezeroChatTimeline","ezeroChatPlus","ezeroChatTools",
 "ezeroChatVoiceOption","ezeroChatLinkOption","ezeroChatClearOption",
 "ezeroChatTextSlot","ezeroChatSendSlot"])
 assert.ok(page.includes('id="'+id+'"'),"Missing functional mobile messenger UI: "+id);
assert.ok(chatComposer.includes('append(label)')&&chatComposer.includes('append(send)'),
 "The original encrypted WebRTC send control must be reused, not cloned");
assert.ok(!chatComposer.includes("fetch(")&&!chatComposer.includes("new WebSocket"),
 "A chat interface must not silently create new data-sharing servers");
assert.ok(css.includes('prefers-reduced-motion:reduce'),
 "Verified status shine must respect user reduced-motion setting");
assert.ok(css.includes('#modernConnectionStatus[data-indicator="connected"]'),
 "Green shine is reserved for established connection");
assert.ok(css.includes('#modernConnectionStatus[data-indicator="error"]'),
 "Red is reserved for genuine connection problems");
assert.ok(chatComposer.includes('ezero:channel-state'),
 "Connected status must be driven by existing peer state, not fabricated");
assert.ok(page.includes("ezero_secure_connect_people_v0_1.js"));
for(const id of ["ezeroCameraButton","ezeroGalleryButton","ezeroCameraPhoto",
 "ezeroPeopleHub","ezeroTabFriends","ezeroTabCalls","ezeroTabMissed",
 "ezeroHistoryConsent","ezeroHistoryClear","ezeroPeopleList"])
 assert.ok(page.includes('id="'+id+'"'),"Missing modern profile/people control "+id);
assert.ok(page.includes('capture="user"'),"Mobile selfie camera is user-facing and opt-in");
assert.ok(page.includes('id="ezeroCameraPhoto"')&&page.includes('id="ezeroMyPhoto"'));
assert.ok(profile.includes('ezeroCameraPhoto")?.files')||
  profile.includes('$(inputId).files')||
  profile.includes('const input=$(inputId),file=input.files'),
  "User-selected photo must be read from an explicitly chosen file input");
assert.ok(profile.includes('"cameraPhoto"')||profile.includes('cameraPhoto:'),
 "Localized camera label is required");
assert.ok(profile.includes("ezeroCameraButton")&&profile.includes("ezeroGalleryButton"));
assert.ok(!people.includes("new WebSocket")&&!people.includes("fetch("),
 "Phone's call-history module must not contact a server");
assert.ok(people.includes("TEN_MINUTES=600000"),
 "Locally saved call metadata must expire after ten minutes");
assert.ok(people.includes("ended:Date.now()"),"Start expiry at actual hangup");
assert.ok(people.includes("ended<=now-TEN_MINUTES"),
 "Expired history must be rejected on reload");
assert.ok(people.includes('["incoming","outgoing"]'),
 "History must not claim unverified calls");
assert.ok(people.includes("noMissed"),"No false missed-call status");
assert.ok(modern.includes("ezero:call-intent"),"Track actual user-initiated call direction");
assert.ok(css.includes("accent-color:#16814a"),"Use professional green selection color");

assert.ok(css.includes(".ezero-person-card"),"High-quality contacts and calls must have structured cards");

for(const id of ["ezeroProfileEditor","ezeroMyName","ezeroMyPhoto",
    "ezeroShareProfile","ezeroSaveProfile","ezeroPeerProfileCard",
    "ezeroPeerSessionId","ezeroPeerAvatar","ezeroVerifiedConnection"])
  assert.ok(page.includes('id="'+id+'"'),"Profile UI missing: "+id);
assert.ok(profile.includes("ezero_secure_connect_local_profile_v0_1"),
  "Local profile must be stored separately from verified contacts");
assert.ok(profile.includes("ezero:profile-received"));
assert.ok(profile.includes("window.EZERO_PEER_PROFILE_TRANSPORT"));
assert.ok(profile.includes('share:p.share===true'));
assert.ok(profile.includes('localStorage.setItem(KEY'));
assert.ok(!profile.includes("fetch(") && !profile.includes("XMLHttpRequest") && !profile.includes("new WebSocket"),
  "No profile file uploads, remote logging or account API");
assert.ok(transport.includes('m.kind==="public-profile"'));
assert.ok(transport.includes('peer.__ezeroPeerFP'),"Never trust a profile self-asserted fingerprint");
assert.ok(transport.includes('peer?.connectionState==="connected"'));
assert.ok(transport.includes('channel.readyState==="open"'));
assert.ok(profile.includes('!profile.share||!profile.name'), "Never send local profile without explicit sharing permission and a name");

assert.ok(modern.includes('function inviteFailure(error)'));
assert.ok(modern.includes('async function encodeSignal(raw)'));
assert.ok(modern.includes('async function parseInviteLink(value)'));
assert.ok(modern.includes('new CompressionStream("gzip")'));
assert.ok(modern.includes('new DecompressionStream("gzip")'));
assert.ok(modern.includes('if(size>145000)throw Error("TOO_LARGE")'),
 "Decompression must bound expansion before allocating the output");
assert.ok(modern.includes('m[1]==="e2"'),"Compressed and legacy invite parsers must coexist");
assert.ok(modern.includes('if(!uri.hash)throw Error("MISSING_INVITE")'));
assert.ok(modern.includes('window.addEventListener("hashchange",receiveHash)'));
assert.ok(page.includes('id="ezeroCompleteLinkTip"'));
assert.ok(page.includes('id="ezeroLoadLink"') && page.includes('class="ezero-wizard-secondary" disabled'));
assert.ok(!page.includes('placeholder="https://…'),"Never show a fake real invitation");

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
assert.match(css,/#modernChatPanel::before/);
assert.ok(css.includes("ezero_secure_chat_cosmic_pattern_v0_1.svg"));
assert.match(css,/pointer-events:none/);
assert.ok(cosmic.includes('<svg xmlns="http://www.w3.org/2000/svg"'));
assert.match(cosmic,/cosmic trust and discovery pattern/);
assert.doesNotMatch(cosmic,/<script|<image|<foreignObject|https:\/\/|<animate/i,
  "Chat pattern must be local SVG artwork without scripts or external resources");
assert.match(page,/id="ezeroIncomingInvite"/);
assert.match(page,/id="ezeroPrepareInvite"/);
assert.match(page,/id="ezeroShareInvite"/);
assert.match(modern,/function parseInviteLink/);
assert.ok(modern.includes("location.hash.startsWith"));
assert.match(modern,/ezero:signal-ready/);
assert.ok(css.includes("#secureAdvanced{display:none!important}"));

assert.match(main,/id="nearbyFutureTitle"/);
assert.doesNotMatch(main,/id="nearbyFutureOpt"/);
assert.doesNotMatch(main,/ezero_secure_connect_nearby_preference_v0_1\.js/);
assert.doesNotMatch(modern,/\bfetch\(|\bWebSocket\b|localStorage|sessionStorage|indexedDB/);
assert.match(page,/data-modern="offlineTruth"/);
for(const phrase of ["وائس نوٹ کی یہ واضح مقامی ریکارڈنگ","explicitly initiated voice-note recording","التسجيل الصريح للرسالة الصوتية"])
  assert.ok(policy.includes(phrase),"Policy must disclose deliberate voice note recording in all three languages");
console.log("ORIGINAL_COSMIC_CHAT_MOTIFS_NO_TRACKING_OR_LEGACY_CODE_UI: PASS");
console.log("RESTORED_FOUR_PROMINENT_COMMUNICATION_TOOLS: PASS");
console.log("TESTED_WEBRTC_CORE_PRESERVED_AND_MANUAL_SIGNALING_DISCLOSED: PASS");
console.log("VOICE_NOTES_LOCAL_CONSENT_AND_SIZE_BOUNDED_P2P_ONLY: PASS");
console.log("FUTURE_OFFLINE_ONLY_NO_MOBILE_DATA_AUTO_PERMISSION: PASS");
console.log("THREE_LANGUAGE_VOICE_CALL_PRIVACY_ADDENDUM: PASS");
