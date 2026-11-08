/*
 * E-ZERO Friend-of-Friend Contact Requests — Cloudflare Durable Object lab v0.1
 * STAGING CANDIDATE ONLY: NOT REFERENCED BY PUBLIC ROUTER OR PRODUCTION PAGES.
 *
 * Contact forwarding is an owner-signed public referral, NOT a call invitation.
 * Both owner and visitor prove possession of their own P-256 device keys using
 * a fresh per-socket nonce. The visitor must supply a still-valid owner-signed
 * contact card; the owner must explicitly approve the request in an open tab.
 *
 * No auto-trust, media, chat, contact photos, SDP, offline inbox or call tokens.
 * Authentication headers/QR capability do not appear in URL query strings.
 */
import { DurableObject } from "cloudflare:workers";

const ROUTE=/^\/v1\/contact-requests\/([a-f0-9]{64})$/;
const FP=/^[a-f0-9]{64}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const ID=/^[a-f0-9]{32}$/;
const TYPE="EZERO-SIGNED-CONTACT-1";
const DOMAIN="EZERO-CONTACT-REQUEST-INBOX-1";
const MAX_SOCKETS=6;
const MAX_MESSAGES_PER_MINUTE=30;
const AUTH_MS=20000, OWNER_MS=20*60*1000, VISITOR_MS=2*60*1000;
const MAX_CARD=2100, MAX_RAW=3300, REPLAY_MS=10*60*1000;
const encoder=new TextEncoder();
const origin=env=>env.PUBLIC_ORIGIN||"";

function decodeBase64(value,max=2000){
  if(typeof value!=="string"||!B64.test(value)||
     value.length>Math.ceil(max*4/3)+4)throw Error("BAD_BASE64");
  const bytes=atob(value.replace(/-/g,"+").replace(/_/g,"/")+
    "=".repeat((4-value.length%4)%4));
  if(bytes.length>max)throw Error("BIG_BASE64");
  return Uint8Array.from(bytes,ch=>ch.charCodeAt(0));
}
function encodeBase64(bytes){
  let value="";for(const byte of bytes)value+=String.fromCharCode(byte);
  return btoa(value).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");}
function state(ws){try{return ws.deserializeAttachment()||null;}catch(_){return null;}}
function send(ws,packet){
  if(!ws||ws.readyState!==1)return false;
  try{ws.send(JSON.stringify(packet));return true;}catch(_){return false;}
}
function close(ws,reason){
  try{ws.close(1008,reason);}catch(_){}
}
function normalizedName(value){
  if(typeof value!=="string"||value.length>40||
     /[\u0000-\u001f\u007f]/.test(value)||!value.trim())
    throw Error("INVALID_NAME");
  return value.trim().replace(/\s+/g," ");
}
async function identity(pub,fp){
  if(!FP.test(fp||""))return null;
  try{
    const bytes=decodeBase64(pub,150);
    if(bytes.length<75||bytes.length>140)return null;
    const hash=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
    if(hash!==fp)return null;
    return await crypto.subtle.importKey("spki",bytes,
      {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  }catch(_){return null;}
}
async function verifyHello(a,m,now,allowedOrigin){
  if(!a||a.role!=="pending"||now-a.opened>=AUTH_MS||
     m?.t!=="hello"||!["owner","visitor"].includes(m.role)||
     !FP.test(m.fp||"")||typeof m.pub!=="string"||
     (m.role==="owner")!==(m.fp===a.target))return null;
  const key=await identity(m.pub,m.fp);if(!key)return null;
  try{
    const sig=decodeBase64(m.sig,100);if(sig.length!==64)return null;
    const payload=[DOMAIN,allowedOrigin,a.target,m.role,m.fp,a.nonce,String(a.opened)].join("\n");
    if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,sig,encoder.encode(payload)))return null;
    return {role:m.role,fp:m.fp,target:a.target,expires:now+
      (m.role==="owner"?OWNER_MS:VISITOR_MS),count:a.count,windowStart:a.windowStart};
  }catch(_){return null;}
}
async function verifyOwnerCard(card,target,allowedOrigin,now){
  if(typeof card!=="string"||!B64.test(card)||card.length>MAX_CARD)
    throw Error("INVALID_CARD");
  let object;
  try{object=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(decodeBase64(card,1600)));}
  catch(_){throw Error("INVALID_CARD");}
  const p=object?.p;
  if(!p||typeof p!=="object"||Array.isArray(p)||
     p.type!==TYPE||p.v!==1||p.fp!==target||p.origin!==allowedOrigin||
     !FP.test(p.fp||"")||p.allowForward!==true||
     typeof p.spki!=="string"||!B64.test(p.spki)||p.spki.length>240||
     typeof p.nonce!=="string"||!B64.test(p.nonce)||p.nonce.length!==22||
     !Number.isSafeInteger(p.issued)||!Number.isSafeInteger(p.expires)||
     p.issued>now+60000||p.expires<=now||p.expires<=p.issued||
     p.expires-p.issued>24*60*60*1000||
     typeof object.s!=="string"||!B64.test(object.s)||object.s.length>180)
    throw Error("INVALID_CARD");
  normalizedName(p.name);
  const key=await identity(p.spki,p.fp);if(!key)throw Error("INVALID_CARD");
  const canonical=JSON.stringify([TYPE,p.v,p.origin,p.fp,p.spki,p.name,
    p.issued,p.expires,p.nonce,true]);
  let ok=false;
  try{
    const sig=decodeBase64(object.s,100);
    ok=sig.length===64&&await crypto.subtle.verify(
      {name:"ECDSA",hash:"SHA-256"},key,sig,encoder.encode(canonical));
  }catch(_){}
  if(!ok)throw Error("INVALID_CARD");
  return {expires:p.expires,subject:p.fp};
}

