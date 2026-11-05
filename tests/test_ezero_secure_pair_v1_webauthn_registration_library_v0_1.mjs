import assert from "node:assert/strict";
import {makeRegistrationOptionsLab,verifyRegistrationResponseLab}
 from "../secure_connect/pair_v1/webauthn_registration_library_lab_v0_1.mjs";
import {PAIR_V1_RP_ID,PAIR_V1_ORIGIN}
 from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const te=new TextEncoder();
const u8=x=>new Uint8Array(x);
const b64=x=>{let str="";for(const v of x)str+=String.fromCharCode(v);
 return btoa(str).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
function h(major,n){
 if(n<24)return [major*32+n];
 if(n<256)return [major*32+24,n];
 if(n<65536)return [major*32+25,n>>8,n&255];
 throw Error("LAB_CBOR_TOO_LARGE");
}
function cbor(x){
 if(Number.isInteger(x)&&x>=0)return h(0,x);
 if(Number.isInteger(x)&&x<0)return h(1,-1-x);
 if(typeof x==="string"){
  const b=te.encode(x);return [...h(3,b.length),...b];
 }
 if(x instanceof Uint8Array)return [...h(2,x.length),...x];
 if(x instanceof Map){
  let r=h(5,x.size);
  for(const [k,v] of x){r.push(...cbor(k),...cbor(v));}return r;
 }
 throw Error("LAB_CBOR_INVALID_TYPE");
}
const now=Date.now(),accountId="account_test_001";
const opaqueUser=crypto.getRandomValues(new Uint8Array(32));
const optionsCreated=await makeRegistrationOptionsLab({
 accountId,userHandle:opaqueUser,now
});
assert.equal(optionsCreated.ok,true);
assert.equal(optionsCreated.authorized,false);
const {options,pending}=optionsCreated;
assert.equal(options.rp.id,PAIR_V1_RP_ID);
assert.ok(options.pubKeyCredParams.every(x=>x.alg===-7));
assert.equal(options.authenticatorSelection.userVerification,"required");
assert.equal(pending.expires-now,90_000);
assert.equal(pending.consumed,false);
assert.notEqual(options.challenge,"");
assert.ok(options.challenge.length>=32);
assert.equal((await makeRegistrationOptionsLab({
 accountId,userHandle:new Uint8Array(2),now})).ok,false);
assert.equal((await makeRegistrationOptionsLab({
 accountId:"user!",userHandle:opaqueUser,now})).ok,false);
console.log("WEBAUTHN_REGISTRATION_OPTIONS_STRICT_RPID_ES256_UV_SERVER_CONTEXT: PASS");
// Make an explicitly synthetic "fmt:none" authenticator response. This
// asserts browser/RP/challenge/COSE policy parsing by the trusted library;
// it is NOT a real hardware biometric/attestation or installed credential.
const keys=await crypto.subtle.generateKey(
 {name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
const jwk=await crypto.subtle.exportKey("jwk",keys.publicKey);
const from64=s=>u8(Uint8Array.from(
 atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),
 x=>x.charCodeAt(0)));
const rawId=crypto.getRandomValues(new Uint8Array(32));
const cose=u8(cbor(new Map([
 [1,2],[3,-7],[-1,1],[-2,from64(jwk.x)],[-3,from64(jwk.y)]
])));
const hash=async text=>u8(await crypto.subtle.digest("SHA-256",te.encode(text)));
const aaguid=new Uint8Array(16);
function makeResponse({origin=PAIR_V1_ORIGIN,challenge=options.challenge,
 rpId=PAIR_V1_RP_ID,flags=0x45,type="webauthn.create"}={}){
 const auth=u8([...crypto.getRandomValues(new Uint8Array(0)),...new Uint8Array(0)]);
 const data=u8([...te.encode("unused")]); // intentionally local only, not returned
 const client=te.encode(JSON.stringify({type,challenge,origin,crossOrigin:false}));
 const rpHashBytes=rpId===PAIR_V1_RP_ID?null:null;
 return {client,flags,rpId};
}
async function syntheticResponse({
 origin=PAIR_V1_ORIGIN,challenge=options.challenge,rp=PAIR_V1_RP_ID,
 flags=0x45,type="webauthn.create"
}={}){
 const rpHash=u8(await crypto.subtle.digest("SHA-256",te.encode(rp)));
 const auth=u8([...rpHash,flags,0,0,0,1,...aaguid,0,rawId.length,...rawId,...cose]);
 const attObject=u8(cbor(new Map([
  ["fmt","none"],["attStmt",new Map()],["authData",auth]
 ])));
 const client=te.encode(JSON.stringify({type,challenge,origin,crossOrigin:false}));
 return {
  id:b64(rawId),rawId:b64(rawId),type:"public-key",
  response:{clientDataJSON:b64(client),attestationObject:b64(attObject),transports:["internal"]},
  clientExtensionResults:{},authenticatorAttachment:"platform"
 };
}
const verified=await verifyRegistrationResponseLab({
 response:await syntheticResponse(),pending,serverAccountId:accountId,now
});
assert.equal(verified.ok,true,JSON.stringify({code:verified.code}));
assert.equal(verified.code,"REGISTRATION_CRYPTO_VALID_LAB");
assert.equal(verified.authorized,false);
assert.equal(verified.challengeConsumed,false);
assert.equal(verified.credentialPersisted,false);
assert.equal(verified.credentialId,b64(rawId));
assert.ok(verified.publicKeyCose instanceof Uint8Array);
console.log("WEBAUTHN_REGISTRATION_SYNTHETIC_NONE_CBOR_VALIDATION: PASS");
async function reject(args,label){
 const v=await verifyRegistrationResponseLab({
 response:await syntheticResponse(),
 pending,serverAccountId:accountId,now,...args
 });
 assert.equal(v.ok,false,label);
 assert.equal(v.authorized,false,label);
 return v.code;
}
assert.equal(await reject({response:await syntheticResponse({origin:"https://attack.invalid"})}),
 "REGISTRATION_SIGNATURE_OR_POLICY_INVALID");
assert.equal(await reject({response:await syntheticResponse({challenge:"wrong"})}),
 "REGISTRATION_SIGNATURE_OR_POLICY_INVALID");
assert.equal(await reject({response:await syntheticResponse({rp:"attacker.invalid"})}),
 "REGISTRATION_SIGNATURE_OR_POLICY_INVALID");
assert.equal(await reject({response:await syntheticResponse({flags:0x41})}),
 "REGISTRATION_SIGNATURE_OR_POLICY_INVALID");
assert.equal(await reject({response:await syntheticResponse({type:"webauthn.get"})}),
 "REGISTRATION_SIGNATURE_OR_POLICY_INVALID");
assert.equal(await reject({pending:{...pending,consumed:true}}),
 "REGISTRATION_CHALLENGE_INVALID");
assert.equal(await reject({pending:{...pending,expires:now}}),
 "REGISTRATION_CHALLENGE_INVALID");
assert.equal(await reject({pending:{...pending,purpose:"ECU_CONTROL"}}),
 "REGISTRATION_CHALLENGE_INVALID");
assert.equal(await reject({serverAccountId:"different_account_001"}),
 "REGISTRATION_CHALLENGE_INVALID");
assert.equal(await reject({response:{id:"forged",type:"public-key",response:{attestationObject:"bad",clientDataJSON:"bad"}}}),
 "REGISTRATION_SIGNATURE_OR_POLICY_INVALID");
console.log("WEBAUTHN_REGISTRATION_ORIGIN_RP_CHALLENGE_UV_REPLAY_AND_OBD_DENIED: PASS");
console.log("WEBAUTHN_REGISTRATION_LAB_NEVER_ISSUES_ACCOUNT_AUTH_OR_DEVICE_TRUST: PASS");
