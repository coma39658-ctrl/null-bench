"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const server=fs.readFileSync("signaling/cloudflare/src/worker.js","utf8");
const client=fs.readFileSync("js/ezero_secure_connect_auto_signaling_pilot_v0_1.js","utf8");
const config=fs.readFileSync("js/ezero_auto_signaling_config_v0_1.js","utf8");
const html=fs.readFileSync("ezero_secure_connect_communications_v0_3.html","utf8");
const wrangler=JSON.parse(fs.readFileSync("signaling/cloudflare/wrangler.jsonc","utf8"));
assert.match(config,/enabled:false/);
assert.match(config,/websocketOrigin:""/);
assert.match(server,/this\.ctx\.acceptWebSocket\(server\)/);
assert.match(server,/this\.ctx\.storage\.get\("roomAuth"\)/);
assert.match(server,/sameProof\(stored\.hostProof,m\.hostProof\)/);
assert.match(server,/this\.ctx\.storage\.delete\("roomAuth"\)/);
assert.match(server,/Math\.abs\(now-signal\.issued\)>TTL_MS/);
assert.doesNotMatch(server,/getUserMedia|MediaRecorder|sendChat|sendVideo|indexedDB/);
assert.match(client,/EZERO_AUTO_SIGNALING_CONFIG/);
assert.match(client,/getRandomValues/);
assert.match(client,/ezeroAutoAccept/);
assert.match(client,/ezeroAutoDecline/);
assert.match(client,/guidedContinue/);
assert.match(client,/ezero:signal-ready/);
assert.doesNotMatch(client,/getUserMedia\(|eval\(/);
for(const id of ["ezeroAutoPilot","ezeroAutoStart","ezeroAutoShare",
 "ezeroAutoAccept","ezeroAutoDecline","ezeroAutoStun","ezeroAutoStatus"]){
 assert.ok(html.includes('id="'+id+'"'),"Missing "+id);
}
assert.match(html,/id="ezeroAutoPilot"[^>]*hidden/);
assert.equal(wrangler.durable_objects.bindings[0].class_name,"SignalRoom");
assert.equal(wrangler.migrations[0].new_sqlite_classes[0],"SignalRoom");
assert.equal(wrangler.vars.PUBLIC_ORIGIN,"https://coma39658-ctrl.github.io");
class DummyDO{constructor(ctx,env){this.ctx=ctx;this.env=env;}}
class FakeResponse{constructor(body,opts={}){this.status=opts.status||200;this.webSocket=opts.webSocket;this.body=body;}}
class Socket{
 constructor(){this.readyState=1;this.sent=[];this.attachment=null;this.closed=false;}
 send(raw){this.sent.push(JSON.parse(raw));}
 close(code){this.closed=true;this.readyState=3;this.closeCode=code;}
 serializeAttachment(a){this.attachment=a;}
 deserializeAttachment(){return this.attachment;}
}
class Pair{constructor(){this[0]={};this[1]=new Socket();}}
const modified=server.replace(/^import .*cloudflare:workers.*;\s*/m,"")
 .replace("export default {","const worker = {")
 .replace("export class SignalRoom extends DurableObject","class SignalRoom extends DurableObject");
const context=vm.createContext({DurableObject:DummyDO,WebSocketPair:Pair,
 Response:FakeResponse,URL,Date});
vm.runInContext(modified+"\nthis.exported={worker,SignalRoom};",context,{timeout:2500});
const {worker,SignalRoom}=context.exported;
const live=[],meta=new Map();
const ctx={getWebSockets(){return live;},acceptWebSocket(ws){live.push(ws);},
 storage:{async get(k){return meta.get(k);},async put(k,v){meta.set(k,v);},
 async delete(k){meta.delete(k);},async setAlarm(t){ctx.alarm=t;}}};
const env={PUBLIC_ORIGIN:"https://coma39658-ctrl.github.io"};
const room=new SignalRoom(ctx,env);
env.ROOMS={getByName(n){assert.equal(n,"A".repeat(32));return room;}};
const path="https://staging.test/v1/rooms/"+"A".repeat(32);
function req(u=path,origin=env.PUBLIC_ORIGIN,upgrade="websocket"){
 return {method:"GET",url:u,headers:{get(n){
 return n==="Origin"?origin:n==="Upgrade"?upgrade:null;
 }}};
}
const last=()=>live[live.length-1];
async function connect(){
 const response=await worker.fetch(req(),env);
 assert.equal(response.status,101);
 return last();
}
const hostProof="a".repeat(64),guestProof="b".repeat(64);
const hostHello={t:"hello",role:"host",hostProof,guestProof};
const guestHello={t:"hello",role:"guest",guestProof};
const signal=type=>JSON.stringify({v:1,type,sdp:"v=0"+"a".repeat(200),
 fp:"c".repeat(64),issued:Date.now()});
async function run(){
 assert.equal((await worker.fetch(req(path,"https://evil.example"),env)).status,403);
 assert.equal((await worker.fetch(req(path+"?token=x"),env)).status,404);
 assert.equal((await worker.fetch(req(path,env.PUBLIC_ORIGIN,null),env)).status,426);
 const early=await connect();
 await room.webSocketMessage(early,JSON.stringify(guestHello));
 assert.ok(early.closed,"guest must not join before host");
 const host=await connect();
 await room.webSocketMessage(host,JSON.stringify(hostHello));
 assert.ok(host.sent.some(m=>m.t==="ready"));
 assert.equal(meta.size,1);
 const wrong=await connect();
 await room.webSocketMessage(wrong,JSON.stringify({t:"hello",role:"guest",guestProof:"f".repeat(64)}));
 assert.ok(wrong.closed);
 const guest=await connect();
 await room.webSocketMessage(guest,JSON.stringify(guestHello));
 assert.ok(guest.sent.some(m=>m.t==="ready"));
 const offer=signal("offer");
 await room.webSocketMessage(host,JSON.stringify({t:"signal",payload:offer}));
 assert.equal(guest.sent.find(m=>m.t==="signal").payload,offer);
 const answer=signal("answer");
 await room.webSocketMessage(guest,JSON.stringify({t:"signal",payload:answer}));
 assert.equal(host.sent.find(m=>m.t==="signal").payload,answer);
 await room.webSocketMessage(host,JSON.stringify({t:"signal",payload:offer}));
 assert.ok(host.sent.some(m=>m.code==="BAD_SIGNAL"));
 assert.equal(meta.size,1,"SDP must never be retained");
 host.close(1000);
 const intruder=await connect();
 await room.webSocketMessage(intruder,JSON.stringify({t:"hello",role:"host",
 hostProof:"d".repeat(64),guestProof}));
 assert.ok(intruder.closed,"guest link cannot impersonate original host");
 // Pending-auth cleanup alarms must NOT delete a valid ten-minute room.
 await room.alarm();
 assert.equal(meta.size,1,"early auth-timeout alarms must preserve unexpired room auth");
 // The following mutates the test's in-memory clock-backed fixture only.
 // No real room credentials or Cloudflare infrastructure are touched.
 meta.set("roomAuth",{...meta.get("roomAuth"),expires:Date.now()-1});
 await room.alarm();
 assert.equal(meta.size,0,"expired room auth must be deleted");
 console.log("SECURE_TWO_PEER_SIGNALING_ORIGIN_CAPABILITY_TTL_NO_SDP_STORE: PASS");
 console.log("AUTO_SIGNALING_REMAINS_PUBLICLY_DISABLED: PASS");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
