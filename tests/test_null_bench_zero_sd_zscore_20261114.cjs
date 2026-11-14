"use strict";
/* Spec-first contract for Null Bench in-browser z-score.
 * The RED baseline is expected to fail when sampled SD=0 is incorrectly shown as 0.
 * No network, production, Google Analytics, or browser permissions.
 */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
const first=html.indexOf("function runTest(edges){");
const last=html.indexOf("function drawHistogram(vals,observed){",first);
assert.ok(first>0&&last>first,"Existing public runTest function must be present");
const program=html.slice(first,last);

function exercise({observed,series}){
  const vals=new Map();
  for(const id of ["statNE","statObs","statNull","statCI","statZ","verdict",
                   "nullSamples","swapAttempts"]){
    vals.set(id,{textContent:"—",innerHTML:"",className:"",value:""});
  }
  vals.get("nullSamples").value="20";
  vals.get("swapAttempts").value="10";
  const events=[];
  let k=0,drawn=0;
  const graph=new Map([["a",new Set(["b"])],["b",new Set(["a"])]]);
  const sandbox={
    document:{getElementById:id=>{
      assert.ok(vals.has(id),"unexpected_dom_id:"+id);
      return vals.get(id);
    }},
    buildAdjacency:()=>graph,
    edgesFromAdjacency:()=>[["a","b"]], // deterministic one-edge fixture for new distinct-edge metric
    cloneAdj:()=>graph,
    doubleEdgeSwap:()=>0,
    transitivity:()=>k++===0?observed:series[(k-2)%series.length],
    drawHistogram:(data)=>{drawn++;assert.equal(data.length,20);},
    statusEl:{textContent:""},
    gtag:(...args)=>events.push(args),
  };
  vm.runInNewContext(program+"\nrunTest([[\"a\",\"b\"]]);",sandbox,{timeout:1000});
  assert.equal(drawn,1,"existing histogram remains");
  const event=events.find(e=>e[0]==="event"&&e[1]==="null_model_test_completed");
  assert.ok(event,"existing GA4 event must remain");
  return {statZ:vals.get("statZ").textContent,event:event[2],
    nullSummary:vals.get("statNull").textContent};
}

test("RED spec: identical null samples yield SD=0 and z-score N/A, never a false numeric zero",()=>{
  const r=exercise({observed:.5,series:[.5]});
  assert.match(r.nullSummary,/0\.5000 ± 0\.0000/);
  assert.equal(r.statZ,"N/A");
  assert.equal(Object.hasOwn(r.event,"z_score"),false,
    "Do not emit fabricated z-score as numeric 0 to Google Analytics");
  assert.equal(r.event.null_sd,0);
});

test("Normal nonzero SD preserves computed numeric z-score and telemetry",()=>{
  const r=exercise({observed:.5,series:[.2,.4]});
  assert.match(r.statZ,/^-?\d+\.\d{2}$/);
  assert.notEqual(r.statZ,"N/A");
  assert.equal(typeof r.event.z_score,"number");
  assert.ok(Number.isFinite(r.event.z_score));
  assert.ok(r.event.null_sd>0);
});
