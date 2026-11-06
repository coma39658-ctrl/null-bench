/* E-ZERO signed media evidence V0.1 — STAGING ONLY.
 * Local, opt-in exports. Self-issued P-256 ECDSA signatures plus SHA-256
 * prove post-export byte integrity, NOT the underlying truth of a recording,
 * a person's legal identity, independent timing, or chain of custody.
 * No network/upload. Evidence key is non-extractable in IndexedDB.
 */
(()=>{"use strict";
const PREFIX="ezero-evidence-v1", DB="ezero_evidence_signer_v0_1", STORE="keys";
const ENCODER=new TextEncoder(), MAX=64*1024*1024, TTL=600000;
const KINDS=new Set(["voice_note","call_audio","call_video","video_message","media_file"]);
const MIME_EXT={"audio/webm":"webm","video/webm":"webm","audio/ogg":"ogg",
  "audio/mp4":"m4a","video/mp4":"mp4","audio/wav":"wav"};
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");
const b64=bytes=>{let str="";for(const v of new Uint8Array(bytes))str+=String.fromCharCode(v);
  return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const unb64=s=>Uint8Array.from(atob(s.replace(/-/g,"+").replace(/_/g,"/")+
  "=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
function bytes4(value){return new Uint8Array([value&255,(value>>>8)&255,
  (value>>>16)&255,(value>>>24)&255]);}
function bytes2(value){return bytes4(value).slice(0,2);}
function concat(chunks){const n=chunks.reduce((acc,x)=>acc+x.length,0);
  const all=new Uint8Array(n);let at=0;
  for(const a of chunks){all.set(a,at);at+=a.length;}return all;}
let crcTable=null;
function crc32(bytes){
  if(!crcTable)crcTable=Array.from({length:256},(_,idx)=>{
    let v=idx;for(let b=0;b<8;b++)v=(v&1)?(0xedb88320^(v>>>1)):(v>>>1);
    return v>>>0;
  });
  let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);
  return (crc^0xffffffff)>>>0;
}
function zip(entries){
  let offset=0;const blocks=[],directory=[];
  for(const [name,data] of entries){
    const fname=ENCODER.encode(name);
    if(fname.length>200||data.length>MAX)throw Error("EVIDENCE_TOO_LARGE");
    const c=crc32(data),size=data.length;
    const header=concat([bytes4(0x04034b50),bytes2(20),bytes2(0),
      bytes2(0),bytes2(0),bytes2(0),bytes4(c),bytes4(size),
      bytes4(size),bytes2(fname.length),bytes2(0),fname]);
    blocks.push(header,data);
    directory.push(concat([bytes4(0x02014b50),bytes2(20),bytes2(20),
      bytes2(0),bytes2(0),bytes2(0),bytes2(0),bytes4(c),
      bytes4(size),bytes4(size),bytes2(fname.length),bytes2(0),bytes2(0),
      bytes2(0),bytes2(0),bytes4(0),bytes4(offset),fname]));
    offset+=header.length+data.length;
  }
  const catalog=concat(directory);
  return new Blob([...blocks,catalog,concat([bytes4(0x06054b50),bytes2(0),
    bytes2(0),bytes2(entries.length),bytes2(entries.length),
    bytes4(catalog.length),bytes4(offset),bytes2(0)])],
    {type:"application/zip"});
}
async function store(){
  if(!indexedDB||!crypto?.subtle)throw Error("CRYPTO_STORAGE_UNAVAILABLE");
  return await new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(Error("EVIDENCE_STORE_FAILED"));
    req.onblocked=()=>reject(Error("EVIDENCE_STORE_BLOCKED"));
  });
}
async function keyForExplicitExport(){
  // When the user opted in to Save Friend, reuse their existing non-exportable
  // verified device identity, so public fingerprints remain comparable.
  try{
    const row=await window.EZERO_DEVICE_IDENTITY_STORE?.read?.();
    if(row?.keys?.privateKey?.extractable===false&&
       row.keys.privateKey.algorithm?.name==="ECDSA"&&
       row.keys.privateKey.algorithm?.namedCurve==="P-256"&&
       /^[a-f0-9]{64}$/.test(row.fingerprint||"")){
      const pub=new Uint8Array(await crypto.subtle.exportKey("spki",
        row.keys.publicKey));
      const digest=hex(await crypto.subtle.digest("SHA-256",pub));
      if(digest===row.fingerprint){
        return {keypair:row.keys,signerClass:"CONSENT_SAVED_DEVICE_IDENTITY"};
      }
    }
  }catch(_){/* No silent trust of broken device storage. */}
  const db=await store();
  try{
    let keypair=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readonly");
      const req=tx.objectStore(STORE).get("device");
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(Error("EVIDENCE_KEY_READ_FAILED"));
    });
    if(keypair?.privateKey?.extractable===false&&keypair?.publicKey)
      return {keypair,signerClass:"SELF_ISSUED_EVIDENCE_ONLY"};
    keypair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
      false,["sign","verify"]);
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite");
      tx.objectStore(STORE).put(keypair,"device");
      tx.oncomplete=resolve;
      tx.onerror=()=>reject(Error("EVIDENCE_KEY_WRITE_FAILED"));
      tx.onabort=()=>reject(Error("EVIDENCE_KEY_WRITE_ABORTED"));
    });
    return {keypair,signerClass:"SELF_ISSUED_EVIDENCE_ONLY"};
  }finally{db.close();}
}
const clips=new Map();
const watchers=new Set();
function notify(){for(const listener of watchers){try{listener(list());}catch(_){}}}
function expire(id){
  const old=clips.get(id);if(!old)return;
  clearTimeout(old.timer);clips.delete(id);notify();
}
function clearAll(){for(const id of [...clips.keys()])expire(id);}
function list(){return [...clips.entries()].map(([id,v])=>({id,kind:v.kind,
  createdAt:v.createdAt,expiresAt:v.expiresAt,size:v.blob.size,mime:v.mime}));}
