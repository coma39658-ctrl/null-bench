/* One-shot integration check against the already deployed isolated Cloudflare
 * signaling pilot. No real account tokens, media or private conversation data.
 * Generates fresh random room capabilities on each run.
 */
import assert from "node:assert/strict";
import {randomBytes,createHash} from "node:crypto";
import WebSocket from "ws";

const origin="https://ezero-qr-inbox-test-20261112.onrender.com";
const server="ws://127.0.0.1:8789";
const room=randomBytes(24).toString("base64url");
const hostToken=randomBytes(32).toString("base64url");
const guestToken=randomBytes(32).toString("base64url");
const proof=token=>createHash("sha256").update(token).digest("hex");
const sockets=[];
const url=server+"/v1/rooms/"+room;
function connect(role){
  return new Promise((resolve,reject)=>{
    const ws=new WebSocket(url,{headers:{Origin:origin},
      handshakeTimeout:12000});
    sockets.push(ws);
    const timer=setTimeout(()=>reject(Error("WSS_TIMEOUT_"+role)),15000);
    function fail(err){clearTimeout(timer);reject(err);}
    ws.once("error",fail);
    ws.once("open",()=>{
      const message={t:"hello",role};
      if(role==="host"){
        message.hostProof=proof(hostToken);
        message.guestProof=proof(guestToken);
      }else message.guestProof=proof(guestToken);
      ws.send(JSON.stringify(message));
    });
    function onMessage(buffer){
      const m=JSON.parse(buffer.toString("utf8"));
      if(m.t==="ready"&&m.role===role){
        ws.off("message",onMessage);clearTimeout(timer);
        resolve(ws);
      }else if(m.t==="error"||m.t==="closed"){
        fail(Error("SIGNAL_"+(m.code||m.reason)));
      }
    }
    ws.on("message",onMessage);
  });
}
function onceMatching(ws,predicate,label){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.off("message",onMessage);reject(Error(label+"_TIMEOUT"));},15000);
    function onMessage(buffer){
      const m=JSON.parse(buffer.toString("utf8"));
      if(predicate(m)){
        clearTimeout(timer);ws.off("message",onMessage);resolve(m);
      }else if(m.t==="error"||m.t==="closed"){
        clearTimeout(timer);ws.off("message",onMessage);
        reject(Error(label+"_"+(m.code||m.reason)));
      }
    }
    ws.on("message",onMessage);
  });
}
function signal(type){
  return JSON.stringify({v:1,type,sdp:"v=0\r\n"+"a=fingerprint:sha-256 "+"0".repeat(85)+"\r\n",
    fp:"a".repeat(64),issued:Date.now()});
}
try{
  const host=await connect("host");
  const joined=onceMatching(host,m=>m.t==="peer"&&m.state==="joined","PEER_JOIN");
  const guest=await connect("guest");
  await joined;
  const gotOffer=onceMatching(guest,m=>m.t==="signal"&&m.role==="host","OFFER");
  host.send(JSON.stringify({t:"signal",payload:signal("offer")}));
  const offer=await gotOffer;
  assert.equal(JSON.parse(offer.payload).type,"offer");
  const gotAnswer=onceMatching(host,m=>m.t==="signal"&&m.role==="guest","ANSWER");
  guest.send(JSON.stringify({t:"signal",payload:signal("answer")}));
  const answer=await gotAnswer;
  assert.equal(JSON.parse(answer.payload).type,"answer");
  console.log("QR_INBOX_LOCAL_HOST_GUEST_OFFER_ANSWER: PASS");
}finally{
  sockets.forEach(ws=>{try{ws.close(1000,"finished");}catch(_){}});
}
