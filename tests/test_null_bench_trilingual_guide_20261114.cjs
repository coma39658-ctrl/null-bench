"use strict";
/* Public Null Bench trilingual guide: real source and bounded truthfulness gate.
 * Documentation-only; never deploy, send data, create a network, or open devices.
 */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const read=p=>fs.readFileSync(p,"utf8");
const index=read("index.html");
const guide=read("docs/null-bench-quickstart-ur-en-ar.md");
const readme=read("README.md");
test("Guide contains real instructions in Urdu, English, and Arabic",()=>{
  for(const title of ["## اردو — شروع کرنے کا طریقہ",
    "## English — Quick start","## العربية — طريقة الاستخدام"]){
    assert.ok(guide.includes(title),title);
  }
  assert.match(guide,/#try/);
  assert.match(readme,/docs\/null-bench-quickstart-ur-en-ar\.md/);
  assert.doesNotMatch(guide,/STAGING ONLY|NOT verified as deployed|Draft educational copy/i);
});
test("Guide names only actual active browser input and result controls",()=>{
  for(const id of ["demoSelect","edgeInput","nullSamples","swapAttempts",
                   "genBtn","runBtn","statNE","statObs","statNull","statCI","statZ"]){
    assert.ok(index.includes('id="'+id+'"'),"MISSING_REAL_UI_"+id);
  }
  for(const label of ["Demo network","Custom edge list","Generate Demo Network",
    "Run Null-Model Test","Null samples","Swap attempts / sample",
    "Observed clustering","95% null interval","z-score"]){
    assert.ok(index.includes(label),"NOT_ACTUAL_LABEL_"+label);
    assert.ok(guide.includes(label),"MISSING_GUIDE_LABEL_"+label);
  }
  assert.match(index,/id="nullSamples"[^>]*value="200" min="20" max="2000"/);
  assert.match(index,/id="swapAttempts"[^>]*value="300" min="10" max="5000"/);
  console.log("REAL_NULL_BENCH_BROWSER_CONTROLS_AND_GUIDE: PASS");
});
test("Guide does not claim seeded deterministic results or physical proof",()=>{
  assert.match(guide,/random-seed field/);
  assert.match(guide,/random seed درج کرنے کا الگ کنٹرول نہیں/);
  assert.match(guide,/البذرة العشوائية/);
  assert.match(guide,/does not establish causality/);
  assert.match(guide,/vehicle fault/);
  assert.match(guide,/degree-preserving/);
  assert.match(index,/doubleEdgeSwap\(copy,swapAttempts\)/);
  assert.match(index,/transitivity\(baseAdj\)/);
});
test("Guide states preexisting GA4 and avoids sensitive user graph uploads",()=>{
  assert.ok(index.includes("googletagmanager.com/gtag/js?id="));
  assert.ok(guide.includes("Google Analytics 4"));
  assert.ok(guide.includes("locally in the browser"));
  assert.ok(guide.includes("private contacts"));
  assert.ok(guide.includes("no tracking")===false || guide.includes("does **not** add tracking"));
  assert.ok(guide.includes("does **not** change the existing call engine"));
});
