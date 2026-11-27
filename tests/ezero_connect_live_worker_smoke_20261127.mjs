import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import WebSocket from "ws";
import {
  stableCanonical,
  handshakePayload,
  toFingerprint
} from "../signaling/ezero-connect-v1/worker.mjs";

globalThis.crypto ??= webcrypto;

const ROOT = "https://ezero-connect-call-preview-20261125.coma39658.workers.dev";
const ORIGIN = "https://ezero-connect-pairing-diagnostic-pr224.onrender.com";
const encoder = new TextEncoder();
const b64 = bytes => Buffer.from(bytes).toString("base64url");
const sign = async (key, value) => b64(await webcrypto.subtle.sign(
  { name: "ECDSA", hash: "SHA-256" },
  key,
  encoder.encode(stableCanonical(value))
));

async function makeDevice() {
  const keys = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
  );
  const spki = new Uint8Array(await webcrypto.subtle.exportKey("spki", keys.publicKey));
  const digest = await webcrypto.subtle.digest("SHA-256", spki);
  return {
    privateKey: keys.privateKey,
    publicKeySpki: b64(spki),
    fingerprint: toFingerprint(digest)
  };
}

const randomId = () => b64(webcrypto.getRandomValues(new Uint8Array(24)));

async function makeInvite(device, roomId, nonce) {
  const issuedAt = Date.now();
  const payload = {
    v: 1, origin: ORIGIN,
    inviterFingerprint: device.fingerprint,
    inviterPublicKeySpki: device.publicKeySpki,
    roomId, issuedAt, expiresAt: issuedAt + 90_000, nonce
  };
  return "EZERO1." + b64(encoder.encode(stableCanonical({
    payload, signature: await sign(device.privateKey, payload)
  })));
}

async function authenticate(role, roomId, nonce, device, inviteCode) {
  const url = `${ROOT}/v1/rooms/${roomId}?role=${role}`;
  const ws = new WebSocket(url, {
    headers: { Origin: ORIGIN },
    handshakeTimeout: 12_000,
    perMessageDeflate: false
  });
  return await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => finish(new Error("STAGING_HANDSHAKE_TIMEOUT")), 15_000);
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve({ ws, ...value });
    };
    ws.on("error", error => finish(new Error("STAGING_SOCKET_ERROR: " + error.message)));
    ws.on("unexpected-response", (_request, response) =>
      finish(new Error("STAGING_HTTP_" + response.statusCode)));
    ws.on("close", (code, reason) => {
      if (!settled) finish(new Error("STAGING_EARLY_CLOSE_" + code + "_" + reason.toString()));
    });
    ws.on("message", async raw => {
      try {
        const message = JSON.parse(raw.toString("utf8"));
        if (message.type === "challenge") {
          const signed = handshakePayload({
            origin: ORIGIN, roomId, inviteNonce: nonce, role,
            fingerprint: device.fingerprint,
            publicKeySpki: device.publicKeySpki,
            challenge: message.challenge,
            challengeExpiresAt: message.challengeExpiresAt
          });
          const hello = {
            type: "hello",
            inviteNonce: nonce,
            fingerprint: device.fingerprint,
            publicKeySpki: device.publicKeySpki,
            signature: await sign(device.privateKey, signed)
          };
          if (inviteCode) hello.inviteCode = inviteCode;
          ws.send(JSON.stringify(hello));
        } else if (message.type === "hello-accepted") {
          assert.equal(message.role, role);
          assert.equal(message.roomId, roomId);
          finish(null, { accepted: message });
        } else if (message.type === "server-error") {
          finish(new Error("STAGING_SERVER_REJECTED_" + message.code));
        }
      } catch (error) {
        finish(error);
      }
    });
  });
}

async function main() {
  const health = await fetch(ROOT + "/health");
  assert.equal(health.status, 200, "deployed Worker health endpoint");
  const healthBody = await health.json();
  assert.equal(healthBody.service, "ezero-connect-signal");
  assert.equal(healthBody.status, "ok");
  assert.equal(healthBody.release, "staging");

  const denied = await fetch(ROOT + "/", { headers: { Origin: "https://invalid.example" } });
  assert.equal(denied.status, 403, "untrusted browser origins must be rejected");

  const roomId = randomId();
  const nonce = randomId();
  const originalDevice = await makeDevice();
  const inviteCode = await makeInvite(originalDevice, roomId, nonce);
  const first = await authenticate("host", roomId, nonce, originalDevice, inviteCode);

  const reconnect = await authenticate("host", roomId, nonce, originalDevice);
  assert.equal(reconnect.accepted.role, "host");
  const oldSocketClose = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("OLD_SOCKET_REPLACEMENT_TIMEOUT")), 5_000);
    first.ws.once("close", (code, reason) => {
      clearTimeout(timer);
      resolve({ code, reason: reason.toString() });
    });
  });
  assert.equal(oldSocketClose.code, 4001,
    "authenticated same-device reconnect should replace the previous host socket");

  const attacker = await makeDevice();
  await assert.rejects(
    () => authenticate("host", roomId, nonce, attacker),
    /STAGING_SERVER_REJECTED|STAGING_EARLY_CLOSE|STAGING_SOCKET_ERROR/,
    "a different device must not take over the authenticated host role"
  );

  reconnect.ws.close();
  console.log("PASS: deployed Cloudflare Worker health and staging release marker");
  console.log("PASS: deployed Worker rejects an untrusted Origin");
  console.log("PASS: real Durable Object accepts signed host invite and challenge");
  console.log("PASS: same authenticated device reconnect replaces its old WebSocket");
  console.log("PASS: a different device cannot take over the authenticated host role");
  console.log("BOUNDARY: synthetic staging identities only; no saved contacts, calls, SDP/media, push, or production data");
}

main().catch(error => {
  console.error("EZERO_LIVE_STAGING_SMOKE_FAILED:", error.message);
  process.exitCode = 1;
});
