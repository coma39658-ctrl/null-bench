/*
 * E-ZERO Trusted Friend Inbox candidate V0.1 — STAGING ONLY; NOT DEPLOYED.
 * Addressing/signaling for saved contacts, separate from the working QR pilot.
 * A recipient grants trust explicitly; sender must prove possession of a
 * persistent non-exportable P-256 device key before delivering ONE short call
 * invitation. No media, SDP, messages, photos, call logs or offline delivery.
 * A browser tab must stay open to receive a call at this stage.
 *
 * SECURITY: this module is intentionally NOT referenced by public HTML,
 * the deployed Worker, or existing wrangler.jsonc. Do not ship without
 * physical two-phone redial and abuse/security testing.
 */
import { DurableObject } from "cloudflare:workers";

const FP=/^[a-f0-9]{64}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const CALL_ID=/^[a-f0-9]{32}$/;
const MAX_FRIENDS=50, MAX_CLIENTS=8;
const HELLO_MS=20000, COOLDOWN_MS=30000, REPLAY_MS=600000;
const ROUTE=/^\/v1\/trusted\/([a-f0-9]{64})$/;
const ORIGIN="https://coma39658-ctrl.github.io";
const INVITE_PATH="/null-bench/ezero_trusted_friends_staging_20261106.html";
const encoder=new TextEncoder();

