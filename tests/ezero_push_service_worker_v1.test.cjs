"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function loadWorker(permission = "granted") {
  const handlers = {};
  const shown = [];
  const posted = [];
  const focused = [];
  const opened = [];
  const self = {
    location: { origin: "https://example.test" },
    registration: {
      scope: "https://example.test/",
      showNotification: async (title, options) => shown.push({ title, options })
    },
    clients: {
      matchAll: async () => [],
      openWindow: async url => {
        opened.push(url);
        return { postMessage: message => posted.push(message) };
      }
    },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    skipWaiting: () => Promise.resolve()
  };
  class FakeNotification {}
  FakeNotification.permission = permission;
  const context = {
    self,
    Notification: FakeNotification,
    caches: { open: async () => ({ addAll: async () => {}, put: async () => {} }), keys: async () => [], delete: async () => {}, match: async () => null },
    fetch: async () => ({ ok: true, clone: () => ({}) }),
    URL,
    Promise,
    Date
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../service-worker.js"), "utf8"), context);
  return { handlers, shown, posted, focused, opened, self };
}

const now = Date.now();
const envelope = {
  v: 1, type: "incoming-call", requestId: "A".repeat(24),
  issuedAt: now, expiresAt: now + 30_000, mode: "audio"
};
function pushEvent(payload) {
  let pending;
  return {
    event: { data: { json: () => payload }, waitUntil: promise => { pending = promise; } },
    done: () => pending
  };
}

test("service worker displays only a generic notification for valid push", async () => {
  const worker = loadWorker();
  const e = pushEvent(envelope);
  worker.handlers.push(e.event);
  await e.done();
  assert.equal(worker.shown.length, 1);
  assert.match(worker.shown[0].options.body, /review/i);
  assert.equal(worker.shown[0].options.data.requestId, envelope.requestId);
  assert.equal("sdp" in worker.shown[0].options.data, false);
});
test("service worker ignores expired, malformed and sensitive payloads", async () => {
  const worker = loadWorker();
  for (const payload of [
    { ...envelope, expiresAt: now - 1 },
    { ...envelope, sdp: "private" },
    { ...envelope, mode: "unsupported" },
    { ...envelope, requestId: "bad" }
  ]) {
    const e = pushEvent(payload);
    worker.handlers.push(e.event);
    await e.done();
  }
  assert.equal(worker.shown.length, 0);
});
test("service worker does not display when notification permission is denied", async () => {
  const worker = loadWorker("denied");
  const e = pushEvent(envelope);
  worker.handlers.push(e.event);
  await e.done();
  assert.equal(worker.shown.length, 0);
});
test("notification click opens app and sends wake-up only, never auto-accepts", async () => {
  const worker = loadWorker();
  let pending;
  const event = {
    action: "open",
    notification: {
      data: { requestId: envelope.requestId, expiresAt: now + 20_000, mode: "video" },
      close() {}
    },
    waitUntil: promise => { pending = promise; }
  };
  worker.handlers.notificationclick(event);
  await pending;
  assert.deepEqual(worker.opened, ["./"]);
  assert.equal(worker.posted[0].type, "EZERO_INCOMING_CALL_WAKEUP");
  assert.equal(worker.posted[0].mode, "video");
  assert.equal("accept" in worker.posted[0], false);
});
