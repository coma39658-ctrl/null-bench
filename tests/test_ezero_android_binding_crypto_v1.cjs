"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {webcrypto} = require("node:crypto");
const {issueChallenge, consumeApproval, ORIGIN} =
  require("../signaling/cloudflare/src/android_binding_ledger_core_v1.cjs");
const {verifyPermanentOwnerProof, verifyOwnerApprovalBundle} =
  require("../signaling/cloudflare/src/android_binding_crypto_v1.cjs");

class MemoryAtomicStorage {
  constructor(){this.data=new Map();this.tail=Promise.resolve();}
  async get(k){return this.data.get(k);}
  transaction(fn){
    const run=this.tail.then(async()=>{
      const staged=new Map(this.data);
      const tx={get:async k=>staged.get(k),put:async(k,v)=>staged.set(k,structuredClone(v))};
      const out=await fn(tx);this.data=staged;return out;
    });
    this.tail=run.catch(()=>{});return run;
  }
}
const b64 = bytes => Buffer.from(bytes).toString("base64url");
const fp = async bytes => Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256",bytes)),
  b=>b.toString(16).padStart(2,"0")).join("");

async function ownerFixture(){
  const pair=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  const spki=new Uint8Array(await webcrypto.subtle.exportKey("spki",pair.publicKey));
  const spki64=b64(spki), fingerprint=await fp(spki);
  const statement=["EZERO-PERMANENT-IDENTITY-1",ORIGIN,spki64,fingerprint].join("\n");
  const proof=b64(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},pair.privateKey,
    new TextEncoder().encode(statement)));
  return {pair,spki64,fingerprint,proof};
}
async function androidFixture(){
  const pair=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  const spki=new Uint8Array(await webcrypto.subtle.exportKey("spki",pair.publicKey));
  return {pair,spki64:b64(spki),fingerprint:await fp(spki)};
}
async function signedApproval(owner,request){
  const bytes=new TextEncoder().encode("EZERO-ANDROID-BIND-APPROVAL-1\n"+request.canonical);
  return b64(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},owner.pair.privateKey,bytes));
}

test("validates existing EZERO2 permanent proof and exact owner fingerprint",async()=>{
  const owner=await ownerFixture();
  const identity=await verifyPermanentOwnerProof({origin:ORIGIN,ownerSpkiBase64Url:owner.spki64,
    ownerFingerprint:owner.fingerprint,permanentProofBase64Url:owner.proof,cryptoImpl:webcrypto});
  assert.equal(identity.ownerFingerprint,owner.fingerprint);
});

test("rejects wrong origin, altered proof, and mismatched owner fingerprint",async()=>{
  const owner=await ownerFixture();
  const base={origin:ORIGIN,ownerSpkiBase64Url:owner.spki64,ownerFingerprint:owner.fingerprint,
    permanentProofBase64Url:owner.proof,cryptoImpl:webcrypto};
  await assert.rejects(verifyPermanentOwnerProof({...base,origin:"https://wrong.example"}),/WRONG_ORIGIN/);
  const altered=owner.proof.slice(0,-1)+(owner.proof.endsWith("A")?"B":"A");
  await assert.rejects(verifyPermanentOwnerProof({...base,permanentProofBase64Url:altered}),/INVALID_OWNER_PROOF|OWNER_PERMANENT_PROOF_INVALID/);
  await assert.rejects(verifyPermanentOwnerProof({...base,ownerFingerprint:"b".repeat(64)}),/FINGERPRINT_MISMATCH/);
});

test("verifies binding approval only with the same EZERO2 owner key",async()=>{
  const owner=await ownerFixture(),android=await androidFixture(),storage=new MemoryAtomicStorage();
  const request=await issueChallenge({storage,ownerFingerprint:owner.fingerprint,
    androidPublicKeySpkiBase64Url:android.spki64,androidFingerprint:android.fingerprint,
    nowEpochSeconds:1800000000,cryptoImpl:webcrypto});
  const signature=await signedApproval(owner,request);
  assert.equal(await verifyOwnerApprovalBundle({origin:ORIGIN,ownerSpkiBase64Url:owner.spki64,
    ownerFingerprint:owner.fingerprint,permanentProofBase64Url:owner.proof,
    canonicalRequest:request.canonical,signatureBase64Url:signature,cryptoImpl:webcrypto}),true);
});

test("rejects approval signature tampering and a different owner key",async()=>{
  const owner=await ownerFixture(),other=await ownerFixture(),android=await androidFixture(),storage=new MemoryAtomicStorage();
  const request=await issueChallenge({storage,ownerFingerprint:owner.fingerprint,
    androidPublicKeySpkiBase64Url:android.spki64,androidFingerprint:android.fingerprint,
    nowEpochSeconds:1800000000,cryptoImpl:webcrypto});
  const signature=await signedApproval(owner,request);
  const altered=(signature.startsWith("A")?"B":"A")+signature.slice(1);
  const args={origin:ORIGIN,ownerSpkiBase64Url:owner.spki64,ownerFingerprint:owner.fingerprint,
    permanentProofBase64Url:owner.proof,canonicalRequest:request.canonical,cryptoImpl:webcrypto};
  await assert.rejects(verifyOwnerApprovalBundle({...args,signatureBase64Url:altered}),/INVALID_APPROVAL_SIGNATURE|OWNER_APPROVAL_SIGNATURE_INVALID/);
  await assert.rejects(verifyOwnerApprovalBundle({...args,ownerSpkiBase64Url:other.spki64,
    ownerFingerprint:other.fingerprint,permanentProofBase64Url:other.proof,
    signatureBase64Url:signature}),/APPROVAL_REQUEST_SCOPE_MISMATCH/);
});

test("ledger can consume only after real EZERO2 proof and ECDSA approval verify",async()=>{
  const owner=await ownerFixture(),android=await androidFixture(),storage=new MemoryAtomicStorage();
  const request=await issueChallenge({storage,ownerFingerprint:owner.fingerprint,
    androidPublicKeySpkiBase64Url:android.spki64,androidFingerprint:android.fingerprint,
    nowEpochSeconds:1800000000,cryptoImpl:webcrypto});
  const signature=await signedApproval(owner,request);
  const accepted=await consumeApproval({storage,request,signatureBase64Url:signature,
    nowEpochSeconds:1800000001,verifyOwnerApproval:({canonical})=>
      verifyOwnerApprovalBundle({origin:ORIGIN,ownerSpkiBase64Url:owner.spki64,
        ownerFingerprint:owner.fingerprint,permanentProofBase64Url:owner.proof,
        canonicalRequest:canonical,signatureBase64Url:signature,cryptoImpl:webcrypto})});
  assert.equal(accepted.status,"active");
});
