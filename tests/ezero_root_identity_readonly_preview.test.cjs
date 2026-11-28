"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const page = fs.readFileSync("staging/ezero-root-public-identity.html", "utf8");
const moduleSource = fs.readFileSync("staging/js/ezero_connect_identity_v1.js", "utf8");

assert.match(page, /\.\/js\/ezero_connect_identity_v1\.js/);
assert.match(page, /EZERO_CONNECT_IDENTITY\.load\(\)/);
assert.match(page, /EZERO_CONNECT_IDENTITY\.getPublicIdentity\(\)/);
assert.doesNotMatch(page, /createAfterConsent|signCanonical|signInstallationBinding/);
assert.doesNotMatch(page, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
assert.match(page, /NO_EXISTING_ROOT_IDENTITY_ON_THIS_ORIGIN/);
assert.match(page, /private key remains non-exportable/i);
assert.match(moduleSource, /const DB_NAME = "ezero-connect-device-identity"/);
assert.match(moduleSource, /privateKey\.extractable !== false/);
assert.doesNotMatch(moduleSource, /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/);
assert.doesNotMatch(moduleSource, /exportKey\s*\(\s*["']pkcs8/);
console.log("PASS: read-only Root identity page contract");