function base64url(bytes){
  let raw="";
  for(const byte of bytes)raw+=String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function fromB64(value,max=150){
  if(typeof value!=="string"||!B64.test(value)||value.length>max)return null;
  try{
    const b=atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4));
    return Uint8Array.from(b,c=>c.charCodeAt(0));
  }catch(_){return null;}
}
function hex(bytes){
  return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
}
function send(ws,thing){
  try{if(ws?.readyState===1)ws.send(JSON.stringify(thing));}catch(_){}
}
function attach(ws){
  try{return ws.deserializeAttachment()||null;}catch(_){return null;}
}
function validInvite(value,kind){
  if(typeof value!=="string"||value.length>240)return false;
  let u;
  try{u=new URL(value);}catch(_){return false;}
  return u.origin===ORIGIN&&u.pathname===INVITE_PATH&&
    u.searchParams.size===1&&u.searchParams.get("mode")===kind&&
    /^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(u.hash);
}
async function verifyHello(s,hello,target){
  if(!s||s.role!=="pending"||Date.now()-s.opened>HELLO_MS ||
     s.target!==target||hello?.t!=="hello"||
     !["owner","caller"].includes(hello.role))return null;
  const pub=fromB64(hello.pub,240),sig=fromB64(hello.sig,180);
  if(!pub||pub.length<75||pub.length>140||!sig||
     typeof hello.fp!=="string"||!FP.test(hello.fp))return null;
  try{
    const fp=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",pub)));
    if(fp!==hello.fp || (hello.role==="owner"&&fp!==target) ||
       (hello.role==="caller"&&fp===target))return null;
    const key=await crypto.subtle.importKey("spki",pub,
      {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const msg=["EZERO-TRUSTED-INBOX-1",ORIGIN,target,hello.role,
      hello.fp,s.nonce,String(s.opened)].join("\n");
    const ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
      key,sig,encoder.encode(msg));
    return ok?{role:hello.role,fp}:null;
  }catch(_){return null;}
}

export default {
  async fetch(request,env){
    const u=new URL(request.url);
    const m=ROUTE.exec(u.pathname);
    const headers={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
    if(!m||u.search||request.method!=="GET")
      return new Response("Not Found",{status:404,headers});
    if(request.headers.get("Origin")!==(env.PUBLIC_ORIGIN||ORIGIN))
      return new Response("Forbidden",{status:403,headers});
    if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return new Response("WebSocket required",{status:426,headers});
    if(!env.TRUSTED_INBOXES?.getByName)
      return new Response("Unavailable",{status:503,headers});
    return env.TRUSTED_INBOXES.getByName(m[1]).fetch(request);
  }
};

export class TrustedInbox extends DurableObject {
  members(){
    return this.ctx.getWebSockets().filter(ws=>ws.readyState===1);
  }
  owner(){
    return this.members().find(ws=>attach(ws)?.role==="owner")||null;
  }
  async trusted(){
    const f=await this.ctx.storage.get("trusted");
    return Array.isArray(f)?f.filter(x=>FP.test(x)).slice(0,MAX_FRIENDS):[];
  }
  async fetch(request){
    const u=new URL(request.url),m=ROUTE.exec(u.pathname);
    if(!m||u.search)return new Response("Not Found",{status:404});
    if(request.headers.get("Origin")!==(this.env.PUBLIC_ORIGIN||ORIGIN))
      return new Response("Forbidden",{status:403});
    if(request.headers.get("Upgrade")?.toLowerCase()!=="websocket")
      return new Response("WebSocket required",{status:426});
    if(this.members().length>=MAX_CLIENTS)return new Response("Busy",{status:429});
    const [client,server]=Object.values(new WebSocketPair());
    const nonce=base64url(crypto.getRandomValues(new Uint8Array(24)));
    const opened=Date.now();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({role:"pending",opened,nonce,target:m[1]});
    send(server,{t:"challenge",nonce,target:m[1],opened,expires:opened+HELLO_MS});
    return new Response(null,{status:101,webSocket:client});
  }
  async webSocketMessage(ws,raw){
    if(typeof raw!=="string"||raw.length>1800){
      send(ws,{t:"error",code:"BAD_SIZE"});
      try{ws.close(1008,"invalid");}catch(_){}
      return;
    }
    let msg;
    try{msg=JSON.parse(raw);}catch(_){return send(ws,{t:"error",code:"BAD_JSON"});}
    const a=attach(ws);
    if(!a)return ws.close(1008,"unauthorized");
    if(a.role==="pending"){
      const person=await verifyHello(a,msg,a.target);
      if(!person)return ws.close(1008,"unauthorized");
      if(person.role==="owner"&&this.owner())return ws.close(1008,"owner-busy");
      if(person.role==="caller"){
        const trust=await this.trusted();
        if(!trust.includes(person.fp))return ws.close(1008,"not-trusted");
      }
      ws.serializeAttachment({...person,target:a.target});
      send(ws,{t:"ready",role:person.role});
      return;
    }
    if(a.role==="owner"){
      if(["trust","untrust"].includes(msg?.t)){
        if(!FP.test(msg.fp||"")||msg.fp===a.fp)
          return send(ws,{t:"error",code:"BAD_FRIEND"});
        const current=await this.trusted();
        if(msg.t==="trust"){
          if(!current.includes(msg.fp)&&current.length>=MAX_FRIENDS)
            return send(ws,{t:"error",code:"FRIENDS_LIMIT"});
          if(!current.includes(msg.fp))
            await this.ctx.storage.put("trusted",[...current,msg.fp]);
        }else{
          await this.ctx.storage.put("trusted",current.filter(fp=>fp!==msg.fp));
          for(const client of this.members()){
            if(attach(client)?.role==="caller"&&attach(client)?.fp===msg.fp)
              try{client.close(1000,"revoked");}catch(_){}
          }
        }
        send(ws,{t:"trust-updated",fp:msg.fp,trusted:msg.t==="trust"});
        return;
      }
      return send(ws,{t:"error",code:"UNSUPPORTED"});
    }
    if(a.role!=="caller")return ws.close(1008,"unauthorized");
    if(msg?.t!=="call")return send(ws,{t:"error",code:"UNSUPPORTED"});
    if(!CALL_ID.test(msg.callId||"")||!["audio","video"].includes(msg.kind)||
       !validInvite(msg.invite,msg.kind))
      return send(ws,{t:"error",code:"BAD_INVITE"});
    if(a.called)return send(ws,{t:"error",code:"ONE_CALL_PER_SOCKET"});
    const owner=this.owner();
    if(!owner)return send(ws,{t:"error",code:"RECIPIENT_OFFLINE"});
    const current=await this.trusted();
    if(!current.includes(a.fp))return ws.close(1008,"revoked");
    const now=Date.now();
    const id="recent:"+a.fp;
    const prior=await this.ctx.storage.get(id);
    if(prior?.callId===msg.callId&&prior.expires>now)
      return send(ws,{t:"error",code:"REPLAY"});
    if(prior?.nextAt>now)
      return send(ws,{t:"error",code:"COOLDOWN"});
    await this.ctx.storage.put(id,{
      callId:msg.callId,nextAt:now+COOLDOWN_MS,expires:now+REPLAY_MS
    });
    ws.serializeAttachment({...a,called:true});
    // No offline storage: only deliver to a connected, consenting owner's tab.
    send(owner,{t:"incoming",from:a.fp,callId:msg.callId,
      kind:msg.kind,invite:msg.invite});
    send(ws,{t:"delivered-to-active-tab",callId:msg.callId});
  }
  async webSocketClose(){}
  async webSocketError(ws){
    try{ws.close(1011,"error");}catch(_){}
  }
}
