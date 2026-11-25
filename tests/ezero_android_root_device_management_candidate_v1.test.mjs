import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("signaling/cloudflare/src/android_enrollment_candidate_v1.js","utf8");

test("management routes are explicitly allowlisted",()=>{
  for (const route of ["/v1/root/devices/challenge","/v1/root/devices/list","/v1/root/devices/revoke"])
    assert.ok(source.includes(route),route);
});

test("management commands require an active pre-registered root",()=>{
  assert.match(source,/if \(!roots\[body\.root_fp\]\?\.active\) return response\(\{error:"ROOT_NOT_AUTHORIZED"\},403\)/);
  assert.match(source,/if \(!root\?\.active\) return response\(\{error:"ROOT_NOT_AUTHORIZED"\},403\)/);
});

test("management challenges are short lived and one-use",()=>{
  assert.match(source,/expires_at:String\(now\+CHALLENGE_MS\)/);
  assert.match(source,/const saved=this\.ctx\.storage\.transactionSync\(tx=>\{const value=tx\.get\(key\);if\(!value\)return null;tx\.delete\(key\);return value;\}\)/);
  assert.match(source,/CHALLENGE_UNKNOWN_OR_USED/);
});

test("root signature binds action, exact device, challenge, nonce and audience",()=>{
  assert.match(source,/const MANAGEMENT_ORDER = \["root_fp","action","device_fp","challenge_id","nonce","audience","expires_at"\]/);
  assert.match(source,/EZERO_ROOT_DEVICE_MANAGEMENT_V1/);
  assert.match(source,/crypto\.subtle\.verify\(\{name:"ECDSA",hash:"SHA-256"\},rootKey,sig,bytes\)/);
});

test("device listing is restricted to the authenticated root",()=>{
  assert.match(source,/filter\(\(\[fp,d\]\)=>d\.root_fp===c\.root_fp\)/);
  assert.match(source,/device_fp,active:!!d\.active,enrolled_at:d\.enrolled_at,revoked_at:d\.revoked_at\|\|null/);
});

test("revocation is durable and idempotent",()=>{
  assert.match(source,/target\.active=false/);
  assert.match(source,/target\.revoked_at=Date\.now\(\)/);
  assert.match(source,/status:"ALREADY_REVOKED"/);
  assert.match(source,/await this\.ctx\.storage\.put\("devices",devices\)/);
});

test("candidate stays isolated and does not add push token handling",()=>{
  const active=readFileSync("signaling/cloudflare/wrangler.jsonc","utf8");
  assert.ok(!active.includes("android_enrollment_candidate_v1.js"));
  assert.ok(!active.includes("AndroidEnrollmentRegistry"));
  assert.ok(!source.includes("/push-token"));
  assert.ok(!source.includes("FCM"));
});
