"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const contract = require("../js/ezero_push_contract_v1.js");

function load(permission = "granted") {
  const handlers = {};
  const shown = [];
  const opened = [];
  const posted = [];
  const client = { focus: async () => {}, postMessage: message => posted.push(message) };
  const self = {
    EZERO_PUSH_CONTRACT_V1: contract,
    registration: { showNotification: async (title, options) => shown.push({ title, options }) },
    clients: {
      matchAll: async () => [],
      openWindow: async path => { opened.push(path); return client; }
    },
    addEventListener: (name, fn) => { handlers[name] = fn; }
  };
  class FakeNotification {}
  FakeNotification.permission = permission;
  const source = fs.readFileSync(require.resolve("../staging/ezero-connect-push-scope/service-worker.js"), "utf8");
  vm.runInNewContext(source, { self, Notification: FakeNotification, Date, importScripts() {} });
  return { handlers, shown, opened, posted };
}
const now = Date.now();
const payload = { v:1, type:"incoming-call", requestId:"R".repeat(24), issuedAt:now, expiresAt:now+30000, mode:"video" };
function pushEvent(data) {
  let pending;
  return { event:{ data:{ json:()=>data }, waitUntil:p=>{pending=p;} }, done:()=>pending };
}

test("isolated worker registers only push and notification-click handlers", () => {
  const w = load();
  assert.deepEqual(Object.keys(w.handlers).sort(), ["notificationclick","push"]);
});
test("isolated worker shows generic notification only for valid push", async () => {
  const w = load(), e = pushEvent(payload);
  w.handlers.push(e.event); await e.done();
  assert.equal(w.shown.length, 1);
  assert.equal(w.shown[0].title, "E-ZERO Connect");
  assert.match(w.shown[0].options.body, /review/i);
});
test("isolated worker ignores malformed, expired and permission-denied pushes", async () => {
  const w = load();
  for (const p of [{...payload,sdp:"secret"},{...payload,expiresAt:now-1},{...payload,mode:"invalid"}]) {
    const e=pushEvent(p); w.handlers.push(e.event); await e.done();
  }
  const denied=load("denied"), e=pushEvent(payload);
  denied.handlers.push(e.event); await e.done();
  assert.equal(w.shown.length,0);
  assert.equal(denied.shown.length,0);
});
test("notification click opens app with wake-up only, never auto-accept", async () => {
  const w=load(); let pending;
  w.handlers.notificationclick({
    action:"open",
    notification:{data:{requestId:payload.requestId,expiresAt:now+10000,mode:"video"},close(){}},
    waitUntil:p=>{pending=p;}
  });
  await pending;
  assert.deepEqual(w.opened,["./"]);
  assert.equal(w.posted[0].type,"EZERO_INCOMING_CALL_WAKEUP");
  assert.equal("accept" in w.posted[0],false);
});
