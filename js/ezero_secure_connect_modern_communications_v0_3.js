/* E-ZERO modern communications. Preserve original tested WebRTC experiment,
 * explicitly opt-in voice notes, no background recording, server, or archive. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const trans={
ur:{voiceConnect:"📱 وائس میسج بھیجنے کے لیے فون جوڑیں",endCall:"📴 کال ختم / رابطہ بند کریں",connect:"📱 فون جوڑنے کے مراحل",back:"↩ مرکزی صفحہ",heading:"بات کریں، دیکھیں، پیغام بھیجیں",subheading:"آڈیو کال، ویڈیو کال، وائس نوٹ اور نجی چیٹ — ایک آسان جگہ۔ کنکشن کے لیے دونوں فون درکار ہیں۔",free:"بلا اشتہار",consent:"مائک/کیمرہ آپ کی اجازت سے",noArchive:"سرور پر کال آرکائیو نہیں",audio:"آڈیو کال",video:"ویڈیو کال",voice:"وائس میسج",chat:"نجی چیٹ",audioHint:"براہِ راست آواز",videoHint:"آواز اور تصویر",voiceHint:"مختصر ریکارڈنگ",chatHint:"ایک بار کھلنے والا پیغام",callPanel:"آڈیو / ویڈیو کال",callHelp:"اصل آواز اور تصویر صرف حقیقی WebRTC کنکشن کے بعد۔",chatPanel:"نجی چیٹ",chatHelp:"دو فون جڑنے کے بعد ایک بار کھلنے والا پیغام بھیجا جا سکتا ہے۔",voicePanel:"وائس میسج",voiceHelp:"زیادہ سے زیادہ 6 سیکنڈ ریکارڈ کریں۔ Send دبانے سے پہلے کوئی آواز دوسرے فون کو نہیں جائے گی۔",record:"🎙️ ریکارڈ کریں",stop:"■ ریکارڈنگ بند",sendVoice:"↗ وائس نوٹ بھیجیں",discard:"✕ حذف",preview:"یہ آواز ابھی صرف آپ کے فون کی عارضی میموری میں ہے۔",incomingVoice:"دوست کا عارضی وائس نوٹ ملا ہے۔",playVoice:"🎧 ایک بار سنیں",setupTitle:"رابطہ جوڑیں",setupHelp:"فی الحال تجرباتی کال میں ایک فون کی دعوت اور دوسرے کا جواب شیئر کرنا ضروری ہے۔ خودکار کال سرور نہیں۔",qrLink:"▦ QR اور دوست",privacyLink:"🔒 پرائیویسی پالیسی",offlineTitle:"📶 مستقبل: Nearby / Offline Connect",offlineExplain:"ایک ہی مقامی Wi-Fi یا منظوری یافتہ ہاٹ اسپاٹ پر E-ZERO فون ملانے کا منصوبہ ہے۔ ابھی فعال نہیں۔",offlineConsent:"مستقبل میں انسٹالیشن کے دوران Nearby کی اختیاری، قابلِ واپسی رضامندی مل سکتی ہے۔ اس سے کسی دوسرے فون کا ڈیٹا خودکار استعمال کرنے کی اجازت نہیں ملتی۔",offlineTruth:"PWA خود Wi-Fi یا ہاٹ اسپاٹ نہیں چلا سکتی۔ OS کی اجازت اور الگ مقامی ٹیکنالوجی درکار ہوگی۔",idle:"ابھی حقیقی دو فون کنکشن نہیں۔",connected:"✓ حقیقی WebRTC کنکشن قائم ہے۔",connecting:"رابطہ قائم ہونے کی تصدیق باقی ہے۔",failed:"رابطہ ناکام؛ نیٹ ورک اور دعوت/جواب چیک کریں۔",audioInfo:"آڈیو کال کے لیے دو فونوں کی دعوت/جواب سے WebRTC کنکشن بنائیں۔",videoInfo:"ویڈیو کال کے لیے کنکشن بنائیں اور کیمرے کی اجازت دیں۔",voiceInfo:"وائس نوٹ مقامی ریکارڈ کریں، پھر فعال کنکشن کے ذریعے بھیجیں۔",chatInfo:"کنکشن کے بعد ایک بار کھلنے والا نجی پیغام بھیجیں۔",voiceIdle:"وائس نوٹ بھیجنے کے لیے حقیقی کنکشن ضروری ہے۔",recording:"آپ کی اجازت سے مائک 6 سیکنڈ تک ریکارڈ کر رہا ہے۔",ready:"مقامی وائس نوٹ تیار ہے؛ کنکشن ہو تو Send دبائیں۔",sent:"✓ وائس نوٹ کنکشن پر بھیج دیا گیا؛ سننے کی تصدیق نہیں۔",sendFail:"دو فونوں کا کنکشن موجود نہیں؛ ریکارڈنگ مقامی ہے۔",invalid:"وائس نوٹ غیر معاون یا حد سے بڑا ہے؛ دوبارہ بنائیں۔",permission:"مائک یا ریکارڈنگ کی اجازت/سپورٹ موجود نہیں۔",received:"عارضی وائس نوٹ آیا؛ سننے کے لیے بٹن دبائیں۔",expired:"وائس نوٹ حذف یا زائد المیعاد ہوگیا۔"},
en:{voiceConnect:"📱 Connect phones to send voice",endCall:"📴 Hang up / disconnect",connect:"📱 Connect both phones",back:"↩ Main page",heading:"Talk, see and send",subheading:"Audio, video, voice notes and private chat in one place. Two phones are required.",free:"No ads",consent:"Mic/camera with permission",noArchive:"No server call archive",audio:"Audio call",video:"Video call",voice:"Voice note",chat:"Private chat",audioHint:"Direct audio",videoHint:"Audio and video",voiceHint:"Short recording",chatHint:"One-view message",callPanel:"Audio / video call",callHelp:"Real media only after an actual WebRTC connection.",chatPanel:"Private chat",chatHelp:"Send a one-view message when both browsers are connected.",voicePanel:"Voice message",voiceHelp:"Record up to 6 seconds. Nothing is sent until you press Send.",record:"🎙️ Record",stop:"■ Stop",sendVoice:"↗ Send voice note",discard:"✕ Discard",preview:"This audio is temporary and local only.",incomingVoice:"A temporary voice note has arrived.",playVoice:"🎧 Listen once",setupTitle:"Connect devices",setupHelp:"Experimental calls still require sharing an offer and an answer. There is no automatic signaling server.",qrLink:"▦ QR & friends",privacyLink:"🔒 Privacy policy",offlineTitle:"📶 Future: Offline Nearby",offlineExplain:"Local Wi-Fi or an approved hotspot might connect nearby E-ZERO phones in a future release. Not active.",offlineConsent:"A future optional, revocable Nearby installation preference cannot authorize automatic use of another phone's mobile data.",offlineTruth:"A PWA cannot turn on Wi-Fi or a hotspot without OS support and permission.",idle:"No real two-phone connection yet.",connected:"✓ Real WebRTC connection established.",connecting:"Connection is not yet confirmed.",failed:"Connection failed. Check network and offer/answer.",audioInfo:"Connect both phones via the offer and answer before an audio call.",videoInfo:"Connect both phones and grant camera permission before video.",voiceInfo:"Record locally, then send over an active connection.",chatInfo:"Send a one-view private message after connection.",voiceIdle:"Connect two phones to send voice.",recording:"Recording with your permission for up to 6 seconds.",ready:"Local voice note ready. Press Send when connected.",sent:"✓ Voice note sent; delivery does not prove listening.",sendFail:"No active connection; recording stays local.",invalid:"Unsupported or oversized note. Record again.",permission:"Microphone or recorder permission/support unavailable.",received:"Temporary voice note received. Tap to listen.",expired:"Voice note expired or discarded."},
ar:{voiceConnect:"📱 اربط الهاتفين لإرسال الصوت",endCall:"📴 إنهاء المكالمة / قطع الاتصال",connect:"📱 خطوات ربط الهاتفين",back:"↩ الصفحة الرئيسية",heading:"تحدث وشاهد وأرسل",subheading:"مكالمات صوتية ومرئية ورسائل صوتية ومحادثات خاصة، مع اتصال حقيقي بين هاتفين.",free:"بلا إعلانات",consent:"إذن للكاميرا والميكروفون",noArchive:"لا أرشيف للمكالمات على الخادم",audio:"مكالمة صوتية",video:"مكالمة مرئية",voice:"رسالة صوتية",chat:"محادثة خاصة",audioHint:"صوت مباشر",videoHint:"صوت وصورة",voiceHint:"تسجيل قصير",chatHint:"رسالة تُفتح مرة واحدة",callPanel:"مكالمة صوتية / مرئية",callHelp:"تظهر الوسائط بعد اتصال WebRTC حقيقي.",chatPanel:"محادثة خاصة",chatHelp:"أرسل رسالة تُفتح مرة واحدة بعد اتصال الهاتفين.",voicePanel:"رسالة صوتية",voiceHelp:"سجّل حتى 6 ثوانٍ؛ لن تُرسل حتى تضغط إرسال.",record:"🎙️ تسجيل",stop:"■ إيقاف",sendVoice:"↗ إرسال الصوت",discard:"✕ حذف",preview:"الصوت محلي ومؤقت على الهاتف.",incomingVoice:"وصلت رسالة صوتية مؤقتة.",playVoice:"🎧 استمع مرة واحدة",setupTitle:"ربط الأجهزة",setupHelp:"تحتاج المكالمة التجريبية إلى تبادل دعوة ورد؛ لا يوجد خادم اتصال تلقائي.",qrLink:"▦ QR والأصدقاء",privacyLink:"🔒 سياسة الخصوصية",offlineTitle:"📶 مستقبلًا: Nearby دون إنترنت",offlineExplain:"نخطط لاتصال هواتف E-ZERO القريبة عبر Wi-Fi محلي أو نقطة اتصال بموافقة. غير مفعّل.",offlineConsent:"تفضيل Nearby اختياري وقابل للإلغاء مستقبلًا، ولا يسمح باستخدام بيانات هاتف آخر تلقائيًا.",offlineTruth:"لا يستطيع PWA تشغيل Wi-Fi أو نقطة الاتصال بلا دعم وأذونات النظام.",idle:"لا يوجد اتصال حقيقي بين الهاتفين.",connected:"✓ تم إنشاء اتصال WebRTC حقيقي.",connecting:"لم يتأكد الاتصال بعد.",failed:"فشل الاتصال؛ تحقق من الشبكة والدعوة والرد.",audioInfo:"اربط الهاتفين بالدعوة والرد للمكالمة الصوتية.",videoInfo:"اربط الهاتفين واسمح بالكاميرا للمكالمة المرئية.",voiceInfo:"سجّل محليًا ثم أرسل بعد الاتصال.",chatInfo:"أرسل رسالة خاصة تُفتح مرة واحدة بعد الاتصال.",voiceIdle:"يجب ربط الهاتفين لإرسال الصوت.",recording:"يجري التسجيل بإذنك لمدة 6 ثوانٍ كحد أقصى.",ready:"الرسالة جاهزة؛ اضغط إرسال بعد الاتصال.",sent:"✓ تم إرسال الصوت، ولا يعني ذلك أن الطرف الآخر استمع.",sendFail:"لا يوجد اتصال؛ يبقى التسجيل محليًا.",invalid:"الصوت كبير أو غير مدعوم. أعد التسجيل.",permission:"الميكروفون أو التسجيل غير متاح.",received:"وصلت رسالة مؤقتة؛ اضغط للاستماع.",expired:"انتهت صلاحية الرسالة أو حُذفت."}
};
const t=k=>(trans[document.documentElement.lang]||trans.ur)[k]||k;
let current="audio", recorder=null, micStream=null, limitTimer=null, draft=null, draftUrl=null,
  incoming=null, incomingUrl=null, incomingTimeout=null, recId=0;
const pick=(selector)=>document.querySelector(selector);
function moveOriginal(){
  const media=$("mediaTitle")?.closest("section.card");
  const chat=$("messageTitle")?.closest("section.card");
  const setup=$("callSetup");
  if(media)$("ezeroCallMediaSlot").append(media);
  if(chat)$("ezeroChatSlot").append(chat);
  if(setup)$("ezeroCallSetupSlot").append(setup);
  if(setup)setup.open=false;
  if($("ezeroCallSetupSlot"))$("ezeroCallSetupSlot").hidden=true;
}
moveOriginal();
$("modernHangup").addEventListener("click",()=>{
  $("hangup").click();
  ++recId;stopMic();clearDraft();clearIncoming();
  setConnection("idle");
  $("ezeroCallSetupSlot").hidden=true;
});
function openConnectionSteps(){
  $("ezeroCallSetupSlot").hidden=false;
  $("callSetup").open=true;
  $("ezeroCallSetupSlot").scrollIntoView({block:"start",behavior:"smooth"});
}
$("modernConnect").addEventListener("click",openConnectionSteps);
$("ezeroVoiceConnect").addEventListener("click",openConnectionSteps);
function setConnection(stage){
 const el=$("modernConnectionStatus");
 const connected=stage==="connected";
 el.textContent=t(connected?"connected":stage==="iceNoRoute"||stage==="signalInvalid"||stage==="micDenied"?"failed":stage==="idle"?"idle":"connecting");
 el.dataset.state=connected?"connected":"idle";
 const dataReady=window.EZERO_VOICE_TRANSPORT?.connected()===true;
 $("ezeroVoiceSend").disabled=!(draft&&dataReady);
 $("ezeroVoiceConnect").hidden=dataReady;
}
const explain=()=>{ $("modernFeatureTitle").textContent=t(current);
 $("modernFeatureHelp").textContent=t(current+"Info"); };
function select(type){
 if(!["audio","video","voice","chat"].includes(type))return;
 current=type;
 for(const b of document.querySelectorAll("[data-modern-select]"))
   b.setAttribute("aria-pressed",String(b.dataset.modernSelect===type));
 const call=type==="audio"||type==="video";
 $("modernCallPanel").hidden=!call;
 $("modernChatPanel").hidden=type!=="chat";
 $("modernVoicePanel").hidden=type!=="voice";
 const radio=pick('input[name="mode"][value="'+(type==="video"?"video":"audio")+'"]');
 if(radio)radio.checked=true;
 explain();
}
for(const b of document.querySelectorAll("[data-modern-select]"))b.addEventListener("click",()=>select(b.dataset.modernSelect));
function translate(){
 for(const el of document.querySelectorAll("[data-modern]"))el.textContent=t(el.dataset.modern);
 const lang=document.documentElement.lang||"ur";
 for(const id of ["modernBack","modernQrLink","modernPolicyLink"]){
   const el=$(id),page=id==="modernPolicyLink"?"ezero_secure_connect_privacy_v0_2.html":"ezero_secure_connect_live_p2p_v0_1.html";
   el.href="./"+page+(lang==="ur"?"":"?lang="+encodeURIComponent(lang));
 }
 explain();
 if($("modernConnectionStatus").dataset.state!=="connected")$("modernConnectionStatus").textContent=t("idle");
 if(!draft)$("ezeroVoiceStatus").textContent=t("voiceIdle");
}
$("language").addEventListener("change",translate);
translate();
select(new URLSearchParams(location.search).get("mode")||"audio");
document.addEventListener("ezero:call-status",e=>setConnection(e.detail?.stage));
document.addEventListener("ezero:channel-state",e=>{
  if(e.detail?.connected)setConnection("connected");
  else{$("ezeroVoiceSend").disabled=true;$("ezeroVoiceConnect").hidden=false;clearIncoming();}
});
function stopMic(){
 if(limitTimer){clearTimeout(limitTimer);limitTimer=null;}
 if(recorder?.state==="recording"){try{recorder.stop();}catch(_){}}
 if(micStream){micStream.getTracks().forEach(tr=>tr.stop());micStream=null;}
 $("ezeroVoiceStop").hidden=true;$("ezeroVoiceRecord").disabled=false;
}
function clearDraft(){
 if(draftUrl){URL.revokeObjectURL(draftUrl);draftUrl=null;}
 draft=null;$("ezeroVoicePreview").pause();$("ezeroVoicePreview").removeAttribute("src");
 $("ezeroVoiceDraft").hidden=true;$("ezeroVoiceSend").disabled=true;$("ezeroVoiceClear").disabled=true;
}
function clearIncoming(){
 if(incomingTimeout){clearTimeout(incomingTimeout);incomingTimeout=null;}
 if(incomingUrl){URL.revokeObjectURL(incomingUrl);incomingUrl=null;}
 incoming=null;$("ezeroVoiceIncomingAudio").pause();$("ezeroVoiceIncomingAudio").removeAttribute("src");
 $("ezeroVoiceIncomingAudio").hidden=true;$("ezeroVoiceOpenIncoming").hidden=false;$("ezeroVoiceReceived").hidden=true;
}
function voiceStatus(key){$("ezeroVoiceStatus").textContent=t(key);}
$("ezeroVoiceRecord").addEventListener("click",async()=>{
 if(micStream||recorder?.state==="recording")return;
 clearDraft();
 if(typeof MediaRecorder!=="function"||!navigator.mediaDevices?.getUserMedia){voiceStatus("permission");return;}
 const generation=++recId;
 try{
  const s=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
  if(generation!==recId||document.hidden){s.getTracks().forEach(x=>x.stop());return;}
  micStream=s;
  const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg","audio/webm"]
    .find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime){stopMic();voiceStatus("permission");return;}
  const chunks=[];
  recorder=new MediaRecorder(s,{mimeType:mime,audioBitsPerSecond:20000});
  const r=recorder;
  r.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  r.onstop=()=>{
    stopMic();
    if(generation!==recId)return;
    const blob=new Blob(chunks,{type:r.mimeType});
    const type=blob.type.split(";")[0].toLowerCase();
    if(blob.size<100||blob.size>23000||!["audio/webm","audio/mp4","audio/ogg"].includes(type)){
      voiceStatus("invalid");return;
    }
    draft={blob,mime:type};draftUrl=URL.createObjectURL(blob);
    $("ezeroVoicePreview").src=draftUrl;$("ezeroVoiceDraft").hidden=false;
    $("ezeroVoiceClear").disabled=false;
    $("ezeroVoiceSend").disabled=!window.EZERO_VOICE_TRANSPORT?.connected();
    voiceStatus("ready");
  };
  recorder.start();
  $("ezeroVoiceRecord").disabled=true;$("ezeroVoiceStop").hidden=false;
  voiceStatus("recording");
  limitTimer=setTimeout(stopMic,6000);
 }catch(_){stopMic();voiceStatus("permission");}
});
$("ezeroVoiceStop").addEventListener("click",stopMic);
$("ezeroVoiceClear").addEventListener("click",()=>{++recId;stopMic();clearDraft();voiceStatus("expired");});
$("ezeroVoiceSend").addEventListener("click",async()=>{
 if(!draft||!window.EZERO_VOICE_TRANSPORT?.connected()){voiceStatus("sendFail");return;}
 $("ezeroVoiceSend").disabled=true;
 try{
   const bytes=new Uint8Array(await draft.blob.arrayBuffer());
   if(bytes.length>23000)throw Error("TOO_LARGE");
   let binary="";for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
   const good=window.EZERO_VOICE_TRANSPORT.send(draft.mime,btoa(binary));
   if(!good){voiceStatus("sendFail");return;}
   clearDraft();voiceStatus("sent");
 }catch(_){voiceStatus("invalid");}
});
document.addEventListener("ezero:voice-note-received",e=>{
 const d=e.detail;
 if(!d||typeof d.audio!=="string"||d.audio.length>32000||!["audio/webm","audio/mp4","audio/ogg"].includes(d.mime))return;
 clearIncoming();
 incoming={audio:d.audio,mime:d.mime};
 $("ezeroVoiceReceived").hidden=false;voiceStatus("received");
 incomingTimeout=setTimeout(clearIncoming,600000);
});
$("ezeroVoiceOpenIncoming").addEventListener("click",()=>{
 if(!incoming)return;
 try{
   const b=atob(incoming.audio);
   if(b.length>24000)throw Error("TOO_LARGE");
   const raw=Uint8Array.from(b,c=>c.charCodeAt(0));
   const blob=new Blob([raw],{type:incoming.mime});
   incomingUrl=URL.createObjectURL(blob);
   $("ezeroVoiceIncomingAudio").src=incomingUrl;
   $("ezeroVoiceIncomingAudio").hidden=false;
   $("ezeroVoiceOpenIncoming").hidden=true;
   incoming=null;
   $("ezeroVoiceIncomingAudio").play().catch(()=>{});
   if(incomingTimeout)clearTimeout(incomingTimeout);
   incomingTimeout=setTimeout(clearIncoming,300000);
 }catch(_){clearIncoming();voiceStatus("invalid");}
});
$("ezeroVoiceIncomingAudio").addEventListener("ended",()=>{clearIncoming();voiceStatus("expired");});
document.addEventListener("visibilitychange",()=>{if(document.hidden){++recId;stopMic();}});
window.addEventListener("pagehide",()=>{++recId;stopMic();clearDraft();clearIncoming();});
})();
