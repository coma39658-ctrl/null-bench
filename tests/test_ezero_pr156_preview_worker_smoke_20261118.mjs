/* Live smoke test for the isolated PR156 signaling Worker.
 * Exercises two authenticated WebSocket peers and one signed SDP relay.
 * No microphone, camera, private account data, or production endpoint.
 */
import assert from "node:assert/strict";
import { randomBytes, createHash } from "node:crypto";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const WebSocket=require(process.env.EZERO_WS_MODULE || "ws");

const ORIGIN="https://ezero-save-friend-pr156-preview-v2.onrender.com";
const BASE="wss://ezero-browser-signaling-pr156-preview-v2.coma39658.workers.dev";
const room=randomBytes(24).toString("base64url");
const hostToken=randomBytes(32).toString("base64url");
const guestToken=randomBytes(32).toString("base64url");
const hash=s=>createHash("sha256").update(s).digest("hex");
const url=BASE+"/v1/rooms/"+room;
const sockets=[];

function message(ws,predicate,label,timeout=10000){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>finish(Error(label+"_TIMEOUT")),timeout);
  function cleanup(){clearTimeout(timer);ws.off("message",onMessage);ws.off("error",onError);ws.off("close",onClose);}
  function finish(err,value){cleanup();err?reject(err):resolve(value);}
  function onMessage(raw){
   let m;try{m=JSON.parse(raw.toString("utf8"));}catch(_){return;}
   if(predicate(m))finish(null,m);
   else if(m.t==="error"||m.t==="closed")finish(Error(label+"_"+(m.code||m.reason||"CLOSED")));
  }
  function onError(e){finish(e);}
  function onClose(code,reason){finish(Error(label+"_CLOSED_"+code+"_"+reason.toString()));}
  ws.on("message",onMessage);ws.once("error",onError);ws.once("close",onClose);
 });
}
async function connect(role){
 const ws=new WebSocket(url,{headers:{Origin:ORIGIN},handshakeTimeout:10000});
 sockets.push(ws);
 await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error("OPEN_TIMEOUT_"+role)),10000);
  ws.once("open",()=>{clearTimeout(timer);resolve();});
  ws.once("error",e=>{clearTimeout(timer);reject(e);});
 });
 const ready=message(ws,m=>m.t==="ready"&&m.role===role,"READY_"+role);
 const hello={t:"hello",role};
 if(role==="host"){hello.hostProof=hash(hostToken);hello.guestProof=hash(guestToken);}
 else hello.guestProof=hash(guestToken);
 ws.send(JSON.stringify(hello));
 await ready;
 return ws;
}
const signal=(type)=>JSON.stringify({
 v:1,type,sdp:"v=0\\r\\na=fingerprint:sha-256 "+"0".repeat(90)+"\\r\\n",
 fp:"a".repeat(64),issued:Date.now()
});
try{
 const health=await fetch(BASE.replace(/^wss:/,"https:")+"/v1/health");
 assert.equal(health.status,200,"Worker health must be HTTP 200");
 const healthBody=await health.json();
 assert.equal(healthBody.purpose,"signaling-only");

 const host=await connect("host");
 const peerJoined=message(host,m=>m.t==="peer"&&m.state==="joined","PEER_JOIN");
 const guest=await connect("guest");
 await peerJoined;

 const offerReceived=message(guest,m=>m.t==="signal"&&m.role==="host","OFFER_RELAY");
 host.send(JSON.stringify({t:"signal",payload:signal("offer")}));
 const offer=await offerReceived;
 assert.equal(JSON.parse(offer.payload).type,"offer");

 const answerReceived=message(host,m=>m.t==="signal"&&m.role==="guest","ANSWER_RELAY");
 guest.send(JSON.stringify({t:"signal",payload:signal("answer")}));
 const answer=await answerReceived;
 assert.equal(JSON.parse(answer.payload).type,"answer");

 console.log("PR156_PREVIEW_WORKER_HEALTH: PASS");
 console.log("PR156_PREVIEW_TWO_PEER_AUTHENTICATION: PASS");
 console.log("PR156_PREVIEW_SIGNED_SDP_RELAY: PASS");
}catch(error){
 console.error(error);
 process.exitCode=1;
}finally{
 for(const ws of sockets){try{ws.close(1000,"smoke-test-finished");}catch(_){}}
}
