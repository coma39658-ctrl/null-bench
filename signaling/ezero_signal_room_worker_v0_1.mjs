/*
 * E-ZERO Secure Connect signal-only relay (STAGING CANDIDATE).
 * Cloudflare Worker + Durable Object WebSocket hibernation.
 * No account, chat/media archive, room database, SDP parsing or telemetry.
 * The server relays only client-side AES-GCM encrypted signed WebRTC signals.
 * NOT deployed until explicit operational gate; never silently provision TURN.
 */
export const ALLOWED_ORIGIN = "https://coma39658-ctrl.github.io";
export const ROOM_MAX_AGE_MS = 10 * 60 * 1000;
export const MAX_FRAME_BYTES = 180000;
const ID = /^[a-f0-9]{32}$/;
const TIME = /^[1-9][0-9]{12}$/;
const IV = /^[A-Za-z0-9_-]{16}$/;
const CIPHER = /^[A-Za-z0-9_-]{40,175000}$/;
const UTF8 = new TextEncoder();
const deny = (status, text) => new Response(text, {
  status,
  headers: {"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"}
});
export function inspectRequest(request, now=Date.now()){
  const url=new URL(request.url);
  if(request.method!=="GET")return {error:405};
  if(url.pathname==="/v1/health")return {health:true};
  const match=/^\/v1\/room\/([a-f0-9]{32})$/.exec(url.pathname);
  if(!match||!ID.test(match[1]))return {error:404};
  if(request.headers.get("Origin")!==ALLOWED_ORIGIN)return {error:403};
  if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")return {error:426};
  const created=url.searchParams.get("created");
  if(!created||!TIME.test(created)||url.searchParams.size!==1)return {error:400};
  const issued=Number(created);
  if(!Number.isSafeInteger(issued)||issued>now+60000||now-issued>ROOM_MAX_AGE_MS)
    return {error:410};
  return {room:match[1],created:issued};
}
export function validFrame(input){
  if(typeof input!=="string"||UTF8.encode(input).length>MAX_FRAME_BYTES)return false;
  let value;
  try{value=JSON.parse(input);}catch(_){return false;}
  return value?.v===1&&value.kind==="encrypted-signal"&&
    ["offer","answer"].includes(value.type)&&
    typeof value.iv==="string"&&IV.test(value.iv)&&
    typeof value.cipher==="string"&&CIPHER.test(value.cipher)&&
    Object.keys(value).length===5;
}
export default {
  async fetch(request, env){
    const check=inspectRequest(request);
    if(check.health){
      return new Response(JSON.stringify({service:"E-ZERO staging signaling",mode:"encrypted-relay-only"}),{
        headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
      });
    }
    if(check.error)return deny(check.error,"E-ZERO SIGNAL_REQUEST_REJECTED");
    if(!env?.EZERO_ROOMS?.idFromName||!env.EZERO_ROOMS.get)return deny(503,"SIGNALING_UNCONFIGURED");
    const stub=env.EZERO_ROOMS.get(env.EZERO_ROOMS.idFromName(check.room));
    // No key or SDP is ever placed in the request URI. Only an opaque room ID.
    return stub.fetch(request);
  }
};
export class EzeroSignalRoom {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async fetch(request){
    const inspected=inspectRequest(request);
    if(inspected.error||inspected.health)return deny(403,"ROOM_ACCESS_DENIED");
    const current=this.ctx.getWebSockets();
    for(const ws of current){
      const a=ws.deserializeAttachment?.();
      if(!a||a.created!==inspected.created||Date.now()>a.expires){
        try{ws.close(1008,"ROOM_EXPIRED");}catch(_){}
      }
    }
    const alive=this.ctx.getWebSockets().filter(x=>x.readyState===1);
    if(alive.length>=2)return deny(409,"ROOM_FULL");
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({created:inspected.created,
      expires:inspected.created+ROOM_MAX_AGE_MS,count:0});
    this.updatePeerCounts();
    return new Response(null,{status:101,webSocket:client});
  }
  updatePeerCounts(){
    const active=this.ctx.getWebSockets().filter(x=>x.readyState===1);
    const msg=JSON.stringify({v:1,kind:"peers",count:Math.min(2,active.length)});
    for(const ws of active){try{ws.send(msg);}catch(_){}}
  }
  async webSocketMessage(ws,message){
    const a=ws.deserializeAttachment?.();
    if(!a||Date.now()>a.expires||a.count>=8||
       !validFrame(message)){
      try{ws.close(1008,"INVALID_OR_EXPIRED_SIGNAL");}catch(_){}
      this.updatePeerCounts();return;
    }
    a.count++;
    ws.serializeAttachment(a);
    const others=this.ctx.getWebSockets().filter(x=>x!==ws&&x.readyState===1);
    if(others.length!==1)return;
    const other=others[0],otherState=other.deserializeAttachment?.();
    if(!otherState||otherState.created!==a.created)return;
    // Forward opaque encrypted bytes without storing, parsing SDP, or logging.
    try{other.send(message);}catch(_){}
  }
  async webSocketClose(ws){
    try{ws.close(1000,"CLOSED");}catch(_){}
    this.updatePeerCounts();
  }
  async webSocketError(ws){
    try{ws.close(1011,"SOCKET_ERROR");}catch(_){}
    this.updatePeerCounts();
  }
}