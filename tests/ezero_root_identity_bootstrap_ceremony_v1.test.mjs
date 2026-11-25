import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const doc = readFileSync("android/ROOT_IDENTITY_BOOTSTRAP_CEREMONY_V1.md", "utf8");

test("bootstrap is design-only and does not activate endpoints or deployment", () => {
  assert.match(doc, /SECURITY DESIGN \+ STATIC QA ONLY/);
  assert.match(doc, /No Worker deployment or production change is authorized/);
});

test("root trust requires independent protected fingerprint and secret", () => {
  assert.match(doc, /ROOT_BOOTSTRAP_SECRET/);
  assert.match(doc, /ROOT_BOOTSTRAP_EXPECTED_FP/);
  assert.match(doc, /independently compared and pinned/);
  assert.match(doc, /A secret alone is insufficient/);
  assert.match(doc, /self-signed signature alone is insufficient/);
});

test("browser private root key never leaves protected storage", () => {
  assert.match(doc, /non-exportable P-256 root key/);
  assert.match(doc, /Never export or copy its private key/);
});

test("bootstrap authorization is atomic and one-time", () => {
  assert.match(doc, /atomically consumes the one-time bootstrap authorization/);
  assert.match(doc, /Concurrent or repeated requests fail/);
  assert.match(doc, /must never be reusable/);
});

test("failure and recovery fail closed", () => {
  assert.match(doc, /fail closed/);
  assert.match(doc, /Root private key loss requires a separate documented recovery ceremony/);
  assert.match(doc, /Root compromise requires revocation/);
});

test("secrets and sensitive payloads are never logged or returned", () => {
  assert.match(doc, /must never appear in source, QR, URL, browser storage, logs, CI output, or chat/);
  assert.match(doc, /Do not log secrets, raw SPKI, complete request bodies, signatures, or QR payloads/);
  assert.match(doc, /Never return bootstrap secrets/);
});

test("staging deployment and FCM activation require separate gates", () => {
  assert.match(doc, /isolated staging Worker only/);
  assert.match(doc, /Obtain separate explicit authorization before deploying even to staging/);
  assert.match(doc, /No FCM token registration or push wake activation/);
});

test("existing friend QR, saved friends, and calls remain unchanged", () => {
  assert.match(doc, /changes no active Worker, no public site, no existing friend QR, no saved-friend records, and no call signaling/);
});
