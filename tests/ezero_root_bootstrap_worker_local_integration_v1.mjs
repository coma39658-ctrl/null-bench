import { createHash, generateKeyPairSync } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

const origin = "https://coma39658-ctrl.github.io";
const port = 8791 + Math.floor(Math.random() * 300);
const secret = "ci-only-ezero-root-bootstrap-secret";
const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const spki = publicKey.export({ type: "spki", format: "der" });
const rootSpki = spki.toString("base64url");
const expectedFp = createHash("sha256").update(spki).digest("hex");
const base = `http://127.0.0.1:${port}`;
const child = spawn("npx", [
  "--yes", "wrangler@4", "dev", "--local",
  "--config", "signaling/cloudflare/wrangler.android-enrollment-candidate-v1.jsonc",
  "--ip", "127.0.0.1", "--port", String(port),
  "--var", `ROOT_BOOTSTRAP_SECRET:${secret}`,
  "--var", `ROOT_BOOTSTRAP_EXPECTED_FP:${expectedFp}`
], { stdio: ["ignore", "pipe", "pipe"] });

let output = "";
child.stdout.on("data", b => { output += b.toString(); });
child.stderr.on("data", b => { output += b.toString(); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitReady() {
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw new Error("Wrangler exited early:\n" + output);
    try {
      const r = await fetch(base + "/not-found", { headers: { Origin: origin } });
      if (r.status === 404) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("Wrangler did not become ready:\n" + output);
}
async function register({ token = secret, key = rootSpki, requestOrigin = origin } = {}) {
  return fetch(base + "/v1/admin/root-register", {
    method: "POST",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      "X-Root-Bootstrap": token
    },
    body: JSON.stringify({ root_spki: key })
  });
}

try {
  await waitReady();

  const wrongOrigin = await register({ requestOrigin: "https://evil.example" });
  assert.equal(wrongOrigin.status, 403, "wrong Origin must be denied");

  const wrongSecret = await register({ token: "wrong-secret" });
  assert.equal(wrongSecret.status, 403, "wrong bootstrap secret must be denied");

  const invalidKey = await register({ key: "not-a-valid-spki" });
  assert.equal(invalidKey.status, 400, "malformed SPKI must be rejected");

  const mismatch = await register({ key: generateKeyPairSync("ec", { namedCurve: "prime256v1" }).publicKey.export({type:"spki",format:"der"}).toString("base64url") });
  assert.equal(mismatch.status, 403, "SPKI not matching pinned fingerprint must be rejected");
  assert.equal((await mismatch.json()).error, "ROOT_FINGERPRINT_MISMATCH");

  const concurrent = await Promise.all([register(), register()]);
  const statuses = concurrent.map(r => r.status).sort((a,b) => a-b);
  assert.deepEqual(statuses, [200, 409], "exactly one concurrent bootstrap request may succeed");
  const bodies = await Promise.all(concurrent.map(r => r.clone().json()));
  const success = bodies.find(b => b.ok === true);
  assert.equal(success.root_fp, expectedFp);
  assert.equal(JSON.stringify(bodies).includes(secret), false, "secret must not appear in responses");
  assert.equal(JSON.stringify(bodies).includes(rootSpki), false, "SPKI must not appear in responses");

  const replay = await register();
  assert.equal(replay.status, 409, "sequential replay must be rejected");
  assert.equal((await replay.json()).error, "BOOTSTRAP_ALREADY_USED");

  console.log("WORKER_LOCAL_ORIGIN_GUARD_PASS");
  console.log("WORKER_LOCAL_BAD_SECRET_PASS");
  console.log("WORKER_LOCAL_INVALID_SPKI_PASS");
  console.log("WORKER_LOCAL_PINNED_FINGERPRINT_MISMATCH_PASS");
  console.log("WORKER_LOCAL_CONCURRENT_SINGLE_USE_PASS");
  console.log("WORKER_LOCAL_SEQUENTIAL_REPLAY_PASS");
  console.log("WORKER_LOCAL_SECRET_AND_KEY_REDACTION_PASS");
  console.log("LOCAL_WRANGLER_DURABLE_OBJECT_INTEGRATION_PASS");
} finally {
  child.kill("SIGTERM");
}
