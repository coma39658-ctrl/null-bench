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
    const parent=profile.closest(".ezero-unified-options");
    if(parent)parent.open=true;
    profile.open=true;
    goTo(profile);
    profile.querySelector("summary")?.focus?.({preventScroll:true});
  });
  $("ezeroQuickPaste")?.addEventListener("click",()=>{
    if(!setup||!fallback)return;
    setup.hidden=false;
    fallback.open=true;
    goTo(fallback);
    // Do not request camera/microphone, send data or autofill an invitation.
  });
})();
