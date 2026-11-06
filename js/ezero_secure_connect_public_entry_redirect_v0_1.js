/* Legacy E-ZERO entry pages converge on the same public green call card.
 * Explicit #i/#r identity and #e/#e2/#s older signed invite flows are
 * deliberately preserved; the old page is no longer the ordinary entry.
 */
(() => {
  "use strict";
  const host=new URL(location.href).hostname;
  // Preserve existing isolated local browser regressions and developer labs.
  // The public github.io deployment still converges to the green page.
  if(host==="localhost"||host==="127.0.0.1")return;
  const name=location.pathname.split("/").pop();
  const h=location.hash;
  if(name==="ezero_secure_connect_live_p2p_v0_1.html"){
    if(/^#(?:i|r)=[A-Za-z0-9_.~-]{1,2900}$/.test(h))return;
  }else if(name==="ezero_secure_connect_communications_v0_3.html"){
    if(/^#(?:e2|e)=[A-Za-z0-9_-]+$/.test(h) ||
       /^#s=[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/.test(h))return;
  }else return;
  // Ordinary old bookmarks enter the new single public-beta call page.
  // Preserve pre-existing #room call invitations on their original page:
  // migrating a live signed session can break the protocol/peer identity.
  const oldRoom=/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(h);
  const target=new URL(oldRoom
    ?"./ezero_secure_connect_one_request_lab_20261106.html"
    :"./ezero_trusted_friends_staging_20261106.html",location.href);
  target.search=location.search;
  // Preserve short room invitation ONLY in fragment; it is never sent to server.
  if(/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(h))target.hash=h;
  location.replace(target.href);
})();
