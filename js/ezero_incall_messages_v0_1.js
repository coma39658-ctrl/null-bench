/* E-ZERO Secure Connect: call-safe chat and voice-note sheet.
 * This module never creates a network connection, reads a new microphone,
 * records calls or writes server data. It reuses the existing consented,
 * verified WebRTC channel and already-tested text/voice controllers.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  if(!document.body.classList.contains("ezero-one-lab"))return;
  const panel=$("modernCallPanel"),chat=$("modernChatPanel"),voice=$("modernVoicePanel");
  if(!panel||!chat||!voice)return;
  const anchors=new Map([[chat,document.createComment("E-ZERO chat origin")],
                         [voice,document.createComment("E-ZERO voice origin")]]);
  for(const [p,marker] of anchors)p.parentNode.insertBefore(marker,p);

  const dock=document.createElement("div");dock.id="ezeroInCallMessageDock";
  dock.className="ezero-in-call-message-dock";dock.hidden=true;
  dock.setAttribute("aria-label","In-call chat and voice messages");
  const chatBtn=document.createElement("button"),voiceBtn=document.createElement("button");
  chatBtn.type=voiceBtn.type="button";
  chatBtn.id="ezeroInCallChat";voiceBtn.id="ezeroInCallVoice";
  dock.append(chatBtn,voiceBtn);

  const drawer=document.createElement("section");drawer.id="ezeroInCallMessageDrawer";
  drawer.className="ezero-in-call-message-drawer";drawer.hidden=true;
  drawer.setAttribute("role","dialog");drawer.setAttribute("aria-modal","false");
  const header=document.createElement("div");header.className="ezero-in-call-message-head";
  const title=document.createElement("strong");title.id="ezeroInCallMessageTitle";
  const close=document.createElement("button");close.type="button";close.id="ezeroInCallClose";
  close.setAttribute("aria-label","Close in-call messages");
  header.append(title,close);drawer.append(header);
  panel.append(dock,drawer);

  const translations={
    ur:{chat:"💬 میسج",voice:"🎙️ وائس میسج",close:"✕ بند کریں",chatTitle:"نجی تحریری پیغام",voiceTitle:"عارضی وائس میسج"},
    en:{chat:"💬 Chat",voice:"🎙️ Voice note",close:"✕ Close",chatTitle:"Private message",voiceTitle:"Temporary voice note"},
    ar:{chat:"💬 رسالة",voice:"🎙️ رسالة صوتية",close:"✕ إغلاق",chatTitle:"رسالة خاصة",voiceTitle:"رسالة صوتية مؤقتة"}
  };
  const tr=k=>(translations[document.documentElement.lang]||translations.ur)[k];
  const verified=()=>window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
  let opened=null;
  function translate(){
    chatBtn.textContent=tr("chat");voiceBtn.textContent=tr("voice");
    close.textContent=tr("close");
    title.textContent=tr(opened==="voice"?"voiceTitle":"chatTitle");
  }
  function closeDrawer(){
    drawer.hidden=true;
    for(const [p,marker] of anchors){
      p.hidden=true;
      marker.parentNode?.insertBefore(p,marker.nextSibling);
    }
    opened=null;translate();
  }
  function openDrawer(type){
    if(!verified())return;
    if(opened===type){closeDrawer();return;}
    closeDrawer();
    opened=type;
    const node=type==="chat"?chat:voice;
    drawer.append(node);
    drawer.hidden=false;node.hidden=false;
    translate();
    if(type==="chat")$("sendText")?.focus();
  }
  function refresh(){
    const active=verified();
    dock.hidden=!active;
    if(!active&&opened)closeDrawer();
  }
  chatBtn.addEventListener("click",()=>openDrawer("chat"));
  voiceBtn.addEventListener("click",()=>openDrawer("voice"));
  close.addEventListener("click",closeDrawer);
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape"&&!drawer.hidden)closeDrawer();
  });
  for(const id of ["hangup","modernHangup","closeAll"]){
    $(id)?.addEventListener("click",()=>{closeDrawer();dock.hidden=true;});
  }
  document.addEventListener("ezero:channel-state",()=>queueMicrotask(refresh));
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="idle"){closeDrawer();dock.hidden=true;}
    else queueMicrotask(refresh);
  });
  document.getElementById("language")?.addEventListener("change",translate);
  window.addEventListener("pagehide",closeDrawer);
  translate();refresh();
})();
