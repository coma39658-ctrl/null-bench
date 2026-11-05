/* Legacy E-ZERO entry pages converge on the same public green call card.
 * Explicit #i/#r identity and #e/#e2/#s older signed invite flows are
 * deliberately preserved; the old page is no longer the ordinary entry.
 */
(() => {
  "use strict";
  const name=location.pathname.split("/").pop();
  const h=location.hash;
  if(name==="ezero_secure_connect_live_p2p_v0_1.html"){
    if(/^#(?:i|r)=[A-Za-z0-9_-]+$/.test(h))return;
  }else if(name==="ezero_secure_connect_communications_v0_3.html"){
    if(/^#(?:e2|e)=[A-Za-z0-9_-]+$/.test(h) ||
       /^#s=[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(h))return;
  }else return;
  const target=new URL("./ezero_secure_connect_one_request_lab_20261106.html",location.href);
  target.search=location.search;
  // Preserve short room invitation ONLY in fragment; it is never sent to server.
  if(/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(h))target.hash=h;
  location.replace(target.href);
})();
