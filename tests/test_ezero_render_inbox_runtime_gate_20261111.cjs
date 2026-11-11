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
