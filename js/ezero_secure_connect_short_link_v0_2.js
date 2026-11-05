(() => {
  "use strict";
  // Keep the invitation fragment on the same-origin E-ZERO page.
  // Do not send it to an external redirect service or an analytics endpoint.
  // Signed audio/video offer/answer links must land at the actual call UI,
  // not the identity-only welcome page. Never log or transmit the fragment.
  const callInvite=/^#(?:e2|e)=[A-Za-z0-9_-]+$/.test(location.hash);
  // Experimental one-request invitation has its own clearly labeled
  // lab page. Ordinary short links and QR identity remain unchanged.
  const oneRequest=/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(location.hash);
  const destination=new URL(oneRequest?
    "./ezero_secure_connect_one_request_lab_20261106.html":
    callInvite?"./ezero_secure_connect_communications_v0_3.html":
    "./ezero_secure_connect_live_p2p_v0_1.html",location.href);
  destination.search=location.search;
  destination.hash=location.hash;
  location.replace(destination.href);
})();
