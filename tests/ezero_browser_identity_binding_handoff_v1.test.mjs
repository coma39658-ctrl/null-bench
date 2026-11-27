import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { webcrypto } from "node:crypto";
import {
  canonicalBindingV1,
  verifyIdentityInstallationBindingV1
} from "../signaling/cloudflare/src/identity_installation_binding_v1.mjs";

const source = await readFile(new URL("../js/ezero_connect_identity_v1.js", import.meta.url), "utf8");
globalThis.crypto ??= webcrypto;
globalThis.isSecureContext = true;
globalThis.btoa ??= value => Buffer.from(value, "binary").toString("base64");
globalThis.atob ??= value => Buffer.from(value, "base64").toString("binary");

function installMemoryIndexedDb() {
  const databases = new Map();
  globalThis.indexedDB = {
    open(name) {
      const request = {};
      queueMicrotask(() => {
        let db = databases.get(name);
        const upgrading = !db;
        if (!db) {
          const stores = new Map();
          db = {
            objectStoreNames: { contains: store => stores.has(store) },
            createObjectStore(store) { stores.set(store, new Map()); },
            transaction(storeName) {
              const tx = {};
              const store = stores.get(storeName);
              if (!store) throw new Error("TEST_STORE_MISSING");
              tx.objectStore = () => ({
                get(key) {
                  const result = {};
                  queueMicrotask(() => {
                    result.result = store.get(key);
                    result.onsuccess?.();
                  });
                  return result;
                },
                put(value) {
                  store.set(value.id, value);
                  queueMicrotask(() => tx.oncomplete?.());
                }
              });
              return tx;
            }
          };
          databases.set(name, db);
        }
        request.result = db;
        if (upgrading) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    }
  };
}

function b64url(bytes) {
  return Buffer.from(bytes).toString("base64url");
}

test("browser identity handoff is explicitly consent gated and source remains non-exportable", () => {
  assert.match(source, /async function signInstallationBinding\(statement, consentGranted\)/);
  assert.match(source, /consentGranted !== true\) throw new Error\("EXPLICIT_BINDING_CONSENT_REQUIRED"\)/);
  assert.match(source, /record\.privateKey\.extractable !== false/);
  assert.match(source, /const DB_NAME = "ezero-connect-device-identity"/);
  assert.doesNotMatch(source, /exportKey\(["']pkcs8["']/);
});

test("real WebCrypto browser key and Android installation key verify the same binding statement", async () => {
  installMemoryIndexedDb();
  await import("../js/ezero_connect_identity_v1.js");
  const identity = globalThis.EZERO_CONNECT_IDENTITY;
  await assert.rejects(identity.createAfterConsent(false), /EXPLICIT_CONSENT_REQUIRED/);
  const created = await identity.createAfterConsent(true);
  assert.match(created.fingerprint, /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/);

  const publicIdentity = await identity.getPublicIdentity();
  const statement = {
    protocol: "EZERO_IDENTITY_INSTALLATION_BINDING_V1",
    origin: "https://coma39658-ctrl.github.io",
    challengeId: b64url(webcrypto.getRandomValues(new Uint8Array(24))),
    nonce: b64url(webcrypto.getRandomValues(new Uint8Array(24))),
    expiresAt: String(Date.now() + 30_000),
    relationshipId: "a".repeat(64),
    identityFingerprint: publicIdentity.fingerprint,
    installationFingerprint: "b".repeat(64),
    installationId: b64url(webcrypto.getRandomValues(new Uint8Array(24)))
  };

  const identityProof = await identity.signInstallationBinding(statement, true);
  assert.equal(identityProof.privateKeyExported, false);
  assert.equal(identityProof.encoding, "P1363_BASE64URL");

  const installationPair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const installationSpki = new Uint8Array(
    await webcrypto.subtle.exportKey("spki", installationPair.publicKey)
  );
  const digest = new Uint8Array(await webcrypto.subtle.digest("SHA-256", installationSpki));
  statement.installationFingerprint = Buffer.from(digest).toString("hex");

  // Re-sign the identity statement after setting the exact installation SPKI fingerprint.
  const finalIdentityProof = await identity.signInstallationBinding(statement, true);
  const bytes = canonicalBindingV1(statement);
  const installationSignature = await webcrypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, installationPair.privateKey, bytes
  );

  const identitySpki = Buffer.from(publicIdentity.publicKeySpki, "base64url");
  const verified = await verifyIdentityInstallationBindingV1({
    statement,
    identitySpki: new Uint8Array(identitySpki),
    installationSpki,
    identitySignature: finalIdentityProof.signature,
    installationSignature: b64url(installationSignature)
  });
  assert.equal(verified.ok, true);
  assert.match(verified.statementHash, /^[a-f0-9]{64}$/);

  const corruptedBytes = Buffer.from(finalIdentityProof.signature, "base64url");
  corruptedBytes[0] ^= 0x01;
  const corrupted = corruptedBytes.toString("base64url");
  await assert.rejects(verifyIdentityInstallationBindingV1({
    statement,
    identitySpki: new Uint8Array(identitySpki),
    installationSpki,
    identitySignature: corrupted,
    installationSignature: b64url(installationSignature)
  }), /IDENTITY_SIGNATURE_INVALID/);
});

test("handoff rejects altered origin, expired challenge and non-consented signing", async () => {
  const identity = globalThis.EZERO_CONNECT_IDENTITY;
  const publicIdentity = await identity.getPublicIdentity();
  const base = {
    protocol: "EZERO_IDENTITY_INSTALLATION_BINDING_V1",
    origin: "https://coma39658-ctrl.github.io",
    challengeId: b64url(webcrypto.getRandomValues(new Uint8Array(24))),
    nonce: b64url(webcrypto.getRandomValues(new Uint8Array(24))),
    expiresAt: String(Date.now() + 30_000),
    relationshipId: "c".repeat(64),
    identityFingerprint: publicIdentity.fingerprint,
    installationFingerprint: "d".repeat(64),
    installationId: b64url(webcrypto.getRandomValues(new Uint8Array(24)))
  };
  await assert.rejects(identity.signInstallationBinding(base, false), /EXPLICIT_BINDING_CONSENT_REQUIRED/);
  await assert.rejects(identity.signInstallationBinding({ ...base, origin: "https://evil.example" }, true),
    /BINDING_STATEMENT_INVALID/);
  await assert.rejects(identity.signInstallationBinding({ ...base, expiresAt: String(Date.now() - 1) }, true),
    /BINDING_STATEMENT_INVALID/);
});
