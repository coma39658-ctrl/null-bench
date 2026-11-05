/*
 * E-ZERO Secure Pair V1 — WebAuthn authentication with vetted COSE verifier,
 * isolated CRYPTO LAB ONLY. Uses the exact COSE bytes produced by the
 * restricted registration verifier, not an unsafe COSE→SPKI guess.
 *
 * All records must come from an independently authenticated server-side
 * account registry. This module DOES NOT issue a login cookie/token or grant
 * Trusted Device, call, camera, microphone or ECU access. Challenge consume
 * and counter updates must be atomic and durable BEFORE any session issuance.
 */
import {generateAuthenticationOptions,verifyAuthenticationResponse}
 from "@simplewebauthn/server";
import {PAIR_V1_ORIGIN,PAIR_V1_RP_ID} from "./pair_policy_v1.mjs";
const ACCOUNT=/^[A-Za-z0-9_-]{12,64}$/;
const CRED=/^[A-Za-z0-9_-]{16,256}$/;
const B64=/^[A-Za-z0-9_-]+$/;
const TTL_MS=90_000;
const deny=code=>Object.freeze({ok:false,authorized:false,code});
function bytesOf(s,max=512){
 if(typeof s!=="string"||!B64.test(s)||
    s.length>Math.ceil(max*4/3)+4)throw Error("COSE_INVALID");
 const str=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
 if(str.length<32||str.length>max)throw Error("COSE_INVALID");
 const bytes=Uint8Array.from(str,c=>c.charCodeAt(0));
 let base="";for(const b of bytes)base+=String.fromCharCode(b);
 if(btoa(base).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"")!==s)
  throw Error("COSE_NONCANONICAL");
 return bytes;
}
function validRecord(record,accountId){
 return record&&record.accountId===accountId&&record.status==="ACTIVE"&&
  record.revoked!==true&&record.alg===-7&&
  record.rpId===PAIR_V1_RP_ID&&CRED.test(record.credentialId||"")&&
  Number.isSafeInteger(record.signCount)&&record.signCount>=0&&
  record.signCount<=0xffffffff&&
  typeof record.publicKeyCoseB64==="string"&&
  (!record.transports||Array.isArray(record.transports)&&
   record.transports.length<=5&&record.transports.every(x=>
    ["usb","nfc","ble","internal","hybrid"].includes(x)));
}
export async function makeAuthenticationOptionsLabV1({
 accountId,registeredCredentials,now=Date.now()
}={}){
 // This operation is restricted to a server-owned authenticated account
 // context. No untrusted client-supplied allowCredentials or account IDs.
 if(!ACCOUNT.test(accountId||"")||!Number.isSafeInteger(now)||
    !Array.isArray(registeredCredentials)||registeredCredentials.length<1||
    registeredCredentials.length>25||
    registeredCredentials.some(r=>!validRecord(r,accountId)))
  return deny("REGISTERED_CREDENTIALS_REQUIRED");
 try{
  const options=await generateAuthenticationOptions({
   rpID:PAIR_V1_RP_ID,timeout:TTL_MS,userVerification:"required",
   allowCredentials:registeredCredentials.map(r=>({
    id:r.credentialId,...(r.transports?{transports:r.transports}:{})
   }))
  });
  if(typeof options.challenge!=="string"||!B64.test(options.challenge))
   return deny("AUTHENTICATION_OPTIONS_FAILED");
  return Object.freeze({
   ok:true,authorized:false,code:"AUTH_OPTIONS_CREATED_LAB",options,
   pending:Object.freeze({
    accountId,challenge:options.challenge,
    allowedCredentials:registeredCredentials.map(r=>r.credentialId),
    issued:now,expires:now+TTL_MS,
    purpose:"WEBAUTHN_AUTHENTICATE",consumed:false
   })
  });
 }catch(_){return deny("AUTHENTICATION_OPTIONS_FAILED");}
}
export async function verifyAuthenticationResponseLabV1({
 response,pending,credentialRecord,serverAccountId,now=Date.now()
}={}){
 if(!ACCOUNT.test(serverAccountId||"")||
    !validRecord(credentialRecord,serverAccountId))
  return deny("CREDENTIAL_NOT_ACTIVE_OR_BOUND");
 if(!pending||pending.accountId!==serverAccountId||
    pending.purpose!=="WEBAUTHN_AUTHENTICATE"||
    pending.consumed!==false||!Array.isArray(pending.allowedCredentials)||
    !pending.allowedCredentials.includes(credentialRecord.credentialId)||
    !Number.isSafeInteger(now)||!Number.isSafeInteger(pending.issued)||
    !Number.isSafeInteger(pending.expires)||
    pending.issued>now+30_000||pending.expires<=now||
    pending.expires<=pending.issued||
    pending.expires-pending.issued>TTL_MS||
    typeof pending.challenge!=="string"||!B64.test(pending.challenge))
  return deny("AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
 if(!response||response.type!=="public-key"||
    response.id!==credentialRecord.credentialId||
    response.rawId!==undefined&&response.rawId!==response.id||
    typeof response.response?.clientDataJSON!=="string"||
    typeof response.response?.authenticatorData!=="string"||
    typeof response.response?.signature!=="string"||
    response.response.clientDataJSON.length>8192||
    response.response.authenticatorData.length>4096||
    response.response.signature.length>2048)
  return deny("AUTH_RESPONSE_INVALID");
 try{
  // Extra restrictive policy for this restricted lab: no delegated /
  // cross-origin authentication; the vetted verifier checks signature,
  // challenge, rpIdHash, user presence/verification and counter semantics.
  const raw=response.response.clientDataJSON;
  const data=new TextDecoder("utf-8",{fatal:true}).decode(bytesOf(raw,4096));
  const client=JSON.parse(data);
  if(client?.type!=="webauthn.get"||client?.origin!==PAIR_V1_ORIGIN||
     client.crossOrigin===true||client.topOrigin!==undefined)
   return deny("AUTH_ORIGIN_OR_TYPE_REJECTED");
  const key=bytesOf(credentialRecord.publicKeyCoseB64);
  const checked=await verifyAuthenticationResponse({
   response,expectedChallenge:pending.challenge,
   expectedOrigin:PAIR_V1_ORIGIN,expectedRPID:PAIR_V1_RP_ID,
   credential:{
    id:credentialRecord.credentialId,
    publicKey:key,counter:credentialRecord.signCount,
    transports:credentialRecord.transports
   },
   requireUserVerification:true
  });
  if(checked.verified!==true||!checked.authenticationInfo||
     !Number.isSafeInteger(checked.authenticationInfo.newCounter))
   return deny("AUTH_VERIFICATION_FAILED");
  return Object.freeze({
   ok:true,authorized:false,code:"PASSKEY_ASSERTION_VERIFIED_LAB",
   credentialId:credentialRecord.credentialId,
   nextSignCount:checked.authenticationInfo.newCounter,
   accountId:serverAccountId,
   challengeConsumed:false,counterPersisted:false,
   authenticatedSessionIssued:false
  });
 }catch(_){return deny("AUTH_SIGNATURE_OR_POLICY_INVALID");}
}
