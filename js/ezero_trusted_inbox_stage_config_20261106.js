/* E-ZERO Trusted Friends external inbox STAGING gate (2026-11-19).
 * This pre-release-test preview endpoint is enabled only after the isolated PR156 Worker
 * passed origin, signed-handshake, replay, cooldown and revocation smoke tests.
 * Existing QR/WebRTC signaling remains on its separate endpoint.
 */
window.EZERO_TRUSTED_INBOX_CONFIG=Object.freeze({
  enabled:true,
  websocketOrigin:"wss://ezero-trusted-inbox-pr156-preview-v2.coma39658.workers.dev",
  version:"pr156-preview-v2-20261119"
});
