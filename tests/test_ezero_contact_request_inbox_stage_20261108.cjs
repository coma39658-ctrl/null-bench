"use strict";
/* E-ZERO friend-of-friend inbox threat model. Never accesses live Cloudflare.
 * Real generated P-256 signatures run against a fake Durable Object/socket.
 */
const assert=require("node:assert/strict");
const {webcrypto,createHash}=require("node:crypto");
const fs=require("node:fs");
const vm=require("node:vm");
if(!globalThis.crypto?.subtle)Object.defineProperty(globalThis,"crypto",{value:webcrypto,configurable:true});
const proto=require("../js/ezero_contact_forwarding_protocol_v0_1.js");
const source=fs.readFileSync("signaling/cloudflare/src/contact_request_inbox_stage_v0_1.js","utf8");
assert.doesNotMatch(source,/RTCPeerConnection|MediaRecorder|getUserMedia|eval\s*\(|new Function|console\.log/);
assert.match(source,/this\.ctx\.getWebSockets\(\)/);
assert.match(source,/serializeAttachment/);
const base="https://stage.example/ezero_trusted_friends_staging_20261106.html";
const ORIGIN="https://stage.example";
const start=Date.now();let time=start;
class TestDate extends Date {static now(){return time;}}
class DurableObject {constructor(ctx,env){this.ctx=ctx;this.env=env;}}
class Response {
 constructor(body,opt={}){this.body=body;this.status=opt.status||200;this.webSocket=opt.webSocket;}
}
class WS {
 constructor(){this.readyState=1;this.sent=[];this.current=null;this.closed=false;}
 send(str){this.sent.push(JSON.parse(str));}
 close(code,reason){this.closed=true;this.readyState=3;this.code=code;this.reason=reason;}
 serializeAttachment(value){this.current=structuredClone(value);}
 deserializeAttachment(){return this.current;}
}
class Pair {constructor(){this[0]={};this[1]=new WS();}}
const wrap=source.replace(/^import \{ DurableObject \} from "cloudflare:workers";\s*/m,"")
  .replace("export default {","const edge = {")
  .replace("export class ContactRequestInbox extends DurableObject","class ContactRequestInbox extends DurableObject");
const context=vm.createContext({crypto:webcrypto,Date:TestDate,Response,WebSocketPair:Pair,
 DurableObject,URL,TextEncoder,TextDecoder,Uint8Array,JSON,Number,Array,Math,btoa,atob});
vm.runInContext(wrap+"\nthis.exposed={edge,ContactRequestInbox};",context,{timeout:5000});
const {edge,ContactRequestInbox}=context.exposed;
const sockets=[],data=new Map(),alarms=[];
const ctx={
 getWebSockets(){return sockets;},
 acceptWebSocket(ws){sockets.push(ws);},
 storage:{
  async get(k){return data.get(k);},
  async put(k,v){data.set(k,structuredClone(v));},
  async delete(k){data.delete(k);},
  async deleteAll(){data.clear();},
  async setAlarm(t){alarms.push(t);},
  async deleteAlarm(){alarms.push(null);}
 }
};
const env={PUBLIC_ORIGIN:ORIGIN};let room=new ContactRequestInbox(ctx,env);
env.REQUEST_INBOXES={getByName:(fp)=>({fetch:(req)=>room.fetch(req)})};
function req(fp,{origin=ORIGIN,upgrade="websocket",path}={}){
 return {method:"GET",url:path||"https://api.example/v1/contact-requests/"+fp,
   headers:{get:(x)=>x==="Origin"?origin:x==="Upgrade"?upgrade:null}};
}
const text=Buffer.from;
function b64(v){return Buffer.from(v).toString("base64url");}
async function device(){
 const keys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
 const spki=b64(await webcrypto.subtle.exportKey("spki",keys.publicKey));
 const fingerprint=createHash("sha256").update(Buffer.from(spki,"base64url")).digest("hex");
 return {keys,spki,fingerprint};
}
function last(){return sockets.at(-1);}
async function connect(fp){
 const r=await edge.fetch(req(fp),env);assert.equal(r.status,101);return last();
}
async function hello(ws,d,role,override={}){
 const a=ws.deserializeAttachment();
 const sign=["EZERO-CONTACT-REQUEST-INBOX-1",ORIGIN,a.target,role,d.fingerprint,
   a.nonce,String(a.opened)].join("\n");
 const signed=await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
   d.keys.privateKey,new TextEncoder().encode(sign));
 await room.webSocketMessage(ws,JSON.stringify({t:"hello",role,fp:d.fingerprint,pub:d.spki,
   sig:b64(signed),...override}));
}
const packet=(ws,type)=>(ws.sent||[]).filter(x=>x.t===type);
const statuses=(ws)=>ws.sent.filter(x=>x.t==="error").map(x=>x.code);
async function run(){
 const owner=await device(),visitor=await device(),stranger=await device();
 const card=await proto.create({identity:owner,name:"Ali",baseUrl:base,consent:true});
 const target=owner.fingerprint,token=card.url.split("#contact=")[1];
 assert.ok(token.length<2100);
 assert.equal((await edge.fetch(req(target,{origin:"https://evil.example"}),env)).status,403);
 assert.equal((await edge.fetch(req(target,{upgrade:""}),env)).status,426);
 assert.equal((await edge.fetch(req(target,{path:"https://api.example/v1/contact-requests/"+target+"?token=secret"}),env)).status,404);
 console.log("REQUEST_INBOX_BAD_ORIGIN_QUERY_AND_UPGRADE_REJECTED: PASS");

 const imp=await connect(target);
 await hello(imp,stranger,"owner");assert.equal(imp.closed,true,"Non-owner can never impersonate owner");
 const firstVisitor=await connect(target);
 await hello(firstVisitor,visitor,"visitor");
 assert.equal(firstVisitor.deserializeAttachment().role,"visitor");
 const id1="a".repeat(32);
 await room.webSocketMessage(firstVisitor,JSON.stringify({t:"request",id:id1,name:"Ahmad",card:token}));
 assert.ok(statuses(firstVisitor).includes("NOT_AVAILABLE"),"No owner tab => no delivery");
 console.log("REQUEST_INBOX_OWNER_SIGNATURE_REQUIRED_AND_NO_OFFLINE_STORAGE: PASS");

 const ownerWs=await connect(target);
 await hello(ownerWs,owner,"owner");
 assert.equal(ownerWs.deserializeAttachment().role,"owner");
 const wrong=await connect(target);
 await hello(wrong,stranger,"visitor",{sig:"z".repeat(86)});
 assert.equal(wrong.closed,true);
 await room.webSocketMessage(firstVisitor,JSON.stringify({t:"request",id:id1,name:"Ahmad",card:"a".repeat(30)}));
 assert.ok(statuses(firstVisitor).includes("INVALID_CARD"));
 console.log("REQUEST_INBOX_REAL_P256_CHALLENGE_AND_INVALID_CARD_REJECTED: PASS");

 // Valid owner-signed consentful card results in pending request, not trust.
 await room.webSocketMessage(firstVisitor,JSON.stringify({t:"request",id:id1,name:"Ahmad",card:token}));
 const incoming=packet(ownerWs,"contact-request");
 assert.equal(incoming.length,1);
 assert.equal(incoming[0].id,id1);
 assert.equal(incoming[0].from,visitor.fingerprint);
 assert.equal(incoming[0].name,"Ahmad");
 assert.ok(packet(firstVisitor,"pending").length===1);
 assert.ok(!packet(firstVisitor,"decision").length);
 assert.ok(!JSON.stringify([...data.values()]).includes("Ahmad"));
 assert.ok(!JSON.stringify([...data.values()]).includes(token));
 assert.ok(!JSON.stringify([...data.values()]).includes("privateKey"));
 console.log("REQUEST_INBOX_SIGNED_FORWARDED_CARD_QUEUED_ONLY_IN_LIVE_OWNER_TAB: PASS");

 // Durable Object hibernation: state is recovered from socket attachments,
 // not a process-global map of visitors, even after class reconstruction.
 room=new ContactRequestInbox(ctx,env);
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"decision",id:id1,approve:false}));
 assert.equal(packet(firstVisitor,"decision").at(-1)?.approved,false);
 assert.equal(packet(ownerWs,"decision-recorded").at(-1)?.relayQueued,true);
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"decision",id:id1,approve:true}));
 assert.ok(statuses(ownerWs).includes("UNKNOWN_REQUEST"),
   "A denied request cannot later be approved by replaying same ID");
 console.log("REQUEST_INBOX_DENY_AND_HIBERNATION_SAFE_RESPONSE: PASS");

 // Same identity/ID cannot repeatedly spam the owner, even with a new socket.
 const visitor2=await connect(target);await hello(visitor2,visitor,"visitor");
 await room.webSocketMessage(visitor2,JSON.stringify({t:"request",id:id1,name:"Ahmad",card:token}));
 assert.ok(statuses(visitor2).includes("COOLDOWN"));
 assert.equal(packet(ownerWs,"contact-request").length,1);
 console.log("REQUEST_INBOX_REPLAY_AND_CONTACT_SPAM_COOLDOWN: PASS");

 // A different identity can ask once. Approval remains a status message
 // only; no trusted-friends store, call token or microphone/camera is touched.
 const fresh=await device(),guest=await connect(target);await hello(guest,fresh,"visitor");
 const id2="b".repeat(32);
 await room.webSocketMessage(guest,JSON.stringify({t:"request",id:id2,name:"Bilal",card:token}));
 assert.equal(packet(ownerWs,"contact-request").length,2);
 await room.webSocketMessage(guest,JSON.stringify({t:"decision",id:id2,approve:true}));
 assert.ok(statuses(guest).includes("NOT_PERMITTED"));
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"decision",id:id2,approve:true}));
 assert.equal(packet(guest,"decision").at(-1)?.approved,true);
 assert.ok(!JSON.stringify(guest.sent).includes("room="));
 console.log("REQUEST_INBOX_OWNER_ONLY_ACCEPT_NO_AUTOTRUST_NO_CALL_TOKEN: PASS");

 // The accepted request can receive ONE verified call QR link from the
 // authenticated OWNER, only after a separate explicit call-start click.
 // A mere approval still does not start a call or camera capture.
 const callUrl="https://stage.example/null-bench/ezero_trusted_friends_staging_20261106.html"+
   "?mode=audio#room="+("A".repeat(32))+"."+("B".repeat(43));
 await room.webSocketMessage(guest,JSON.stringify({t:"invite",id:id2,
   kind:"audio",url:callUrl}));
 assert.ok(statuses(guest).includes("NOT_PERMITTED"));
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"invite",id:id2,
   kind:"audio",url:callUrl.replace("https://stage.example","https://evil.example")}));
 assert.ok(statuses(ownerWs).includes("INVALID_INVITE"));
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"invite",id:id2,
   kind:"video",url:callUrl}));
 assert.equal(statuses(ownerWs).filter(x=>x==="INVALID_INVITE").length,2);
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"invite",id:id1,
   kind:"audio",url:callUrl}));
 assert.ok(statuses(ownerWs).includes("REQUEST_NOT_APPROVED_OR_EXPIRED"),
   "Previously rejected requester must never receive media call capability");
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"invite",id:id2,
   kind:"audio",url:callUrl}));
 assert.equal(packet(guest,"call-invite").length,1);
 assert.equal(packet(guest,"call-invite")[0].url,callUrl);
 assert.equal(packet(ownerWs,"invite-relayed").at(-1).kind,"audio");
 assert.ok(!JSON.stringify([...data.values()]).includes(callUrl),
   "Transient room capability must not be persisted");
 await room.webSocketMessage(ownerWs,JSON.stringify({t:"invite",id:id2,
   kind:"audio",url:callUrl}));
 assert.equal(packet(guest,"call-invite").length,1,"Second call QR relay must be rejected");
 console.log("REQUEST_INBOX_ONE_EXPLICIT_APPROVED_SIGNED_CALL_LINK_ONLY: PASS");

 // Expired pending sockets release quotas without hanging up owner.
 const pending=[];
 for(let i=0;i<2;i++)pending.push(await connect(target));
 time+=20001;await room.alarm();
 assert.ok(pending.every(ws=>ws.closed));
 assert.equal(ownerWs.closed,false);
 console.log("REQUEST_INBOX_PENDING_AUTH_EXPIRY_PRESERVES_OWNER: PASS");

 // Raw and malformed messages are charged even before a JSON parse.
 for(let i=0;i<32;i++){
  if(visitor2.readyState!==1)break;
  await room.webSocketMessage(visitor2,"invalid json");
 }
 assert.equal(visitor2.closed,true);assert.ok(statuses(visitor2).includes("RATE_LIMIT"));
 const tooBig=await connect(target);
 await room.webSocketMessage(tooBig,"x".repeat(4000));
 assert.equal(tooBig.closed,true);
 console.log("REQUEST_INBOX_MALFORMED_FLOOD_AND_OVERSIZE_REJECTED: PASS");
 time+=20*60*1000+1;await room.alarm();
 assert.equal(ownerWs.closed,true,"An owner session must expire instead of staying active forever");
 assert.equal(data.size,0,"Expiring replay cache must not persist pseudonymous identities indefinitely");
 console.log("REQUEST_INBOX_OWNER_SESSION_EXPIRY_AND_REPLAY_CACHE_DELETED: PASS");
 await room.alarm();
 assert.equal(data.size,0,"Repeated cleanup alarm must be idempotent and privacy-preserving");
 console.log("REQUEST_INBOX_IDLE_DURABLE_OBJECT_STORAGE_CLEANUP: PASS");
 console.log("E_ZERO_FRIEND_OF_FRIEND_SIGNED_CONTACT_APPROVAL_STAGE: PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
