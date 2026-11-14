"use strict";
/* E-ZERO Null Bench: verify professional public guide claims against actual
 * index.html browser implementation. Non-deployment source QA only.
 */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const index=fs.readFileSync("index.html","utf8");
const page=fs.readFileSync("null_bench_professional_guide.html","utf8");
const guide=fs.readFileSync("docs/null-bench-quickstart-ur-en-ar.md","utf8");
const readme=fs.readFileSync("README.md","utf8");
const has=(s,t)=>assert.ok(s.includes(t),"missing: "+t);

test("Professional positioning appears on homepage in three languages",()=>{
  has(index,'id="null-bench-professional-entry"');
  has(index,"خاص سائنسی و تحقیقی ٹول، عام روزمرہ AI ایپ نہیں");
  has(index,"Professional research audience");
  has(index,"للباحثين والمتخصصين");
  assert.equal(index.split("./null_bench_professional_guide.html").length-1,2);
  has(index,'id="try"');
  has(index,'id="runBtn"');
  has(index,'id="genBtn"');
});
test("Guide has accessible Urdu, English and Arabic anchors and runs on mobile",()=>{
  has(page,'<html lang="ur">');
  has(page,'name="viewport"');
  has(page,'id="urdu" lang="ur" dir="rtl"');
  has(page,'id="english" lang="en"');
  has(page,'id="arabic" lang="ar" dir="rtl"');
  has(page,"@media(max-width:600px)");
  has(page,"prefers-reduced-motion");
  has(page,'href="./index.html#try"');
  has(page,'id="ezeroGuideBack"');
  has(page,'href="./index.html#null-bench-professional-entry"');
  has(page,"← واپس / Back");
  has(page,"min-height:48px");
  has(page,'aria-labelledby="ur-title"');
  has(page,'aria-labelledby="en-title"');
  has(page,'aria-labelledby="ar-title"');
});
test("Public usage matches implemented graph engine and actual controls",()=>{
  for(const id of ["demoSelect","edgeInput","nullSamples","swapAttempts","genBtn","runBtn",
    "statNE","statObs","statNull","statCI","statZ","hist","verdict"]){
    has(index,'id="'+id+'"');
  }
  for(const label of ["Demo network","Modular network","Random network","Custom edge list",
    "Generate Demo Network","Run Null-Model Test","Null samples","Swap attempts / sample",
    "Observed clustering","Null mean ± SD","95% null interval","z-score"]){
    has(index,label);has(page,label);
  }
  has(index,'value="200" min="20" max="2000"');
  has(index,'value="300" min="10" max="5000"');
  has(index,"function buildAdjacency(edges)");
  has(index,"function doubleEdgeSwap(adj,attempts)");
  has(index,"function transitivity(adj)");
  has(index,"doubleEdgeSwap(copy,swapAttempts)");
  has(page,"Python interpreter");
  has(page,"JavaScript");
});
test("Scientific and privacy boundaries do not overclaim",()=>{
  has(page,"general-purpose AI application");
  has(page,"not a Python requirement");
  has(page,"not a confidence interval");
  has(page,"standard deviation");
  has(page,"Google Analytics 4");
  has(page,"graph calculation itself runs in the browser");
  has(page,"p-value");
  has(page,"self-loops");
  has(page,"duplicate");
  has(page,"not a causal proof");
  has(page,"trained students");
  assert.doesNotMatch(page,/<script\b/i);
  assert.doesNotMatch(page,/<iframe\b/i);
  assert.doesNotMatch(page,/googletagmanager\.com\/gtag\/js\?id=/i);
  has(index,"googletagmanager.com/gtag/js?id=");
  has(guide,"#try");
  has(readme,"docs/null-bench-quickstart-ur-en-ar.md");
  console.log("NULL_BENCH_PROFESSIONAL_GUIDE_SCOPE_AND_PRIVACY: PASS");
});
