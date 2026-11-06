"use strict";
/* Isolated staging page wiring gate. No public HTML, Worker or deployed
 * Cloudflare config may be affected by changes to this page.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const read=path=>fs.readFileSync(path,"utf8");
const page=read("ezero_trusted_friends_staging_20261106.html");
const publicPage=read("ezero_secure_connect_one_request_lab_20261106.html");
const signaling=read("js/ezero_trusted_stage_signaling_v0_1.js");
const stageQr=read("js/ezero_trusted_stage_one_request_v0_1.js");
const engine=read("js/ezero_saved_friend_stage_engine_v0_1.js");
const people=read("js/ezero_saved_friend_stage_people_v0_1.js");
const store=read("js/ezero_secure_connect_device_identity_v0_1.js");
const config=read("js/ezero_trusted_inbox_stage_config_20261106.js");
const front=read("js/ezero_trusted_friends_controls_candidate_v0_1.js");
const backend=read("signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js");
const client=read("js/ezero_trusted_friend_foreground_client_candidate_v0_1.js");

for(const code of [signaling,stageQr,engine,people,store,config,front,client])
  assert.doesNotThrow(()=>new vm.Script(code),"staging JS must parse");
for(const id of ["ezeroUnifiedCard","ezeroOneJoinPanel","ezeroAutoPilot",
  "ezeroOneQrBox","ezeroOneQr","ezeroPeopleHub","ezeroPeopleList",
  "ezeroFriendSavePanel","ezeroSaveConnectedFriend","ezeroFriendSaveName",
  "ezeroFriendSaveStatus","ezeroTrustedFriendsLab"]){
  assert.equal(page.split('id="'+id+'"').length,2,"one unique staged #"+id);
}
assert.match(page,/<meta name="robots" content="noindex,nofollow">/);
assert.match(page,/ezero_secure_connect_device_identity_v0_1\.js/);
assert.match(page,/ezero_saved_friend_stage_engine_v0_1\.js/);
assert.match(page,/ezero_saved_friend_stage_people_v0_1\.js/);
assert.match(page,/ezero_trusted_stage_signaling_v0_1\.js/);
assert.match(page,/ezero_trusted_stage_one_request_v0_1\.js/);
assert.match(page,/ezero_trusted_friend_foreground_client_candidate_v0_1\.js/);
assert.match(page,/ezero_trusted_friends_controls_candidate_v0_1\.js/);
assert.ok(page.indexOf("ezero_secure_connect_device_identity_v0_1.js")<
          page.indexOf("ezero_saved_friend_stage_engine_v0_1.js"));
assert.ok(page.indexOf("ezero_auto_signaling_lab_config_20261106.js")<
          page.indexOf("ezero_trusted_stage_signaling_v0_1.js"));
assert.ok(page.indexOf("ezero_trusted_inbox_stage_config_20261106.js")<
          page.indexOf("ezero_trusted_friend_foreground_client_candidate_v0_1.js"));
assert.ok(page.indexOf("ezero_trusted_friend_foreground_client_candidate_v0_1.js")<
          page.indexOf("ezero_trusted_friends_controls_candidate_v0_1.js"));
assert.match(store,/extractable===false/);
assert.match(engine,/saveAfterConsent/);
assert.match(people,/saveAfterConsent\(\)/);
assert.match(people,/transport\.peerFingerprint\(\)!==fp/);
assert.match(config,/enabled:false/);
assert.match(config,/websocketOrigin:""/);
assert.match(page,/id="ezeroTrustedFriendsLab"[^>]*hidden/);
assert.match(signaling,/ezero_trusted_friends_staging_20261106\.html/);
assert.match(stageQr,/url\.pathname\.endsWith\("\/ezero_trusted_friends_staging_20261106\.html"\)/);
assert.match(client,/const CALL_PAGE="\/null-bench\/ezero_trusted_friends_staging_20261106\.html"/);
assert.match(backend,/const INVITE_PATH="\/null-bench\/ezero_trusted_friends_staging_20261106\.html"/);
assert.ok(!publicPage.includes("ezeroTrustedFriendsLab"));
assert.ok(!publicPage.includes("ezero_secure_connect_device_identity_v0_1.js"));
assert.match(publicPage,/ezero_one_request_lab_20261106\.js\?v=20261106qrrepair1/);
assert.match(read("js/ezero_auto_signaling_config_v0_1.js"),/enabled:false/);
assert.ok(!read("signaling/cloudflare/wrangler.jsonc").includes("TrustedInbox"));
// Staging can reuse the existing account identifier, but never reuses the
// general Cloudflare API token instead of its dedicated scoped staging token.
const deploy=read(".github/workflows/ezero_trusted_inbox_staging_manual_20261106.yml");
assert.equal(deploy.split("secrets.EZERO_TRUSTED_CF_ACCOUNT_ID || secrets.CLOUDFLARE_ACCOUNT_ID").length-1,2,
  "both isolated staging steps must support the existing account ID");
assert.equal(deploy.split("secrets.EZERO_TRUSTED_CF_API_TOKEN").length-1,2,
  "dedicated Trusted Friends API token is always required");
assert.ok(!deploy.includes("secrets.CLOUDFLARE_API_TOKEN"),
  "never fall back to a shared Cloudflare deployment token");
assert.ok(deploy.includes("github.ref_name == 'ezero-trusted-friend-inbox-lab-20261106'"),
  "manual deployment must remain restricted to the isolated staging branch");
console.log("PASS: staging-only consented identity, QR same-page invite, client/server alignment, production isolation");
