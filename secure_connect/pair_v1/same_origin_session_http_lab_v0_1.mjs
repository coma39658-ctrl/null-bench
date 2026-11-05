/*
 * E-ZERO Secure Pair V1 — isolated SAME-ORIGIN HTTP boundary laboratory.
 *
 * NOT imported from any live Worker or public site. No fetch listeners,
 * route registration, account bootstrap, device activation, websocket or
 * credential/session minting. This safe-only adapter exposes precisely:
 *
 * GET  /api/ezero-pair/v1/session/status -> observe-only, never authority
 * POST /api/ezero-pair/v1/session/logout -> own-cookie + CSRF revocation
 *
 * Everything else (including enrollment, passkey issuance and device trust)
 * is explicitly unavailable. A future live service requires independent
 * owner verification, stable WebAuthn origin/RP ID, trusted ingress, security
 * review and physical two-phone tests. DO NOT deploy this as public auth.
 */
import {PairV1SessionGuardSqliteLab} from "./account_session_guard_sqlite_lab_v0_1.mjs";

const BASE="/api/ezero-pair/v1/session/";
const SAFE={
 "Cache-Control":"no-store, private, max-age=0",
 "Content-Type":"application/json; charset=utf-8",
 "X-Content-Type-Options":"nosniff",
 "Referrer-Policy":"no-referrer",
 "X-Frame-Options":"DENY",
 "Cross-Origin-Resource-Policy":"same-origin",
 "Vary":"Origin, Sec-Fetch-Site"
};
function json(status,code,extra={}){
 return new Response(JSON.stringify({
  ok:status===200,code,
  authorized:false,trusted:false,authenticatedSessionIssued:false,
  ...extra
 }),{status,headers:SAFE});
}
function noBody(request){
 // This lab has no request JSON; rejecting all body streams avoids
 // content-type ambiguity, payload parsing and accidental secret logging.
 return request.body===null&&
  (!request.headers.has("content-length")||
   request.headers.get("content-length")==="0");
}
function trustedRequest(request,origin){
 try{
  const url=new URL(request.url);
  if(url.protocol!=="https:"||url.origin!==origin||url.username||
     url.password||url.search||url.hash||url.pathname.includes("%")||
     !url.pathname.startsWith(BASE))return null;
  if(request.headers.get("origin")!==origin)return null;
  const site=request.headers.get("sec-fetch-site");
  if(site!==null&&site!=="same-origin")return null;
  if(request.headers.has("x-forwarded-host")||
     request.headers.has("x-forwarded-proto")||
     request.headers.has("forwarded"))return null;
  // A deployment must configure a trusted ingress that sets host/forwarded
  // metadata itself. This test-only handler doesn't trust proxy headers.
  return url.pathname;
 }catch(_){return null;}
}
export function createSameOriginSessionHttpLab({storage,serverOrigin}={}){
 const guard=new PairV1SessionGuardSqliteLab(storage,{serverOrigin});
 const origin=new URL(serverOrigin).origin;
 return Object.freeze({
  async handle(request,now=Date.now()){
   if(!(request instanceof Request)||!Number.isSafeInteger(now)||now<=0)
    return json(400,"REQUEST_INVALID");
   if(!["GET","POST"].includes(request.method))
    return json(405,"METHOD_NOT_ALLOWED");
   const route=trustedRequest(request,origin);
   if(route===null)return json(403,"ORIGIN_OR_TARGET_REJECTED");
   if(!noBody(request))return json(400,"BODY_NOT_ACCEPTED");
   if(route===BASE+"status"&&request.method==="GET"){
    const checked=await guard.inspect({
     cookieHeader:request.headers.get("cookie"),
     origin,method:"GET",now
    });
    // Suppress account IDs, credential IDs, raw cookie/CSRF secrets,
    // internal database status and any browser-trust entitlement.
    return checked.ok?
     json(200,"OBSERVATION_ONLY_NO_ACCESS",{observationOnly:true}):
     json(401,"SESSION_NOT_AVAILABLE");
   }
   if(route===BASE+"logout"&&request.method==="POST"){
    const csrf=request.headers.get("x-ezero-csrf");
    if(typeof csrf!=="string"||csrf.length!==43)
     return json(403,"CSRF_REQUIRED");
    const outcome=await guard.logoutOwnSessionWithCsrfLab({
     cookieHeader:request.headers.get("cookie"),
     csrfToken:csrf,origin,method:"POST",now
    });
    if(!outcome.ok)return json(403,"LOGOUT_REJECTED");
    return new Response(null,{status:204,headers:{
     ...SAFE,"Set-Cookie":outcome.serverOnlyClearCookie
    }});
   }
   // Critical: no unreviewed POST login/register/call/trust endpoints,
   // no CORS preflight and no 90-second QR authority via this handler.
   return json(404,"ROUTE_NOT_AVAILABLE");
  }
 });
}
