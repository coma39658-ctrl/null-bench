/* Isolated E-ZERO foreground Trusted Friends browser client tests.
 * No live worker or media, no changes to deployed QR calling.
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");
const code=fs.readFileSync(
  "js/ezero_trusted_friend_foreground_client_candidate_v0_1.js","utf8");
new vm.Script(code);
const ORIGIN="https://coma39658-ctrl.github.io";
const WSS="wss://example-secure-staging.workers.dev";
const toBase64=buffer=>Buffer.from(buffer).toString("base64url");
const toHex=buffer=>Buffer.from(buffer).toString("hex");
async function makeIdentity(){
  const keys=await webcrypto.subtle.generateKey(
    {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const bytes=Buffer.from(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  return {v:1,keys,spki:toBase64(bytes),
    fingerprint:toHex(await webcrypto.subtle.digest("SHA-256",bytes))};
}

const OWNER=()=>{};
async function tests(){
  const self=await makeIdentity(),other=await makeIdentity();
  const friends=[{fp:other.fingerprint,name:"Trusted Test Friend"}];
  const localStorage={getItem(name){
    return name==="ezero_secure_connect_local_fingerprints_v0_1"?
      JSON.stringify(friends):null;
  }};
  const sockets=[],trusted=new Set(),inboxOwnerByFp=new Map();
  const eventLog=[];
  const delivered=[];
  const timerCallbacks=new Set();
  function later(cb){queueMicrotask(cb);}
  class MockSocket{
    static OPEN=1;
    constructor(url){
      this.url=url;this.readyState=MockSocket.OPEN;
      this.listeners=new Map();
      this.seen=[];this.role=null;
      this.target=url.split("/").at(-1);
      sockets.push(this);
      const bytes=webcrypto.getRandomValues(new Uint8Array(24));
      this.challenge={t:"challenge",nonce:toBase64(bytes),
        target:this.target,opened:Date.now(),expires:Date.now()+20000};
      // the two timestamps must represent the same instant for exactly 20s
      this.challenge.expires=this.challenge.opened+20000;
      later(()=>this.emit("message",{data:JSON.stringify(this.challenge)}));
    }
    addEventListener(type,callback){
      if(!this.listeners.has(type))this.listeners.set(type,[]);
      this.listeners.get(type).push(callback);
    }
    emit(name,data){for(const fn of this.listeners.get(name)||[])fn(data);}
    send(raw){
      const data=JSON.parse(raw);this.seen.push(data);
      later(async()=>{
        if(data.t==="hello"){
          assert.equal(data.t,"hello");
          const rawPub=Buffer.from(data.pub,"base64url");
          const fp=toHex(await webcrypto.subtle.digest("SHA-256",rawPub));
          assert.equal(fp,data.fp);
          const publicKey=await webcrypto.subtle.importKey("spki",rawPub,
            {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
          const body=["EZERO-TRUSTED-INBOX-1",ORIGIN,this.target,data.role,
            data.fp,this.challenge.nonce,String(this.challenge.opened)].join("\n");
          const good=await webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
            publicKey,Buffer.from(data.sig,"base64url"),
            new TextEncoder().encode(body));
          assert.equal(good,true,"the hello must be signed with the saved device key");
          assert.ok(data.role==="owner"||data.role==="caller");
          this.role=data.role;
          if(data.role==="owner")inboxOwnerByFp.set(data.fp,this);
          this.emit("message",{data:JSON.stringify({t:"ready",role:data.role})});
        }else if(data.t==="trust"){
          assert.equal(this.role,"owner");
          trusted.add(data.fp);
          this.emit("message",{data:JSON.stringify({
            t:"trust-updated",fp:data.fp,trusted:true})});
        }else if(data.t==="untrust"){
          assert.equal(this.role,"owner");trusted.delete(data.fp);
          this.emit("message",{data:JSON.stringify({
            t:"trust-updated",fp:data.fp,trusted:false})});
        }else if(data.t==="call"){
          assert.equal(this.role,"caller");
          assert.ok(trusted.has(this.seen[0].fp));
          delivered.push(data);
          const ownerSocket=inboxOwnerByFp.get(this.target);
          assert.ok(ownerSocket);
          ownerSocket.emit("message",{data:JSON.stringify({
            t:"incoming",from:other.fingerprint,kind:data.kind,
            invite:data.invite,callId:data.callId})});
          this.emit("message",{data:JSON.stringify({
            t:"delivered-to-active-tab",callId:data.callId})});
        }
      });
    }
    close(){
      if(this.readyState!==MockSocket.OPEN)return;
      this.readyState=3;this.emit("close",{});
    }
  }
  class CustomEvent{
    constructor(type,opts){this.type=type;this.detail=opts.detail;}
  }
  class EventTarget{
    constructor(){this.handlers=new Map();}
    addEventListener(k,cb){
      if(!this.handlers.has(k))this.handlers.set(k,[]);
      this.handlers.get(k).push(cb);
    }
    removeEventListener(k,cb){
      this.handlers.set(k,(this.handlers.get(k)||[]).filter(x=>x!==cb));
    }
    dispatchEvent(e){
      for(const fn of this.handlers.get(e.type)||[])fn(e);
      return true;
    }
  }
  function createClient(identity,friendEntries){
    const locStorage={getItem:key=>key==="ezero_secure_connect_local_fingerprints_v0_1"?
      JSON.stringify(friendEntries):null};
    const window={
      isSecureContext:true,location:{origin:ORIGIN},
      EZERO_DEVICE_IDENTITY_STORE:{read:async()=>identity},
      EZERO_TRUSTED_INBOX_CONFIG:{enabled:true,websocketOrigin:WSS}
    };
    const context=vm.createContext({
      window,location:{origin:ORIGIN},localStorage:locStorage,
      crypto:webcrypto,WebSocket:MockSocket,TextEncoder,URL,Uint8Array,
      btoa,EventTarget,CustomEvent,setTimeout,clearTimeout,Date
    });
    vm.runInContext(code,context);
    return window.EZERO_TRUSTED_FRIEND_LAB;
  }
  const recipient=createClient(self,[{fp:other.fingerprint,name:"Trusted Test Friend"}]);
  assert.equal(recipient.enabled(),true);
  assert.equal(sockets.length,0,"No implicit calls or background socket");
  let incoming=null,trustReply=null;
  recipient.on("incoming",e=>{incoming=e.detail;eventLog.push("incoming");});
  recipient.on("trust-updated",e=>{trustReply=e.detail;});
  await recipient.openOwnerInbox();
  assert.equal(sockets.length,1);
  await recipient.setFriendTrust(other.fingerprint,true);
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(trustReply.trusted,true);
  assert.equal(trusted.has(other.fingerprint),true);
  const caller=createClient(other,[{fp:self.fingerprint,name:"Test Recipient"}]);
  const invalid=ORIGIN+"/null-bench/ezero_trusted_friends_staging_20261106.html?mode=audio#room="+
    "A".repeat(32)+"."+"B".repeat(43);
  assert.equal(caller.safeInvite(invalid,"audio"),true);
  assert.equal(caller.safeInvite("https://evil.test"+invalid.slice(ORIGIN.length),"audio"),false);
  await assert.rejects(caller.callSavedFriend(self.fingerprint,"audio",
    "https://evil.test/invalid"),/FRESH_SIGNED_QR_INVITE_REQUIRED/);
  await assert.rejects(caller.callSavedFriend(other.fingerprint,"audio",invalid),
    /FRIEND_NOT_VERIFIED_LOCALLY|SELF_CALL/);
  const first=await caller.callSavedFriend(self.fingerprint,"audio",invalid);
  assert.match(first,/^[a-f0-9]{32}$/);
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(eventLog.includes("incoming"),true);
  assert.equal(incoming.from,other.fingerprint);
  assert.equal(incoming.name,"Trusted Test Friend");
  assert.equal(incoming.invite,invalid);
  assert.equal(delivered.length,1);
  assert.equal(sockets.length,2);
  await recipient.setFriendTrust(other.fingerprint,false);
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(trusted.size,0);
  recipient.closeOwnerInbox();
  assert.equal(sockets[0].readyState,3);
  assert.doesNotMatch(code,/getUserMedia\s*\(|window\.location\.assign\s*\(|eval\s*\(/);
  console.log("PASS: no background calls; signed saved-key challenge; trust opt-in; valid invite routing; revoke; no automatic media");
}
tests().catch(e=>{console.error(e);process.exitCode=1;});
