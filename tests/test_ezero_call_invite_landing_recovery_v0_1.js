"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const short=fs.readFileSync("js/ezero_secure_connect_short_link_v0_2.js","utf8");
const hub=fs.readFileSync("js/ezero_secure_connect_remote_invite_v0_2.js","utf8");
const main=fs.readFileSync("js/ezero_secure_connect_modern_communications_v0_3.js","utf8");
new vm.Script(short);
new vm.Script(hub);
new vm.Script(main);

// The static short link must route genuine signed SDP invites to the
// communications page; general identity invitations stay in the identity hub.
// The URL fragment is kept on the client and never sent to an analytics site.
const base="https://coma39658-ctrl.github.io/null-bench/c.html";
for(const [suffix,path] of [
  ["#e2=Abc_xyz-123","ezero_secure_connect_communications_v0_3.html"],
  ["#e=Abc_xyz-123","ezero_secure_connect_communications_v0_3.html"],
  ["#i=identity","ezero_secure_connect_live_p2p_v0_1.html"],
  ["#r=reply","ezero_secure_connect_live_p2p_v0_1.html"],
  ["","ezero_secure_connect_live_p2p_v0_1.html"]
]){
  const location={href:base+suffix,hash:suffix,search:"",replace(x){this.out=x;}};
  vm.runInNewContext(short,{location,URL},{timeout:1000});
  assert.equal(new URL(location.out).pathname.split("/").at(-1),path);
  assert.equal(new URL(location.out).hash,suffix);
}
assert.match(hub,/^  if\(\/\^#\(\?:e2\|e\)=/m,
  "The QR hub should recover preserved call fragments");
assert.match(hub,/location\.replace\(callPage\.href\)/);
assert.match(hub,/ezero_secure_connect_communications_v0_3\.html/);
assert.ok(hub.indexOf("location.replace(callPage.href)")<
   hub.indexOf("if(!core)return"),"Route before initializing unrelated identity UI");
assert.match(main,/ezeroAcceptInvite.*?addEventListener\("click"/,
  "Keep explicit receiver acceptance");
assert.match(main,/await showIncoming\(link\)/,
  "Opening call link must only show invitation, never turn on media");
console.log("SIGNED_CALL_INVITE_LANDING_RECOVERY_NO_AUTO_MEDIA: PASS");
