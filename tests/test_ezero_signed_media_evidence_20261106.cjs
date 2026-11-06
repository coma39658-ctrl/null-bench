/* Offline privacy/cryptographic evidence gate. No calls or uploads.
 * Node 22 WebCrypto + fake browser memory/clock. */
"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const {webcrypto,createHash}=require("node:crypto");
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
const context={window:wnd,crypto:webcrypto,TextEncoder,TextDecoder,Blob,
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
  const signed=await ev.packageEvidence(id);
  assert.match(signed.sha256,/^[0-9a-f]{64}$/);
  assert.equal(signed.sha256,createHash("sha256").update(media).digest("hex"));
  assert.equal(signed.signerFingerprint,fp);
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
  assert.rejects(()=>ev.packageEvidence(another),/EVIDENCE_EXPIRED/);
  console.log("PASS: imported file provenance openly UNVERIFIED; pagehide erases transient clips");
  console.log("PASS: no network/export without user action, no media persistence, downloaded ZIP remains user's responsibility");
}
main().catch(e=>{console.error(e);process.exitCode=1;});