import assert from "node:assert/strict";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {PairV1PendingDeviceRegistryLab as Registry}
 from "../secure_connect/pair_v1/trusted_device_sqlite_lab_v0_1.mjs";
const root=mkdtempSync(join(tmpdir(),"ezero_pair_devices_test_"));
const file=join(root,"devices.sqlite3");
const sqlStore=db=>({
 sql:{exec(q,...params){
  const s=q.trim();
  if(s.startsWith("CREATE TABLE")){db.exec(s);return{toArray:()=>[]};}
  const prepared=db.prepare(s);
  if(s.startsWith("SELECT")||s.includes("RETURNING"))
   return{toArray:()=>prepared.all(...params)};
  prepared.run(...params);return{toArray:()=>[]};
 }},
 transactionSync(fn){
  db.exec("BEGIN IMMEDIATE");
  try{const r=fn();db.exec("COMMIT");return r;}
  catch(e){db.exec("ROLLBACK");throw e;}
 }
});
const b64=data=>{
 let s="";for(const v of data)s+=String.fromCharCode(v);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
};
let db;
try{
 db=new DatabaseSync(file);
 const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
  false,["sign","verify"]);
 const badKeys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
  false,["sign","verify"]);
 const spki=new Uint8Array(await crypto.subtle.exportKey("spki",keys.publicKey));
 const otherSpki=new Uint8Array(await crypto.subtle.exportKey("spki",badKeys.publicKey));
 const hash=v=>crypto.subtle.digest("SHA-256",v).then(d=>
  [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,"0")).join(""));
 const accountId="account_test_001",deviceId="android_phone_a_01";
 const info={accountId,deviceId,publicSpki:b64(spki),keyHash:await hash(spki)};
 const registry=new Registry(sqlStore(db));
 const created=await registry.stagePendingDevice(info,Date.now());
 assert.deepEqual(created,{ok:true,authorized:false,code:"DEVICE_STAGED_PENDING_ONLY"});
 assert.deepEqual(await registry.stagePendingDevice(info),{
  ok:false,authorized:false,code:"DEVICE_ALREADY_STAGED_OR_REVOKED"
 });
 assert.equal(registry.getActiveDeviceNotYetImplemented().ok,false);
 assert.equal(registry.approveTrustedDeviceNotYetImplemented({verified:true,biometric:true}).ok,false);
 for(const extra of [
  {publicSpki:b64(otherSpki)},
  {keyHash:await hash(otherSpki)},
  {publicSpki:"bad format"},
  {deviceId:"invalid"},
  {accountId:"x"},
 ]){
  const r=await registry.stagePendingDevice({...info,...extra});
  assert.equal(r.ok,false);
  assert.equal(r.authorized,false);
 }
 const wrong={...info,deviceId:"android_phone_b_01",accountId:"account_other_002"};
 assert.equal((await registry.stagePendingDevice(wrong)).ok,false,
  "same public key may not be staged by two accounts");
 db.close();
 db=new DatabaseSync(file);
 const persisted=new Registry(sqlStore(db));
 assert.equal(persisted.revokeServerSide(accountId,deviceId).ok,true);
 assert.equal(persisted.revokeServerSide(accountId,deviceId).ok,false);
 assert.equal((await persisted.stagePendingDevice(info)).ok,false,
  "revoked record must not silently be reactivated");
 assert.equal(persisted.approveTrustedDeviceNotYetImplemented({verified:true}).ok,false);
 db.close();
 db=new DatabaseSync(file);
 const afterRestart=new Registry(sqlStore(db));
 assert.equal((await afterRestart.stagePendingDevice(info)).ok,false,
  "revocation and public key remain blocked after DB restart");
 assert.equal(afterRestart.getActiveDeviceNotYetImplemented().authorized,false);
 console.log("PAIR_V1_SQLITE_DEVICE_RECORD_PERSISTS_REVOKE_CANNOT_AUTO_RETRUST: PASS");
 console.log("PAIR_V1_NO_FAKE_PASSKEY_NO_BROWSER_APPROVED_TRUST_WITHOUT_DUAL_PROOF: PASS");
}finally{
 try{db?.close();}catch(_){}
 rmSync(root,{recursive:true,force:true});
}
