"use strict";
/* E-ZERO unified PUBLIC entry regression.
 * All ordinary links converge on the same publicly deployed call page.
 * Already signed / in-progress original room invitations stay compatible.
 * No Internet, mobile/camera permissions, or privacy metadata required.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const root="https://coma39658-ctrl.github.io/null-bench/";
const current="ezero_trusted_friends_staging_20261106.html";
const old="ezero_secure_connect_one_request_lab_20261106.html";
const file=x=>fs.readFileSync(x,"utf8");
const homepage=file("index.html");
assert.equal(homepage.split('./'+old).length-1,0,
  "Homepage must not send one phone to old calling UI");
assert.equal(homepage.split('./'+current).length-1,6,
  "All six homepage calling entry links should use the same new UI");
for(const marker of ["ezeroSecureConnectVideoEntry",
 "ezeroSecureConnectAudioEntry","ezeroSecureConnectVoiceEntry",
 "ezeroSecureConnectQrEntry"]){
 const idx=homepage.indexOf('id="'+marker+'"');
 assert.ok(idx>=0&&homepage.slice(idx,idx+260).includes('./'+current),
   "Home panel link must open one unified call UI: "+marker);
}
assert.ok(homepage.includes("Dashboard")&&homepage.includes("AI Studio"),
  "Unrelated main-home features must remain untouched");
const beta=file(current);
assert.ok(beta.includes('id="ezeroQuickProfile"')&&
  beta.includes('id="ezeroHeaderAvatar"')&&
  beta.includes('id="ezeroHeaderInitial"')&&
  beta.includes('id="ezeroEvidencePanel"'),
  "Unified page needs top DP and optional evidence functionality");
assert.equal(beta.split('id="ezeroQuickProfile"').length-1,1,
  "Only one DP profile button, beside the top logo");
assert.ok(beta.indexOf('id="ezeroQuickProfile"')<beta.indexOf("<main>"),
  "DP must appear in top header");
for(const m of [
  'id="ezeroOneScanInvite"','id="ezeroAutoAccept"',
  'id="ezeroTrustedFriendsLab"','id="ezeroVoiceAllowDownload"',
  'id="ezeroTextAllowDownload"','id="ezeroEvidenceList"'
]){
 assert.ok(beta.includes(m), "Previously working feature must survive: "+m);
}
for(const [selector,oldRoute] of [
  ["ezeroQuickIdentity","./"+old],
  ["ezeroAddVerifiedFriend","./ezero_secure_connect_live_p2p_v0_1.html"],
  ["modernQrLink","./ezero_secure_connect_live_p2p_v0_1.html"]]){
 assert.ok(!beta.includes('id="'+selector+'" href="'+oldRoute+'"'),
   "No hidden second-page jump from beta: "+selector);
}
assert.ok(beta.includes('href="#ezeroOneJoinPanel" data-modern="qrLink"'),
  "QR and friends stays on the same new page");
assert.ok(beta.includes('wss://ezero-trusted-friends-inbox-staging.coma39658.workers.dev'),
  "Stage-only explicitly authenticated inbox endpoint must still be allowed");
assert.ok(beta.includes('noindex,nofollow'),
  "Public beta must remain opt-in, not search-index promoted");
const oldPage=file(old);
assert.ok(oldPage.includes("ezero_secure_connect_public_unified_entry_v0_1.js")&&
  oldPage.includes('href="./'+current+'"'),
  "Old live page provides a route to the new app without losing existing invites");
assert.ok(file("ezero_secure_connect_preview_v0_1.html").includes(
  'href="./'+current+'" id="ezeroRealTwoPhoneTest"'));
const installed=JSON.parse(file("secure-connect.webmanifest"));
const oldAppId="./ezero_secure_connect_live_p2p_v0_1.html";
assert.equal(installed.id,oldAppId,"Preserve installed PWA identity");
assert.equal(installed.start_url,"./"+current);
assert.equal(installed.shortcuts[0].url,"./"+current);
const betaApp=JSON.parse(file("secure-connect-staging.webmanifest"));
assert.equal(betaApp.start_url,"./"+current);
assert.equal(betaApp.id,"./"+current,
  "Do not abandon previously installed beta PWA");
assert.ok(file("js/ezero_secure_connect_install_share_staging_v0_1.js")
  .includes('PUBLIC_URL=new URL("./'+current+'"'));
assert.ok(file("js/ezero_secure_connect_install_share_v0_1.js")
  .includes('PUBLIC_URL=new URL("./'+current+'"'));
function execute(path,url){
  const redirectScript=file(path),redirects=[];
  const parsed=new URL(url);
  const location={href:url,hash:parsed.hash,search:parsed.search,
    pathname:parsed.pathname,replace:v=>redirects.push(v)};
  vm.runInNewContext(redirectScript,{location,URL},{
    timeout:1000,filename:path});
  return redirects;
}
const direct="js/ezero_secure_connect_public_unified_entry_v0_1.js";
assert.deepEqual(execute(direct,root+old),[root+current]);
assert.deepEqual(execute(direct,root+old+"?mode=video"),
 [root+current+"?mode=video"]);
for(const suffix of ["?mode=video#room="+ "A".repeat(32)+"."+"B".repeat(43),
 "#e2=abc123","?mode=audio#room=unknown","#foobar","?untrusted=1"]){
 assert.equal(execute(direct,root+old+suffix).length,0,
   "Live signed/deep-link or unknown parameter must stay on old page");
}
assert.deepEqual(execute(direct,"https://example.com/null-bench/"+old),[],
 "No redirect on non-owner websites");
assert.deepEqual(execute(direct,"http://127.0.0.1:8769/"+old),[],
 "Do not alter local browser regression tests");
const shortEntry="js/ezero_secure_connect_short_link_v0_2.js";
const signedRoom="#room="+"A".repeat(32)+"."+"B".repeat(43);
assert.deepEqual(execute(shortEntry,root+"c.html"),[root+current]);
assert.deepEqual(execute(shortEntry,root+"c.html?mode=audio"+signedRoom),
 [root+old+"?mode=audio"+signedRoom],
 "Old c.html signed room must retain its ORIGINAL compatible call engine");
assert.deepEqual(execute(shortEntry,root+"c.html#i=abc"),
 [root+"ezero_secure_connect_live_p2p_v0_1.html#i=abc"],
 "Legacy identity QR must still be verified by its old identity screen");
const oldEntry="js/ezero_secure_connect_public_entry_redirect_v0_1.js";
const qrOld="ezero_secure_connect_live_p2p_v0_1.html";
const oldRoom="#room="+"A".repeat(32)+"."+"B".repeat(43);
assert.deepEqual(execute(oldEntry,root+qrOld),[root+current]);
assert.deepEqual(execute(oldEntry,root+qrOld+oldRoom),[root+old+oldRoom],
 "Previously issued signed rooms must keep original old WebRTC protocol page");
assert.deepEqual(execute(oldEntry,root+qrOld+"#i=trusted-identity"),[],
 "Legacy signed identity QR must keep working");
assert.deepEqual(execute(oldEntry,root+"ezero_secure_connect_communications_v0_3.html#e2=abc"),[],
 "Previously signed communication links must stay compatible");
console.log("E-ZERO UNIFIED_PUBLIC_HOMEPAGE_SIX_ENTRIES: PASS");
console.log("E-ZERO SINGLE_BETA_DP_AUDIO_VIDEO_VOICE_CHAT_EVIDENCE: PASS");
console.log("E-ZERO UNIFIED_PWA_AND_SHARE_LINKS_WITH_STABLE_IDENTITIES: PASS");
console.log("E-ZERO OLD_PUBLIC_BOOKMARK_REDIRECT_AND_SIGNED_ROOM_PRESERVATION: PASS");
console.log("E-ZERO NO_FALLBACK_TO_OBSOLETE_SECOND_PAGE_FROM_NEW_BETA: PASS");