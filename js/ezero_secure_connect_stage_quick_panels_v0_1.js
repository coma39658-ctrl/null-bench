/* E-ZERO staging: one-tap contextual controls beside the four feature buttons.
 * Preserve original WebRTC, recorder, SHA evidence and mutual-consent handlers.
 * No hidden microphone use, automatic recording, server calls or new storage.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const grid=document.querySelector("#ezeroUnifiedCard .modern-feature-grid");
  const voice=$("modernVoicePanel"),chat=$("modernChatPanel"),
        evidence=$("ezeroEvidencePanel"),call=$("modernCallPanel");
  if(!grid||!voice||!chat||!evidence||!call)return;
  const host=document.createElement("div");
  host.id="ezeroQuickFunctionHost";
  host.className="ezero-quick-function-host";
  const tools=document.createElement("div");
  tools.className="ezero-quick-function-tools";
  const proof=document.createElement("button");
  proof.type="button";proof.id="ezeroQuickEvidence";
  proof.className="ezero-quick-proof-button";
  proof.setAttribute("aria-controls","ezeroEvidencePanel");
  proof.setAttribute("aria-expanded","false");
  const words={
    ur:{proof:"🔴 کال ریکارڈ / 🔐 SHA-256",close:"✕ ثبوت والا پینل بند کریں"},
    en:{proof:"🔴 Record call / 🔐 SHA-256",close:"✕ Close recording panel"},
    ar:{proof:"🔴 تسجيل المكالمة / 🔐 SHA-256",close:"✕ إغلاق لوحة التسجيل"}
  };
  const tr=k=>(words[document.documentElement.lang]||words.ur)[k];
  function paint(){proof.textContent=tr(evidence.hidden?"proof":"close");}
  tools.append(proof);host.append(tools,voice,chat,evidence);
  grid.after(host);
  evidence.hidden=true;
  voice.hidden=true;chat.hidden=true;
  paint();
  function bringIntoView(node){
    // Small scroll, rather than sending users to the remote bottom of the page.
    try{node.scrollIntoView({block:"nearest",behavior:"auto"});}catch(_){}
  }
  function showProof(){
    const drawer=$("ezeroInCallMessageDrawer");
    const live=window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
    if(live&&$("ezeroInCallEvidence")){
      call.hidden=false;
      $("ezeroInCallEvidence").click();
      bringIntoView(drawer);
      return;
    }
    const willShow=evidence.hidden;
    evidence.hidden=!willShow;
    proof.setAttribute("aria-expanded",String(willShow));
    paint();
    if(willShow)bringIntoView(evidence);
  }
  proof.addEventListener("click",showProof);
  for(const feature of document.querySelectorAll("#ezeroUnifiedCard [data-modern-select]")){
    feature.addEventListener("click",()=>{
      const type=feature.dataset.modernSelect;
      const live=window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
      if(type==="voice"||type==="chat"){
        if(live){
          call.hidden=false;
          const button=$(type==="voice"?"ezeroInCallVoice":"ezeroInCallChat");
          if(button){button.click();return;}
        }
        const target=type==="voice"?voice:chat;
        target.hidden=false;
        bringIntoView(target);
      }else if(type==="audio"||type==="video"){
        const target=$("ezeroAutoPilot");
        if(target&&!target.hidden)bringIntoView(target);
      }
    });
  }
  document.addEventListener("ezero:auto-invite-ready",()=>{
    const target=$("ezeroOneQrBox");
    if(target&&!target.hidden)bringIntoView(target);
  });
  // An authenticated recording-consent request must be visible without
  // hunting through the page; never approve it automatically.
  document.addEventListener("ezero:record-consent",event=>{
    if(event.detail?.action!=="request"||event.detail?.verifiedChannel!==true)return;
    queueMicrotask(()=>{
      if(document.hidden||$("ezeroEvidenceIncoming")?.hidden!==false)return;
      const live=window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
      const drawer=$("ezeroInCallMessageDrawer");
      if(live&&$("ezeroInCallEvidence")){
        if(!drawer||drawer.hidden||!drawer.contains(evidence)){
          call.hidden=false;
          $("ezeroInCallEvidence").click();
        }
      }else{
        evidence.hidden=false;
        proof.setAttribute("aria-expanded","true");paint();
        bringIntoView(evidence);
      }
    });
  });
  document.getElementById("language")?.addEventListener("change",paint);
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="idle"){evidence.hidden=true;proof.setAttribute("aria-expanded","false");paint();}
  });
})();