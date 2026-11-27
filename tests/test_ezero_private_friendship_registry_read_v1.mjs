import test from "node:test";
import assert from "node:assert/strict";
import RegistryWorker, { EzeroFriendshipRelationship } from "../signaling/ezero-friendship-registry-v1/worker.mjs";

const secret = "staging-registry-internal-secret-32-bytes-minimum";
const relationshipId = "a".repeat(64);
const record = {
  relationshipId,
  status: "ACTIVE",
  transcript: {
    origin: "https://coma39658-ctrl.github.io",
    participants: [
      { fingerprint: "01:".repeat(31) + "01", publicKeySpki: "identity-spki-a" },
      { fingerprint: "02:".repeat(31) + "02", publicKeySpki: "identity-spki-b" }
    ]
  },
  approvals: { mustNotLeak: true },
  createdAt: 123
};
const storage = new Map([["relationship", structuredClone(record)]]);
const relationship = new EzeroFriendshipRelationship({
  storage: {
    async get(key) { return storage.get(key); },
    async put(key, value) { storage.set(key, structuredClone(value)); }
  },
  blockConcurrencyWhile(fn) { return fn(); }
});
const namespace = {
  idFromName(name) { return name; },
  get() { return { fetch: (url, init) => relationship.fetch(new Request(url, init)) }; }
};
const env = { RELATIONSHIPS: namespace, REGISTRY_INTERNAL_ACCESS_SECRET: secret };
const invoke = (headers = {}, body = { relationshipId }) => RegistryWorker.fetch(
  new Request("https://registry.example/internal/v1/relationships/read", {
    method: "POST", headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  }), env
);

test("internal read requires secret and rejects browser-origin requests", async () => {
  let response = await invoke();
  assert.equal(response.status, 403);
  response = await invoke({ "X-EZERO-Registry-Internal": "wrong-secret-value-that-is-long-enough" });
  assert.equal(response.status, 403);
  response = await RegistryWorker.fetch(new Request("https://registry.example/internal/v1/relationships/read", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-EZERO-Registry-Internal": secret, Origin: "https://evil.example" },
    body: JSON.stringify({ relationshipId })
  }), env);
  assert.equal(response.status, 403);
});

test("internal read returns only active relationship identity material", async () => {
  const response = await invoke({ "X-EZERO-Registry-Internal": secret });
  assert.equal(response.status, 200);
  const value = await response.json();
  assert.deepEqual(value, {
    relationshipId,
    status: "ACTIVE",
    origin: "https://coma39658-ctrl.github.io",
    participants: record.transcript.participants
  });
  assert.equal("approvals" in value, false);
  assert.equal("createdAt" in value, false);
});

test("internal read rejects malformed, missing, inactive and mismatched relationship", async () => {
  let response = await invoke({ "X-EZERO-Registry-Internal": secret }, { relationshipId: "bad" });
  assert.equal(response.status, 400);
  response = await invoke({ "X-EZERO-Registry-Internal": secret }, { relationshipId: "b".repeat(64) });
  assert.equal(response.status, 404);
  storage.set("relationship", { ...record, status: "REVOKED" });
  response = await invoke({ "X-EZERO-Registry-Internal": secret });
  assert.equal(response.status, 404);
  storage.delete("relationship");
  response = await invoke({ "X-EZERO-Registry-Internal": secret });
  assert.equal(response.status, 404);
});

console.log("EZERO_PRIVATE_FRIENDSHIP_REGISTRY_READ_V1_PASS");
