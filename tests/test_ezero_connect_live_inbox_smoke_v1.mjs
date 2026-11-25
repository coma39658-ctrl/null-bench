import assert from "node:assert/strict";
import { chromium } from "playwright";

const appUrl = "https://ezero-connect-pairing-v2-preview-20261123.onrender.com/ezero-connect-app.html";
const workerBase = "https://ezero-connect-signal-staging-20261120.coma39658.workers.dev";

const healthResponse = await fetch(workerBase + "/health", { signal: AbortSignal.timeout(15000) });
assert.equal(healthResponse.status, 200, "staging Worker health endpoint must return HTTP 200");
const health = await healthResponse.json();
assert.equal(health.service, "ezero-connect-signal");
assert.equal(health.status, "ok");
assert.equal(health.release, "staging");

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(appUrl, { waitUntil: "domcontentloaded", timeout: 30000 });

  const result = await page.evaluate(async ({ workerBase }) => {
    const encoder = new TextEncoder();
    const canonical = value => {
      if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
      if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
      if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
      if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
        return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
      }
      throw new Error("TEST_CANONICAL_INVALID");
    };
    const base64url = bytes => {
      let binary = "";
      for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
      return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
    };

    const keys = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]
    );
    const spki = await crypto.subtle.exportKey("spki", keys.publicKey);
    const publicKeySpki = base64url(spki);
    const digest = await crypto.subtle.digest("SHA-256", spki);
    const fingerprint = Array.from(new Uint8Array(digest),
      byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
    const url = new URL(workerBase);
    url.protocol = "wss:";
    url.pathname = "/v1/inbox/" + fingerprint;
    url.search = "";
    url.hash = "";

    return await new Promise((resolve, reject) => {
      const socket = new WebSocket(url.toString());
      let settled = false;
      const timeout = setTimeout(() => finish(new Error("LIVE_INBOX_HANDSHAKE_TIMEOUT")), 15000);
      function finish(error, value) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        try { socket.close(); } catch (_) {}
        if (error) reject(error);
        else resolve(value);
      }
      socket.addEventListener("error", () => finish(new Error("LIVE_INBOX_WEBSOCKET_ERROR")));
      socket.addEventListener("close", event => {
        if (!settled) finish(new Error("LIVE_INBOX_CLOSED_BEFORE_AUTH_" + event.code));
      });
      socket.addEventListener("message", async event => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "challenge") {
            const p = message.payload;
            if (!p || p.protocol !== "E-ZERO-INBOX-HELLO-1" ||
                p.origin !== location.origin || p.inboxFingerprint !== fingerprint ||
                !Number.isSafeInteger(p.challengeExpiresAt) || p.challengeExpiresAt <= Date.now()) {
              throw new Error("LIVE_INBOX_CHALLENGE_BINDING_INVALID");
            }
            const proof = {
              v: 1,
              protocol: "E-ZERO-INBOX-HELLO-1",
              origin: location.origin,
              fingerprint,
              inboxFingerprint: fingerprint,
              challenge: p.challenge,
              challengeExpiresAt: p.challengeExpiresAt
            };
            const signature = base64url(await crypto.subtle.sign(
              { name: "ECDSA", hash: "SHA-256" }, keys.privateKey, encoder.encode(canonical(proof))
            ));
            socket.send(JSON.stringify({ type: "hello", fingerprint, publicKeySpki, signature }));
            return;
          }
          if (message.type === "inbox-ready" && message.fingerprint === fingerprint) {
            finish(null, { authenticated: true, origin: location.origin, fingerprint });
            return;
          }
          throw new Error("LIVE_INBOX_UNEXPECTED_MESSAGE_" + String(message.type));
        } catch (error) {
          finish(error instanceof Error ? error : new Error("LIVE_INBOX_MESSAGE_FAILED"));
        }
      });
    });
  }, { workerBase });

  assert.equal(result.authenticated, true);
  assert.match(result.fingerprint, /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  console.log("LIVE_STAGING_WORKER_HEALTH_PASS");
  console.log("LIVE_STAGING_INBOX_LITERAL_FINGERPRINT_ROUTE_PASS");
  console.log("LIVE_STAGING_SIGNED_DEVICE_CHALLENGE_PASS");
  console.log("LIVE_STAGING_INBOX_AUTHENTICATION_PASS");
  await context.close();
} finally {
  await browser.close();
}
