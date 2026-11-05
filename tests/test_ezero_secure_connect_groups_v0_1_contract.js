"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("ezero_secure_connect_communications_v0_3.html","utf8");
const js=fs.readFileSync("js/ezero_secure_connect_groups_v0_1.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_groups_v0_1.css","utf8");
new vm.Script(js,{filename:"group-v0.1"});
assert.ok(html.includes('src="./js/ezero_secure_connect_groups_v0_1.js'),"Load group module");
assert.ok(html.includes('href="./css/ezero_secure_connect_groups_v0_1.css'),"Load group CSS");
for(const id of ["ezeroGroupShortcut","ezeroGroupsHub","ezeroNewGroup",
  "ezeroGroupsList","ezeroGroupForm","ezeroGroupName","ezeroGroupContacts",
  "ezeroGroupSave","ezeroGroupView","ezeroGroupEdit","ezeroGroupDelete",
  "ezeroGroupAdminBadge","ezeroGroupAdminPolicy","ezeroGroupApproveJoins",
  "ezeroGroupAdminsEditOnly","ezeroGroupPromote","ezeroGroupViewTruth"]){
  assert.ok(html.includes('id="'+id+'"'),"Missing group element "+id);
}
for(const key of ["chat","voice","audio","video","promote"]){
  const id="ezeroGroup"+key[0].toUpperCase()+key.slice(1);
  assert.match(html,new RegExp('id="'+id+'"[^>]*disabled'),
    "Unverified group functionality cannot be enabled: "+id);
}
assert.ok(js.includes('ezero_secure_connect_local_fingerprints_v0_1'));
assert.ok(js.includes('FP.test(fp)&&available.has(fp)'),
  "Only previously verified saved fingerprints can become proposed members");
assert.ok(js.includes('window.confirm(t("confirm"))'),
  "Admin delete needs explicit confirmation");
assert.ok(js.includes('groups.map(x=>x.id===old.id?g:x)'),
  "Creator can edit selected member list");
assert.ok(js.includes('policy:{approveJoins:'),
  "Local role preferences are explicit draft metadata only");
assert.ok(js.includes('This is a draft on your device only'));
assert.ok(js.includes('no invitation was sent'));
for(const forbidden of ["new WebSocket(","fetch(","getUserMedia(","RTCPeerConnection(","navigator.contacts","navigator.share("]){
  assert.ok(!js.includes(forbidden),"Local group draft must not contact devices/network: "+forbidden);
}
assert.ok(css.includes(".ezero-group-admin-badge"));
assert.ok(css.includes(":disabled"));
console.log("PASS: E-ZERO group/local admin contract; live functions truthfully disabled.");
