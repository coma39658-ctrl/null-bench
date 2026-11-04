/*
 * E-ZERO secure-connect isolated Cloudflare staging.
 * Deliberately NOT deployed or activated by merely merging this source.
 * Does not handle, archive or inspect messages, audio, video or call media.
 */
import { DurableObject } from "cloudflare:workers";
import {
  ORIGIN,ROOM_TTL_MS,MAX_BODY_BYTES,randomHex,hashSecret,
  verifySignedIdentity,roomDecision
} from "./protocol.mjs";

const cors={
  "Access-Control-Allow-Origin":ORIGIN,
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Access-Control-Allow-Headers":"Content-Type",
  "Access-Control-Max-Age":"600",
  "Vary":"Origin",
  "Cache-Control":"no-store",
  "X-Content-Type-Options":"nosniff",
  "Content-Type":"application/json; charset=utf-8"
};
function response(code,status=200,rest={}) {
  return new Response(JSON.stringify({code,...rest}),{status,headers:cors});
}
async function jsonRequest(request) {
  const length=Number(request.headers.get("Content-Length")||"0");
  if(length>MAX_BODY_BYTES)throw Error("REQUEST_TOO_LARGE");
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get("Content-Type")||""))throw Error("JSON_REQUIRED");
  const body=await request.text();
  if(new TextEncoder().encode(body).byteLength>MAX_BODY_BYTES)throw Error("REQUEST_TOO_LARGE");
  let parsed;
  try{parsed=JSON.parse(body);}catch(_){throw Error("BAD_JSON");}
  if(!parsed||typeof parsed!=="object"||Array.isArray(parsed))throw Error("BAD_JSON");
  return parsed;
}
function invalid(error) {
  const code=String(error?.message||"BAD_REQUEST");
  const safe=new Set(["REQUEST_TOO_LARGE","JSON_REQUIRED","BAD_JSON","INVALID_INVITE",
    "EXPIRED_INVITE","FINGERPRINT_MISMATCH","INVALID_SIGNATURE","BAD_CAPABILITY"]);
  return response(safe.has(code)?code:"BAD_REQUEST",code==="REQUEST_TOO_LARGE"?413:400);
}

export class PairRoom extends DurableObject {
  constructor(ctx,env){
    super(ctx,env);
    this.ctx=ctx;
  }
  async alarm(){
    const room=await this.ctx.storage.get("room");
    if(!room||room.expiresAt<=Date.now())await this.ctx.storage.deleteAll();
    else await this.ctx.storage.setAlarm(room.expiresAt+1000);
  }
  async fetch(request){
    if(request.method!=="POST")return response("METHOD_NOT_ALLOWED",405);
    const action=new URL(request.url).pathname.slice(1);
    let data;
    try{data=await jsonRequest(request);}catch(error){return invalid(error);}
    if(action==="create"){
      if(await this.ctx.storage.get("room"))return response("ROOM_EXISTS",409);
      const {ownerSignedId,ownerFp,ownerHash,joinHash,expiresAt}=data;
      if(typeof ownerSignedId!=="string"||ownerSignedId.length>1400||
         !/^[a-f0-9]{64}$/.test(ownerFp||"") ||
         !/^[a-f0-9]{64}$/.test(ownerHash||"")||
         !/^[a-f0-9]{64}$/.test(joinHash||"")||
         !Number.isSafeInteger(expiresAt)||expiresAt<=Date.now()||
         expiresAt>Date.now()+ROOM_TTL_MS+10000)return response("BAD_ROOM",400);
      await this.ctx.storage.put("room",{
        state:"INVITED",ownerSignedId,ownerFp,ownerHash,joinHash,expiresAt
      });
      await this.ctx.storage.setAlarm(expiresAt+1000);
      return response("INVITE_CREATED",201);
    }
    const room=await this.ctx.storage.get("room");
    if(!room||room.expiresAt<=Date.now()){
      if(room)await this.ctx.storage.deleteAll();
      return response("INVITE_EXPIRED",410);
    }
    const authHash=data.authHash;
    if(typeof authHash!=="string"||!/^[a-f0-9]{64}$/.test(authHash))
      return response("INVITE_NOT_FOUND",404);
    let outcome=roomDecision(room,action,authHash,data.claim,Date.now());
    if(outcome.next){
      await this.ctx.storage.put("room",outcome.next);
      delete outcome.next;
    }
    const {status,...rest}=outcome;
    return response(rest.code,status,Object.fromEntries(
      Object.entries(rest).filter(([k])=>k!=="code")
    ));
  }
}
export default {
  async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(path==="/health"&&request.method==="GET")
      return response("STAGING_DISABLED_OR_PRIVATE",200,{
        enabled:env.EZERO_PUBLIC_ENABLED==="true",
        callMediaHosted:false,automaticCalls:false,storage:"temporary room metadata only"
      });
    const origin=request.headers.get("Origin");
    if(origin!==ORIGIN)return response("ORIGIN_REJECTED",403);
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
    if(env.EZERO_PUBLIC_ENABLED!=="true"||!env.PAIR_ROOMS)
      return response("STAGING_DISABLED",503);
    if(request.method!=="POST")return response("METHOD_NOT_ALLOWED",405);
    let data;
    try{data=await jsonRequest(request);}catch(error){return invalid(error);}
    try {
      if(path==="/v1/invites"){
        const identity=await verifySignedIdentity(data.signedId);
        const inviteId=randomHex(16),ownerToken=randomHex(32),joinToken=randomHex(32);
        const now=Date.now(),expiresAt=Math.min(identity.expiresAt,now+ROOM_TTL_MS);
        const init={ownerSignedId:identity.signedId,ownerFp:identity.fingerprint,
          ownerHash:await hashSecret(ownerToken),
          joinHash:await hashSecret(joinToken),expiresAt};
        const target=env.PAIR_ROOMS.get(env.PAIR_ROOMS.idFromName(inviteId));
        const created=await target.fetch(new Request("https://private-room/create",{
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(init)
        }));
        if(created.status!==201)return response("ROOM_NOT_CREATED",503);
        const originSite=ORIGIN+"/null-bench/ezero_secure_connect_live_p2p_v0_1.html";
        // URL fragments are not transmitted in HTTP requests. The token can
        // still be exposed by recipients, screenshots or apps used to share it.
        const invitationLink=originSite+"#ezero-join="+inviteId+"."+joinToken;
        return response("INVITE_CREATED",201,{
          inviteId,ownerToken,invitationLink,expiresAt
        });
      }
      const match=/^\/v1\/invites\/([a-f0-9]{32})\/(lookup|request|decide|status)$/.exec(path);
      if(!match)return response("NOT_FOUND",404);
      const [,id,action]=match;
      let token=data.token;
      if(typeof token!=="string"||!/^[a-f0-9]{64}$/.test(token))
        return response("INVITE_NOT_FOUND",404);
      let claim={};
      if(action==="request"){
        const identity=await verifySignedIdentity(data.signedId);
        claim={signedId:identity.signedId,fp:identity.fingerprint};
      }else if(action==="decide"){
        claim={approve:data.approve};
      }
      const target=env.PAIR_ROOMS.get(env.PAIR_ROOMS.idFromName(id));
      const forwarded=await target.fetch(new Request("https://private-room/"+action,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({authHash:await hashSecret(token),claim})
      }));
      return new Response(forwarded.body,{
        status:forwarded.status,headers:cors
      });
    }catch(error){return invalid(error);}
  }
};
