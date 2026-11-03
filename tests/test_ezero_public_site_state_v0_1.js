"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const record=JSON.parse(fs.readFileSync("data/ezero_public_site_state_v0_1.json","utf8"));
const source=fs.readFileSync("js/ezero_public_site_state_v0_1.js","utf8");
const html=fs.readFileSync("index.html","utf8");
const studio=fs.readFileSync("ezero_ai_studio_v0_1.html","utf8");
const guide=fs.readFileSync("js/ezero_voice_guide_ui_v0_1.js","utf8");
assert.equal(record.status,"PUBLIC_APPROVED_SITE_STATE");
assert.equal(record.visibility,"PUBLIC_ONLY");
assert.equal(record.history_is_automatic,false);
assert.ok(record.features.length>=6);
assert.ok(html.includes('src="js/ezero_public_site_state_v0_1.js?v=20261103-site05"'));
assert.ok(studio.includes('src="./js/ezero_public_site_state_v0_1.js?v=20261103-site05"'));
assert.ok(guide.includes("siteState.isSiteQuestion(question)"));
assert.ok(studio.includes("siteState.isSiteQuestion(q)"));
assert.ok(html.includes('id="public-obd-runner"'));
assert.ok(studio.includes("const IMAGE_ENDPOINT="));
const simpleChat=fs.readFileSync("ezero_public_ai_chat_candidate_v0_1.html","utf8");
assert.ok(simpleChat.includes("ezero_public_site_state_v0_1.js?v=20261103-site05"));
assert.ok(simpleChat.includes("site.isSiteQuestion(question)"));

let requests=[];
let current=record;
const renderMap={
 schema:"EZERO_PUBLIC_SITE_MAP_V0_1",
 status:"PUBLIC_READ_ONLY",
 diagnostic_claim:false,physical_execution_authorized:false,personal_data_included:false,
 deployed_revision:"b25d236ded786403e6e1ad34bcb468f65bcf7291",
 pages:[{
   path:"/dashboard",section:"Dashboard / reports / OBD",
   is_complete_dom_count:false,
   controls:[
     {type:"button",id:"connectVehicleButton",label:"Connect vehicle",disabled:false,href:null},
     {type:"button",id:"completeVehiclePairingButton",label:"Complete session",disabled:true,href:null},
     {type:"a",id:"",label:"PID catalog",disabled:false,href:"/pid-catalog"}
   ]
 },{
   path:"/studio",section:"Studio / navigation",is_complete_dom_count:false,
   controls:[{type:"a",id:"",label:"Vehicle screening",disabled:false,href:"/dashboard"}]
 }]
};
let mapStatus="OK";
const mapUrl="https://e-zero-dashboard.onrender.com/api/public-site-map/v0.1";
const context={window:{},URL,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{
 requests.push({url,options});
 if(url===mapUrl){
   if(mapStatus==="ERROR")throw Error("NETWORK");
   return {ok:true,headers:{get:()=>null},text:async()=>JSON.stringify(renderMap)};
 }
 return {ok:true,json:async()=>current};
}};
vm.runInNewContext(source,context,{filename:"ezero_public_site_state_v0_1.js"});
const api=context.window.EZERO_PUBLIC_SITE_STATE_V0_1;
assert.equal(typeof api.answer,"function");
assert.equal(api.isSiteQuestion("E-ZERO ویب سائٹ میں آج کیا تبدیلی ہوئی؟"),true);
assert.equal(api.isSiteQuestion("E-ZERO کے نئے بٹن کون سے ہیں؟"),true);
assert.equal(api.isSiteQuestion("E-ZERO کے اسپیئر پارٹس کی تازہ قیمتیں"),false);
assert.equal(api.isSiteQuestion("Toyota Corolla 2018 Saudi Arabia price"),false);
assert.equal(api.isSiteQuestion("2018 کرولا کی قیمت بتائیں"),false);
assert.equal(api.isSiteQuestion("What is the current market price of a vehicle on E-ZERO?"),false);
assert.equal(api.isSiteQuestion("How does an alternator work?"),false);
assert.equal(api.isSiteQuestion("ای زیرو ڈیش بورڈ میں نتیجہ دکھانے والے کارڈ کتنے ہیں؟"),true);
assert.equal(api.isSiteQuestion("How many result cards are in E-ZERO dashboard?"),true);
assert.equal(api.classify("ای زیرو ڈیش بورڈ میں کتنے کارڈ ہیں؟").kind,"dashboard_cards");

