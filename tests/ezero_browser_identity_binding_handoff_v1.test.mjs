import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/ezero_connect_identity_v1.js", import.meta.url), "utf8");

test("browser identity binding handoff is explicitly consent gated", () => {
  assert.match(source, /async function signInstallationBinding\(statement, consentGranted\)/);
  assert.match(source, /consentGranted !== true\) throw new Error\("EXPLICIT_BINDING_CONSENT_REQUIRED"\)/);
});

test("browser identity private key remains non-extractable and origin scoped", () => {
  assert.match(source, /record\.privateKey\.extractable !== false/);
  assert.match(source, /const DB_NAME = "ezero-connect-device-identity"/);
  assert.doesNotMatch(source, /exportKey\(["']pkcs8["']/);
});

test("handoff binds exact statement fields, origin, identity fingerprint and short expiry", () => {
  assert.match(source, /EZERO_IDENTITY_INSTALLATION_BINDING_V1/);
  assert.match(source, /https:\/\/coma39658-ctrl\.github\.io/);
  assert.match(source, /BINDING_FIELDS_INVALID/);
  assert.match(source, /BINDING_IDENTITY_FINGERPRINT_MISMATCH/);
  assert.match(source, /Date\.now\(\) \+ 60000/);
});

test("handoff signs canonical bytes and returns signature only", () => {
  assert.match(source, /crypto\.subtle\.sign\([\s\S]*record\.privateKey/);
  assert.match(source, /encoding: "P1363_BASE64URL"/);
  assert.match(source, /privateKeyExported: false/);
});