function offer({blob,kind,source="LOCAL_DEVICE",consent="NOT_ATTESTED",
                consentDetails=null}={}){
  if(!(blob instanceof Blob)||!KINDS.has(kind)||blob.size<=0||blob.size>MAX)
    throw Error("UNSUPPORTED_OR_OVERSIZE_MEDIA");
  if(!/^[A-Z0-9_]{3,50}$/.test(source)||!/^[A-Z0-9_]{3,50}$/.test(consent))
    throw Error("INVALID_EVIDENCE_PROVENANCE");
  if(consentDetails!==null){
    if(typeof consentDetails!=="object"||Array.isArray(consentDetails)||
       JSON.stringify(consentDetails).length>1200||
       (consentDetails.peerFingerprint!==undefined&&
        !/^[a-f0-9]{64}$/.test(consentDetails.peerFingerprint))||
       (consentDetails.recordingConsentId!==undefined&&
        !/^[a-f0-9]{32}$/.test(consentDetails.recordingConsentId)))
      throw Error("INVALID_CONSENT_DETAILS");
  }
  const id=hex(crypto.getRandomValues(new Uint8Array(16)));
  const createdAt=new Date().toISOString(),expiresAt=Date.now()+TTL;
  const timer=setTimeout(()=>expire(id),TTL);
  clips.set(id,{blob,kind,mime:blob.type.split(";")[0].toLowerCase(),
    source,consent,consentDetails,createdAt,expiresAt,timer});
  notify();return id;
}
// Plain download returns exactly the original Blob and does NOT compute
// SHA-256, create a signing key, sign, create an evidence manifest, or ZIP.
function downloadOriginal(id){
  const item=clips.get(id);
  if(!item||Date.now()>=item.expiresAt){
    expire(id);throw Error("EVIDENCE_EXPIRED");
  }
  const extension=MIME_EXT[item.mime]||"bin";
  return {blob:item.blob,
    filename:"E-ZERO-original-"+item.kind+"-"+id.slice(0,12)+"."+extension};
}
async function packageEvidence(id){
  const item=clips.get(id);
  if(!item||Date.now()>=item.expiresAt){expire(id);throw Error("EVIDENCE_EXPIRED");}
  if(item.blob.size>MAX)throw Error("EVIDENCE_TOO_LARGE");
  const media=new Uint8Array(await item.blob.arrayBuffer());
  if(!clips.has(id)||Date.now()>=item.expiresAt)throw Error("EVIDENCE_EXPIRED");
  const digest=hex(await crypto.subtle.digest("SHA-256",media));
  const signer=await keyForExplicitExport(); // only an explicit export tap
  const keys=signer.keypair;
  const pub=new Uint8Array(await crypto.subtle.exportKey("spki",keys.publicKey));
  const pubfp=hex(await crypto.subtle.digest("SHA-256",pub));
  const ext=MIME_EXT[item.mime]||"bin";
  const filename="media."+ext;
  const payload={
    format:"EZERO_SIGNED_MEDIA_EVIDENCE_V1",
    evidenceId:id,
    media:{filename,mime:item.mime||"application/octet-stream",
      sizeBytes:media.length,sha256:digest},
    capture:{kind:item.kind,source:item.source,consent:item.consent,
      consentDetails:item.consentDetails,capturedAtDevice:item.createdAt},
    export:{deviceClockTime:new Date().toISOString(),clockTrust:"UNVERIFIED",
      retention:"LOCAL_BUFFER_MAX_10_MINUTES",keyBinding:"BROWSER_DEVICE_ONLY",
      thirdPartyTimestamp:false,legalIdentityVerified:false,
      externalChainOfCustody:false},
    signatureScheme:"ECDSA_P256_SHA256",
    signerPublicKeySpkiBase64url:b64(pub),
    signerKeySha256:pubfp,
    signerClass:signer.signerClass
  };
  const signed=JSON.stringify(payload);
  const sig=new Uint8Array(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    keys.privateKey,ENCODER.encode(signed)));
  const record=JSON.stringify({
    payload,signatureBase64url:b64(sig),signedPayloadUtf8:signed
  },null,2);
  const notes=[
    "E-ZERO SIGNED MEDIA EVIDENCE V1",
    "Media SHA-256: "+digest,
    "Signing public-key SHA-256: "+pubfp,
    "Algorithm: ECDSA P-256 / SHA-256; signature covers signedPayloadUtf8.",
    "Key is browser-generated. Not a government-issued identity certificate.",
    "Device clock is unverified; no trusted timestamp or independent custody.",
    "This attests byte integrity after export, not that the events actually occurred.",
    "Keep original ZIP unmodified and log every subsequent transfer.",
    "Media remains on the recipient device after downloading; browser cannot delete it."
  ].join("\n");
  const archive=zip([[filename,media],["evidence.json",ENCODER.encode(record)],
    ["READ_ME.txt",ENCODER.encode(notes)]]);
  if(!clips.has(id)||Date.now()>=item.expiresAt){
    expire(id);throw Error("EVIDENCE_EXPIRED");
  }
  return {archive,filename:"E-ZERO-"+item.kind+"-"+digest.slice(0,16)+".zip",
    sha256:digest,signerFingerprint:pubfp};
}
async function verify(mediaBuffer,record){
  try{
    const item=typeof record==="string"?JSON.parse(record):record;
    const p=item?.payload;
    if(p?.format!=="EZERO_SIGNED_MEDIA_EVIDENCE_V1"||
      p?.signatureScheme!=="ECDSA_P256_SHA256"||
      JSON.stringify(p)!==item.signedPayloadUtf8)return false;
    const bytes=mediaBuffer instanceof Uint8Array?mediaBuffer:new Uint8Array(mediaBuffer);
    if(p.media.sizeBytes!==bytes.length)return false;
    if(hex(await crypto.subtle.digest("SHA-256",bytes))!==p.media.sha256)return false;
    const pub=unb64(p.signerPublicKeySpkiBase64url);
    if(hex(await crypto.subtle.digest("SHA-256",pub))!==p.signerKeySha256)return false;
    const key=await crypto.subtle.importKey("spki",pub,
      {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    return await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,
      unb64(item.signatureBase64url),ENCODER.encode(item.signedPayloadUtf8));
  }catch(_){return false;}
}
// Tab close discards the transient media buffers. Only an explicitly
// downloaded ZIP can outlive the 10-minute browser memory window.
window.addEventListener("pagehide",clearAll);
window.EZERO_SIGNED_MEDIA_EVIDENCE=Object.freeze({
  offer,list,onChange:cb=>{watchers.add(cb);cb(list());return()=>watchers.delete(cb);},
  expire,clearAll,downloadOriginal,packageEvidence,verify
});
})();