/*
 * E-ZERO real workerd / Miniflare WebSocket pilot preflight.
 * LOCAL RUNTIME ONLY. Uses a synthetic owner secret; neither production
 * Cloudflare nor real phones are touched, and no audio/video is captured.
 *
 * Unlike the fake WebSocket model, this tests actual HTTP Upgrade, routing,
 * Durable Object SQLite admission, role consent, relay, and room revocation.
 */
import assert from "node:assert/strict";
import {createHash,createHmac,randomBytes} from "node:crypto";
import WebSocket from "ws";

const host=process.env.EZERO_LOCAL_WORKER_ORIGIN||"http://127.0.0.1:8790";
const url=new URL(host);
assert.ok(["127.0.0.1","localhost"].includes(url.hostname), "ONLY_LOOPBACK_WORKER_ALLOWED");
assert.equal(url.protocol,"http:","NO_REMOTE_OR_DEPLOYED_WORKER_TEST");
assert.equal(url.pathname,"/");
const wsUrl=host.replace(/^http:/,"ws:");
const ORIGIN="https://coma39658-ctrl.github.io";
const TEST_OWNER="e".repeat(64); // synthetic test-only value: never use in Cloudflare production

const hash=s=>createHash("sha256").update(s).digest("hex");
const mac=s=>createHmac("sha256",TEST_OWNER).update(s).digest("hex");
const expiry=10*60*1000;
const issue=()=>Date.now();
function invite(issued=issue()){
 const id=randomBytes(16).toString("hex"),aes=randomBytes(32).toString("hex");
 const auth=hash("EZERO-ROOM-AUTH-1:"+aes),proof=mac(id+"."+auth+"."+issued);
 const protocols=["ezero-room-v1","ezero-key-"+auth,"ezero-time-"+issued,"ezero-proof-"+proof];
 return {id,aes,auth,proof,issued,protocols,url:wsUrl+"/v1/room/"+id};
}
function collect(ws){
 const frames=[];
 const listeners=new Set();
 ws.on("message",buf=>{
  let frame;try{frame=JSON.parse(String(buf));}catch(_){return;}
  frames.push(frame);
  for(const listener of listeners)listener(frame);
 });
 return {ws,frames,listeners};
}
function wait(s,pred,label,ms=8000){
 const found=s.frames.find(pred);if(found)return Promise.resolve(found);
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{
   s.listeners.delete(onFrame);
   reject(Error("MISSING_FRAME_"+label));
  },ms);
  function onFrame(frame){
   if(!pred(frame))return;
   clearTimeout(timer);s.listeners.delete(onFrame);resolve(frame);
  }
  s.listeners.add(onFrame);
 });
}
function send(s,value){
 assert.equal(s.ws.readyState,WebSocket.OPEN,"SOCKET_MUST_BE_OPEN");
 s.ws.send(JSON.stringify({v:1,...value}));
}
async function connect(inv,{origin=ORIGIN,protocols=inv.protocols}={}){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(inv.url,protocols,{origin,handshakeTimeout:8000});
  const s=collect(ws);
  ws.once("open",()=>resolve(s));
  ws.once("unexpected-response",(_req,res)=>{
   const code=res.statusCode;
   res.resume();
   reject(Error("WORKER_DENIED_HTTP_"+code));
  });
  ws.once("error",reject);
 });
}
async function denied(inv,expected,options){
 let caught="";
 try{
  const s=await connect(inv,options);
  s.ws.terminate();
 }catch(e){caught=String(e.message);}
 assert.equal(caught,"WORKER_DENIED_HTTP_"+expected,
  "WebSocket upgrade must fail with intended HTTP status");
}
async function closed(s){
 if(s.ws.readyState===WebSocket.CLOSED)return;
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error("SOCKET_NOT_CLOSED")),8000);
  s.ws.once("close",()=>{clearTimeout(timer);resolve();});
 });
}
const res=await fetch(host+"/health",{redirect:"error",signal:AbortSignal.timeout(6000)});
assert.equal(res.status,200);
assert.equal((await res.json()).code,"STAGING_ENABLED",
 "Only a LOCALLY-ENABLED simulation is permitted");
console.log("LOCAL_WORKER_RUNTIME_ENABLED_NOT_CLOUDFLARE: PASS");

const noUpgrade=await fetch(host+"/v1/room/"+"f".repeat(32),{
 method:"GET",redirect:"error",signal:AbortSignal.timeout(6000)
});
assert.equal(noUpgrade.status,426);
const miss=invite();
await denied(miss,403,{origin:"https://attacker.invalid"});
await denied(miss,403,{protocols:miss.protocols.slice(0,3).concat("ezero-proof-"+"0".repeat(64))});
await denied(invite(Date.now()-expiry-1000),410);
console.log("REAL_WORKER_HTTP_ORIGIN_HMAC_AND_OLD_LINK_REJECTION: PASS");

const call=invite();
let a,b;
try{
 a=await connect(call);
 assert.equal((await wait(a,f=>f.type==="ready","CALLER")).role,"caller");
 b=await connect(call);
 assert.equal((await wait(b,f=>f.type==="ready","CALLEE")).role,"callee");
 await wait(a,f=>f.type==="peer_joined","JOINED_A");
 await wait(b,f=>f.type==="peer_joined","JOINED_B");
 await denied(call,409);
 send(a,{type:"offer",blob:"A".repeat(540)});
 assert.equal((await wait(a,f=>f.type==="error"&&f.code==="OFFER_NOT_READY","CONSENT_GATE")).code,
 "OFFER_NOT_READY");
 send(b,{type:"accept"});
 await wait(a,f=>f.type==="accepted","ACCEPTED");
 const ciphertextA="A".repeat(540),ciphertextB="B".repeat(540);
 send(a,{type:"offer",blob:ciphertextA});
 assert.equal((await wait(b,f=>f.type==="offer","OPAQUE_OFFER")).blob,ciphertextA);
 send(b,{type:"answer",blob:ciphertextB});
 assert.equal((await wait(a,f=>f.type==="answer","OPAQUE_ANSWER")).blob,ciphertextB);
 assert.equal(a.frames.some(f=>JSON.stringify(f).includes("a=fingerprint")),false,
  "No SDP should be present in remote WebSocket payloads");
 console.log("ACTUAL_WORKER_TWO_PEER_CONSENTED_ENCRYPTED_SIGNAL_RELAY: PASS");
 send(b,{type:"hangup"});
 await wait(a,f=>f.type==="hangup","HANGUP");
 await Promise.all([closed(a),closed(b)]);
 await denied(call,410);
 console.log("ACTUAL_WORKER_HANGUP_REVOKES_ROOM_AND_REPLAY: PASS");
}finally{
 for(const session of [a,b])if(session?.ws.readyState!==WebSocket.CLOSED){
  try{session.ws.terminate();}catch(_){}
 }
}

const decline=invite();
let c,d;
try{
 c=await connect(decline);d=await connect(decline);
 await wait(d,f=>f.type==="ready","DECLINE_READY");
 send(d,{type:"decline"});
 await wait(c,f=>f.type==="decline","DECLINE_DELIVERED");
 await Promise.all([closed(c),closed(d)]);
 await denied(decline,410);
 console.log("ACTUAL_WORKER_DECLINE_REVOKES_ROOM: PASS");
}finally{for(const session of [c,d])if(session?.ws.readyState!==WebSocket.CLOSED){
 try{session.ws.terminate();}catch(_){}
}}
