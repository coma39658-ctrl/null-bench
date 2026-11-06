import assert from "node:assert/strict";
import {
 PAIR_V1_ORIGIN,PAIR_V1_RP_ID,PAIR_V1_QR_MAX_MS,parsePairQr,
 pairApprovalText,verifyRegisteredDeviceApproval,verifyAccountPasskeyNotYetImplemented
} from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const now=Date.now(),digest=async b=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",b))]
 .map(v=>v.toString(16).padStart(2,"0")).join("");
const qr={
 v:1,type:"EZERO_SECURE_PAIR_V1",purpose:"PAIR",sid:"1".repeat(32),
 nonce:"2".repeat(32),origin:PAIR_V1_ORIGIN,
 aKeyHash:"a".repeat(64),issued:now,expires:now+90_000
};
assert.equal(PAIR_V1_RP_ID,"coma39658-ctrl.github.io");
assert.equal(PAIR_V1_QR_MAX_MS,90_000);
assert.equal(parsePairQr(JSON.stringify(qr),now).sid,qr.sid);
function bad(change,code){
 const candidate={...qr,...change};
 assert.throws(()=>parsePairQr(JSON.stringify(candidate),now),
  e=>e?.message===code,JSON.stringify(change));
}
bad({origin:"https://attacker.invalid"},"ORIGIN_NOT_ALLOWED");
bad({purpose:"OBD_CONTROL"},"QR_WRONG_PURPOSE");
bad({type:"EZERO_REMOTE_ECU_WRITE"},"QR_WRONG_PURPOSE");
bad({expires:now-1},"QR_EXPIRED_OR_INVALID_TTL");
bad({expires:now+91_000},"QR_EXPIRED_OR_INVALID_TTL");
bad({issued:now+40_000,expires:now+90_000},"QR_EXPIRED_OR_INVALID_TTL");
bad({nonce:"guess"},"QR_INVALID_RANDOMNESS_OR_KEY");
bad({sid:"x"},"QR_INVALID_RANDOMNESS_OR_KEY");
bad({aKeyHash:"0"},"QR_INVALID_RANDOMNESS_OR_KEY");
bad({privateKey:"SHOULD_BE_REJECTED"},"QR_INVALID_FIELDS");
bad({bio:"FaceID"},"QR_INVALID_FIELDS");
assert.throws(()=>parsePairQr("A".repeat(1025),now),/QR_INVALID_SIZE/);
assert.throws(()=>parsePairQr("not JSON",now),/QR_INVALID_SIZE|QR_INVALID_JSON/);
console.log("PAIR_V1_90S_STRICT_QR_NO_PRIVATE_KEYS_NO_CROSS_ORIGIN: PASS");
const keysA=await crypto.subtle.generateKey(
 {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const keysB=await crypto.subtle.generateKey(
 {name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const pubA=new Uint8Array(await crypto.subtle.exportKey("spki",keysA.publicKey));
const pubB=new Uint8Array(await crypto.subtle.exportKey("spki",keysB.publicKey));
const fpA=await digest(pubA),fpB=await digest(pubB);
const accountId="account_test_001";
const approval={sid:qr.sid,nonce:qr.nonce,accountId,
 selfKeyHash:fpA,peerKeyHash:fpB,expires:now+60_000,decision:"APPROVE"};
const txt=pairApprovalText(approval);
const signature=new Uint8Array(await crypto.subtle.sign(
 {name:"ECDSA",hash:"SHA-256"},keysA.privateKey,new TextEncoder().encode(txt)));
assert.equal(signature.length,64);
const good={registeredSpki:pubA,registeredDeviceKeyHash:fpA,
 signature,approval,now,accountFromRegistry:accountId};
assert.deepEqual(await verifyRegisteredDeviceApproval(good),{
 ok:true,code:"DEVICE_SIGNATURE_VALID"
});
async function deny(extra,code){const result=await verifyRegisteredDeviceApproval({...good,...extra});
 assert.equal(result.ok,false,code);assert.equal(result.code,code);}
await deny({signature:new Uint8Array(await crypto.subtle.sign(
 {name:"ECDSA",hash:"SHA-256"},keysB.privateKey,new TextEncoder().encode(txt)))
},"DEVICE_SIGNATURE_INVALID");
await deny({registeredSpki:pubB},"DEVICE_KEY_MISMATCH");
await deny({approval:{...approval,accountId:"other_account_001"}},"ACCOUNT_BINDING_FAILED");
await deny({approval:{...approval,peerKeyHash:"f".repeat(64)}},"DEVICE_SIGNATURE_INVALID");
await deny({approval:{...approval,nonce:"3".repeat(32)}},"DEVICE_SIGNATURE_INVALID");
await deny({approval:{...approval,decision:"REJECT"}},"DEVICE_SIGNATURE_INVALID");
await deny({approval:{...approval,expires:now-1}},"APPROVAL_EXPIRED");
await deny({recordRevoked:true},"DEVICE_REVOKED");
await deny({accountFromRegistry:null},"ACCOUNT_BINDING_FAILED");
assert.throws(()=>pairApprovalText({...approval,purpose:"ECU_WRITE"}),/APPROVAL_INVALID_FIELDS/);
console.log("PAIR_V1_REAL_DEVICE_ECDSA_SIGNED_ACCOUNT_PEER_SESSION_EXPIRES_AND_REVOKED: PASS");
// No passkey verifier is shipped. Reject "verified:true" from arbitrary input,
// including a supposedly valid origin or biometric claim.
for(const bogus of [
 {verified:true,origin:PAIR_V1_ORIGIN,rpId:PAIR_V1_RP_ID},
 {verified:true,origin:"https://evil.invalid",rpId:PAIR_V1_RP_ID},
 {verified:true,origin:PAIR_V1_ORIGIN,rpId:"evil.invalid"},
 {signature:"forged",verified:true,biometric:true}
]){
 const r=verifyAccountPasskeyNotYetImplemented(bogus);
 assert.equal(r.ok,false);
 assert.equal(r.code,"WEBAUTHN_SERVER_VERIFIER_NOT_IMPLEMENTED");
}
console.log("PAIR_V1_WEBAUTHN_CRYPTO_NOT_IMPLEMENTED_FAIL_CLOSED: PASS");
console.log("PAIR_V1_ACCOUNT_DEVICE_TRANSPORT_NOT_CONFUSED_NO_OBD_AUTH: PASS");
