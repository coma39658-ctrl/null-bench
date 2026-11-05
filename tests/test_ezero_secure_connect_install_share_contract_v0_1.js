"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const page=fs.readFileSync("_ezero_secure_connect_lab_fixture_v0_1.html","utf8");
const install=fs.readFileSync("js/ezero_secure_connect_install_share_v0_1.js","utf8");
const manifest=JSON.parse(fs.readFileSync("secure-connect.webmanifest","utf8"));
const oldStudio=JSON.parse(fs.readFileSync("ai-studio.webmanifest","utf8"));
new vm.Script(install,{filename:"ezero_secure_connect_install_share_v0_1.js"});
assert.equal(manifest.name,"E-ZERO Secure Connect");
assert.equal(manifest.short_name,"E-ZERO Connect");
assert.equal(manifest.start_url,"./ezero_secure_connect_live_p2p_v0_1.html");
assert.equal(manifest.id,manifest.start_url,"Separate stable PWA identity");
assert.notEqual(manifest.id,oldStudio.id,"Secure Connect installs separately from existing AI Studio");
assert.equal(manifest.display,"standalone");
assert.deepEqual(manifest.icons.map(x=>x.sizes),["192x192","512x512"]);
assert.ok(manifest.icons.every(x=>fs.existsSync(x.src.replace("./",""))),"All manifest icon files actually exist");
assert.match(page,/<link rel="manifest" href="\.\/secure-connect\.webmanifest">/);
assert.match(page,/manifest-src 'self'/,"CSP explicitly allows the local PWA manifest");
assert.match(page,/id="shareConnectLink"/);
assert.match(page,/id="copyConnectLink"/);
assert.match(page,/id="installSecureConnect"/);
assert.match(page,/id="publicConnectLink"/);
assert.match(page,/id="installHelp"/);
assert.match(page,/id="installHelpText"/);
assert.match(page,/ezero_secure_connect_install_share_v0_1\.js/);
assert.match(page,/<meta property="og:title"/,"Messaging previews show app identity");
assert.match(page,/<meta property="og:url" content="https:\/\/coma39658-ctrl\.github\.io\/null-bench\/ezero_secure_connect_live_p2p_v0_1\.html"/);
assert.match(install,/window\.addEventListener\("beforeinstallprompt"/);
assert.match(install,/event\.preventDefault\(\)/);
assert.match(install,/window\.addEventListener\("appinstalled"/);
assert.match(install,/ev\.prompt\(\)/);
assert.match(install,/addEventListener\("click",\(\)=>\{/,"Prompts only after a user tap");
assert.match(install,/navigator\.share\(/);
assert.match(install,/navigator\.clipboard\?\.writeText/);
assert.match(install,/PUBLIC_URL=new URL\("\.\/ezero_secure_connect_live_p2p_v0_1\.html",location\.href\)\.href/);
assert.match(install,/url:PUBLIC_URL/);
assert.ok(!/MediaRecorder|fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|serviceWorker\.register/.test(install),
  "Install-and-share component stores no media, creates no backend or shared service worker");
for (const k of ["title","description","share","copy","install","androidHelp","iosHelp","initial","installed","helpPrivacy"])
  for (const lang of ["ur","en","ar"]) {
    const block=install.split("    "+lang+":{")[1]?.split(/    (?:ur|en|ar):\{|  };/)[0]||"";
    assert.match(block,new RegExp("\\b"+k+":"),"Missing "+lang+" "+k);
  }
console.log("PUBLIC_LINK_ANY_MESSENGER_AND_PWA_MANIFEST: CONTRACT_PASS");
console.log("USER_APPROVED_INSTALL_NO_FORCED_PROMPT_OR_PRIVATE_DATA_SHARE: CONTRACT_PASS");