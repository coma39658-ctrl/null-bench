/* E-ZERO isolated trusted inbox test. No deployment, tokens or public calls.
 * Run from repository root: node tests/test_ezero_trusted_inbox_candidate_20261106.cjs
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");
const path="signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js";
const source=fs.readFileSync(path,"utf8");
const workerSource=source
  .replace(/^import \{ DurableObject \} from "cloudflare:workers";/m,"")
  .replace("export default {","const worker = {")
  .replace("export class TrustedInbox extends DurableObject",
    "class TrustedInbox extends DurableObject");
assert.doesNotMatch(source,/getUserMedia|MediaRecorder|eval\(|localStorage/);
assert.doesNotMatch(source,/console\.log|console\.error|fetch\s*\([^)]*invite/);
assert.match(source,/getWebSockets/);
assert.match(source,/serializeAttachment/);
class FakeResponse{
  constructor(body,opts={}){
    this.body=body;this.status=opts.status||200;this.webSocket=opts.webSocket||null;
  }
}
class FakeSocket{
  constructor(){this.readyState=1;this.sent=[];this.attached=null;}
  send(raw){this.sent.push(JSON.parse(raw));}
  serializeAttachment(v){this.attached=v;}
  deserializeAttachment(){return this.attached;}
  close(code,reason){this.readyState=3;this.closeCode=code;this.reason=reason;}
}
class Pair{constructor(){this[0]={};this[1]=new FakeSocket();}}
class BaseDO{constructor(ctx,env){this.ctx=ctx;this.env=env;}}
const globals={DurableObject:BaseDO,WebSocketPair:Pair,Response:FakeResponse,
  URL,crypto:webcrypto,atob,btoa,TextEncoder,Uint8Array,Date,String,Array};
const context=vm.createContext(globals);
vm.runInContext(workerSource+"\nthis.__t={worker,TrustedInbox};",context,{timeout:5000});
const {worker,TrustedInbox}=context.__t;
const registry=new Map(),connected=[],data=new Map(),origin="https://coma39658-ctrl.github.io";
const ctx={
  getWebSockets(){return connected;},
  acceptWebSocket(s){connected.push(s);},
  storage:{
    async get(k){return data.get(k);},
    async put(k,v){data.set(k,v);},
    async delete(k){data.delete(k);}
  }
};
const env={PUBLIC_ORIGIN:origin};
const inbox=new TrustedInbox(ctx,env);
env.TRUSTED_INBOXES={getByName:fp=>({fetch:request=>inbox.fetch(request)})};
const bytesToBase64url=buf=>Buffer.from(buf).toString("base64url");
const hex=buf=>Buffer.from(buf).toString("hex");
async function identity(){
  const keys=await webcrypto.subtle.generateKey(
    {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const spki=Buffer.from(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  return {keys,pub:spki.toString("base64url"),
    fp:hex(await webcrypto.subtle.digest("SHA-256",spki))};
}
function req(target,{urlSuffix="",originHeader=origin,upgrade="websocket"}={}){
  const url="https://unit.test/v1/trusted/"+target+urlSuffix;
  return {method:"GET",url,headers:{get:k=>
    k==="Origin"?originHeader:k==="Upgrade"?upgrade:null}};
}
const last=()=>connected.at(-1);
async function connect(target){
  const reply=await worker.fetch(req(target),env);
  assert.equal(reply.status,101);
  const socket=last();
  assert.equal(socket.sent[0].t,"challenge");
  assert.equal(socket.sent[0].target,target);
  return socket;
}
async function hello(ws,id,role,override={}){
  const a=ws.deserializeAttachment();
  const message=["EZERO-TRUSTED-INBOX-1",origin,a.target,role,id.fp,
    a.nonce,String(a.opened)].join("\n");
  const sig=await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    id.keys.privateKey,new TextEncoder().encode(message));
  const body={t:"hello",role,fp:id.fp,pub:id.pub,sig:bytesToBase64url(sig),...override};
  await inbox.webSocketMessage(ws,JSON.stringify(body));
}
const callId=()=>Buffer.from(webcrypto.getRandomValues(new Uint8Array(16))).toString("hex");
function link(){
  return origin+"/null-bench/ezero_trusted_friends_staging_20261106.html?mode=audio#room="+
    "A".repeat(32)+"."+"B".repeat(43);
}
async function run(){
  const owner=await identity(),friend=await identity(),stranger=await identity();
  assert.notEqual(owner.fp,friend.fp);
  assert.equal((await worker.fetch(req(owner.fp,{urlSuffix:"?key=leak"}),env)).status,404);
  assert.equal((await worker.fetch(req(owner.fp,{originHeader:"https://bad.test"}),env)).status,403);
  assert.equal((await worker.fetch(req(owner.fp,{upgrade:""}),env)).status,426);
  const fakeOwner=await connect(owner.fp);
  await hello(fakeOwner,stranger,"owner");
  assert.equal(fakeOwner.readyState,3,"owner spoof must fail");
  const socketOwner=await connect(owner.fp);
  await hello(socketOwner,owner,"owner");
  assert.ok(socketOwner.sent.some(x=>x.t==="ready"&&x.role==="owner"));
  const stolen=await connect(owner.fp);
  await hello(stolen,friend,"caller",{sig:"A".repeat(86)});
  assert.equal(stolen.readyState,3,"bad challenge signature refused");
  const unauthorized=await connect(owner.fp);
  await hello(unauthorized,stranger,"caller");
  assert.equal(unauthorized.readyState,3,"untrusted identity refused");
  await inbox.webSocketMessage(socketOwner,JSON.stringify({t:"trust",fp:friend.fp}));
  assert.ok(socketOwner.sent.some(x=>x.t==="trust-updated"&&x.trusted));
  assert.deepEqual(Array.from(await inbox.trusted()),[friend.fp]);
  const alice=await connect(owner.fp);
  await hello(alice,friend,"caller");
  assert.ok(alice.sent.some(x=>x.t==="ready"&&x.role==="caller"));
  await inbox.webSocketMessage(alice,JSON.stringify({
    t:"call",callId:callId(),kind:"audio",
    invite:"https://evil.test/null-bench/ezero_trusted_friends_staging_20261106.html?mode=audio#room="+
      "A".repeat(32)+"."+"B".repeat(43)
  }));
  assert.ok(alice.sent.some(x=>x.code==="BAD_INVITE"));
  assert.equal(socketOwner.sent.filter(x=>x.t==="incoming").length,0);
  const first=callId(),url=link();
  await inbox.webSocketMessage(alice,JSON.stringify({
    t:"call",callId:first,kind:"audio",invite:url
  }));
  const received=socketOwner.sent.filter(x=>x.t==="incoming");
  assert.equal(received.length,1);
  assert.equal(received[0].from,friend.fp);
  assert.equal(received[0].callId,first);
  assert.equal(received[0].invite,url);
  assert.ok(alice.sent.some(x=>x.t==="delivered-to-active-tab"));
  assert.ok(!JSON.stringify([...data.values()]).includes(url),
    "Do not store call invites server-side");
  assert.ok(!JSON.stringify([...data.values()]).includes("v=0"),
    "No SDP persistence");
  await inbox.webSocketMessage(alice,JSON.stringify({
    t:"call",callId:callId(),kind:"audio",invite:url
  }));
  assert.ok(alice.sent.some(x=>x.code==="ONE_CALL_PER_SOCKET"));
  const aliceAgain=await connect(owner.fp);
  await hello(aliceAgain,friend,"caller");
  await inbox.webSocketMessage(aliceAgain,JSON.stringify({
    t:"call",callId:first,kind:"audio",invite:url
  }));
  assert.ok(aliceAgain.sent.some(x=>x.code==="REPLAY"));
  const next=callId();
  await inbox.webSocketMessage(aliceAgain,JSON.stringify({
    t:"call",callId:next,kind:"audio",invite:url
  }));
  assert.ok(aliceAgain.sent.some(x=>x.code==="COOLDOWN"));
  data.set("recent:"+friend.fp,{callId:first,nextAt:Date.now()-1,
    expires:Date.now()+600000});
  await inbox.webSocketMessage(aliceAgain,JSON.stringify({
    t:"call",callId:next,kind:"audio",invite:url
  }));
  assert.equal(socketOwner.sent.filter(x=>x.t==="incoming").length,2);
  await inbox.webSocketMessage(socketOwner,
    JSON.stringify({t:"untrust",fp:friend.fp}));
  assert.equal(alice.readyState,3,"revoke closes earlier caller");
  assert.equal(aliceAgain.readyState,3,"revoke closes active caller");
  assert.equal((await inbox.trusted()).length,0);
  assert.equal(socketOwner.sent.at(-1).trusted,false);
  assert.ok(!JSON.stringify([...data.values()]).includes("privateKey"));
  assert.ok(source.includes("RECIPIENT_OFFLINE"));
  // Seven abandoned unauthenticated clients + the real owner reach capacity.
  // Expired challenges must not hold the recipient offline indefinitely.
  const abandoned=[];
  for(let i=0;i<7;i++)abandoned.push(await connect(owner.fp));
  assert.equal((await worker.fetch(req(owner.fp),env)).status,429,
    "unexpired pending socket limit must be enforced");
  for(const sock of abandoned){
    const a=sock.deserializeAttachment();
    sock.serializeAttachment({...a,opened:Date.now()-21000});
  }
  const restored=await worker.fetch(req(owner.fp),env);
  assert.equal(restored.status,101,
    "expired unauthenticated challenges must release connection slots");
  assert.ok(abandoned.every(ws=>ws.readyState===3));
  assert.ok(socketOwner.readyState===1,"authenticated recipient remains connected");
  console.log("PASS: signed P-256 challenge, owner-only trust, privacy, one-call delivery, cooldown, replay, revocation");
  console.log("PASS: stale pending WebSockets cannot exhaust all slots forever");
}
run().catch(err=>{console.error(err);process.exitCode=1;});
