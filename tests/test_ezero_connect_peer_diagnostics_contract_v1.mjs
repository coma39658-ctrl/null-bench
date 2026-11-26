import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/ezero_connect_pairing_ui_v1.js", import.meta.url), "utf8");

assert.match(source, /session\.on\("ready",\s*\(\)\s*=>\s*\{/,
  "server hello acceptance must be handled separately from peer connection");
assert.match(source, /session\.on\("waiting-for-peer"/,
  "waiting-for-peer must be visible to the pairing UI");
assert.match(source, /session\.on\("peer-disconnected"/,
  "peer disconnection must be visible");
assert.match(source, /session\.on\("room-closed"/,
  "closed rooms must be visible");
assert.match(source, /session\.on\("rate-limited"/,
  "rate limiting must be visible");
assert.match(source, /session\.on\("peer-not-connected"/,
  "unavailable peer must be visible");
assert.match(source, /PEER_WAIT_TIMEOUT_MS\s*=\s*45_000/,
  "peer wait must have a bounded diagnostic timeout");
assert.match(source, /session\.on\("peer-ready",\s*async remote\s*=>\s*\{/,
  "only validated peer-ready may enter the connected branch");

const peerReadyHandler = source.split('session.on("peer-ready", async remote => {')[1]?.split('session.on("message"')[0] || "";
assert.ok(peerReadyHandler.includes('peerConnected = true'), "peer-ready must set the connected state");
assert.ok(peerReadyHandler.includes('markDone("peer")'), "peer-ready must complete the peer step");
assert.ok(!source.includes('session.on("ready", () => {\n        markDone("peer")'),
  "hello-accepted/ready must never be treated as peer-ready");

console.log("EZERO_PEER_CONNECTION_DIAGNOSTICS_CONTRACT_PASS");
