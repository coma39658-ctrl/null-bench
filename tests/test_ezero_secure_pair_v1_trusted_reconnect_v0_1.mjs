import assert from "node:assert/strict";
import {
 RECONNECT_PROOF_TTL_MS,reconnectTranscriptV1,
 verifyReconnectDeviceProofsV1,LocalReplayGateForTestsV1
} from "../secure_connect/pair_v1/trusted_reconnect_proof_v0_1.mjs";
import {verifyAccountPasskeyNotYetImplemented}
 from "../secure_connect/pair_v1/pair_policy_v1.mjs";
const hash=async v=>[...new Uint8Array(await crypto.subtle.digest("SHA-256",v))]
 .map(b=>b.toString(16).padStart(2,"0")).join("");
const key=()=>crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
const a=await key(),b=await key(),attacker=await key();
const spkiA=new Uint8Array(await crypto.subtle.exportKey("spki",a.publicKey));
const spkiB=new Uint8Array(await crypto.subtle.exportKey("spki",b.publicKey));
const fpA=await hash(spkiA),fpB=await hash(spkiB),now=Date.now();
const accountId="account_test_001";
const t={
 v:1,purpose:"RECONNECT",sessionId:"a".repeat(32),serverNonce:"b".repeat(32),
 aNonce:"c".repeat(32),bNonce:"d".repeat(32),accountId,aKeyHash:fpA,
 bKeyHash:fpB,issued:now,expires:now+60_000
};
const A={status:"ACTIVE",revoked:false,accountId,keyHash:fpA,publicSpki:spkiA,deviceId:"PHONE_A"};
const B={status:"ACTIVE",revoked:false,accountId,keyHash:fpB,publicSpki:spkiB,deviceId:"PHONE_B"};
const sign=async(k,fields)=>new Uint8Array(await crypto.subtle.sign(
 {name:"ECDSA",hash:"SHA-256"},k.privateKey,
 new TextEncoder().encode(reconnectTranscriptV1(fields,now))));
const signatureA=await sign(a,t),signatureB=await sign(b,t);
let data={transcript:t,signatureA,signatureB,registryA:A,registryB:B,now};
const ok=await verifyReconnectDeviceProofsV1(data);
assert.deepEqual(ok,{ok:true,code:"BOTH_DEVICE_SIGNATURES_VALID",
 authorized:false,serverChallengeConsumed:false});
assert.equal(RECONNECT_PROOF_TTL_MS,90_000);
console.log("V1_TWO_INDEPENDENT_DEVICE_KEYS_SIGN_EXACT_RECONNECT_CONTEXT: PASS");
async function deny(change,code){
 const got=await verifyReconnectDeviceProofsV1({...data,...change});
 assert.deepEqual({ok:got.ok,code:got.code,authorized:got.authorized},
  {ok:false,code,authorized:false});
}
const wrongSig=await sign(attacker,t);
await deny({signatureA:wrongSig},"A_SIGNATURE_INVALID");
await deny({signatureB:wrongSig},"B_SIGNATURE_INVALID");
await deny({signatureA:signatureB},"A_SIGNATURE_INVALID");
await deny({signatureB:signatureA},"B_SIGNATURE_INVALID");
await deny({registryA:{...A,status:"REVOKED"}},"A_DEVICE_REVOKED_OR_UNREGISTERED");
await deny({registryB:{...B,revoked:true}},"B_DEVICE_REVOKED_OR_UNREGISTERED");
await deny({registryB:{...B,accountId:"other_account_01"}},"B_REGISTRY_BINDING_FAILED");
await deny({registryA:{...A,keyHash:"f".repeat(64)}},"A_REGISTRY_BINDING_FAILED");
await deny({registryA:{...A,publicSpki:spkiB}},"A_REGISTRY_BINDING_FAILED");
await deny({registryB:{...B,deviceId:"PHONE_A"}},"SAME_DEVICE_NOT_ALLOWED");
await deny({registryA:null},"A_DEVICE_REVOKED_OR_UNREGISTERED");
await deny({signatureA:new Uint8Array([1,2,3])},"A_DEVICE_PROOF_INVALID");
await deny({signatureB:"not bytes"},"B_DEVICE_PROOF_INVALID");
await deny({transcript:{...t,serverNonce:"e".repeat(32)}},
 "A_SIGNATURE_INVALID");
await deny({transcript:{...t,aNonce:"e".repeat(32)}},
 "A_SIGNATURE_INVALID");
await deny({transcript:{...t,bNonce:"e".repeat(32)}},
 "A_SIGNATURE_INVALID");
await deny({transcript:{...t,sessionId:"f".repeat(32)}},
 "A_SIGNATURE_INVALID");
await deny({transcript:{...t,expires:now+30_000}},
 "A_SIGNATURE_INVALID");
await deny({transcript:{...t,aKeyHash:fpB,bKeyHash:fpA}},
 "A_REGISTRY_BINDING_FAILED");
await deny({transcript:{...t,purpose:"OBD_CONTROL"}},
 "TRANSCRIPT_INVALID_OR_EXPIRED");
await deny({transcript:{...t,expires:now+90_001}},
 "TRANSCRIPT_INVALID_OR_EXPIRED");
await deny({transcript:{...t,expires:now-1}},
 "TRANSCRIPT_INVALID_OR_EXPIRED");
await deny({transcript:{...t,issued:now+40_000}},
 "TRANSCRIPT_INVALID_OR_EXPIRED");
await deny({transcript:{...t,privateKey:"NEVER"}}, 
 "TRANSCRIPT_INVALID_OR_EXPIRED");
await deny({transcript:{...t,serverNonce:"predictable"}},
 "TRANSCRIPT_INVALID_OR_EXPIRED");
await deny({transcript:{...t,aKeyHash:fpA,bKeyHash:fpA}},
 "TRANSCRIPT_INVALID_OR_EXPIRED");
assert.throws(()=>reconnectTranscriptV1({...t,purpose:"ECU_WRITE"},now),
 /TRANSCRIPT_INVALID_OR_EXPIRED/);
console.log("V1_RECONNECT_REVOKED_WRONG_ACCOUNT_KEY_ROLE_NONCE_TTL_CROSS_PURPOSE: PASS");
const replay=new LocalReplayGateForTestsV1();
const first=replay.consume(t.sessionId,t.serverNonce);
assert.equal(first.ok,true);
assert.equal(first.authorized,false);
const again=replay.consume(t.sessionId,t.serverNonce);
assert.deepEqual(again,{ok:false,code:"REPLAY_REJECTED",authorized:false});
assert.equal(replay.consume(t.sessionId,"e".repeat(32)).ok,true);
assert.equal(replay.consume("weak",t.serverNonce).ok,false);
// No ACCOUNT or SESSION authority is conferred by replay gate nor crypto.
// An actual WebAuthn server verifier is still unavailable and fail closed.
assert.equal(verifyAccountPasskeyNotYetImplemented({verified:true}).ok,false);
assert.equal(ok.authorized,false);
console.log("V1_RECONNECT_REPLAY_REJECTED_TEST_ONLY_NO_FAKE_PASSKEY_OR_ECU_PERMISSION: PASS");
