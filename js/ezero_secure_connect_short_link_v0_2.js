/* E-ZERO short-link router: one public calling page for both phones.
 * Preserve historic manually signed invite and identity routes; never put
 * secret #room credentials into server HTTP requests or search parameters.
 */
(() => {
  "use strict";
  const h=location.hash;
  const callInvite=/^#(?:e2|e)=[A-Za-z0-9_-]+$/.test(h);
  const identity=/^#(?:i|r)=[A-Za-z0-9_.~-]{1,2900}$/.test(h);
  const unified="./ezero_secure_connect_one_request_lab_20261106.html";
  const destination=new URL(callInvite?"./ezero_secure_connect_communications_v0_3.html":
    identity?"./ezero_secure_connect_live_p2p_v0_1.html":unified,location.href);
  destination.search=location.search;
  // Preserve the complete private room or signed identity fragment unchanged.
  destination.hash=location.hash;
  location.replace(destination.href);
})();
