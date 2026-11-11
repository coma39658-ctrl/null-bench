"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");
const source=fs.readFileSync("signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js","utf8");
const ORIGIN="https://ezero-secure-app-two-phone-test-20261107.onrender.com";
const target="a".repeat(64);
const url=ORIGIN+"/v1/trusted/"+target;
function load(){
  const code=source.replace('import { DurableObject } from "cloudflare:workers";','')
    .replace("export default {","const handler = {")
    .replace("export class TrustedInbox extends DurableObject {","class TrustedInbox extends DurableObject {")+"\n;globalThis.__test={handler,TrustedInbox};";
  const sandbox={crypto:webcrypto,TextEncoder,URL,Uint8Array,Response,Date,JSON,Array,Object,RegExp,Set,Map,btoa,atob,DurableObject:class{constructor(ctx,env){this.ctx=ctx;this.env=env;}},WebSocketPair:class{},console};
  vm.runInNewContext(code,sandbox,{filename:"trusted-inbox-candidate.js"});
  return sandbox.__test;
}
function req(path=url,origin=ORIGIN,upgrade="websocket",method="GET"){
  return new Request(path,{method,headers:{"Origin":origin,"Upgrade":upgrade}});
}
test("runtime: rejects missing or wrong origin before accessing Durable Object",async()=>{
  const {handler}=load();let touched=0;
  const env={PUBLIC_ORIGIN:ORIGIN,TRUSTED_INBOXES:{getByName(){touched++;throw Error("must not access");}}};
  assert.equal((await handler.fetch(req(url,"https://evil.example"),env)).status,403);
  assert.equal((await handler.fetch(req(url,ORIGIN,"not-websocket"),env)).status,426);
  assert.equal((await handler.fetch(req(ORIGIN+"/v1/trusted/invalid"),env)).status,404);
  assert.equal((await handler.fetch(req(url+"?token=bad"),env)).status,404);
  assert.equal(touched,0);
});
test("runtime: valid route uses isolated per-fingerprint Durable Object",async()=>{
  const {handler}=load();let routed=null;
  const env={PUBLIC_ORIGIN:ORIGIN,TRUSTED_INBOXES:{getByName(fp){routed=fp;return {fetch:async()=>new Response("routed",{status:202})};}}};
  assert.equal((await handler.fetch(req(),env)).status,202);
  assert.equal(routed,target);
});
test("runtime: unavailable binding fails closed",async()=>{
  const {handler}=load();
  assert.equal((await handler.fetch(req(),{PUBLIC_ORIGIN:ORIGIN})).status,503);
});
test("runtime: pending socket cannot authenticate with forged identity",async()=>{
  const {TrustedInbox}=load();
  let closed=null;const sent=[];
  const ws={readyState:1,deserializeAttachment(){return {role:"pending",opened:Date.now(),nonce:"b".repeat(32),target};},close(code,reason){closed={code,reason};},send(m){sent.push(JSON.parse(m));}};
  const ctx={getWebSockets(){return [ws];},storage:{async get(){return [];}}};
  const obj=new TrustedInbox(ctx,{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify({t:"hello",role:"owner",fp:target,pub:"abc",sig:"abc"}));
  assert.equal(closed?.code,1008);
  assert.equal(sent.some(m=>m.t==="ready"),false);
});
test("runtime: unauthenticated socket cannot send call or trust command",async()=>{
  const {TrustedInbox}=load();
  let closed=null;
  const ws={readyState:1,deserializeAttachment(){return null;},close(code){closed=code;}};
  const obj=new TrustedInbox({getWebSockets(){return [ws];}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify({t:"trust",fp:"b".repeat(64)}));
  assert.equal(closed,1008);
});

function b64url(bytes){return Buffer.from(bytes).toString("base64url");}
function fingerprint(bytes){return Buffer.from(bytes).toString("hex");}
async function identity(){
  const keys=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const pub=new Uint8Array(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  const fp=fingerprint(await webcrypto.subtle.digest("SHA-256",pub));
  return {keys,pub,fp};
}
async function signedHello(id,role,recipient,session){
  const payload=["EZERO-TRUSTED-INBOX-1",ORIGIN,recipient,role,id.fp,session.nonce,String(session.opened)].join("\n");
  const sig=await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},id.keys.privateKey,new TextEncoder().encode(payload));
  return {t:"hello",role,fp:id.fp,pub:b64url(id.pub),sig:b64url(new Uint8Array(sig))};
}
function socket(session){
  const sent=[];let closed=null,attachment=session;
  return {readyState:1,sent,get closed(){return closed;},
    deserializeAttachment(){return attachment;},
    serializeAttachment(value){attachment=value;},
    send(data){sent.push(JSON.parse(data));},
    close(code,reason){closed={code,reason};this.readyState=3;}};
}
test("crypto runtime: correctly signed P-256 owner authenticates",async()=>{
  const id=await identity(),session={role:"pending",target:id.fp,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24))),opened:Date.now()};
  const ws=socket(session);
  const obj=new (load().TrustedInbox)({getWebSockets(){return [ws];},storage:{async get(){return [];}}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify(await signedHello(id,"owner",id.fp,session)));
  assert.equal(ws.closed,null);
  assert.equal(ws.deserializeAttachment().role,"owner");
  assert.equal(ws.sent.at(-1)?.t,"ready");
});
test("crypto runtime: modified signature cannot impersonate saved owner",async()=>{
  const id=await identity(),session={role:"pending",target:id.fp,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24))),opened:Date.now()};
  const ws=socket(session),hello=await signedHello(id,"owner",id.fp,session);
  const sig=Buffer.from(hello.sig,"base64url");sig[0]^=1;hello.sig=b64url(sig);
  const obj=new (load().TrustedInbox)({getWebSockets(){return [ws];}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify(hello));
  assert.equal(ws.closed?.code,1008);
  assert.equal(ws.sent.some(m=>m.t==="ready"),false);
});
test("crypto runtime: signature for another challenge is rejected",async()=>{
  const id=await identity(),session={role:"pending",target:id.fp,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24))),opened:Date.now()};
  const ws=socket(session),hello=await signedHello(id,"owner",id.fp,{...session,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24)))});
  const obj=new (load().TrustedInbox)({getWebSockets(){return [ws];}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify(hello));
  assert.equal(ws.closed?.code,1008);
});
test("crypto runtime: untrusted caller with valid signature is denied",async()=>{
  const owner=await identity(),caller=await identity();
  const session={role:"pending",target:owner.fp,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24))),opened:Date.now()};
  const ws=socket(session);
  const obj=new (load().TrustedInbox)({getWebSockets(){return [ws];},storage:{async get(){return [];}}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify(await signedHello(caller,"caller",owner.fp,session)));
  assert.equal(ws.closed?.code,1008);
  assert.equal(ws.sent.some(m=>m.t==="ready"),false);
});

