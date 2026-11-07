/* E-ZERO Secure Connect — isolated staging mobile-friendly local navigation only.
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
    // Profile is nested in a collapsed optional-details region. Open both
    // levels before scrolling so the first phone tap actually reveals it.
    if(typeof window.EZERO_PROFILE_OPEN_NEAR==="function")
      window.EZERO_PROFILE_OPEN_NEAR($("ezeroQuickProfile"));
    else {
      const parent=profile.closest(".ezero-unified-options");
      if(parent)parent.open=true;
      profile.open=true;
    }
    // No page jump to a different card. The profile opens by the header.
  });
  $("ezeroQuickPaste")?.addEventListener("click",()=>{
    if(!setup||!fallback)return;
    setup.hidden=false;
    fallback.open=true;
    goTo(fallback);
    // Do not request camera/microphone, send data or autofill an invitation.
  });
})();
