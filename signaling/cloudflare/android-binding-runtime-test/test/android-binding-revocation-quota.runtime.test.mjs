import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { runInDurableObject } from "cloudflare:test";

const ORIGIN = "https://coma39658-ctrl.github.io";
const b64url = bytes => {
  const view = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let raw = "";
  for (const b of view) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
const fingerprint = async spki =>
  hex(new Uint8Array(await crypto.subtle.digest("SHA-256", spki)));

async function makeOwner(label) {
  const pair = await crypto.subtle.generateKey(
    {name:"ECDSA", namedCurve:"P-256"}, true, ["sign", "verify"]
  );
  const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
  const ownerSpkiBase64Url = b64url(spki);
  const ownerFingerprint = await fingerprint(spki);
  const statement = ["EZERO-PERMANENT-IDENTITY-1", ORIGIN,
    ownerSpkiBase64Url, ownerFingerprint].join("\n");
  const permanentProofBase64Url = b64url(await crypto.subtle.sign(
    {name:"ECDSA", hash:"SHA-256"}, pair.privateKey,
    new TextEncoder().encode(statement)
  ));
  const id = env.ANDROID_BINDING_LEDGER.idFromName(
    "ezero-android-binding-owner-" + ownerFingerprint
  );
  return {
    pair, ownerFingerprint,
    stub: env.ANDROID_BINDING_LEDGER.get(id),
    ownerInput: {origin:ORIGIN, ownerSpkiBase64Url, ownerFingerprint, permanentProofBase64Url}
  };
}

async function signedRevocation(owner, androidFingerprint, nonce, issuedAtEpochSeconds) {
  const statement = ["EZERO-ANDROID-BIND-REVOKE-1", ORIGIN,
    owner.ownerFingerprint, androidFingerprint, nonce,
    String(issuedAtEpochSeconds)].join("\n");
  const signatureBase64Url = b64url(await crypto.subtle.sign(
    {name:"ECDSA", hash:"SHA-256"}, owner.pair.privateKey,
    new TextEncoder().encode(statement)
  ));
  return {...owner.ownerInput, androidFingerprint, nonce,
    issuedAtEpochSeconds, signatureBase64Url};
}

describe("E-ZERO Android Binding Stage 4 Part 4 — revocation quota and owner isolation", () => {
  it("atomically limits six concurrent valid revocations to five and leaves the limited binding active", async () => {
    const owner = await makeOwner("revocation-concurrency");
    const now = Math.floor(Date.now() / 1000);
    const devices = Array.from({length:6}, (_, i) =>
      hex(new Uint8Array(32).fill(i + 1))
    );

    await runInDurableObject(owner.stub, async (_instance, state) => {
      for (const androidFingerprint of devices) {
        await state.storage.put(
          "android-bind:v1:binding:" + owner.ownerFingerprint + ":" + androidFingerprint,
          {status:"active", ownerFingerprint:owner.ownerFingerprint,
            androidFingerprint, capability:"call-invite-only"}
        );
      }
    });

    const requests = await Promise.all(devices.map(async (androidFingerprint, i) =>
      signedRevocation(owner, androidFingerprint,
        b64url(crypto.getRandomValues(new Uint8Array(24))), now)
    ));
    const results = await Promise.all(requests.map(input => owner.stub.revokeBinding(input)));
    expect(results.filter(x => x.status === "revoked")).toHaveLength(5);
    expect(results.filter(x => x.status === "rejected" && x.code === "RATE_LIMITED")).toHaveLength(1);

    const states = await Promise.all(devices.map(androidFingerprint =>
      owner.stub.isBindingActive({ownerFingerprint:owner.ownerFingerprint, androidFingerprint})
    ));
    expect(states.filter(Boolean)).toHaveLength(1);
  });

  it("keeps challenge quotas isolated per verified permanent owner", async () => {
    const ownerA = await makeOwner("owner-a");
    const ownerB = await makeOwner("owner-b");
    const androidPair = await crypto.subtle.generateKey(
      {name:"ECDSA", namedCurve:"P-256"}, true, ["sign", "verify"]
    );
    const androidSpki = new Uint8Array(await crypto.subtle.exportKey("spki", androidPair.publicKey));
    const androidPublicKeySpkiBase64Url = b64url(androidSpki);
    const androidFingerprint = await fingerprint(androidSpki);

    const issueFive = async owner => Promise.all(Array.from({length:5}, () =>
      owner.stub.issueChallenge({...owner.ownerInput,
        androidPublicKeySpkiBase64Url, androidFingerprint})
    ));
    const a = await issueFive(ownerA);
    expect(a.every(x => x.status === "issued")).toBe(true);
    const aLimited = await ownerA.stub.issueChallenge({...ownerA.ownerInput,
      androidPublicKeySpkiBase64Url, androidFingerprint});
    expect(aLimited).toMatchObject({status:"rejected", code:"RATE_LIMITED"});

    const b = await issueFive(ownerB);
    expect(b.every(x => x.status === "issued")).toBe(true);
  });
});
