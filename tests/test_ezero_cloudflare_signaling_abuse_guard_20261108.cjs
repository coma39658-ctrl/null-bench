"use strict";
/* Cloudflare signaling worker threat-model regression: in-memory Durable Object
 * harness, NO Internet, no real room, no tokens, no Cloudflare deployment.
 */
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const source=fs.readFileSync("signaling/cloudflare/src/worker.js","utf8");
assert.match(source,/MESSAGE_WINDOW_MS/);
assert.match(source,/HELLO_TIMEOUT_MS/);
assert.match(source,/MAX_MESSAGES_PER_WINDOW/);
const baseline=Date.now();
let now=baseline;
class SimulatedDate extends Date {static now(){return now;}}
class DurableObjectMock {constructor(ctx,env){this.ctx=ctx;this.env=env;}}
class FakeResponse {
 constructor(body,o={}){this.body=body;this.status=o.status||200;this.webSocket=o.webSocket;}
}
class FakeSocket {
 constructor(){this.readyState=1;this.sent=[];this.closed=false;this.serialized=null;}
 send(str){this.sent.push(JSON.parse(str));}
 close(code,reason){this.closed=true;this.readyState=3;this.code=code;this.reason=reason;}
 serializeAttachment(a){this.serialized=structuredClone(a);}
 deserializeAttachment(){return this.serialized;}
}
class FakePair {
 constructor(){this[0]={};this[1]=new FakeSocket();}
}
const changed=source.replace(/^import .*cloudflare:workers.*;\s*/m,"")
 .replace("export default {","const edgeWorker = {")
 .replace("export class SignalRoom extends DurableObject","class SignalRoom extends DurableObject");
const context=vm.createContext({DurableObject:DurableObjectMock,WebSocketPair:FakePair,
 Response:FakeResponse,Date:SimulatedDate,URL,console});
