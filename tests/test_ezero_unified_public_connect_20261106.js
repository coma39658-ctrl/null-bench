"use strict";
/* Static release gate for one public green call view, not physical-phone proof. */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const read=p=>fs.readFileSync(p,"utf8");
const page=read("ezero_secure_connect_one_request_lab_20261106.html");
const css=read("css/ezero_one_request_lab_20261106.css");
const updatedPage=read("ezero_trusted_friends_staging_20261106.html");
const router=read("js/ezero_secure_connect_short_link_v0_2.js");
const legacy=read("js/ezero_secure_connect_public_entry_redirect_v0_1.js");
const callJs=read("js/ezero_one_request_lab_20261106.js");
const manifest=JSON.parse(read("secure-connect.webmanifest"));
for(const code of [router,legacy,callJs])new vm.Script(code);
const unique=["ezeroUnifiedCard","ezeroOneJoinPanel","ezeroOneScanInvite",
 "ezeroAutoAccept","ezeroAutoDecline","ezeroAutoPilot",
 "ezeroOneQrBox","ezeroOneQr","modernConnectionStatus","modernCallPanel",
 "ezeroOneIncomingShell","ezeroOneCallProgress","modernHangup",
 "ezeroQuickProfile","ezeroMyName","myFingerprint","scanQR","oneTapPanel"];
for(const id of unique){
 assert.equal(page.split('id="'+id+'"').length,2,"Missing or duplicate #"+id);
}
for(const id of ["ezeroUnifiedCard","ezeroOneJoinPanel","ezeroOneScanInvite",
 "ezeroAutoAccept","ezeroTrustedFriendsLab","ezeroQuickProfile",
 "ezeroHeaderAvatar","ezeroEvidencePanel","ezeroEvidenceList"]){
 assert.equal(updatedPage.split('id="'+id+'"').length,2,
  "Missing or duplicate new unified public beta #"+id);
}
assert.ok(updatedPage.indexOf('id="ezeroQuickProfile"')<updatedPage.indexOf("<main>"),
 "Public beta profile DP must be at top of the screen");
assert.match(updatedPage,/<meta name="robots" content="noindex,nofollow">/,
 "Public beta remains an opt-in test; physical two-phone success not assumed");
assert.ok(page.indexOf('id="ezeroUnifiedCard"')<page.indexOf('id="ezeroOneJoinPanel"'));
assert.ok(page.indexOf('id="ezeroUnifiedCard"')<page.indexOf('id="ezeroAutoPilot"'));
assert.ok(page.indexOf('id="ezeroUnifiedCard"')<page.indexOf('id="modernCallPanel"'));
assert.ok(page.indexOf('id="modernCallPanel"')<page.indexOf('class="ezero-unified-disclaimer"'));
assert.match(css,/#secureAdvanced,\s*\.communication-page\.ezero-one-lab #ezeroCallSetupSlot/);
assert.match(css,/#oneTapPanel,\s*\.communication-page\.ezero-one-lab #secureAdvanced/);
assert.match(css,/#ezeroOneIncomingShell\[hidden\]\{\s*display:none!important/);
assert.match(css,/#ezeroOneQrBox/);
assert.match(page,/<meta name="robots" content="index,follow">/);
assert.match(page,/src="\.\/js\/ezero_one_request_lab_20261106\.js\?v=20261106qrrepair1"/);
assert.equal(manifest.start_url,"./ezero_trusted_friends_staging_20261106.html");
assert.equal(manifest.shortcuts[0].url,manifest.start_url);
assert.equal(manifest.id,"./ezero_secure_connect_live_p2p_v0_1.html",
 "Previous installed app identity must remain stable");
assert.match(router,/identity\?/);
assert.match(router,/ezero_secure_connect_one_request_lab_20261106\.html/);
assert.match(router,/ezero_trusted_friends_staging_20261106\.html/);
assert.match(legacy,/ezero_secure_connect_one_request_lab_20261106\.html/);
assert.match(legacy,/ezero_trusted_friends_staging_20261106\.html/);

function routeCode(source,pathname,hash,search=""){
 const original="https://coma39658-ctrl.github.io/null-bench/"+pathname+search+hash;
 const next=[];
 const location={href:original,pathname,hash,search,replace(v){next.push(v);}};
 vm.runInNewContext(source,{location,URL},{timeout:1000});
 return next[0]||"";
}
for(const route of ["c.html","ezero_secure_connect_live_p2p_v0_1.html",
 "ezero_secure_connect_communications_v0_3.html"]){
 const code=route==="c.html"?router:legacy;
 const result=routeCode(code,route,"");
 assert.ok(result.includes("/ezero_trusted_friends_staging_20261106.html"),
 "All ordinary entries must converge on ONE updated public beta page: "+route);
}
const room="#room="+"a".repeat(32)+"."+"b".repeat(43);
const result=routeCode(router,"c.html",room,"?mode=audio");
assert.match(result,/\/ezero_secure_connect_one_request_lab_20261106\.html\?mode=audio#room=/);
assert.ok(result.endsWith(room),"Private capability must stay in URL fragment");
assert.equal(routeCode(legacy,"ezero_secure_connect_live_p2p_v0_1.html","#i=abc"),"",
 "Legacy identity QR must stay compatible when explicitly requested");
const signedIdentity="#i="+"a".repeat(32)+"~EZERO1.public.fingerprint.nonce.expiry.signature";
assert.match(routeCode(router,"c.html",signedIdentity),/ezero_secure_connect_live_p2p_v0_1\.html/,
 "Short links for existing dot/tilde-signed identity invites must not open the call-QR scanner");
assert.equal(routeCode(legacy,"ezero_secure_connect_live_p2p_v0_1.html",signedIdentity),"",
 "Explicit legacy signed identity invitations should retain their QR verification page");
assert.equal(routeCode(legacy,"ezero_secure_connect_communications_v0_3.html","#e=abc"),"",
 "Legacy signed manual invite must stay compatible when explicitly requested");
assert.equal(routeCode(legacy,"ezero_secure_connect_communications_v0_3.html",
 "#s="+"a".repeat(22)+"."+"b".repeat(43)),"",
 "Private encrypted short link must keep its existing legacy parser");
for(const name of ["ezero_secure_connect_live_p2p_v0_1.html",
 "ezero_secure_connect_communications_v0_3.html"]){
 assert.match(read(name),/ezero_secure_connect_public_entry_redirect_v0_1\.js/);
}
const index=read("index.html");
for(const name of ["ezeroSecureConnectVideoEntry","ezeroSecureConnectAudioEntry",
 "ezeroSecureConnectVoiceEntry","ezeroSecureConnectQrEntry"]){
 assert.match(index,new RegExp('id="'+name+'" href="\\./ezero_trusted_friends_staging_20261106\\.html"'));
}
assert.match(callJs,/if\(back\)\{back\.href="\.\/index\.html"/);
assert.match(callJs,/const auto=\$\("ezeroAutoPilot"\)/);
assert.match(callJs,/window\.EZERO_PEER_PROFILE_TRANSPORT\?\.connected\(\)===true/);
console.log("ONE_GREEN_PUBLIC_CARD_UNIQUE_ANSWERS_AND_NO_DUPLICATE_QR: PASS");
console.log("SHARED_SHORT_LINK_LEGACY_ROUTES_APP_INSTALL_MAIN_PAGE: PASS");
console.log("ONE_TAP_ACCEPT_STATE_VERIFIED_CONNECTION_NOT_FAKE: PASS");