export default {
  async fetch(request,env){
    const u=new URL(request.url),m=ROUTE.exec(u.pathname);
    if(request.method!=="GET"||!m||u.search||u.hash)
      return new Response("Not Found",{status:404,headers:{"Cache-Control":"no-store"}});
    if(request.headers.get("Origin")!==origin(env))
      return new Response("Forbidden",{status:403});
    if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return new Response("Upgrade Required",{status:426});
    if(!env.REQUEST_INBOXES?.getByName)return new Response("Unavailable",{status:503});
    return env.REQUEST_INBOXES.getByName(m[1]).fetch(request);
  }
};

export class ContactRequestInbox extends DurableObject {
  sockets(){return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);}
  owner(){return this.sockets().find(ws=>state(ws)?.role==="owner")||null;}
  prune(now=Date.now()){
    for(const ws of this.sockets()){
      const a=state(ws);
      if(!a||(a.role==="pending"&&now-a.opened>=AUTH_MS)||
         (a.role!=="pending"&&a.expires<=now))close(ws,"expired");
    }
  }
  async schedule(now=Date.now()){
    let next=Infinity;
    for(const ws of this.sockets()){
      const a=state(ws);
      if(!a)continue;
      next=Math.min(next,a.role==="pending"?a.opened+AUTH_MS:a.expires);
    }
    if(Number.isFinite(next))await this.ctx.storage.setAlarm(Math.max(now+1,next));
    else await this.ctx.storage.deleteAlarm?.();
  }
  async fetch(request){
    const u=new URL(request.url),m=ROUTE.exec(u.pathname);
    if(!m||u.search||u.hash||request.headers.get("Origin")!==origin(this.env))
      return new Response("Forbidden",{status:403});
    if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return new Response("Upgrade Required",{status:426});
    this.prune();
    if(this.sockets().length>=MAX_SOCKETS)return new Response("Busy",{status:429});
    const pair=new WebSocketPair(),[client,server]=Object.values(pair);
    const nonce=encodeBase64(crypto.getRandomValues(new Uint8Array(24)));
    const opened=Date.now();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({role:"pending",target:m[1],nonce,opened,
      windowStart:opened,count:0});
    send(server,{t:"challenge",target:m[1],nonce,opened,expires:opened+AUTH_MS});
    await this.schedule(opened);
    return new Response(null,{status:101,webSocket:client});
  }
  charge(ws,a,now){
    if(!a)return null;
    const start=now>=a.windowStart&&now-a.windowStart<60000?a.windowStart:now;
    const count=(start===a.windowStart?a.count||0:0)+1;
    if(count>MAX_MESSAGES_PER_MINUTE){
      send(ws,{t:"error",code:"RATE_LIMIT"});close(ws,"rate-limit");return null;
    }
    const updated={...a,windowStart:start,count};
    ws.serializeAttachment(updated);
    return updated;
  }
  async webSocketMessage(ws,raw){
    const now=Date.now();
    let a=this.charge(ws,state(ws),now);
    if(!a)return;
    if(typeof raw!=="string"||raw.length>MAX_RAW){
      send(ws,{t:"error",code:"INVALID_FRAME"});close(ws,"oversized");return;
    }
    let m;try{m=JSON.parse(raw);}catch(_){send(ws,{t:"error",code:"BAD_JSON"});return;}
    if(!m||typeof m!=="object"||Array.isArray(m))return;
    if(a.role==="pending"){
      const authenticated=await verifyHello(a,m,now,origin(this.env));
      if(!authenticated){close(ws,"unauthorized");return;}
      if(authenticated.role==="owner"&&this.owner()){close(ws,"owner-busy");return;}
      ws.serializeAttachment(authenticated);
      send(ws,{t:"ready",role:authenticated.role,expires:authenticated.expires});
      await this.schedule(now);
      return;
    }
    if(a.expires<=now){close(ws,"expired");return;}
    if(a.role==="visitor"&&m.t==="request"){
      if(a.requested)return send(ws,{t:"error",code:"ONE_REQUEST_PER_SOCKET"});
      if(!ID.test(m.id||""))return send(ws,{t:"error",code:"INVALID_REQUEST_ID"});
      let display;
      try{display=normalizedName(m.name);}catch(_){
        return send(ws,{t:"error",code:"INVALID_NAME"});
      }
      try{await verifyOwnerCard(m.card,a.target,origin(this.env),now);}
      catch(_){return send(ws,{t:"error",code:"INVALID_CARD"});}
      // Anonymous connection attempts alone cannot force a stored request.
      const owner=this.owner();
      if(!owner){return send(ws,{t:"error",code:"NOT_AVAILABLE"});}
      const saved=await this.ctx.storage.get("recent");
      const recent=Array.isArray(saved)?saved.filter(x=>x.until>now).slice(-32):[];
      if(recent.some(x=>x.id===m.id||x.fp===a.fp))
        return send(ws,{t:"error",code:"COOLDOWN"});
      const next={...a,requested:true,pendingId:m.id,expires:Math.min(a.expires,now+VISITOR_MS)};
      ws.serializeAttachment(next);
      if(!send(owner,{t:"contact-request",id:m.id,from:a.fp,name:display})){
        ws.serializeAttachment({...a,requested:false,pendingId:null});
        return send(ws,{t:"error",code:"NOT_AVAILABLE"});
      }
      await this.ctx.storage.put("recent",[
        ...recent.slice(-31),{fp:a.fp,id:m.id,until:now+REPLAY_MS}
      ]);
      send(ws,{t:"pending",id:m.id});
      await this.schedule(now);
      return;
    }
    if(a.role==="owner"&&m.t==="decision"){
      if(!ID.test(m.id||"")||typeof m.approve!=="boolean")
        return send(ws,{t:"error",code:"INVALID_DECISION"});
      const guest=this.sockets().find(candidate=>{
        const x=state(candidate);
        return x?.role==="visitor"&&x.requested===true&&x.pendingId===m.id&&
          x.expires>now;
      });
      if(!guest)return send(ws,{t:"error",code:"UNKNOWN_REQUEST"});
      const g=state(guest);
      guest.serializeAttachment({...g,pendingId:null,requested:false,decided:true});
      const sent=send(guest,{t:"decision",id:m.id,approved:m.approve});
      send(ws,{t:"decision-recorded",id:m.id,approved:m.approve,
        relayQueued:sent});
      // An approval DOES NOT mark a friend as trusted and cannot start a call.
      return;
    }
    send(ws,{t:"error",code:"NOT_PERMITTED"});
  }
  async webSocketClose(){await this.schedule();}
  async webSocketError(ws){close(ws,"socket-error");await this.schedule();}
  async alarm(){
    this.prune();
    await this.schedule();
  }
}