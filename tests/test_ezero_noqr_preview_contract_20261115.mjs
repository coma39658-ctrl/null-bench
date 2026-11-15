/* Read-only, offline, same-origin staging-path contract. No cloud calls. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
const root=process.cwd();
const directory="noqr-preview-20261115";
const file=directory+"/ezero_trusted_friends_staging_20261106.html";
const html=fs.readFileSync(path.join(root,file),"utf8");
const previewPath="/null-bench/"+file;
const expected="https://coma39658-ctrl.github.io"+previewPath;
assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
assert.ok(html.includes(expected),"Preview metadata must contain distinct URL");
assert.ok(html.includes("base-uri 'none'"),"Keep strict CSP");
assert.ok(!html.includes('<base '),"No base element may change origin");
const assets=[...html.matchAll(/(?:src|href)="((?:\.\.\/|\.\/)[^"]+)"/g)].map(m=>m[1]);
assert.ok(assets.length>=25,"Expected scripts and shared CSS/assets");
for(const raw of assets){
  if(raw.startsWith("./#")||raw.includes("#")) continue;
  const target=raw.split("?")[0];
  const resolved=path.resolve(root,directory,target);
  assert.ok(resolved.startsWith(root+path.sep),"Preview may not escape repo");
  assert.ok(fs.existsSync(resolved),"Missing preview asset: "+raw);
}
for(const name of ["ezero_trusted_stage_one_request_v0_1.js",
 "ezero_trusted_friends_controls_candidate_v0_1.js",
 "ezero_contact_first_call_dock_v0_1.js",
 "ezero_trusted_friend_foreground_client_candidate_v0_1.js"]){
  const script=directory+"/js/"+name;
  assert.ok(html.includes('src="./js/'+name),"Preview must load isolated "+name);
  execFileSync(process.execPath,["--check",script],{stdio:"pipe"});
}
const client=fs.readFileSync(directory+"/js/ezero_trusted_friend_foreground_client_candidate_v0_1.js","utf8");
assert.ok(client.includes('const CALL_PAGE="'+previewPath+'";'),"Signed inbox must strictly accept preview route");
assert.ok(client.includes('const ORIGIN="https://coma39658-ctrl.github.io";'),"Origin pin is mandatory");
const dock=fs.readFileSync(directory+"/js/ezero_contact_first_call_dock_v0_1.js","utf8");
assert.ok(dock.includes("explicitFreshQrChoice"),"New QR must require explicit user choice");
const one=fs.readFileSync(directory+"/js/ezero_trusted_stage_one_request_v0_1.js","utf8");
assert.ok(one.includes("qrBox.hidden=true;copyBtn.disabled=true;qrTarget.replaceChildren();"));
assert.ok(!one.includes('savedDirect=false;\n      showFallbackQr()'),"Saved friend may not auto-QR on failure");
console.log("E-ZERO_ISOLATED_NOQR_PREVIEW_STATIC_CONTRACT: PASS");
console.log("NO_REAL_PHONES_NO_CLOUD_DELIVERY_NO_PRODUCTION_CHANGED");
