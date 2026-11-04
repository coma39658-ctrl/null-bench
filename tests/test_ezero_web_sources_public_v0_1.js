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
const serviceWorker=fs.readFileSync("service-worker.js","utf8");
const studio=fs.readFileSync("ezero_ai_studio_v0_1.html","utf8");
// A mobile browser may return no TTS voices initially and load Urdu only
// after a user gesture. Use mock browser voices; no audio or network needed.
const readVoices=studio.match(/function ezeroReadBrowserVoices\(\)\{[\s\S]*?\n\}/)?.[0];
const preferredVoice=studio.match(/function ezeroPreferredVoice\(locale\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(readVoices&&preferredVoice,"Voice discovery and play-time refresh must exist");
let discoveredVoices=[],voiceReadCount=0;
const voiceCtx={
 window:{speechSynthesis:{getVoices:()=>{voiceReadCount++;return discoveredVoices}}},
 document:{getElementById:()=>({value:"auto"})},
 speechLocale:()=> "ur-PK",
};
const chooseVoice=vm.runInNewContext(
 "let ezeroBrowserVoices=[];\n"+readVoices+"\n"+preferredVoice+"\nezeroPreferredVoice;",
 voiceCtx
);
assert.equal(chooseVoice("ur-PK"),null,"Missing Urdu voice must not be invented");
discoveredVoices=[{lang:"ur-PK",voiceURI:"installed-urdu",name:"Urdu voice"}];
assert.equal(chooseVoice("ur-PK")?.voiceURI,"installed-urdu","Discover late-arriving Urdu voice");
assert.ok(voiceReadCount>=2,"Playback must retry getVoices()");
assert.ok(studio.includes('id="ezeroTtsRefresh"'),"Manual voice refresh is available");
assert.ok(studio.includes('refresh?.addEventListener("click"'),"Voice refresh must be interactive");

assert.ok(studio.includes("showAnswerProvenance") && studio.includes("PUBLIC_RELEASE_BUNDLED_DATED"),"Site-state fallback must be visible as dated, not live");
assert.ok(studio.includes("appendUnverifiedWebSources"),"AI Studio must show real external sources");
assert.ok(studio.includes("source.sourceClass!==\"WEB_SEARCH_UNVERIFIED\""),
  "Ignore malformed or model-invented source records");
assert.ok(studio.includes('a.rel="noopener noreferrer nofollow"'),
  "Prevent referrer leaks from user-clicked source URLs");
assert.ok(studio.includes('result.marketPriceVerification==="NOT_VERIFIED"||needsPublicResearchSources(q)'),
  "If live sources are missing, offer user-clicked search for general public research too");
assert.ok(studio.includes("function needsPublicResearchSources(question)"),
  "General web research intent should not be auto-limited to cars");
const offsetFnText=studio.match(/function clockOffsetNeeded\(question\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(offsetFnText,"Device UTC offset should be limited to clock questions");
const clockOffsetNeeded=vm.runInNewContext(offsetFnText+"\nclockOffsetNeeded");
assert.equal(clockOffsetNeeded("آج کیا دن ہے؟"),true);
assert.equal(clockOffsetNeeded("What's the date today?"),true);
assert.equal(clockOffsetNeeded("الریاض میں گاڑی کی دھلائی کتنے کی ہوتی ہے"),false);
assert.equal(clockOffsetNeeded("آج AI Studio میں کیا تبدیلی ہوئی؟"),false);
assert.ok(studio.includes("clockOffsetNeeded(q)?{client_utc_offset_minutes:-new Date().getTimezoneOffset()}"),
  "No unconditional timezone metadata on ordinary questions");
assert.ok(studio.includes("const noFreshSource=!isImage&&linkedSources===0&&needsPublicResearchSources(q)"),
  "No-source research warning must be visible even if the worker forgot a market verification label");
assert.ok(studio.includes("appendOptionalMarketSearch(finalMessage.box,q)"),
  "Only user-clicked external search links, never hidden client-side uploads");
assert.ok(studio.includes("annotateSearchStatus(finalMessage,q,result,linkedSources)"),
  "Each research answer should include its own source status, not only a transient notice");
const statusLabelSource=studio.match(/function publicSearchStatusLabel\(status\)\{[\s\S]*?\n\}/)?.[0];
assert.ok(statusLabelSource,"Missing evidence-status formatter");
const formatSourceStatus=vm.runInNewContext(statusLabelSource+"\npublicSearchStatusLabel");
assert.match(formatSourceStatus("DISABLED"),/فعال یا مربوط نہیں/);
assert.match(formatSourceStatus("FREE_SEARCH_DAILY_QUOTA_REACHED"),/حد یا حفاظتی کوٹہ/);
assert.match(formatSourceStatus("FREE_SEARCH_FAILED"),/فراہم کنندہ/);
assert.match(formatSourceStatus("PRIVATE_OR_IMAGE"),/نجی معلومات/);
assert.match(formatSourceStatus("NO_USABLE_SOURCES"),/اصل ویب ماخذ/);
assert.match(formatSourceStatus("UNKNOWN"),/تصدیق باقی ہے/);
assert.ok(studio.includes('▶ '),"Identify actual returned video links");
assert.ok(studio.includes('const linkedSources=!isImage?appendUnverifiedWebSources'),
  "Keep public search source rendering separate from user images");
const simpleChat=fs.readFileSync("ezero_public_ai_chat_candidate_v0_1.html","utf8");
const visionPage=fs.readFileSync("ezero_public_vision_ai_candidate_v0_1.html","utf8");
// Studio v0.5 passed independent Cloudflare clock smoke. Public Guide remains
// on its separately verified v0.3 Worker until a specific Guide cutover.
const latestTextHost="https://ezero-qwen-public-clock-v0-5.coma39658.workers.dev";
const publicGuideHost="https://ezero-qwen-public-siteaware-v0-3.coma39658.workers.dev";
const legacyExperimentalHost="https://ezero-qwen-public-priceguard-v0-2.coma39658.workers.dev";
const oldImageHost="https://ezero-qwen-vision-gateway-public.coma39658.workers.dev";
assert.ok(studio.includes('const ENDPOINT="'+latestTextHost+'/api/ezero-agent/v0.1/ask"'),
  "AI Studio text requests must use live-verified clock v0.5");
assert.ok(studio.includes('const HEALTH="'+latestTextHost+'/health"'),
  "Studio health should inspect the same public text endpoint");
assert.ok(studio.includes('const IMAGE_ENDPOINT="'+oldImageHost+'/api/ezero-agent/v0.1/ask"'),
  "Do not change the image AI endpoint without a separate image smoke test");
assert.ok(studio.includes('fetch(isImage?IMAGE_ENDPOINT:ENDPOINT,'),
  "Studio image and text request selection must be explicit");
assert.ok(studio.includes('result.marketPriceVerification==="NOT_VERIFIED"'),
  "Clearly label price information as not live-verified");
assert.ok(studio.includes('appendOptionalMarketSearch(finalMessage.box,q)'),
  "Expose voluntary search links without inventing prices");
assert.ok(studio.includes('a.rel="noopener noreferrer nofollow"'),
  "Never pass referrer through external search links");
assert.ok(simpleChat.includes('const endpoint="'+legacyExperimentalHost+'/api/ezero-agent/v0.1/ask"'),
  "Experimental text chat must not use deprecated platform-only gateway");
assert.ok(visionPage.includes(oldImageHost),
  "Keep separately tested vision candidate route unchanged");
for(const [name,html] of [
  ["E-ZERO_AI_STUDIO",studio],["E-ZERO_PUBLIC_AI_CHAT",simpleChat]
]){
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length>=1,name+" must contain executable code");
  for(let i=0;i<scripts.length;i++)new vm.Script(scripts[i][1],{filename:name+"_"+i+".js"});
}

assert.match(serviceWorker,/ezero-null-bench-v7-ai-studio-v03-20261103/,"Updated mobile PWA cache version is required");
assert.match(serviceWorker,/url\.origin !== self\.location\.origin/,"Do not intercept or cache external websites or Cloudflare AI calls");
assert.match(serviceWorker,/url\.pathname\.startsWith\(new URL\(self\.registration\.scope\)\.pathname\)/,"Only intercept this website project");
assert.match(serviceWorker,/key\.startsWith\("ezero-null-bench-"\)/,"Do not delete other apps' caches");
const canaryHost = publicGuideHost;
assert.ok(website.includes(canaryHost + "/api/ezero-agent/v0.1/ask"), "Public AI must use verified canary");
assert.ok(website.includes(canaryHost + "/health"), "Health must match chat gateway");
assert.match(website,/Governed AI Live · v0\.3/,"Visible public AI build identifier should match tested version");
assert.ok(website.includes('20261101-branded-priceguard04'),"Force newest AI guide JavaScript on mobile");
assert.ok(!website.includes("https://ezero-qwen-vision-gateway-public.coma39658.workers.dev"), "Avoid stale fallback or mismatched health");
assert.match(voiceSource, /currentWebNotVerified/, "Market freshness disclosure required");
assert.match(voiceSource, /Live market prices and availability were not verified/, "No false live-source claims");
assert.match(voiceSource, /تازہ مارکیٹ قیمت یا دستیابی کی ویب تصدیق نہیں ہوئی/, "Urdu market price evidence warning");
assert.match(voiceSource, /offerPublicSearchLinks\(question,language\)/,
  "Offer optional search engine links only for unverified market questions");
assert.ok(voiceSource.includes('data-ezero-search-alternatives'));
assert.ok(voiceSource.includes('https://duckduckgo.com/?q='));
assert.ok(voiceSource.includes('https://www.bing.com/search?q='));
assert.ok(voiceSource.includes('encodeURIComponent(question)'));
assert.ok(voiceSource.includes('question.length > 500'),"Long user vehicle-market questions must not hide public search options");
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
