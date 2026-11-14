"use strict";
/* E-ZERO: real LOCAL workerd + Durable Object signed Trusted Inbox e2e.
 * Never connects to public Cloudflare, Render, or real user devices.
 * Requires a temporary 'wrangler dev --local' bound to 127.0.0.1:8788.
 */
const assert=require("node:assert/strict");
const {webcrypto}=require("node:crypto");
const ORIGIN="https://ezero-secure-app-two-phone-test-20261107.onrender.com";
const BASE="http://127.0.0.1:8788/v1/trusted/";
const WS_BASE=BASE.replace(/^http:/,"ws:");
const b64=x=>Buffer.from(x).toString("base64url");
const hex=x=>Buffer.from(x).toString("hex");
const room=()=>Buffer.from(webcrypto.getRandomValues(new Uint8Array(24))).toString("base64url");
async function identity(){
  const keys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const pub=new Uint8Array(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  return {key:keys.privateKey,pub:b64(pub),fp:hex(await webcrypto.subtle.digest("SHA-256",pub))};
}
const sockets=[];
function makeSocket(target){
  const ws=new WebSocket(WS_BASE+target,{headers:{Origin:ORIGIN}});
  sockets.push(ws);
  const messages=[],waiters=[];
  function push(item){if(waiters.length)waiters.shift()(item);else messages.push(item);}
  ws.addEventListener("message",e=>{
    try{push({type:"message",data:JSON.parse(e.data)});}
    catch(_){push({type:"error",message:"INVALID_SERVER_JSON"});}
  });
  ws.addEventListener("close",e=>push({type:"close",code:e.code}));
  ws.addEventListener("error",()=>push({type:"error",message:"SOCKET_ERROR"}));
  async function next(ms=5000){
    if(messages.length)return messages.shift();
    return new Promise((resolve,reject)=>{
      let pending=true;
      const onPacket=packet=>{if(!pending)return;pending=false;clearTimeout(timer);resolve(packet);};
      const timer=setTimeout(()=>{
        if(!pending)return;pending=false;
        const i=waiters.indexOf(onPacket);if(i>=0)waiters.splice(i,1);
        reject(Error("MESSAGE_TIMEOUT"));
      },ms);
      waiters.push(onPacket);
    });
  }
  return {ws,next};
}
async function open(target){
  const connection=makeSocket(target);
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("OPEN_TIMEOUT")),6000);
    connection.ws.addEventListener("open",()=>{clearTimeout(timer);resolve();},{once:true});
    connection.ws.addEventListener("error",()=>{clearTimeout(timer);reject(Error("OPEN_FAILED"));},{once:true});
  });
  return connection;
}
async function signedConnect(target,identity,role,expectReady=true){
  const x=await open(target);
  const challenge=await x.next();
  assert.equal(challenge.type,"message");
  assert.equal(challenge.data.t,"challenge");
  assert.equal(challenge.data.target,target);
  assert.equal(challenge.data.expires-challenge.data.opened,20000);
  const payload=["EZERO-TRUSTED-INBOX-1",ORIGIN,target,role,identity.fp,
    challenge.data.nonce,String(challenge.data.opened)].join("\n");
  const sig=await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    identity.key,new TextEncoder().encode(payload));
  x.ws.send(JSON.stringify({t:"hello",role,fp:identity.fp,pub:identity.pub,sig:b64(sig)}));
  const result=await x.next();
  if(expectReady){
    assert.equal(result.type,"message");
    assert.deepEqual(result.data,{t:"ready",role});
  }else{
    assert.equal(result.type,"close");
    assert.equal(result.code,1008);
  }
  return x;
}
const packet=async (conn,expected)=>{
  const p=await conn.next();
  assert.equal(p.type,"message",JSON.stringify(p));
  assert.equal(p.data.t,expected,JSON.stringify(p.data));
  return p.data;
};
async function httpGate(){
  const fp="a".repeat(64),url=BASE+fp;
  const status=async (path,headers={})=>(await fetch(path,{headers,redirect:"manual"})).status;
  assert.equal(await status(BASE+"bad",{Origin:ORIGIN}),404);
  assert.equal(await status(url,{Origin:"https://wrong.example"}),403);
  assert.equal(await status(url,{Origin:ORIGIN}),426);
  assert.equal(await status(url+"?secret=unexpected",{Origin:ORIGIN}),404);
  console.log("LOCAL_WORKER_ORIGIN_ROUTE_UPGRADE_GATES: PASS");
}
(async()=>{
  await httpGate();
  const owner=await identity(),caller=await identity(),other=await identity();
  const own=await signedConnect(owner.fp,owner,"owner");
  await signedConnect(owner.fp,caller,"caller",false);
  console.log("LOCAL_WORKER_SIGNED_UNTRUSTED_CALLER_REJECTED: PASS");
  own.ws.send(JSON.stringify({t:"trust",fp:caller.fp}));
  assert.deepEqual(await packet(own,"trust-updated"),{t:"trust-updated",fp:caller.fp,trusted:true});
  const calling=await signedConnect(owner.fp,caller,"caller");
  const callId="c".repeat(32);
  const invite=ORIGIN+"/ezero_trusted_friends_staging_20261106.html?mode=video#room="+room()+"."+b64(webcrypto.getRandomValues(new Uint8Array(32)));
  assert.match(invite,/mode=video#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/);
  calling.ws.send(JSON.stringify({t:"call",callId,kind:"video",invite}));
  const got=await packet(own,"incoming");
  assert.equal(got.from,caller.fp);assert.equal(got.callId,callId);
  assert.equal(got.kind,"video");assert.equal(got.invite,invite);
  await assert.rejects(calling.next(350),/MESSAGE_TIMEOUT/,
    "Server must not claim UI delivery without owner-browser receipt");
  own.ws.send(JSON.stringify({t:"received",from:caller.fp,callId:"d".repeat(32)}));
  assert.equal((await packet(own,"error")).code,"UNKNOWN_RECEIPT");
  await assert.rejects(calling.next(350),/MESSAGE_TIMEOUT/);
  own.ws.send(JSON.stringify({t:"received",from:caller.fp,callId}));
  assert.deepEqual(await packet(calling,"delivered-to-active-tab"),{t:"delivered-to-active-tab",callId});
  own.ws.send(JSON.stringify({t:"received",from:caller.fp,callId}));
  assert.equal((await packet(own,"error")).code,"UNKNOWN_RECEIPT");
  console.log("LOCAL_WORKER_SIGNED_CALL_DELIVERED_ONLY_AFTER_VALID_RECEIPT: PASS");
  calling.ws.send(JSON.stringify({t:"call",callId:"e".repeat(32),kind:"video",invite}));
  assert.equal((await packet(calling,"error")).code,"ONE_CALL_PER_SOCKET");
  const retry=await signedConnect(owner.fp,caller,"caller");
  retry.ws.send(JSON.stringify({t:"call",callId,kind:"video",invite}));
  assert.equal((await packet(retry,"error")).code,"REPLAY");
  retry.ws.close();
  const tooSoon=await signedConnect(owner.fp,caller,"caller");
  tooSoon.ws.send(JSON.stringify({t:"call",callId:"f".repeat(32),kind:"video",invite}));
  assert.equal((await packet(tooSoon,"error")).code,"COOLDOWN");
  console.log("LOCAL_WORKER_CALL_REPLAY_COOLDOWN_SINGLE_USE: PASS");
  const own2=await signedConnect(other.fp,other,"owner");
  await signedConnect(other.fp,caller,"caller",false);
  await assert.rejects(own2.next(350),/MESSAGE_TIMEOUT/);
  console.log("LOCAL_WORKER_INBOXES_ISOLATED_PER_RECIPIENT: PASS");
  own.ws.send(JSON.stringify({t:"untrust",fp:caller.fp}));
  assert.deepEqual(await packet(own,"trust-updated"),{t:"trust-updated",fp:caller.fp,trusted:false});
  const revoked=await calling.next();
  assert.equal(revoked.type,"close");
  assert.equal(revoked.code,1000);
  await signedConnect(owner.fp,caller,"caller",false);
  console.log("LOCAL_WORKER_REVOKE_DISCONNECT_AND_DENY: PASS");
  console.log("TRUSTED_INBOX_LOCAL_WORKER_E2E_ALL_PASS (NOT LIVE CLOUD OR REAL PHONE)");
})().catch(e=>{console.error("TRUSTED_INBOX_LOCAL_WORKER_E2E_FAIL",e.message);process.exitCode=1;})
.finally(()=>{for(const ws of sockets)try{ws.close();}catch(_){}});
