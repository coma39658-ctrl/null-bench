"use strict";
/* E-ZERO Null Bench: spec-first RED -> GREEN source-bound distinct edge count.
 * Compare the actual graph's simple undirected edges with the on-screen number
 * and GA4 metadata. No browser networking, production changes, or ECU access.
 */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const html=fs.readFileSync("index.html","utf8");
function extract(from,to){
  const a=html.indexOf(from),b=html.indexOf(to,a);
  assert.ok(a>0&&b>a,"SOURCE_BOUNDARY_MISSING_"+from);
  return html.slice(a,b);
}
const engine=extract("function buildAdjacency(edges){","function genModular(){");
const runner=extract("function runTest(edges){","function drawHistogram(vals,observed){");
function execute(input){
  const fields=new Map();
  for(const id of ["nullSamples","swapAttempts","statNE","statObs","statNull",
    "statCI","statZ","verdict"]){
    fields.set(id,{textContent:"—",value:"",innerHTML:"",className:""});
  }
  fields.get("nullSamples").value="20";
  fields.get("swapAttempts").value="10";
  const events=[];
  const context={
    document:{getElementById:id=>{
      assert.ok(fields.has(id),"UNEXPECTED_DOM_ELEMENT_"+id);
      return fields.get(id);
    }},
    drawHistogram:vals=>assert.equal(vals.length,20),
    statusEl:{textContent:""},
    gtag:(...args)=>events.push(args),
    console,
    Math
  };
  vm.runInNewContext(engine+"\n"+runner+"\nrunTest(parseEdgeText("+
    JSON.stringify(input)+"));",context,{timeout:2500});
  const event=events.find(x=>x[0]==="event"&&x[1]==="null_model_test_completed");
  assert.ok(event,"EXISTING_GA4_EVENT_MUST_REMAIN");
  return {display:fields.get("statNE").textContent,telemetry:event[2],
    observed:fields.get("statObs").textContent,
    nullSummary:fields.get("statNull").textContent};
}

test("RED: reversed repeated edges and self-loops must not inflate distinct edge count",()=>{
  const result=execute("a,b\nb,a\na,a\nb,c\nb,c");
  assert.equal(result.display,"3 / 2","UI must report simple undirected edge count");
  assert.equal(result.telemetry.node_count,3);
  assert.equal(result.telemetry.edge_count,2,"Telemetry count must match actual graph");
});

test("Distinct triangle is three undirected edges, regardless of reverse duplicates",()=>{
  const result=execute("a,b\nb,a\nb,c\nc,a\na,a");
  assert.equal(result.display,"3 / 3");
  assert.equal(result.telemetry.edge_count,3);
});

test("Unrepeated edges retain original count and statistical runner",()=>{
  const result=execute("a,b\nb,c");
  assert.equal(result.display,"3 / 2");
  assert.equal(result.telemetry.edge_count,2);
  assert.match(result.observed,/^\d+\.\d{4}$/);
  assert.match(result.nullSummary,/±/);
});
