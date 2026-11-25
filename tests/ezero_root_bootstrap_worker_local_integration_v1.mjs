import { createHash, generateKeyPairSync } from "node:crypto";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";

// Diagnostic run: worker returns only a safe failure-stage label. Validate per-request winner claim under parallel replay. Confirm SQL changes gate after assertion correction. Recheck atomic SQLite changes() implementation. Verify SQLite changes() single-use gate. Sequential first registration and concurrent replay check. Validate RETURNING row detection for atomic single-use registration. Final single-statement SQLite gate regression. SQL-backed atomic root bootstrap is under integration test. Latest revision exercises documented async atomic transaction. Re-run after assertion syntax correction. Single-use transaction now uses storage.kv. Atomic storage path now uses synchronous SQLite KV API.
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
      const r = await fetch(base + "/not-found", { headers: { Origin: origin }, signal: AbortSignal.timeout(5000) });
      if (r.status === 404) return;
    } catch {}
    await sleep(1000);
  }
  throw new Error("Wrangler did not become ready:\n" + output);
}
async function register({ token = secret, key = rootSpki, requestOrigin = origin } = {}) {
  try {
    return await fetch(base + "/v1/admin/root-register", {
    method: "POST",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      "X-Root-Bootstrap": token
    },
      body: JSON.stringify({ root_spki: key }),
      signal: AbortSignal.timeout(10000)
    });
  } catch (error) {
    throw new Error("ROOT_REGISTER_REQUEST_FAILED_OR_TIMED_OUT: " + (error?.name || "Error") + "\\n" + output.slice(-6000));
  }
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

  const first = await register();
  assert.equal(first.status, 200, "first valid bootstrap must register the pinned root");
  const firstBody = await first.json();
  assert.equal(firstBody.root_fp, expectedFp);
  assert.equal(JSON.stringify(firstBody).includes(secret), false, "secret must not appear in response");
  assert.equal(JSON.stringify(firstBody).includes(rootSpki), false, "SPKI must not appear in response");

  // After the one-time insert commits, concurrent replays must both fail closed.
  const concurrentReplays = await Promise.all([register(), register()]);
  const statuses = concurrentReplays.map(r => r.status).sort((a,b) => a-b);
  const bodies = await Promise.all(concurrentReplays.map(r => r.clone().json()));
  assert.deepEqual(statuses, [409, 409], "concurrent replay requests must both be rejected; responses=" + JSON.stringify(bodies));
  assert.equal(bodies.every(b => b.error === "BOOTSTRAP_ALREADY_USED"), true);

  const replay = await register();
  assert.equal(replay.status, 409, "sequential replay must be rejected");
  assert.equal((await replay.json()).error, "BOOTSTRAP_ALREADY_USED");

  console.log("WORKER_LOCAL_ORIGIN_GUARD_PASS");
  console.log("WORKER_LOCAL_BAD_SECRET_PASS");
  console.log("WORKER_LOCAL_INVALID_SPKI_PASS");
  console.log("WORKER_LOCAL_PINNED_FINGERPRINT_MISMATCH_PASS");
  console.log("WORKER_LOCAL_FIRST_BOOTSTRAP_SUCCESS_PASS");
  console.log("WORKER_LOCAL_CONCURRENT_REPLAY_PASS");
  console.log("WORKER_LOCAL_SEQUENTIAL_REPLAY_PASS");
  console.log("WORKER_LOCAL_SECRET_AND_KEY_REDACTION_PASS");
  console.log("LOCAL_WRANGLER_DURABLE_OBJECT_INTEGRATION_PASS");
} finally {
  child.kill("SIGTERM");
}
