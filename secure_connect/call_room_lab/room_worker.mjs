/*
 * E-ZERO short-link WebRTC signaling laboratory.
 * Explicitly NOT a public call service: ROOMS_ENABLED=false by default.
 * SDP and ICE are opaque and are never stored, logged, or relayed to a third client.
 * Cloudflare Durable Object Hibernation: no background browser polling.
 * Only an opt-in one-to-one signed WebRTC test; no audio/video relay/recording.
 */
import {ROOM_LIFETIME_MS,MAX_PILOT_ACTIVE_ROOMS} from "./room_constants.mjs";
const PAGE_ORIGIN="https://coma39658-ctrl.github.io";
const ROOM_ID=/^[a-f0-9]{32}$/;
const ROOM_KEY=/^ezero-key-([a-f0-9]{64})$/;
const ROOM_PROOF=/^ezero-proof-([a-f0-9]{64})$/;
const ROOM_TIME=/^ezero-time-([0-9]{13})$/;
const MAX_FRAME=180000;
const MAX_MESSAGES_PER_SOCKET=12;

function json(code,status=200){
  return new Response(JSON.stringify({ok:status===200,code}),{
    status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store",
      "x-content-type-options":"nosniff"}
  });
}

function inviteJson(value,status=200){
 return new Response(JSON.stringify(value),{status,headers:{
  "content-type":"application/json;charset=utf-8","cache-control":"no-store",
  "x-content-type-options":"nosniff","access-control-allow-origin":PAGE_ORIGIN,"vary":"Origin"
 }});
}
async function signOwnerProof(env,id,token,issued){
 const secret=env.PILOT_OWNER_SECRET;
 if(typeof secret!=="string"||!/^[a-f0-9]{64}$/.test(secret))return null;
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
  {name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const bytes=await crypto.subtle.sign("HMAC",key,
  new TextEncoder().encode(id+"."+token+"."+issued));
 return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
async function reserveRoom(env,id,expires){
 if(!env.ROOM_ADMISSION?.getByName)return "ROOM_ADMISSION_MISSING";
 try{
  const admission=env.ROOM_ADMISSION.getByName("global-pilot-v1");
  const r=await admission.fetch(new Request("https://ezero.internal/admit",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({id,expires})
  }));
  if(r?.status===429)return "PILOT_ROOM_CAP_REACHED";
  return r?.ok?null:"ROOM_ADMISSION_REJECTED";
 }catch(_){return "ROOM_ADMISSION_UNAVAILABLE";}
}
async function rateLimit(env,request){
 if(!env.ROOM_RATE_LIMIT?.limit)return "RATE_LIMIT_NOT_CONFIGURED";
 try{
  const r=await env.ROOM_RATE_LIMIT.limit({
   key:"call-room:"+String(request.headers.get("CF-Connecting-IP")||"unknown")
  });
  return r?.success===true?null:"RATE_LIMITED";
 }catch(_){return "RATE_LIMIT_UNAVAILABLE";}
}
function tokenFrom(request){
  const parts=(request.headers.get("Sec-WebSocket-Protocol")||"").split(",").map(s=>s.trim());
  if(!parts.includes("ezero-room-v1"))return null;
  const auth=parts.filter(x=>ROOM_KEY.test(x));
  if(auth.length!==1)return null;
  return auth[0].match(ROOM_KEY)[1];
}
function issuedFrom(request){
  const parts=(request.headers.get("Sec-WebSocket-Protocol")||"")
    .split(",").map(s=>s.trim());
  const values=parts.filter(v=>ROOM_TIME.test(v));
  if(values.length!==1)return null;
  const issued=Number(values[0].match(ROOM_TIME)[1]);
  return Number.isSafeInteger(issued)?issued:null;
}
async function ownerProofValid(request,env,id,token,issued){
  // Only an operator knowing Cloudflare's private PILOT_OWNER_SECRET can create
  // a capability for a new room ID. Friends receive ONLY a proof specific to
  // that one ID and token; nobody receives the operator's actual secret.
  const protocols=(request.headers.get("Sec-WebSocket-Protocol")||"")
    .split(",").map(s=>s.trim());
  const proofs=protocols.filter(p=>ROOM_PROOF.test(p));
  if(proofs.length!==1)return false;
  const actual=proofs[0].match(ROOM_PROOF)[1];
  const expected=await signOwnerProof(env,id,token,issued);
  if(!expected)return false;
  // Constant-time comparison; do not log the proof or the secret.
  let diff=0;for(let i=0;i<64;i++)diff|=expected.charCodeAt(i)^actual.charCodeAt(i);
  return diff===0;
}
async function tokenDigest(token){
  const data=new TextEncoder().encode(token);
  const hash=await crypto.subtle.digest("SHA-256",data);
  return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("");
}
function metadata(socket){
  try {return socket.deserializeAttachment()||null;}catch(_){return null;}
}
function safeSend(socket,body){
  try{socket.send(JSON.stringify(body));return true;}catch(_){return false;}
}
function invalid(code,ws){
  safeSend(ws,{v:1,type:"error",code});
}
function activeSockets(ctx){
  return ctx.getWebSockets().filter(ws=>metadata(ws)?.expires>Date.now() && ws.readyState===1);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health")
      return json(env.ROOMS_ENABLED==="true"?"STAGING_ENABLED":"STAGING_DISABLED");
    if(url.pathname==="/v1/invite"){
      if(env.ROOMS_ENABLED!=="true")
        return inviteJson({ok:false,code:"ROOMS_DISABLED"},503);
      if(request.headers.get("Origin")!==PAGE_ORIGIN)
        return json("ORIGIN_NOT_ALLOWED",403);
      if(request.method!=="POST"||url.search)
        return inviteJson({ok:false,code:"METHOD_NOT_ALLOWED"},405);
      if(request.headers.get("Content-Type")?.split(";")[0].trim()!=="text/plain")
        return inviteJson({ok:false,code:"CONTENT_TYPE_REQUIRED"},415);
      const limited=await rateLimit(env,request);
      if(limited)return inviteJson({ok:false,code:limited},
        limited==="RATE_LIMITED"?429:503);
      const body=await request.text();
      if(body.length>240)return inviteJson({ok:false,code:"INVITE_TOO_LARGE"},413);
      let info;try{info=JSON.parse(body);}catch(_){
        return inviteJson({ok:false,code:"INVITE_INVALID"},400);
      }
      const id=info?.id,token=info?.auth,issued=info?.issued;
      const now=Date.now();
      if(!ROOM_ID.test(id||"")||!/^[a-f0-9]{64}$/.test(token||"")||
         !Number.isSafeInteger(issued)||issued>now+30000||issued<now-30000)
        return inviteJson({ok:false,code:"INVITE_INVALID"},400);
      const proof=await signOwnerProof(env,id,token,issued);
      if(!proof)return inviteJson({ok:false,code:"OWNER_SECRET_NOT_CONFIGURED"},503);
      const denied=await reserveRoom(env,id,issued+ROOM_LIFETIME_MS);
      if(denied)return inviteJson({ok:false,code:denied},
        denied==="PILOT_ROOM_CAP_REACHED"?429:503);
      return inviteJson({ok:true,code:"INVITE_CREATED",
        proof,expires:issued+ROOM_LIFETIME_MS});
    }
    if(!/^\/v1\/room\/[a-f0-9]{32}$/.test(url.pathname))return json("NOT_FOUND",404);
    if(env.ROOMS_ENABLED!=="true")return json("ROOMS_DISABLED",503);
    if(url.search)return json("QUERY_NOT_ALLOWED",400);
    if((request.headers.get("Sec-WebSocket-Protocol")||"").length>260)
      return json("PROTOCOL_HEADER_TOO_LARGE",431);
    if(request.method!=="GET"||request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return json("WEBSOCKET_REQUIRED",426);
    // Origin check is defense-in-depth; bearer link + signed offer/answer provide
    // trust checks. Browser Origin is not a cryptographic caller identity.
    if(request.headers.get("Origin")!==PAGE_ORIGIN)return json("ORIGIN_NOT_ALLOWED",403);
    const token=tokenFrom(request);
    if(!token)return json("ROOM_TOKEN_REQUIRED",401);
    const issued=issuedFrom(request);
    if(issued===null || issued>Date.now()+30000 ||
       issued+ROOM_LIFETIME_MS<Date.now())return json("ROOM_LINK_EXPIRED",410);
    const id=url.pathname.split("/").pop();
    if(!ROOM_ID.test(id))return json("ROOM_INVALID",400);
    if(!env.CALL_ROOMS?.getByName)return json("BINDING_UNAVAILABLE",503);
    const limited=await rateLimit(env,request);
    if(limited)return json(limited,limited==="RATE_LIMITED"?429:503);
    if(!/^[a-f0-9]{64}$/.test(env.PILOT_OWNER_SECRET||""))
      return json("OWNER_SECRET_NOT_CONFIGURED",503);
    if(!await ownerProofValid(request,env,id,token,issued))
      return json("ROOM_OWNER_PROOF_REQUIRED",403);
    const denied=await reserveRoom(env,id,issued+ROOM_LIFETIME_MS);
    if(denied)return json(denied,denied==="PILOT_ROOM_CAP_REACHED"?429:503);
    const stub=env.CALL_ROOMS.getByName("room-"+id);
    return stub.fetch(request);
  }
};

export class CallRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async fetch(request){
    if(this.env.ROOMS_ENABLED!=="true")return json("ROOMS_DISABLED",503);
    if(request.method!=="GET"||request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return json("WEBSOCKET_REQUIRED",426);
    if(request.headers.get("Origin")!==PAGE_ORIGIN)return json("ORIGIN_NOT_ALLOWED",403);
    const token=tokenFrom(request);
    if(!token)return json("ROOM_TOKEN_REQUIRED",401);
    const issued=issuedFrom(request);
    if(issued===null || issued>Date.now()+30000 ||
       issued+ROOM_LIFETIME_MS<Date.now())return json("ROOM_LINK_EXPIRED",410);
    const digest=await tokenDigest(token);
    const existing=activeSockets(this.ctx);
    if(existing.length>=2)return json("ROOM_FULL",409);
    const peer=existing[0];
    const prior=peer&&metadata(peer);
    const now=Date.now();
    // Only the room identifier, token digest and expiry are stored in SQLite.
    // No offer/answer, addresses, keys or communication content are persisted.
    const record=await this.ctx.storage.get("room:meta");
    if(record?.closed||record?.expires<=now)return json("ROOM_EXPIRED",410);
    if((record && record.hash!==digest)||(prior && prior.hash!==digest))
      return json("ROOM_TOKEN_INVALID",403);
    const expires=record?.expires||issued+ROOM_LIFETIME_MS;
    if(!record)await this.ctx.storage.put("room:meta",{hash:digest,expires,closed:false});
    const slot=prior?.slot==="caller"?"callee":(record?.callerJoined?"callee":"caller");
    if(slot==="callee"&&!peer)return json("CALLER_DISCONNECTED",410);
    if(slot==="callee"&&record?.calleeJoined)return json("ROOM_ALREADY_CLAIMED",409);
    if(slot==="caller")await this.ctx.storage.put("room:meta",
      {hash:digest,expires,closed:false,callerJoined:true,calleeJoined:false});
    else await this.ctx.storage.put("room:meta",
      {...record,calleeJoined:true});
    const pair=new WebSocketPair();
    const [client,server]=Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({hash:digest,expires,slot,count:0,approved:false,offered:false,answered:false});
    // One alarm per room closes remaining peers; hibernation-compatible.
    if(!prior)await this.ctx.storage.setAlarm(expires);
    safeSend(server,{v:1,type:"ready",role:slot,expires});
    if(peer){
      safeSend(peer,{v:1,type:"peer_joined"});
      safeSend(server,{v:1,type:"peer_joined"});
    }
    return new Response(null,{status:101,webSocket:client,
      headers:{"Sec-WebSocket-Protocol":"ezero-room-v1"}});
  }
  async webSocketMessage(ws,message){
    const meta=metadata(ws);
    if(!meta)return invalid("SESSION_UNKNOWN",ws);
    if(Date.now()>=meta.expires){ws.close(1000,"Room expired");return;}
    if(typeof message!=="string"||message.length>MAX_FRAME){ws.close(1009,"Size limit");return;}
    if(meta.count>=MAX_MESSAGES_PER_SOCKET){ws.close(1008,"Message limit");return;}
    // Charge EVERY frame, including malformed/unauthorized messages; otherwise
    // an authenticated but hostile guest can flood the hibernating room forever.
    meta.count++;
    ws.serializeAttachment(meta);
    let frame;
    try{frame=JSON.parse(message);}catch(_){return invalid("FRAME_INVALID",ws);}
    if(frame?.v!==1 || typeof frame.type!=="string")return invalid("FRAME_INVALID",ws);
    const others=activeSockets(this.ctx).filter(x=>x!==ws && metadata(x)?.hash===meta.hash);
    const remote=others[0];
    if(frame.type==="decline"||frame.type==="hangup"){
      if(frame.type==="decline"&&meta.slot!=="callee")return invalid("ROLE_NOT_ALLOWED",ws);
      const record=await this.ctx.storage.get("room:meta");
      if(record)await this.ctx.storage.put("room:meta",{...record,closed:true});
      if(remote)safeSend(remote,{v:1,type:frame.type});
      try{ws.close(1000,"Room closed");}catch(_){}
      if(remote)try{remote.close(1000,"Room closed");}catch(_){}
      return;
    }
    if(!remote)return invalid("PEER_NOT_JOINED",ws);
    if(frame.type==="accept"){
      if(meta.slot!=="callee")return invalid("ROLE_NOT_ALLOWED",ws);
      meta.approved=true;ws.serializeAttachment(meta);
      safeSend(remote,{v:1,type:"accepted"});return;
    }
    // The full signed SDP/ICE offer is AES-GCM encrypted in the browsers.
    // Cloudflare only passes the opaque ciphertext and never reads the SDP/IPs.
    // The receiver still verifies the independent ECDSA/peer fingerprint.
    if(frame.type!=="offer"&&frame.type!=="answer")return invalid("TYPE_NOT_ALLOWED",ws);
    const blob=frame.blob;
    if(typeof blob!=="string" || blob.length<128 || blob.length>170000 ||
       !/^[A-Za-z0-9_-]+$/.test(blob))
       return invalid("ENCRYPTED_FRAME_REQUIRED",ws);
    const remoteMeta=metadata(remote);
    if(frame.type==="offer"){
      if(meta.slot!=="caller"||remoteMeta?.approved!==true||meta.offered)
        return invalid("OFFER_NOT_READY",ws);
      meta.offered=true;
    }else{
      if(meta.slot!=="callee"||meta.approved!==true||remoteMeta?.offered!==true||meta.answered)
        return invalid("ANSWER_NOT_READY",ws);
      meta.answered=true;
    }
    ws.serializeAttachment(meta);
    safeSend(remote,{v:1,type:frame.type,blob});
  }
  async permanentlyRevokeOnDisconnect(ws){
    // Disconnect must never leave the other participant recording or permit
    // a forwarded/stolen invitation to claim the vacated seat.
    const record=await this.ctx.storage.get("room:meta");
    if(record&&!record.closed)
      await this.ctx.storage.put("room:meta",{...record,closed:true});
    for(const other of activeSockets(this.ctx))if(other!==ws){
      safeSend(other,{v:1,type:"peer_left"});
      try{other.close(1000,"Peer left");}catch(_){}
    }
  }
  async webSocketClose(ws){
    await this.permanentlyRevokeOnDisconnect(ws);
  }
  async webSocketError(ws){
    await this.permanentlyRevokeOnDisconnect(ws);
  }
  async alarm(){
    // Expired room IDs cannot be reused after this alarm.
    const record=await this.ctx.storage.get("room:meta");
    if(record)await this.ctx.storage.put("room:meta",{...record,closed:true});
    for(const ws of this.ctx.getWebSockets()){
      try{ws.close(1000,"Room expired");}catch(_){}
    }
    // A signed invite is already cryptographically expired, so erase all room
    // metadata instead of keeping even token digests indefinitely.
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
  }
}

/**
 * Single serialized pilot-wide room capacity gate.
 * Stores only random room IDs and expiry timestamps; no IP, names, SDP,
 * media, private keys, WebSocket tokens or friend identifiers.
 */

export class RoomAdmission {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async fetch(request){
    if(this.env.ROOMS_ENABLED!=="true")return json("ROOMS_DISABLED",503);
    if(request.method!=="POST"||new URL(request.url).pathname!=="/admit")
      return json("METHOD_NOT_ALLOWED",405);
    const raw=await request.text();
    if(raw.length>200)return json("ADMISSION_INVALID",400);
    let payload;
    try{payload=JSON.parse(raw);}catch(_){return json("ADMISSION_INVALID",400);}
    const now=Date.now();
    const id=payload?.id,expires=payload?.expires;
    if(!ROOM_ID.test(id||"")||!Number.isSafeInteger(expires)||
       expires<=now||expires>now+ROOM_LIFETIME_MS+30000)
      return json("ADMISSION_INVALID",400);
    const outcome=await this.ctx.storage.transaction(async tx=>{
      const entries=await tx.list({prefix:"r:"});
      let count=0,exists=false;
      for(const [key,ttl] of entries){
        if(ttl<=now){await tx.delete(key);continue;}
        count++;
        if(key==="r:"+id)exists=true;
      }
      if(exists)return "EXISTING";
      if(count>=MAX_PILOT_ACTIVE_ROOMS)return "CAP_REACHED";
      await tx.put("r:"+id,expires);
      return "RESERVED";
    });
    if(outcome==="CAP_REACHED")return json("PILOT_ROOM_CAP_REACHED",429);
    const alarm=await this.ctx.storage.getAlarm();
    if(!alarm||expires<alarm)await this.ctx.storage.setAlarm(expires);
    return json("ADMITTED");
  }
  async alarm(){
    const now=Date.now();
    const entries=await this.ctx.storage.list({prefix:"r:"});
    let next=null;
    for(const [key,ttl] of entries){
      if(ttl<=now)await this.ctx.storage.delete(key);
      else if(next===null||ttl<next)next=ttl;
    }
    if(next!==null)await this.ctx.storage.setAlarm(next);
    else{
      await this.ctx.storage.deleteAlarm();
      await this.ctx.storage.deleteAll();
    }
  }
}
