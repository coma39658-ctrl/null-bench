import assert from "node:assert/strict";
import {verifyWebAuthnES256AssertionLabV1 as verify} from
 "../secure_connect/pair_v1/webauthn_assertion_verify_lab_v0_1.mjs";
import {PAIR_V1_ORIGIN,PAIR_V1_RP_ID} from
 "../secure_connect/pair_v1/pair_policy_v1.mjs";
const te=new TextEncoder();
const b64=b=>{let s="";for(const n of b)s+=String.fromCharCode(n);
 return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");};
const bytes=x=>new Uint8Array(x);
function lenDer(n){return n<128?bytes([n]):null;}
function intDer(input){
 let i=0;while(i<input.length-1&&input[i]===0)i++;
 const trimmed=input.slice(i);
 const num=(trimmed[0]&0x80)?bytes([0,...trimmed]):trimmed;
 return bytes([2,num.length,...num]);
}
function toDer(raw){
 const r=intDer(raw.slice(0,32)),s=intDer(raw.slice(32));
 return bytes([0x30,r.length+s.length,...r,...s]);
}
const keys=await crypto.subtle.generateKey(
 {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const attacker=await crypto.subtle.generateKey(
 {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const spki=bytes(await crypto.subtle.exportKey("spki",keys.publicKey));
const rpHash=bytes(await crypto.subtle.digest("SHA-256",te.encode(PAIR_V1_RP_ID)));
const accountId="account_test_001",cred="cred-es256-key-A",now=Date.now();
const challenge=b64(crypto.getRandomValues(new Uint8Array(32)));
const credRecord={
 status:"ACTIVE",revoked:false,accountId,credentialId:cred,rpId:PAIR_V1_RP_ID,
 publicKeySpki:b64(spki),alg:-7,signCount:1
};
const pending={
 accountId,credentialId:cred,purpose:"PAIR_OR_RECONNECT",consumed:false,
 value:challenge,issued:now,expires:now+60_000
};
const concat=(a,b)=>bytes([...a,...b]);
async function assertionOf({
 clientOverride={},rp=rpHash,flags=0x05,count=2,
 signer=keys,wrongType=false,mutateSig=false
}={}){
 const client={type:"webauthn.get",challenge,origin:PAIR_V1_ORIGIN,
  crossOrigin:false,...clientOverride};
 const rawClient=te.encode(JSON.stringify(client));
 const auth=bytes([...rp,flags,(count>>>24)&255,(count>>>16)&255,
  (count>>>8)&255,count&255]);
 const digest=bytes(await crypto.subtle.digest("SHA-256",rawClient));
 const raw=bytes(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
  signer.privateKey,concat(auth,digest)));
 const der=toDer(raw);
 if(mutateSig)der[der.length-1]^=1;
 return {
  id:cred,type:wrongType?"password":"public-key",
  clientDataJSON:b64(rawClient),authenticatorData:b64(auth),signature:b64(der)
 };
}
const good=await assertionOf();
const base={assertion:good,credentialRecord:credRecord,
 pendingChallenge:pending,expectedAccountId:accountId,now};
const success=await verify(base);
assert.deepEqual({
 ok:success.ok,code:success.code,authorized:success.authorized,
 challengeConsumed:success.challengeConsumed,nextSignCount:success.nextSignCount
},{ok:true,code:"ASSERTION_SIGNATURE_VALID_LAB",authorized:false,
 challengeConsumed:false,nextSignCount:2});
console.log("WEBAUTHN_ES256_REAL_DER_SIGNATURE_CHALLENGE_RP_ORIGIN_UV: PASS");
async function deny(o,expected){
 const result=await verify({...base,...o});
 assert.equal(result.ok,false,expected);
 assert.equal(result.authorized,false,expected);
 assert.equal(result.code,expected);
}
await deny({assertion:await assertionOf({clientOverride:{challenge:b64(bytes([1,2,3]))}})},
 "CHALLENGE_MISMATCH");
await deny({assertion:await assertionOf({clientOverride:{type:"webauthn.create"}})},
 "CHALLENGE_MISMATCH");
await deny({assertion:await assertionOf({clientOverride:{origin:"https://attacker.invalid"}})},
 "ORIGIN_NOT_ALLOWED");
await deny({assertion:await assertionOf({clientOverride:{origin:PAIR_V1_ORIGIN+"/null-bench/"}})},
 "ORIGIN_NOT_ALLOWED");
await deny({assertion:await assertionOf({clientOverride:{crossOrigin:true}})},
 "ORIGIN_NOT_ALLOWED");
await deny({assertion:await assertionOf({clientOverride:{topOrigin:"https://attacker.invalid"}})},
 "ORIGIN_NOT_ALLOWED");
await deny({assertion:await assertionOf({clientOverride:{tokenBinding:{status:"present"}}})},
 "CLIENT_DATA_UNSUPPORTED");
await deny({assertion:await assertionOf({rp:bytes(new Uint8Array(32))})},
 "RP_ID_HASH_MISMATCH");
await deny({assertion:await assertionOf({flags:0x01})},
 "USER_VERIFICATION_REQUIRED");
await deny({assertion:await assertionOf({flags:0x04})},
 "USER_VERIFICATION_REQUIRED");
await deny({assertion:await assertionOf({flags:0x15})},
 "AUTHENTICATOR_FLAGS_UNSUPPORTED");
await deny({assertion:await assertionOf({flags:0x45})},
 "AUTHENTICATOR_FLAGS_UNSUPPORTED");
await deny({assertion:await assertionOf({count:1})},
 "SIGN_COUNT_REPLAY_OR_CLONE_SIGNAL");
await deny({assertion:await assertionOf({count:0})},
 "SIGN_COUNT_REPLAY_OR_CLONE_SIGNAL");
await deny({assertion:await assertionOf({signer:attacker})},
 "SIGNATURE_INVALID");
await deny({assertion:await assertionOf({mutateSig:true})},
 "SIGNATURE_INVALID");
await deny({assertion:await assertionOf({wrongType:true})},
 "CREDENTIAL_ID_MISMATCH");
await deny({assertion:{...good,id:"different-key"}},
 "CREDENTIAL_ID_MISMATCH");
await deny({assertion:{...good,userHandle:"someuser"}},
 "CREDENTIAL_ID_MISMATCH");
await deny({assertion:{...good,signature:b64(bytes([0x30,0]))}},
 "SIGNATURE_FORMAT_OR_KEY_INVALID");
await deny({assertion:{...good,authenticatorData:"not valid encoding!"}},
 "ASSERTION_INVALID_ENCODING");
await deny({assertion:{...good,clientDataJSON:"A".repeat(6000)}},
 "ASSERTION_INVALID_ENCODING");
await deny({credentialRecord:{...credRecord,alg:-257}},
 "CREDENTIAL_POLICY_INVALID");
await deny({credentialRecord:{...credRecord,rpId:"attacker.invalid"}},
 "CREDENTIAL_POLICY_INVALID");
await deny({credentialRecord:{...credRecord,status:"REVOKED"}},
 "CREDENTIAL_NOT_TRUSTED");
await deny({credentialRecord:{...credRecord,revoked:true}},
 "CREDENTIAL_NOT_TRUSTED");
await deny({credentialRecord:{...credRecord,accountId:"another_account"}},
 "CREDENTIAL_NOT_TRUSTED");
await deny({credentialRecord:{...credRecord,signCount:3}},
 "SIGN_COUNT_REPLAY_OR_CLONE_SIGNAL");
await deny({pendingChallenge:{...pending,consumed:true}},
 "CHALLENGE_NOT_AUTHORIZED");
await deny({pendingChallenge:{...pending,purpose:"ECU_WRITE"}},
 "CHALLENGE_NOT_AUTHORIZED");
await deny({pendingChallenge:{...pending,accountId:"another_account"}},
 "CHALLENGE_NOT_AUTHORIZED");
await deny({pendingChallenge:{...pending,credentialId:"different-credential"}},
 "CHALLENGE_NOT_AUTHORIZED");
await deny({pendingChallenge:{...pending,value:"abc"}},
 "ASSERTION_INVALID_ENCODING");
await deny({pendingChallenge:{...pending,expires:now}},
 "CHALLENGE_EXPIRED");
await deny({pendingChallenge:{...pending,expires:now+91_000}},
 "CHALLENGE_EXPIRED");
await deny({expectedAccountId:"wrong_account_001"},
 "CREDENTIAL_NOT_TRUSTED");
console.log("WEBAUTHN_LAB_FORGED_SIG_ORIGIN_RP_UV_REVOKED_REPLAY_EXPIRY_REJECTED: PASS");
assert.equal(success.authorized,false);
assert.equal(success.challengeConsumed,false);
console.log("WEBAUTHN_LAB_NOT_A_LOGIN_SESSION_NOT_AN_ACCOUNT_REGISTRATION: PASS");
