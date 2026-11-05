import assert from "node:assert/strict";
import {CallRoom,RoomAdmission} from "./room_worker.mjs";
import {ROOM_LIFETIME_MS,MAX_PILOT_ACTIVE_ROOMS} from "./room_constants.mjs";
import worker from "./room_worker.mjs";

// In-memory model of the WebSocket Hibernation attachment contract.
// No calls to Cloudflare: this is a disabled, synthetic lab test.
const NativeResponse=globalThis.Response;
globalThis.Response=function(body,opts={}){
  if(opts.status===101)return {status:101,webSocket:opts.webSocket,headers:opts.headers};
  return new NativeResponse(body,opts);
};
class FakeSocket{
  constructor(){this.readyState=1;this.messages=[];this.state=null;}
  send(frame){if(this.readyState!==1)throw Error("CLOSED");this.messages.push(JSON.parse(frame));}
  close(){this.readyState=3;}
  serializeAttachment(value){this.state=structuredClone(value);}
  deserializeAttachment(){return this.state;}
}
globalThis.WebSocketPair=class{
  constructor(){this[0]=new FakeSocket();this[1]=new FakeSocket();}
};
function environment(){
  const db=new Map();
  const ctx={sockets:[],storage:{alarm:null,db,
    get:async k=>db.get(k),put:async(k,v)=>{db.set(k,structuredClone(v));},
    deleteAll:async()=>db.clear(),deleteAlarm:async()=>{ctx.storage.alarm=null;},
    setAlarm:async t=>{ctx.storage.alarm=t;}},
    acceptWebSocket(ws){ctx.sockets.push(ws);},
    getWebSockets(){return ctx.sockets.filter(s=>s.readyState!==3);}};
  const env={ROOMS_ENABLED:"true",PILOT_OWNER_SECRET:ownerSecret,
    ROOM_RATE_LIMIT:{limit:async()=>({success:true})}};
  const object=new CallRoom(ctx,env);
  env.CALL_ROOMS={getByName:()=>({fetch:r=>object.fetch(r)})};
  env.ROOM_ADMISSION={getByName:()=>({fetch:async()=>new NativeResponse("ok",{status:200})})};
  return {ctx,env,object};
}
const base="https://example.invalid/v1/room/";
const roomId="a".repeat(32),token="c".repeat(64),issued=Date.now();
const ownerSecret="f".repeat(64);
const proofKey=await crypto.subtle.importKey("raw",new TextEncoder().encode(ownerSecret),
  {name:"HMAC",hash:"SHA-256"},false,["sign"]);
const proofBytes=await crypto.subtle.sign("HMAC",proofKey,
  new TextEncoder().encode(roomId+"."+token+"."+issued));
const proof=[...new Uint8Array(proofBytes)].map(x=>x.toString(16).padStart(2,"0")).join("");
const goodHeaders={Origin:"https://coma39658-ctrl.github.io",
  Upgrade:"websocket","Sec-WebSocket-Protocol":"ezero-room-v1,ezero-key-"+token+
    ",ezero-time-"+issued+",ezero-proof-"+proof};
function req(id=roomId,headers=goodHeaders){return new Request(base+id,{headers});}
function last(s){return s.messages.at(-1);}
function signal(type){
 return {v:1,type,issued:Date.now(),nonce:"f".repeat(32),fp:"a".repeat(64),
   sig:"M".repeat(86),pub:"M".repeat(120),
   sdp:"v=0\r\na=fingerprint:sha-256 "+("11:".repeat(31))+"11\r\n"+("a=sendrecv\r\n".repeat(6))};
}
const site={ROOMS_ENABLED:"false"};
const disabled=await worker.fetch(req(),site);
assert.equal(disabled.status,503);
assert.equal((await disabled.json()).code,"ROOMS_DISABLED");
const health=await worker.fetch(new Request("https://example.invalid/health"),site);
assert.equal((await health.json()).code,"STAGING_DISABLED");
console.log("DISABLED_BY_DEFAULT_NO_PUBLIC_ROOM: PASS");

