/*
 * E-ZERO Android PWA call readiness check.
 * One-shot user-initiated, same-origin ONLY, privacy-first.
 * Never requests microphone/camera, starts a call, clears cache, reloads page,
 * sends network/IP data to third-party services, or marks a call "Connected".
 * A service worker bypass is used solely for an explicit fresh-page probe.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const BUILD="ezero-connect-oneqr-easy-first-20261105-lab-v1";
const labels={
 ur:{
  button:"🔍 فون اور ایپ کی حالت چیک کریں",
  initial:"صرف آپ کے بٹن دبانے پر آلہ اور تازہ ویب ورژن کی جانچ ہوگی۔ مائک یا کیمرہ نہیں کھلے گا۔",
  working:"موبائل اور تازہ ویب ورژن کی جانچ ہو رہی ہے؛ کال شروع نہیں ہوگی۔",
  unsupported:"اس فون میں محفوظ کال کے لیے ضروری براؤزر فیچر موجود نہیں۔",
  localReady:"اس فون میں WebRTC، محفوظ HTTPS اور ڈیجیٹل چابی کی بنیادی سہولتیں موجود ہیں۔",
  localIssue:"فون کی بنیادی سہولتیں مکمل نہیں: ",
  missingHttps:"محفوظ HTTPS",missingCrypto:"Web Crypto",missingRtc:"WebRTC",missingMedia:"مائک/کیمرہ کی اجازت مانگنے کی صلاحیت",
  onlineHint:"فون نیٹ ورک سے جڑا ہوا بتا رہا ہے؛ سرور تک رسائی ابھی الگ چیک ہوگی۔",
  offlineHint:"فون نیٹ ورک بند بتا رہا ہے؛ محفوظ کیا گیا پرانا صفحہ کھلا ہو سکتا ہے۔",
  installed:"یہ صفحہ انسٹال شدہ ایپ میں کھلا ہے۔",
  browser:"یہ صفحہ براؤزر میں کھلا ہے؛ انسٹال ہونا ضروری نہیں۔",
  swPresent:"اس ایپ کے لیے آف لائن کیش دستیاب ہو سکتا ہے، اس کا مطلب تازہ ورژن کی ضمانت نہیں۔",
  swAbsent:"اس صفحے کا آف لائن کیش فعال نظر نہیں آ رہا۔",
  current:"ویب سائٹ پر یہی نیا ورژن ملا؛ صفحے کی تاریخ کا موازنہ ہو گیا۔",
  changed:"ویب پر دوسرا ورژن ملا؛ کال ختم کرکے ایپ دوبارہ کھولیں۔ کسی جاری کال کو خودکار بند نہیں کیا جائے گا۔",
  unknown:"سرور سے تازہ ورژن کی تصدیق نہیں ہو سکی؛ موجودہ صفحہ پرانا یا محفوظ کاپی ہو سکتا ہے۔",
  staged:"آن لائن ایک لنک والا Call Room ابھی محدود بند تجربہ ہے؛ اس چیک سے حقیقی کال فعال نہیں ہوتی۔",
  done:"مقامی آلہ اور ویب صفحے کی جانچ مکمل ہوئی۔ یہ دو فونوں کی کال کا ثبوت نہیں۔",
  failed:"جانچ مکمل نہیں ہو سکی؛ فون کی حالت غیر مصدقہ ہے۔"
 },
 en:{
  button:"🔍 Check phone & app readiness",
  initial:"Run a one-shot phone and live-page check when you tap. No microphone or camera permissions requested.",
  working:"Checking phone and current web version without starting a call.",
  unsupported:"Your browser is missing required secure-calling features.",
  localReady:"Your phone has the basic WebRTC, HTTPS and Web Crypto capabilities.",
  localIssue:"Missing or unsupported phone features: ",
  missingHttps:"secure HTTPS",missingCrypto:"Web Crypto",missingRtc:"WebRTC",missingMedia:"microphone/camera permission capability",
  onlineHint:"The device reports network access; server reachability is checked separately.",
  offlineHint:"The device reports offline mode. The installed app may show a cached older page.",
  installed:"This page is open as an installed app.",
  browser:"This page is open in a browser; installation isn't required.",
  swPresent:"An offline cache may be present. That does not guarantee a fresh app version.",
  swAbsent:"No active offline cache was identified for this page.",
  current:"The currently served web-page version matches the app.",
  changed:"A different web version is available. End any call before reopening the app; no automatic reload.",
  unknown:"Could not confirm the current server version. This page could be stale or cached.",
  staged:"Online one-link call rooms remain a closed staging feature. This check cannot start a real call.",
  done:"Phone and page check complete. This does not prove a two-phone call.",
  failed:"Readiness check could not finish; phone readiness is unverified."
 },
 ar:{
  button:"🔍 افحص الهاتف وإصدار التطبيق",
  initial:"يجري الفحص فقط عند الضغط. لا يفتح الميكروفون أو الكاميرا.",
  working:"فحص الهاتف ونسخة الموقع دون بدء مكالمة.",
  unsupported:"المتصفح يفتقد الميزات الأساسية لمكالمة آمنة.",
  localReady:"تتوفر ميزات WebRTC وHTTPS وWeb Crypto الأساسية.",
  localIssue:"ميزات غير متوفرة: ",
  missingHttps:"HTTPS الآمن",missingCrypto:"Web Crypto",missingRtc:"WebRTC",missingMedia:"قدرة طلب إذن الميكروفون والكاميرا",
  onlineHint:"يذكر الهاتف توفر الشبكة؛ سيتحقق من الوصول إلى الموقع على حدة.",
  offlineHint:"الهاتف يشير إلى عدم الاتصال؛ قد تكون نسخة التطبيق قديمة ومخزنة.",
  installed:"الصفحة مفتوحة كتطبيق مثبت.",
  browser:"الصفحة مفتوحة في المتصفح؛ التثبيت ليس ضرورياً.",
  swPresent:"قد تتوفر نسخة مخزنة؛ هذا لا يضمن أنها حديثة.",
  swAbsent:"لم تُرصد نسخة مخزنة فعالة لهذه الصفحة.",
  current:"تطابق إصدار الموقع الحالي مع هذه الصفحة.",
  changed:"يتوفر إصدار مختلف؛ أنه المكالمة قبل إعادة فتح التطبيق، بلا تحديث تلقائي.",
  unknown:"لم يتم التحقق من إصدار الخادم؛ ربما الصفحة قديمة أو مخزنة.",
  staged:"غرف الاتصال بالرابط الواحد في تجربة مغلقة حالياً؛ لا يبدأ هذا الفحص مكالمة.",
  done:"اكتمل فحص الهاتف والصفحة؛ ليس دليلاً على اتصال هاتفين.",
  failed:"تعذر إكمال الفحص؛ حالة الهاتف غير مؤكدة."
 }
};
function lang(){const v=$("language")?.value;return["ur","en","ar"].includes(v)?v:"ur";}
function tr(key){return(labels[lang()]||labels.ur)[key]||key;}
function render(){for(const el of document.querySelectorAll("[data-readiness-i18n]"))el.textContent=tr(el.dataset.readinessI18n);}
function note(key){const el=$("androidReadinessStatus");el.textContent=tr(key);el.dataset.state=key;}
function add(key,lines){lines.push(tr(key));}
const source=new URL("./ezero_secure_connect_live_p2p_v0_1.html",location.href);
const view=async()=>{
 const detail=$("androidReadinessDetail");detail.textContent="";
 const lines=[],missing=[];
 if(!window.isSecureContext||location.protocol!=="https:"&&location.hostname!=="127.0.0.1"&&location.hostname!=="localhost")missing.push("missingHttps");
 if(!crypto?.subtle||typeof crypto.subtle.digest!=="function")missing.push("missingCrypto");
 if(typeof RTCPeerConnection!=="function")missing.push("missingRtc");
 if(typeof navigator.mediaDevices?.getUserMedia!=="function")missing.push("missingMedia");
 if(missing.length){add("localIssue",lines);lines[0]+=" "+missing.map(tr).join("، ");}
 else add("localReady",lines);
 add(navigator.onLine===false?"offlineHint":"onlineHint",lines);
 const installed=window.matchMedia?.("(display-mode: standalone)")?.matches===true||navigator.standalone===true;
 add(installed?"installed":"browser",lines);
 try{
  const registration=await navigator.serviceWorker?.getRegistration?.();
  add(registration?.active?"swPresent":"swAbsent",lines);
 }catch(_){add("swAbsent",lines);}
 let version="unknown";
 try{
  // Explicit user action, same-origin, bypasses only this document's SW
  // cached response. Never send friend IDs, tokens, SDP or audio.
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
  try{
   const res=await fetch(source.href,{
    method:"GET",cache:"no-store",credentials:"same-origin",
    headers:{"X-EZERO-Readiness-Probe":"v1"},
    signal:abort.signal,redirect:"error"
   });
   if(res.ok&&res.url===source.href){
    const fresh=await res.text();
    const match=fresh.match(/<meta name="ezero-connect-build" content="([a-z0-9-]{12,90})">/);
    if(match)version=match[1]===BUILD?"current":"changed";
   }
  }finally{clearTimeout(timer);}
 }catch(_){version="unknown";}
 add(version,lines);add("staged",lines);add("done",lines);
 detail.textContent=lines.join("\n");
 detail.dataset.networkVersion=version;
 detail.dataset.localReady=missing.length?"no":"yes";
 note(missing.length?"unsupported":"done");
};
let running=false;
$("androidReadinessRun").addEventListener("click",async()=>{
 if(running)return;running=true;const button=$("androidReadinessRun");
 button.disabled=true;note("working");
 try{await view();}catch(_){note("failed");}
 finally{running=false;button.disabled=false;}
});
$("language").addEventListener("change",render);
render();note("initial");
})();
