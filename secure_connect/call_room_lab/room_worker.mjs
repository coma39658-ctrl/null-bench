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
const MAX_FRAME=125000;
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
  return ctx.getWebSockets().filter(ws=>metadata(ws)?.expires>Date.now() && ws.readyState!==3);
}
export default {
  async fetch(request,env){
    const url=new URL(request.url);
    if(request.method==="GET"&&url.pathname==="/health")
      return json(env.ROOMS_ENABLED==="true"?"STAGING_ENABLED":"STAGING_DISABLED");
    if(!/^\/v1\/room\/[a-f0-9]{32}$/.test(url.pathname))return json("NOT_FOUND",404);
    if(env.ROOMS_ENABLED!=="true")return json("ROOMS_DISABLED",503);
    if(request.method!=="GET"||request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return json("WEBSOCKET_REQUIRED",426);
    // Origin check is defense-in-depth; bearer link + signed offer/answer provide
    // trust checks. Browser Origin is not a cryptographic caller identity.
    if(request.headers.get("Origin")!==PAGE_ORIGIN)return json("ORIGIN_NOT_ALLOWED",403);
    const token=tokenFrom(request);
    if(!token)return json("ROOM_TOKEN_REQUIRED",401);
    const id=url.pathname.split("/").pop();
    if(!ROOM_ID.test(id))return json("ROOM_INVALID",400);
    if(!env.CALL_ROOMS?.getByName)return json("BINDING_UNAVAILABLE",503);
    // Do not put the secret in URL/query, logs or object name.
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
    const digest=await tokenDigest(token);
    const existing=activeSockets(this.ctx);
    if(existing.length>=2)return json("ROOM_FULL",409);
    const peer=existing[0];
    const prior=peer&&metadata(peer);
    if(prior && prior.hash!==digest)return json("ROOM_TOKEN_INVALID",403);
    const now=Date.now();
    const expires=prior?.expires||now+ROOM_LIFETIME_MS;
    if(expires<=now)return json("ROOM_EXPIRED",410);
    const slot=prior?.slot==="caller"?"callee":"caller";
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
    let frame;
    try{frame=JSON.parse(message);}catch(_){return invalid("FRAME_INVALID",ws);}
    if(frame?.v!==1 || typeof frame.type!=="string")return invalid("FRAME_INVALID",ws);
    const others=activeSockets(this.ctx).filter(x=>x!==ws && metadata(x)?.hash===meta.hash);
    const remote=others[0];
    if(frame.type==="decline"||frame.type==="hangup"){
      meta.count++;ws.serializeAttachment(meta);
      if(remote)safeSend(remote,{v:1,type:frame.type});
      if(frame.type==="hangup"){
        try{ws.close(1000,"Hangup");}catch(_){}
        if(remote)try{remote.close(1000,"Hangup");}catch(_){}
      }
      return;
    }
    if(!remote)return invalid("PEER_NOT_JOINED",ws);
    if(frame.type==="accept"){
      if(meta.slot!=="callee")return invalid("ROLE_NOT_ALLOWED",ws);
      meta.approved=true;meta.count++;ws.serializeAttachment(meta);
      safeSend(remote,{v:1,type:"accepted"});return;
    }
    // Strict relay of already-signed offer/answer. The browser still verifies
    // the ECDSA signature, freshness and SHA-256 peer identity before WebRTC.
    if(frame.type!=="offer"&&frame.type!=="answer")return invalid("TYPE_NOT_ALLOWED",ws);
    const payload=frame.payload;
    if(!payload||payload.v!==1||payload.type!==frame.type||
       typeof payload.sdp!=="string"||payload.sdp.length<100||payload.sdp.length>120000||
       !payload.sdp.startsWith("v=0") ||
       !/^[0-9a-f]{64}$/.test(payload.fp||"") ||
       !/^[0-9a-f]{32}$/.test(payload.nonce||"") ||
       typeof payload.sig!=="string"||payload.sig.length>200||
       typeof payload.pub!=="string"||payload.pub.length>300 ||
       !Number.isSafeInteger(payload.issued))return invalid("SIGNED_ENVELOPE_REQUIRED",ws);
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
    meta.count++;ws.serializeAttachment(meta);
    safeSend(remote,{v:1,type:frame.type,payload});
  }
  async webSocketClose(ws){
    for(const other of activeSockets(this.ctx))if(other!==ws)
      safeSend(other,{v:1,type:"peer_left"});
  }
  async webSocketError(ws){
    for(const other of activeSockets(this.ctx))if(other!==ws)
      safeSend(other,{v:1,type:"peer_left"});
  }
  async alarm(){
    // Ephemeral offer/answer stays only in WebSocket frames and browser memory.
    // No SQL rows or browser data are persisted by the room service.
    for(const ws of this.ctx.getWebSockets()){
      try{ws.close(1000,"Room expired");}catch(_){}
    }
  }
}
