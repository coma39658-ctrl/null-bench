import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("signaling/cloudflare/src/android_enrollment_candidate_v1.js", "utf8");

const start = source.indexOf('if (u.pathname === "/v1/admin/root-register")');
const end = source.indexOf('\n    }', start) + 6;
const route = source.slice(start, end);

test("bootstrap requires both independent secret and pinned expected fingerprint", () => {
  assert.match(route, /ROOT_BOOTSTRAP_SECRET/);
  assert.match(route, /ROOT_BOOTSTRAP_EXPECTED_FP/);
  assert.match(route, /!FP\.test\(expectedFp\)/);
  assert.match(route, /fp !== expectedFp/);
  assert.match(route, /ROOT_FINGERPRINT_MISMATCH/);
});

test("bootstrap validates actual P-256 SPKI before registration", () => {
  assert.match(route, /decode64\(body\.root_spki, 512\)/);
  assert.match(route, /await importP256\(spki\)/);
  assert.match(route, /await fingerprint\(spki\)/);
});

test("bootstrap authorization and root insertion share one atomic transaction", () => {
  assert.match(route, /transactionSync\(tx =>/);
  assert.match(route, /root-bootstrap-v1-used/);
  assert.match(route, /tx\.put\("root-bootstrap-v1-used", true\)/);
  assert.match(route, /tx\.put\("roots", \{ \[fp\]: record \}\)/);
  assert.match(route, /BOOTSTRAP_ALREADY_USED/);
});

test("bootstrap cannot replace or add a second root", () => {
  assert.match(route, /Object\.keys\(roots\)\.length !== 0/);
  assert.match(route, /ROOT_ALREADY_REGISTERED/);
});

test("bootstrap response does not disclose secret or SPKI", () => {
  assert.match(route, /response\(\{ok:true,root_fp:fp,status:"ROOT_REGISTERED"\}\)/);
  assert.doesNotMatch(route, /secret\s*[,}]/);
  assert.doesNotMatch(route, /root_spki\s*:/);
});

test("bootstrap candidate remains isolated and has no FCM/push activation", () => {
  assert.match(source, /ISOLATED \/ NOT DEPLOYED/);
  assert.doesNotMatch(source, /getMessaging|getToken|onMessageReceived|sendPush/i);
});
