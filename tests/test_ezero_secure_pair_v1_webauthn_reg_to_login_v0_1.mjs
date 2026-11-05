/*
 * Synthetic passkey registration → COSE storage shape → genuine ES256 login.
 * Uses SimpleWebAuthn verification for BOTH ceremonies. Not a real phone.
 * Never issues authenticated account session or trusted device admission.
 */
import assert from "node:assert/strict";
import {makeRegistrationOptionsLab,verifyRegistrationResponseLab}
 from "../secure_connect/pair_v1/webauthn_registration_library_lab_v0_1.mjs";
import {makeAuthenticationOptionsLabV1,verifyAuthenticationResponseLabV1}
 from "../secure_connect/pair_v1/webauthn_authentication_library_lab_v0_1.mjs";
import {PAIR_V1_ORIGIN,PAIR_V1_RP_ID}
 from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const te=new TextEncoder();
const u8=a=>new Uint8Array(a);
const b64=b=>{let x="";for(const n of b)x+=String.fromCharCode(n);
 return btoa(x).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const decode=s=>u8(Uint8Array.from(atob(s.replace(/-/g,"+")
 .replace(/_/g,"/")+"=".repeat((4-s.length%4)%4)),c=>c.charCodeAt(0)));
function header(major,n){
 if(n<24)return[major*32+n];
 if(n<256)return[major*32+24,n];
 if(n<65536)return[major*32+25,n>>8,n&255];
 throw Error("CBOR_LENGTH_UNSUPPORTED");
}
function cbor(x){
 if(Number.isInteger(x))return x<0?header(1,-1-x):header(0,x);
 if(typeof x==="string"){const raw=te.encode(x);return [...header(3,raw.length),...raw];}
 if(x instanceof Uint8Array)return [...header(2,x.length),...x];
 if(x instanceof Map){
  let out=header(5,x.size);
  for(const [k,v] of x)out.push(...cbor(k),...cbor(v));
  return out;
 }
 throw Error("CBOR_UNSUPPORTED_TYPE");
}
function derInt(raw){
 let i=0;while(i<raw.length-1&&raw[i]===0)i++;
 const r=raw.slice(i),v=(r[0]&128)?u8([0,...r]):r;
 return u8([2,v.length,...v]);
}
function toDer(raw){const a=derInt(raw.slice(0,32)),b=derInt(raw.slice(32));
 return u8([0x30,a.length+b.length,...a,...b]);
}
const hash=async x=>u8(await crypto.subtle.digest("SHA-256",x));
const rpHash=await hash(te.encode(PAIR_V1_RP_ID));
const now=Date.now(),accountId="account_test_001";
const keys=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
 true,["sign","verify"]);
const evil=await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},
 true,["sign","verify"]);
const jwk=await crypto.subtle.exportKey("jwk",keys.publicKey);
const cose=u8(cbor(new Map([
 [1,2],[3,-7],[-1,1],[-2,decode(jwk.x)],[-3,decode(jwk.y)]
])));
const rawId=crypto.getRandomValues(new Uint8Array(32));
const id=b64(rawId),aaguid=new Uint8Array(16);
const created=await makeRegistrationOptionsLab({
 accountId,userHandle:crypto.getRandomValues(new Uint8Array(32)),now
});
assert.equal(created.ok,true);
const registrationChallenge=created.pending.challenge;
const registrationAuth=u8([...rpHash,0x45,0,0,0,1,...aaguid,
 0,rawId.length,...rawId,...cose]);
