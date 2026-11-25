(() => {
  "use strict";
  const existing = globalThis.EZERO_CONNECT_CONFIG || {};
  globalThis.EZERO_CONNECT_CONFIG = Object.freeze({
    signalingUrl: typeof existing.signalingUrl === "string" && existing.signalingUrl
      ? existing.signalingUrl
      : "wss://ezero-connect-qr-clock-skew-staging-20261125.coma39658.workers.dev"
  });
})();