test("delivery runtime: trusted caller forwards once; receipt requires authenticated owner",async()=>{
  const owner=await identity(),caller=await identity();
  const storage=new Map([["trusted",[caller.fp]]]);
  const ownerWs=socket({role:"owner",fp:owner.fp,target:owner.fp});
  const callerWs=socket({role:"caller",fp:caller.fp,target:owner.fp});
  const ctx={getWebSockets(){return [ownerWs,callerWs];},storage:{async get(k){return storage.get(k);},async put(k,v){storage.set(k,v);}}};
  const obj=new (load().TrustedInbox)(ctx,{PUBLIC_ORIGIN:ORIGIN});
  const callId="c".repeat(32);
  const invite=ORIGIN+"/ezero_trusted_friends_staging_20261106.html?mode=audio#room="+
    "a".repeat(32)+"."+"b".repeat(43);
  await obj.webSocketMessage(callerWs,JSON.stringify({t:"call",kind:"audio",callId,invite}));
  assert.equal(ownerWs.sent.at(-1)?.t,"incoming");
  assert.equal(callerWs.sent.some(m=>m.t==="delivered-to-active-tab"),false);
  await obj.webSocketMessage(ownerWs,JSON.stringify({t:"received",from:caller.fp,callId}));
  assert.equal(callerWs.sent.at(-1)?.t,"delivered-to-active-tab");
  assert.equal(callerWs.deserializeAttachment().pendingAck,null);
  await obj.webSocketMessage(ownerWs,JSON.stringify({t:"received",from:caller.fp,callId}));
  assert.equal(ownerWs.sent.at(-1)?.code,"UNKNOWN_RECEIPT");
});
test("delivery runtime: blocked caller and offline owner never get delivery receipt",async()=>{
  const owner=await identity(),caller=await identity();
  const storage=new Map([["trusted",[]]]);
  const callerWs=socket({role:"caller",fp:caller.fp,target:owner.fp});
  const ctx={getWebSockets(){return [callerWs];},storage:{async get(k){return storage.get(k);},async put(k,v){storage.set(k,v);}}};
  const obj=new (load().TrustedInbox)(ctx,{PUBLIC_ORIGIN:ORIGIN});
  const callId="d".repeat(32);
  const invite=ORIGIN+"/ezero_trusted_friends_staging_20261106.html?mode=video#room="+
    "a".repeat(32)+"."+"b".repeat(43);
  await obj.webSocketMessage(callerWs,JSON.stringify({t:"call",kind:"video",callId,invite}));
  assert.equal(callerWs.sent.at(-1)?.code,"RECIPIENT_OFFLINE");
  storage.set("trusted",[caller.fp]);
  await obj.webSocketMessage(callerWs,JSON.stringify({t:"call",kind:"video",callId,invite}));
  assert.equal(callerWs.sent.at(-1)?.code,"RECIPIENT_OFFLINE");
  assert.equal(callerWs.sent.some(m=>m.t==="delivered-to-active-tab"),false);
});
test("delivery runtime: malformed call invitation rejected before owner notification",async()=>{
  const owner=await identity(),caller=await identity();
  const ownerWs=socket({role:"owner",fp:owner.fp,target:owner.fp});
  const callerWs=socket({role:"caller",fp:caller.fp,target:owner.fp});
  const ctx={getWebSockets(){return [ownerWs,callerWs];},storage:{async get(){return [caller.fp];}}};
  const obj=new (load().TrustedInbox)(ctx,{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(callerWs,JSON.stringify({t:"call",kind:"audio",callId:"e".repeat(32),invite:"https://evil.example/"}));
  assert.equal(callerWs.sent.at(-1)?.code,"BAD_INVITE");
  assert.equal(ownerWs.sent.length,0);
});

test("crypto runtime: future-dated authentication challenge fails closed",async()=>{
  const id=await identity();
  const session={role:"pending",target:id.fp,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24))),opened:Date.now()+60000};
  const ws=socket(session);
  const obj=new (load().TrustedInbox)({getWebSockets(){return [ws];},storage:{async get(){return [];}}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify(await signedHello(id,"owner",id.fp,session)));
  assert.equal(ws.closed?.code,1008);
  assert.equal(ws.sent.some(m=>m.t==="ready"),false);
});
test("crypto runtime: expired authentication challenge fails closed",async()=>{
  const id=await identity();
  const session={role:"pending",target:id.fp,nonce:b64url(webcrypto.getRandomValues(new Uint8Array(24))),opened:Date.now()-21000};
  const ws=socket(session);
  const obj=new (load().TrustedInbox)({getWebSockets(){return [ws];},storage:{async get(){return [];}}},{PUBLIC_ORIGIN:ORIGIN});
  await obj.webSocketMessage(ws,JSON.stringify(await signedHello(id,"owner",id.fp,session)));
  assert.equal(ws.closed?.code,1008);
  assert.equal(ws.sent.some(m=>m.t==="ready"),false);
});