const attestation=u8(cbor(new Map([
 ["fmt","none"],["attStmt",new Map()],["authData",registrationAuth]
])));
const registrationClient=te.encode(JSON.stringify({
 type:"webauthn.create",challenge:registrationChallenge,
 origin:PAIR_V1_ORIGIN,crossOrigin:false
}));
const regRes={
 id,rawId:id,type:"public-key",
 response:{clientDataJSON:b64(registrationClient),
 attestationObject:b64(attestation),transports:["internal"]},
 clientExtensionResults:{},authenticatorAttachment:"platform"
};
const registration=await verifyRegistrationResponseLab({
 response:regRes,pending:created.pending,serverAccountId:accountId,now
});
assert.equal(registration.ok,true,registration.code);
assert.equal(registration.authorized,false);
const record={
 accountId,credentialId:id,publicKeyCoseB64:b64(registration.publicKeyCose),
 signCount:registration.counter,alg:-7,rpId:PAIR_V1_RP_ID,
 status:"ACTIVE",revoked:false,transports:["internal"]
};
assert.ok(record.publicKeyCoseB64.length>70);
const authOptions=await makeAuthenticationOptionsLabV1({
 accountId,registeredCredentials:[record],now
});
assert.equal(authOptions.ok,true,authOptions.code);
assert.equal(authOptions.options.rpId,PAIR_V1_RP_ID);
assert.equal(authOptions.options.userVerification,"required");
assert.deepEqual(authOptions.options.allowCredentials.map(c=>c.id),[id]);
async function assertion({
 origin=PAIR_V1_ORIGIN,challenge=authOptions.pending.challenge,
 rp=rpHash,flags=0x05,counter=2,signer=keys,type="webauthn.get",
 crossOrigin=false,addTopOrigin=false
}={}){
 const client=te.encode(JSON.stringify({
  type,challenge,origin,crossOrigin,
  ...(addTopOrigin?{topOrigin:"https://attacker.invalid"}:{})
 }));
 const authenticator=u8([...rp,flags,(counter>>>24)&255,
  (counter>>>16)&255,(counter>>>8)&255,counter&255]);
 const digest=await hash(client);
 const signed=u8([...authenticator,...digest]);
 const sig=u8(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
  signer.privateKey,signed));
 return {
  id,rawId:id,type:"public-key",
  response:{clientDataJSON:b64(client),authenticatorData:b64(authenticator),
   signature:b64(toDer(sig)),userHandle:null},
  clientExtensionResults:{}
 };
}
const validAssertion=await assertion();
const base={response:validAssertion,pending:authOptions.pending,
 credentialRecord:record,serverAccountId:accountId,now};
const result=await verifyAuthenticationResponseLabV1(base);
assert.equal(result.ok,true,JSON.stringify({code:result.code}));
assert.equal(result.authorized,false);
assert.equal(result.challengeConsumed,false);
assert.equal(result.counterPersisted,false);
assert.equal(result.authenticatedSessionIssued,false);
assert.equal(result.nextSignCount,2);
console.log("PASSKEY_REGISTRATION_COSE_TO_AUTHENTICATION_REAL_ES256_LIBRARY: PASS");
async function reject(override,expected){
 const r=await verifyAuthenticationResponseLabV1({...base,...override});
 assert.equal(r.ok,false,expected);
 assert.equal(r.authorized,false,expected);
 assert.equal(r.code,expected,JSON.stringify({actual:r.code,expected}));
}
await reject({response:await assertion({origin:"https://attacker.invalid"})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
await reject({response:await assertion({type:"webauthn.create"})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
await reject({response:await assertion({crossOrigin:true})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
await reject({response:await assertion({addTopOrigin:true})},
 "AUTH_ORIGIN_OR_TYPE_REJECTED");
for(const opts of [
 {challenge:b64(crypto.getRandomValues(new Uint8Array(32)))},
 {rp:await hash(te.encode("attacker.invalid"))},
 {flags:0x01},{flags:0x04},
 {counter:1},{signer:evil}
])await reject({response:await assertion(opts)},"AUTH_SIGNATURE_OR_POLICY_INVALID");
await reject({pending:{...authOptions.pending,consumed:true}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({pending:{...authOptions.pending,expires:now}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({pending:{...authOptions.pending,purpose:"ECU_WRITE"}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({pending:{...authOptions.pending,allowedCredentials:["other"]}},
 "AUTH_CHALLENGE_EXPIRED_OR_UNBOUND");
await reject({credentialRecord:{...record,status:"REVOKED"}},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({credentialRecord:{...record,revoked:true}},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({credentialRecord:{...record,accountId:"another_account"}},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({credentialRecord:{...record,publicKeyCoseB64:"INVALID!"}},
 "AUTH_SIGNATURE_OR_POLICY_INVALID");
await reject({serverAccountId:"attacker_account"},
 "CREDENTIAL_NOT_ACTIVE_OR_BOUND");
await reject({response:{...validAssertion,id:"wrong_credential"}},
 "AUTH_RESPONSE_INVALID");
await reject({response:{...validAssertion,rawId:"wrong_credential"}},
 "AUTH_RESPONSE_INVALID");
console.log("PASSKEY_ACCOUNT_ORIGIN_RPID_UV_SIGNATURE_REPLAY_REVOKE_ADVERSARIAL: PASS");
console.log("PASSKEY_LIBRARY_LAB_NO_REAL_LOGIN_COOKIE_OR_TRUSTED_DEVICE_PERMISSION: PASS");
