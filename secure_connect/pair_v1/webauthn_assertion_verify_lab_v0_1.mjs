/*
 * E-ZERO Secure Pair V1 — restricted WebAuthn ES256 ASSERTION verifier LAB.
 *
 * Verifies a WebAuthn authentication assertion against SERVER-OWNED challenge
 * and credential records. Does not register credentials, create accounts,
 * grant sessions, or consume a challenge: all four are separately required.
 * NEVER take credentialRecord/pendingChallenge from an untrusted browser.
 * Use a reviewed WebAuthn library before production; this deliberately
 * rejects extension-bearing or attested authenticator data and unknown algs.
 */
import {PAIR_V1_ORIGIN,PAIR_V1_RP_ID} from "./pair_policy_v1.mjs";
export const WEBAUTHN_LAB_MAX_CHALLENGE_MS=90_000;
const A=/^[a-zA-Z0-9_-]{12,64}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const encoder=new TextEncoder();
function denied(code){return Object.freeze({ok:false,authorized:false,code});}
function equal(a,b){
 if(a.length!==b.length)return false;
 let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];
 return mismatch===0;
}
function base64url(bytes){let str="";for(const n of bytes)str+=String.fromCharCode(n);
 return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function decodeB64(s,max){
 if(typeof s!=="string"||!B64.test(s)||s.length>Math.ceil(max*4/3)+4)
  throw Error("INVALID_ENCODING");
 const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
 if(raw.length<1||raw.length>max)throw Error("INVALID_ENCODING");
 const result=Uint8Array.from(raw,c=>c.charCodeAt(0));
 if(base64url(result)!==s)throw Error("NONCANONICAL_ENCODING");
 return result;
}
function keySigDerToRaw(der){
 // FIDO ES256 signatures are ASN.1 DER encoded ECDSA. WebCrypto expects
 // IEEE-P1363 (r || s). Reject ambiguous/overlong/non-minimal ASN.1.
 if(der.length<8||der.length>72||der[0]!==0x30||der[1]!==der.length-2)
  throw Error("DER_INVALID");
 let at=2;
 const components=[];
 for(let i=0;i<2;i++){
  if(der[at++]!==0x02)throw Error("DER_INVALID");
  const size=der[at++];
  if(size<1||size>33||at+size>der.length)throw Error("DER_INVALID");
  const input=der.slice(at,at+size);at+=size;
  if((input[0]&0x80)!==0)throw Error("DER_INVALID"); // negative
  if(input.length>1&&input[0]===0&&!(input[1]&0x80))
    throw Error("DER_INVALID"); // unnecessary zero
  const trimmed=input.length===33?input.slice(1):input;
  if(trimmed.length>32||trimmed.every(b=>b===0))throw Error("DER_INVALID");
  const padded=new Uint8Array(32);padded.set(trimmed,32-trimmed.length);
  components.push(padded);
 }
 if(at!==der.length)throw Error("DER_INVALID");
 const result=new Uint8Array(64);result.set(components[0]);result.set(components[1],32);
 return result;
}
function uint32(b){return ((b[0]*0x1000000)+(b[1]<<16)+(b[2]<<8)+b[3])>>>0;}
export async function verifyWebAuthnES256AssertionLabV1({
 assertion,credentialRecord,pendingChallenge,expectedAccountId,now=Date.now()
}={}){
 // This function is a CRYPTO verifier only; the SERVER must enforce
 // session/account authority, registration provenance, atomic challenge
 // consume, credential counter update and device permissions separately.
 if(!A.test(expectedAccountId||"")||!Number.isSafeInteger(now))
  return denied("ACCOUNT_CONTEXT_MISSING");
 if(!credentialRecord||credentialRecord.status!=="ACTIVE"||
    credentialRecord.revoked===true||credentialRecord.accountId!==expectedAccountId)
  return denied("CREDENTIAL_NOT_TRUSTED");
 if(!pendingChallenge||pendingChallenge.accountId!==expectedAccountId||
    pendingChallenge.credentialId!==credentialRecord.credentialId||
    pendingChallenge.purpose!=="PAIR_OR_RECONNECT"||
    pendingChallenge.consumed!==false)
  return denied("CHALLENGE_NOT_AUTHORIZED");
 const issued=pendingChallenge.issued,expires=pendingChallenge.expires;
 if(!Number.isSafeInteger(issued)||!Number.isSafeInteger(expires)||
    issued>now+30_000||expires<=now||expires<=issued||
    expires-issued>WEBAUTHN_LAB_MAX_CHALLENGE_MS)
  return denied("CHALLENGE_EXPIRED");
 if(credentialRecord.rpId!==PAIR_V1_RP_ID||
    credentialRecord.alg!==-7||!Number.isSafeInteger(credentialRecord.signCount)||
    credentialRecord.signCount<0||credentialRecord.signCount>0xffffffff)
  return denied("CREDENTIAL_POLICY_INVALID");
 if(!assertion||assertion.id!==credentialRecord.credentialId||
    assertion.type!=="public-key"||assertion.userHandle!=null)
  return denied("CREDENTIAL_ID_MISMATCH");
 let bytes,auth,signature,spki,challenge,client;
 try{
  bytes=decodeB64(assertion.clientDataJSON,4096);
  auth=decodeB64(assertion.authenticatorData,1024);
  signature=decodeB64(assertion.signature,100);
  spki=decodeB64(credentialRecord.publicKeySpki,200);
  challenge=decodeB64(pendingChallenge.value,64);
  if(challenge.length!==32||auth.length!==37)
    return denied("ASSERTION_UNSUPPORTED_ENCODING");
  client=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));
  if(!client||typeof client!=="object"||Array.isArray(client))
    return denied("CLIENT_DATA_INVALID");
 }catch(_){return denied("ASSERTION_INVALID_ENCODING");}
 if(client.type!=="webauthn.get"||
    client.challenge!==pendingChallenge.value)
  return denied("CHALLENGE_MISMATCH");
 if(client.origin!==PAIR_V1_ORIGIN||client.crossOrigin!==false&&client.crossOrigin!==undefined||
    client.topOrigin!==undefined)
  return denied("ORIGIN_NOT_ALLOWED");
 // Reject any potentially risky token binding/unknown cross-origin policy.
 if(client.tokenBinding!==undefined)return denied("CLIENT_DATA_UNSUPPORTED");
 const expectedRpHash=new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(PAIR_V1_RP_ID)));
 if(!equal(auth.slice(0,32),expectedRpHash))
  return denied("RP_ID_HASH_MISMATCH");
 const flags=auth[32];
 const present=(flags&1)!==0,verified=(flags&4)!==0,
  be=(flags&8)!==0,bs=(flags&16)!==0;
 // Require user present and verified; disallow reserved/unsupported flags,
 // AT/ED and malformed BE/BS combinations for this restricted V1 lab.
 if(!present||!verified)return denied("USER_VERIFICATION_REQUIRED");
 if((flags&(2|32|64|128))!==0||(bs&&!be))
  return denied("AUTHENTICATOR_FLAGS_UNSUPPORTED");
 const count=uint32(auth.slice(33,37)),prev=credentialRecord.signCount;
 if((count!==0||prev!==0)&&count<=prev)
  return denied("SIGN_COUNT_REPLAY_OR_CLONE_SIGNAL");
 let sigRaw,pub;
 try{
  sigRaw=keySigDerToRaw(signature);
  pub=await crypto.subtle.importKey("spki",spki,
   {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
 }catch(_){return denied("SIGNATURE_FORMAT_OR_KEY_INVALID");}
 const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
 const signed=new Uint8Array(auth.length+digest.length);
 signed.set(auth);signed.set(digest,auth.length);
 let ok=false;
 try{ok=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,sigRaw,signed);}
 catch(_){return denied("SIGNATURE_INVALID");}
 if(!ok)return denied("SIGNATURE_INVALID");
 return Object.freeze({
  ok:true,authorized:false,code:"ASSERTION_SIGNATURE_VALID_LAB",
  accountId:expectedAccountId,
  credentialId:credentialRecord.credentialId,
  nextSignCount:count,
  backupEligible:be,backedUp:bs,
  challengeConsumed:false,
  // No permission/registered device state is derived here. The *server* must
  // use a trusted atomic challenge ledger and separately verify both devices.
 });
}