assert.equal(api.isSiteQuestion("آج اے آئی سیشن میں کیا تبدیلی کی گئی؟"),true);
assert.equal(api.isSiteQuestion("آج اے ائی سیشن میں کیا تبدیلی کی گئی؟"),true);
assert.equal(api.isSiteQuestion("آج Qwen AI session میں کیا تبدیلی ہوئی؟"),true);
assert.equal(api.isSiteQuestion("آج اے آئی سیشن میں نیا بٹن کون سا ہے؟"),true);
assert.equal(api.isSiteQuestion("What changed in the AI Studio today?"),true);
assert.equal(api.isSiteQuestion("آج سعودی عرب میں کرولا کی قیمت بتائیں"),false);
assert.equal(api.isSiteQuestion("آج موٹر سائیکل کے پرزے کے ریٹ ڈھونڈو"),false);
assert.equal(api.isSiteQuestion("E-ZERO ویب سائٹ پر کار کی تازہ قیمت"),false);
assert.equal(api.isSiteQuestion("Qwen سرچ انجن سے مارکیٹ قیمت تلاش کرو"),false);
assert.equal(api.isSiteQuestion("موسم آج کیسا ہے؟"),false);
assert.equal(api.isSiteQuestion("Explain AI models"),false);
assert.equal(api.classify("آج اے آئی سیشن میں کیا تبدیلی کی گئی؟").scope,"ai");
assert.equal(api.classify("E-ZERO dashboard میں کیا اپڈیٹ ہوئی؟").scope,"vehicle");

