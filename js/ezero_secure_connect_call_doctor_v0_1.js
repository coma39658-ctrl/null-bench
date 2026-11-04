/*
 * E-ZERO Call Doctor v0.1 — one-click, read-only device readiness.
 * Zero microphone/camera requests, zero network fetches, no polling or log
 * upload, no persistent storage and no SDP/QR/fingerprint/IP/user-agent export.
 * Observed browser capability is NOT proof of a successful actual call.
 * Both phones must display the SAME VERSION before pairing. PWA offline cache
 * can show older assets even when the standalone app appears installed.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const VERSION="EZERO-CALL-20261104-DOCTOR-V1";
const dict={
 ur:{
  title:"🩺 E-ZERO Call Doctor — فون کی کال جانچ",
  intro:"ایک بار دبائیں: فون، براؤزر اور ایپ ورژن کی جانچ ہوگی۔ مائیک یا کیمرہ نہیں کھلے گا، کسی سرور کو رپورٹ نہیں جائے گی۔",
  run:"✓ اس فون کی محفوظ جانچ کریں",
  copy:"📋 غیر نجی رپورٹ کاپی کریں",
  before:"جانچ شروع نہیں ہوئی۔ یہ مقامی جانچ ہے، اصل کال نہیں۔",
  done:"اس فون کی جانچ مکمل؛ نتیجے کا ورژن دوسرے فون سے ضرور ملائیں۔",
  copyOk:"صرف غیر نجی تشخیصی رپورٹ کاپی ہوگئی۔",
  copyFail:"خودکار کاپی دستیاب نہیں؛ نیچے رپورٹ منتخب کرکے کاپی کریں۔",
  version:"ایپ ورژن",
  mode:"کھولنے کا طریقہ",
  secure:"محفوظ HTTPS",
  crypto:"ڈیجیٹل دستخط و خفیہ کاری",
  webrtc:"براہِ راست WebRTC",
  media:"مائیکروفون کی صلاحیت",
  camera:"کیمرہ کی صلاحیت",
  socket:"خودکار کال روم WebSocket",
  permission:"مائیکروفون اجازت کی موجودہ حالت",
  connection:"انٹرنیٹ کی عمومی علامت",
  cache:"ایپ کا محفوظ شدہ ورژن",
  call:"اصل WebRTC کال",
  pilot:"Cloudflare کال روم",
  normal:"Chrome / براؤزر ٹیب",
  standalone:"انسٹال شدہ ایپ / Standalone",
  embedded:"اندرونی ایپ براؤزر ممکن ہے",
  supported:"دستیاب",
  unavailable:"دستیاب نہیں",
  permissionGranted:"اجازت پہلے دی گئی ہے، لیکن ابھی مائیک کھولا نہیں گیا",
  permissionPrompt:"اجازت صرف کال شروع کرتے وقت مانگی جائے گی",
  permissionDenied:"مائیکروفون کی اجازت بند ہے؛ براؤزر کی سائٹ سیٹنگز سے اجازت دیں",
  permissionUnknown:"اجازت کی حالت نہیں پڑھی جا سکی؛ مائیک نہیں کھولا گیا",
  networkOnline:"فون آن لائن بتاتا ہے، اصل کال نیٹ ورک ابھی آزمائی نہیں",
  networkOffline:"فون آف لائن بتاتا ہے؛ انٹرنیٹ دوبارہ چیک کریں",
  cacheControlled:"Service Worker فعال ہے؛ آف لائن پرانا صفحہ ظاہر ہو سکتا ہے",
  cacheUncontrolled:"اس صفحے پر Service Worker کنٹرول کی تصدیق نہیں ہوئی",
  callConnected:"حقیقی WebRTC کنکشن قائم ہونے کی اطلاع ملی",
  callAbsent:"ابھی اس فون پر حقیقی WebRTC کال کنیکٹ نہیں",
  pilotDisabled:"آن لائن ایک لنک کال ابھی بند تجرباتی Staging میں ہے",
  compare:"دونوں فونوں پر یہی ایپ ورژن ملائیں؛ مختلف ورژن ہوں تو دونوں کو انٹرنیٹ کے ساتھ Chrome میں تازہ کھولیں۔",
  micHint:"یہ جانچ خود سے اجازت نہیں مانگتی۔ کال شروع کرنے پر ہی مائیک/کیمرہ کی اجازت دی جا سکتی ہے۔",
  noInternetGuarantee:"یہ صلاحیت کی جانچ ہے؛ دوسرے فون تک کال پہنچنے یا نیٹ ورک راستہ ملنے کی ضمانت نہیں۔",
  result:"غیر نجی تشخیصی رپورٹ",
  yes:"درست",
  warning:"توجہ",
  blocked:"مسئلہ",
  info:"معلومات"
 },
 en:{
  title:"🩺 E-ZERO Call Doctor — phone readiness",
  intro:"One tap checks device, browser and app version. No camera or microphone activation and no report upload.",
  run:"✓ Check this phone safely",
  copy:"📋 Copy privacy-safe report",
  before:"Not checked yet. This is a local preflight, not a connected call.",
  done:"Readiness checked. Compare the version with the other phone.",
  copyOk:"The privacy-safe diagnostic was copied.",
  copyFail:"Clipboard blocked. Select and copy the report below.",
  version:"App version",mode:"Opening mode",secure:"Secure HTTPS context",
  crypto:"Digital signatures and encryption",webrtc:"Direct WebRTC",
  media:"Microphone API",camera:"Camera API",socket:"Automatic call-room WebSocket",
  permission:"Current microphone permission",connection:"Internet indicator",
  cache:"Offline cached app",call:"Actual WebRTC call",pilot:"Cloudflare call rooms",
  normal:"Chrome / browser tab",standalone:"Installed app / standalone",
  embedded:"May be an embedded in-app browser",
  supported:"Available",unavailable:"Unavailable",
  permissionGranted:"Already granted; microphone not started by this test",
  permissionPrompt:"Will ask only when a call is started",
  permissionDenied:"Microphone blocked; check the browser's site settings",
  permissionUnknown:"Permission state unavailable; microphone not started",
  networkOnline:"Browser says online; live call connectivity not tested",
  networkOffline:"Browser reports offline; check internet connection",
  cacheControlled:"Service Worker controls this page; offline cache can be outdated",
  cacheUncontrolled:"No controlling Service Worker confirmed on this page",
  callConnected:"Browser reported a real connected WebRTC peer",
  callAbsent:"No connected WebRTC call on this phone yet",
  pilotDisabled:"Online one-link rooms remain in disabled staging",
  compare:"Compare this exact version on both phones. If different, open the current page online in Chrome on both.",
  micHint:"Preflight never requests permission. The browser may ask for microphone/camera access only when a call is started.",
  noInternetGuarantee:"Capability check only; not evidence of reachability to the other phone.",
  result:"Privacy-safe diagnostic report",yes:"Ready",warning:"Review",blocked:"Blocked",info:"Info"
 },
 ar:{
  title:"🩺 طبيب اتصال E-ZERO — فحص الهاتف",
  intro:"نقرة واحدة لفحص الهاتف والمتصفح والإصدار دون تشغيل الميكروفون أو الكاميرا أو رفع بيانات.",
  run:"✓ افحص هذا الهاتف بأمان",copy:"📋 انسخ التقرير غير الشخصي",
  before:"لم يُفحص بعد؛ هذه ليست مكالمة متصلة.",
  done:"اكتمل الفحص؛ قارن الإصدار بين الهاتفين.",
  copyOk:"نُسخ التقرير غير الشخصي.",copyFail:"النسخ التلقائي غير متاح؛ حدّد التقرير وانسخه.",
  version:"إصدار التطبيق",mode:"طريقة الفتح",secure:"سياق HTTPS الآمن",
  crypto:"التوقيع والتشفير",webrtc:"WebRTC المباشر",media:"واجهة الميكروفون",
  camera:"واجهة الكاميرا",socket:"WebSocket لغرفة المكالمة",
  permission:"حالة إذن الميكروفون",connection:"مؤشر الإنترنت",cache:"نسخة التطبيق المحفوظة",
  call:"اتصال WebRTC حقيقي",pilot:"غرف Cloudflare",
  normal:"Chrome / تبويب المتصفح",standalone:"تطبيق مثبت / مستقل",
  embedded:"قد يكون متصفحاً داخل تطبيق آخر",
  supported:"متاح",unavailable:"غير متاح",
  permissionGranted:"الإذن ممنوح مسبقاً؛ لم يبدأ الميكروفون بالفحص",
  permissionPrompt:"يُطلب الإذن فقط عند بدء المكالمة",
  permissionDenied:"الميكروفون محظور؛ راجع إعدادات إذن الموقع",
  permissionUnknown:"حالة الإذن غير معروفة؛ لم يبدأ الميكروفون",
  networkOnline:"المتصفح يقول متصل؛ لم نختبر اتصال المكالمة",
  networkOffline:"المتصفح يشير إلى عدم الاتصال بالإنترنت",
  cacheControlled:"Service Worker يعمل؛ قد تظهر نسخة قديمة دون إنترنت",
  cacheUncontrolled:"لم يُؤكَّد Service Worker المتحكم في الصفحة",
  callConnected:"أبلغ المتصفح عن اتصال WebRTC حقيقي",
  callAbsent:"لا يوجد اتصال WebRTC فعلي بعد",
  pilotDisabled:"غرف الروابط المباشرة ما زالت مغلقة تجريبياً",
  compare:"قارن الإصدار نفسه على الهاتفين؛ إن اختلف افتح الصفحة عبر Chrome مع الإنترنت.",
  micHint:"الفحص لا يطلب الإذن؛ قد يُطلب عند بدء المكالمة فقط.",
  noInternetGuarantee:"هذا فحص قدرات، وليس ضماناً للاتصال بالهاتف الآخر.",
  result:"تقرير غير شخصي",yes:"جاهز",warning:"مراجعة",blocked:"محظور",info:"معلومات"
 }
};
let last=null,lastCopy=null,actuallyConnected=false;
const loc=()=>["ur","en","ar"].includes($("language")?.value)?$("language").value:"ur";
const t=k=>(dict[loc()]||dict.ur)[k]||dict.ur[k]||k;
function setText(id,text){$(id).textContent=text;}
function mode(){
 const standalone=window.matchMedia?.("(display-mode: standalone)")?.matches||navigator.standalone===true;
 if(standalone)return "standalone";
 const isEmbedded=/\b(?:; wv\)|\bwv\b|FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger)/i.test(navigator.userAgent||"");
 return isEmbedded?"embedded":"normal";
}
function checkLabel(type,name,detail){
 return {type,name,detail};
}
function summary(){
 // The report intentionally excludes exact UA/device, location, addresses,
 // WebRTC SDP, connection candidates, fingerprints, room IDs and call links.
 return [
   "E-ZERO CALL DOCTOR / READ-ONLY SELF-CHECK",
   "VERSION: "+VERSION,
   ...last.map(x=>x.name+": "+x.detail),
   "NOTE: "+t("noInternetGuarantee")
 ].join("\n");
}
function display(){
 for(const el of document.querySelectorAll("[data-doctor-i18n]"))
  el.textContent=t(el.dataset.doctorI18n);
 setText("doctorVersion",VERSION);
 if(!last){
  setText("doctorStatus",t("before"));
  $("doctorChecks").replaceChildren();
  $("doctorReport").value="";
  $("doctorCopy").disabled=true;
  return;
 }
 const entries=last.map(item=>{
  // Keep diagnostics generic; never include the caller's session content.
  const r=document.createElement("div");
  r.className="doctor-check";
  r.dataset.type=item.type;
  const label=document.createElement("strong");label.textContent=item.name;
  const value=document.createElement("span");value.textContent=item.detail;
  r.append(label,value);
  return r;
 });
 $("doctorChecks").replaceChildren(...entries);
 setText("doctorStatus",t("done"));
 $("doctorReport").value=summary();
 $("doctorCopy").disabled=false;
}
async function run(){
 $("doctorRun").disabled=true;
 const lang=loc(); // pass stable language throughout this one-shot test
 const label=key=>(dict[lang]||dict.ur)[key]||dict.ur[key]||key;
 const check=(type,name,detail)=>checkLabel(type,label(name),label(detail));
 const secure=window.isSecureContext===true;
 const subtle=secure&&Boolean(globalThis.crypto?.subtle);
 const rtc=typeof RTCPeerConnection==="function";
 const media=Boolean(navigator.mediaDevices?.getUserMedia);
 const socket=typeof WebSocket==="function";
 const online=navigator.onLine!==false;
 let permission="permissionUnknown";
 // Read-only permission query; never call getUserMedia or prompt().
 if(navigator.permissions?.query){
  try{
   const state=(await navigator.permissions.query({name:"microphone"}))?.state;
   if(state==="granted")permission="permissionGranted";
   else if(state==="prompt")permission="permissionPrompt";
   else if(state==="denied")permission="permissionDenied";
  }catch(_){}
 }
 const rows=[
  check("info","version","version"),
  check("info","mode",mode()),
  check(secure?"pass":"block","secure",secure?"supported":"unavailable"),
  check(subtle?"pass":"block","crypto",subtle?"supported":"unavailable"),
  check(rtc?"pass":"block","webrtc",rtc?"supported":"unavailable"),
  check(media?"pass":"block","media",media?"supported":"unavailable"),
  check(media?"info":"warning","camera",media?"supported":"unavailable"),
  check(socket?"pass":"block","socket",socket?"supported":"unavailable"),
  check(permission==="permissionDenied"?"block":permission==="permissionGranted"?"pass":"warning","permission",permission),
  check(online?"info":"warning","connection",online?"networkOnline":"networkOffline"),
  check("info","cache",navigator.serviceWorker?.controller?"cacheControlled":"cacheUncontrolled"),
  check(actuallyConnected?"pass":"info","call",actuallyConnected?"callConnected":"callAbsent"),
  check("info","pilot","pilotDisabled")
 ];
 // Replace generic duplicate version label with a stable non-identifying build.
 rows[0].detail=VERSION;
 last=rows;
 display();
 $("doctorRun").disabled=false;
}
async function copyReport(){
 if(!last)return;
 const textValue=summary();
 try{
  if(!navigator.clipboard?.writeText)throw Error("CLIPBOARD_UNAVAILABLE");
  await navigator.clipboard.writeText(textValue);
  setText("doctorCopyStatus",t("copyOk"));
 }catch(_){
  $("doctorReport").focus();$("doctorReport").select();
  setText("doctorCopyStatus",t("copyFail"));
 }
}
$("doctorRun").addEventListener("click",()=>{void run();});
$("doctorCopy").addEventListener("click",()=>{void copyReport();});
$("language").addEventListener("change",()=>{
 // Old result labels remain in prior language unless rerun; never fabricate
 // a translated live device state from stale observations.
 last=null;display();
});
document.addEventListener("ezero:call-status",event=>{
 const stage=event.detail?.stage;
 if(stage==="connected")actuallyConnected=true;
 if(["idle","offline","iceNoRoute","signalInvalid","fingerprintMismatch","micDenied"].includes(stage))
  actuallyConnected=false;
 if(last){
  // A genuine connection/disconnection can update ONLY the observed-call row.
  const row=last.find(x=>x.name===t("call"));
  if(row){row.detail=t(actuallyConnected?"callConnected":"callAbsent");
   row.type=actuallyConnected?"pass":"info";}
  display();
 }
});
display();
})();
