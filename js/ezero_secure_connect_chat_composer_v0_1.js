/* E-ZERO mobile messenger composer. Retains original WebRTC one-view messages. */
(() => {
 "use strict";
 const $=id=>document.getElementById(id);
 const panel=$("modernChatPanel"),open=$("ezeroMessagesOpen"),plus=$("ezeroChatPlus");
 const tools=$("ezeroChatTools"),field=$("sendText"),send=$("sendMessage");
 if(!panel||!open||!plus||!tools||!field||!send)return;
 const i18n={
  ur:{messagesButton:"💬 میسجز کھولیں",chatEmpty:"اس جگہ صرف عارضی پیغامات نظر آئیں گے؛ مستقل گفتگو محفوظ نہیں ہوگی۔",voiceOption:"🎙️ وائس میسج",connectOption:"🔗 فون جوڑیں",clearOption:"✕ غیر بھیجا متن صاف کریں",chatPrivacy:"پیغام صرف حقیقی محفوظ کنکشن پر جائے گا؛ مستقل سرور چیٹ آرکائیو نہیں۔",more:"مزید سہولتیں",compose:"پیغام لکھیں"},
  en:{messagesButton:"💬 Open messages",chatEmpty:"Only temporary one-view messages appear here; there is no permanent chat archive.",voiceOption:"🎙️ Voice message",connectOption:"🔗 Connect phones",clearOption:"✕ Clear unsent text",chatPrivacy:"Messages are sent only over the real secure connection; no server chat archive.",more:"More options",compose:"Write a message"},
  ar:{messagesButton:"💬 فتح الرسائل",chatEmpty:"تظهر هنا الرسائل المؤقتة فقط ولا يُحفظ سجل محادثات دائم.",voiceOption:"🎙️ رسالة صوتية",connectOption:"🔗 ربط الهاتفين",clearOption:"✕ مسح النص غير المرسل",chatPrivacy:"لا تُرسل الرسائل إلا عبر اتصال آمن فعلي، ودون أرشيف دائم.",more:"المزيد",compose:"اكتب رسالة"}
 };
 const t=key=>(i18n[document.documentElement.lang]||i18n.ur)[key]||key;
 const label=field.closest("label");
 if(!label)return;
 $("ezeroChatTextSlot").append(label);
 $("ezeroChatSendSlot").append(send);
 label.classList.add("ezero-chat-input-label");
 field.rows=3;
 function hideMenu(){
  tools.hidden=true;
  plus.setAttribute("aria-expanded","false");
  plus.classList.remove("is-open");
 }
 function showChat(){
  document.querySelector('[data-modern-select="chat"]')?.click();
  hideMenu();
  panel.scrollIntoView({behavior:"smooth",block:"start"});
 }
 open.addEventListener("click",showChat);
 plus.addEventListener("click",()=>{
  const willOpen=tools.hidden;
  tools.hidden=!willOpen;
  plus.setAttribute("aria-expanded",String(willOpen));
  plus.classList.toggle("is-open",willOpen);
 });
 $("ezeroChatVoiceOption").addEventListener("click",()=>{
  document.querySelector('[data-modern-select="voice"]')?.click();
  hideMenu();
  $("modernVoicePanel")?.scrollIntoView({behavior:"smooth",block:"start"});
 });
 $("ezeroChatLinkOption").addEventListener("click",()=>{
  hideMenu();
  $("modernConnect").click();
 });
 $("ezeroChatClearOption").addEventListener("click",()=>{
  field.value="";
  field.focus();
  hideMenu();
 });
 document.addEventListener("keydown",e=>{
  if(e.key==="Escape"&&!tools.hidden){hideMenu();plus.focus();}
 });
 document.addEventListener("click",e=>{
  if(!$("ezeroChatComposer").contains(e.target))hideMenu();
 });
 function state(){
  const indicator=$("modernConnectionStatus");
  if(indicator)indicator.dataset.indicator=
    window.EZERO_VOICE_TRANSPORT?.connected()===true?"connected":"idle";
 }
 document.addEventListener("ezero:channel-state",state);
 document.addEventListener("ezero:call-status",e=>{
  state();
  if(["micDenied","iceNoRoute","signalInvalid"].includes(e.detail?.stage))
   $("modernConnectionStatus").dataset.indicator="error";
 });
 function localize(){
  document.querySelectorAll("[data-chat-i18n]").forEach(n=>{n.textContent=t(n.dataset.chatI18n);});
  plus.setAttribute("aria-label",t("more"));
  plus.title=t("more");
  field.placeholder=t("compose");
  field.setAttribute("aria-label",t("compose"));
 }
 $("language").addEventListener("change",localize);
 localize();hideMenu();state();
})();