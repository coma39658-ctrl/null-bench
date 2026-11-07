/* E-ZERO one-touch action sheet: isolated UX adapter, NOT a call engine.
 * Reuses the verified WebRTC/QR/voice/chat DOM and its existing consent gates.
 * No network, media capture, recording, credentials or storage here.
 */
(()=>{"use strict";
// The user-tested public entry and ALL old CI browsers keep the proven UI.
// Only a deliberate ?quick=1 stage pilot enables these new immediate controls.
// Never silently replace the working public calling surface.
if(new URLSearchParams(location.search).get("quick")!=="1")return;
const $=id=>document.getElementById(id);
const grid=document.querySelector("#ezeroUnifiedCard .modern-feature-grid");
const parent=$("ezeroUnifiedCard"), myQr=$("myQr");
const needed=["ezeroOneJoinPanel","ezeroAutoPilot","modernCallPanel","modernVoicePanel","modernChatPanel"];
if(!grid||!parent||!myQr||needed.some(id=>!$(id)))return;
const words={
 ur:{audio:"📞 آڈیو کال",video:"📹 ویڈیو کال",my:"▦ میرا QR",scan:"📷 دوست اسکین",voice:"🎙️ وائس میسج",chat:"💬 نجی چیٹ",close:"✕ بند کریں",
  myHelp:"یہ آپ کی دستخط شدہ عارضی شناخت کا QR ہے، کال کی دعوت نہیں۔",
  myWait:"محفوظ QR تیار ہو رہا ہے۔",callHelp:"کال کی دعوت اسی خانے میں بنے گی۔ دوسرے فون پر قبول کرنا ضروری ہے۔",
  scanHelp:"کیمرے کی اجازت کے بعد دوست کا کال QR اسکین کریں۔ درخواست خود بخود قبول نہیں ہوگی۔",
  voiceHelp:"وائس میسج اسی جگہ ریکارڈ، سنیں اور کنکشن پر بھیجیں۔",
  chatHelp:"دو فون جڑنے کے بعد نجی پیغام اسی جگہ بھیجیں۔",
  incoming:"📞 دوست کی درخواست",incomingHelp:"دوست کی درخواست پڑھ کر قبول یا مسترد کریں۔",
  pending:"درخواست جاری ہے؛ QR/کنکشن کی حالت نیچے دیکھیے۔"},
 en:{audio:"📞 Audio call",video:"📹 Video call",my:"▦ My QR",scan:"📷 Scan friend",voice:"🎙️ Voice note",chat:"💬 Private chat",close:"✕ Close",
  myHelp:"This is your signed temporary identity QR, not a call invitation.",
  myWait:"Preparing your signed identity QR.",callHelp:"A call QR will appear here. Your friend must approve.",
  scanHelp:"Scan your friend's call QR with camera permission. It will never auto-accept.",
  voiceHelp:"Record, preview and send a voice note in this panel once connected.",
  chatHelp:"Send a private message here after the two phones connect.",
  incoming:"📞 Incoming request",incomingHelp:"Review the request before accepting or declining.",
  pending:"Request in progress; see QR and connection status below."},
 ar:{audio:"📞 اتصال صوتي",video:"📹 مكالمة فيديو",my:"▦ رمزي QR",scan:"📷 مسح رمز صديق",voice:"🎙️ رسالة صوتية",chat:"💬 محادثة خاصة",close:"✕ إغلاق",
  myHelp:"هذا رمز هوية مؤقت وموقّع، وليس دعوة مكالمة.",
  myWait:"جارٍ إعداد رمز QR الموقّع.",callHelp:"ستظهر دعوة المكالمة هنا، ويجب على صديقك قبولها.",
  scanHelp:"امسح رمز مكالمة صديقك بعد إذن الكاميرا. لن يُقبل الطلب تلقائياً.",
  voiceHelp:"سجّل واستمع وأرسل رسالة صوتية هنا بعد الاتصال.",
  chatHelp:"أرسل رسالة خاصة هنا بعد اتصال الهاتفين.",
  incoming:"📞 طلب وارد",incomingHelp:"راجع الطلب ثم اقبله أو ارفضه.",
  pending:"الطلب جارٍ؛ راجع حالة الرمز والاتصال أدناه."}
};
const t=key=>(words[document.documentElement.lang]||words.ur)[key]||key;
const el=(tag,id,cls)=>{const n=document.createElement(tag);if(id)n.id=id;if(cls)n.className=cls;return n;};
const bar=el("nav","ezeroInstantActions","ezero-instant-actions");
bar.setAttribute("aria-label","E-ZERO immediate communication actions");
const buttons={};
for(const kind of ["audio","video","my","scan","voice","chat"]){
  const b=el("button",null,"ezero-instant-button");
  b.type="button";b.dataset.instant=kind;
  b.textContent=t(kind);bar.append(b);buttons[kind]=b;
}
grid.before(bar);
const veil=el("section","ezeroInstantSheet","ezero-instant-sheet");
veil.hidden=true;veil.setAttribute("role","dialog");veil.setAttribute("aria-modal","true");
veil.setAttribute("aria-labelledby","ezeroInstantTitle");
const backdrop=el("button",null,"ezero-instant-backdrop");
backdrop.type="button";backdrop.setAttribute("aria-label","Close panel");
const panel=el("div",null,"ezero-instant-panel");
const head=el("div",null,"ezero-instant-head");
const title=el("h2","ezeroInstantTitle");
const closeBtn=el("button",null,"ezero-instant-close");
closeBtn.type="button";closeBtn.textContent=t("close");
head.append(title,closeBtn);
const hint=el("p","ezeroInstantHint","ezero-instant-hint");
const mirror=el("div","ezeroInstantQrPreview","ezero-instant-qr");mirror.setAttribute("role","img");mirror.hidden=true;
const feedback=el("p","ezeroInstantFeedback","ezero-instant-feedback");
feedback.setAttribute("role","status");feedback.setAttribute("aria-live","polite");
const work=el("div","ezeroInstantWork","ezero-instant-work");
panel.append(head,hint,mirror,feedback,work);
veil.append(backdrop,panel);parent.append(veil);
const placeholders=new Map();
for(const id of needed){const n=$(id),mark=document.createComment("E-ZERO original position "+id);n.before(mark);placeholders.set(id,mark);}
let mode=null,returnFocus=null;
function restore(){
  for(const id of needed){const mark=placeholders.get(id),node=$(id);
    if(mark?.isConnected&&node)mark.after(node);}
}
function mounted(ids){restore();work.replaceChildren();for(const id of ids)work.append($(id));}
function qrMirror(){
  if(mode!=="my")return;
  mirror.replaceChildren(...Array.from(myQr.childNodes,n=>n.cloneNode(true)));
  feedback.textContent=mirror.childNodes.length?"":t("myWait");
}
function messages(){
  if(!mode||mode==="my")return;
  const source=mode==="scan"?$("ezeroOneScanStatus"):
    mode==="voice"?$("ezeroVoiceStatus"):
    mode==="chat"?$("messageStatus"):$("ezeroAutoStatus");
  if(source)feedback.textContent=source.textContent||t("pending");
}
function open(kind){
  if(!["audio","video","my","scan","voice","chat","incoming"].includes(kind))return;
  // A saved friend needs explicit selection before a targeted call. Open the
  // existing friends list instead of creating an unrelated QR room.
  if((kind==="audio"||kind==="video") &&
     $("ezeroContactAudio")?.disabled &&
     $("ezeroFriendSideList")?.querySelector("[data-friend-fp]")){
    $("ezeroFriendListToggle")?.click();return;
  }
  returnFocus=document.activeElement;
  mode=kind;
  title.textContent=t(kind==="incoming"?"incoming":kind);
  hint.textContent=t(kind==="incoming"?"incomingHelp":kind==="my"?"myHelp":kind==="scan"?"scanHelp":
    kind==="voice"?"voiceHelp":kind==="chat"?"chatHelp":"callHelp");
  mirror.hidden=kind!=="my";
  if(kind==="my"){mounted([]);qrMirror();}
  else if(kind==="voice"||kind==="chat"){mounted([kind==="voice"?"modernVoicePanel":"modernChatPanel"]);messages();}
  else{mounted(["ezeroOneJoinPanel","ezeroAutoPilot","modernCallPanel"]);messages();}
  veil.hidden=false;document.body.classList.add("ezero-instant-open");
  closeBtn.focus({preventScroll:true});
  if(kind==="audio"||kind==="video"){
    // Original listener controls trusted contacts, media consent and signaling.
    grid.querySelector('[data-modern-select="'+kind+'"]')?.click();
  }else if(kind==="voice"||kind==="chat"){
    grid.querySelector('[data-modern-select="'+kind+'"]')?.click();
  }else if(kind==="scan"){
    $("ezeroOneScanInvite")?.click(); // explicitly user-requested camera use
  }
}
function close(){
  if(!mode)return;
  if(mode==="scan"&&!$("ezeroOneStopScan")?.hidden)$("ezeroOneStopScan").click();
  veil.hidden=true;document.body.classList.remove("ezero-instant-open");
  restore();work.replaceChildren();mode=null;feedback.textContent="";
  if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});
}
for(const [kind,b] of Object.entries(buttons))b.addEventListener("click",()=>open(kind));
closeBtn.addEventListener("click",close);
backdrop.addEventListener("click",close);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&mode){e.preventDefault();close();}});
new MutationObserver(qrMirror).observe(myQr,{childList:true,subtree:true});
for(const id of ["ezeroOneScanStatus","ezeroAutoStatus","ezeroVoiceStatus","messageStatus"]){
  const node=$(id);if(node)new MutationObserver(messages).observe(node,{childList:true,subtree:true,characterData:true});
}
document.addEventListener("ezero:auto-incoming-open",()=>open("incoming"));
document.addEventListener("ezero:auto-invite-ready",messages);
function closeForVerifiedVideo(){
  // Signed call connection and an open encrypted DataChannel may become
  // ready in either order; close only after BOTH are truly confirmed.
  if((mode==="video"||mode==="incoming")&&
     document.querySelector('input[name="mode"]:checked')?.value==="video"&&
     window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true){close();return true;}
  return false;
}
document.addEventListener("ezero:call-status",()=>{
  if(!closeForVerifiedVideo())messages();
});
document.addEventListener("ezero:channel-state",e=>{
  if(e.detail?.connected)closeForVerifiedVideo();
});
$("language")?.addEventListener("change",()=>{
  for(const [kind,b] of Object.entries(buttons))b.textContent=t(kind);
  closeBtn.textContent=t("close");
  if(mode){const m=mode;title.textContent=t(m);hint.textContent=t(m==="my"?"myHelp":m==="scan"?"scanHelp":
    m==="voice"?"voiceHelp":m==="chat"?"chatHelp":m==="incoming"?"incomingHelp":"callHelp");
    if(m==="my")qrMirror();else messages();}
});
window.EZERO_INSTANT_ACTIONS=Object.freeze({open});
if(!$("ezeroAutoIncoming")?.hidden)open("incoming");
document.body.classList.add("ezero-quick-enabled");
})();