#!/usr/bin/env node
/* E-ZERO PR156 Trusted Inbox ordered test runner.
 * Static checks run first. Live checks require ws@8 and the isolated staging Worker.
 * No production endpoints, real contacts, call media, SDP or user messages are used.
 */
const {spawnSync}=require("node:child_process");
const assert=require("node:assert/strict");
const fs=require("node:fs");

const COMMAND_TIMEOUT_MS=90000;
const commands=[
  ["Origin / routing contract","tests/ezero_pr156_preview_trusted_inbox_origin_contract_20261118.cjs"],
  ["Replay / cooldown / revocation contract","tests/ezero_pr156_trusted_inbox_replay_revocation_contract_20261119.cjs"]
];
function run(label,args){
  console.log("\n===== "+label+" =====");
  const r=spawnSync(process.execPath,args,{
    stdio:"inherit",env:process.env,timeout:COMMAND_TIMEOUT_MS
  });
  if(r.error){
    if(r.error.code==="ETIMEDOUT")throw Error(label+" exceeded "+COMMAND_TIMEOUT_MS+"ms hard timeout");
    throw r.error;
  }
  if(r.signal)throw Error(label+" terminated by "+r.signal);
  if(r.status!==0)throw Error(label+" failed (exit "+r.status+")");
}
try{
  const worker="signaling/cloudflare/src/trusted_inbox_pr156_preview_v2.js";
  const config="signaling/cloudflare/wrangler.trusted-pr156-preview-v2.jsonc";
  assert.ok(fs.existsSync(worker),"Missing isolated preview Worker source");
  assert.ok(fs.existsSync(config),"Missing isolated preview Worker config");
  assert.ok(fs.readFileSync(worker,"utf8").includes("ISOLATED PR156 PREVIEW ONLY"));
  const cfg=JSON.parse(fs.readFileSync(config,"utf8"));
  assert.equal(cfg.name,"ezero-trusted-inbox-pr156-preview-v2",
    "Refusing to test a non-preview Worker");
  for(const [label,file] of commands){
    run(label,["--check",file]);
    run(label,[file]);
  }
  run("Live smoke syntax",["--check","tests/ezero_pr156_preview_trusted_inbox_live_smoke_20261118.mjs"]);
  run("Live isolated Worker security smoke",["tests/ezero_pr156_preview_trusted_inbox_live_smoke_20261118.mjs"]);
  console.log("\nEZERO_PR156_TRUSTED_INBOX_ORDERED_SUITE_PASS");
}catch(e){
  console.error("\nEZERO_PR156_TRUSTED_INBOX_ORDERED_SUITE_FAIL:",e.stack||e.message);
  process.exitCode=1;
}
