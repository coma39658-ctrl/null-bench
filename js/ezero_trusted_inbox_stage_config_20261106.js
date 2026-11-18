/* E-ZERO Trusted Friends external inbox STAGING gate (2026-11-06).
 * This preview is enabled ONLY after an isolated Cloudflare Durable Object deployment
 * and a real signed staging handshake were verified. Existing QR calling uses its own
 * separate, working one-request signaling config.
 */
window.EZERO_TRUSTED_INBOX_CONFIG=Object.freeze({
  enabled:true,
  websocketOrigin:"wss://ezero-trusted-inbox-pr156-preview-v2.coma39658.workers.dev",
  version:"0.1-pr156-preview-v2"
});