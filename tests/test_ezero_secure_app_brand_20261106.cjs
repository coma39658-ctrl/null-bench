/* Public branding must never migrate an installed app ID or break QR links.
 * All checks use production files, not a copied fixture.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=filename=>fs.readFileSync(filename,"utf8");
const primary=path("ezero_trusted_friends_staging_20261106.html");
const home=path("index.html");
const share=path("js/ezero_secure_connect_install_share_staging_v0_1.js");
const modernCallShare=path("js/ezero_secure_connect_modern_evidence_stage_v0_1.js");
const legacyCallShare=path("js/ezero_secure_connect_modern_communications_v0_3.js");
const staging=JSON.parse(path("secure-connect-staging.webmanifest"));
const existing=JSON.parse(path("secure-connect.webmanifest"));
for(const m of [staging,existing]){
  assert.equal(m.name,"E-ZERO Secure App");
  assert.equal(m.short_name,"E-ZERO Secure App");
  assert.equal(m.display,"standalone");
  assert.equal(m.start_url,"./ezero_trusted_friends_staging_20261106.html");
  assert.equal(m.scope,"./");
  assert.ok(m.icons.some(i=>i.sizes==="192x192"));
  assert.ok(m.icons.some(i=>i.sizes==="512x512"));
}
assert.equal(staging.id,"./ezero_trusted_friends_staging_20261106.html");
assert.equal(existing.id,"./ezero_secure_connect_live_p2p_v0_1.html");
assert.match(primary,/<title>E-ZERO Secure App — Audio, Video & Friends<\/title>/);
assert.match(primary,/<strong class="logo">E-ZERO <span>Secure App<\/span><\/strong>/);
assert.match(primary,/content="E-ZERO Secure App"/);
assert.match(primary,/href="\.\/secure-connect-staging\.webmanifest"/);
assert.match(primary,/href="https:\/\/coma39658-ctrl\.github\.io\/null-bench\/ezero_trusted_friends_staging_20261106\.html"/);
assert.match(home,/>📞 Secure App<\/a>/);
assert.match(share,/title:"E-ZERO Secure App"/);
for(const source of [modernCallShare,legacyCallShare]){
  assert.ok(source.includes('await navigator.share({title:"E-ZERO Secure App — private call",url:preparedShare});'),
    "Native call invitation keeps its URL, changes display name only");

}
assert.match(share,/E-ZERO Secure App کا عوامی لنک/);
assert.match(share,/E-ZERO Secure App public link/);
assert.match(share,/الرابط العام لـ E-ZERO Secure App/);
assert.match(primary,/E-ZERO Secure App — محفوظ دوست اور کالز/);
for(const required of [
  "js/ezero_saved_friend_stage_engine_v0_1.js",
  "js/ezero_secure_connect_device_identity_v0_1.js",
  "js/ezero_trusted_stage_signaling_v0_1.js",
  "js/ezero_contact_first_call_dock_v0_1.js",
  "js/ezero_immersive_video_call_v0_1.js"
]){
 assert.ok(primary.includes(required),"Missing previously working call module: "+required);
}
assert.equal((primary.match(/<link rel="manifest"/g)||[]).length,1);
console.log("SECURE_APP_BRAND_AND_STABLE_PWA_ID: PASS");
console.log("SIGNED_CALL_FILES_AND_PUBLIC_DEEP_LINK_UNCHANGED: PASS");
