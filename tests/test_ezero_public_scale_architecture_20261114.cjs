"use strict";
/* E-ZERO PUBLIC SCALE READINESS — deterministic offline tests only.
 * These tests do NOT create WebSockets or establish throughput/capacity.
 */
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const {createHash}=require("node:crypto");

const roomWorker=fs.readFileSync("signaling/cloudflare/src/worker.js","utf8");
const inboxWorker=fs.readFileSync("signaling/cloudflare/src/trusted_inbox_candidate_v0_1.js","utf8");
const build=fs.readFileSync("scripts/build_ezero_secure_app_render_staging_20261107.py","utf8");
const doc=fs.readFileSync("docs/EZERO_PUBLIC_SCALE_READINESS_20261114.md","utf8");
const hash=(prefix,i,encoding)=>createHash("sha256").update(prefix+String(i)).digest(encoding);

test("Architecture: each random call room is independently addressed",()=>{
  assert.match(roomWorker,/env\.ROOMS\.getByName\(m\[1\]\)/);
  assert.match(roomWorker,/this\.ctx\.acceptWebSocket\(server\)/);
  assert.match(roomWorker,/Too many clients/);
  assert.doesNotMatch(roomWorker,/getUserMedia\(|new RTCPeerConnection\(/);
});

test("Architecture: each recipient inbox is independently addressed and consent-bound",()=>{
  assert.match(inboxWorker,/env\.TRUSTED_INBOXES\.getByName\(m\[1\]\)/);
  assert.match(inboxWorker,/this\.ctx\.acceptWebSocket\(server\)/);
  assert.match(inboxWorker,/MAX_CLIENTS=8/);
  assert.match(inboxWorker,/MAX_FRIENDS=50/);
  assert.doesNotMatch(inboxWorker,/getUserMedia\(|new RTCPeerConnection\(/);
});

test("Evidence: 100,000 distinct synthetic device keys and call-room addresses",()=>{
  const n=100000, devices=new Set(),rooms=new Set();
  for(let i=0;i<n;i++){
    const fp=hash("EZERO_TEST_DEVICE_",i,"hex");
    const room=hash("EZERO_TEST_ROOM_",i,"base64url").slice(0,32);
    assert.match(fp,/^[a-f0-9]{64}$/);
    assert.match(room,/^[A-Za-z0-9_-]{32}$/);
    devices.add(fp);rooms.add(room);
  }
  assert.equal(devices.size,n);
  assert.equal(rooms.size,n);
  // IMPORTANT: uniqueness check proves zero simulated collisions in this sample.
  // It does not simulate concurrent users, actual Cloudflare DOs or calls.
  console.log("SIMULATED_ID_ROUTING_100000_UNIQUE: PASS; NOT_A_LOAD_TEST");
});

test("Release gate: Render build disables experimental saved-friend inbox",()=>{
  assert.match(build,/cfg = cfg\.replace\(needle, "enabled:false", 1\)/);
  assert.match(doc,/NOT A CAPACITY CERTIFICATION/);
  assert.match(doc,/FAIL \/ NOT RELEASED/);
});
