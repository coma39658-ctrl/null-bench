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
// Per-socket abuse limits also apply to invalid JSON and app-level pings.
// Counters live in hibernatable attachments, never in process-global memory.
const HELLO_TIMEOUT_MS = 20 * 1000;
const MESSAGE_WINDOW_MS = 60 * 1000;
const MAX_MESSAGES_PER_WINDOW = 60;
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
  // Release only expired, unauthenticated sockets; never close a valid call
  // merely because the earliest pending-auth alarm fired.
  prunePending(now=Date.now()) {
    for(const ws of this.members()) {
      const state=attachment(ws);
      if(state?.role==="pending" && now-state.opened>=HELLO_TIMEOUT_MS) {
        try{ws.close(1008,"auth-timeout");}catch(_){}
      }
    }
  }
  async scheduleCleanup(now=Date.now()) {
    // One idempotent alarm per room for the next pending deadline or room TTL.
    // A later host authentication must not accidentally cancel an earlier
    // unauthenticated connection deadline.
    const auth=await this.ctx.storage.get("roomAuth");
    let next=auth?.expires>now ? auth.expires : Infinity;
    for(const ws of this.members()) {
      const a=attachment(ws);
      if(a?.role==="pending")next=Math.min(next,Math.max(now+1,a.opened+HELLO_TIMEOUT_MS));
    }
    if(Number.isFinite(next))await this.ctx.storage.setAlarm(next);
  }
  memberMessage(ws,old,now=Date.now()) {
    if(!old)return null;
    const windowStart=Number.isFinite(old.windowStart)&&
      now>=old.windowStart&&now-old.windowStart<MESSAGE_WINDOW_MS ? old.windowStart : now;
    const count=(windowStart===old.windowStart?(old.windowCount||0):0)+1;
    if(count>MAX_MESSAGES_PER_WINDOW) {
      send(ws,{t:"error",code:"RATE_LIMIT"});
      try{ws.close(1008,"rate-limit");}catch(_){}
      return null;
    }
    const updated={...old,windowStart,windowCount:count};
    ws.serializeAttachment(updated);
    return updated;
  }
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
    this.prunePending();
    if(this.members().length >= 4)
      return new Response("Too many clients",{status:429});
    if(request.headers.get("Upgrade")?.toLowerCase() !== "websocket")
      return new Response("Upgrade required",{status:426});
    const pair = new WebSocketPair();
    const [client,server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    // No session is granted until a valid hello message is authenticated.
    const opened=Date.now();
    server.serializeAttachment({role:"pending",opened,windowStart:opened,windowCount:0});
    await this.scheduleCleanup(opened);
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,message) {
    if(typeof message!=="string" || message.length > MAX_MESSAGE) {
      send(ws,{t:"error",code:"BAD_SIZE"});
      ws.close(1008,"invalid");return;
    }
    const now=Date.now();
    // Charge EVERY message to this connection, including malformed JSON,
    // disallowed actions and ping floods, before attempting to parse it.
    const old=this.memberMessage(ws,attachment(ws),now);
    if(!old) {if(ws.readyState===1)ws.close(1008,"unauthorized");return;}
    let m;
    try{m=JSON.parse(message);}catch(_){send(ws,{t:"error",code:"BAD_JSON"});return;}
    if(!m || typeof m!=="object" || Array.isArray(m))return;
    if(old.role==="pending"){
      if(now-old.opened>=HELLO_TIMEOUT_MS || m.t!=="hello")
        return ws.close(1008,"unauthorized");
      if(m.role==="host"){
        if(this.active("host") || !PROOF.test(m.hostProof||"") ||
           !PROOF.test(m.guestProof||"") ||
           sameProof(m.hostProof,m.guestProof))
          return ws.close(1008,"unauthorized");
        // Bind a random room ID to its original host secret. Without this
        // reservation, a guest with an invite URL could impersonate the
        // host after disconnection and intercept the next guest's SDP.
        // Only metadata (proofs of random room secrets + expiry) is stored.
        const stored=await this.ctx.storage.get("roomAuth");
        if(stored && (stored.expires<=now ||
           !sameProof(stored.hostProof,m.hostProof) ||
           !sameProof(stored.guestProof,m.guestProof)))
          return ws.close(1008,"unauthorized");
        const expires=stored?.expires||now+TTL_MS;
        if(!stored)await this.ctx.storage.put("roomAuth",{
          hostProof:m.hostProof,guestProof:m.guestProof,expires
        });
        ws.serializeAttachment({...old,role:"host",hostProof:m.hostProof,
          guestProof:m.guestProof,expires,signals:0});
        await this.scheduleCleanup(now);
        send(ws,{t:"ready",role:"host",expires});
        return;
      }
      if(m.role==="guest"){
        const host=this.active("host");
        const ha=host && attachment(host);
        if(!ha || ha.expires<=now || this.active("guest") ||
           !sameProof(m.guestProof,ha.guestProof))
          return ws.close(1008,"unauthorized");
        const stored=await this.ctx.storage.get("roomAuth");
        // A completed signed answer consumes the invite. An unfinished first
        // connection may retry until TTL; a completed session cannot replay.
        if(!stored || stored.expires<=now || stored.guestConsumed===true ||
           !sameProof(stored.guestProof,m.guestProof))
          return ws.close(1008,"unauthorized");
        ws.serializeAttachment({...old,role:"guest",expires:ha.expires,signals:0});
        await this.scheduleCleanup(now);
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
      if(old.role==="guest") {
        const stored=await this.ctx.storage.get("roomAuth");
        if(!stored || stored.expires<=now || stored.guestConsumed===true) {
          send(ws,{t:"error",code:"INVITE_CONSUMED"});return;
        }
        // Consume the *guest capability* only upon forwarding a valid answer,
        // not on mere WebSocket join: early network drops can still retry.
        await this.ctx.storage.put("roomAuth",{...stored,guestConsumed:true});
      }
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
    await this.scheduleCleanup();
  }
  async webSocketError(ws) {
    await this.webSocketClose(ws);
  }
  async alarm() {
    const now=Date.now();
    this.prunePending(now);
    const auth=await this.ctx.storage.get("roomAuth");
    if(auth?.expires<=now) {
      this.closeAll("expired");
      await this.ctx.storage.delete("roomAuth");
    } else {
      // An expired pending socket must not tear down a still-live room.
      await this.scheduleCleanup(now);
    }
  }
}
