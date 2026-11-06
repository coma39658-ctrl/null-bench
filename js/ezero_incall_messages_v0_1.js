/* E-ZERO Secure Connect: call-safe chat and voice-note sheet.
 * This module never creates a network connection, reads a new microphone,
 * records calls or writes server data. It reuses the existing consented,
 * verified WebRTC channel and already-tested text/voice controllers.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  if(!document.body.classList.contains("ezero-one-lab"))return;
  const panel=$("modernCallPanel"),chat=$("modernChatPanel"),voice=$("modernVoicePanel"),
        evidence=$("ezeroEvidencePanel");
  if(!panel||!chat||!voice)return;
  const anchors=new Map([[chat,document.createComment("E-ZERO chat origin")],
                         [voice,document.createComment("E-ZERO voice origin")]]);
  if(evidence)anchors.set(evidence,document.createComment("E-ZERO recording origin"));
  for(const [p,marker] of anchors)p.parentNode.insertBefore(marker,p);

  const dock=document.createElement("div");dock.id="ezeroInCallMessageDock";
  dock.className="ezero-in-call-message-dock";dock.hidden=true;
  dock.setAttribute("aria-label","In-call chat and voice messages");
  const chatBtn=document.createElement("button"),voiceBtn=document.createElement("button");
  chatBtn.type=voiceBtn.type="button";
  chatBtn.id="ezeroInCallChat";voiceBtn.id="ezeroInCallVoice";
  const evidenceBtn=evidence?document.createElement("button"):null;
  if(evidenceBtn){evidenceBtn.id="ezeroInCallEvidence";evidenceBtn.type="button";}
  dock.append(chatBtn,voiceBtn);
  if(evidenceBtn)dock.append(evidenceBtn);

  const drawer=document.createElement("section");drawer.id="ezeroInCallMessageDrawer";
  drawer.className="ezero-in-call-message-drawer";drawer.hidden=true;
  drawer.setAttribute("role","dialog");drawer.setAttribute("aria-modal","false");
  const header=document.createElement("div");header.className="ezero-in-call-message-head";
  const title=document.createElement("strong");title.id="ezeroInCallMessageTitle";
  const close=document.createElement("button");close.type="button";close.id="ezeroInCallClose";
  close.setAttribute("aria-label","Close in-call messages");
  header.append(title,close);
  // Switching from Chat to Voice must remain reachable while the drawer is
  // open; the floating call buttons are intentionally behind the bottom sheet.
  const drawerTabs=document.createElement("nav");
  drawerTabs.className="ezero-in-call-message-tabs";
  drawerTabs.setAttribute("aria-label","Message type · پیغام کی قسم · نوع الرسالة");
  const chatTab=document.createElement("button");
  const voiceTab=document.createElement("button");
  const evidenceTab=evidence?document.createElement("button"):null;
  chatTab.id="ezeroInCallChatTab";voiceTab.id="ezeroInCallVoiceTab";
  chatTab.type=voiceTab.type="button";
  drawerTabs.append(chatTab,voiceTab);
  if(evidenceTab){evidenceTab.id="ezeroInCallEvidenceTab";evidenceTab.type="button";drawerTabs.append(evidenceTab);}
  drawer.append(header,drawerTabs);
  panel.append(dock,drawer);
  // A live video call covers the page's normal language selector. Offer the
  // SAME tri-language setting within the call, not a duplicated language state.
  const localeControl=document.createElement("label");
  localeControl.className="ezero-in-call-locale";
  localeControl.id="ezeroInCallLocaleControl";
  localeControl.hidden=true;
  const localeLabel=document.createElement("span");
  const locale=document.createElement("select");
  locale.id="ezeroInCallLanguage";
  locale.setAttribute("aria-label","Call language · زبان · لغة المكالمة");
  for(const [value,label] of [["ur","اردو"],["ar","العربية"],["en","English"]]){
    const opt=document.createElement("option");opt.value=value;opt.textContent=label;
    locale.append(opt);
  }
  localeControl.append(localeLabel,locale);
  panel.append(localeControl);
  locale.addEventListener("change",()=>{
    const globalLanguage=$("language");
    if(globalLanguage){
      globalLanguage.value=locale.value;
      globalLanguage.dispatchEvent(new Event("change",{bubbles:true}));
    }
  });

  const translations={
    ur:{chat:"💬 میسج",voice:"🎙️ وائس میسج",proof:"🔴 ریکارڈ/SHA",close:"✕ بند کریں",chatTitle:"نجی تحریری پیغام",voiceTitle:"عارضی وائس میسج",proofTitle:"محفوظ ریکارڈنگ · SHA-256",language:"زبان"},
    en:{chat:"💬 Chat",voice:"🎙️ Voice note",proof:"🔴 Record/SHA",close:"✕ Close",chatTitle:"Private message",voiceTitle:"Temporary voice note",proofTitle:"Recording & SHA-256 evidence",language:"Language"},
    ar:{chat:"💬 رسالة",voice:"🎙️ رسالة صوتية",proof:"🔴 تسجيل/SHA",close:"✕ إغلاق",chatTitle:"رسالة خاصة",voiceTitle:"رسالة صوتية مؤقتة",proofTitle:"التسجيل و SHA-256",language:"اللغة"}
  };
  const tr=k=>(translations[document.documentElement.lang]||translations.ur)[k];
  const verified=()=>window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
  let opened=null;
  function translate(){
    chatBtn.textContent=chatTab.textContent=tr("chat");
    voiceBtn.textContent=voiceTab.textContent=tr("voice");
    if(evidenceBtn&&evidenceTab){
      evidenceBtn.textContent=evidenceTab.textContent=tr("proof");
      evidenceTab.setAttribute("aria-pressed",String(opened==="proof"));
    }
    chatTab.setAttribute("aria-pressed",String(opened==="chat"));
    voiceTab.setAttribute("aria-pressed",String(opened==="voice"));
    close.textContent=tr("close");
    title.textContent=tr(opened==="voice"?"voiceTitle":opened==="proof"?"proofTitle":"chatTitle");
    localeLabel.textContent=tr("language");
    locale.value=document.documentElement.lang==="en"?"en":document.documentElement.lang==="ar"?"ar":"ur";
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
    const node=type==="chat"?chat:type==="proof"?evidence:voice;
    if(!node)return;
    drawer.append(node);
    drawer.hidden=false;node.hidden=false;
    translate();
    if(type==="chat")$("sendText")?.focus();
  }
  function refresh(){
    const active=verified();
    dock.hidden=!active;
    localeControl.hidden=!active;
    if(!active&&opened)closeDrawer();
  }
  chatBtn.addEventListener("click",()=>openDrawer("chat"));
  voiceBtn.addEventListener("click",()=>openDrawer("voice"));
  evidenceBtn?.addEventListener("click",()=>openDrawer("proof"));
  chatTab.addEventListener("click",()=>{if(opened!=="chat")openDrawer("chat");});
  voiceTab.addEventListener("click",()=>{if(opened!=="voice")openDrawer("voice");});
  evidenceTab?.addEventListener("click",()=>{if(opened!=="proof")openDrawer("proof");});
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
