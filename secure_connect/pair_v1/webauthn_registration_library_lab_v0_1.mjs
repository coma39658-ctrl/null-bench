/*
 * E-ZERO Secure Pair V1 — vetted WebAuthn registration library adapter, LAB.
 * Requires @simplewebauthn/server@14.0.3, installed ONLY in CI lab for now.
 * This file is not imported by any public browser, Worker, or deployed server.
 *
 * Server/account prerequisites still MISSING: verified account onboarding,
 * per-account opaque userHandle stored in a trusted registry, one-time durable
 * challenge handling, credential uniqueness and actual device consent.
 * The adapter NEVER creates active accounts, device trust or an auth session.
 */
import {generateRegistrationOptions,verifyRegistrationResponse}
 from "@simplewebauthn/server";
import {PAIR_V1_ORIGIN,PAIR_V1_RP_ID}
 from "./pair_policy_v1.mjs";
const ACCOUNT=/^[A-Za-z0-9_-]{12,64}$/;
const B64=/^[A-Za-z0-9_-]{32,128}$/;
const MAX_AGE_MS=90_000;
const deny=code=>Object.freeze({ok:false,authorized:false,code});
const asPublic=b=>new Uint8Array(b);
const validUserHandle=handle=>handle instanceof Uint8Array&&
 handle.length>=16&&handle.length<=64;
export async function makeRegistrationOptionsLab({
 accountId,userHandle,existingCredentialIds=[],now=Date.now()
}={}){
 if(!ACCOUNT.test(accountId||"")||!validUserHandle(userHandle)||
    !Number.isSafeInteger(now)||now<=0||!Array.isArray(existingCredentialIds)||
    existingCredentialIds.length>25||existingCredentialIds.some(
      x=>typeof x!=="string"||!/^[A-Za-z0-9_-]{16,256}$/.test(x)))
  return deny("UNTRUSTED_SERVER_ACCOUNT_CONTEXT");
 try{
  // Values MUST come from server account DB, not a browser body.
  const options=await generateRegistrationOptions({
   rpName:"E-ZERO Secure Pair",rpID:PAIR_V1_RP_ID,
   userName:accountId,userID:asPublic(userHandle),
   userDisplayName:"E-ZERO",
   attestationType:"none",
   supportedAlgorithmIDs:[-7], // ES256 only in the restricted pilot
   authenticatorSelection:{residentKey:"preferred",userVerification:"required"},
   excludeCredentials:existingCredentialIds.map(id=>({id})),
   timeout:MAX_AGE_MS
  });
  const challenge=options.challenge;
  if(typeof challenge!=="string"||!B64.test(challenge))
   return deny("REGISTRATION_OPTIONS_FAILED");
  return Object.freeze({
   ok:true,authorized:false,code:"REGISTRATION_OPTIONS_CREATED_LAB",
   options,
   pending:Object.freeze({
    accountId,challenge,issued:now,expires:now+MAX_AGE_MS,
    purpose:"WEBAUTHN_REGISTER",consumed:false
   })
  });
 }catch(_){return deny("REGISTRATION_OPTIONS_FAILED");}
}
export async function verifyRegistrationResponseLab({
 response,pending,serverAccountId,now=Date.now()
}={}){
 // The challenge record is independently server-stored. A true boolean from
 // a web client is meaningless; CBOR/attestation must verify cryptographically.
 if(!ACCOUNT.test(serverAccountId||"")||!pending||
    pending.accountId!==serverAccountId||pending.purpose!=="WEBAUTHN_REGISTER"||
    pending.consumed!==false||!Number.isSafeInteger(now)||
    !Number.isSafeInteger(pending.issued)||!Number.isSafeInteger(pending.expires)||
    pending.issued>now+30_000||pending.expires<=now||
    pending.expires<=pending.issued||pending.expires-pending.issued>MAX_AGE_MS||
    typeof pending.challenge!=="string"||!B64.test(pending.challenge))
  return deny("REGISTRATION_CHALLENGE_INVALID");
 if(!response||response.type!=="public-key"||
    typeof response.id!=="string"||response.id.length>256||
    typeof response.response?.attestationObject!=="string"||
    response.response.attestationObject.length>24000||
    typeof response.response?.clientDataJSON!=="string"||
    response.response.clientDataJSON.length>8192)
  return deny("REGISTRATION_RESPONSE_INVALID");
 try{
  const checked=await verifyRegistrationResponse({
   response,
   expectedChallenge:pending.challenge,
   expectedOrigin:PAIR_V1_ORIGIN,
   expectedRPID:PAIR_V1_RP_ID,
   supportedAlgorithmIDs:[-7],
   requireUserPresence:true,
   requireUserVerification:true
  });
  const info=checked?.registrationInfo;
  const credential=info?.credential;
  if(checked.verified!==true||!credential||
     credential.id!==response.id||
     !(credential.publicKey instanceof Uint8Array)||
     credential.publicKey.length>512||
     !Number.isSafeInteger(credential.counter))
   return deny("REGISTRATION_NOT_VERIFIED");
  return Object.freeze({
   ok:true,authorized:false,code:"REGISTRATION_CRYPTO_VALID_LAB",
   credentialId:credential.id,
   publicKeyCose:new Uint8Array(credential.publicKey),
   counter:credential.counter,
   credentialDeviceType:info.credentialDeviceType,
   credentialBackedUp:info.credentialBackedUp,
   challengeConsumed:false,credentialPersisted:false
  });
 }catch(_){return deny("REGISTRATION_SIGNATURE_OR_POLICY_INVALID");}
}
