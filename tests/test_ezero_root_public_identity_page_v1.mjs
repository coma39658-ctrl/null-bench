import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../ezero-root-public-identity-staging.html", import.meta.url), "utf8");
const identity = await readFile(new URL("../js/ezero_connect_identity_v1.js", import.meta.url), "utf8");

assert.match(html, /js\/ezero_connect_identity_v1\.js/);
assert.match(html, /EZERO_CONNECT_IDENTITY\.load\(\)/);
assert.match(html, /EZERO_CONNECT_IDENTITY\.getPublicIdentity\(\)/);
assert.match(html, /NO_EXISTING_ROOT_IDENTITY_ON_THIS_ORIGIN/);
assert.match(html, /ROOT_IDENTITY_MODULE_UNAVAILABLE_OR_INSECURE_ORIGIN/);
assert.match(html, /64\}\$/.test("64}")); // Keep the fingerprint validation below explicit.
assert.match(html, /\[a-f0-9\]\{64\}/);
assert.match(html, /Public SPKI/);
assert.match(html, /private key remains non-exportable/i);
assert.match(html, /No server or enrollment action was performed/);
assert.doesNotMatch(html, /createAfterConsent\s*\(/);
assert.doesNotMatch(html, /signAndroidRootApproval\s*\(/);
assert.match(identity, /async function getPublicIdentity\(\)/);
assert.match(identity, /async function load\(\)/);
assert.match(identity, /toBase64Url\(metadata\.publicSpki\)/);
assert.doesNotMatch(html, /privateKey|private_key|secret|bootstrap/i);

console.log("E-ZERO Root public identity page contract: PASS");
