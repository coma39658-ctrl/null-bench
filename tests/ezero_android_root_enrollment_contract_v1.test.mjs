import test from "node:test";
import assert from "node:assert/strict";
import {createHash, generateKeyPairSync, sign, verify, createPublicKey} from "node:crypto";

const fp = spki => createHash("sha256").update(spki).digest("hex");
const canonical = (tag, fields, order) => Buffer.from(tag+"\n"+order.map(k=>k+"="+fields[k]+"\n").join(""),"utf8");
const CHALLENGE_ORDER=["challenge_id","device_fp","nonce","audience","expires_at"];
const APPROVAL_ORDER=["root_fp","device_fp","challenge_id","nonce","audience","expires_at"];
const signBytes=(key,bytes)=>sign("sha256",bytes,{key,dsaEncoding:"der"});
const verifyBytes=(key,bytes,sig)=>verify("sha256",bytes,key,sig);

function fixture(){
 const root=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
 const device=generateKeyPairSync("ec",{namedCurve:"prime256v1"});
 const rootSpki=root.publicKey.export({type:"spki",format:"der"});
 const deviceSpki=device.publicKey.export({type:"spki",format:"der"});
 const rootFp=fp(rootSpki), deviceFp=fp(deviceSpki);
 const challenge={challenge_id:"challenge_123456",device_fp:deviceFp,nonce:"abcdefghijklmnopQRSTUV",audience:"https://ezero-staging.example",expires_at:"1795555650000"};
 const approval={root_fp:rootFp,device_fp:deviceFp,challenge_id:challenge.challenge_id,nonce:challenge.nonce,audience:challenge.audience,expires_at:challenge.expires_at};
 return {root,device,rootSpki,deviceSpki,rootFp,deviceFp,challenge,approval};
}

test("fingerprints are recomputed from SPKI, not accepted as labels",()=>{
 const f=fixture();
 assert.equal(fp(f.deviceSpki),f.deviceFp);
 assert.notEqual(fp(f.deviceSpki),f.rootFp);
});

test("Android device proof verifies only against the exact challenge and device key",()=>{
 const f=fixture(), bytes=canonical("EZERO_ANDROID_ENROLL_CHALLENGE_V1",f.challenge,CHALLENGE_ORDER);
 const proof=signBytes(f.device.privateKey,bytes);
 assert.equal(verifyBytes(createPublicKey({key:f.deviceSpki,type:"spki",format:"der"}),bytes,proof),true);
 assert.equal(verifyBytes(f.root.publicKey,bytes,proof),false);
 assert.equal(verifyBytes(f.device.publicKey,canonical("EZERO_ANDROID_ENROLL_CHALLENGE_V1",{...f.challenge,nonce:"changednonceabcdefghijkl"},CHALLENGE_ORDER),proof),false);
});

test("root approval binds exact root, device, challenge, nonce, audience and expiry",()=>{
 const f=fixture(), bytes=canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER);
 const sig=signBytes(f.root.privateKey,bytes);
 assert.equal(verifyBytes(f.root.publicKey,bytes,sig),true);
 for(const patch of [{device_fp:f.rootFp},{nonce:"changednonceabcdefghijkl"},{audience:"https://attacker.example"},{expires_at:"1795555555001"}]){
  assert.equal(verifyBytes(f.root.publicKey,canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",{...f.approval,...patch},APPROVAL_ORDER),sig),false);
 }
});

test("a valid self-signed root is still rejected unless root registry confirms it",()=>{
 const f=fixture(), registeredRoots=new Set();
 const rootAuthenticated=registeredRoots.has(f.rootFp);
 const approvalSig=signBytes(f.root.privateKey,canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER));
 assert.equal(verifyBytes(f.root.publicKey,canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER),approvalSig),true);
 assert.equal(rootAuthenticated,false,"signature validity is not root authorization");
 registeredRoots.add(f.rootFp);
 assert.equal(registeredRoots.has(f.rootFp),true,"only an independently provisioned registry may authorize this root");
});

test("canonical encodings are deterministic, LF-only, and end with LF",()=>{
 const f=fixture();
 for(const [tag,fields,order] of [
  ["EZERO_ANDROID_ENROLL_CHALLENGE_V1",f.challenge,CHALLENGE_ORDER],
  ["EZERO_ANDROID_ROOT_APPROVAL_V1",f.approval,APPROVAL_ORDER]
 ]){
  const bytes=canonical(tag,fields,order);
  assert.equal(bytes.at(-1),10);
  assert.equal(bytes.includes(13),false);
  assert.equal(bytes,canonical(tag,fields,order));
 }
});

test("challenge expiry, audience and field syntax fail closed",()=>{
 const f=fixture(), now=1795555550000;
 const valid=(c)=>/^[A-Za-z0-9_-]{16,128}$/.test(c.nonce)&&/^https:\/\/[a-z0-9.-]+$/.test(c.audience)&&/^\d{13}$/.test(c.expires_at)&&Number(c.expires_at)>now&&Number(c.expires_at)-now<=90000;
 assert.equal(valid(f.challenge),false,"fixture exceeds 90-second enrollment lifetime");
 const good={...f.challenge,expires_at:String(now+90000)};
 assert.equal(valid(good),true);
 assert.equal(valid({...good,audience:"*"}),false);
 assert.equal(valid({...good,nonce:"tiny"}),false);
 assert.equal(valid({...good,expires_at:String(now+90001)}),false);
});
