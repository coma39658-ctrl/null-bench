"use strict";
/* RED -> GREEN: decision text must not imply reliable separation/non-separation
 * when the randomized null distribution has SD=0. Pure source-bound Node VM.
 * No network, deployments, secrets, browser permission, or production write.
 */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const start=html.indexOf("function runTest(edges){");
const end=html.indexOf("function drawHistogram(vals,observed){",start);
assert.ok(start>=0&&end>start,"SOURCE_RUNTEST_MISSING");
const program=html.slice(start,end);

function runScenario(observed,nullValues){
  const els=new Map();
  for(const id of ["statNE","statObs","statNull","statCI","statZ",
    "verdict","nullSamples","swapAttempts"]){
    els.set(id,{textContent:"—",innerHTML:"",className:"",value:""});
  }
  els.get("nullSamples").value="20";
  els.get("swapAttempts").value="10";
  const graph=new Map([
    ["a",new Set(["b"])],["b",new Set(["a","c"])],["c",new Set(["b"])]
  ]);
  let t=0;
  const events=[];
  const box={
    document:{getElementById:id=>{
      assert.ok(els.has(id),"UNEXPECTED_DOM_ID_"+id);
      return els.get(id);
    }},
    buildAdjacency:()=>graph,
    edgesFromAdjacency:()=>[["a","b"],["b","c"]],
    cloneAdj:()=>graph,
    doubleEdgeSwap:()=>0,
    transitivity:()=>t++===0?observed:nullValues[(t-2)%nullValues.length],
    drawHistogram:arr=>assert.equal(arr.length,20),
    statusEl:{textContent:""},
    gtag:(...args)=>events.push(args)
  };
  vm.runInNewContext(program+"\nrunTest([[\"a\",\"b\"],[\"b\",\"c\"]]);",box,{timeout:2000});
  const event=events.find(args=>args[0]==="event"&&args[1]==="null_model_test_completed");
  assert.ok(event,"NORMAL_EXISTING_EVENT_MUST_STAY");
  return {
    verdict:els.get("verdict").innerHTML,
    z:els.get("statZ").textContent,
    statNull:els.get("statNull").textContent,
    statNE:els.get("statNE").textContent,
    telemetry:event[2]
  };
}

test("RED: SD=0 and observed exactly null cannot say 'No structural separation was detected'",()=>{
  const out=runScenario(0,[0]);
  assert.equal(out.z,"N/A");
  assert.match(out.statNull,/0\.0000 ± 0\.0000/);
  assert.match(out.verdict,/degenerate/i);
  assert.match(out.verdict,/SD\s*=\s*0/i);
  assert.match(out.verdict,/undefined/i);
  assert.doesNotMatch(out.verdict,/No structural separation was detected|Within the 95% null interval|Outside the 95% null interval/i);
  assert.equal(out.statNE,"3 / 2");
  assert.equal(Object.hasOwn(out.telemetry,"z_score"),false);
  assert.equal(Object.hasOwn(out.telemetry,"outside_95_percent_interval"),false,
    "no misleading structural separation event for degenerate null model");
});

test("RED: SD=0 but observed differs from constant reference still gets degenerate warning",()=>{
  const out=runScenario(.7,[0]);
  assert.equal(out.z,"N/A");
  assert.match(out.verdict,/degenerate/i);
  assert.doesNotMatch(out.verdict,/Outside the 95% null interval|Within the 95% null interval/i);
  assert.equal(Object.hasOwn(out.telemetry,"outside_95_percent_interval"),false);
});

test("Identical fractional null samples report true zero SD, not floating-point noise",()=>{
  for(const x of [0.1, 1/3, 0.7]){
    const out=runScenario(x,[x]);
    assert.match(out.statNull,/± 0\.0000$/);
    assert.equal(out.z,"N/A");
    assert.match(out.verdict,/Degenerate null distribution/);
    assert.equal(Object.hasOwn(out.telemetry,"outside_95_percent_interval"),false);
  }
});

test("GREEN control: positive SD with inside observation retains prior text",()=>{
  const out=runScenario(.3,[.2,.4]);
  assert.notEqual(out.z,"N/A");
  assert.match(out.verdict,/Within the 95% null interval/);
  assert.equal(out.telemetry.outside_95_percent_interval,false);
  assert.equal(typeof out.telemetry.z_score,"number");
});

test("GREEN control: positive SD with outside observation retains prior text",()=>{
  const out=runScenario(.9,[.2,.4]);
  assert.notEqual(out.z,"N/A");
  assert.match(out.verdict,/Outside the 95% null interval/);
  assert.equal(out.telemetry.outside_95_percent_interval,true);
});
