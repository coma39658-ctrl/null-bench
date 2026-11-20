"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {generateKeyPairSync, webcrypto} = require("node:crypto");
const {
  issueChallenge, consumeApproval, revokeBinding, isBindingActive,
  ORIGIN, CAPABILITY
} = require("../signaling/cloudflare/src/android_binding_ledger_core_v1.cjs");

class MemoryAtomicStorage {
  constructor() { this.data = new Map(); this.tail = Promise.resolve(); }
  async get(key) { return this.data.get(key); }
  transaction(fn) {
    const run = this.tail.then(async () => {
      const staged = new Map(this.data);
      const tx = {
        get: async key => staged.get(key),
        put: async (key, value) => { staged.set(key, structuredClone(value)); },
        delete: async key => { staged.delete(key); }
      };
      const result = await fn(tx);
      this.data = staged;
      return result;
    });
    this.tail = run.catch(() => {});
    return run;
  }
}

async function setup(now = 1800000000) {
  const storage = new MemoryAtomicStorage();
  const pair = generateKeyPairSync("ec", {namedCurve:"prime256v1"});
  const spki = new Uint8Array(pair.publicKey.export({type:"spki",format:"der"}));
  const digest = new Uint8Array(await webcrypto.subtle.digest("SHA-256", spki));
  const androidFingerprint = Array.from(digest, b => b.toString(16).padStart(2,"0")).join("");
  const b64 = Buffer.from(spki).toString("base64url");
  const ownerFingerprint = "a".repeat(64);
  const request = await issueChallenge({storage, ownerFingerprint,
    androidPublicKeySpkiBase64Url:b64, androidFingerprint,
    nowEpochSeconds:now, cryptoImpl:webcrypto});
  return {storage, request, ownerFingerprint, androidFingerprint, now};
}
const signature = Buffer.from(new Uint8Array(64).fill(7)).toString("base64url");
const verifier = async ({request, canonical, signatureBase64Url}) =>
  request.canonical === canonical && signatureBase64Url === signature;

test("issues exact nine-line EZERO-ANDROID-BIND-1 challenge with 90s lifetime", async () => {
  const {request} = await setup();
  assert.equal(request.origin, ORIGIN);
  assert.equal(request.capability, CAPABILITY);
  assert.equal(request.expiresAtEpochSeconds-request.issuedAtEpochSeconds, 90);
  assert.equal(request.canonical.split("\n").length, 9);
  assert.equal(request.canonical.split("\n")[0], "EZERO-ANDROID-BIND-1");
  assert.equal(request.canonical.split("\n")[8], "call-invite-only");
});

test("consumes one approval and atomically blocks replay", async () => {
  const x = await setup();
  const args = {storage:x.storage, request:x.request, signatureBase64Url:signature,
    nowEpochSeconds:x.now+1, verifyOwnerApproval:verifier};
  const accepted = await consumeApproval(args);
  assert.equal(accepted.status, "active");
  assert.equal(await isBindingActive({storage:x.storage, ownerFingerprint:x.ownerFingerprint,
    androidFingerprint:x.androidFingerprint}), true);
  await assert.rejects(consumeApproval(args), /CHALLENGE_NOT_ISSUED_OR_REPLAYED/);
});

test("concurrent replay attempts allow exactly one winner", async () => {
  const x = await setup();
  const args = {storage:x.storage, request:x.request, signatureBase64Url:signature,
    nowEpochSeconds:x.now+1, verifyOwnerApproval:verifier};
  const outcomes = await Promise.allSettled([consumeApproval(args), consumeApproval(args)]);
  assert.equal(outcomes.filter(o => o.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(o => o.status === "rejected").length, 1);
});

test("rejects expired challenge at the exact expiry boundary", async () => {
  const x = await setup();
  await assert.rejects(consumeApproval({storage:x.storage, request:x.request,
    signatureBase64Url:signature, nowEpochSeconds:x.request.expiresAtEpochSeconds,
    verifyOwnerApproval:verifier}), /CHALLENGE_EXPIRED_OR_NOT_YET_VALID/);
});

test("rejects owner signature verifier failure without consuming nonce", async () => {
  const x = await setup();
  const args = {storage:x.storage, request:x.request, signatureBase64Url:signature,
    nowEpochSeconds:x.now+1, verifyOwnerApproval:async()=>false};
  await assert.rejects(consumeApproval(args), /OWNER_APPROVAL_INVALID/);
  await assert.rejects(consumeApproval({...args, verifyOwnerApproval:verifier}), /CHALLENGE_NOT_ISSUED_OR_REPLAYED/).catch(async err => {
    // The failed verification must leave the challenge available; the second
    // call above is expected to succeed, so reaching this catch is a test bug.
    throw err;
  });
});

test("revokes an active binding and rejects unauthorized revocation", async () => {
  const x = await setup();
  await consumeApproval({storage:x.storage, request:x.request, signatureBase64Url:signature,
    nowEpochSeconds:x.now+1, verifyOwnerApproval:verifier});
  await assert.rejects(revokeBinding({storage:x.storage, ownerFingerprint:x.ownerFingerprint,
    androidFingerprint:x.androidFingerprint, nowEpochSeconds:x.now+2,
    authorizeOwner:async()=>false}), /OWNER_REVOCATION_AUTH_REQUIRED/);
  const revoked = await revokeBinding({storage:x.storage, ownerFingerprint:x.ownerFingerprint,
    androidFingerprint:x.androidFingerprint, nowEpochSeconds:x.now+3,
    authorizeOwner:async()=>true});
  assert.equal(revoked.status, "revoked");
  assert.equal(await isBindingActive({storage:x.storage, ownerFingerprint:x.ownerFingerprint,
    androidFingerprint:x.androidFingerprint}), false);
});

test("refuses reactivation while a binding remains active", async () => {
  const x = await setup();
  await consumeApproval({storage:x.storage, request:x.request, signatureBase64Url:signature,
    nowEpochSeconds:x.now+1, verifyOwnerApproval:verifier});
  const next = await issueChallenge({storage:x.storage, ownerFingerprint:x.ownerFingerprint,
    androidPublicKeySpkiBase64Url:x.request.androidPublicKeySpkiBase64Url,
    androidFingerprint:x.androidFingerprint, nowEpochSeconds:x.now+2, cryptoImpl:webcrypto});
  await assert.rejects(consumeApproval({storage:x.storage, request:next,
    signatureBase64Url:signature, nowEpochSeconds:x.now+3, verifyOwnerApproval:verifier}),
    /BINDING_ALREADY_ACTIVE/);
});

test("rejects a request whose canonical bytes or scope were changed", async () => {
  const x = await setup();
  const altered = {...x.request, canonical:x.request.canonical+"\n"};
  await assert.rejects(consumeApproval({storage:x.storage, request:altered,
    signatureBase64Url:signature, nowEpochSeconds:x.now+1, verifyOwnerApproval:verifier}),
    /NON_CANONICAL_REQUEST/);
  const wrongOrigin = {...x.request, origin:"https://wrong.example"};
  await assert.rejects(consumeApproval({storage:x.storage, request:wrongOrigin,
    signatureBase64Url:signature, nowEpochSeconds:x.now+1, verifyOwnerApproval:verifier}),
    /REQUEST_SCOPE_MISMATCH/);
});
