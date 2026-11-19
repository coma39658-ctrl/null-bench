#!/usr/bin/env node
/* Static security contract for the isolated PR156 Trusted Inbox candidate.
 * Live owner handshake is tested separately; this gate does not mutate DO data.
 */
const fs=require("node:fs");
const assert=require("node:assert/strict");
const worker=fs.readFileSync("signaling/cloudflare/src/trusted_inbox_pr156_preview_v2.js","utf8");
const smoke=fs.readFileSync("tests/ezero_pr156_preview_trusted_inbox_live_smoke_20261118.mjs","utf8");

assert.match(worker,/const HELLO_MS=20000, COOLDOWN_MS=30000, REPLAY_MS=600000/);
assert.match(worker,/prior\?\.callId===msg\.callId&&prior\.expires>now[\s\S]*?code:"REPLAY"/,
  "A repeated call ID within the replay window must be rejected");
assert.match(worker,/prior\?\.nextAt>now[\s\S]*?code:"COOLDOWN"/,
  "Repeated calls must be rate-limited");
assert.match(worker,/await this\.ctx\.storage\.put\(id,\{[\s\S]*?callId:msg\.callId,nextAt:now\+COOLDOWN_MS,expires:now\+REPLAY_MS/,
  "Replay and cooldown state must be recorded before forwarding");
assert.match(worker,/await this\.ctx\.storage\.put\("trusted",current\.filter\(fp=>fp!==msg\.fp\)\)/,
  "Owner revocation must persistently remove the trusted fingerprint");
assert.match(worker,/client\.close\(1000,"revoked"\)/,
  "Revocation must close an already connected caller socket");
assert.match(worker,/if\(!current\.includes\(a\.fp\)\)return ws\.close\(1008,"revoked"\)/,
  "A revoked caller must not continue to send invitations");
assert.match(worker,/if\(!owner\)return send\(ws,\{t:"error",code:"RECIPIENT_OFFLINE"\}\)/,
  "No offline queue or deferred delivery may be implied");
assert.match(worker,/if\(a\.called\)return send\(ws,\{t:"error",code:"ONE_CALL_PER_SOCKET"\}\)/,
  "One authenticated socket may submit only one call");
assert.match(worker,/if\(!forwarded\)[\s\S]*?code:"DELIVERY_FAILED"/,
  "Failed socket forwarding must not be reported as delivered");
assert.match(worker,/t:"delivered-to-active-tab"/,
  "Delivery acknowledgement must be tied to the active recipient tab");
assert.doesNotMatch(worker,/\.put\([^\n]*(?:sdp|media|message|photo|recording)/i,
  "The inbox must not persist media, SDP, messages, photos or recordings");
assert.match(worker,/MAX_FRIENDS=50, MAX_CLIENTS=8/);
assert.match(worker,/now-session\.opened>HELLO_MS/,
  "Expired pending handshakes must be reaped");
assert.match(smoke,/liveSignedOwnerHandshake/);
console.log("PASS: duplicate call replay is rejected for the bounded replay window");
console.log("PASS: call cooldown and one-call-per-socket limits are enforced");
console.log("PASS: trust revocation persists and closes active caller sockets");
console.log("PASS: offline recipient and failed forwarding never claim delivery");
console.log("PASS: inbox stores no media, SDP, messages, photos or recordings");
console.log("EZERO_TRUSTED_INBOX_REPLAY_REVOCATION_CONTRACT_PASS");
