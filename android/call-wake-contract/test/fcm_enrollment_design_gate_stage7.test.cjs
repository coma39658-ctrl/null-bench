"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const documentPath = path.join(
  __dirname,
  "../../EZERO_INCOMING_CALL_FCM_ENROLLMENT_DESIGN_GATE_STAGE7_20261120.md"
);
const design = fs.readFileSync(documentPath, "utf8");

test("Stage 7 is explicitly design-only and not deployed", () => {
  assert.match(design, /Status: DESIGN ONLY — NOT IMPLEMENTED, NOT DEPLOYED/);
  assert.match(design, /No Worker route, Durable Object binding, backend endpoint, or deployment/);
  assert.match(design, /No GitHub secret or environment mutation/);
});

test("enrollment requires an installation key and owner-authorized proof", () => {
  assert.match(design, /installation_public_key: P-256 public key only/);
  assert.match(design, /owner_approval: domain-separated signature/);
  assert.match(design, /challenge_id and challenge_nonce: server-issued, single-use, short-lived values/);
  assert.match(design, /Bind the challenge to the owner, installation public-key fingerprint/);
});

test("push token cannot establish trust by itself and has a revocation lifecycle", () => {
  assert.match(design, /Do not let an FCM token alone create, replace, or reactivate a trusted installation/);
  assert.match(design, /Token rotation requires a fresh authenticated proof/);
  assert.match(design, /revocation must invalidate the token association/);
  assert.match(design, /Keep push tokens encrypted at rest, access-controlled, excluded from logs/);
});

test("replay, expiry, quotas and owner isolation are mandatory", () => {
  assert.match(design, /expiry, nonce uniqueness, replay protection, and atomic one-time consumption/);
  assert.match(design, /per-installation and per-owner rate limits/);
  assert.match(design, /mismatched owner partitions/);
});

test("FCM is only a wake hint and payload excludes personal and call content", () => {
  assert.match(design, /FCM is a transport\/wake hint only/);
  assert.match(design, /Do not include names, phone numbers, photos, message text, SDP, ICE, or media URLs/);
  assert.match(design, /It must never auto-answer/);
});

test("evidence levels cannot be promoted from design or CI to device proof", () => {
  assert.match(design, /DESIGN: this document only/);
  assert.match(design, /DEVICE: physical Android delivery and ringing verified/);
  assert.match(design, /must never be reported as proof of RUNTIME, DEVICE, or PRODUCTION behavior/);
});
