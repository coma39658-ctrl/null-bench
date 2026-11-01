"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

// No paid requests, Cloudflare calls, or production mutations.
global.window = global;
window.EZERO_PUBLIC_AI_ENABLED = true;
window.EZERO_PUBLIC_AI_ENDPOINT = "https://example.org/api/ezero-agent/v0.1/ask";
window.setTimeout = setTimeout;
window.clearTimeout = clearTimeout;

const agentSource = fs.readFileSync("js/ezero_qwen_public_agent_v0_1.js", "utf8");
const voiceSource = fs.readFileSync("js/ezero_voice_guide_ui_v0_1.js", "utf8");
const website = fs.readFileSync("index.html", "utf8");
const canaryHost = "https://ezero-qwen-public-free-market-v0-1.coma39658.workers.dev";
assert.ok(website.includes(canaryHost + "/api/ezero-agent/v0.1/ask"), "Public AI must use verified canary");
assert.ok(website.includes(canaryHost + "/health"), "Health must match chat gateway");
assert.ok(!website.includes("https://ezero-qwen-vision-gateway-public.coma39658.workers.dev"), "Avoid stale fallback or mismatched health");
assert.match(voiceSource, /currentWebNotVerified/, "Market freshness disclosure required");
assert.match(voiceSource, /Live market information was not verified/, "No false live-source claims");
assert.match(voiceSource, /offerPublicSearchLinks\(question,language\)/,
  "Offer optional search engine links only for unverified market questions");
assert.ok(voiceSource.includes('data-ezero-search-alternatives'));
assert.ok(voiceSource.includes('https://duckduckgo.com/?q='));
assert.ok(voiceSource.includes('https://www.bing.com/search?q='));
assert.ok(voiceSource.includes('encodeURIComponent(question)'));
assert.ok(voiceSource.includes('link.rel="noopener noreferrer nofollow"'));
assert.ok(voiceSource.includes('if(oldAlternatives)oldAlternatives.remove()'));
assert.ok(voiceSource.includes('پاسورڈ') && voiceSource.includes('bank.account'),
  "Do not forward secrets or bank details to external search engines");

vm.runInThisContext(agentSource, {filename:"ezero_qwen_public_agent_v0_1.js"});
const agent = window.EZERO_QWEN_PUBLIC_AGENT_V0_1;
assert.equal(typeof agent.ask, "function");

// Ensure stale sources are discarded BEFORE any early return or AI call.
const questionStart = voiceSource.indexOf("async function runQuestion()");
const sourceRemoval = voiceSource.indexOf('const oldSources = answer.parentElement?.querySelector("[data-ezero-web-sources]");',questionStart);
const emptyQuestion = voiceSource.indexOf("if (!question)", questionStart);
assert.ok(questionStart >= 0 && sourceRemoval > questionStart && emptyQuestion > sourceRemoval);
assert.match(voiceSource, /link\.rel = "noopener noreferrer nofollow"/);
assert.match(voiceSource, /item\.sourceClass !== "WEB_SEARCH_UNVERIFIED"/);
assert.match(voiceSource, /link\.textContent =/);

const mockSources = Array.from({length:7},(_,i)=>({
  url: "https://example.org/page-"+i,
  title: "Example source "+i,
  sourceClass: "WEB_SEARCH_UNVERIFIED"
}));
let requests=0;
global.fetch = async function (_url,options) {
  requests++;
  const payload = JSON.parse(options.body);
  assert.equal(payload.question,"سعودی عرب میں ٹویوٹا کی تازہ قیمت");
  return {ok:true,status:200,json:async()=>({
    status:"OK",source_class:"GOVERNED_AI",
    diagnostic_claim:false,evidence_authority:false,
    answer:"قیمت کی مثال؛ حقیقی قیمت نہیں",
    sources:mockSources,web_research_status:"WEB_CONTEXT_AVAILABLE"
  })};
};

(async()=>{
  const answer = await agent.ask({question:"سعودی عرب میں ٹویوٹا کی تازہ قیمت",responseLanguage:"ur"});
  assert.equal(requests,1);
  assert.equal(answer.sources.length,5,"Only five references may reach the viewer");
  assert.equal(answer.web_research_status,"WEB_CONTEXT_AVAILABLE");
  assert.equal(answer.source_class,"GOVERNED_AI");
  assert.equal(answer.diagnostic_claim,false);

  global.fetch = async()=>({ok:true,status:200,json:async()=>({
    status:"OK",source_class:"GOVERNED_AI",
    diagnostic_claim:false,evidence_authority:false,
    answer:"عام معلومات"
  })});
  const general = await agent.ask({question:"سعودی عرب میں ٹویوٹا کی تازہ قیمت"});
  assert.deepEqual(general.sources,[]);
  assert.equal(general.web_research_status,"UNKNOWN");
  console.log("PUBLIC_WEB_SOURCES_CONTRACT: PASS");
  console.log("STALE_LINK_GUARD: PASS");
  console.log("MOCK_ONLY_NO_PUBLIC_DEPLOYMENT: PASS");
})().catch(e=>{console.error(e);process.exitCode=1;});
