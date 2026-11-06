/*
 * E-ZERO Secure Pair V1 — safe Cloudflare same-origin architecture PREVIEW.
 * Deliberately nonfunctional: NO trusted pairing, login, account enrollment,
 * signaling, WebSocket, credential, media or device activations are possible.
 * Not imported into the existing live or disabled call-room Worker.
 *
 * Never turn any environment flag into permission to authenticate or call.
 * A future reviewed implementation must replace this worker after verified
 * account ownership, final RP ID/domain, audited storage and physical tests.
 */
const SECURE=Object.freeze({
 "Cache-Control":"no-store, private, max-age=0",
 "X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer",
 "X-Robots-Tag":"noindex, nofollow, noarchive",
 "X-Frame-Options":"DENY",
 "Cross-Origin-Resource-Policy":"same-origin",
 "Permissions-Policy":"camera=(), microphone=(), geolocation=()",
 "Content-Security-Policy":"default-src 'none'; img-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
});
function response(status,code){
 return new Response(JSON.stringify({
  status:code,
  publicPairingEnabled:false,
  publicCallingEnabled:false,
  authenticatedAccountEnabled:false
 }),{
  status,headers:{...SECURE,"Content-Type":"application/json; charset=utf-8"}
 });
}
export default {
 async fetch(request,env){
  if(!(request instanceof Request))return response(400,"REQUEST_INVALID");
  let url;
  try{url=new URL(request.url);}catch(_){return response(400,"REQUEST_INVALID");}
  if(url.search||url.hash||url.pathname.includes("%"))
   return response(400,"REQUEST_INVALID");
  if(url.pathname==="/health"&&request.method==="GET")
   return response(200,"PREVIEW_ONLY_NO_AUTH");
  // These reserved routes must always run through the Worker first. Even
  // accidental PAIR_FEATURES_ENABLED=true cannot enable unfinished auth.
  if(url.pathname==="/api"||url.pathname.startsWith("/api/")||
     url.pathname.startsWith("/secure-pair/"))
   return response(503,"AUTH_AND_CALLS_NOT_AVAILABLE");
  if(!["GET","HEAD"].includes(request.method))
   return response(405,"METHOD_NOT_ALLOWED");
  if(url.pathname!=="/"&&url.pathname!=="/index.html")
   return response(404,"PREVIEW_ROUTE_NOT_FOUND");
  // The ONLY served asset is the credential-free preview index.
  // Never expose build, tests, .well-known paths or future static files.
  if(!env?.ASSETS||typeof env.ASSETS.fetch!=="function")
   return response(503,"PREVIEW_ASSETS_UNAVAILABLE");
  const asset=await env.ASSETS.fetch(request);
  const headers=new Headers(asset.headers);
  for(const [key,value] of Object.entries(SECURE))headers.set(key,value);
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Set-Cookie");
  return new Response(asset.body,{status:asset.status,statusText:asset.statusText,headers});
 }
};
