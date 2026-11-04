/*
 * E-ZERO short-link WebRTC signaling laboratory.
 * Explicitly NOT a public call service: ROOMS_ENABLED=false by default.
 * SDP and ICE are opaque and are never stored, logged, or relayed to a third client.
 * Cloudflare Durable Object Hibernation: no background browser polling.
 * Only an opt-in one-to-one signed WebRTC test; no audio/video relay/recording.
 */
export const ROOM_LIFETIME_MS=10*60*1000;
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
  const secret=env.PILOT_OWNER_SECRET;
  if(typeof secret!=="string" || !/^[A-Za-z0-9_-]{24,128}$/.test(secret))
    return false;
  const protocols=(request.headers.get("Sec-WebSocket-Protocol")||"")
    .split(",").map(s=>s.trim());
  const proofs=protocols.filter(p=>ROOM_PROOF.test(p));
  if(proofs.length!==1)return false;
  const actual=proofs[0].match(ROOM_PROOF)[1];
  const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),
    {name:"HMAC",hash:"SHA-256"},false,["sign"]);
  const bytes=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(id+"."+token+"."+issued));
  const expected=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
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
    if(!env.ROOM_RATE_LIMIT?.limit)return json("RATE_LIMIT_NOT_CONFIGURED",503);
    try {
      const quota=await env.ROOM_RATE_LIMIT.limit({
        key:"call-room:"+String(request.headers.get("CF-Connecting-IP")||"unknown")
      });
      if(quota?.success!==true)return json("RATE_LIMITED",429);
    }catch(_){return json("RATE_LIMIT_UNAVAILABLE",503);}
    if(typeof env.PILOT_OWNER_SECRET!=="string" || env.PILOT_OWNER_SECRET.length<24)
      return json("OWNER_SECRET_NOT_CONFIGURED",503);
    if(!await ownerProofValid(request,env,id,token,issued))
      return json("ROOM_OWNER_PROOF_REQUIRED",403);
    // Verify before allocating a Durable Object to block unauthenticated
    // cross-room resource exhaustion. No plain secret in URL or logs.
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
