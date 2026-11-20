"use strict";
import test from "node:test";
import assert from "node:assert/strict";
import {webcrypto} from "node:crypto";
import {createAndroidBindingLedgerClass} from "../signaling/cloudflare/src/android_binding_durable_object_adapter_v1.mjs";
import cryptoChecks from "../signaling/cloudflare/src/android_binding_crypto_v1.cjs";
import {ORIGIN} from "../signaling/cloudflare/src/android_binding_ledger_core_v1.cjs";

class FakeDurableStorage {
  constructor(){this.data=new Map();this.tail=Promise.resolve();}
  async get(k){return this.data.get(k);}
  transaction(fn){
    const run=this.tail.then(async()=>{
      const staged=new Map(this.data);
      const tx={get:async k=>staged.get(k),put:async(k,v)=>staged.set(k,structuredClone(v))};
      const result=await fn(tx);this.data=staged;return result;
    });
    this.tail=run.catch(()=>{});return run;
  }
}
class FakeBase { constructor(ctx,env){this.ctx=ctx;this.env=env;} }
const TestLedger=createAndroidBindingLedgerClass(FakeBase);
const b64=bytes=>Buffer.from(bytes).toString("base64url");
const fingerprint=async bytes=>Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256",bytes)),
  b=>b.toString(16).padStart(2,"0")).join("");

async function fixture(){
  const ownerPair=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  const ownerSpki=new Uint8Array(await webcrypto.subtle.exportKey("spki",ownerPair.publicKey));
  const ownerSpki64=b64(ownerSpki),ownerFingerprint=await fingerprint(ownerSpki);
  const ownerStatement=["EZERO-PERMANENT-IDENTITY-1",ORIGIN,ownerSpki64,ownerFingerprint].join("\n");
  const ownerProof=b64(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},ownerPair.privateKey,
    new TextEncoder().encode(ownerStatement)));
  const androidPair=await webcrypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"]);
  const androidSpki=new Uint8Array(await webcrypto.subtle.exportKey("spki",androidPair.publicKey));
  const androidSpki64=b64(androidSpki),androidFingerprint=await fingerprint(androidSpki);
  const storage=new FakeDurableStorage();
  const ctx={storage};
  const ledger=new TestLedger(ctx,{});
  const ownerInput={origin:ORIGIN,ownerSpkiBase64Url:ownerSpki64,ownerFingerprint,
    permanentProofBase64Url:ownerProof};
  return {ledger,storage,ownerPair,ownerInput,ownerFingerprint,androidPair,androidSpki64,androidFingerprint};
}
async function approve(x,request){
  return b64(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},x.ownerPair.privateKey,
    new TextEncoder().encode("EZERO-ANDROID-BIND-APPROVAL-1\n"+request.canonical)));
}

test("Durable Object adapter persists challenge and consumes approval once",async()=>{
  const x=await fixture();
  const request=await x.ledger.issueChallenge({...x.ownerInput,
    androidPublicKeySpkiBase64Url:x.androidSpki64,androidFingerprint:x.androidFingerprint});
  assert.equal(request.canonical.split("\n").length,9);
  const signatureBase64Url=await approve(x,request);
  const input={...x.ownerInput,request,signatureBase64Url};
  const accepted=await x.ledger.consumeApproval(input);
  assert.equal(accepted.status,"active");
  assert.equal(await x.ledger.isBindingActive({ownerFingerprint:x.ownerFingerprint,
    androidFingerprint:x.androidFingerprint}),true);
  await assert.rejects(x.ledger.consumeApproval(input),/CHALLENGE_NOT_ISSUED_OR_REPLAYED/);
});

test("Durable Object adapter serializes concurrent approval replay",async()=>{
  const x=await fixture();
  const request=await x.ledger.issueChallenge({...x.ownerInput,
    androidPublicKeySpkiBase64Url:x.androidSpki64,androidFingerprint:x.androidFingerprint});
  const signatureBase64Url=await approve(x,request);
  const input={...x.ownerInput,request,signatureBase64Url};
  const results=await Promise.allSettled([x.ledger.consumeApproval(input),x.ledger.consumeApproval(input)]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(results.filter(r=>r.status==="rejected").length,1);
});

test("Durable Object adapter requires fresh owner signature and prevents revocation replay",async()=>{
  const x=await fixture();
  const request=await x.ledger.issueChallenge({...x.ownerInput,
    androidPublicKeySpkiBase64Url:x.androidSpki64,androidFingerprint:x.androidFingerprint});
  const signatureBase64Url=await approve(x,request);
  await x.ledger.consumeApproval({...x.ownerInput,request,signatureBase64Url});
  const nonce=b64(webcrypto.getRandomValues(new Uint8Array(24)));
  const issuedAtEpochSeconds=Math.floor(Date.now()/1000);
  const statement=["EZERO-ANDROID-BIND-REVOKE-1",ORIGIN,x.ownerFingerprint,
    x.androidFingerprint,nonce,String(issuedAtEpochSeconds)].join("\n");
  const revokeSignature=b64(await webcrypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    x.ownerPair.privateKey,new TextEncoder().encode(statement)));
  const revokeInput={...x.ownerInput,androidFingerprint:x.androidFingerprint,nonce,
    issuedAtEpochSeconds,signatureBase64Url:revokeSignature};
  const revoked=await x.ledger.revokeBinding(revokeInput);
  assert.equal(revoked.status,"revoked");
  assert.equal(await x.ledger.isBindingActive({ownerFingerprint:x.ownerFingerprint,
    androidFingerprint:x.androidFingerprint}),false);
  await assert.rejects(x.ledger.revokeBinding(revokeInput),/OWNER_REVOCATION_AUTH_REQUIRED|BINDING_NOT_ACTIVE/);
});

test("rejects an invalid permanent owner proof before issuing a challenge",async()=>{
  const x=await fixture();
  await assert.rejects(x.ledger.issueChallenge({...x.ownerInput,
    permanentProofBase64Url:"A".repeat(86),androidPublicKeySpkiBase64Url:x.androidSpki64,
    androidFingerprint:x.androidFingerprint}),/OWNER_PERMANENT_IDENTITY|INVALID_OWNER_PROOF|OWNER_PERMANENT_PROOF_INVALID/);
});
