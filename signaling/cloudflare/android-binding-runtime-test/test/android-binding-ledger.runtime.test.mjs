import { describe, it, expect } from "vitest";
import { env } from "cloudflare:workers";
import { evictDurableObject } from "cloudflare:test";

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

async function makeFixture(label) {
  const ownerPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const ownerSpki = new Uint8Array(await crypto.subtle.exportKey("spki", ownerPair.publicKey));
  const ownerSpkiBase64Url = b64url(ownerSpki);
  const ownerFingerprint = await fingerprint(ownerSpki);
  const ownerStatement = [
    "EZERO-PERMANENT-IDENTITY-1", ORIGIN, ownerSpkiBase64Url, ownerFingerprint
  ].join("\n");
  const permanentProofBase64Url = b64url(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, ownerPair.privateKey,
    new TextEncoder().encode(ownerStatement)
  ));

  const androidPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const androidSpki = new Uint8Array(await crypto.subtle.exportKey("spki", androidPair.publicKey));
  const androidPublicKeySpkiBase64Url = b64url(androidSpki);
  const androidFingerprint = await fingerprint(androidSpki);
  const id = env.ANDROID_BINDING_LEDGER.idFromName("runtime-" + label + "-" + b64url(crypto.getRandomValues(new Uint8Array(12))));
  const stub = env.ANDROID_BINDING_LEDGER.get(id);
  const ownerInput = { origin: ORIGIN, ownerSpkiBase64Url, ownerFingerprint,
    permanentProofBase64Url };
  return { stub, ownerPair, ownerInput, ownerFingerprint, androidPublicKeySpkiBase64Url,
    androidFingerprint };
}

async function approve(fixture, request) {
  return b64url(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, fixture.ownerPair.privateKey,
    new TextEncoder().encode("EZERO-ANDROID-BIND-APPROVAL-1\n" + request.canonical)
  ));
}

describe("E-ZERO Android Binding Ledger — real workerd Durable Object runtime", () => {
  it("atomically consumes one approval, blocks concurrent replay, and survives eviction", async () => {
    const f = await makeFixture("atomic");
    const request = await f.stub.issueChallenge({
      ...f.ownerInput,
      androidPublicKeySpkiBase64Url: f.androidPublicKeySpkiBase64Url,
      androidFingerprint: f.androidFingerprint
    });
    expect(request.canonical.split("\n")).toHaveLength(9);
    expect(request.expiresAtEpochSeconds - request.issuedAtEpochSeconds).toBe(90);
    const signatureBase64Url = await approve(f, request);
    const input = { ...f.ownerInput, request, signatureBase64Url };

    const attempts = await Promise.all([
      f.stub.consumeApproval(input),
      f.stub.consumeApproval(input)
    ]);
    expect(attempts.filter(x => x.status === "active")).toHaveLength(1);
    expect(attempts.filter(x => x.status === "rejected" &&
      x.code === "CHALLENGE_NOT_ISSUED_OR_REPLAYED")).toHaveLength(1);
    expect(await f.stub.isBindingActive({
      ownerFingerprint: f.ownerFingerprint,
      androidFingerprint: f.androidFingerprint
    })).toBe(true);

    await evictDurableObject(f.stub);
    expect(await f.stub.isBindingActive({
      ownerFingerprint: f.ownerFingerprint,
      androidFingerprint: f.androidFingerprint
    })).toBe(true);
    const replay = await f.stub.consumeApproval(input);
    expect(replay).toMatchObject({status:"rejected", code:"CHALLENGE_NOT_ISSUED_OR_REPLAYED"});
  });

  it("requires a fresh owner signature for revocation and prevents revocation replay", async () => {
    const f = await makeFixture("revoke");
    const request = await f.stub.issueChallenge({
      ...f.ownerInput,
      androidPublicKeySpkiBase64Url: f.androidPublicKeySpkiBase64Url,
      androidFingerprint: f.androidFingerprint
    });
    const signatureBase64Url = await approve(f, request);
    await f.stub.consumeApproval({ ...f.ownerInput, request, signatureBase64Url });
    expect(await f.stub.isBindingActive({
      ownerFingerprint: f.ownerFingerprint,
      androidFingerprint: f.androidFingerprint
    })).toBe(true);

    const nonce = b64url(crypto.getRandomValues(new Uint8Array(24)));
    const issuedAtEpochSeconds = Math.floor(Date.now() / 1000);
    const statement = [
      "EZERO-ANDROID-BIND-REVOKE-1", ORIGIN, f.ownerFingerprint,
      f.androidFingerprint, nonce, String(issuedAtEpochSeconds)
    ].join("\n");
    const revocationSignature = b64url(await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, f.ownerPair.privateKey,
      new TextEncoder().encode(statement)
    ));
    const revokeInput = { ...f.ownerInput, androidFingerprint: f.androidFingerprint,
      nonce, issuedAtEpochSeconds, signatureBase64Url: revocationSignature };

    const result = await f.stub.revokeBinding(revokeInput);
    expect(result.status).toBe("revoked");
    expect(await f.stub.isBindingActive({
      ownerFingerprint: f.ownerFingerprint,
      androidFingerprint: f.androidFingerprint
    })).toBe(false);
    const replay = await f.stub.revokeBinding(revokeInput);
    expect(replay.status).toBe("rejected");
  });

  it("rejects a forged EZERO2 permanent owner proof before creating a challenge", async () => {
    const f = await makeFixture("forged");
    const result = await f.stub.issueChallenge({
      ...f.ownerInput,
      permanentProofBase64Url: "A".repeat(86),
      androidPublicKeySpkiBase64Url: f.androidPublicKeySpkiBase64Url,
      androidFingerprint: f.androidFingerprint
    });
    expect(result).toMatchObject({status:"rejected", code:"OWNER_PERMANENT_PROOF_INVALID"});
  });
});