const env=environment();
const invalidOrigin=await worker.fetch(req(roomId,{...goodHeaders,Origin:"https://stranger.test"}),env.env);
assert.equal(invalidOrigin.status,403);
const missingToken=await worker.fetch(req(roomId,{...goodHeaders,"Sec-WebSocket-Protocol":"ezero-room-v1"}),env.env);
assert.equal(missingToken.status,401);
const fakeProof=await worker.fetch(req(roomId,{...goodHeaders,
  "Sec-WebSocket-Protocol":"ezero-room-v1,ezero-key-"+token+
    ",ezero-time-"+issued+",ezero-proof-"+"0".repeat(64)}),env.env);
assert.equal(fakeProof.status,403);
assert.equal(env.ctx.sockets.length,0,
  "Invalid owner proof must be rejected before Durable Object allocation");
const noWs=await worker.fetch(new Request(base+roomId,{headers:{Origin:goodHeaders.Origin}}),env.env);
assert.equal(noWs.status,426);
assert.equal(env.ctx.sockets.length,0);
console.log("ORIGIN_TOKEN_OWNER_HMAC_PROOF_UPGRADE_REQUIRED: PASS");

const connA=await worker.fetch(req(),env.env);
assert.equal(connA.status,101);
const a=env.ctx.sockets[0];
assert.equal(last(a).type,"ready");
assert.equal(last(a).role,"caller");
assert.equal(env.ctx.storage.alarm> Date.now(),true);
assert.equal(env.ctx.storage.alarm<=Date.now()+ROOM_LIFETIME_MS+1000,true);
const badSecond=await worker.fetch(req(roomId,{...goodHeaders,
 "Sec-WebSocket-Protocol":"ezero-room-v1,ezero-key-"+"d".repeat(64)+
  ",ezero-time-"+issued+",ezero-proof-"+proof}),env.env);
assert.equal(badSecond.status,403);
const connB=await worker.fetch(req(),env.env);
assert.equal(connB.status,101);
const b=env.ctx.sockets[1];
assert.equal(last(b).type,"peer_joined");
const third=await worker.fetch(req(),env.env);
assert.equal(third.status,409);
assert.equal(env.ctx.sockets.length,2);
console.log("ONE_ROOM_TWO_CLIENT_LIMIT_AND_BEARER_CHECK: PASS");

await env.object.webSocketMessage(a,JSON.stringify({v:1,type:"offer",blob:"A".repeat(540)}));
assert.equal(last(a).code,"OFFER_NOT_READY");
await env.object.webSocketMessage(b,JSON.stringify({v:1,type:"accept"}));
assert.equal(last(a).type,"accepted");
const opaque="A".repeat(540);
await env.object.webSocketMessage(a,JSON.stringify({v:1,type:"offer",blob:opaque}));
assert.equal(last(b).type,"offer");
assert.equal(last(b).blob,opaque);
assert.equal(last(b).payload,undefined,"Cloudflare never receives plaintext SDP");
await env.object.webSocketMessage(b,JSON.stringify({v:1,type:"answer",blob:opaque}));
assert.equal(last(a).type,"answer");
assert.equal(last(a).blob,opaque);
assert.equal(env.ctx.sockets[0].deserializeAttachment().count,2);
assert.equal(env.ctx.sockets[1].deserializeAttachment().count,2);
assert.deepEqual([...env.ctx.storage.db.keys()],["room:meta"]);
assert.equal(JSON.stringify(env.ctx.storage.db.get("room:meta")).includes("sdp"),false);
console.log("EXPLICIT_ACCEPT_SIGNED_SHAPE_RELAY_NO_SDP_STORAGE: PASS");

