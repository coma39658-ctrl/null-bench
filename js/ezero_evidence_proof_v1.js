/* E-ZERO Evidence Export V1 — isolated, offline, explicitly user initiated.
 * SHA-256 + self-signed P-256 device signature + two-entry uncompressed ZIP.
 * No hidden recording, remote upload, private-key export, server archive,
 * claim of human identity, trusted timestamp or legal admissibility.
 */
(()=>{"use strict";
const VERSION="EZERO_EVIDENCE_V1";
const LIMIT=32*1024*1024, WINDOW=600000;
const PROOF_NAME="E-ZERO-EVIDENCE.json";
const DB="ezero_evidence_self_signing_key_v1",STORE="key",ID="local";
const encoder=new TextEncoder(), decoder=new TextDecoder("utf-8",{fatal:true});
function error(code){return Error(code);}
function check(yes,code){if(!yes)throw error(code);}
function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");}
function base64(bytes){let raw="";for(const n of bytes)raw+=String.fromCharCode(n);
  return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");}
function unbase64(text){check(typeof text==="string"&&/^[\w-]+$/.test(text)&&text.length<=512,"BAD_BASE64");
  let t=text.replace(/-/g,"+").replace(/_/g,"/");t+="=".repeat((4-t.length%4)%4);
  return Uint8Array.from(atob(t),x=>x.charCodeAt(0));}
async function hash(buffer){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",buffer)));}
function safeName(name){
  const n=String(name||"evidence.bin").normalize("NFC").replace(/[\/\\\x00-\x1f\x7f]/g,"_").trim().slice(0,100);
  check(n!=="."&&n!==".."&&n.length>0,"BAD_FILENAME");return n;
}
function validBlob(blob){check(blob&&Number.isSafeInteger(blob.size)&&blob.size>=0&&
  blob.size<=LIMIT&&typeof blob.arrayBuffer==="function","MEDIA_SIZE_OR_TYPE_UNSUPPORTED");}
function openDb(){return new Promise((resolve,reject)=>{
  check(typeof indexedDB!=="undefined","INDEXEDDB_REQUIRED");
  const r=indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE);};
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(error("KEY_STORAGE_UNAVAILABLE"));
  r.onblocked=()=>reject(error("KEY_STORAGE_BLOCKED"));
});}
async function keyRecord(){
  const db=await openDb();
  try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite"),store=tx.objectStore(STORE);
    let row;const request=store.get(ID);
    request.onsuccess=async()=>{ // await inside IDB transaction would close it; create a new transaction instead
      row=request.result||null;
    };
    tx.oncomplete=()=>resolve(row);
    tx.onerror=()=>reject(error("KEY_READ_FAILED"));
    tx.onabort=()=>reject(error("KEY_READ_ABORTED"));
  });}finally{db.close();}
}
async function storeKey(row){
  const db=await openDb();
  try{await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(row,ID);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(error("KEY_WRITE_FAILED"));
    tx.onabort=()=>reject(error("KEY_WRITE_ABORTED"));
  });}finally{db.close();}
}
async function getSigner(){
  check(crypto?.subtle,"CRYPTO_UNAVAILABLE");
  let row=await keyRecord();
  if(!row){
    const pair=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
    check(pair.privateKey.extractable===false,"KEY_MUST_BE_NONEXTRACTABLE");
    const spki=new Uint8Array(await crypto.subtle.exportKey("spki",pair.publicKey));
    row={pair,spki:base64(spki),keyId:await hash(spki)};
    await storeKey(row);
  }
  check(row.pair?.privateKey?.extractable===false&&
    row.pair.privateKey.algorithm?.name==="ECDSA"&&
    row.pair.privateKey.algorithm?.namedCurve==="P-256"&&
    typeof row.spki==="string"&&/^[a-f0-9]{64}$/.test(row.keyId),"KEY_RECORD_INVALID");
  check(await hash(unbase64(row.spki))===row.keyId,"KEY_FINGERPRINT_MISMATCH");
  return row;
}
function exactKeys(value,keys){
  check(value&&typeof value==="object"&&!Array.isArray(value)&&
    Object.keys(value).length===keys.length&&
    keys.every(k=>Object.prototype.hasOwnProperty.call(value,k)),
    "UNSIGNED_OR_MISSING_MANIFEST_FIELDS");
}
function statement(p){
  exactKeys(p,["version","file","source","localTime","clockStatus",
    "identityStatus","recordingStatus","thirdPartyTimestamp","retention","signature"]);
  exactKeys(p.file,["name","type","size","sha256"]);
  exactKeys(p.signature,["algorithm","publicKeySpki",
    "keyFingerprintSha256","value"]);
  check(p&&p.version===VERSION&&p.file&&
    typeof p.file.name==="string"&&p.file.name===safeName(p.file.name)&&
    typeof p.file.type==="string"&&p.file.type.length<=100&&
    Number.isSafeInteger(p.file.size)&&p.file.size>=0&&p.file.size<=LIMIT&&
    /^[a-f0-9]{64}$/.test(p.file.sha256||"")&&
    p.source==="USER_SELECTED_OR_CONSENT_EXPORTED_FILE"&&
    typeof p.localTime==="string"&&p.localTime.length<=40&&
    p.clockStatus==="UNTRUSTED_DEVICE_CLOCK"&&
    p.identityStatus==="SELF_SIGNED_DEVICE_KEY_NOT_HUMAN_ID"&&
    p.recordingStatus==="NOT_VERIFIED_BY_EXPORTER"&&
    p.thirdPartyTimestamp===null&&
    p.retention==="E_ZERO_SERVER_STORES_NO_MEDIA_BY_THIS_EXPORTER","BAD_MANIFEST");
  return [VERSION,p.file.name,p.file.type,String(p.file.size),p.file.sha256,
    p.source,p.localTime,p.clockStatus,p.identityStatus,p.recordingStatus,
    p.retention].join("\n");
}
async function createProof(blob,name,opts={}){
  validBlob(blob);
  check(opts?.userConsent===true,"EXPLICIT_EXPORT_CONSENT_REQUIRED");
  const data=await blob.arrayBuffer();
  const p={
    version:VERSION,
    file:{name:safeName(name),type:String(blob.type||"application/octet-stream").slice(0,100),
      size:blob.size,sha256:await hash(data)},
    source:"USER_SELECTED_OR_CONSENT_EXPORTED_FILE",
    localTime:new Date().toISOString(),
    clockStatus:"UNTRUSTED_DEVICE_CLOCK",
    identityStatus:"SELF_SIGNED_DEVICE_KEY_NOT_HUMAN_ID",
    recordingStatus:"NOT_VERIFIED_BY_EXPORTER",
    thirdPartyTimestamp:null,
    retention:"E_ZERO_SERVER_STORES_NO_MEDIA_BY_THIS_EXPORTER",
    signature:{algorithm:"ECDSA_P256_SHA256",publicKeySpki:"",
      keyFingerprintSha256:"",value:""}
  };
  const signer=await getSigner();
  const payload=encoder.encode(statement(p));
  const signature=new Uint8Array(await crypto.subtle.sign(
    {name:"ECDSA",hash:"SHA-256"},signer.pair.privateKey,payload));
  p.signature={algorithm:"ECDSA_P256_SHA256",publicKeySpki:signer.spki,
    keyFingerprintSha256:signer.keyId,value:base64(signature)};
  return {media:new Uint8Array(data),manifest:p};
}
async function verify(media,manifest){
  try{
    check(media instanceof Uint8Array&&media.length<=LIMIT,"INVALID_MEDIA");
    const p=typeof manifest==="string"?JSON.parse(manifest):manifest;
    const claimed=statement(p);
    check(media.byteLength===p.file.size,"SIZE_MISMATCH");
    check(await hash(media)===p.file.sha256,"SHA256_MISMATCH");
    const sig=p.signature;
    check(sig&&sig.algorithm==="ECDSA_P256_SHA256"&&
      /^[a-f0-9]{64}$/.test(sig.keyFingerprintSha256||""),"SIGNATURE_FIELDS_INVALID");
    const pub=unbase64(sig.publicKeySpki),value=unbase64(sig.value);
    check(await hash(pub)===sig.keyFingerprintSha256,"KEY_FINGERPRINT_MISMATCH");
    const key=await crypto.subtle.importKey("spki",pub,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
      key,value,encoder.encode(claimed));
    check(ok,"SIGNATURE_INVALID");
    return {ok:true,integrity:"PASS",signature:"PASS",time:"NOT_INDEPENDENTLY_VERIFIED",
      identity:"SELF_SIGNED_ONLY",source:"NOT_INDEPENDENTLY_VERIFIED",
      legalAdmissibility:"NOT_DETERMINED",sha256:p.file.sha256,
      keyFingerprintSha256:sig.keyFingerprintSha256};
  }catch(e){return {ok:false,integrity:"FAIL_OR_UNVERIFIED",
    signature:"FAIL_OR_UNVERIFIED",reason:String(e.message||"VERIFICATION_FAILED")};}
}
function crc32(data){
  let c=0xffffffff;
  for(const b of data){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^(c&1?0xedb88320:0);}
  return (c^0xffffffff)>>>0;
}
function u16(v,n,x){v.setUint16(n,x,true);}
function u32(v,n,x){v.setUint32(n,x,true);}
function zip(entries){
  const local=[],central=[];
  let offset=0,centralSize=0;
  for(const item of entries){
    const name=encoder.encode(item.name),data=item.data;
    check(name.length<256&&data.length<=LIMIT,"ZIP_LIMIT");
    const crc=crc32(data),l=new Uint8Array(30+name.length),v=new DataView(l.buffer);
    u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x0800);u16(v,8,0);
    u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,name.length);
    l.set(name,30);local.push(l,data);
    const c=new Uint8Array(46+name.length),cv=new DataView(c.buffer);
    u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);
    u16(cv,10,0);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);
    u16(cv,28,name.length);u32(cv,42,offset);c.set(name,46);
    central.push(c);offset+=l.length+data.length;centralSize+=c.length;
  }
  const end=new Uint8Array(22),ev=new DataView(end.buffer);
  u32(ev,0,0x06054b50);u16(ev,8,entries.length);u16(ev,10,entries.length);
  u32(ev,12,centralSize);u32(ev,16,offset);
  return new Blob([...local,...central,end],{type:"application/zip"});
}
function extract(zipData){
  check(zipData instanceof Uint8Array&&zipData.length<=LIMIT+32768,"ZIP_TOO_LARGE");
  const view=new DataView(zipData.buffer,zipData.byteOffset,zipData.byteLength);
  const found=new Map();let pos=0;
  for(let k=0;k<2;k++){
    check(pos+30<=zipData.length&&view.getUint32(pos,true)===0x04034b50,"ZIP_LOCAL_HEADER_BAD");
    const flags=view.getUint16(pos+6,true),method=view.getUint16(pos+8,true);
    const crc=view.getUint32(pos+14,true),compressed=view.getUint32(pos+18,true);
    const plain=view.getUint32(pos+22,true),nameLen=view.getUint16(pos+26,true);
    const extra=view.getUint16(pos+28,true);
    check(flags===0x0800&&method===0&&compressed===plain&&plain<=LIMIT&&
      nameLen>0&&nameLen<=256&&extra===0,"ZIP_FORMAT_UNSUPPORTED");
    const begin=pos+30,end=begin+nameLen,dataStart=end,dataEnd=dataStart+plain;
    check(dataEnd<=zipData.length,"ZIP_TRUNCATED");
    const name=decoder.decode(zipData.slice(begin,end));
    check(!found.has(name)&&
      (name===PROOF_NAME||name.startsWith("original/")),"ZIP_ENTRY_INVALID");
    const data=zipData.slice(dataStart,dataEnd);
    check(crc32(data)===crc,"ZIP_CRC_MISMATCH");
    found.set(name,{data,offset:pos,crc,size:plain});pos=dataEnd;
  }
  // Prevent ZIP parser differential attacks: a standard unzip tool must
  // see exactly the same two entries, in the same order/offsets, as our
  // verifier. Reject extra entries, comments, trailing bytes and ZIP64.
  const centralOffset=pos, endAt=zipData.length-22;
  check(endAt>centralOffset&&view.getUint32(endAt,true)===0x06054b50,
    "ZIP_END_MISSING");
  check(view.getUint16(endAt+4,true)===0&&view.getUint16(endAt+6,true)===0&&
    view.getUint16(endAt+8,true)===2&&view.getUint16(endAt+10,true)===2&&
    view.getUint16(endAt+20,true)===0&&
    view.getUint32(endAt+16,true)===centralOffset&&
    view.getUint32(endAt+12,true)===endAt-centralOffset,"ZIP_CENTRAL_MISMATCH");
  let cursor=centralOffset;
  for(const [expected,entry] of found){
    check(cursor+46<=endAt&&view.getUint32(cursor,true)===0x02014b50,
      "ZIP_CENTRAL_HEADER_BAD");
    const sizeName=view.getUint16(cursor+28,true);
    const extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true);
    check(view.getUint16(cursor+8,true)===0x0800&&
      view.getUint16(cursor+10,true)===0&&
      view.getUint32(cursor+16,true)===entry.crc&&
      view.getUint32(cursor+20,true)===entry.size&&
      view.getUint32(cursor+24,true)===entry.size&&
      view.getUint32(cursor+42,true)===entry.offset&&
      view.getUint16(cursor+34,true)===0&&
      sizeName>0&&sizeName<=256&&extra===0&&comment===0&&
      cursor+46+sizeName<=endAt,"ZIP_CENTRAL_METADATA_MISMATCH");
    check(decoder.decode(zipData.slice(cursor+46,cursor+46+sizeName))===expected,
      "ZIP_CENTRAL_FILENAME_MISMATCH");
    cursor+=46+sizeName;
  }
  check(cursor===endAt&&found.size===2&&found.has(PROOF_NAME),
    "ZIP_ENTRIES_INVALID");
  return new Map([...found].map(([name,entry])=>[name,entry.data]));
}
async function packageBlob(blob,name,opts={}){
  const {media,manifest}=await createProof(blob,name,opts);
  const proofBytes=encoder.encode(JSON.stringify(manifest,null,2)+"\n");
  const archive=zip([{name:"original/"+manifest.file.name,data:media},
    {name:PROOF_NAME,data:proofBytes}]);
  return {archive,manifest};
}
async function verifyArchive(blob){
  try{
    check(blob?.size<=LIMIT+32768&&typeof blob.arrayBuffer==="function","ZIP_FILE_INVALID");
    const entries=extract(new Uint8Array(await blob.arrayBuffer()));
    const p=JSON.parse(decoder.decode(entries.get(PROOF_NAME)));
    const filename="original/"+p?.file?.name;
    check(entries.has(filename),"ORIGINAL_MEDIA_MISSING");
    return await verify(entries.get(filename),p);
  }catch(e){return {ok:false,integrity:"FAIL_OR_UNVERIFIED",
    signature:"FAIL_OR_UNVERIFIED",reason:String(e.message||"ARCHIVE_INVALID")};}
}
function temporary(blob,name,receivedAt=Date.now()){
  validBlob(blob);
  check(Number.isSafeInteger(receivedAt)&&receivedAt<=Date.now()&&
    receivedAt>=Date.now()-WINDOW,"ALREADY_EXPIRED");
  let held=blob,deadline=receivedAt+WINDOW;
  const drop=()=>{held=null;};
  const clock=setTimeout(drop,Math.max(0,deadline-Date.now()));
  return Object.freeze({
    remainingMs(){return held?Math.max(0,deadline-Date.now()):0;},
    expired(){if(Date.now()>=deadline)drop();return !held;},
    discard(){drop();clearTimeout(clock);},
    async saveWithProof(){
      if(!held||Date.now()>=deadline){drop();throw error("TEN_MINUTE_WINDOW_EXPIRED");}
      const result=await packageBlob(held,name,{userConsent:true});
      // Check again: a slow device must never export after the deadline.
      if(!held||Date.now()>=deadline){drop();throw error("TEN_MINUTE_WINDOW_EXPIRED");}
      return result;
    }
  });
}
window.EZERO_EVIDENCE_V1=Object.freeze({
  version:VERSION,maxBytes:LIMIT,retentionWindowMs:WINDOW,
  packageBlob,verifyArchive,verify,temporary
});
})();
