/* E-ZERO Secure Connect: safe migration of OLD entry-only bookmarks.
 * Only the unjoined old public URL is replaced by the already deployed
 * unified beta. Every invitation (#room, signed hashes, other fragments)
 * stays on its original page to avoid breaking active call capabilities.
 * Local CI/device regression test pages remain untouched.
 */
(()=>{"use strict";
  const current=new URL(location.href);
  if(current.hostname!=="coma39658-ctrl.github.io"||
     current.pathname!=="/null-bench/ezero_secure_connect_one_request_lab_20261106.html")return;
  // Never rewrite a signed WebRTC invitation, a PWA deep-link, or
  // an unknown hash. A link to a particular room is NOT a generic entry.
  if(current.hash)return;
  if([...current.searchParams.keys()].some(k=>k!=="mode")||
     current.searchParams.getAll("mode").length>1)return;
  const mode=current.searchParams.get("mode");
  if(mode!==null&&!["audio","video","voice","chat"].includes(mode))return;
  const next=new URL("./ezero_trusted_friends_staging_20261106.html",current);
  if(mode)next.searchParams.set("mode",mode);
  location.replace(next.href);
})();