await env.object.webSocketMessage(a,JSON.stringify({v:1,type:"offer",blob:opaque}));
assert.equal(last(a).code,"OFFER_NOT_READY","Cannot send a second offer");
await env.object.webSocketMessage(b,JSON.stringify({v:1,type:"hangup"}));
assert.equal(a.readyState,3);
assert.equal(b.readyState,3);
assert.equal(env.ctx.storage.db.get("room:meta").closed,true);
assert.equal((await worker.fetch(req(),env.env)).status,410,"Hangup tombstones the room even after both disconnect");
console.log("REPLAY_BLOCKED_HANGUP_CLOSES_BOTH: PASS");

const exp=environment();
await worker.fetch(req(),exp.env);await worker.fetch(req(),exp.env);
const expA=exp.ctx.sockets[0],expB=exp.ctx.sockets[1];
expA.serializeAttachment({...expA.deserializeAttachment(),expires:Date.now()-1});
await exp.object.webSocketMessage(expA,JSON.stringify({v:1,type:"offer",blob:opaque}));
assert.equal(expA.readyState,3);
await exp.object.alarm();
assert.equal(expB.readyState,3);
assert.equal(exp.ctx.storage.db.size,0,"Room digests erased from DO storage at expiry");
assert.equal(exp.ctx.storage.alarm,null,"No billed room metadata or remaining alarm");
const originalClock=Date.now;
Date.now=()=>issued+ROOM_LIFETIME_MS+1000;
try{
 assert.equal((await worker.fetch(req(),exp.env)).status,410,
   "Expired cryptographic capability must never allocate a new room");
}finally{Date.now=originalClock;}
console.log("EXPIRED_ROOM_ALARM_DELETES_METADATA_AND_LINK_CANNOT_REPLAY: PASS");

// A forwarded URL must not admit a third user, even after the accepted guest
// disconnects: a room is single-recipient, never reusable for other peers.
const replacement=environment();
await worker.fetch(req(),replacement.env);
await worker.fetch(req(),replacement.env);
replacement.ctx.sockets[1].close();
const retry=await worker.fetch(req(),replacement.env);
assert.equal(retry.status,409);
assert.equal(replacement.ctx.sockets.length,2);
console.log("ONE_GUEST_ONLY_LINK_FORWARDING_LOCK: PASS");

const declined=environment();
await worker.fetch(req(),declined.env);await worker.fetch(req(),declined.env);
await declined.object.webSocketMessage(declined.ctx.sockets[1],JSON.stringify({v:1,type:"decline"}));
assert.equal(declined.ctx.sockets[0].readyState,3);
assert.equal(declined.ctx.storage.db.get("room:meta").closed,true);
assert.equal((await worker.fetch(req(),declined.env)).status,410);
console.log("EXPLICIT_DECLINE_REVOKES_ROOM: PASS");

const flood=environment();
await worker.fetch(req(),flood.env);
const offender=flood.ctx.sockets[0];
for(let i=0;i<12;i++)
  await flood.object.webSocketMessage(offender,'{"v":1,"type":"not-allowed"}');
assert.equal(offender.deserializeAttachment().count,12,
  "Even rejected messages consume the anti-abuse budget");
await flood.object.webSocketMessage(offender,'{"v":1,"type":"not-allowed"}');
assert.equal(offender.readyState,3);
console.log("INVALID_FRAME_FLOOD_STRICT_SOCKET_LIMIT: PASS");

const blocked=environment();
blocked.env.ROOM_RATE_LIMIT={limit:async()=>({success:false})};
const noBudget=await worker.fetch(req(),blocked.env);
assert.equal(noBudget.status,429);
assert.equal(blocked.ctx.sockets.length,0);
console.log("HANDSHAKE_RATE_LIMIT_BEFORE_ROOM_ALLOCATION: PASS");


const limitMeta=environment();
const injectedQuery=await worker.fetch(new Request(base+roomId+"?token="+token,{
  headers:goodHeaders}),limitMeta.env);
assert.equal(injectedQuery.status,400,"Never accept secrets in URL query");
const giantProtocol=await worker.fetch(req(roomId,{...goodHeaders,
  "Sec-WebSocket-Protocol":"X".repeat(350)}),limitMeta.env);
