/* Offline privacy/cryptographic evidence gate. No calls or uploads.
 * Node 22 WebCrypto + fake browser memory/clock. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto,createHash}=require("node:crypto");
const {verifyArchive}=require("../tools/verify_ezero_evidence_v1.cjs");
const source=fs.readFileSync("js/ezero_signed_media_evidence_v0_1.js","utf8");
new vm.Script(source);
assert.doesNotMatch(source,/\bfetch\s*\(|new\s+WebSocket\s*\(|XMLHttpRequest|sendBeacon|localStorage\.setItem/);
let current=Date.now();
class TestDate extends Date{
  static now(){return current;}
  constructor(...args){super(...(args.length?args:[current]));}
}
const listeners=new Map();
const wnd={addEventListener:(name,fn)=>listeners.set(name,fn)};
const operations={digest:0,sign:0,generateKey:0};
const trackedCrypto={
  getRandomValues:webcrypto.getRandomValues.bind(webcrypto),
  subtle:new Proxy(webcrypto.subtle,{
    get(target,key){const value=Reflect.get(target,key,target);
      if(typeof value!=="function")return value;
      return (...args)=>{if(Object.hasOwn(operations,key))operations[key]++;
        return Reflect.apply(value,target,args);};
    }
  })
};
const context={window:wnd,crypto:trackedCrypto,TextEncoder,TextDecoder,Blob,
  Uint8Array,Uint32Array,ArrayBuffer,DataView,Date:TestDate,Map,Set,
  atob,btoa,setTimeout:()=>3,clearTimeout:()=>{},console};
vm.runInNewContext(source,context);
const ev=wnd.EZERO_SIGNED_MEDIA_EVIDENCE;
assert.ok(ev);
const decoder=new TextDecoder();
function unzipLocalStored(zipBlob){
  return zipBlob.arrayBuffer().then(buffer=>{
    const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
    let at=0,items=new Map();
    while(at+30<=bytes.length&&dv.getUint32(at,true)===0x04034b50){
      const size=dv.getUint32(at+18,true);
      const nameSize=dv.getUint16(at+26,true),extra=dv.getUint16(at+28,true);
      const name=decoder.decode(bytes.slice(at+30,at+30+nameSize));
      const from=at+30+nameSize+extra;
      assert.ok(size<=64*1024*1024);
      items.set(name,bytes.slice(from,from+size));
      at=from+size;
    }
    assert.equal(items.size,3);
    assert.equal(dv.getUint32(at,true),0x02014b50);
    return items;
  });
}
async function main(){
  const keys=await webcrypto.subtle.generateKey(
    {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
  const spki=new Uint8Array(await webcrypto.subtle.exportKey("spki",keys.publicKey));
  const fp=createHash("sha256").update(spki).digest("hex");
  wnd.EZERO_DEVICE_IDENTITY_STORE={read:async()=>({
    keys,spki:Buffer.from(spki).toString("base64url"),fingerprint:fp})};
  const media=Uint8Array.from({length:12500},(_,i)=>i%255);
  const original=new Blob([media],{type:"audio/webm"});
  let changed=0;
  ev.onChange(()=>changed++);
  const id=ev.offer({blob:original,kind:"voice_note",source:"LOCAL_DEVICE",
    consent:"USER_VOLUNTARILY_SAVED"});
  assert.equal(ev.list().length,1);
  assert.equal(ev.list()[0].expiresAt-current,600000);
  assert.deepEqual(operations,{digest:0,sign:0,generateKey:0},
    "Merely receiving/holding media must never calculate or sign evidence");
  const plain=ev.downloadOriginal(id);
  assert.equal(plain.blob,original,"Plain download returns exact original Blob");
  assert.equal(plain.blob.type,"audio/webm");
  assert.deepEqual(operations,{digest:0,sign:0,generateKey:0},
    "Plain download must avoid ALL SHA-256/signing/identity work");
  console.log("PASS: audio message plain download does not hash, sign or create a ZIP");
  const signed=await ev.packageEvidence(id);
  assert.ok(operations.digest>0&&operations.sign>0,
    "Evidence export click must compute SHA-256 and ECDSA signature");
  assert.match(signed.sha256,/^[0-9a-f]{64}$/);
  assert.equal(signed.sha256,createHash("sha256").update(media).digest("hex"));
  assert.equal(signed.signerFingerprint,fp);
  const standalone=verifyArchive(Buffer.from(await signed.archive.arrayBuffer()));
  assert.equal(standalone.status,"INTEGRITY_VERIFIED");
  assert.equal(standalone.mediaSha256,signed.sha256);
  assert.equal(standalone.signerFingerprint,fp);
  const alteredZip=Buffer.from(await signed.archive.arrayBuffer());
  alteredZip[60]^=1;
  assert.throws(()=>verifyArchive(alteredZip),/ZIP_CRC_FAILED|ZIP_CENTRAL_MISMATCH/);
  console.log("PASS: independent Node offline verifier checks ECDSA, SHA-256, ZIP CRC and modified ZIP rejection");
  const entries=await unzipLocalStored(signed.archive);
  const manifest=JSON.parse(decoder.decode(entries.get("evidence.json")));
  assert.equal(manifest.payload.signerClass,"CONSENT_SAVED_DEVICE_IDENTITY");
  assert.equal(manifest.payload.signerKeySha256,fp);
  assert.equal(manifest.payload.media.sha256,signed.sha256);
  assert.deepEqual(Buffer.from(entries.get("media.webm")),Buffer.from(media));
  assert.equal(await ev.verify(entries.get("media.webm"),manifest),true);
  const tampered=entries.get("media.webm").slice();tampered[0]^=1;
  assert.equal(await ev.verify(tampered,manifest),false,
    "Bit-level tampering must fail cryptographic verification");
  manifest.payload.media.mime="audio/ogg";
  assert.equal(await ev.verify(entries.get("media.webm"),manifest),false,
    "Tampered signed manifest must fail");
  console.log("PASS: original ZIP media SHA-256 and self-issued device ECDSA signature verify");
  console.log("PASS: altered original media and altered manifest fail verification");
  current+=600001;
  await assert.rejects(()=>ev.packageEvidence(id),/EVIDENCE_EXPIRED/);
  assert.equal(ev.list().length,0);
  assert.ok(changed>=2);
  console.log("PASS: ten-minute browser retention enforced when clock advances");
  const peerNote=ev.offer({blob:original,kind:"voice_note",
    source:"PEER_WEBRTC_VOICE_NOTE_OPT_IN",
    consent:"SENDER_EXPORT_ALLOWED_P2P_UNATTESTED"});
  const note=await ev.packageEvidence(peerNote);
  const noteContents=await unzipLocalStored(note.archive);
  const peerManifest=JSON.parse(decoder.decode(noteContents.get("evidence.json")));
  assert.equal(peerManifest.payload.capture.consent,"SENDER_EXPORT_ALLOWED_P2P_UNATTESTED");
  assert.equal(await ev.verify(noteContents.get("media.webm"),peerManifest),true);
  ev.expire(peerNote);
  console.log("PASS: explicit P2P sender export permission and SHA-256 signed voice archive");
  for(const [mime,kind,extension] of [
    ["image/png","shared_file","png"],["application/pdf","shared_file","pdf"],
    ["text/plain","shared_text","txt"],["video/mp4","shared_file","mp4"],
    ["audio/mpeg","shared_file","mp3"]]){
    const blob=new Blob([media],{type:mime});
    const fileId=ev.offer({blob,kind,source:"USER_IMPORTED_UNVERIFIED",
      consent:"USER_SELECTED_OWN_FILE_NOT_PEER_ATTESTED"});
    assert.equal(ev.downloadOriginal(fileId).blob,blob,
      "All shared content types must remain byte-identical on plain download");
    const manifestResult=await ev.packageEvidence(fileId);
    const extracted=await unzipLocalStored(manifestResult.archive);
    const signedManifest=JSON.parse(decoder.decode(extracted.get("evidence.json")));
    assert.equal(signedManifest.payload.media.filename,"media."+extension);
    assert.equal(await ev.verify(extracted.get("media."+extension),signedManifest),true);
    assert.equal(verifyArchive(Buffer.from(await manifestResult.archive.arrayBuffer())).status,
      "INTEGRITY_VERIFIED");
    ev.expire(fileId);
  }
  console.log("PASS: audio notes, images, documents, videos and text use common optional signed proof");
  const another=ev.offer({blob:original,kind:"media_file",
    source:"USER_IMPORTED_UNVERIFIED",
    consent:"USER_SELECTED_FILE_NOT_PEER_ATTESTED"});
  const m=await ev.packageEvidence(another);
  const archive=await unzipLocalStored(m.archive);
  const record=JSON.parse(decoder.decode(archive.get("evidence.json")));
  assert.equal(record.payload.capture.source,"USER_IMPORTED_UNVERIFIED");
  assert.equal(record.payload.export.thirdPartyTimestamp,false);
  assert.equal(record.payload.export.legalIdentityVerified,false);
  assert.equal(record.payload.export.externalChainOfCustody,false);
  wnd.EZERO_DEVICE_IDENTITY_STORE.read=async()=>null;
  listeners.get("pagehide")?.();
  assert.equal(ev.list().length,0);
  await assert.rejects(()=>ev.packageEvidence(another),/EVIDENCE_EXPIRED/);
  console.log("PASS: imported file provenance openly UNVERIFIED; pagehide erases transient clips");
  console.log("PASS: no network/export without user action, no media persistence, downloaded ZIP remains user's responsibility");
}
main().catch(e=>{console.error(e);process.exitCode=1;});