"use strict";
/* E-ZERO: validate HTTP/CORS smoke gate without touching live Worker or secrets. */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {spawnSync}=require("node:child_process");
const workflow=fs.readFileSync(".github/workflows/ezero-simple-home-inbox-worker-stage-20261113.yml","utf8");
const origin="https://ezero-secure-simple-home-two-phone.onrender.com";
const wanted="access-control-allow-origin: "+origin;
const command="tr -d '\\r' < \"$E_ZERO_HEADER_FILE\" | grep -iFx '"+wanted+"'";
test("staging deploy smoke gate normalizes curl CRLF before exact CORS match",()=>{
  assert.ok(workflow.includes("tr -d '\\r' </tmp/ezero-health-headers | grep -iFx \""+wanted+"\""));
  assert.ok(workflow.includes('test "$CODE" = "403"'));
  assert.ok(workflow.includes('test "$CODE" = "426"'));
});
test("exact origin header succeeds for CRLF and LF but rejects other origins",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"ezero-health-audit-"));
  const filename=path.join(dir,"headers.txt");
  try {
    const shell=headers=>{
      fs.writeFileSync(filename,headers,"utf8");
      return spawnSync("bash",["-o","pipefail","-c",command],{
        encoding:"utf8",env:{...process.env,E_ZERO_HEADER_FILE:filename}
      });
    };
    const CRLF="HTTP/2 200\r\n"+wanted+"\r\ncontent-type: application/json\r\n";
    const LF=CRLF.replaceAll("\r\n","\\n");
    const evil="HTTP/2 200\r\naccess-control-allow-origin: https://wrong.example\r\n";
    const suffix="HTTP/2 200\r\n"+wanted+".evil.example\r\n";
    const a=shell(CRLF),b=shell(LF),c=shell(evil),d=shell(suffix);
    assert.equal(a.status,0,a.stderr);
    assert.equal(b.status,0,b.stderr);
    assert.notEqual(c.status,0);
    assert.notEqual(d.status,0);
    console.log("RENDER_CLOUDFLARE_CORS_EXACT_CRLF_LF_GATE: PASS");
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test("audit-only branch has no automatic staging deployment trigger",()=>{
  assert.match(workflow,/branches: \[ezero-secure-simple-home-ui-stage-20261113\]/);
  assert.ok(!workflow.includes("branches: [ezero-mail-healthcheck-audit-20261114]"));
});
