#!/usr/bin/env node
const fs=require("node:fs"),assert=require("node:assert/strict");
const client=fs.readFileSync("js/ezero_trusted_friend_foreground_client_candidate_v0_1.js","utf8");
const worker=fs.readFileSync("signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js","utf8");
const config=JSON.parse(fs.readFileSync("signaling/cloudflare/wrangler.trusted-render-test-20261111.jsonc","utf8"));
const origin="https://ezero-secure-simple-home-two-phone.onrender.com";
assert.match(client,/const ORIGIN=location\.origin;/);
assert.match(client,/const CALL_PAGE=new URL\(/);
assert.equal(config.vars.PUBLIC_ORIGIN,origin);
assert.ok(worker.includes('const ORIGIN="'+origin+'"'));
assert.ok(worker.includes("verifyHello"));
assert.match(client,/EZERO-TRUSTED-INBOX-1/);
assert.match(worker,/EZERO-TRUSTED-INBOX-1/);
assert.ok(worker.includes("crypto.subtle.verify"));
console.log("PASS signed inbox staging origin alignment (static contract only; not a live socket test)");
