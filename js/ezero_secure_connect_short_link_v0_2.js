(() => {
  "use strict";
  // Keep the invitation fragment on the same-origin E-ZERO page.
  // Do not send it to an external redirect service or an analytics endpoint.
  const destination=new URL("./ezero_secure_connect_live_p2p_v0_1.html",location.href);
  destination.search=location.search;
  destination.hash=location.hash;
  location.replace(destination.href);
})();
