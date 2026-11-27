import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  canonicalBindingV1, fingerprintIdentitySpki, fingerprintInstallationSpki,
  verifyIdentityInstallationBindingV1
} from "../signaling/cloudflare/src/identity_installation_binding_v1.mjs";

const b64 = bytes => Buffer.from(bytes).toString("base64url");
const signP1363 = (privateKey, bytes) =>
  b64(sign("sha256", Buffer.from(bytes), { key: privateKey, dsaEncoding: "ieee-p1363" }));
const pair = () => generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const spki = key => new Uint8Array(key.publicKey.export({ type: "spki", format: "der" }));

async function fixture() {
  const identity = pair(), installation = pair();
  const identitySpki = spki(identity), installationSpki = spki(installation);
  const now = 1795800000000;
  const statement = {
    protocol: "EZERO_IDENTITY_INSTALLATION_BINDING_V1",
    origin: "https://coma39658-ctrl.github.io",
    challengeId: "challenge_12345678901234567890",
    nonce: "nonce_123456789012345678901",
    expiresAt: String(now + 60000),
    relationshipId: "a".repeat(64),
    identityFingerprint: await fingerprintIdentitySpki(identitySpki),
    installationFingerprint: await fingerprintInstallationSpki(installationSpki),
    installationId: "install_12345678901234567890"
  };
  const bytes = canonicalBindingV1(statement);
  return {
    identitySpki, installationSpki, statement, now,
    identitySignature: signP1363(identity.privateKey, bytes),
    installationSignature: signP1363(installation.privateKey, bytes),
    identity, installation
  };
}

test("both independent keys must sign the exact same canonical binding statement", async () => {
  const f = await fixture();
  const result = await verifyIdentityInstallationBindingV1({
    statement: f.statement, identitySpki: f.identitySpki,
    installationSpki: f.installationSpki,
    identitySignature: f.identitySignature,
    installationSignature: f.installationSignature, now: f.now
  });
  assert.equal(result.ok, true);
  assert.match(result.statementHash, /^[a-f0-9]{64}$/);
});

test("a valid installation signature cannot replace the identity signature", async () => {
  const f = await fixture();
  await assert.rejects(() => verifyIdentityInstallationBindingV1({
    statement: f.statement, identitySpki: f.identitySpki,
    installationSpki: f.installationSpki,
    identitySignature: f.installationSignature,
    installationSignature: f.installationSignature, now: f.now
  }), /IDENTITY_SIGNATURE_INVALID/);
});

test("identity and installation fingerprint domains remain separate and exact", async () => {
  const f = await fixture();
  await assert.rejects(() => verifyIdentityInstallationBindingV1({
    statement: { ...f.statement, installationFingerprint: "0".repeat(64) },
    identitySpki: f.identitySpki, installationSpki: f.installationSpki,
    identitySignature: f.identitySignature, installationSignature: f.installationSignature,
    now: f.now
  }), /INSTALLATION_KEY_FINGERPRINT_MISMATCH/);
  await assert.rejects(() => verifyIdentityInstallationBindingV1({
    statement: { ...f.statement, identityFingerprint: "AA:".repeat(31) + "AB" },
    identitySpki: f.identitySpki, installationSpki: f.installationSpki,
    identitySignature: f.identitySignature, installationSignature: f.installationSignature,
    now: f.now
  }), /IDENTITY_KEY_FINGERPRINT_MISMATCH/);
});

test("expired, overlong, wrong-origin and malformed statements fail closed", async () => {
  const f = await fixture();
  const verify = statement => verifyIdentityInstallationBindingV1({
    statement, identitySpki: f.identitySpki, installationSpki: f.installationSpki,
    identitySignature: f.identitySignature, installationSignature: f.installationSignature,
    now: f.now
  });
  await assert.rejects(() => verify({ ...f.statement, expiresAt: String(f.now) }), /BINDING_STATEMENT_INVALID/);
  await assert.rejects(() => verify({ ...f.statement, expiresAt: String(f.now + 60001) }), /BINDING_STATEMENT_INVALID/);
  await assert.rejects(() => verify({ ...f.statement, origin: "https://attacker.example" }), /BINDING_STATEMENT_INVALID/);
  await assert.rejects(() => verify({ ...f.statement, extra: "not-allowed" }), /BINDING_FIELDS_INVALID/);
});

test("replay protection is explicitly outside signature helper and requires one-use server storage", async () => {
  const f = await fixture();
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../signaling/cloudflare/src/identity_installation_binding_v1.mjs", import.meta.url), "utf8");
  assert.match(source, /challenge consumption/);
  assert.match(source, /does not check relationship status/);
  assert.equal((await verifyIdentityInstallationBindingV1({
    statement: f.statement, identitySpki: f.identitySpki,
    installationSpki: f.installationSpki,
    identitySignature: f.identitySignature, installationSignature: f.installationSignature,
    now: f.now
  })).ok, true);
});
