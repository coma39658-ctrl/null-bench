/* E-ZERO dated public site inventory — evidence-safe local routing v0.2.
 * Same-origin public data only, no user input forwarded to third parties,
 * no private repositories, live search, live diagnostic claims or model training.
 */
(function(root){
 "use strict";
 const SOURCE="./data/ezero_public_site_state_v0_1.json";
 const PRICE=/(?:\b(?:price|prices|cost|costs|quote|quotes|msrp|valuation|buy|selling|dealers?|for sale|spare parts?|stock|inventory)\b|قیمت|قیمتیں|قیمتوں|ریٹ|اسپیئر\s*پارٹس|پرزے|خرید|فروخت|أسعار|السعر|قطع غيار)/iu;
 const FRESH_SEARCH=/(?:\b(?:search the web|search online|look up online|find online listings)\b|انٹرنیٹ\s+پر\s+تلاش|ویب\s+پر\s+تلاش|آن\s*لائن\s+تلاش)/iu;
 const SITE=/(?:\be[\s-]?zero\b|\bezero\b|\bwebsite\b|\bweb\s*site\b|ای\s*زیرو|ویب\s*سائٹ|ویبسائٹ|الموقع)/iu;
 const AI=/(?:\b(?:ai\s+(?:studio|session|guide|assistant|chat)|qwen|voice\s*guide|intelligence\s+studio)\b|اے\s*[آااَ]?\s*ئی|اے\s*آئی|اے\s*آئی|اے\s*ائی|ای\s*آئی|اے\s*ائی|اے\s*ائی|اے\s*ائ[یي]|اے\s*آی|اے\s*آئ|اے\s*ای\s*آئی|اے\s*آئی\s*سیشن|کوین|قوین|کیوین|وائس\s*گائیڈ|اسٹوڈیو|چیٹ\s*سیشن|ذكاء\s*اصطناعي)/iu;
 const AI_SESSION=/(?:\b(?:ai\s+(?:studio|session|guide|chat)|qwen|voice\s*guide)\b|اے\s*آئی|اے\s*ائی|اے\s*آئی|اے\s*آئ|ای\s*آئی|اے\s*ائ[یي]|اے\s*ای\s*آئی|کوین|قوین|کیوین|وائس\s*گائیڈ|اسٹوڈیو)/iu;
 const OBD=/(?:\b(?:obd|vehicle|car\s+scanner|dashboard|workshop\s+viewer)\b|او\s*بی\s*ڈی|گاڑی|ڈیش\s*بورڈ|ورکشاپ\s*رپورٹ|ورکشاپ\s*ویور)/iu;
 const CHANGED=/(?:\b(?:update|updates|updated|changed|changes|change|new|newest|latest|today|release|progress|what\s+happened|what\s+did\s+you\s+do)\b|آج|اج|ابھی|تازہ|اپڈیٹ|اپ\s*ڈیٹ|تبدیل|تبدیلی|تبدیلیاں|کیا\s+بدلا|کیا\s+کام|نیا|نئی|نئے|کیا\s+ہوا|التحديثات|تحديث|الجديد|اليوم)/iu;
 const FEATURES=/(?:\b(?:button|buttons|feature|features|section|sections|where|open|menu|available|status|active)\b|بٹن|بٹنز|سیکشن|فیچر|کہاں|کھول|مینو|حالت|فعال|الأزرار|الأقسام)/iu;
 const DASHBOARD=/(?:\b(?:dashboard|vehicle\s+dashboard|obd\s+dashboard)\b|ڈیش\s*بورڈ|ڈیشبورڈ|گاڑی\s+کا\s+ڈیش\s*بورڈ)/iu;
 const CARD_COUNT=/(?:\b(?:cards?|how\s+many|count|number\s+of|total\s+cards?)\b|کارڈز?|کتنے|کتنی|تعداد|شمار|گنتی)/iu;
 const ACTION=/(?:\b(?:search|find|buy|compare)\b|تلاش\s+کرو|ڈھونڈو|خرید|موازنہ\s+کرو)/iu;
 // Two bounded, tab-local follow-ups. Never store private prompts or train a model.
 const FOLLOWUP=/^(?:اور|اچھا|پھر|اس میں|اس کے|اس کی|ان میں|مزید|اب|what about|and what about|and in that|tell me more|what else|more about|also)\b|^(?:اس\s+میں|اس\s+کے|اس\s+کی|ان\s+میں|اور\s+اس|مزید\s+کیا|اب\s+اس)/iu;
 let focus=null;
 let focusHops=0;
 function resetFocus(){focus=null;focusHops=0;}
 function getFocus(){return focus?Object.freeze({scope:focus.scope,kind:focus.kind,remaining:focusHops}):null;}
 const today=(date)=>/^\d{4}-\d{2}-\d{2}$/.test(date);
 const norm=s=>String(s||"").normalize("NFKC").replace(/[\u064b-\u065f\u0670\u06d6-\u06ed]/gu,"").replace(/\s+/g," ").trim().toLowerCase();
 function classify(question){
   if(typeof question!=="string"||!question.trim()||question.length>4000)return null;
   const q=norm(question);
   // Live price/search requests must always reach the existing governed web-search route.
   if(PRICE.test(q)||FRESH_SEARCH.test(q))return null;
   // Dashboard card counts are verified UI structures, not market search.
   // Their total is not fixed because real sensor and OBD result arrays vary.
   if(DASHBOARD.test(q)&&CARD_COUNT.test(q))
     return Object.freeze({scope:"vehicle",kind:"dashboard_cards",date:"latest",followup:false});
   const explicit=SITE.test(q);
   const ai=AI_SESSION.test(q);
   const obd=OBD.test(q);
   const changed=CHANGED.test(q);
   const features=FEATURES.test(q);
   const followup=!explicit&&!ai&&!obd&&focusHops>0&&q.length<=180&&
       FOLLOWUP.test(q)&&!ACTION.test(q)&&
       (changed||features||/\b(?:what|more|else|further)\b|کیا|مزید|اور/iu.test(q));
   if(!changed&&!features&&!followup)return null;
   // Never infer a product or website from an ungrounded short question.
   if(!explicit&&!ai&&!obd&&!followup)return null;
   if(ACTION.test(q)&&!changed&&!features&&!followup)return null;
   const scope=ai?"ai":obd?"vehicle":explicit?"all":focus.scope;
   const kind=changed?"changes":features?"features":focus.kind;
   return Object.freeze({scope,kind,date:/(?:آج|اج|\btoday\b|اليوم)/iu.test(q)?"today":"latest",followup});
 }
 function isSiteQuestion(q){return classify(q)!==null;}
 function langOf(q,language){
   if(language==="en"||language==="ur"||language==="ar")return language;
   if(/[\u0600-\u06ff]/u.test(q))return "ur";
   return "en";
 }
 function valid(s){
   if(!s||s.status!=="PUBLIC_APPROVED_SITE_STATE"||
      s.schema_version!=="1.0"||s.visibility!=="PUBLIC_ONLY"||
      s.origin!=="https://coma39658-ctrl.github.io"||
      !today(s.as_of)||
      s.public_site!=="https://coma39658-ctrl.github.io/null-bench/"||
      !Array.isArray(s.features)||s.features.length>30||
      !Array.isArray(s.changes)||s.changes.length>20)return false;
   for(const f of s.features){
     if(!f||typeof f.id!=="string"||typeof f.title_ur!=="string"||
        typeof f.title_en!=="string"||typeof f.href!=="string"||
        !/^[a-z0-9_./-]+(?:#[a-z0-9_-]+)?$/i.test(f.href)||
        f.href.includes("..")||f.href.length>220||
        typeof f.status!=="string"||typeof f.section!=="string")return false;
   }
   for(const c of s.changes){
     if(!c||!today(c.date)||typeof c.area!=="string"||
        typeof c.title_ur!=="string"||typeof c.title_en!=="string"||
        typeof c.detail_ur!=="string"||typeof c.detail_en!=="string")return false;
   }
   return true;
 }
 const clean=v=>String(v||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,460);

 // This is a public metadata feed from the separately deployed Render app.
 // It does not grant the AI permission to operate controls or see user data.
 const DASHBOARD_MAP_URL="https://e-zero-dashboard.onrender.com/api/public-site-map/v0.1";
 const DASHBOARD_MAP_BASE="https://e-zero-dashboard.onrender.com";
 const ALLOWED_PATH=/^\/(?:studio|dashboard|symptom-guide|pid-catalog|workshop-pro|vehicle-communications\/stage-c\/voice-note-policy-v0\.1)$/;
 const SAFE_ID=/^[A-Za-z0-9_-]{0,100}$/;
 async function readDashboardMap(){
   try{
     const controller=new AbortController();
     const timer=setTimeout(()=>controller.abort(),5000);
     let response;
     try{
       response=await fetch(DASHBOARD_MAP_URL,{
         method:"GET",credentials:"omit",redirect:"error",cache:"no-store",signal:controller.signal
       });
       if(!response.ok)throw Error("MAP_NOT_AVAILABLE");
       const headerSize=Number(response.headers?.get?.("content-length")||0);
       if(headerSize>180000)throw Error("MAP_TOO_LARGE");
       const raw=await response.text();
       if(raw.length>180000)throw Error("MAP_TOO_LARGE");
       const map=JSON.parse(raw);
       if(map?.schema!=="EZERO_PUBLIC_SITE_MAP_V0_1"||
          map.status!=="PUBLIC_READ_ONLY"||
          map.diagnostic_claim!==false||map.physical_execution_authorized!==false||
          map.personal_data_included!==false||
          !Array.isArray(map.pages)||map.pages.length>10)throw Error("MAP_UNVERIFIED");
       const pages=[];
       for(const page of map.pages){
         if(!ALLOWED_PATH.test(String(page?.path||""))||
            !Array.isArray(page.controls)||page.controls.length>180||
            page.is_complete_dom_count!==false)throw Error("MAP_BAD_PAGE");
         const controls=[];
         for(const ctl of page.controls){
           if(!ctl||!["section","details","button","a"].includes(ctl.type)||
              typeof ctl.label!=="string"||ctl.label.length>160||
              !SAFE_ID.test(String(ctl.id||""))||
              (ctl.href!==null&&ctl.href!==undefined&&
                 (typeof ctl.href!=="string"||!/^\/[a-z0-9_./#-]{0,160}$/i.test(ctl.href))))throw Error("MAP_BAD_CONTROL");
           if(ctl.label.trim())controls.push({
             type:ctl.type,label:clean(ctl.label),id:ctl.id||"",
             disabled:ctl.disabled===true,href:ctl.href||null
           });
         }
         pages.push({path:page.path,section:clean(page.section),controls});
       }
       return {status:"OK",pages,deployed_revision:/^[a-f0-9]{7,40}$/i.test(map.deployed_revision||"")?
         map.deployed_revision:"UNKNOWN"};
     }finally{clearTimeout(timer)}
   }catch(_){return {status:"UNAVAILABLE",pages:[],deployed_revision:"UNKNOWN"}}
 }
 function mapForScope(map,scope){
   if(scope==="ai")return map.pages.filter(p=>p.path==="/studio");
   if(scope==="vehicle")return map.pages.filter(p=>
     ["/dashboard","/symptom-guide","/pid-catalog","/workshop-pro"].includes(p.path));
   return map.pages;
 }

 function scopeChange(change,scope){
   if(scope==="all")return true;
   const a=change.area;
   return scope==="ai"
     ? ["ai-studio","voice-guide","ai-guide","ai-search","vision"].includes(a)
     : ["vehicle-obd","workshop-viewer"].includes(a);
 }
 function scopeFeature(feature,scope){
   if(scope==="all")return true;
   if(scope==="ai")return /^(?:ai-studio|voice-guide|vision|media-preview)$/.test(feature.id);
   return /^(?:vehicle-obd|workshop-viewer|workshop-pro)$/.test(feature.id);
 }
 function lineUr(lng,ur,en,ar){return lng==="ur"?ur:lng==="ar"?ar:en;}
 async function answer(question,{language="auto"}={}){
   const intent=classify(question);
   if(!intent)return null;
   const lng=langOf(question,language);
   let snapshot;
   try{
     const response=await fetch(SOURCE,{method:"GET",cache:"no-store",redirect:"error",credentials:"same-origin"});
     if(!response.ok)throw Error("SITE_STATE_HTTP");
     snapshot=await response.json();
     if(!valid(snapshot))throw Error("SITE_STATE_INVALID");
   }catch(_){
     return Object.freeze({status:"UNAVAILABLE",source_class:"PUBLIC_SITE_STATE",as_of:null,answer:lineUr(lng,
       "اس وقت E-ZERO کی تازہ عوامی معلومات نہیں مل سکیں، اس لیے میں نئی تبدیلی یا بٹن کی حالت فرض نہیں کروں گا۔",
       "The current public E-ZERO site record is unavailable. I will not invent changes or button statuses.",
       "تعذر جلب حالة الموقع العام الآن، لذلك لن أفترض تحديثات أو أزرارًا غير موثقة.")});
   }
   const out=[lineUr(lng,"E-ZERO کا شائع شدہ ریکارڈ — تاریخ: ","E-ZERO published record — date: ","سجل E-ZERO المنشور — التاريخ: ")+snapshot.as_of];
   if(intent.kind==="dashboard_cards"){
     const ui=snapshot.dashboard_ui;
     if(!ui||ui.live_total_cards!=="NOT_FIXED"||
        !Number.isInteger(ui.structural_summary_fixed_cards)||
        !Number.isInteger(ui.rul_summary_fixed_cards)||
        !Number.isInteger(ui.historical_evidence_registry_modules)||
        !Number.isInteger(ui.pid_reference_catalog_entries)){
       return Object.freeze({status:"UNAVAILABLE",source_class:"PUBLIC_SITE_STATE",as_of:snapshot.as_of,
         answer:lineUr(lng,
           "Dashboard کے نتیجہ کارڈز کا ماخذی ریکارڈ ابھی دستیاب نہیں۔ ایک غیر تصدیق شدہ کل تعداد نہیں بتاؤں گا۔",
           "Verified Dashboard card inventory is unavailable. I will not guess a fixed total.",
           "سجل بطاقات لوحة التحكم الموثق غير متاح؛ لن أخمّن عددًا إجماليًا.")});
     }
     out.push(lineUr(lng,
       "ڈیش بورڈ کے تمام نتیجہ کارڈز کا ایک مقررہ کل عدد نہیں ہے۔ متعلقہ سیکشن الگ الگ ہیں:",
       "There is no single fixed total of Dashboard result cards. These are separate sections:",
       "لا يوجد إجمالي ثابت لبطاقات النتائج، لأن هذه أقسام مختلفة:"));
     out.push("• Structural Analysis Summary: "+ui.structural_summary_fixed_cards+
       "\n• RUL Summary: "+ui.rul_summary_fixed_cards+
       "\n• Historical Evidence Registry: "+ui.historical_evidence_registry_modules+
       "\n• PID Reference Catalog: "+ui.pid_reference_catalog_entries);
     out.push(lineUr(lng,
       "127 PID اندراجات صرف حوالہ جاتی کارڈز ہیں، حقیقی گاڑی کی ریڈنگز نہیں۔ Sensor Screening میں ہر موصولہ سینسر نتیجے پر ایک کارڈ بنتا ہے؛ تصدیق شدہ Physical OBD Snapshot میں بھی ہر موجود نتیجے پر الگ کارڈ بنتا ہے۔ اس لیے ان کی تعداد رپورٹ کے مطابق بدلتی ہے۔",
       "The 127 PID entries are reference cards, not live readings. Sensor Screening creates a card per returned sensor result, and verified physical OBD snapshots create a card per present result. Those counts vary with the report.",
       "بطاقات PID الـ127 مرجعية وليست قراءات حقيقية. بطاقات الفحص وOBD تتغير حسب النتائج الفعلية."));
     out.push(lineUr(lng,
       "ماخذ: E-ZERO Dashboard کے نتیجہ بنانے والے public-facing UI کوڈ اور Evidence/PID رجسٹریوں کا 3 نومبر 2026 کا جائزہ۔ یہ نئی حقیقی گاڑی کی تشخیص نہیں۔",
       "Source: Review of the E-ZERO Dashboard public-facing rendering code and evidence/PID registries on 3 November 2026. Not a fresh real-vehicle diagnosis.",
       "المصدر: مراجعة كود واجهة لوحة E-ZERO وسجلات الأدلة وPID بتاريخ 3 نوفمبر 2026؛ ليس تشخيصًا مباشرًا."));
     focus={scope:"vehicle",kind:"features"};focusHops=2;
     return Object.freeze({status:"OK",source_class:"PUBLIC_SITE_STATE",answer:out.join("\n\n").slice(0,5500),as_of:snapshot.as_of});
   }

   const changes=snapshot.changes.filter(c=>scopeChange(c,intent.scope)&&
     (intent.date!=="today"||c.date===snapshot.as_of)).slice(0,7);
   if(intent.kind==="changes"){
     if(!changes.length){
       out.push(lineUr(lng,
         "اس موضوع پر اس تاریخ کی کوئی تصدیق شدہ تبدیلی درج نہیں؛ میں دوسرے سیکشنز کی تبدیلی کو اس کی جگہ نہیں بتاؤں گا۔",
         "No verified change for this topic is recorded on that date; I won't substitute changes from unrelated sections.",
         "لا يوجد تحديث موثق لهذا القسم في هذا التاريخ؛ لن أستخدم تحديثات قسم آخر."));
     }else{
       out.push(lineUr(lng,"متعلقہ تبدیلیاں:","Relevant changes:","التحديثات المتعلقة:"));
       for(const c of changes)out.push("• "+clean(lng==="ur"?c.title_ur:c.title_en)+": "+clean(lng==="ur"?c.detail_ur:c.detail_en));
     }
   }
   // Feature listings are requested separately; do not swamp a narrow AI
   // update question with every historical E-ZERO module.
   if(intent.kind==="features"){
     const liveMap=await readDashboardMap();
     if(liveMap.status==="OK"){
       const relevant=mapForScope(liveMap,intent.scope);
       out.push(lineUr(lng,
         "اصل Render Dashboard کے موجودہ شائع شدہ سیکشنز/بٹن (صرف معلومات؛ استعمال کی اجازت نہیں):",
         "Currently deployed Render Dashboard sections and controls (informational only):",
         "الأقسام والأزرار المنشورة حاليًا في لوحة Render (معلومات فقط):"));
       for(const page of relevant.slice(0,6)){
         out.push("• "+page.path+" — "+page.section);
         const controls=page.controls.filter(c=>c.type==="button"||c.type==="details"||
           (c.type==="a"&&c.href)).slice(0,12);
         for(const c of controls){
           out.push("  - "+c.label+(c.disabled?" [DISABLED]":"")+
             (c.href?" ("+DASHBOARD_MAP_BASE+c.href+")":""));
         }
       }
       out.push(lineUr(lng,
         "یہ صرف شائع شدہ HTML کے محدود نام ہیں؛ اس سے کسی اسکرین پر نظر آنے والے تمام کارڈز کی درست تعداد یا تازہ Release کی تاریخ ثابت نہیں ہوتی۔",
         "These are bounded public-template labels, not a live DOM count or proof of when a button was released.",
         "هذه تسميات محدودة من القوالب العامة، وليست عددًا كاملاً أو تاريخ إصدار."));
     }else{
       out.push(lineUr(lng,
         "Render Dashboard سے موجودہ سیکشنز کی Live فہرست نہیں ملی؛ نیچے صرف E-ZERO کی آخری شائع شدہ معلومات ہیں۔",
         "The live Render Dashboard inventory was unavailable; only dated E-ZERO published knowledge follows.",
         "قائمة لوحة Render الحالية غير متاحة؛ المعلومات التالية من السجل المنشور المؤرخ."));
     }
   }
   if(intent.kind==="features"){
     out.push(lineUr(lng,"موجودہ متعلقہ سیکشنز:","Relevant published sections:","الأقسام المنشورة المتعلقة:"));
     for(const f of snapshot.features.filter(f=>scopeFeature(f,intent.scope)).slice(0,8)){
       const url=new URL(f.href,snapshot.public_site).href;
       out.push("• "+clean(lng==="ur"?f.title_ur:f.title_en)+" — "+clean(f.status)+"؛ "+
          clean(lng==="ur"?f.note_ur:f.note_en)+"\n"+url);
     }
   }
   out.push(lineUr(lng,
     "حد: یہ شائع شدہ، مورخہ معلومات ہیں؛ نجی سورس کوڈ، نئی غیر درج شدہ اپڈیٹس، براہِ راست ویب سرچ یا حقیقی گاڑی کی تشخیص نہیں۔",
     "Boundary: Dated public information only, not private code, unrecorded releases, live web search or a real-car diagnosis.",
     "الحدود: معلومات عامة مؤرخة، وليست شفرة خاصة أو بحثًا مباشرًا أو تشخيصًا فعليًا للمركبة."));
   // Learn only the topic of this conversation, for at most two short
   // follow-ups. The answer is always re-fetched from approved public data.
   if(intent.followup)focusHops=Math.max(0,focusHops-1);
   else focusHops=2;
   focus={scope:intent.scope,kind:intent.kind};
   return Object.freeze({status:"OK",source_class:"PUBLIC_SITE_STATE",answer:out.join("\n\n").slice(0,5500),as_of:snapshot.as_of});
 }
 root.EZERO_PUBLIC_SITE_STATE_V0_1=Object.freeze({version:"0.5",isSiteQuestion,classify,answer,readDashboardMap,resetFocus,getFocus});
})(window);
