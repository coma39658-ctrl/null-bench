/* E-ZERO PR156 isolated preview LIVE security smoke.
 * Uses synthetic one-time P-256 identities and a fresh DO name per run.
 * Trust is created only for the synthetic caller, then explicitly revoked.
 * No real contacts, production endpoints, media, SDP or message bodies.
 */
import assert from "node:assert/strict";
import {createHash,webcrypto} from "node:crypto";
import WebSocket from "ws";

const ORIGIN="https://ezero-save-friend-pr156-preview-v2.onrender.com";
const ROOT="https://ezero-trusted-inbox-pr156-preview-v2.coma39658.workers.dev";
const FINGERPRINT=/^[a-f0-9]{64}$/;
const TIMEOUT=12000;
const wait=(ms)=>new Promise(resolve=>setTimeout(resolve,ms));

async function httpStatus(path,origin){
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),TIMEOUT);
  try{
    const response=await fetch(ROOT+path,{method:"GET",
      headers:origin?{"Origin":origin}:{},redirect:"manual",signal:controller.signal});
    return response.status;
  }finally{clearTimeout(deadline);}
}
function waitMessage(ws,predicate,label,timeout=TIMEOUT){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(Error("TIMEOUT_"+label)),timeout);
    const onMessage=raw=>{
      let msg;
      try{msg=JSON.parse(raw.toString("utf8"));}catch(_){return;}
      if(!predicate(msg))return;
      finish(null,msg);
    };
    const onClose=(code,reason)=>finish(Error("CLOSED_"+label+"_"+code+"_"+reason));
    const onError=error=>finish(Error("SOCKET_"+label+"_"+error.message));
    function finish(error,value){
      clearTimeout(timer);ws.off("message",onMessage);ws.off("close",onClose);
      ws.off("error",onError);error?reject(error):resolve(value);
    }
    ws.on("message",onMessage);ws.once("close",onClose);ws.once("error",onError);
  });
}
function makeIdentity(){
  const pair=webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  return pair.then(async keys=>{
    const pub=Buffer.from(await webcrypto.subtle.exportKey("spki",keys.publicKey));
    return {keys,pub,fp:createHash("sha256").update(pub).digest("hex")};
  });
}
async function connect(identity,target,role){
  const ws=new WebSocket(ROOT.replace(/^https:/,"wss:")+"/v1/trusted/"+target,
    {origin:ORIGIN,handshakeTimeout:TIMEOUT,perMessageDeflate:false});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error("CONNECT_TIMEOUT_"+role)),TIMEOUT);
    ws.once("open",()=>{clearTimeout(timer);resolve();});
    ws.once("error",error=>{clearTimeout(timer);reject(error);});
  });
  const challenge=await waitMessage(ws,m=>m.t==="challenge","challenge-"+role);
  assert.equal(challenge.target,target);
  assert.match(challenge.nonce,/^[A-Za-z0-9_-]{32}$/);
  assert.equal(challenge.expires-challenge.opened,20000);
  const body=["EZERO-TRUSTED-INBOX-1",ORIGIN,target,role,identity.fp,
    challenge.nonce,String(challenge.opened)].join("\n");
  const sig=Buffer.from(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    identity.keys.privateKey,Buffer.from(body,"utf8"))).toString("base64url");
  const ready=waitMessage(ws,m=>m.t==="ready"||m.t==="error","ready-"+role);
  ws.send(JSON.stringify({t:"hello",role,fp:identity.fp,
    pub:identity.pub.toString("base64url"),sig}));
  const answer=await ready;
  return {ws,answer};
}
function send(ws,value){ws.send(JSON.stringify(value));}
function invite(callId){
  const room=Buffer.alloc(24,0x5a).toString("base64url");
  const secret=Buffer.alloc(32,0x6b).toString("base64url");
  return "https://ezero-save-friend-pr156-preview-v2.onrender.com/ezero_trusted_friends_staging_20261106.html?mode=audio#room="+room+"."+secret;
}
async function expectClose(ws,label){
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{try{ws.terminate();}catch(_){};reject(Error("NOT_CLOSED_"+label));},TIMEOUT);
    ws.once("close",(code,reason)=>{clearTimeout(timer);resolve({code,reason:reason.toString()});});
    ws.once("error",error=>{clearTimeout(timer);reject(error);});
  });
}
async function liveSignedOwnerHandshake(){
  const owner=await makeIdentity(), caller=await makeIdentity();
  assert.match(owner.fp,FINGERPRINT);assert.match(caller.fp,FINGERPRINT);
  assert.notEqual(owner.fp,caller.fp);
  const target=owner.fp;
  const ownerSession=await connect(owner,target,"owner");
  assert.deepEqual(ownerSession.answer,{t:"ready",role:"owner"});
  console.log("PASS: live Cloudflare WSS + ECDSA owner handshake");

  const trustAck=waitMessage(ownerSession.ws,m=>m.t==="trust-updated"||m.t==="error","trust-add");
  send(ownerSession.ws,{t:"trust",fp:caller.fp});
  const trust=await trustAck;
  assert.equal(trust.t,"trust-updated");assert.equal(trust.trusted,true);
  console.log("PASS: synthetic caller trust created on isolated Durable Object");

  const first=await connect(caller,target,"caller");
  assert.deepEqual(first.answer,{t:"ready",role:"caller"});
  const callId="11111111111111111111111111111111";
  const incoming=waitMessage(ownerSession.ws,m=>m.t==="incoming","incoming-call");
  send(first.ws,{t:"call",callId,kind:"audio",invite:invite(callId)});
  const packet=await incoming;
  assert.equal(packet.callId,callId);assert.equal(packet.from,caller.fp);assert.equal(packet.kind,"audio");
  const receipt=waitMessage(first.ws,m=>m.t==="delivered-to-active-tab"||m.t==="error","delivery-receipt");
  send(ownerSession.ws,{t:"received",callId,from:caller.fp});
  const delivered=await receipt;
  assert.deepEqual(delivered,{t:"delivered-to-active-tab",callId});
  console.log("PASS: invitation reached active owner tab and exact receipt returned");
  first.ws.close();await wait(TIMEOUT>1000?250:100);

  const replaySession=await connect(caller,target,"caller");
  assert.equal(replaySession.answer.t,"ready");
  const replay=waitMessage(replaySession.ws,m=>m.t==="error","replay-error");
  send(replaySession.ws,{t:"call",callId,kind:"audio",invite:invite(callId)});
  assert.equal((await replay).code,"REPLAY");
  console.log("PASS: same call ID rejected by live replay window");

  const cooldown=waitMessage(replaySession.ws,m=>m.t==="error","cooldown-error");
  const freshCall="22222222222222222222222222222222";
  send(replaySession.ws,{t:"call",callId:freshCall,kind:"audio",invite:invite(freshCall)});
  assert.equal((await cooldown).code,"COOLDOWN");
  console.log("PASS: fresh call rejected by live 30-second cooldown");

  const revokeAck=waitMessage(ownerSession.ws,m=>m.t==="trust-updated"||m.t==="error","trust-revoke");
  send(ownerSession.ws,{t:"untrust",fp:caller.fp});
  const revoked=await revokeAck;
  assert.equal(revoked.t,"trust-updated");assert.equal(revoked.trusted,false);
  const activeClose=await expectClose(replaySession.ws,"active-caller-revocation");
  assert.equal(activeClose.code,1000);
  console.log("PASS: owner revocation persisted and closed active caller socket");

  const retry=await connect(caller,target,"caller");
  assert.equal(retry.answer.t,"error");
  retry.ws.close();
  console.log("PASS: revoked caller cannot authenticate again");
  ownerSession.ws.close();
  console.log("STAGING_SECURITY_SMOKE_PASS: synthetic trust revoked; no real contact or media data used");
}
async function main(){
  assert.equal(await httpStatus("/",ORIGIN),404,"Unknown route must remain non-discoverable");
  console.log("PASS: unknown URL rejected (404)");
  assert.equal(await httpStatus("/v1/trusted/"+"a".repeat(64),"https://invalid.test"),403,
    "Cross-site Origin must not be authorized");
  console.log("PASS: unauthorized Origin rejected (403)");
  assert.equal(await httpStatus("/v1/trusted/"+"a".repeat(64),ORIGIN),426,
    "Expected WebSocket upgrade, not ordinary REST response");
  console.log("PASS: HTTP transport bypass rejected (426)");
  await liveSignedOwnerHandshake();
}
main().catch(error=>{console.error("STAGING_SECURITY_SMOKE_FAIL",error.stack||error.message);
  process.exitCode=1;});
