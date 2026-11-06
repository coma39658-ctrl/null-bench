/* E-ZERO staging-only ephemeral received voice evidence extension.
 * Does not alter voice-note capture/playback/DataChannel or production.
 * A 10-minute on-device reference exists ONLY in the active foreground tab.
 * Recipient must explicitly consent to save media+proof; no uploads.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id),api=window.EZERO_EVIDENCE_V1;
if(!api||!$("ezeroVoiceEvidencePanel")||!$("ezeroVoiceProofSave"))return;
const words={
ur:{sender:"اہم: موصول کنندہ اپنی اجازت سے وائس نوٹ 10 منٹ کے اندر محفوظ کر سکتا ہے۔ ZIP میں SHA-256 اور خودساختہ دستخط ہوگا۔",
  title:"🔏 موصولہ وائس نوٹ کا ثبوت",help:"صرف 10 منٹ میں اصل آواز اور دستخط شدہ ثبوت محفوظ کریں۔ E-ZERO سرور پر میڈیا نہیں جائے گا۔",
  consent:"مجھے یہ فائل محفوظ کرنے کی قانونی اجازت ہے؛ یہ عدالتی سرٹیفکیٹ نہیں۔",
  save:"⬇ وائس نوٹ + SHA-256 ثبوت ZIP",
  waiting:"اجازت کے بغیر ڈاؤن لوڈ نہیں ہوگا۔",
  busy:"اس فون پر کرپٹوگرافک ثبوت بنایا جا رہا ہے۔",
  saved:"✓ اصل آواز اور ثبوت ایک ساتھ تیار ہیں۔ Save لنک استعمال کریں۔",
  expired:"دس منٹ مکمل؛ عارضی محفوظ کرنے کا آپشن ختم ہو گیا۔",
  failed:"ثبوت تیار نہیں ہوا؛ ڈاؤن لوڈ نہیں کیا گیا۔"},
en:{sender:"Recipient may save this voice note within 10 minutes, with SHA-256 and a self-signed evidence package.",
  title:"🔏 Received voice evidence",help:"Save the original and proof within 10 minutes, on-device only. No media upload.",
  consent:"I am authorized to save this media; this is not an official court certificate.",
  save:"⬇ Save original voice + SHA-256 proof ZIP",
  waiting:"Saving requires explicit permission.",busy:"Creating evidence on this device.",
  saved:"✓ Original and signed evidence are ready; use Save below.",
  expired:"Ten minutes elapsed; temporary saving was disabled.",
  failed:"Evidence could not be created. No download completed."},
ar:{sender:"يمكن للمستلم حفظ الرسالة الصوتية خلال عشر دقائق مع بصمة SHA-256 وتوقيع ذاتي.",
  title:"🔏 دليل الرسالة الصوتية",help:"احفظ الأصل والدليل خلال عشر دقائق على جهازك فقط؛ لا تحميل للخادم.",
  consent:"لدي إذن قانوني لحفظ هذه الوسائط؛ هذه ليست شهادة قضائية.",
  save:"⬇ حفظ الصوت ودليل SHA-256",
  waiting:"الحفظ يتطلب إذناً صريحاً.",busy:"يُنشأ الدليل على الجهاز.",
  saved:"✓ الأصل والإثبات جاهزان؛ استخدم رابط الحفظ.",
  expired:"انتهت عشر دقائق؛ تعطل خيار الحفظ المؤقت.",
  failed:"تعذر إنشاء الدليل؛ لم يكتمل التنزيل."}
};
const t=key=>(words[document.documentElement.lang]||words.ur)[key];
let holding=null,deadlineTimer=null,downloadUrl=null;
function status(key){$("ezeroVoiceProofStatus").textContent=t(key);}
function translate(){
 const ids={ezeroVoiceSenderSaveNotice:"sender",ezeroVoiceProofHeading:"title",
  ezeroVoiceProofHelp:"help",ezeroVoiceProofConsentText:"consent",ezeroVoiceProofSave:"save"};
 for(const [id,key] of Object.entries(ids)){$(id).textContent=t(key);}
}
function clearProof(){
 if(deadlineTimer!==null){clearTimeout(deadlineTimer);deadlineTimer=null;}
 if(holding){holding.discard();holding=null;}
 if(downloadUrl){URL.revokeObjectURL(downloadUrl);downloadUrl=null;}
 $("ezeroVoiceProofLinkSlot").replaceChildren();
 $("ezeroVoiceEvidencePanel").hidden=true;
 $("ezeroVoiceProofConsent").checked=false;
 $("ezeroVoiceProofSave").disabled=true;
}
function expired(){
 if(!holding||holding.expired()){
   clearProof();
   $("ezeroVoiceStatus").textContent=t("expired");
   return true;
 }
 return false;
}
function incoming(packet){
 clearProof();
 if(!packet||typeof packet.audio!=="string"||packet.audio.length>32000||
   !["audio/webm","audio/mp4","audio/ogg"].includes(packet.mime))return;
 try{
   const raw=atob(packet.audio);
   if(raw.length<100||raw.length>24000)return;
   const b=Uint8Array.from(raw,c=>c.charCodeAt(0));
   const mime=packet.mime;
   const ext=mime==="audio/mp4"?"m4a":mime==="audio/ogg"?"ogg":"webm";
   const media=new Blob([b],{type:mime});
   holding=api.temporary(media,"E-ZERO-received-voice."+ext,Date.now());
   $("ezeroVoiceEvidencePanel").hidden=false;
   status("waiting");
   deadlineTimer=setTimeout(()=>{
     if(holding){clearProof();$("ezeroVoiceStatus").textContent=t("expired");}
   },api.retentionWindowMs);
 }catch(_){clearProof();}
}
$("ezeroVoiceProofConsent").addEventListener("change",()=>{
 $("ezeroVoiceProofSave").disabled=expired()||!$("ezeroVoiceProofConsent").checked;
});
$("ezeroVoiceProofSave").addEventListener("click",async()=>{
 if(expired()||!$("ezeroVoiceProofConsent").checked)return status("waiting");
 $("ezeroVoiceProofSave").disabled=true;status("busy");
 try{
  const {archive}=await holding.saveWithProof();
  if(expired())throw Error("TEN_MINUTE_WINDOW_EXPIRED");
  if(downloadUrl)URL.revokeObjectURL(downloadUrl);
  downloadUrl=URL.createObjectURL(archive);
  const a=document.createElement("a");
  a.id="ezeroVoiceProofReadyLink";a.href=downloadUrl;
  a.download="E-ZERO-received-voice.ezero-proof.zip";
  a.textContent=t("save");a.style.cssText="display:inline-block;padding:12px;color:#a5f7c0;font-weight:700;";
  $("ezeroVoiceProofLinkSlot").replaceChildren(a);
  status("saved");a.click(); // explicit fallback link remains if mobile download is blocked
 }catch(_){status("failed");}
});
document.addEventListener("ezero:voice-note-received",e=>incoming(e.detail));
$("language")?.addEventListener("change",translate);
window.addEventListener("pagehide",clearProof);
translate();
})();
