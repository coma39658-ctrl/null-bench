/* E-ZERO staging: one-tap contextual controls beside the four feature buttons.
 * Preserve original WebRTC, recorder, SHA evidence and mutual-consent handlers.
 * No hidden microphone use, automatic recording, server calls or new storage.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const grid=document.querySelector("#ezeroUnifiedCard .modern-feature-grid");
  const voice=$("modernVoicePanel"),chat=$("modernChatPanel"),
        evidence=$("ezeroEvidencePanel"),call=$("modernCallPanel"),
        auto=$("ezeroAutoPilot");
  if(!grid||!voice||!chat||!evidence||!call||!auto)return;
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
  const endCall=document.createElement("button");
  endCall.type="button";endCall.id="ezeroQuickHangup";
  endCall.textContent="📴 کال ختم کریں";
  endCall.setAttribute("aria-label","End connected call");
  endCall.hidden=true;
  const timer=document.createElement("output");
  timer.id="ezeroQuickCallTimer";
  timer.setAttribute("aria-label","Connected call elapsed time");
  timer.setAttribute("aria-live","off");
  timer.textContent="00:00";timer.hidden=true;
  tools.append(proof,endCall,timer);
  // All four actions now open their actual controls in one adjacent surface.
  // The receiver's existing QR scanner stays visible immediately below it.
  host.append(tools,auto,call,voice,chat,evidence);
  grid.after(host);
  evidence.hidden=true;auto.hidden=true;call.hidden=true;
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
  endCall.addEventListener("click",()=>{
    if(window.EZERO_VOICE_TRANSPORT?.connected()===true)
      $("hangup")?.click();
  });
  let startedAt=0,tick=null;
  function refreshElapsed(){
    const secs=Math.max(0,Math.floor((Date.now()-startedAt)/1000));
    const f=x=>String(x).padStart(2,"0");
    timer.textContent=f(Math.floor(secs/60))+":"+f(secs%60);
  }
  function showHangup(){
    const live=window.EZERO_VOICE_TRANSPORT?.connected()===true;
    endCall.hidden=!live;
    if(live){
      if(!startedAt){startedAt=Date.now();tick=setInterval(refreshElapsed,1000);}
      timer.hidden=false;refreshElapsed();
      if(voice.hidden&&chat.hidden)call.hidden=false;
    }else{
      if(tick!==null){clearInterval(tick);tick=null;}
      startedAt=0;timer.hidden=true;timer.textContent="00:00";
    }
    const lang=document.documentElement.lang;
    endCall.textContent=lang==="en"?"📴 End call":lang==="ar"?"📴 إنهاء المكالمة":"📴 کال ختم کریں";
  }
  document.addEventListener("ezero:channel-state",showHangup);
  document.addEventListener("ezero:call-status",showHangup);
  showHangup();
  for(const feature of document.querySelectorAll("#ezeroUnifiedCard [data-modern-select]")){
    // Capture runs before older bubble handlers attempt to create the QR.
    // Make the call pane available for exactly this deliberate user tap.
    feature.addEventListener("click",()=>{
      const type=feature.dataset.modernSelect;
      if(type==="audio"||type==="video")auto.hidden=false;
      else auto.hidden=true;
    },{capture:true});
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
        // Never present a bare audio call as successful video. The original
        // getUserMedia and remote video track logic remain authoritative.
        const live=window.EZERO_VOICE_TRANSPORT?.connected()===true;
        const local=$("localVideo")?.srcObject;
        const hasLocal=local?.getTracks?.().some(track=>track.readyState==="live");
        call.hidden=!(live||hasLocal);
        if(!auto.hidden)bringIntoView(auto);
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
  document.getElementById("language")?.addEventListener("change",()=>{paint();showHangup();});
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="idle"){
      evidence.hidden=true;call.hidden=true;
      proof.setAttribute("aria-expanded","false");paint();
    }
  });
  window.addEventListener("pagehide",()=>{
    if(tick!==null){clearInterval(tick);tick=null;}
  });
})();