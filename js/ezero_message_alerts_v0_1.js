/* E-ZERO Secure Connect local in-page alerts.
 * Only validated events from the authenticated WebRTC DataChannel.
 * No message body, user identity, recording, or media is exposed.
 * Sound requires an explicit tap, and does not imply background Web Push.
 */
(()=>{
 "use strict";
 const $=id=>document.getElementById(id);
 if(!document.body?.classList.contains("ezero-one-lab"))return;
 const host=$("ezeroUnifiedCard");if(!host)return;
 const translations={
   ur:{button:"🔔 پیغام کی بیل فعال کریں",on:"🔕 پیغام کی بیل بند کریں",
     off:"نیا پیغام اسی صفحے پر نظر آئے گا؛ بیل کے لیے بٹن دبائیں۔",
     ready:"✓ اس صفحے کی بیل فعال؛ براؤزر بند ہونے پر Push ابھی دستیاب نہیں۔",
     blocked:"براؤزر نے بیل نہیں چلائی؛ تحریری اطلاع برقرار ہے۔",
     text:"💬 نیا نجی پیغام — چیٹ کھولیں",
     voice:"🎙️ نیا وائس میسج — وائس میسج کھولیں"},
   ar:{button:"🔔 تفعيل جرس الرسائل",on:"🔕 إيقاف جرس الرسائل",
     off:"تظهر الرسالة الجديدة داخل الصفحة؛ اضغط لتشغيل الجرس.",
     ready:"✓ جرس الصفحة نشط؛ الإشعارات عند إغلاق المتصفح غير متاحة.",
     blocked:"المتصفح منع الجرس؛ التنبيه النصي باقٍ.",
     text:"💬 رسالة خاصة جديدة — افتح الدردشة",
     voice:"🎙️ رسالة صوتية جديدة — افتح الرسائل الصوتية"},
   en:{button:"🔔 Enable message chime",on:"🔕 Mute message chime",
     off:"New messages show in this page. Tap to enable sound.",
     ready:"✓ In-page chime enabled; closed-browser push not available yet.",
     blocked:"Browser blocked the chime; the text notice remains.",
     text:"💬 New private message — open Chat",
     voice:"🎙️ New voice message — open Voice messages"}
 };
 const lang=()=>["ur","ar","en"].includes(document.documentElement.lang)?document.documentElement.lang:"ur";
 const t=k=>(translations[lang()]||translations.ur)[k]||k;
 const box=document.createElement("div");box.id="ezeroMessageAlerts";
 box.className="ezero-message-alerts";
 const toggle=document.createElement("button");toggle.id="ezeroMessageChimeEnable";
 toggle.type="button";
 const hint=document.createElement("small");hint.id="ezeroMessageChimeStatus";
 hint.setAttribute("role","status");
 const announcement=document.createElement("button");announcement.type="button";
 announcement.id="ezeroMessageIncomingNotice";announcement.hidden=true;
 announcement.setAttribute("aria-live","polite");
 box.append(toggle,hint,announcement);host.append(box);
 const AudioCtor=window.AudioContext||window.webkitAudioContext;
 let ctx=null,allowed=false,lastType=null,clearTimer=null,count=0;
 function redraw(){
   toggle.textContent=t(allowed?"on":"button");
   hint.textContent=t(allowed?"ready":"off");
   if(lastType)announcement.textContent=t(lastType);
 }
 function chirp(){
   if(!allowed||!ctx||ctx.state!=="running"||document.hidden)return;
   const at=ctx.currentTime;
   for(const [offset,hz] of [[0,665],[.16,845]]){
     try{
       const oscillator=ctx.createOscillator(),gain=ctx.createGain();
       oscillator.type="sine";
       oscillator.frequency.setValueAtTime(hz,at+offset);
       gain.gain.setValueAtTime(0,at+offset);
       gain.gain.linearRampToValueAtTime(.045,at+offset+.025);
       gain.gain.linearRampToValueAtTime(0,at+offset+.12);
       oscillator.connect(gain);gain.connect(ctx.destination);
       oscillator.start(at+offset);oscillator.stop(at+offset+.13);
       oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect();}catch(_){}};
     }catch(_){}
   }
 }
 function notify(type){
   if(!["text","voice"].includes(type))return;
   if(!window.EZERO_PEER_PROFILE_TRANSPORT?.connected())return;
   ++count;lastType=type;
   announcement.hidden=false;
   announcement.dataset.kind=type;
   announcement.dataset.count=String(count);
   redraw();chirp();
   if(clearTimer)clearTimeout(clearTimer);
   clearTimer=setTimeout(()=>{announcement.hidden=true;lastType=null;},12000);
 }
 announcement.addEventListener("click",()=>{
   if(!lastType)return;
   const which=lastType;announcement.hidden=true;
   const primary=$(which==="voice"?"ezeroInCallVoice":"ezeroInCallChat");
   if(primary&&!primary.hidden&&window.EZERO_PEER_PROFILE_TRANSPORT?.connected()){
     const openDrawer=$("ezeroInCallMessageDrawer");
     if(!openDrawer?.hidden){
       const tab=$(which==="voice"?"ezeroInCallVoiceTab":"ezeroInCallChatTab");
       if(tab)tab.click();
     }else primary.click();
   }else{
     document.querySelector('[data-modern-select="'+(which==="voice"?"voice":"chat")+'"]')?.click();
   }
 });
 toggle.addEventListener("click",async()=>{
   if(allowed){allowed=false;try{await ctx?.suspend();}catch(_){}redraw();return;}
   if(!AudioCtor){hint.textContent=t("blocked");return;}
   try{
     if(!ctx)ctx=new AudioCtor();
     await ctx.resume();
     allowed=ctx.state==="running";
     redraw();if(!allowed)hint.textContent=t("blocked");
   }catch(_){allowed=false;redraw();hint.textContent=t("blocked");}
 });
 document.addEventListener("ezero:voice-note-received",()=>notify("voice"));
 document.addEventListener("ezero:private-text-received",()=>notify("text"));
 document.addEventListener("ezero:call-status",e=>{
   if(e.detail?.stage==="idle"){
     announcement.hidden=true;lastType=null;count=0;
     if(clearTimer){clearTimeout(clearTimer);clearTimer=null;}
   }
 });
 $("language")?.addEventListener("change",redraw);
 window.addEventListener("pagehide",()=>{
   if(clearTimer)clearTimeout(clearTimer);
   try{ctx?.close();}catch(_){}
 });
 redraw();
})();
