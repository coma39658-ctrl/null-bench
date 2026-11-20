"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const contract = fs.readFileSync(
  path.join(__dirname, "../../EZERO_INCOMING_CALL_ENROLLMENT_ENDPOINT_CONTRACT_STAGE8_20261120.md"),
  "utf8"
);

test("Stage 8 remains contract design only with no deployed endpoint", () => {
  assert.match(contract, /CONTRACT DESIGN ONLY — NO ENDPOINT IMPLEMENTED OR DEPLOYED/);
  assert.match(contract, /no Worker route exists/);
  assert.match(contract, /No Firebase project\/configuration or provider credentials/);
  assert.match(contract, /No Worker route, Durable Object binding, migration, remote runtime, or deployment/);
});

test("every state-changing API requires authenticated proof; token is not identity", () => {
  assert.match(contract, /A push token is an opaque delivery address, never an identity credential/);
  assert.match(contract, /Every state-changing operation requires authenticated owner and installation proof/);
  assert.match(contract, /Token-only request cannot enroll, rotate, or reactivate/);
});

test("challenge consumption and token association require atomicity and replay protection", () => {
  assert.match(contract, /Challenge consumption, quota reservation, enrollment creation, and token association must be one atomic transaction/);
  assert.match(contract, /challenge ID, nonce digest/);
  assert.match(contract, /Concurrent challenge consumption creates at most one enrollment/);
  assert.match(contract, /Concurrent token rotations cannot overwrite a newer accepted token/);
});

test("owner partitioning and revocation are fail-closed", () => {
  assert.match(contract, /Owner partition is derived from authenticated server context/);
  assert.match(contract, /A revoked installation is terminal/);
  assert.match(contract, /Owner A cannot read, rotate, revoke, or infer Owner B records/);
  assert.match(contract, /Revocation is immediate, idempotent, and terminal/);
});

test("raw token and sensitive proof material never leave the protected boundary", () => {
  assert.match(contract, /Never log request bodies, signatures, raw tokens, authorization headers/);
  assert.match(contract, /Status endpoint never returns a raw push token/);
  assert.match(contract, /Never echo token, nonce after consumption, signature material/);
});

test("personal and call content is excluded; evidence labels stay separate", () => {
  assert.match(contract, /Never store profile photos, contact lists, phone numbers, chat messages, call history, SDP, ICE, media URLs, audio, or video/);
  assert.match(contract, /DEVICE = physical Android FCM delivery\/ringing/);
  assert.match(contract, /cannot be represented as RUNTIME, DEVICE, or PRODUCTION/);
});
