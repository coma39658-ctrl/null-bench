(() => {
  "use strict";
  const existing = globalThis.EZERO_CONNECT_CONFIG || {};
  globalThis.EZERO_CONNECT_CONFIG = Object.freeze({
    signalingUrl: typeof existing.signalingUrl === "string" ? existing.signalingUrl : ""
  });
})();
