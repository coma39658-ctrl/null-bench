/* E-ZERO saved-friend pilot: offline syntax, consent, privacy and persistence gates.
 * Run: node tests/test_ezero_saved_friend_local_20261106.cjs
 */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const crypto=require("node:crypto").webcrypto;
const root=path.resolve(__dirname,"..");
const load=name=>fs.readFileSync(path.join(root,name),"utf8");
const engine=load("js/ezero_secure_connect_live_p2p_v0_1.js");
const people=load("js/ezero_secure_connect_people_v0_1.js");
const identity=load("js/ezero_secure_connect_device_identity_v0_1.js");
const html=load("ezero_secure_connect_one_request_lab_20261106.html");
for(const [name,body] of [["engine",engine],["people",people],["identity",identity]]){
  assert.doesNotThrow(()=>new Function(body),name+" must parse as valid JS");
}
assert.match(html,/id="ezeroFriendSavePanel"/);
assert.match(html,/id="ezeroSaveConnectedFriend"[^>]+disabled/);
assert.match(html,/ezero_secure_connect_device_identity_v0_1\.js/);
assert.ok(html.indexOf("ezero_secure_connect_device_identity_v0_1.js")<
  html.indexOf("ezero_secure_connect_live_p2p_v0_1.js"),"IDB store before RTC engine");
assert.match(people,/transport\?\.connected\(\)/);
assert.match(people,/transport\.peerFingerprint\(\)!==fp/);
assert.match(people,/saveAfterConsent\(\)/);
assert.match(people,/localStorage\.setItem\(CONTACTS/);
assert.match(engine,/new Uint8Array\(await crypto\.subtle\.exportKey\("spki",saved\.keys\.publicKey\)\)/);
assert.match(engine,/pairMatches&&publicFingerprint===saved\.fingerprint/);
assert.doesNotMatch(identity,/localStorage|fetch\(|WebSocket\(|navigator\.sendBeacon/);
assert.doesNotMatch(identity,/privateKey\s*\.\s*export/);
assert.match(identity,/extractable===false/);

function fakeStorage(){
  const memory=new Map();
  let created=false;
  const db={
    objectStoreNames:{contains:()=>created},
    createObjectStore:()=>{created=true;},
    close:()=>{},
    transaction(_name,_mode){
      const tx={};
      const request=(kind,key,value)=>{
        const req={};
        queueMicrotask(()=>{
          if(kind==="put")memory.set(key,value);
          else if(kind==="delete")memory.delete(key);
          else req.result=memory.get(key);
          req.onsuccess?.();
          queueMicrotask(()=>tx.oncomplete?.());
        });
        return req;
      };
      tx.objectStore=()=>({
        get:key=>request("get",key),
        put:(value,key)=>request("put",key,value),
        delete:key=>request("delete",key)
      });
      return tx;
    }
  };
  return {
    open(){
      const req={};
      queueMicrotask(()=>{
        req.result=db;
        if(!created)req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    }
  };
}
function getAPI(indexedDB){
  const window={indexedDB};
  vm.runInNewContext(identity,{window,indexedDB,Promise,Error,queueMicrotask});
  return window.EZERO_DEVICE_IDENTITY_STORE;
}
async function test(){
  const storage=fakeStorage();
  const api=getAPI(storage);
  assert.equal(await api.read(),null,"new browser has no saved device");
  const keys=await crypto.subtle.generateKey(
    {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  assert.equal(keys.privateKey.extractable,false);
  const spkiBytes=Buffer.from(await crypto.subtle.exportKey("spki",keys.publicKey));
  const spki=spkiBytes.toString("base64url");
  const fp=Buffer.from(await crypto.subtle.digest("SHA-256",spkiBytes)).toString("hex");
  assert.equal(await api.save(keys,spki,fp),true,"save must complete transaction");
  const pageReload=getAPI(storage);
  const restored=await pageReload.read();
  assert.equal(restored.fingerprint,fp,"same fingerprint after reload");
  assert.equal(restored.keys.privateKey.extractable,false,"private key never exportable");
  const challenge=crypto.getRandomValues(new Uint8Array(32));
  const signature=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    restored.keys.privateKey,challenge);
  assert.equal(await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
    restored.keys.publicKey,signature,challenge),true,"restored key usable");
  assert.equal(await pageReload.forget(),true,"explicit key removal");
  assert.equal(await api.read(),null,"key absent after removal");
  await assert.rejects(
    ()=>api.save({privateKey:{type:"private",extractable:true},publicKey:{type:"public"}},spki,fp),
    /INVALID_DEVICE_IDENTITY/,"exportable private key rejected");
  console.log("PASS: saved-friend JS syntax, user-consent wiring, non-exportable identity, IDB reload, removal");
}
test().catch(error=>{console.error(error);process.exitCode=1;});
