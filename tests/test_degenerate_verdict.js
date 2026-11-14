// Regressions for the browser's real Null Bench runTest implementation.
// Usage: node tests/test_degenerate_verdict.js index.html
// No network, external dependencies, or live-vehicle access.
"use strict";
const fs = require("node:fs");
const vm = require("node:vm");
const filename = process.argv[2] || "index.html";
const html = fs.readFileSync(filename, "utf8");
const start = html.indexOf("function buildAdjacency(edges){");
const end = html.indexOf("</script>", start);
if (start < 0 || end < 0) {
  console.error("SETUP_FAIL: Null Bench script block not found");
  process.exit(2);
}
const source = html.slice(start, end);
function run(edgeText, initialSeed=123456) {
  const els = {};
  const get = id => els[id] || (els[id] = {
    id, textContent:"", innerHTML:"", className:"",
    value: ({nullSamples:"200", swapAttempts:"300", edgeInput:edgeText})[id] ?? "",
    children:[], style:{}, title:"",
    addEventListener(){}, appendChild(node){this.children.push(node);}
  });
  const document = {
    getElementById:get,
    createElement:()=>({style:{}, title:"", className:""})
  };
  let seed = initialSeed >>> 0;
  const randomMath = Object.create(Math);
  randomMath.random = () => {
    seed = (1664525*seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const ctx = {document, console, Math:randomMath, setTimeout:fn=>fn()};
  vm.createContext(ctx);
  vm.runInContext(source, ctx, {timeout:10000});
  ctx.runTest(ctx.parseEdgeText(edgeText));
  return {
    z:els.statZ.textContent, stats:els.statNull.textContent,
    nodesEdges:els.statNE.textContent, verdict:els.verdict.innerHTML,
    headingClass:els.verdict.className
  };
}
let failed=0;
function check(name, passes, detail="") {
  console.log((passes?"PASS ":"FAIL ")+name+(passes?"":" => "+detail));
  if(!passes) failed++;
}
const r1 = run("a,b\nb,a\na,a\nb,c");
check("T1 zero-variance z is N/A", r1.z==="N/A",r1.z);
check("T1 degenerate is explicit", /degenerate/i.test(r1.verdict), r1.verdict);
check("T1 makes no false separation claim", !/No structural separation was detected/.test(r1.verdict),r1.verdict);
check("T1 deduplicates edges and ignores self-loop",r1.nodesEdges==="3 / 2",r1.nodesEdges);
const r2 = run("a,b\nb,c\na,c");
check("T2 triangle is degenerate",/degenerate/i.test(r2.verdict)&&r2.z==="N/A",r2.verdict);
const edges = [];
for(let i=0;i<8;i++){
  for(let j=i+1;j<8;j++){
    if((i<4 && j<4)||(i>=4 && j>=4)||(i===3 && j===4)){
      edges.push("n"+i+",n"+j);
    }
  }
}
const r3 = run(edges.join("\n"));
check("T3 nondegenerate has a numeric z-score",r3.z!=="N/A",r3.z);
check("T3 nondegenerate keeps standard verdict",/(Within|Outside) the 95% null interval/.test(r3.verdict),r3.verdict);
check("T3 nondegenerate is not mislabeled",!/degenerate/i.test(r3.verdict),r3.verdict);
console.log(failed?("TOTAL_FAILED="+failed):"ALL_PASS");
process.exit(failed?1:0);
