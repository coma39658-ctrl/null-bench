#!/usr/bin/env node
/* E-ZERO Signed Media Evidence V1 — independent OFFLINE verifier.
 * No server, upload, private key, network, external dependencies, or writes.
 * Usage: node tools/verify_ezero_evidence_v1.cjs E-ZERO-*.zip
 * Integrity-only statement. Does not establish legal identity, authentic
 * capture, consent validity, trustworthy timestamps or court admissibility.
 */
"use strict";
const fs=require("node:fs");
const crypto=require("node:crypto");
const {TextDecoder}=require("node:util");
const MAX_ZIP=70*1024*1024,MAX_MEDIA=64*1024*1024;
const UTF=new TextDecoder("utf-8",{fatal:true});
const SHA=/^[a-f0-9]{64}$/,B64=/^[A-Za-z0-9_-]+$/;
const hash=data=>crypto.createHash("sha256").update(data).digest("hex");
function verifyAssertion(ok,reason){if(!ok)throw Error(reason);}
function utf8(data){return UTF.decode(data);}
function u16(buf,offset){verifyAssertion(offset+2<=buf.length,"ZIP_TRUNCATED");return buf.readUInt16LE(offset);}
function u32(buf,offset){verifyAssertion(offset+4<=buf.length,"ZIP_TRUNCATED");return buf.readUInt32LE(offset);}
let table=null;
function crc32(data){
  if(!table)table=Array.from({length:256},(_,idx)=>{
    let v=idx;for(let j=0;j<8;j++)v=(v&1)?0xedb88320^(v>>>1):v>>>1;
    return v>>>0;
  });
  let v=0xffffffff;for(const b of data)v=table[(v^b)&255]^(v>>>8);
  return (v^0xffffffff)>>>0;
}
function decodeB64(value,min,max,field){
  verifyAssertion(typeof value==="string"&&value.length>=min&&
    value.length<=max&&B64.test(value),field+"_INVALID");
  const buffer=Buffer.from(value,"base64url");
  verifyAssertion(buffer.toString("base64url")===value,field+"_NONCANONICAL");
  return buffer;
}
function parseZip(zip){
  verifyAssertion(Buffer.isBuffer(zip)&&zip.length>=22&&zip.length<=MAX_ZIP,
    "INVALID_ZIP_SIZE");
  const end=zip.length-22;
  verifyAssertion(u32(zip,end)===0x06054b50,"ZIP_END_MISSING");
  verifyAssertion(u16(zip,end+4)===0&&u16(zip,end+6)===0&&
    u16(zip,end+20)===0,"ZIP_MULTIDISK_OR_COMMENT_REJECTED");
  const count=u16(zip,end+10),dirCount=u16(zip,end+8);
  const dirSize=u32(zip,end+12),dirOffset=u32(zip,end+16);
  verifyAssertion(count===3&&dirCount===3,"ZIP_EXACTLY_THREE_FILES_REQUIRED");
  verifyAssertion(dirOffset+dirSize===end,"ZIP_DIRECTORY_BOUNDS");
  const files=new Map();
  const expectedLocal=new Map();
  let pos=0;
  for(let i=0;i<count;i++){
    verifyAssertion(u32(zip,pos)===0x04034b50,"ZIP_LOCAL_HEADER_MISSING");
    const flags=u16(zip,pos+6),method=u16(zip,pos+8);
    const crc=u32(zip,pos+14),size=u32(zip,pos+18),uncompressed=u32(zip,pos+22);
    const nameLen=u16(zip,pos+26),extraLen=u16(zip,pos+28);
    verifyAssertion(flags===0&&method===0&&size===uncompressed&&
      size<=MAX_MEDIA&&extraLen===0&&nameLen>0&&nameLen<=128,
      "ZIP_UNEXPECTED_COMPRESSION_OR_FIELDS");
    const nameBegin=pos+30,endName=nameBegin+nameLen,dataBegin=endName+extraLen;
    verifyAssertion(dataBegin+size<=dirOffset,"ZIP_DATA_OUT_OF_BOUNDS");
    const name=utf8(zip.subarray(nameBegin,endName));
    verifyAssertion((/^media\.[a-z0-9]{2,8}$/.test(name)||
      name==="evidence.json"||name==="READ_ME.txt")&&!files.has(name),
      "ZIP_UNEXPECTED_OR_DUPLICATE_FILE");
    const data=zip.subarray(dataBegin,dataBegin+size);
    verifyAssertion(crc32(data)===crc,"ZIP_CRC_FAILED");
    if(name==="evidence.json")verifyAssertion(size<=65536,"MANIFEST_TOO_LARGE");
    if(name==="READ_ME.txt")verifyAssertion(size<=16384,"NOTES_TOO_LARGE");
    files.set(name,data);
    expectedLocal.set(name,{pos,size,crc});
    pos=dataBegin+size;
  }
  verifyAssertion(pos===dirOffset,"ZIP_UNEXPECTED_BYTES_IN_BODY");
  let dir=dirOffset;
  for(let i=0;i<count;i++){
    verifyAssertion(u32(zip,dir)===0x02014b50,"ZIP_CENTRAL_HEADER_INVALID");
    const flags=u16(zip,dir+8),method=u16(zip,dir+10),crc=u32(zip,dir+16);
    const size=u32(zip,dir+20),nameLen=u16(zip,dir+28);
    const extra=u16(zip,dir+30),comment=u16(zip,dir+32);
    const localAt=u32(zip,dir+42);
    verifyAssertion(flags===0&&method===0&&extra===0&&comment===0&&
      nameLen>0&&nameLen<=128,"ZIP_CENTRAL_FIELDS_INVALID");
    const name=utf8(zip.subarray(dir+46,dir+46+nameLen));
    const local=expectedLocal.get(name);
    verifyAssertion(local&&local.pos===localAt&&local.size===size&&
      local.crc===crc,"ZIP_CENTRAL_MISMATCH");
    expectedLocal.delete(name);
    dir+=46+nameLen+extra+comment;
    verifyAssertion(dir<=end,"ZIP_CENTRAL_OVERRUN");
  }
  verifyAssertion(dir===end&&expectedLocal.size===0,"ZIP_CENTRAL_TRAILING_BYTES");
  verifyAssertion(files.has("evidence.json")&&files.has("READ_ME.txt"),
    "ZIP_MANIFEST_OR_NOTES_MISSING");
  return files;
}
function verifyArchive(zip){
  const files=parseZip(zip);
  const record=JSON.parse(utf8(files.get("evidence.json")));
  const payload=record?.payload;
  verifyAssertion(payload?.format==="EZERO_SIGNED_MEDIA_EVIDENCE_V1"&&
    payload?.signatureScheme==="ECDSA_P256_SHA256","WRONG_EVIDENCE_FORMAT");
  const signed=record.signedPayloadUtf8;
  verifyAssertion(typeof signed==="string"&&
    signed===JSON.stringify(payload),"SIGNED_PAYLOAD_MISMATCH");
  const filename=payload?.media?.filename;
  verifyAssertion(typeof filename==="string"&&
    /^media\.[a-z0-9]{2,8}$/.test(filename)&&files.has(filename),
    "MEDIA_FILE_NOT_PRESENT");
  const media=files.get(filename);
  verifyAssertion(media.length===payload.media.sizeBytes&&media.length>0,
    "MEDIA_SIZE_MISMATCH");
  verifyAssertion(SHA.test(payload.media.sha256)&&
    hash(media)===payload.media.sha256,"MEDIA_SHA256_FAILED");
  verifyAssertion(SHA.test(payload.signerKeySha256),
    "SIGNER_FINGERPRINT_INVALID");
  const publicSpki=decodeB64(payload.signerPublicKeySpkiBase64url,
    80,210,"PUBLIC_KEY");
  verifyAssertion(hash(publicSpki)===payload.signerKeySha256,
    "PUBLIC_KEY_SHA256_FAILED");
  const key=crypto.createPublicKey({key:publicSpki,format:"der",type:"spki"});
  verifyAssertion(key.asymmetricKeyType==="ec"&&
    key.asymmetricKeyDetails?.namedCurve==="prime256v1",
    "SIGNER_CURVE_NOT_P256");
  const signature=decodeB64(record.signatureBase64url,80,100,"SIGNATURE");
  verifyAssertion(signature.length===64,"ECDSA_P1363_LENGTH_INVALID");
  verifyAssertion(crypto.verify("sha256",Buffer.from(signed,"utf8"),
    {key,dsaEncoding:"ieee-p1363"},signature),"ECDSA_SIGNATURE_FAILED");
  return {
    status:"INTEGRITY_VERIFIED",
    mediaFilename:filename,mediaBytes:media.length,
    mediaSha256:payload.media.sha256,
    signerFingerprint:payload.signerKeySha256,
    source:payload.capture?.source||"UNKNOWN",
    consent:payload.capture?.consent||"NOT_ATTESTED",
    clockTrust:payload.export?.clockTrust||"UNVERIFIED",
    caveat:"No independent legal identity, recording authenticity, trusted timestamp, custody or court approval was established."
  };
}
module.exports={verifyArchive};
if(require.main===module){
  try{
    verifyAssertion(process.argv.length===3,
      "USAGE: node tools/verify_ezero_evidence_v1.cjs <evidence.zip>");
    const result=verifyArchive(fs.readFileSync(process.argv[2]));
    console.log(JSON.stringify(result,null,2));
  }catch(err){
    console.error("E-ZERO EVIDENCE VERIFICATION FAILED:",err.message);
    process.exitCode=1;
  }
}
