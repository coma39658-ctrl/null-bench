/* E-ZERO Trusted Friends external inbox STAGING gate (2026-11-06).
 * This preview is enabled ONLY after an isolated Cloudflare Durable Object deployment
 * and a real signed staging handshake were verified. Existing QR calling uses its own
 * separate, working one-request signaling config.
 */
window.EZERO_TRUSTED_INBOX_CONFIG=Object.freeze({
  enabled:true,
  expectedOrigin:"https://coma39658-ctrl.github.io",
  callPage:"/null-bench/ezero_trusted_friends_staging_20261106.html",
  websocketOrigin:"wss://ezero-trusted-friends-inbox-staging.coma39658.workers.dev",
  version:"0.1-pre-release-test"
});