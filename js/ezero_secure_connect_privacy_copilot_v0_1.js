/*
 * E-ZERO Privacy Copilot v0.1 — isolated browser-only AI readiness laboratory.
 * Security truth, human-verifiable fingerprint phrase, opt-in local AI translator,
 * opt-in locally processed captions, manually curated offline phrases and
 * deterministic sensitive-text warnings. NO remote AI fallback, analytics,
 * network API, storage, background polling, media recording, automatic mic.
 * This is NOT a machine-learning fraud detector or a verified human identity.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const words={
 ur:{
  title:"✨ AI Privacy Copilot — ذہین اور محفوظ کال",
  intro:"آپ کی نجی گفتگو خودکار طور پر نہ پڑھی جائے گی نہ ریکارڈ ہوگی۔ موبائل پر AI نہ ہو تو مقامی حفاظتی سہولتیں کام کریں گی۔",
  trustTitle:"🔐 دونوں فونوں کا حفاظتی کوڈ",
  trustNone:"ابھی دونوں فونوں کی ڈیجیٹل شناخت نہیں ملی؛ حفاظتی کوڈ دستیاب نہیں۔",
  trustCompare:"اس 12 ہندسوں کے کوڈ کو دوسرے فون سے زبانی ملائیں۔ یہ حقیقی انسان کی شناخت کا خودکار ثبوت نہیں۔",
  trustError:"حفاظتی کوڈ بنانے کی سہولت دستیاب نہیں۔",
  identityNone:"دوست کی شناخت کی دستخط شدہ تصدیق اس سیشن میں نہیں ہوئی۔",
  identityYes:"دوست کی دستخط شدہ ڈیجیٹل شناخت اسی سیشن میں چیک ہوئی؛ انسانی شناخت الگ چیک کریں۔",
  identityNo:"ڈیجیٹل دستخط کی تصدیق ناکام ہوئی؛ اس کوڈ پر اعتماد نہ کریں۔",
  callNone:"ابھی حقیقی WebRTC کال کنیکٹ نہیں۔",
  callYes:"WebRTC کنکشن قائم ہے؛ یہ گفتگو کی انسانی شناخت یا ریکارڈنگ نہ ہونے کا ثبوت نہیں۔",
  callLost:"WebRTC کال منقطع ہے۔",
  safetyNone:"آپ کے لکھے ہوئے پیغام کی صرف اسی فون پر خودکار حفاظتی جانچ ہوگی۔",
  safetyLow:"عام حساس الفاظ کا نمونہ نہیں ملا؛ یہ پیغام محفوظ ہونے کی ضمانت نہیں۔",
  safetyOtp:"ممکنہ OTP، PIN یا پاس ورڈ: اسے کسی کو نہ بھیجیں، چاہے وہ دوست ہونے کا دعویٰ کرے۔",
  safetyFinance:"ممکنہ بینک یا ادائیگی کی تفصیل: بھیجنے سے پہلے الگ تصدیق کریں۔",
  safetyLink:"پیغام میں لنک ہے؛ جعلی ویب سائٹ اور فریب کا خطرہ ہو سکتا ہے۔",
  safetyUrgency:"فوری رقم مانگنے جیسی عبارت ملی؛ دوسری محفوظ راہ سے تصدیق کریں۔",
  confirm:"حساس پیغام روک دیا گیا ہے۔ بھیجنا واقعی ضروری ہو تو الگ سے منظوری دیں۔",
  override:"⚠ خطرہ سمجھ کر یہی پیغام بھیجیں",
  phraseTitle:"⚡ تین زبانوں میں فوری حفاظتی جملے",
  phraseUse:"جملہ لکھنے والے خانے میں رکھیں (خود نہیں بھیجے گا)",
  translationTitle:"🧠 فون پر موجود AI سے ترجمہ — اختیاری",
  translate:"ترجمہ کریں (صرف مقامی AI)",
  translationEmpty:"پہلے پیغام لکھیں۔",
  translationUnsupported:"اس فون یا براؤزر میں مقامی AI ترجمہ دستیاب نہیں۔ متن کسی سرور کو نہیں بھیجا گیا۔",
  translationDownload:"اس زبان کا AI ماڈل پہلے سے موجود نہیں؛ خودکار ڈاؤن لوڈ نہیں کیا گیا۔",
  translationReady:"ترجمہ مقامی براؤزر ماڈل سے بنا ہے؛ غلطی ممکن ہے، اہم بات دوبارہ چیک کریں۔",
  translationError:"مقامی AI ترجمہ ناکام ہوا؛ متن کسی E-ZERO سرور کو نہیں بھیجا گیا۔",
  translationUse:"ترجمہ پیغام کے خانے میں رکھیں (ارسال نہیں)",
  captionTitle:"🎙️ فون پر ہی آواز کے سب ٹائٹلز — اختیاری",
  captionStart:"مقامی سب ٹائٹلز آزمائیں",
  captionStop:"سب ٹائٹلز بند کریں",
  captionUnsupported:"اس براؤزر میں فون پر ہی چلنے والی آواز کی شناخت دستیاب نہیں۔ آن لائن شناخت استعمال نہیں کی گئی۔",
  captionPack:"مقامی زبان کا پیک دستیاب نہیں؛ ہم اسے خودکار ڈاؤن لوڈ نہیں کریں گے۔",
  captionReady:"مقامی مائیک کی شناخت جاری ہے؛ متن صرف اسی فون پر رہے گا۔",
  captionDone:"مقامی آواز کی شناخت مکمل؛ متن عارضی ہے۔",
  captionError:"مقامی آواز کی شناخت دستیاب نہیں رہی؛ کوئی آن لائن متبادل شروع نہیں کیا۔",
  clear:"🧹 عارضی مواد صاف کریں",
  cleared:"عارضی ترجمہ، سب ٹائٹلز اور پیغام صاف ہوگئے۔",
  noAi:"Android پر AI ترجمہ اور مقامی آواز شناخت لازماً دستیاب نہیں؛ کوئی بیرونی AI خودکار طور پر استعمال نہیں ہوگا۔"
 },
 en:{
  title:"✨ AI Privacy Copilot — smarter, safer calls",
  intro:"The app does not automatically read or record private calls. Local security features work even without mobile AI.",
  trustTitle:"🔐 Compare both phones' safety code",
  trustNone:"Both digital fingerprints are not known yet; no safety code.",
  trustCompare:"Compare these 12 digits with your friend by another trusted channel. This does not independently prove a human identity.",
  trustError:"Safety code unavailable.",
  identityNone:"Friend's signed identity has not been reverified this session.",
  identityYes:"Friend's signed digital key was checked this session. Verify the person separately.",
  identityNo:"Signature verification failed. Do not trust this identity.",
  callNone:"No live WebRTC connection yet.",
  callYes:"WebRTC is connected. This does not verify the human or prevent third-party recording.",
  callLost:"WebRTC call disconnected.",
  safetyNone:"Only the text you type is checked locally for common warning patterns.",
  safetyLow:"No listed warning patterns found. That does not prove this message is safe.",
  safetyOtp:"Possible OTP, PIN or password. Never send it, even if someone claims to be a friend.",
  safetyFinance:"Possible bank or payment details. Verify with the recipient separately.",
  safetyLink:"This message contains a link. Check it for impersonation and phishing.",
  safetyUrgency:"Possible urgent request for money. Verify using an independent trusted channel.",
  confirm:"Sensitive message blocked until you explicitly confirm you still want to send it.",
  override:"⚠ Send this message despite the warning",
  phraseTitle:"⚡ Quick security phrases in three languages",
  phraseUse:"Put phrase in the draft (does not send)",
  translationTitle:"🧠 Optional browser on-device AI translation",
  translate:"Translate locally (if available)",
  translationEmpty:"Write a message first.",
  translationUnsupported:"On-device AI translation isn't available in this browser. No text was sent to a server.",
  translationDownload:"Required AI language pack isn't already installed. No automatic download.",
  translationReady:"Translation came from this browser's local AI; verify important meaning.",
  translationError:"Local translation failed. No E-ZERO AI server was contacted.",
  translationUse:"Use translation in draft (does not send)",
  captionTitle:"🎙️ Optional on-device voice captions",
  captionStart:"Try local captions",
  captionStop:"Stop captions",
  captionUnsupported:"True on-device speech recognition isn't supported here. No cloud recognition was started.",
  captionPack:"Local speech language pack isn't ready. No automatic download.",
  captionReady:"Local microphone captions active; transcript stays in this browser.",
  captionDone:"Local dictation finished; transient text only.",
  captionError:"Local dictation failed; no cloud fallback was used.",
  clear:"🧹 Clear temporary content",
  cleared:"Temporary translation, captions and draft cleared.",
  noAi:"Mobile browser AI may be unavailable. No remote AI is silently used."
 },
 ar:{
  title:"✨ مساعد AI للخصوصية — مكالمات ذكية وآمنة",
  intro:"لا يقرأ التطبيق المكالمات الخاصة ولا يسجلها تلقائياً. تعمل ميزات الحماية المحلية دون AI.",
  trustTitle:"🔐 رمز أمان موحد للهاتفين",
  trustNone:"لم تتوفر البصمتان الرقميتان بعد.",
  trustCompare:"قارن هذه الأرقام الـ12 مع صديقك بطريقة موثوقة؛ لا تثبت هوية الشخص تلقائياً.",
  trustError:"تعذر إنشاء رمز الأمان.",
  identityNone:"لم تُتحقق هوية الصديق الموقعة مجدداً في هذه الجلسة.",
  identityYes:"تم التحقق من توقيع المفتاح الرقمي في الجلسة؛ تأكد من الشخص بشكل منفصل.",
  identityNo:"فشل التحقق من التوقيع؛ لا تثق بهذه الهوية.",
  callNone:"لا يوجد اتصال WebRTC حقيقي بعد.",
  callYes:"اتصل WebRTC؛ لا يثبت هوية الشخص ولا يمنع تسجيل الطرف الآخر.",
  callLost:"انقطع اتصال WebRTC.",
  safetyNone:"يُفحص فقط النص الذي تكتبه على هذا الهاتف بحثاً عن مؤشرات خطر.",
  safetyLow:"لم يُكتشف نمط خطر معروف؛ ليس ضماناً للأمان.",
  safetyOtp:"رمز تحقق أو كلمة مرور محتملة؛ لا تشاركها حتى مع من يدّعي أنه صديق.",
  safetyFinance:"تفاصيل مصرفية أو دفع محتملة؛ تأكد بشكل مستقل.",
  safetyLink:"تتضمن الرسالة رابطاً؛ تحقّق من التصيّد وانتحال الهوية.",
  safetyUrgency:"قد تتضمن طلب مال عاجلاً؛ تحقق بوسيلة مستقلة.",
  confirm:"مُنعت الرسالة الحساسة حتى تؤكد الإرسال بنفسك.",
  override:"⚠ أرسل الرسالة رغم التحذير",
  phraseTitle:"⚡ عبارات أمان سريعة بثلاث لغات",
  phraseUse:"ضع العبارة في المسودة (لن تُرسل تلقائياً)",
  translationTitle:"🧠 ترجمة AI محلية في المتصفح — اختيارية",
  translate:"ترجم محلياً إن توفر",
  translationEmpty:"اكتب رسالة أولاً.",
  translationUnsupported:"ترجمة AI المحلية غير متاحة؛ لم يُرسل النص إلى خادم.",
  translationDownload:"حزمة اللغة ليست مثبتة مسبقاً؛ لن يتم تنزيلها تلقائياً.",
  translationReady:"ترجمة محلية آلية؛ تحقق من المعنى المهم.",
  translationError:"فشلت الترجمة المحلية؛ لم يُتصل بخادم E-ZERO.",
  translationUse:"ضع الترجمة في المسودة (دون إرسال)",
  captionTitle:"🎙️ كتابة الكلام على الجهاز — اختيارية",
  captionStart:"جرّب الكتابة الصوتية المحلية",
  captionStop:"إيقاف الكتابة الصوتية",
  captionUnsupported:"التعرف على الكلام محلياً غير مدعوم؛ لم تُستخدم خدمة سحابية.",
  captionPack:"حزمة اللغة المحلية غير متوفرة؛ لا تنزيل تلقائي.",
  captionReady:"تم تشغيل الميكروفون المحلي؛ النص لا يغادر هذا الهاتف.",
  captionDone:"اكتملت الكتابة الصوتية المحلية؛ نص مؤقت فقط.",
  captionError:"تعذرت الكتابة المحلية؛ لا استخدام لخدمة سحابية.",
  clear:"🧹 امسح المحتوى المؤقت",
  cleared:"مُسحت الترجمة والنصوص والمسودة المؤقتة.",
  noAi:"قد لا يعمل AI المحلي على الهاتف؛ لا تُستخدم خدمة AI بعيدة تلقائياً."
 }
};
const lang=()=>["en","ur","ar"].includes($("language")?.value)?$("language").value:"ur";
const tr=k=>(words[lang()]||words.ur)[k]||words.ur[k]||k;
const set=(id,value)=>{const el=$(id);if(el)el.textContent=value;};
let live=false,signed=false,own="",peer="",epoch=0,allowedOnce=false;
let caption=null,translatorResult="",translating=false,recognizing=false;
function renderLang(){
 for(const el of document.querySelectorAll("[data-copilot-i18n]"))
  el.textContent=tr(el.dataset.copilotI18n);
 $("copilotCaptionToggle").textContent=recognizing?tr("captionStop"):tr("captionStart");
 updateIdentity();updateCall();inspectDraft();
}
function signatureState(ok){
 signed=ok===true;
 const state=ok===false?"identityNo":signed?"identityYes":"identityNone";
 set("copilotIdentity",tr(state));
}
function updateCall(){
 set("copilotCall",tr(live?"callYes":"callNone"));
 $("copilotCall").dataset.state=live?"connected":"offline";
}
async function updateIdentity(){
 const my=$("myFingerprint")?.textContent.trim()||"";
 const theirs=$("peerFingerprint")?.textContent.trim()||"";
 if(my===own&&theirs===peer)return;
 own=my;peer=theirs;
 const target=$("copilotSafetyCode");
 if(!/^[a-f0-9]{64}$/.test(own)||!/^[a-f0-9]{64}$/.test(peer)||own===peer){
  target.textContent="—";
  set("copilotSafetyHelp",tr("trustNone"));
  return;
 }
 const ordered=[own,peer].sort().join(":");
 try{
  // 48-bit, domain separated, symmetric across both phones; use only a
  // human-readable comparison, NEVER an automatic trust decision.
  const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",
   new TextEncoder().encode("EZERO-IDENTITY-COMPARE-V1:"+ordered)));
  const n=digest.slice(0,6).reduce((a,x)=>a*256n+BigInt(x),0n).toString(10).padStart(15,"0").slice(-12);
  if(own===my&&peer===theirs){
   target.textContent=n.slice(0,6)+" · "+n.slice(6);
   set("copilotSafetyHelp",tr("trustCompare"));
  }
 }catch(_){target.textContent="—";set("copilotSafetyHelp",tr("trustError"));}
}
function risks(raw){
 const value=String(raw||"").slice(0,2000);
 if(!value.trim())return [];
 const hits=[];
 const oneTime=/(?:\b(?:otp|pin|password|passcode|verification code|one.time code|cvv|cvc)\b|رمز\s*(?:التحقق|السري|تأكيد)|كلمة\s*المرور|پاس\s*ورڈ|پاسورڈ|تصدیقی\s*کوڈ|او\s*ٹی\s*پی)/iu;
 const digits=/(?:^|[^\d])\d[\d\s-]{3,11}\d(?:[^\d]|$)/u;
 const sensitiveNumber=/(?:\b(?:\d[ -]?){13,19}\b|\bSA\d{22}\b)/i;
 if(oneTime.test(value)||sensitiveNumber.test(value)&&/\b(?:cvv|pin|card|bank|visa|mastercard)\b/i.test(value))
  hits.push("safetyOtp");
 if(/\b(?:iban|swift|bank account|account number|credit card|debit card)\b|\bSA\d{22}\b|بینک|اکاؤنٹ\s*نمبر|حساب\s*بنكي|بطاقة\s*بنكية|رقم\s*الحساب/iu.test(value))
  hits.push("safetyFinance");
 if(/https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|sa)\/\S*/i.test(value))
  hits.push("safetyLink");
 const urgency=/\b(?:urgent|immediately|now|quickly|emergency)\b|فوراً|فوری|جلدی|ابھی|عاجل|الآن|بسرعة/iu.test(value);
 const money=/\b(?:money|cash|transfer|payment|wire|gift card|send funds)\b|رقم|پیسے|ریال|حوالہ|تحويل|مال|دفع/iu.test(value);
 if(urgency&&money)hits.push("safetyUrgency");
 if(!hits.length&&digits.test(value)&&/\b(?:otp|pin|code|رمز|کوڈ)\b/i.test(value))
  hits.push("safetyOtp");
 return hits;
}
let previousDraft="";
function inspectDraft(){
 const value=$("sendText").value;
 if(value!==previousDraft){previousDraft=value;allowedOnce=false;$("copilotOverride").hidden=true;epoch++;translatorResult="";}
 const issues=risks(value);
 const el=$("copilotRisk");
 el.dataset.state=issues.length?"warning":value.trim()?"neutral":"idle";
 el.textContent=issues.length?issues.map(tr).join(" "):tr(value.trim()?"safetyLow":"safetyNone");
 if(!issues.length)$("copilotOverride").hidden=true;
 return issues;
}
$("sendText").addEventListener("input",inspectDraft);
// Capture phase runs before the original send handler. This guard is best
// effort for this UI, not a security boundary for hostile browser extensions.
$("sendMessage").addEventListener("click",e=>{
 const risk=inspectDraft();
 if(risk.length&&!allowedOnce){
  e.preventDefault();e.stopImmediatePropagation();
  $("copilotOverride").hidden=false;
  set("copilotRisk",risk.map(tr).join(" ")+" "+tr("confirm"));
  return;
 }
 allowedOnce=false;$("copilotOverride").hidden=true;
},true);
$("copilotOverride").addEventListener("click",()=>{
 if(!risks($("sendText").value).length){$("copilotOverride").hidden=true;return;}
 allowedOnce=true;
 $("sendMessage").click();
});
const phrases={
 heard:{ur:"کیا آپ میری آواز سن سکتے ہیں؟",en:"Can you hear me clearly?",ar:"هل تسمع صوتي بوضوح؟"},
 later:{ur:"میں آپ کو کچھ دیر بعد واپس کال کروں گا۔",en:"I'll call you back shortly.",ar:"سأتصل بك بعد قليل."},
 verify:{ur:"براہِ کرم اپنی شناخت کسی دوسرے محفوظ ذریعے سے تصدیق کریں۔",en:"Please verify your identity using another trusted channel.",ar:"يرجى تأكيد هويتك عبر وسيلة موثوقة أخرى."},
 otp:{ur:"اپنا OTP یا پاس ورڈ کسی کو نہ بتائیں۔",en:"Never share an OTP or password.",ar:"لا تشارك رمز التحقق أو كلمة المرور مع أحد."}
};
$("copilotPhraseUse").addEventListener("click",()=>{
 const key=$("copilotPhrase").value,loc=$("copilotPhraseLanguage").value;
 if(!phrases[key]?.[loc])return;
 $("sendText").value=phrases[key][loc];
 $("sendText").dispatchEvent(new Event("input",{bubbles:true}));
});
$("copilotTranslate").addEventListener("click",async()=>{
 if(translating)return;
 const draft=$("sendText").value.trim().slice(0,500);
 const from=$("copilotSourceLang").value,to=$("copilotTargetLang").value;
 if(!draft){set("copilotTranslationStatus",tr("translationEmpty"));return;}
 if(from===to){set("copilotTranslationStatus",tr("translationUnsupported"));return;}
 if(typeof globalThis.Translator?.availability!=="function"||
   typeof globalThis.Translator?.create!=="function"){
  set("copilotTranslationStatus",tr("translationUnsupported"));return;
 }
 const ownEpoch=++epoch;translating=true;
 $("copilotTranslate").disabled=true;
 try{
  const available=await globalThis.Translator.availability({sourceLanguage:from,targetLanguage:to});
  // Fail closed: do not download model or send any text to remote AI.
  if(available!=="available"){set("copilotTranslationStatus",tr("translationDownload"));return;}
  if(ownEpoch!==epoch)return;
  const engine=await globalThis.Translator.create({sourceLanguage:from,targetLanguage:to});
  try{
   const translated=await engine.translate(draft);
   if(ownEpoch!==epoch||$("sendText").value.trim().slice(0,500)!==draft)return;
   translatorResult=String(translated||"").slice(0,2000);
   set("copilotTranslationResult",translatorResult);
   set("copilotTranslationStatus",tr("translationReady"));
  }finally{engine.destroy?.();}
 }catch(_){set("copilotTranslationStatus",tr("translationError"));}
 finally{translating=false;$("copilotTranslate").disabled=false;}
});
$("copilotTranslationUse").addEventListener("click",()=>{
 if(!translatorResult)return;
 $("sendText").value=translatorResult;
 $("sendText").dispatchEvent(new Event("input",{bubbles:true}));
});
function stopCaptions(){
 if(caption){const old=caption;caption=null;
  try{old.abort();}catch(_){}}
 recognizing=false;
 $("copilotCaptionToggle").textContent=tr("captionStart");
}
$("copilotCaptionToggle").addEventListener("click",async()=>{
 if(recognizing){stopCaptions();set("copilotCaptionStatus",tr("captionDone"));return;}
 const Speech=globalThis.SpeechRecognition;
 // Important: prefixed or cloud-based SpeechRecognition MUST NOT be used.
 if(typeof Speech!=="function"||typeof Speech.available!=="function"){
  set("copilotCaptionStatus",tr("captionUnsupported"));return;
 }
 const loc=lang()==="ar"?"ar-SA":lang()==="en"?"en-US":"ur-PK";
 const ownEpoch=++epoch;
 try{
  const state=await Speech.available({langs:[loc],processLocally:true});
  if(state!=="available"){set("copilotCaptionStatus",tr("captionPack"));return;}
  if(ownEpoch!==epoch)return;
  const instance=new Speech();
  if(!("processLocally" in instance)){
   set("copilotCaptionStatus",tr("captionUnsupported"));return;
  }
  instance.processLocally=true;
  instance.lang=loc;instance.continuous=false;instance.interimResults=false;
  instance.onresult=event=>{
   if(caption!==instance)return;
   const part=event.results?.[0]?.[0]?.transcript;
   if(typeof part==="string")set("copilotCaptionResult",part.slice(0,500));
  };
  instance.onerror=()=>{if(caption===instance){stopCaptions();set("copilotCaptionStatus",tr("captionError"));}};
  instance.onend=()=>{if(caption===instance){stopCaptions();set("copilotCaptionStatus",tr("captionDone"));}};
  // This explicit click is the only activation path; no recording or upload.
  caption=instance;recognizing=true;
  instance.start();
  $("copilotCaptionToggle").textContent=tr("captionStop");
  set("copilotCaptionStatus",tr("captionReady"));
 }catch(_){stopCaptions();set("copilotCaptionStatus",tr("captionError"));}
});
function purge(){
 epoch++;stopCaptions();translatorResult="";allowedOnce=false;previousDraft="";
 $("copilotOverride").hidden=true;
 $("sendText").value="";set("copilotTranslationResult","");set("copilotCaptionResult","");
 set("copilotTranslationStatus","");set("copilotCaptionStatus","");
 set("copilotRisk",tr("cleared"));
}
$("copilotClear").addEventListener("click",purge);
["hangup","closeAll","roomEnd"].forEach(id=>$(id)?.addEventListener("click",purge));
document.addEventListener("ezero:call-status",event=>{
 const stage=event.detail?.stage;
 if(stage==="connected")live=true;
 if(["idle","offline","iceNoRoute","signalInvalid","micDenied","fingerprintMismatch"].includes(stage))live=false;
 updateCall();
 if(!live&&["idle","offline","iceNoRoute"].includes(stage))stopCaptions();
});
document.addEventListener("ezero:friend-verification",event=>{
 if(event.detail?.ok===true&&event.detail?.signed===true)signatureState(true);
 else if(event.detail?.ok===false)signatureState(false);
 else signatureState(null);
 void updateIdentity();
});
const observe=new MutationObserver(()=>{void updateIdentity();});
["myFingerprint","peerFingerprint"].forEach(id=>{
 const el=$(id);if(el)observe.observe(el,{childList:true,characterData:true,subtree:true});
});
$("language").addEventListener("change",renderLang);
window.addEventListener("pagehide",()=>{observe.disconnect();purge();});
signatureState(null);renderLang();set("copilotTranslationStatus",tr("noAi"));
})();
