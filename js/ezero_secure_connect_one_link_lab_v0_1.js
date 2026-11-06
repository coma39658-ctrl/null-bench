/*
 * E-ZERO one-link two-phone call laboratory.
 * Never auto-start microphone, camera or live media; join/accept/start require
 * deliberate human clicks. No analytics, polling, token storage or signaling logs.
 * Signed SDP is AES-GCM encrypted with the invitation's 256-bit URL-fragment key.
 * Relays opaque encrypted signaling ONLY; all WebRTC key/fingerprint checks live
 * in the existing E-ZERO signed peer implementation.
 */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const endpoint="wss://ezero-secure-connect-call-lab-disabled.coma39658.workers.dev";
const inviteEndpoint=endpoint.replace(/^wss:/,"https:")+"/v1/invite";
const text={
 ur:{
   title:"نجی ایک لنک کال — تجرباتی محفوظ طریقہ",
   explain:"لمبے WhatsApp کوڈ نہیں؛ لنک صرف اپنے دوست کو بھیجیں۔ دوست کال قبول کرے، پھر آپ Start دبائیں۔ کال کی آواز اور ویڈیو Cloudflare سے نہیں گزرتیں۔",
   create:"🔗 نجی کال لنک بنائیں",join:"📞 اس لنک کی کال میں شامل ہوں",
   ownerLabel:"مالک کا 64 حروف والا محفوظ 256-bit کوڈ (کسی کو نہ دیں)",ownerRequired:"Cloudflare میں محفوظ 64 حروف والا تصادفی مالک کوڈ درکار ہے؛ عام پاس ورڈ قابل قبول نہیں۔",
   share:"↗ نجی کال لنک شیئر کریں",copy:"📋 کال لنک کاپی کریں",
   accept:"✓ کال قبول کریں",decline:"✕ کال مسترد کریں",
   start:"🎙️ منظوری کے بعد کال شروع کریں",end:"📴 کال بند کریں",
   ready:"کال لنک بنانے یا دوست کا دعوتی لنک کھولنے سے آغاز کریں۔",
   linkReady:"لنک تیار ہے؛ صرف اپنے قابلِ اعتماد دوست کو بھیجیں۔ سروس کی اجازت ملنے پر کال جوڑی جائے گی۔",
   connecting:"نجی کال روم سے رابطہ کیا جا رہا ہے…",
   serverOff:"آن لائن کال روم ابھی بند ہے۔ یہ تجرباتی خصوصیت فعال نہیں؛ دستی کال ٹیسٹ الگ موجود ہے۔",
   failed:"اس وقت آن لائن کال روم سے رابطہ نہیں ہو سکا؛ کال شروع نہیں ہوئی۔",
   joined:"کال روم میں رابطہ قائم؛ دوسرے فون کا انتظار کریں۔",
   incoming:"دوست کا کال روم ملا؛ شامل ہونے کے بعد قبول یا مسترد کریں۔",
   peer:"دوست کال روم میں شامل ہوا ہے؛ اس کی منظوری ضروری ہے۔",
   accepted:"دوست نے کال قبول کر لی؛ Start دبانے سے مائیک کی اجازت مانگی جائے گی۔",
   receiving:"دوست کی دستخط شدہ کال دعوت آ رہی ہے؛ تصدیق کے بعد جواب بھیجا جائے گا۔",
   replying:"کال کا خفیہ جواب بھیجا گیا؛ اصل WebRTC کنکشن قائم ہونے کا انتظار کریں۔",
   checking:"خفیہ جواب ملا؛ WebRTC اصل کنکشن کی جانچ جاری ہے…",
   connected:"✓ دونوں فونوں کا اصل WebRTC کنکشن قائم ہو گیا۔",
   invalid:"کال لنک غلط یا ادھورا ہے؛ مکمل اصل لنک دوست سے لیں۔",
   encryptionError:"لنک کی خفیہ چابی سے پیغام نہیں کھل سکا؛ کال روک دی گئی۔",
   declined:"کال مسترد ہوگئی؛ کوئی مائیک یا کیمرہ نہیں کھولا گیا۔",
   ended:"کال روم بند ہو گیا۔",
   copied:"نجی کال لنک کاپی ہو گیا؛ صرف اپنے دوست کو بھیجیں۔",
   copyFail:"کال لنک خودکار کاپی نہیں ہوا؛ نیچے لنک کو منتخب کرکے کاپی کریں۔",
   shareFail:"شیئرنگ دستیاب نہیں؛ لنک کاپی کرکے نجی پیغام میں بھیجیں۔",
   remind:"یہ بند Staging سہولت ہے؛ عوامی آغاز حقیقی دو فونوں کے کامیاب ٹیسٹ کے بعد ہوگا۔",
   linkWarning:"جس کے پاس مکمل لنک ہو وہ دس منٹ کے اندر مہمان کی جگہ لینے کی کوشش کر سکتا ہے۔ اسے عوامی گروپ، اسکرین شاٹ یا غیر معتبر ویب سائٹ پر نہ ڈالیں۔ دوست کی شناخت الگ سے چیک کریں۔",
 },
 en:{
   title:"Private one-link call — experimental",explain:"No long WhatsApp codes. Send the private link to one friend. They explicitly accept, then you tap Start. Media does not pass through Cloudflare.",
   create:"🔗 Create private call link",join:"📞 Join this invitation",
   ownerLabel:"Owner’s random 64-character 256-bit code (never share)",ownerRequired:"Enter the securely generated 64-character hex owner code; ordinary passwords are not accepted.",
   share:"↗ Share private link",copy:"📋 Copy call link",accept:"✓ Accept call",decline:"✕ Decline",
   start:"🎙️ Start after acceptance",end:"📴 End call",
   ready:"Create a link or open your friend's private invitation.",
   linkReady:"Private link created. Send it to one trusted friend; online calls require staging permission.",
   connecting:"Connecting to private signaling room…",serverOff:"Online call rooms are disabled. Manual WebRTC testing remains separate.",
   failed:"The private signaling room is not available; no call started.",
   joined:"Connected to the room; waiting for the other phone.",
   incoming:"Private invitation detected. Join, then explicitly accept or decline.",
   peer:"Friend joined the room. Their acceptance is still required.",
   accepted:"Friend accepted. Tap Start to request microphone permission.",
   receiving:"Received encrypted signed offer; preparing verified reply.",
   replying:"Encrypted answer sent. Waiting for real WebRTC connection.",
   checking:"Encrypted answer received; verifying WebRTC connection…",
   connected:"✓ Both phones are truly WebRTC-connected.",
   invalid:"Invalid or incomplete private link. Ask for the original full link.",
   encryptionError:"Cannot decrypt the peer message. Session was stopped.",
   declined:"Call declined. No microphone or camera was activated.",
   ended:"Call room closed.",copied:"Private link copied. Send only to your friend.",
   copyFail:"Clipboard unavailable. Select and copy the link in the field.",
   shareFail:"Sharing unavailable; copy the link into a private message.",
   remind:"Staging-only feature; public enrollment requires verified real-phone tests.",
   linkWarning:"Anyone with this entire link could try to take the guest seat within 10 minutes. Never post it publicly or in screenshots. Independently verify your friend's identity."
 },
 ar:{
   title:"مكالمة خاصة برابط واحد — تجربة",explain:"بلا رموز واتساب طويلة. أرسل الرابط لصديق موثوق؛ يوافق ثم تضغط بدء. الصوت والفيديو لا يمران عبر Cloudflare.",
   create:"🔗 أنشئ رابط مكالمة خاصاً",join:"📞 انضم إلى هذه الدعوة",
   ownerLabel:"رمز المالك العشوائي بطول 64 حرفاً (لا تشاركه)",ownerRequired:"يلزم رمز مالك عشوائي مكون من 64 حرفاً سداسياً؛ كلمات المرور العادية مرفوضة.",
   share:"↗ شارك الرابط الخاص",copy:"📋 انسخ رابط المكالمة",accept:"✓ اقبل المكالمة",decline:"✕ ارفض",
   start:"🎙️ ابدأ بعد الموافقة",end:"📴 أنه المكالمة",
   ready:"أنشئ رابطاً أو افتح دعوة صديقك.",linkReady:"الرابط جاهز؛ أرسله لصديق واحد موثوق فقط.",
   connecting:"جار الاتصال بالغرفة الخاصة…",serverOff:"غرف المكالمات مغلقة حالياً؛ الاختبار اليدوي متاح منفصلاً.",
   failed:"غرفة المكالمة غير متاحة؛ لم تبدأ أي مكالمة.",
   joined:"تم الاتصال بالغرفة؛ انتظار الهاتف الآخر.",
   incoming:"تم العثور على الدعوة؛ انضم ثم اقبل أو ارفض.",
   peer:"انضم صديقك؛ الموافقة لازمة.",
   accepted:"وافق الصديق؛ اضغط ابدأ للسماح بالميكروفون.",
   receiving:"وصل العرض المشفر والموقع؛ تحضير الرد.",
   replying:"أُرسل الرد المشفر؛ انتظار اتصال WebRTC الحقيقي.",
   checking:"وصل الرد المشفر؛ التحقق من اتصال WebRTC…",
   connected:"✓ تم اتصال WebRTC الحقيقي بين الهاتفين.",
   invalid:"رابط المكالمة غير صحيح أو ناقص.",encryptionError:"تعذر فك تشفير رسالة الطرف الآخر؛ أُوقفت الجلسة.",
   declined:"رُفضت المكالمة؛ لم يُفعّل الميكروفون أو الكاميرا.",
   ended:"أُغلقت غرفة المكالمة.",copied:"تم نسخ الرابط الخاص؛ أرسله لصديق موثوق.",
   copyFail:"لم يُنسخ الرابط تلقائياً؛ حدده وانسخه.",
   shareFail:"المشاركة غير متاحة؛ انسخ الرابط إلى رسالة خاصة.",
   remind:"الميزة في مرحلة التجربة فقط؛ لا تفتح للجمهور قبل اختبار هاتفين فعلياً.",
   linkWarning:"من يملك الرابط كاملاً قد يحاول أخذ مقعد الضيف خلال عشر دقائق. لا تنشره علناً أو في صور الشاشة، وتحقق من هوية صديقك بشكل مستقل."
 }
};
let roomId=null,secret=null,auth=null,issued=null,proof=null,secretKey=null,ws=null,role=null,joined=false,approved=false;
let ready=false, link="",closing=false,connecting=false,creating=false;
let qrMode="",qrPending=false,hostAccepted=false,guestHelloSent=false,qrRequestVerified=false;
const oneQrText={
 ur:{advanced:"⚙ مزید اختیارات اور تکنیکی آزمائشیں (اختیاری)",privacy:"🔒 رازداری اور اجازت",cameraHelp:"دوسرے فون کا کال QR کیمرے کے سامنے رکھیں؛ کیمرہ صرف آپ کے اسکین دبانے پر کھلے گا۔",cancelScan:"✕ اسکین بند کریں",shareLink:"↗ نجی لنک بھیجیں (اگر کیمرہ خراب ہو)",linkShared:"نجی دعوت صرف آپ کی منتخب ایپ سے شیئر ہوئی؛ دوسرے فون کی منظوری ضروری ہے۔",linkCopied:"نجی لنک کاپی ہوا؛ اسے صرف قابلِ اعتماد فرد کو بھیجیں۔",shareUnavailable:"شیئر یا کاپی دستیاب نہیں؛ QR دوسرے فون کو دکھائیں۔",title:"📞 آسان کال — صرف ایک QR",explain:"ایک فون QR دکھائے، دوسرا اسے اسکین کرے، پھر کال قبول کریں۔ کوئی لمبا کوڈ نہیں۔",
 show:"📱 میرا کال QR دکھائیں",scan:"📷 دوسرے فون کا QR اسکین کریں",accept:"✅ کال قبول کریں",
 decline:"✕ کال مسترد کریں",end:"📴 کال ختم کریں",
 ready:"دوسرا فون QR اسکین کرے؛ کال درخواست اسی کھلے صفحے پر آئے گی۔",
 join:"QR مل گیا؛ دوست کی دستخط شدہ شناخت چیک ہو رہی ہے۔",
 request:"✓ دستخط شدہ شناخت ملی۔ یہ حقیقی انسان کی شناخت کی ضمانت نہیں۔ قبول یا مسترد کریں۔",
 rejected:"کال مسترد کر دی گئی۔",waiting:"دوسرے فون کی منظوری کا انتظار ہے۔",
 unavailable:"محفوظ کال روم ابھی بند ہے یا انٹرنیٹ دستیاب نہیں؛ کوئی کال شروع نہیں ہوئی۔",
 invalid:"QR غلط، پرانا یا مختلف ویب سائٹ کا ہے۔ نیا QR اسکین کریں۔",
 connecting:"محفوظ کال روم سے رابطہ ہو رہا ہے۔",
 connected:"✓ اصل WebRTC کنکشن قائم ہوا۔",limit:"پائلٹ کے آٹھ کال روم بھر گئے ہیں؛ بعد میں نیا QR بنائیں۔",
 warning:"یہ QR نجی دعوت ہے۔ صرف قابل اعتماد شخص کو دکھائیں، دوسروں سے یا عوامی گروپ میں شیئر نہ کریں۔"
 },
 en:{advanced:"⚙ More options and manual tests (optional)",privacy:"🔒 Privacy and permissions",cameraHelp:"Point this camera at the other phone's CALL QR. Camera opens only when you tap Scan.",cancelScan:"✕ Stop scanning",shareLink:"↗ Share a private link (if camera unavailable)",linkShared:"You shared the invitation through your chosen app; phone approval is still required.",linkCopied:"Private link copied. Send only to the intended person.",shareUnavailable:"Sharing and clipboard are unavailable; use the on-screen QR.",title:"📞 Easy call — one QR",explain:"One phone shows QR, the other scans, then the recipient accepts. No long codes.",
 show:"📱 Show my call QR",scan:"📷 Scan the other phone's QR",accept:"✅ Accept call",decline:"✕ Decline",end:"📴 End call",
 ready:"Show the QR to the other phone; a call request will appear here while this page is open.",
 join:"QR received; verifying signed digital identity.",request:"✓ Signed key checked. This does not prove the person's real-world identity. Accept or decline.",
 rejected:"Call declined.",waiting:"Waiting for receiver's consent.",unavailable:"The private call room is disabled or unreachable. No call started.",
 invalid:"QR invalid, expired or for another website. Ask for a fresh QR.",connecting:"Connecting to the private room.",
 connected:"✓ Actual WebRTC connection established.",limit:"All eight restricted pilot rooms are occupied.",warning:"This QR is a private invitation. Show only to the intended person."
 },
 ar:{advanced:"⚙ خيارات إضافية واختبارات تقنية (اختياري)",privacy:"🔒 الخصوصية والأذونات",cameraHelp:"وجه الكاميرا إلى رمز QR للمكالمة على الهاتف الآخر. تعمل الكاميرا عند الضغط على المسح فقط.",cancelScan:"✕ إيقاف المسح",shareLink:"↗ أرسل الرابط الخاص (إذا تعذرت الكاميرا)",linkShared:"تمت مشاركة الدعوة عبر التطبيق الذي اخترته؛ الموافقة لا تزال مطلوبة.",linkCopied:"تم نسخ الرابط الخاص؛ أرسله للشخص المقصود فقط.",shareUnavailable:"المشاركة والنسخ غير متاحين؛ اعرض رمز QR للهاتف الآخر.",title:"📞 مكالمة سهلة — QR واحد",explain:"يعرض هاتف QR، ويمسحه الآخر ثم يقبل المستلم. لا رموز طويلة.",
 show:"📱 اعرض QR للمكالمة",scan:"📷 امسح QR الهاتف الآخر",accept:"✅ قبول",decline:"✕ رفض",end:"📴 إنهاء المكالمة",
 ready:"اعرض QR للهاتف الآخر؛ سيظهر طلب الاتصال هنا والصفحة مفتوحة.",join:"تم استلام QR؛ يجري فحص الهوية الموقعة.",
 request:"✓ تم التحقق من المفتاح الرقمي، لا من هوية الشخص الحقيقية. اقبل أو ارفض.",
 rejected:"رُفض الاتصال.",waiting:"انتظار موافقة الهاتف الآخر.",unavailable:"غرفة الاتصال مغلقة أو الشبكة غير متاحة.",invalid:"QR غير صحيح أو منتهي أو لموقع آخر.",
 connecting:"جار الاتصال بالغرفة الخاصة.",connected:"✓ تم اتصال WebRTC الحقيقي.",limit:"غرف الاختبار الثماني مشغولة.",warning:"هذا QR دعوة خاصة؛ اعرضه للشخص المقصود فقط."
 }
};
const qtext=k=>(oneQrText[lang()]||oneQrText.ur)[k]||k;
function qStatus(k){
 const el=$("oneQrStatus");if(!el)return;
 el.textContent=qtext(k);el.dataset.state=k;
}
const lang=()=>["ur","en","ar"].includes($("language")?.value)?$("language").value:"ur";
const t=k=>(text[lang()]||text.ur)[k]||text.ur[k]||k;
const st=k=>{const e=$("roomStatus");e.textContent=t(k);e.dataset.state=k;};
function draw(){
 for(const el of document.querySelectorAll("[data-room-i18n]"))
   el.textContent=t(el.dataset.roomI18n);
 for(const el of document.querySelectorAll("[data-oneqr-i18n]"))
   el.textContent=qtext(el.dataset.oneqrI18n);
 $("oneQrShow").disabled=ready||connecting||creating;
 $("oneQrRequest").hidden=!(qrMode==="host"&&qrRequestVerified&&ready&&!hostAccepted);
 $("oneQrEnd").hidden=!(ready||connecting);
 $("oneQrCaller").textContent=qtext("request");
 $("roomStart").disabled=!(ready&&role==="caller"&&approved&&qrMode!=="host");
 $("roomAccept").disabled=!(ready&&
   ((role==="callee"&&!approved&&qrMode!=="guest")||
    (role==="caller"&&qrMode==="host"&&qrRequestVerified&&!hostAccepted)));
 $("roomDecline").disabled=!(ready&&
   ((role==="callee"&&!approved&&qrMode!=="guest")||
    (role==="caller"&&qrMode==="host"&&qrRequestVerified&&!hostAccepted)));
 $("roomCreate").disabled=ready||connecting||creating;
 $("roomJoin").disabled=ready||connecting||!roomId||!auth;
 $("roomLink").value=ready&&role==="caller"?link:"";
 $("roomCopy").disabled=!(link&&ready&&role==="caller");
 $("roomShare").disabled=!(link&&ready&&role==="caller");
 $("roomEnd").disabled=!(ready||connecting||link);
}
function hex(bytes){return [...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");}
function bytesFromHex(v){return Uint8Array.from(v.match(/../g)||[],x=>parseInt(x,16));}
function b64(b){let raw="";for(let i=0;i<b.length;i++)raw+=String.fromCharCode(b[i]);return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function unb64(s){const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function useSecret(value){
 if(!/^[a-f0-9]{64}$/.test(value))throw Error("SECRET_FORMAT");
 secret=value;
 // Domain-separated hash is a one-way room authorization token. NEVER send
 // the raw 256-bit AES-GCM key in WebSocket headers or to Cloudflare.
 auth=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",
   new TextEncoder().encode("EZERO-ROOM-AUTH-1:"+value))));
 secretKey=await crypto.subtle.importKey("raw",bytesFromHex(value),
   {name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encrypt(raw){
 if(!secretKey)throw Error("ENCRYPTION_UNAVAILABLE");
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const payload=new TextEncoder().encode(raw);
 if(payload.length>120000)throw Error("MESSAGE_TOO_LARGE");
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},secretKey,payload));
 const combined=new Uint8Array(iv.length+cipher.length);combined.set(iv);combined.set(cipher,iv.length);
 return b64(combined);
}
async function decrypt(blob){
 if(!secretKey||typeof blob!=="string"||blob.length>170000||!/^[A-Za-z0-9_-]+$/.test(blob))
   throw Error("ENCRYPTION_INVALID");
 const packed=unb64(blob);
 if(packed.length<32)throw Error("ENCRYPTION_INVALID");
 const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv:packed.slice(0,12)},secretKey,packed.slice(12));
 const plain=new TextDecoder("utf-8",{fatal:true}).decode(raw);
 const envelope=JSON.parse(plain);
 if(envelope?.v!==1)throw Error("SIGNAL_INVALID");
 if(envelope.type==="hello"){
   if(typeof envelope.identity!=="string"||!/^EZERO1\./.test(envelope.identity)||
      envelope.identity.length>1300)throw Error("IDENTITY_INVALID");
 }else if(!["offer","answer"].includes(envelope.type)||
          typeof envelope.sdp!=="string")throw Error("SIGNAL_INVALID");
 return plain;
}
function localSignedIdentity(){
 const token=$("myDigitalId")?.value||"";
 return /^EZERO1\.[A-Za-z0-9._-]{100,1000}$/.test(token)?token:null;
}
async function waitLocalIdentity(){
 const ready=localSignedIdentity();if(ready)return ready;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{document.removeEventListener("ezero:identity-ready",done);
   reject(Error("IDENTITY_NOT_READY"));},7000);
  function done(){const token=localSignedIdentity();if(!token)return;
   clearTimeout(timer);document.removeEventListener("ezero:identity-ready",done);resolve(token);}
  document.addEventListener("ezero:identity-ready",done);
  done();
 });
}
async function verifySignedIdentity(token){
 if(!/^EZERO1\.[A-Za-z0-9._-]{100,1000}$/.test(token))return false;
 return new Promise(resolve=>{
  const requestId=hex(crypto.getRandomValues(new Uint8Array(16)));
  let finished=false;
  const finish=ok=>{if(finished)return;finished=true;clearTimeout(timer);
   document.removeEventListener("ezero:oneqr-identity-result",got);resolve(ok);};
  const timer=setTimeout(()=>finish(false),6500);
  const got=e=>{if(e.detail?.requestId===requestId)finish(e.detail.ok===true);};
  document.addEventListener("ezero:oneqr-identity-result",got);
  document.dispatchEvent(new CustomEvent("ezero:oneqr-verify-identity",{
   detail:{requestId,token}
  }));
 });
}
function parseOneQr(raw){
 let url;try{url=new URL(raw);}catch(_){throw Error("INVALID_QR");}
 if(url.origin!==location.origin||url.pathname!==location.pathname||
    url.search!==location.search)throw Error("INVALID_QR");
 const m=url.hash.slice(1).match(
  /^callroom=([a-f0-9]{32})\.([a-f0-9]{64})\.([0-9]{13})\.([a-f0-9]{64})(?:&identity=(EZERO1\.[A-Za-z0-9._-]{100,1000}))?$/);
 if(!m)throw Error("INVALID_QR");
 const timestamp=Number(m[3]);
 if(!Number.isSafeInteger(timestamp)||timestamp+600000<Date.now()||
    timestamp>Date.now()+30000)throw Error("EXPIRED_QR");
 return {id:m[1],aes:m[2],issued:timestamp,proof:m[4],identity:m[5]||null};
}
function clearQr(){
 $("oneQrVisual").hidden=true;
 $("oneQrCode").replaceChildren();
}
function drawQr(){
 if(qrMode!=="host"||!ready||role!=="caller"||!link)return;
 try{
  const qr=window.qrcode(0,"L");
  qr.addData(link);qr.make();
  const el=$("oneQrCode");
  el.innerHTML=qr.createSvgTag(3,4);
  el.querySelector("svg")?.setAttribute("aria-label","One-time private E-ZERO call QR");
  $("oneQrVisual").hidden=false;
  qStatus("ready");
 }catch(_){qStatus("invalid");clearQr();}
}
async function applyInvite(inv,scanned){
 if(ready||connecting||creating||qrMode)throw Error("ROOM_BUSY");
 creating=true;draw();
 try{
  const token=inv.identity;
  if(!token||!await verifySignedIdentity(token))throw Error("SIGNATURE_REQUIRED");
  await waitLocalIdentity();
  roomId=inv.id;issued=inv.issued;proof=inv.proof;
  await useSecret(inv.aes);secret=null;
  qrMode="guest";
  qStatus("join");
  if(scanned)connect(); // Scan is the user's explicit one-tap join.
  else draw();
 }catch(error){
  qrMode="";roomId=null;auth=null;proof=null;issued=null;
  secret=null;secretKey=null;qStatus("invalid");
 }finally{creating=false;draw();}
}
function readLink(){
 const raw=location.hash.slice(1);
 if(!raw.startsWith("callroom="))return false;
 const full=location.href;
 // Never persist private URL fragments in browser history or analytics.
 history.replaceState(null,"",location.pathname+location.search);
 try{
  const inv=parseOneQr(full);
  // Opening the intended private link is an explicit navigation gesture.
  // Automatically request a room (not microphone/camera). The receiving
  // phone still has to approve before any audio permission can be asked.
  void applyInvite(inv,true);
 }catch(_){qStatus("invalid");st("invalid");}
 return true;
}
function send(type,body={}){
 if(ws?.readyState!==WebSocket.OPEN)return false;
 ws.send(JSON.stringify({v:1,type,...body}));return true;
}
function closeRoom(sendHangup=false){
 if(sendHangup)send("hangup");
 closing=true;
 try{ws?.close(1000,"Done");}catch(_){}
 ws=null;ready=false;approved=false;joined=false;connecting=false;creating=false;
 qrMode="";qrPending=false;hostAccepted=false;guestHelloSent=false;qrRequestVerified=false;
 clearQr();
 secret=null;secretKey=null;auth=null;proof=null;issued=null;link="";roomId=null;
 $("roomLink").value="";
 $("hangup")?.click();
 st("ended");draw();
}
async function receive(frame){
 if(frame?.v!==1||typeof frame.type!=="string")return;
 if(frame.type==="ready"){
   role=frame.role;ready=true;st("joined");
   if(qrMode==="host"){
     if(role!=="caller"){closeRoom(true);qStatus("invalid");return;}
     drawQr();
   }else if(qrMode==="guest"){
     if(role!=="callee"){closeRoom(true);qStatus("invalid");return;}
     try{
       const identity=await waitLocalIdentity();
       const blob=await encrypt(JSON.stringify({v:1,type:"hello",identity}));
       if(!send("guest_hello",{blob}))throw Error("HELLO_NOT_SENT");
       guestHelloSent=true;
       qStatus("waiting");
     }catch(_){closeRoom(true);qStatus("unavailable");return;}
   }
   draw();return;
 }
 if(frame.type==="peer_joined"){joined=true;st("peer");
   if(qrMode==="host")qStatus("connecting");draw();return;}
 if(frame.type==="guest_hello"){
   if(qrMode!=="host"||role!=="caller"||qrPending)return;
   try{
     const hello=JSON.parse(await decrypt(frame.blob));
     if(hello.type!=="hello"||!await verifySignedIdentity(hello.identity))
       throw Error("INVALID_SIGNED_GUEST");
     qrPending=true;qrRequestVerified=true;st("peer");qStatus("request");
     clearQr();draw();return;
   }catch(_){closeRoom(true);qStatus("invalid");return;}
 }
 if(frame.type==="host_accepted"){
   if(qrMode!=="guest"||role!=="callee"||!guestHelloSent||approved)return;
   approved=send("accept");if(!approved){closeRoom();qStatus("unavailable");return;}
   st("receiving");qStatus("connecting");draw();return;
 }
 if(frame.type==="accepted"){
   if(role!=="caller")return;
   approved=true;st("accepted");draw();
   if(qrMode==="host"&&hostAccepted){
     // The host explicitly tapped Accept; only now does WebRTC request
     // microphone permission (which the browser must separately grant).
     $("guidedOffer").click();
     qStatus("connecting");
   }
   return;
 }
 if(frame.type==="decline"){closeRoom();st("declined");qStatus("rejected");return;}
 if(frame.type==="hangup"){closeRoom();return;}
 if(frame.type==="peer_left"){closeRoom();return;}
 if(frame.type==="error"){closeRoom();st("failed");qStatus("invalid");return;}
 if(frame.type==="offer"||frame.type==="answer"){
   if(frame.type==="offer"&&(role!=="callee"||!approved))return;
   if(frame.type==="answer"&&role!=="caller")return;
   try{
     const plain=await decrypt(frame.blob);
     if(JSON.parse(plain).type!==frame.type)throw Error("TYPE_MISMATCH");
     $("guidedIncoming").value=plain;
     st(frame.type==="offer"?"receiving":"checking");
     $("guidedContinue").click();
   }catch(_){
     st("encryptionError");closeRoom(true);
   }
 }
}
function connect(){
 if(!roomId||!auth||!secretKey||!/^[a-f0-9]{64}$/.test(proof||"")||
   !Number.isSafeInteger(issued)||issued+600000<Date.now()||issued>Date.now()+30000){
    st("invalid");return;
 }
 if(ws&&ws.readyState<=1)return;
 connecting=true;st("connecting");closing=false;draw();
 try{
   ws=new WebSocket(endpoint+"/v1/room/"+roomId,["ezero-room-v1","ezero-key-"+auth,"ezero-time-"+issued,"ezero-proof-"+proof]);
   ws.onmessage=e=>{let obj;try{obj=JSON.parse(e.data);}catch(_){return;}void receive(obj);};
   ws.onerror=()=>st("serverOff");
   ws.onclose=()=>{
     if(!closing){
       const hadJoined=ready;
       closeRoom(false); // Fail safely: release microphone/camera on disconnect.
       st(hadJoined?"ended":"serverOff");
     }else{ready=false;ws=null;connecting=false;draw();}
   };
 }catch(_){connecting=false;st("failed");draw();}
}
$("roomCreate").addEventListener("click",async()=>{
 if(ready||connecting||creating)return;
 if(!window.isSecureContext||!crypto?.subtle){st("failed");qStatus("unavailable");return;}
 creating=true;qrMode="host";draw();qStatus("connecting");
 try{
  // Server mints a one-room owner HMAC. Its actual secret NEVER enters
  // the browser, the QR, or any per-user UI.
  const identity=await waitLocalIdentity();
  roomId=hex(crypto.getRandomValues(new Uint8Array(16)));
  issued=Date.now();
  await useSecret(hex(crypto.getRandomValues(new Uint8Array(32))));
  const res=await fetch(inviteEndpoint,{
   method:"POST",mode:"cors",cache:"no-store",credentials:"omit",
   redirect:"error",headers:{"Content-Type":"text/plain"},
   body:JSON.stringify({id:roomId,auth,issued}),
   signal:AbortSignal.timeout(8500)
  });
  if(res.status===503)throw Error("ROOMS_DISABLED");
  if(res.status===429)throw Error("PILOT_LIMIT");
  if(!res.ok)throw Error("INVITE_NOT_CREATED");
  const issuedProof=await res.json();
  if(issuedProof?.code!=="INVITE_CREATED"||
     !/^[a-f0-9]{64}$/.test(issuedProof.proof||"")||
     issuedProof.expires!==issued+600000)
    throw Error("INVITE_INVALID");
  proof=issuedProof.proof;
  link=new URL(location.pathname+location.search+"#callroom="+roomId+"."+
   secret+"."+issued+"."+proof+"&identity="+identity,location.origin).href;
  secret=null;
  $("roomOwnerSecret").value="";
  st("linkReady");draw();connect();
 }catch(error){
  const limit=error?.message==="PILOT_LIMIT";
  closeRoom(false);qStatus(limit?"limit":"unavailable");
  st("serverOff");
 }finally{creating=false;draw();}
});
$("roomJoin").addEventListener("click",()=>connect());
$("roomAccept").addEventListener("click",()=>{
 if(!ready)return;
 if(role==="caller"&&qrMode==="host"&&qrRequestVerified&&!hostAccepted){
   hostAccepted=send("host_accept");
   if(hostAccepted){st("receiving");qStatus("connecting");}
   else qStatus("unavailable");
   draw();return;
 }
 if(role!=="callee"||qrMode==="guest")return;
 approved=send("accept");if(approved)st("receiving");draw();
});
$("roomDecline").addEventListener("click",()=>{
 if(!ready)return;
 if(role==="caller"&&qrMode==="host"&&qrRequestVerified&&!hostAccepted){
   send("decline");closeRoom();qStatus("rejected");return;
 }
 if(role!=="callee"||qrMode==="guest")return;
 send("decline");closeRoom();qStatus("rejected");
});
$("roomStart").addEventListener("click",()=>{
 if(role!=="caller"||!approved||!ready)return;
 $("guidedOffer").click();st("receiving");
});
$("roomEnd").addEventListener("click",()=>closeRoom(true));
$("roomCopy").addEventListener("click",async()=>{
 if(!link)return;
 try{await navigator.clipboard.writeText(link);st("copied");}
 catch(_){$("roomLink").focus();$("roomLink").select();st("copyFail");}
});
$("roomShare").addEventListener("click",async()=>{
 if(!link)return;
 if(!navigator.share){st("shareFail");return;}
 try{await navigator.share({title:"E-ZERO private call",url:link});}
 catch(e){if(e?.name!=="AbortError")st("shareFail");}
});
document.addEventListener("ezero:signal-ready",async event=>{
 if(!ready||!approved||!ws||!["offer","answer"].includes(event.detail?.type))return;
 const type=event.detail.type;
 if((type==="offer"&&role!=="caller")||(type==="answer"&&role!=="callee"))return;
 try{
   const raw=$("localSignal").value;
   const blob=await encrypt(raw);
   if(!send(type,{blob}))throw Error("WS_CLOSED");
   st(type==="answer"?"replying":"receiving");
 }catch(_){st("encryptionError");closeRoom(true);}
});
document.addEventListener("ezero:call-status",e=>{
 if(e.detail?.stage==="connected"&&ready){st("connected");qStatus("connected");clearQr();}
 if(["signalInvalid","fingerprintMismatch","iceNoRoute","micDenied"].includes(e.detail?.stage)&&ready){
   st("failed");qStatus("unavailable");
 }
});
// A scanner click is the only action required on Phone A. It validates the
// peer's signed ephemeral identity before joining the encrypted room.
document.addEventListener("ezero:oneqr-scanned",event=>{
 // The user does not need to locate any of the old manual testing screens.
 $("oneQrCameraSlot").hidden=true;
 const raw=event.detail?.code;
 try{
  if(typeof raw!=="string"||raw.length>1600)throw Error("BAD_QR_SIZE");
  const invite=parseOneQr(raw);
  if(!invite.identity)throw Error("SIGNED_IDENTITY_REQUIRED");
  void applyInvite(invite,true);
 }catch(_){qStatus("invalid");}
});
$("oneQrShow").addEventListener("click",()=>{if(!ready&&!creating)$("roomCreate").click();});
// Reuse the existing camera-only QR scanner without duplicating parser,
// camera permissions, timeout or identity verification logic. Moving an
// existing DOM video node preserves its event listeners and security guards.
const cameraSlot=$("oneQrCameraSlot");
const cameraBody=$("oneQrCameraLive");
cameraBody.append($("scanVideo"),$("qrScanStatus"));
$("oneQrPrivacy").addEventListener("click",()=>$("openPolicy").click());
$("oneQrShareLink").addEventListener("click",async()=>{
 if(!ready||qrMode!=="host"||!link)return;
 // A private room URL contains an ephemeral bearer key. Never append it to
 // analytics, put it in browser logs or auto-share it without a user click.
 try{
  if(typeof navigator.share==="function"){
   await navigator.share({title:"E-ZERO private call",url:link});
   qStatus("linkShared");return;
  }
 }catch(error){if(error?.name==="AbortError")return;}
 try{
  if(typeof navigator.clipboard?.writeText!=="function")
   throw Error("CLIPBOARD_UNAVAILABLE");
  await navigator.clipboard.writeText(link);
  qStatus("linkCopied");
 }catch(_){qStatus("shareUnavailable");}
});
$("oneQrCancelScan").addEventListener("click",()=>{
 $("stopScan").click();
 cameraSlot.hidden=true;
});
$("scanQR").addEventListener("click",()=>{cameraSlot.hidden=false;});
$("oneQrScan").addEventListener("click",()=>{
 if(ready||creating||connecting){qStatus("invalid");return;}
 $("chooseNearby")?.click();
 cameraSlot.hidden=false;
 $("scanQR").click();
 cameraSlot.scrollIntoView?.({block:"center",behavior:"smooth"});
});
$("oneQrAccept").addEventListener("click",()=>{if(!$("roomAccept").disabled)$("roomAccept").click();});
$("oneQrDecline").addEventListener("click",()=>{if(!$("roomDecline").disabled)$("roomDecline").click();});
$("oneQrEnd").addEventListener("click",()=>{if(!$("roomEnd").disabled)$("roomEnd").click();});
window.addEventListener("pagehide",()=>{try{ws?.close(1000,"Page closed");}catch(_){}clearQr();});
$("language").addEventListener("change",draw);
// An invitation can arrive while the app is ALREADY OPEN on the same page.
// Browsers use a same-document hash navigation in this case: the scripts
// do not reload. Handle that navigation and immediately strip bearer data
// from the visible address/history before verifying or joining the room.
window.addEventListener("hashchange",()=>{
 if(location.hash.startsWith("#callroom="))readLink();
});
readLink();draw();
})();
