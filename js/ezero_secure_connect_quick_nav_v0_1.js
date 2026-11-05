/* E-ZERO Secure Connect — mobile-friendly local navigation only.
 * Does not send invites, open media permissions or claim an active call. */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const profile=$("ezeroProfileEditor");
  const setup=$("ezeroCallSetupSlot");
  const fallback=$("ezeroLinkFallback");
  function goTo(element){
    element?.scrollIntoView?.({block:"start",behavior:"smooth"});
  }
  $("ezeroQuickProfile")?.addEventListener("click",()=>{
    if(!profile)return;
    profile.open=true;
    goTo(profile);
  });
  $("ezeroQuickPaste")?.addEventListener("click",()=>{
    if(!setup||!fallback)return;
    setup.hidden=false;
    fallback.open=true;
    goTo(fallback);
    // Do not request camera/microphone, send data or autofill an invitation.
  });
})();
