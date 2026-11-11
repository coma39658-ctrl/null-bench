/* E-ZERO Secure App — results remain beside their originating controls.
 * Staging UI-only relocation. No new call signaling, identity access, media
 * permissions, background transport, storage, or automatic connections.
 */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const grid=document.querySelector("#ezeroUnifiedCard .modern-feature-grid");
  const callResult=$("ezeroInlineCallResult");
  const callMedia=$("modernCallPanel");
  const callStatus=$("modernConnectionStatus")?.closest(".modern-workspace");
  const qrBox=$("ezeroOneQrBox");
  const share=$("ezeroFrontQrShareSlot");
  const serverStatus=$("ezeroAutoStatus");
  if(!grid||!callResult||!callMedia||!callStatus||!qrBox||!share||!serverStatus)return;

  // Once a saved-friend call starts, show its real track/video, consent
  // feedback and hang-up beside the Audio/Video tiles, never down the page.
  callResult.setAttribute("role","region");
  callResult.setAttribute("aria-label","Current audio or video call");
  callResult.append(callStatus,callMedia);
  const isCallMode=()=>!callMedia.hidden;
  function updateCall(){
    if(isCallMode()&&!callResult.hidden)
      callResult.dataset.view="call";
    else callResult.removeAttribute("data-view");
  }
  grid.addEventListener("click",e=>{
    const b=e.target.closest?.('[data-modern-select]');
    if(!b)return;
    // Preserve genuine saved-friend calling. Do not falsely signal connected.
    if(["audio","video"].includes(b.dataset.modernSelect)){
      callResult.hidden=false;
      requestAnimationFrame(updateCall);
    }else{
      // Chat/voice panels are already adjacent to their tiles; preserve the
      // real call output if one is connected while composing a message.
      if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()!==true){
        callResult.hidden=true;
      }
    }
  });
  document.addEventListener("ezero:channel-state",e=>{
    if(e.detail?.connected===true){callResult.hidden=false;updateCall();}
  });
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="connected"){callResult.hidden=false;updateCall();}
  });

  // The original WebRTC one-shot QR is the only QR. Share, Copy and the
  // signaling error/status are moved WITH the currently visible QR itself.
  // The sender doesn't have to look under the scanner for a sharing button.
  function keepQrControlsTogether(){
    if(!qrBox.isConnected)return;
    if(qrBox.nextElementSibling!==share)qrBox.insertAdjacentElement("afterend",share);
    if(share.nextElementSibling!==serverStatus)
      share.insertAdjacentElement("afterend",serverStatus);
  }
  for(const id of ["ezeroFrontAudioQr","ezeroFrontVideoQr","ezeroFreshQrAudio","ezeroFreshQrVideo"]){
    $(id)?.addEventListener("click",()=>queueMicrotask(keepQrControlsTogether));
  }
  grid.addEventListener("click",()=>queueMicrotask(keepQrControlsTogether));
  document.addEventListener("ezero:auto-call-starting",()=>queueMicrotask(keepQrControlsTogether));
  document.addEventListener("ezero:auto-invite-ready",()=>queueMicrotask(keepQrControlsTogether));
  // No automatic scroll or remote media access on display of any result.
})();
