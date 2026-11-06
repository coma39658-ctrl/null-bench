/* E-ZERO evidence page: on-device only, explicit file selection/consent. */
(()=>{"use strict";
const $=id=>document.getElementById(id),api=window.EZERO_EVIDENCE_V1;
if(!api)return;
const dict={
ur:{
backLink:"↩ E-ZERO مرکزی صفحہ",langLabel:"زبان",headline:"SHA-256 اور کرپٹوگرافک ثبوت",
lead:"فائل اپنے فون پر رہتی ہے؛ آپ کی اجازت سے اصل فائل، SHA-256 اور دستخط شدہ ثبوت ایک ZIP میں محفوظ ہوں گے۔ سرور پر میڈیا اپلوڈ نہیں ہوگا۔",
exportHeading:"1. فائل اور ثبوت ایک ساتھ محفوظ کریں",chooseLabel:"اپنی مجاز آواز، ویڈیو، تصویر یا دستاویز منتخب کریں",
limit:"زیادہ سے زیادہ 32 MB؛ بڑی فائل کے لیے فی الحال تجرباتی حد ہے۔",
consentText:"میں تصدیق کرتا/کرتی ہوں کہ مجھے اس فائل کو محفوظ اور شیئر کرنے کی اجازت ہے؛ جہاں ضروری ہے ریکارڈنگ کی رضامندی بھی موجود ہے۔",
save:"اصل فائل + ثبوت (.zip) بنائیں",verifyHeading:"2. محفوظ ZIP دوبارہ تصدیق کریں",
verifyLabel:"E-ZERO ثبوت والی ZIP منتخب کریں",verify:"SHA-256 اور دستخط چیک کریں",
deadline:"موصولہ عارضی میڈیا کو اصل E-ZERO سیشن میں 10 منٹ کے اندر محفوظ کرنا ہوگا؛ اس صفحے پر پہلے سے موجود فائل کا وصولی وقت تصدیق شدہ نہیں۔",
warning:"خودساختہ براؤزر دستخط عدالت یا حکومت کا سرٹیفکیٹ نہیں، اور فون کا وقت آزاد ٹائم اسٹیمپ نہیں۔ ثبوت کے ماخذ، رضامندی اور قانونی قبولیت کا الگ جائزہ ضروری ہے۔",
footer:"E-ZERO کا یہ ٹول میڈیا جمع، فروخت یا سرور پر محفوظ نہیں کرتا۔ ڈاؤن لوڈ کی گئی فائل کو 10 منٹ بعد E-ZERO خود حذف نہیں کر سکتا۔",
idle:"فائل منتخب کریں؛ کوئی خودکار ریکارڈنگ نہیں۔",verifyIdle:"تصدیق کے لیے ZIP منتخب کریں۔",
consentNeeded:"فائل منتخب کریں اور ضروری اجازت کی تصدیق کریں۔",
creating:"محفوظ ثبوت تیار ہو رہا ہے؛ فائل اسی فون پر رہے گی۔",
created:"✓ SHA-256 اور ECDSA دستخط کے ساتھ ثبوت تیار ہے۔ ZIP محفوظ کریں۔",
download:"⬇ اصل فائل اور ثبوت ایک ساتھ محفوظ کریں",
blocked:"ڈاؤن لوڈ نہیں کھلا تو نیچے سبز Save لنک دبائیں۔",
verifyWorking:"ثبوت اور اصل فائل دوبارہ چیک ہو رہے ہیں۔",
valid:"✓ فائل کے بائٹس اور خودساختہ کلید کا دستخط درست ہیں۔",
invalid:"✕ ثبوت کی تصدیق ناکام؛ فائل پر انحصار نہ کریں۔",
hash:"SHA-256",fingerprint:"دستخطی کلید کا فنگرپرنٹ",
timestamp:"وقت: صرف فون کی گھڑی — آزاد تصدیق نہیں",
legal:"عدالتی قبولیت: اس ٹول سے ثابت نہیں",
fail:"کارروائی ناکام"
},
en:{
backLink:"↩ E-ZERO home",langLabel:"Language",headline:"SHA-256 & cryptographic evidence",
lead:"The file stays on your device. With explicit consent, export the original, SHA-256 and signed proof together in one ZIP. No media upload.",
exportHeading:"1. Save original plus proof",chooseLabel:"Choose an authorized audio, video, image or document",
limit:"Up to 32 MB per file in this experimental version.",
consentText:"I have the necessary rights to save and share this file, including recording consent where required.",
save:"Make original + proof (.zip)",verifyHeading:"2. Verify a saved ZIP",
verifyLabel:"Choose an E-ZERO evidence ZIP",verify:"Verify SHA-256 and signature",
deadline:"E-ZERO transient received media must be saved within 10 minutes in the original session. This page cannot attest when an existing file was received.",
warning:"A self-signed browser key is not a government or court certificate. Device clock time is not independently trusted. Source, consent and legal admissibility need separate verification.",
footer:"This tool does not sell, upload or store media on an E-ZERO server. Already downloaded files cannot be remotely deleted after 10 minutes.",
idle:"Choose a file. No automatic recording.",verifyIdle:"Choose a ZIP for verification.",
consentNeeded:"Select a file and confirm consent.",creating:"Creating a local signed proof...",
created:"✓ Signed proof generated. Save your ZIP.",download:"⬇ Save original and proof ZIP",
blocked:"If download did not open, use the Save link below.",
verifyWorking:"Checking the original and its proof...",valid:"✓ Media bytes and self-signed key verified.",
invalid:"✕ Verification failed. Do not rely on this file.",
hash:"SHA-256",fingerprint:"Signing key fingerprint",timestamp:"Time: local device clock only",
legal:"Legal admissibility: not established",fail:"Action failed"
},
ar:{
backLink:"↩ الصفحة الرئيسية E-ZERO",langLabel:"اللغة",headline:"بصمة SHA-256 وإثبات التوقيع الرقمي",
lead:"يبقى الملف في جهازك. بموافقتك تُحفظ النسخة الأصلية والبصمة والتوقيع في ZIP واحد. دون رفع الوسائط للخادم.",
exportHeading:"1. حفظ الملف مع الإثبات",chooseLabel:"اختر صوتاً أو فيديو أو صورة أو وثيقة لديك حق حفظها",
limit:"الحد الحالي 32 ميغابايت في النسخة التجريبية.",
consentText:"أؤكد امتلاكي الإذن القانوني اللازم لحفظ الملف ومشاركته، وموافقة التسجيل عند الحاجة.",
save:"إنشاء ملف ZIP مع الإثبات",verifyHeading:"2. التحقق من ZIP",
verifyLabel:"اختر ZIP للأدلة من E-ZERO",verify:"تحقق من SHA-256 والتوقيع",
deadline:"تُحفظ الوسائط المؤقتة المستلمة خلال عشر دقائق داخل الجلسة الأصلية. هذه الصفحة لا تتحقق من زمن استلام الملفات القديمة.",
warning:"التوقيع الذاتي للمتصفح ليس شهادة من محكمة أو جهة حكومية؛ ساعة الهاتف ليست توقيتاً موثوقاً مستقلاً. مصدر الدليل والموافقة والقبول القانوني بحاجة إلى تحقق منفصل.",
footer:"هذه الأداة لا تبيع أو ترفع أو تحفظ الوسائط على خادم E-ZERO. لا يمكن حذف الملفات التي تم تنزيلها مسبقاً عن بعد.",
idle:"اختر ملفاً؛ لا تسجيل تلقائياً.",verifyIdle:"اختر ملف ZIP للتحقق.",
consentNeeded:"اختر ملفاً وأكد الموافقة.",creating:"يُنشأ الإثبات محلياً...",
created:"✓ أُنشئ إثبات موقّع. احفظ ZIP.",download:"⬇ حفظ الأصل والإثبات",
blocked:"إذا لم يبدأ التنزيل استخدم رابط الحفظ.",
verifyWorking:"جارٍ فحص الملف الأصلي والإثبات...",
valid:"✓ بايتات الملف والتوقيع الذاتي سليمة.",invalid:"✕ فشل التحقق. لا تعتمد على الملف.",
hash:"SHA-256",fingerprint:"بصمة مفتاح التوقيع",timestamp:"الوقت: ساعة الجهاز فقط",
legal:"القبول القضائي: غير مثبت",fail:"فشل الإجراء"
}};
const staticIds=["backLink","langLabel","headline","lead","exportHeading","chooseLabel","limit",
  "consentText","save","verifyHeading","verifyLabel","verify","deadline","warning","footer"];
const t=k=>(dict[$("lang").value]||dict.ur)[k]||k;
function translate(){
  const lang=$("lang").value;document.documentElement.lang=lang;
  document.documentElement.dir=lang==="en"?"ltr":"rtl";
  for(const id of staticIds){const el=$(id);if(el)el.childNodes.length===1||id!=="langLabel"?
    (el.textContent=t(id)):null;}
}
function status(id,key,kind="info",other=""){
  const el=$(id);el.dataset.kind=kind;el.textContent=t(key)+(other?"\n"+other:"");
}
function meta(id,hashValue,key){
  const el=$(id);el.hidden=false;
  el.textContent=t("hash")+": "+hashValue+"\n"+t("fingerprint")+": "+key+
    "\n"+t("timestamp")+"\n"+t("legal");
}
function canSave(){
  $("save").disabled=!($("mediaFile").files?.[0]&&$("consent").checked);
}
let priorUrl=null;
function saveLink(blob,name){
  if(priorUrl){URL.revokeObjectURL(priorUrl);priorUrl=null;}
  const url=URL.createObjectURL(blob),anchor=document.createElement("a");
  priorUrl=url;anchor.href=url;anchor.download=name;anchor.textContent=t("download");
  anchor.style.display="block";anchor.style.marginTop="12px";anchor.style.color="#8cf7b5";
  anchor.style.fontWeight="700";anchor.id="saveProofLink";
  $("saveStatus").after(anchor);
  const prev=document.querySelectorAll("#saveProofLink");for(const el of prev)if(el!==anchor)el.remove();
  anchor.click(); // Browser may block async downloads; visible link always remains.
}
$("lang").addEventListener("change",translate);
$("mediaFile").addEventListener("change",canSave);
$("consent").addEventListener("change",canSave);
$("save").addEventListener("click",async()=>{
  const file=$("mediaFile").files?.[0];
  if(!file||!$("consent").checked)return status("saveStatus","consentNeeded","error");
  $("save").disabled=true;status("saveStatus","creating");
  try{
    const {archive,manifest}=await api.packageBlob(file,file.name,{userConsent:true});
    const name=manifest.file.name.replace(/[^A-Za-z0-9._-]/g,"_").slice(0,50);
    saveLink(archive,(name||"E-ZERO")+".ezero-proof.zip");
    meta("saveMeta",manifest.file.sha256,manifest.signature.keyFingerprintSha256);
    status("saveStatus","created","success");
  }catch(e){status("saveStatus","fail","error",String(e.message||"ERROR").slice(0,90));}
  finally{canSave();}
});
$("verify").addEventListener("click",async()=>{
  const file=$("verifyFile").files?.[0];
  if(!file)return status("verifyStatus","verifyIdle","error");
  $("verify").disabled=true;$("verifyMeta").hidden=true;status("verifyStatus","verifyWorking");
  try{
    const result=await api.verifyArchive(file);
    if(result.ok){
      status("verifyStatus","valid","success");
      meta("verifyMeta",result.sha256,result.keyFingerprintSha256);
    }else status("verifyStatus","invalid","error",result.reason);
  }catch(e){status("verifyStatus","fail","error",String(e.message||"ERROR").slice(0,90));}
  finally{$("verify").disabled=false;}
});
window.addEventListener("pagehide",()=>{if(priorUrl){URL.revokeObjectURL(priorUrl);priorUrl=null;}});
translate();canSave();
})();