assert.equal(giantProtocol.status,431);
const noLimiter=environment();
delete noLimiter.env.ROOM_RATE_LIMIT;
assert.equal((await worker.fetch(req(),noLimiter.env)).status,503,
  "Security rate-limiter binding must fail closed");
const weakOwner=environment();
weakOwner.env.PILOT_OWNER_SECRET="commonhumanpassword1234567890";
assert.equal((await worker.fetch(req(),weakOwner.env)).status,503,
  "Low-entropy owner passcode is never accepted");
assert.equal(limitMeta.ctx.sockets.length,0);
console.log("NO_QUERY_SECRET_HEADER_OVERFLOW_OR_MISSING_LIMITER: PASS");

const dropped=environment();
await worker.fetch(req(),dropped.env);
await worker.fetch(req(),dropped.env);
await dropped.object.webSocketClose(dropped.ctx.sockets[1]);
assert.equal(dropped.ctx.storage.db.get("room:meta").closed,true);
assert.equal(dropped.ctx.sockets[0].readyState,3,
  "Unexpected guest disconnect must stop the caller as well");
assert.equal((await worker.fetch(req(),dropped.env)).status,410,
  "Lost socket must never reopen the same invitation");
console.log("DISCONNECT_IMMEDIATE_REVOKE_AND_CLOSE_PEER: PASS");


const emptyAdmission=environment();
delete emptyAdmission.env.ROOM_ADMISSION;
assert.equal((await worker.fetch(req(),emptyAdmission.env)).status,503,
  "No global room cap binding must fail closed, never launch an uncapped service");

function admissionEnvironment(){
 const data=new Map(),store={
   alarm:null,
   getAlarm:async()=>store.alarm,
   setAlarm:async x=>{store.alarm=x;},
   deleteAlarm:async()=>{store.alarm=null;},
   deleteAll:async()=>data.clear(),
   list:async({prefix}={})=>new Map([...data].filter(([key])=>!prefix||key.startsWith(prefix))),
   get:async k=>data.get(k),
   delete:async k=>data.delete(k),
   put:async(k,v)=>data.set(k,v),
   transaction:async fn=>fn({
     list:async({prefix}={})=>new Map([...data].filter(([key])=>!prefix||key.startsWith(prefix))),
     delete:async k=>data.delete(k),
     put:async(k,v)=>data.set(k,v)
   })
 };
 const object=new RoomAdmission({storage:store},{ROOMS_ENABLED:"true"});
 return {object,store,data};
}
async function reserve(object,id,expires){
 return object.fetch(new Request("https://ezero.internal/admit",{
   method:"POST",body:JSON.stringify({id,expires})
 }));
}
const globalCapacity=admissionEnvironment(),time=Date.now();
for(let i=0;i<MAX_PILOT_ACTIVE_ROOMS;i++){
 const id=i.toString(16).padStart(32,"0");
 assert.equal((await reserve(globalCapacity.object,id,time+120000)).status,200);
}
assert.equal(globalCapacity.data.size,MAX_PILOT_ACTIVE_ROOMS);
assert.equal((await reserve(globalCapacity.object,"0".repeat(32),time+120000)).status,200,
  "The second phone joining one room must not consume another global slot");
assert.equal((await reserve(globalCapacity.object,"f".repeat(32),time+120000)).status,429,
  "Ninth concurrent room must be rejected globally");
const originalNow=Date.now;
Date.now=()=>time+120001;
try{await globalCapacity.object.alarm();}
finally{Date.now=originalNow;}
assert.equal(globalCapacity.data.size,0,"Global reservation metadata removed after expiry");
assert.equal(globalCapacity.store.alarm,null);
assert.equal((await reserve(globalCapacity.object,"f".repeat(32),Date.now()+120000)).status,200,
  "Expired room budget is released for the next authorized call");
console.log("STRICT_GLOBAL_EIGHT_ROOMS_NO_QUOTA_FLOOD_AND_AUTO_ERASURE: PASS");
