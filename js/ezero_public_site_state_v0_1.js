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
 root.EZERO_PUBLIC_SITE_STATE_V0_1=Object.freeze({version:"0.3",isSiteQuestion,classify,answer,resetFocus,getFocus});
})(window);
