/* E-ZERO public site-state guide v0.1.
 * Same-origin, public-only dated knowledge. Not Qwen model training, live
 * market search, private GitHub access, or diagnostic authority.
 */
(function(root){
  "use strict";
  const SOURCE="./data/ezero_public_site_state_v0_1.json";
  const PRICE=/(?:\b(?:price|prices|market\s+price|spare\s+parts|dealers?|for\s+sale|buy|selling|stock|inventory|search\s+the\s+web|search\s+online)\b|قیمت|قیمتیں|اسپیئر\s*پارٹس|پرزے|مارکیٹ\s+ریٹ|خرید|فروخت|أسعار|السعر|قطع غيار)/iu;
  const SITE=/(?:\be[-\s]?zero\b|\bezero\b|\bwebsite\b|\bweb\s+site\b|\bai\s+studio\b|\bworkshop\s+pro\b|\bvoice\s+guide\b|ای\s*زیرو|ویب\s*سائٹ|ویبسائٹ|اے\s*آئی\s*اسٹوڈیو|ورکشاپ\s*پرو|موقع|الموقع)/iu;
  const STATUS=/(?:\b(?:updates?|changes?|changed|new\s+buttons?|features?|sections?|status|site\s+map|what\s+is\s+new|what\s+has\s+changed|where\s+is|how\s+to\s+open|which\s+button)\b|بٹن|سیکشن|اپڈیٹ|تبدیل|تبدیلی|کیا\s+نیا|کون\s+سا|کہاں|نیا\s+فیچر|کیا\s+کام|حالت|تازہ\s+کام|الأزرار|الأقسام|التحديثات|ما\s+الجديد)/iu;
  const BUTTONS=/(?:\b(?:button|buttons|feature|features|section|sections|open|where)\b|بٹن|سیکشن|فیچر|کہاں|کھول|الأزرار|الأقسام)/iu;
  const CHANGES=/(?:\b(?:update|updates|changed|changes|new|latest|today|release|progress)\b|اپڈیٹ|تبدیلی|نیا|نئی|آج|تازہ|ترقی|التحديثات|الجديد)/iu;
  function isSiteQuestion(q){
    if(typeof q!=="string"||!q.trim()||q.length>4000)return false;
    return !PRICE.test(q)&&SITE.test(q)&&STATUS.test(q);
  }
  function langOf(q,language){
    if(language==="ar")return "ar";
    if(language==="ur")return "ur";
    if(language==="en")return "en";
    if(/[\u0600-\u06ff]/u.test(q))return "ur";
    return "en";
  }
  function valid(snapshot){
    if(!snapshot||snapshot.status!=="PUBLIC_APPROVED_SITE_STATE"||
       snapshot.schema_version!=="1.0"||
       snapshot.visibility!=="PUBLIC_ONLY"||
       snapshot.origin!=="https://coma39658-ctrl.github.io"||
       !/^20\d{2}-\d{2}-\d{2}$/.test(snapshot.as_of)||
       !Array.isArray(snapshot.features)||snapshot.features.length>30||
       !Array.isArray(snapshot.changes)||snapshot.changes.length>20)return false;
    for(const f of snapshot.features){
      if(!f||typeof f.title_ur!=="string"||typeof f.title_en!=="string"||
         typeof f.href!=="string"||!/^(?:[a-z0-9_./-]+)(?:#[a-z0-9_-]+)?$/i.test(f.href)||
         f.href.includes("..")||f.href.length>220||typeof f.status!=="string")return false;
    }
    return true;
  }
  const clean=s=>String(s||"").replace(/[\u0000-\u001f\u007f]/g," ").trim().slice(0,450);
  async function answer(question,{language="auto"}={}){
    if(!isSiteQuestion(question))return null;
    const lng=langOf(question,language);
    let snapshot;
    try{
      const response=await fetch(SOURCE,{method:"GET",cache:"no-store",redirect:"error",credentials:"same-origin"});
      if(!response.ok)throw Error("SITE_STATE_HTTP");
      snapshot=await response.json();
      if(!valid(snapshot))throw Error("SITE_STATE_INVALID");
    }catch(_){
      const message=lng==="ur"?"اس وقت E-ZERO کی تازہ عوامی سائٹ کی فہرست نہیں پڑھ سکا۔ بٹن یا نئی تبدیلی کے بارے میں اندازہ نہیں لگاؤں گا۔":lng==="ar"?"تعذر قراءة فهرس موقع E-ZERO العام الآن؛ لن أخمّن حالة الأزرار أو التحديثات.":"The current public E-ZERO site inventory is unavailable. I will not guess the buttons or release status.";
      return Object.freeze({status:"UNAVAILABLE",source_class:"PUBLIC_SITE_STATE",answer:message,as_of:null});
    }
    const wantsButtons=BUTTONS.test(question);
    const wantsChanges=CHANGES.test(question)||!wantsButtons;
    const prefix=lng==="ur"?"E-ZERO ویب سائٹ کی شائع شدہ معلومات (تاریخ: ":"E-ZERO public site record (date: ";
    const out=[prefix+snapshot.as_of+")"];
    if(wantsChanges){
      out.push(lng==="ur"?"تصدیق شدہ تازہ تبدیلیاں:":lng==="ar"?"التحديثات المنشورة:":"Published changes:");
      for(const c of snapshot.changes.slice(0,5)){
        out.push("• "+clean(lng==="ur"?c.title_ur:c.title_en)+": "+clean(lng==="ur"?c.detail_ur:c.detail_en));
      }
    }
    if(wantsButtons||/ai studio|ورکشاپ|workshop|studio|guide|گائیڈ|پرو|أزرار/iu.test(question)){
      out.push(lng==="ur"?"موجودہ متعلقہ صفحات اور حیثیت:":lng==="ar"?"الأقسام المنشورة وحالتها:":"Current public features and statuses:");
      let selected=snapshot.features.filter(f=>{
        const q=question.toLowerCase();
        const terms=[f.id,f.section,f.title_en,f.title_ur];
        return terms.some(term=>q.includes(String(term||"").toLowerCase()));
      });
      if(!selected.length||BUTTONS.test(question))selected=snapshot.features;
      for(const f of selected.slice(0,8)){
        const title=clean(lng==="ur"?f.title_ur:f.title_en);
        const note=clean(lng==="ur"?f.note_ur:f.note_en);
        const url=new URL(f.href,snapshot.public_site).href;
        out.push("• "+title+" — "+clean(f.status)+"؛ "+note+"\n"+url);
      }
    }
    out.push(lng==="ur"?"حد: یہ صرف عوامی ویب سائٹ کا مورخہ ریکارڈ ہے؛ نجی کوڈ، لائیو گاڑی اسکین، تازہ قیمتیں یا نئی غیر درج شدہ تبدیلیاں اس سے ثابت نہیں ہوتیں۔":lng==="ar"?"الحدود: سجل عام مؤرخ، وليس بيانات خاصة أو تشخيص سيارة أو أسعارًا مباشرة.":"Boundary: Dated public-site inventory only; no private code, live diagnostics or verified market prices.");
    return Object.freeze({
      status:"OK",source_class:"PUBLIC_SITE_STATE",
      answer:out.join("\n\n").slice(0,5500),as_of:snapshot.as_of
    });
  }
  root.EZERO_PUBLIC_SITE_STATE_V0_1=Object.freeze({
    version:"0.1",isSiteQuestion,answer
  });
})(window);
