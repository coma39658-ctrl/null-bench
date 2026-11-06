/* E-ZERO offline proof verification and transient retention, Node 22. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto}=require("node:crypto");
const script=fs.readFileSync("js/ezero_evidence_proof_v1.js","utf8");
new vm.Script(script);
const persistent=new Map();
function fakeIndexedDB(){
  return {open(){
    const req={result:null};
    queueMicrotask(()=>{
      const db={
        objectStoreNames:{contains:()=>true},
        createObjectStore(){},
        close(){},
        transaction(_name,mode){
          const tx={oncomplete:null,onerror:null,onabort:null,
            objectStore:()=>({
              get(key){const rr={result:null};queueMicrotask(()=>{
                rr.result=persistent.get(key)||null;
                rr.onsuccess?.();
                queueMicrotask(()=>tx.oncomplete?.());
              });return rr;},
              put(value,key){const rr={};queueMicrotask(()=>{
                persistent.set(key,value);
                rr.onsuccess?.();
                queueMicrotask(()=>tx.oncomplete?.());
              });return rr;}
            })
          };
          return tx;
        }
      };
      req.result=db;
      req.onsuccess?.();
    });
    return req;
  }};
}
async function run(){
  const window={};
  const ctx={window,indexedDB:fakeIndexedDB(),crypto:webcrypto,TextEncoder,TextDecoder,
    Blob,Uint8Array,DataView,Date,Map,Set,Object,Array,Number,Error,
    btoa,atob,setTimeout,clearTimeout,console};
  vm.runInNewContext(script,ctx);
  const api=window.EZERO_EVIDENCE_V1;
  assert.equal(api.version,"EZERO_EVIDENCE_V1");
  const binary=new Uint8Array([1,5,9,254,0,71,111,111,100,2,18]);
  const blob=new Blob([binary],{type:"audio/webm"});
  await assert.rejects(api.packageBlob(blob,"sample.webm"),/EXPLICIT_EXPORT_CONSENT_REQUIRED/);
  const pkg=await api.packageBlob(blob,"sample.webm",{userConsent:true});
  assert.equal(pkg.archive.type,"application/zip");
  const proof=pkg.manifest;
  assert.equal(proof.file.size,binary.length);
  assert.equal(proof.file.name,"sample.webm");
  assert.equal(proof.file.type,"audio/webm");
  assert.match(proof.file.sha256,/^[a-f0-9]{64}$/);
  assert.equal(proof.clockStatus,"UNTRUSTED_DEVICE_CLOCK");
  assert.equal(proof.identityStatus,"SELF_SIGNED_DEVICE_KEY_NOT_HUMAN_ID");
  assert.equal(proof.thirdPartyTimestamp,null);
  assert.equal(persistent.size,1);
  const key=persistent.get("local");
  assert.equal(key.pair.privateKey.extractable,false);
  assert.equal(key.pair.privateKey.algorithm.namedCurve,"P-256");
  const packProof=await api.verifyArchive(pkg.archive);
  assert.equal(packProof.ok,true,JSON.stringify(packProof));
  assert.equal(packProof.integrity,"PASS");
  assert.equal(packProof.signature,"PASS");
  assert.equal(packProof.time,"NOT_INDEPENDENTLY_VERIFIED");
  assert.equal(packProof.legalAdmissibility,"NOT_DETERMINED");
  const proof2=(await api.packageBlob(blob,"sample.webm",{userConsent:true})).manifest;
  assert.equal(proof.signature.keyFingerprintSha256,
    proof2.signature.keyFingerprintSha256,"signing key must persist in browser");
  const alteredBytes=Uint8Array.from(binary);alteredBytes[0]^=1;
  assert.equal((await api.verify(alteredBytes,proof)).ok,false,"media tamper must fail");
  const changedTime=structuredClone(proof);changedTime.localTime="2000-01-01T00:00:00.000Z";
  assert.equal((await api.verify(binary,changedTime)).ok,false,"signed time metadata tamper must fail");
  const changedKey=structuredClone(proof);changedKey.signature.keyFingerprintSha256="f".repeat(64);
  assert.equal((await api.verify(binary,changedKey)).ok,false,"key fingerprint tamper must fail");
  const changedSig=structuredClone(proof);changedSig.signature.value="a".repeat(86);
  assert.equal((await api.verify(binary,changedSig)).ok,false,"signature tamper must fail");
  const unsigned=structuredClone(proof);unsigned.fakeOfficialCertificate="CERTIFIED";
  assert.equal((await api.verify(binary,unsigned)).ok,false,"unsigned manifest fields must fail");
  const invalidZip=new Uint8Array(await pkg.archive.arrayBuffer());
  invalidZip[40]^=2;
  assert.equal((await api.verifyArchive(new Blob([invalidZip]))).ok,false,
    "modified ZIP must fail CRC/hash/signature");
  const held=api.temporary(blob,"received.webm");
  assert.equal(held.expired(),false);
  assert.equal((await api.verifyArchive((await held.saveWithProof()).archive)).ok,true);
  held.discard();
  assert.equal(held.expired(),true);
  await assert.rejects(held.saveWithProof(),/TEN_MINUTE_WINDOW_EXPIRED/);
  assert.throws(()=>api.temporary(blob,"expired.webm",Date.now()-600001),/ALREADY_EXPIRED/);
  await assert.rejects(api.packageBlob({size:api.maxBytes+1,arrayBuffer(){throw Error("should not load");}},
    "too-large.mp4",{userConsent:true}),/MEDIA_SIZE_OR_TYPE_UNSUPPORTED/);
  assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|MediaRecorder|getUserMedia|sendBeacon/);
  console.log("PASS: original + SHA-256 + self-signed ECDSA P-256 detached ZIP proof");
  console.log("PASS: independent offline verification and signed metadata integrity");
  console.log("PASS: tampered media, signature, key, timestamp and unsigned fields rejected");
  console.log("PASS: 10-minute transient window, explicit export consent, key never extractable");
  console.log("PASS: no background recording, media upload, network or false legal certification");
}
run().catch(e=>{console.error(e);process.exitCode=1;});