(async()=>{
 const updates=await api.answer("E-ZERO ویب سائٹ میں آج کیا تبدیلی ہوئی؟",{language:"ur"});
 assert.equal(updates.status,"OK");
 assert.equal(updates.source_class,"PUBLIC_SITE_STATE");
 assert.ok(updates.answer.includes("206/206"));
 assert.ok(updates.answer.includes("260/260"));
 assert.ok(!updates.answer.includes("466 منفرد"));
 const cards=await api.answer("ڈیش بورڈ میں نتیجہ دکھانے والے کارڈز کی تعداد کتنی ہے؟",{language:"ur"});
 assert.equal(cards.status,"OK");
 assert.ok(cards.answer.includes("Structural Analysis Summary: 5"));
 assert.ok(cards.answer.includes("RUL Summary: 4"));
 assert.ok(cards.answer.includes("Historical Evidence Registry: 2"));
 assert.ok(cards.answer.includes("PID Reference Catalog: 127"));
 assert.ok(cards.answer.includes("مقررہ کل"));
 assert.ok(cards.answer.includes("ہر موجود"));
 const aiUpdate=await api.answer("آج اے آئی سیشن میں کیا تبدیلی کی گئی؟",{language:"ur"});
 assert.equal(aiUpdate.status,"OK");
 assert.ok(aiUpdate.answer.includes("AI Studio"));
 assert.ok(aiUpdate.answer.includes("Voice Guide"));
 assert.ok(!aiUpdate.answer.includes("206/206"),"AI session must not answer with unrelated OBD tests");
 const aiVariant=await api.answer("آج اے ائی سیشن میں کیا تبدیلی کی گئی؟",{language:"ur"});
 assert.ok(aiVariant.answer.includes("AI Studio"));
 const inEnglish=await api.answer("What changed in the AI Studio today?",{language:"en"});
 assert.ok(inEnglish.answer.includes("AI Studio"));
 assert.ok(!inEnglish.answer.includes("206/206"));

 // Attention to a prior topic is temporary, bounded, and never stored.
 assert.equal(api.getFocus().scope,"ai");
 const f1=await api.answer("اور اس میں کیا نیا ہے؟",{language:"ur"});
 assert.equal(f1.status,"OK");
 assert.ok(f1.answer.includes("AI Studio"));
 assert.ok(!f1.answer.includes("206/206"));
 const f2=await api.answer("اور اس کی تازہ تبدیلی؟",{language:"ur"});
 assert.equal(f2.status,"OK");
 assert.equal(api.getFocus().remaining,0);
 assert.equal(api.isSiteQuestion("اور اس میں کیا نیا ہے؟"),false);
 assert.equal(api.isSiteQuestion("اور اس میں گاڑی کی قیمت؟"),false);
 assert.equal(api.isSiteQuestion("اب ریاض میں موسم بتاؤ"),false);
 const features=await api.answer("E-ZERO کے کون سے بٹن اور سیکشن ہیں؟",{language:"ur"});
 assert.equal(features.status,"OK");
 assert.ok(features.answer.includes("اے آئی"));
 assert.ok(features.answer.includes("PUBLIC_DEMO_ONLY"));
 assert.ok(features.answer.includes("Connect vehicle"));
 assert.ok(features.answer.includes("Complete session [DISABLED]"));
 assert.ok(features.answer.includes("https://e-zero-dashboard.onrender.com/pid-catalog"));
 assert.equal(requests.filter(r=>r.url===mapUrl).length,1);
 assert.ok(requests.every(r=>r.options.cache==="no-store"&&r.options.redirect==="error"));
 assert.ok(requests.filter(r=>r.url===mapUrl).every(r=>r.options.method==="GET"&&r.options.credentials==="omit"));
 assert.ok(requests.filter(r=>r.url!==mapUrl).every(r=>r.options.credentials==="same-origin"));
 // Render unavailable must not be mistaken for a verified, current inventory.
 mapStatus="ERROR";
 const offline=await api.answer("E-ZERO کے کون سے بٹن اور سیکشن ہیں؟",{language:"ur"});
 assert.equal(offline.status,"OK");
 assert.ok(offline.answer.includes("Live فہرست نہیں ملی"));
 assert.ok(!offline.answer.includes("Connect vehicle"));
 // Untrusted map must not inject arbitrary outbound links or privacy flags.
 mapStatus="OK";
 renderMap.personal_data_included=true;
 const rejected=await api.readDashboardMap();
 assert.equal(rejected.status,"UNAVAILABLE");
 renderMap.personal_data_included=false;
 renderMap.pages[0].controls[0].href="https://evil.example/";
 const badLink=await api.readDashboardMap();
 assert.equal(badLink.status,"UNAVAILABLE");
 renderMap.pages[0].controls[0].href=null;
 assert.equal(typeof api.readDashboardMap,"function");
 api.resetFocus();
 assert.equal(api.getFocus(),null);
 assert.equal(api.isSiteQuestion("اور اس میں کیا نیا ہے؟"),false);

 current={...record,visibility:"PRIVATE"};
 const invalid=await api.answer("E-ZERO ویب سائٹ میں تازہ تبدیلیاں کیا ہیں؟");
 assert.equal(invalid.status,"UNAVAILABLE");
 assert.ok(!invalid.answer.includes("206/206"));
 context.fetch=async()=>{throw Error("OFFLINE")};
 const fail=await api.answer("What new buttons are on the E-ZERO website?",{language:"en"});
 assert.equal(fail.status,"UNAVAILABLE");
 const prices=await api.answer("E-ZERO کی تازہ گاڑیوں کی قیمتیں کیا ہیں؟");
 assert.equal(prices,null);
 console.log("EZERO_SITE_STATE_CONTRACT: PASS");
 console.log("EZERO_PRICE_SEARCH_ISOLATION: PASS");
 console.log("EZERO_NO_NEW_BUTTONS: PASS");
 console.log("EZERO_SAME_ORIGIN_READ_ONLY: PASS");
})().catch(e=>{console.error(e);process.exitCode=1});
