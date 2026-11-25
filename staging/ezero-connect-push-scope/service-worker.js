"use strict";

// Dedicated-origin E-ZERO Connect worker. Deliberately has no install,
// activate, fetch, or cache handlers: it cannot alter another PWA's cache.
importScripts("./js/ezero_push_contract_v1.js");
const contract = self.EZERO_PUSH_CONTRACT_V1;

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let payload;
    try { payload = event.data ? event.data.json() : null; } catch { return; }
    const options = contract.notificationOptions(payload);
    if (!options) return;
    await self.registration.showNotification("E-ZERO Connect", options);
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const data = event.notification.data || {};
  if (typeof data.requestId !== "string" ||
      !/^[A-Za-z0-9_-]{22,86}$/.test(data.requestId) ||
      !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now()) return;
  event.waitUntil((async () => {
    const message = {
      type: "EZERO_INCOMING_CALL_WAKEUP",
      requestId: data.requestId,
      expiresAt: data.expiresAt,
      mode: data.mode === "video" ? "video" : "audio"
    };
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (windows.length) {
      await windows[0].focus();
      windows[0].postMessage(message);
      return;
    }
    const client = await self.clients.openWindow("./");
    if (client) client.postMessage(message);
  })());
});
