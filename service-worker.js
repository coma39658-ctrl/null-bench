const CACHE_NAME = "ezero-null-bench-v7-ai-studio-v03-20261103";

const APP_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith("ezero-null-bench-") && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  // Never cache or proxy third-party sites, Cloudflare AI responses, or
  // unrelated same-origin paths. Offline support is only for this PWA.
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin ||
      !url.pathname.startsWith(new URL(self.registration.scope).pathname))
    return;

  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then(response => {
        const copy = response.clone();

        if (response.ok) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
        }

        return response;
      })
      .catch(() => caches.match(event.request))
  );
});


// E-ZERO incoming-call wake-up only. A push never accepts a call or starts media.
const EZERO_PUSH_MAX_TTL_MS = 90_000;
const EZERO_PUSH_ID_RE = /^[A-Za-z0-9_-]{22,86}$/;

function ezeroValidatePushEnvelope(value, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  if (Object.keys(value).sort().join(",") !== "expiresAt,issuedAt,mode,requestId,type,v") return null;
  if (value.v !== 1 || value.type !== "incoming-call") return null;
  if (!EZERO_PUSH_ID_RE.test(value.requestId)) return null;
  if (value.mode !== "audio" && value.mode !== "video") return null;
  if (!Number.isSafeInteger(value.issuedAt) || !Number.isSafeInteger(value.expiresAt)) return null;
  if (value.issuedAt > now + 5_000 || value.expiresAt <= now) return null;
  if (value.expiresAt <= value.issuedAt || value.expiresAt - value.issuedAt > EZERO_PUSH_MAX_TTL_MS) return null;
  return {
    requestId: value.requestId,
    issuedAt: value.issuedAt,
    expiresAt: value.expiresAt,
    mode: value.mode
  };
}

self.addEventListener("push", event => {
  event.waitUntil((async () => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let payload;
    try {
      payload = event.data ? event.data.json() : null;
    } catch {
      return;
    }
    const safe = ezeroValidatePushEnvelope(payload);
    if (!safe) return;
    await self.registration.showNotification("E-ZERO Connect", {
      body: "Incoming call request. Open E-ZERO Connect to review.",
      tag: "ezero-call-" + safe.requestId,
      renotify: false,
      requireInteraction: true,
      data: {
        requestId: safe.requestId,
        expiresAt: safe.expiresAt,
        mode: safe.mode
      },
      actions: [
        { action: "open", title: "Open" },
        { action: "dismiss", title: "Dismiss" }
      ]
    });
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;
  const data = event.notification.data || {};
  if (!EZERO_PUSH_ID_RE.test(data.requestId || "") ||
      !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now()) return;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const message = {
      type: "EZERO_INCOMING_CALL_WAKEUP",
      requestId: data.requestId,
      expiresAt: data.expiresAt,
      mode: data.mode === "video" ? "video" : "audio"
    };
    if (windows.length) {
      const client = windows[0];
      await client.focus();
      client.postMessage(message);
      return;
    }
    const client = await self.clients.openWindow("./");
    if (client) client.postMessage(message);
  })());
});
