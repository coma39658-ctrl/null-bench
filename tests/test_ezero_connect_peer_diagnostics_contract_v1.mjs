import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Keep this contract in the clean mobile QA trigger set for safe local-save diagnostics.

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


const signaling = await readFile(new URL("../js/ezero_connect_signaling_client_v1.js", import.meta.url), "utf8");
const worker = await readFile(new URL("../signaling/ezero-connect-v1/worker.mjs", import.meta.url), "utf8");

assert.match(worker, /function safeDiagnosticCode\(error\)/,
  "Worker must convert internal errors into a bounded diagnostic category");
assert.match(worker, /type: "server-error",[\s\S]*?stage: diagnosticStage,[\s\S]*?code: safeDiagnosticCode\(error\)/,
  "Worker must send stage and allowlisted code, never raw exception text");
assert.match(signaling, /data\.type === "server-error"/,
  "signaling client must recognize safe server diagnostics");
assert.match(signaling, /SIGNAL_SERVER_DIAGNOSTIC_INVALID/,
  "signaling client must reject malformed diagnostic messages");
assert.match(source, /SIGNAL_SERVER_HANDSHAKE_INVITE_REJECTED/,
  "pairing UI must explain a rejected invite without exposing secrets");
assert.match(source, /SIGNAL_SERVER_HANDSHAKE_IDENTITY_PROOF_REJECTED/,
  "pairing UI must explain identity proof failures");
assert.match(source, /SIGNAL_SERVER_RELAY_INTERNAL_ERROR/,
  "pairing UI must distinguish relay-stage failures");
assert.match(source, /TRUST_SECURE_STORAGE_UNAVAILABLE/,
  "pairing UI must identify unavailable secure local storage");
assert.match(source, /TRUST_CONTACT_SAVE_FAILED/,
  "pairing UI must identify local friend persistence failure");
assert.match(source, /TRUST_RELATIONSHIP_ALREADY_EXISTS/,
  "pairing UI must distinguish an already-saved relationship from a new save failure");
assert.match(source, /TRUST_APPROVAL_SIGNATURE_INVALID/,
  "pairing UI must identify approval signature verification failure");

console.log("EZERO_SAFE_SERVER_STAGE_DIAGNOSTICS_CONTRACT_PASS");
