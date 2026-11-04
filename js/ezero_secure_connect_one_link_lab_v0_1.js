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
const lang=()=>["ur","en","ar"].includes($("language")?.value)?$("language").value:"ur";
const t=k=>(text[lang()]||text.ur)[k]||text.ur[k]||k;
const st=k=>{const e=$("roomStatus");e.textContent=t(k);e.dataset.state=k;};
function draw(){
 for(const el of document.querySelectorAll("[data-room-i18n]"))
   el.textContent=t(el.dataset.roomI18n);
 $("roomStart").disabled=!(ready&&role==="caller"&&approved);
 $("roomAccept").disabled=!(ready&&role==="callee"&&!approved);
 $("roomDecline").disabled=!(ready&&role==="callee"&&!approved);
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
 if(envelope?.v!==1||!["offer","answer"].includes(envelope.type)||typeof envelope.sdp!=="string")
   throw Error("SIGNAL_INVALID");
 return plain;
}
function readLink(){
 const raw=location.hash.slice(1);
 // Parsing only; a fragment is never sent to the origin server.
 const m=raw.match(/^callroom=([a-f0-9]{32})\.([a-f0-9]{64})\.([0-9]{13})\.([a-f0-9]{64})$/);
 if(!m)return false;
 roomId=m[1];issued=Number(m[3]);proof=m[4];
 creating=true; // Disable conflicting room creation during async key derivation.
 // Strip the fragment before any asynchronous operation; incoming participants
 // must not expose their bearer link in the UI or browser history.
 history.replaceState(null,"",location.pathname+location.search);
 $("roomLink").value="";link="";
 st("incoming");draw();
 void useSecret(m[2]).then(()=>{secret=null;}).catch(()=>{
   roomId=null;auth=null;proof=null;issued=null;secretKey=null;secret=null;st("invalid");
 }).finally(()=>{creating=false;draw();});
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
 secret=null;secretKey=null;auth=null;proof=null;issued=null;link="";roomId=null;
 $("roomLink").value="";
 $("hangup")?.click();
 st("ended");draw();
}
async function receive(frame){
 if(frame?.v!==1||typeof frame.type!=="string")return;
 if(frame.type==="ready"){role=frame.role;ready=true;st("joined");draw();return;}
 if(frame.type==="peer_joined"){joined=true;st("peer");draw();return;}
 if(frame.type==="accepted"){if(role!=="caller")return;approved=true;st("accepted");draw();return;}
 if(frame.type==="decline"){closeRoom();st("declined");return;}
 if(frame.type==="hangup"){closeRoom();return;}
 if(frame.type==="peer_left"){closeRoom();return;}
 if(frame.type==="error"){closeRoom();st("failed");return;}
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
 if(!window.isSecureContext||!crypto?.subtle){st("failed");return;}
 creating=true;draw();
 try{
  const owner=$("roomOwnerSecret").value.trim();
  if(!/^[a-f0-9]{64}$/.test(owner)){st("ownerRequired");return;}
  roomId=hex(crypto.getRandomValues(new Uint8Array(16)));
  issued=Date.now();
  await useSecret(hex(crypto.getRandomValues(new Uint8Array(32))));
  const hmacKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(owner),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const signed=new Uint8Array(await crypto.subtle.sign("HMAC",hmacKey,
    new TextEncoder().encode(roomId+"."+auth+"."+issued)));
  proof=hex(signed);
  $("roomOwnerSecret").value=""; // never store or forward the operator's passcode
  link=new URL(location.pathname+location.search+"#callroom="+roomId+"."+secret+"."+issued+"."+proof,location.origin).href;
  secret=null; // Raw link key remains only in approved share field and CryptoKey.
  st("linkReady");draw();connect();
 }catch(_){st("failed");}finally{creating=false;draw();}
});
$("roomJoin").addEventListener("click",()=>connect());
$("roomAccept").addEventListener("click",()=>{
 if(role!=="callee"||!ready)return;
 approved=send("accept");if(approved)st("receiving");draw();
});
$("roomDecline").addEventListener("click",()=>{
 if(role!=="callee"||!ready)return;
 send("decline");closeRoom();
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
 if(e.detail?.stage==="connected"&&ready)st("connected");
 if(["signalInvalid","fingerprintMismatch","iceNoRoute","micDenied"].includes(e.detail?.stage)&&ready)
   st("failed");
});
window.addEventListener("pagehide",()=>{try{ws?.close(1000,"Page closed");}catch(_){}});
$("language").addEventListener("change",draw);
readLink();draw();
})();