vm.runInContext(changed+"\nthis.exposed={edgeWorker,SignalRoom};",context,{timeout:2500});
const {edgeWorker,SignalRoom}=context.exposed;
const origin="https://ezero-secure-app-two-phone-test-20261107.onrender.com";
const id="Z".repeat(32);
const path="https://worker.example/v1/rooms/"+id;
const connections=[],store=new Map(),alarms=[];
const state={
 getWebSockets:()=>connections,
 acceptWebSocket:ws=>connections.push(ws),
 storage:{
  async get(k){return store.get(k);},
  async put(k,v){store.set(k,structuredClone(v));},
  async delete(k){store.delete(k);},
  async setAlarm(value){alarms.push(value);}
 }
};
const env={PUBLIC_ORIGIN:origin,ROOMS:{
 getByName:name=>{assert.equal(name,id);return room;}
}};
const room=new SignalRoom(state,env);
const req=(pathArg=path,headersArg={})=>({
 url:pathArg,method:headersArg.method||"GET",
 headers:{get:k=>k==="Origin"?(headersArg.origin??origin):
   k==="Upgrade"?(headersArg.upgrade??"websocket"):null}
});
const sockets=()=>connections.filter(ws=>ws.readyState===1);
const last=()=>connections.at(-1);
async function upgrade(){
 const res=await edgeWorker.fetch(req(),env);
 assert.equal(res.status,101,"Expected isolated, authenticated-origin test socket");
 return last();
}
const hostProof="a".repeat(64),guestProof="b".repeat(64);
const hostHello={t:"hello",role:"host",hostProof,guestProof};
const guestHello={t:"hello",role:"guest",guestProof};
async function run(){
 assert.equal((await edgeWorker.fetch(req(path,{origin:"https://evil.example"}),env)).status,403);
 assert.equal((await edgeWorker.fetch(req(path+"?access="+("q".repeat(12))),env)).status,404);
 assert.equal((await edgeWorker.fetch(req(path,{upgrade:""}),env)).status,426);
 console.log("SIGNAL_ORIGIN_QUERY_TOKENS_UPGRADE_REJECTED: PASS");

 // Inactive anonymous handshake consumes one of four bounded sockets only
 // until its 20-second alarm. Never allow an idle anonymous client to starve
 // a real room indefinitely.
 for(let n=0;n<4;n++)await upgrade();
 assert.equal(sockets().length,4);
 assert.equal((await edgeWorker.fetch(req(),env)).status,429);
 assert.equal(alarms.at(-1),baseline+20000);
 now+=20001;
 await room.alarm();
 assert.equal(sockets().length,0,"Authentication deadline must release all pending sockets");
 assert.equal(store.size,0);
 await upgrade();
 console.log("SIGNAL_PENDING_HANDSHAKES_CAP_AND_20S_EXPIRY: PASS");

 // Host's ten-minute room auth must survive any earlier pending-auth alarm.
 const host=last();
 await room.webSocketMessage(host,JSON.stringify(hostHello));
 assert.equal(host.deserializeAttachment().role,"host");
 const expiry=store.get("roomAuth")?.expires;
 assert.ok(expiry>now+9*60*1000);
 const anonymous=await upgrade();
 now+=20001;
 await room.alarm();
 assert.equal(anonymous.closed,true);
 assert.equal(host.closed,false,"Pending cleanup must NEVER hang up verified caller");
 assert.equal(store.get("roomAuth")?.expires,expiry,
   "Pending alarm must preserve original ten-minute room capability");
 console.log("SIGNAL_EARLY_ALARM_PRESERVES_AUTHENTICATED_CALL: PASS");

 // Wrong proof and unauthenticated guest are never admitted.
 const wrong=await upgrade();
 await room.webSocketMessage(wrong,JSON.stringify({...guestHello,guestProof:"f".repeat(64)}));
 assert.equal(wrong.closed,true);
 // A dropped browser connection BEFORE its signed SDP answer can retry:
 // one-time consumption must never break an interrupted first approval.
 const earlyGuest=await upgrade();
 await room.webSocketMessage(earlyGuest,JSON.stringify(guestHello));
 assert.equal(earlyGuest.deserializeAttachment().role,"guest");
 earlyGuest.close(1000,"network-drop");
 assert.notEqual(store.get("roomAuth")?.guestConsumed,true);
 const guest=await upgrade();
 await room.webSocketMessage(guest,JSON.stringify(guestHello));
 assert.equal(guest.deserializeAttachment().role,"guest");
 console.log("SIGNAL_DROPPED_GUEST_RETRY_BEFORE_SDP_ANSWER: PASS");

 // Signed SDP schema remains forwarded one time only; transport never
 // archives SDP, media, private messages or credentials.
 const signal=type=>JSON.stringify({v:1,type,sdp:"v=0"+"a".repeat(230),
   fp:"c".repeat(64),issued:now});
 const offer=signal("offer"),answer=signal("answer");
 await room.webSocketMessage(host,JSON.stringify({t:"signal",payload:offer}));
 assert.ok(guest.sent.some(x=>x.t==="signal"&&x.payload===offer));
 await room.webSocketMessage(guest,JSON.stringify({t:"signal",payload:answer}));
 assert.ok(host.sent.some(x=>x.t==="signal"&&x.payload===answer));
 assert.equal(store.get("roomAuth")?.guestConsumed,true,
   "First validated answer must consume the guest's short-lived QR capability");
 assert.deepEqual([...store.keys()],["roomAuth"],"Only token proofs and TTL may persist");
 await room.webSocketMessage(host,JSON.stringify({t:"signal",payload:offer}));
 assert.ok(host.sent.some(x=>x.code==="BAD_SIGNAL"),
   "Repeated signed offer must not be relayed");
 console.log("SIGNAL_EXISTING_SIGNED_SDP_ONE_SHOT_REGRESSION: PASS");

 // Every app message, even invalid JSON and ping spam, must count toward
 // the hibernation-safe attachment rate cap. No global in-memory counter.
 for(let i=0;i<61;i++){
   if(guest.readyState!==1)break;
   await room.webSocketMessage(guest,JSON.stringify({t:"ping"}));
 }
 assert.equal(guest.closed,true,"Flood must close abusive member");
 assert.ok(guest.sent.some(x=>x.code==="RATE_LIMIT"));
 assert.equal(host.closed,false,"Bad guest must not terminate valid caller");
 assert.equal(guest.deserializeAttachment().windowCount,60);
 console.log("SIGNAL_PING_FLOOD_BOUNDED_WITH_PERSISTENT_SOCKET_ATTACHMENT: PASS");

 // A QR invite that has ALREADY resulted in a signed answer is single-use.
 // Closing the first socket must never permit the same invitation to join
 // another session and receive a second user's SDP.
 const replay=await upgrade();
 await room.webSocketMessage(replay,JSON.stringify(guestHello));
 assert.equal(replay.closed,true,"Used QR token must not authenticate a second guest");
 assert.equal(replay.sent.filter(x=>x.t==="ready").length,0);
 console.log("SIGNAL_COMPLETED_INVITE_REPLAY_REJECTED: PASS");

 // Invalid JSON also has a bounded budget on an already-authenticated socket.
 for(let i=0;i<61;i++){
   if(host.readyState!==1)break;
   await room.webSocketMessage(host,"not-json");
 }
 assert.equal(host.closed,true);
 assert.ok(host.sent.some(x=>x.code==="RATE_LIMIT"));
 console.log("SIGNAL_INVALID_JSON_FLOOD_BOUNDED: PASS");

 // Room storage expires only after the ten-minute deadline, is idempotent,
 // and never retains the signed SDP payload.
 now=expiry+1;
 await room.alarm();
 assert.equal(store.has("roomAuth"),false);
 await room.alarm();
 assert.equal(store.size,0);
 console.log("SIGNAL_EXPIRE_DELETE_AND_REPEAT_ALARM_IDEMPOTENT: PASS");

 const tooLarge=await upgrade();
 await room.webSocketMessage(tooLarge,"q".repeat(145500));
 assert.equal(tooLarge.closed,true);
 console.log("SIGNAL_OVERSIZE_FRAME_REJECTED: PASS");
 console.log("E_ZERO_ISOLATED_SIGNALING_ABUSE_DEFENSE: PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
