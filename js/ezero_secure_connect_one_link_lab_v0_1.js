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
 },
 en:{
   title:"Private one-link call — experimental",explain:"No long WhatsApp codes. Send the private link to one friend. They explicitly accept, then you tap Start. Media does not pass through Cloudflare.",
   create:"🔗 Create private call link",join:"📞 Join this invitation",
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
   remind:"Staging-only feature; public enrollment requires verified real-phone tests."
 },
 ar:{
   title:"مكالمة خاصة برابط واحد — تجربة",explain:"بلا رموز واتساب طويلة. أرسل الرابط لصديق موثوق؛ يوافق ثم تضغط بدء. الصوت والفيديو لا يمران عبر Cloudflare.",
   create:"🔗 أنشئ رابط مكالمة خاصاً",join:"📞 انضم إلى هذه الدعوة",
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
   remind:"الميزة في مرحلة التجربة فقط؛ لا تفتح للجمهور قبل اختبار هاتفين فعلياً."
 }
};
let roomId=null,secret=null,secretKey=null,ws=null,role=null,joined=false,approved=false;
let ready=false, link="",closing=false;
const lang=()=>["ur","en","ar"].includes($("language")?.value)?$("language").value:"ur";
const t=k=>(text[lang()]||text.ur)[k]||text.ur[k]||k;
const st=k=>{const e=$("roomStatus");e.textContent=t(k);e.dataset.state=k;};
function draw(){
 for(const el of document.querySelectorAll("[data-room-i18n]"))
   el.textContent=t(el.dataset.roomI18n);
 $("roomStart").disabled=!(ready&&role==="caller"&&approved);
 $("roomAccept").disabled=!(ready&&role==="callee"&&!approved);
 $("roomDecline").disabled=!(ready&&role==="callee"&&!approved);
 $("roomCreate").disabled=ready;
 $("roomJoin").disabled=ready||!roomId;
 $("roomCopy").disabled=!link;
 $("roomShare").disabled=!link;
 $("roomEnd").disabled=!ready;
}
function hex(bytes){return [...bytes].map(v=>v.toString(16).padStart(2,"0")).join("");}
function bytesFromHex(v){return Uint8Array.from(v.match(/../g)||[],x=>parseInt(x,16));}
function b64(b){let raw="";for(let i=0;i<b.length;i++)raw+=String.fromCharCode(b[i]);return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function unb64(s){const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function useSecret(value){
 if(!/^[a-f0-9]{64}$/.test(value))throw Error("SECRET_FORMAT");
 secret=value;
 secretKey=await crypto.subtle.importKey("raw",bytesFromHex(value),{name:"AES-GCM"},false,["encrypt","decrypt"]);
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
 const m=raw.match(/^callroom=([a-f0-9]{32})\.([a-f0-9]{64})$/);
 if(!m)return false;
 roomId=m[1];useSecret(m[2]).catch(()=>st("invalid"));
 link=location.href; $("roomLink").value=link;
 history.replaceState(null,"",location.pathname+location.search);
 st("incoming");draw();return true;
}
function send(type,body={}){
 if(ws?.readyState!==WebSocket.OPEN)return false;
 ws.send(JSON.stringify({v:1,type,...body}));return true;
}
function closeRoom(sendHangup=false){
 if(sendHangup)send("hangup");
 closing=true;
 try{ws?.close(1000,"Done");}catch(_){}
 ws=null;ready=false;approved=false;joined=false;
 $("hangup")?.click();
 st("ended");draw();
}
async function receive(frame){
 if(frame?.v!==1||typeof frame.type!=="string")return;
 if(frame.type==="ready"){role=frame.role;ready=true;st("joined");draw();return;}
 if(frame.type==="peer_joined"){joined=true;st("peer");draw();return;}
 if(frame.type==="accepted"){if(role!=="caller")return;approved=true;st("accepted");draw();return;}
 if(frame.type==="decline"){st("declined");closeRoom();return;}
 if(frame.type==="hangup"){closeRoom();return;}
 if(frame.type==="peer_left"){st("ended");return;}
 if(frame.type==="error"){st("failed");return;}
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
 if(!roomId||!secret||!secretKey){st("invalid");return;}
 if(ws&&ws.readyState<=1)return;
 st("connecting");closing=false;
 try{
   ws=new WebSocket(endpoint+"/v1/room/"+roomId,["ezero-room-v1","ezero-key-"+secret]);
   ws.onmessage=e=>{let obj;try{obj=JSON.parse(e.data);}catch(_){return;}void receive(obj);};
   ws.onerror=()=>st("serverOff");
   ws.onclose=()=>{ready=false;ws=null;if(!closing)st("serverOff");draw();};
 }catch(_){st("failed");}
}
$("roomCreate").addEventListener("click",async()=>{
 if(!window.isSecureContext||!crypto?.subtle){st("failed");return;}
 try{
  roomId=hex(crypto.getRandomValues(new Uint8Array(16)));
  await useSecret(hex(crypto.getRandomValues(new Uint8Array(32))));
  link=new URL(location.pathname+location.search+"#callroom="+roomId+"."+secret,location.origin).href;
  $("roomLink").value=link;st("linkReady");draw();connect();
 }catch(_){st("failed");}
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
