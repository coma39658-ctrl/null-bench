/*
 * E-ZERO Secure Pair V1 — standalone protocol primitives for LAB ONLY.
 * Not wired into any public app/Worker. This is NOT a WebAuthn verifier,
 * account system, trusted-device database or permission to access vehicle ECUs.
 * Server origin, account and registry decisions remain the trust boundary.
 */
export const PAIR_V1_ORIGIN="https://coma39658-ctrl.github.io";
export const PAIR_V1_RP_ID="coma39658-ctrl.github.io";
export const PAIR_V1_QR_MAX_MS=90_000;
const HEX32=/^[a-f0-9]{32}$/;
const HEX64=/^[a-f0-9]{64}$/;
const ACCOUNT=/^[a-zA-Z0-9_-]{12,64}$/;
const QR_KEYS=["aKeyHash","expires","issued","nonce","origin","purpose","sid","type","v"];
function fail(reason){throw Error(reason);}
function onlyKeys(obj,keys){
 return obj&&typeof obj==="object"&&!Array.isArray(obj)&&
  Object.keys(obj).sort().join("|")===keys.slice().sort().join("|");
}
function validTime(issued,expires,now){
 return Number.isSafeInteger(issued)&&Number.isSafeInteger(expires)&&
  Number.isSafeInteger(now)&&issued<=now+30000&&
  expires>now&&expires-issued>0&&expires-issued<=PAIR_V1_QR_MAX_MS;
}
function validHash(v){return typeof v==="string"&&HEX64.test(v);}
function validSid(v){return typeof v==="string"&&HEX32.test(v);}
function validNonce(v){return typeof v==="string"&&HEX32.test(v);}
export function parsePairQr(raw,now=Date.now()){
 if(typeof raw!=="string"||raw.length>1024||raw.length<100)fail("QR_INVALID_SIZE");
 let qr;try{qr=JSON.parse(raw);}catch(_){fail("QR_INVALID_JSON");}
 if(!onlyKeys(qr,QR_KEYS))fail("QR_INVALID_FIELDS");
 if(qr.v!==1||qr.type!=="EZERO_SECURE_PAIR_V1"||qr.purpose!=="PAIR")
  fail("QR_WRONG_PURPOSE");
 if(qr.origin!==PAIR_V1_ORIGIN)fail("ORIGIN_NOT_ALLOWED");
 if(!validSid(qr.sid)||!validNonce(qr.nonce)||!validHash(qr.aKeyHash))
  fail("QR_INVALID_RANDOMNESS_OR_KEY");
 if(!validTime(qr.issued,qr.expires,now))fail("QR_EXPIRED_OR_INVALID_TTL");
 return Object.freeze({...qr});
}
// The approval data must be identical on both sides. Never sign an
// unstructured "accept=true" message or re-use an unrelated call invite.
export function pairApprovalText({
 sid,nonce,accountId,selfKeyHash,peerKeyHash,expires,decision,purpose="PAIR"
}){
 if(!validSid(sid)||!validNonce(nonce)||!ACCOUNT.test(accountId||"")||
    !validHash(selfKeyHash)||!validHash(peerKeyHash)||
    selfKeyHash===peerKeyHash||!Number.isSafeInteger(expires)||
    !["APPROVE","REJECT"].includes(decision)||purpose!=="PAIR")
  fail("APPROVAL_INVALID_FIELDS");
 return ["EZERO-SECURE-PAIR-V1","PAIR",sid,nonce,accountId,
  selfKeyHash,peerKeyHash,String(expires),decision].join("\n");
}
function hex(array){return [...array].map(x=>x.toString(16).padStart(2,"0")).join("");}
export async function verifyRegisteredDeviceApproval({
 registeredSpki,registeredDeviceKeyHash,signature,approval,now=Date.now(),
 recordRevoked=false,accountFromRegistry=null
}){
 // Input must be supplied by the server's authenticated registry, not by the
 // webpage. This only checks a device signature; it does NOT approve pairing.
 if(recordRevoked===true)return {ok:false,code:"DEVICE_REVOKED"};
 if(!approval||!Number.isSafeInteger(now)||!Number.isSafeInteger(approval.expires)||
    now>=approval.expires||approval.expires-now>PAIR_V1_QR_MAX_MS)
  return {ok:false,code:"APPROVAL_EXPIRED"};
 if(typeof accountFromRegistry!=="string"||
    accountFromRegistry!==approval.accountId)
  return {ok:false,code:"ACCOUNT_BINDING_FAILED"};
 if(!validHash(registeredDeviceKeyHash)||approval.selfKeyHash!==registeredDeviceKeyHash)
  return {ok:false,code:"DEVICE_KEY_MISMATCH"};
 if(!(registeredSpki instanceof Uint8Array)||registeredSpki.length<60||
    registeredSpki.length>200||!(signature instanceof Uint8Array)||
    signature.length!==64)return {ok:false,code:"DEVICE_PROOF_INVALID"};
 try{
  const sum=await crypto.subtle.digest("SHA-256",registeredSpki);
  if(hex(new Uint8Array(sum))!==registeredDeviceKeyHash)
   return {ok:false,code:"DEVICE_KEY_MISMATCH"};
  const pub=await crypto.subtle.importKey("spki",registeredSpki,
   {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  const text=pairApprovalText(approval);
  const verified=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
   pub,signature,new TextEncoder().encode(text));
  return {ok:verified,code:verified?"DEVICE_SIGNATURE_VALID":"DEVICE_SIGNATURE_INVALID"};
 }catch(_){return {ok:false,code:"DEVICE_PROOF_INVALID"};}
}
// Deliberate release blocker: client-provided flags cannot substitute for
// complete WebAuthn verification of challenge, origin, rpIdHash, UV, COSE sig,
// credential binding, expiry and atomic replay. Use a vetted server verifier.
export function verifyAccountPasskeyNotYetImplemented(){
 return Object.freeze({ok:false,code:"WEBAUTHN_SERVER_VERIFIER_NOT_IMPLEMENTED"});
}
