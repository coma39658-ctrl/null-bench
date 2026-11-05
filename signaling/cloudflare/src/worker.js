/* E-ZERO isolated WebRTC signaling pilot — NO media/chat storage.
 * Cloudflare Workers + one hibernatable Durable Object per random room.
 * Not deployed by committing code. Explicit live authorization is required.
 *
 * A room is limited to two independently authenticated WebSockets. The browser
 * creates cryptographically strong random room and bearer secrets. Secrets are
 * never in the request path, query string, logs, analytics or cookies.
 * We store only short-lived SHA-256 proofs on an active WebSocket attachment.
 * All transmitted SDP remains separately signed and verified by E-ZERO peers.
 */
import { DurableObject } from "cloudflare:workers";

const ROOM = /^[A-Za-z0-9_-]{32}$/;
const PROOF = /^[a-f0-9]{64}$/;
const TTL_MS = 10 * 60 * 1000;
const MAX_SIGNAL = 145000;
const MAX_MESSAGE = MAX_SIGNAL + 300;
const json = (data) => JSON.stringify(data);
const send = (ws, data) => {
  try {
    if (ws.readyState === 1) ws.send(json(data));
  } catch (_) {}
};
const attachment = ws => {
  try { return ws.deserializeAttachment() || null; }
  catch (_) { return null; }
};
const sameProof = (a,b) => {
  if(!PROOF.test(a || "") || !PROOF.test(b || "")) return false;
  let xor=0;
  for(let i=0;i<a.length;i++) xor|=a.charCodeAt(i)^b.charCodeAt(i);
  return xor===0;
};

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    const headers = {"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
    if(request.method === "GET" && u.pathname === "/v1/health") {
      return new Response(json({status:"ok",version:"0.1",purpose:"signaling-only"}),
        {status:200,headers:{...headers,"Content-Type":"application/json"}});
    }
    const m = /^\/v1\/rooms\/([A-Za-z0-9_-]+)$/.exec(u.pathname);
    if(!m || !ROOM.test(m[1]) || u.search) return new Response("Not Found",{status:404,headers});
    // Browsers send Origin for WebSockets. Do not allow arbitrary sites to
    // connect to this signaling service or place tokens in URL parameters.
    if(request.headers.get("Origin") !== env.PUBLIC_ORIGIN)
      return new Response("Forbidden",{status:403,headers});
    if(request.method!=="GET" ||
       request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return new Response("WebSocket required",{status:426,headers});
    if(!env.ROOMS?.getByName) return new Response("Unavailable",{status:503,headers});
    return env.ROOMS.getByName(m[1]).fetch(request);
  }
};

export class SignalRoom extends DurableObject {
  members() {
    return this.ctx.getWebSockets().filter(ws => ws.readyState === 1);
  }
  active(role) {
    return this.members().find(ws => attachment(ws)?.role === role) || null;
  }
  closeAll(reason) {
    for(const ws of this.members()) {
      send(ws,{t:"closed",reason});
      try{ws.close(1000,reason);}catch(_){}
    }
  }
  async fetch(request) {
    if(request.headers.get("Origin") !== this.env.PUBLIC_ORIGIN)
      return new Response("Forbidden",{status:403});
    if(this.members().length >= 4)
      return new Response("Too many clients",{status:429});
    if(request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("Upgrade required",{status:426});
    const pair = new WebSocketPair();
    const [client,server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    // No session is granted until a valid hello message is authenticated.
    server.serializeAttachment({role:"pending",opened:Date.now()});
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message) {
    if(typeof message!=="string" || message.length > MAX_MESSAGE) {
      send(ws,{t:"error",code:"BAD_SIZE"});
      ws.close(1008,"invalid");return;
    }
    let m;
    try{m=JSON.parse(message);}catch(_){send(ws,{t:"error",code:"BAD_JSON"});return;}
    if(!m || typeof m!=="object")return;
    const old=attachment(ws);
    if(!old)return ws.close(1008,"unauthorized");
    const now=Date.now();
    if(old.role==="pending"){
      if(now-old.opened>20000 || m.t!=="hello")
        return ws.close(1008,"unauthorized");
      if(m.role==="host"){
        if(this.active("host") || !sameProof(m.hostProof,m.hostProof) ||
            !sameProof(m.guestProof,m.guestProof) ||
            sameProof(m.hostProof,m.guestProof))
          return ws.close(1008,"unauthorized");
        const expires=now+TTL_MS;
        ws.serializeAttachment({role:"host",hostProof:m.hostProof,
          guestProof:m.guestProof,expires,signals:0});
        await this.ctx.storage.setAlarm(expires);
        send(ws,{t:"ready",role:"host",expires});
        return;
      }
      if(m.role==="guest"){
        const host=this.active("host");
        const ha=host && attachment(host);
        if(!ha || ha.expires<=now || this.active("guest") ||
           !sameProof(m.guestProof,ha.guestProof))
          return ws.close(1008,"unauthorized");
        ws.serializeAttachment({role:"guest",expires:ha.expires,signals:0});
        send(ws,{t:"ready",role:"guest",expires:ha.expires});
        send(host,{t:"peer",state:"joined"});
        return;
      }
      return ws.close(1008,"unauthorized");
    }
    if(old.expires<=now) {this.closeAll("expired");return;}
    const other=this.active(old.role==="host"?"guest":"host");
    if(m.t==="signal") {
      const expected=old.role==="host"?"offer":"answer";
      if(old.signals!==0 || typeof m.payload!=="string" ||
         m.payload.length<100 || m.payload.length>MAX_SIGNAL) {
        send(ws,{t:"error",code:"BAD_SIGNAL"});return;
      }
      let signal;
      try{signal=JSON.parse(m.payload);}catch(_){send(ws,{t:"error",code:"BAD_SIGNAL"});return;}
      if(signal?.v!==1 || signal.type!==expected ||
         typeof signal.sdp!=="string" || signal.sdp.length<100 ||
         signal.sdp.length>120000 ||
         !/^[a-f0-9]{64}$/.test(signal.fp || "") ||
         !Number.isSafeInteger(signal.issued) ||
         Math.abs(now-signal.issued)>TTL_MS) {
        send(ws,{t:"error",code:"BAD_SIGNAL"});return;
      }
      if(!other) {send(ws,{t:"error",code:"PEER_UNAVAILABLE"});return;}
      ws.serializeAttachment({...old,signals:1});
      // The relay does not persist the payload, and never echoes it.
      send(other,{t:"signal",role:old.role,payload:m.payload});
      return;
    }
    if(m.t==="decline" && old.role==="guest") {
      send(other,{t:"declined"});
      ws.close(1000,"declined");
      return;
    }
    if(m.t==="leave") {
      send(other,{t:"left"});
      ws.close(1000,"left");return;
    }
    if(m.t==="ping")send(ws,{t:"pong"});
  }
  async webSocketClose(ws) {
    const a=attachment(ws);
    if(a?.role==="host")this.closeAll("host-left");
    else if(a?.role==="guest")send(this.active("host"),{t:"peer",state:"left"});
  }
  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
  async alarm() {
    this.closeAll("expired");
  }
}
