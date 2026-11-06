/* E-ZERO Trusted Friends external inbox STAGING gate (2026-11-06).
 * Off until an isolated, authenticated Cloudflare Durable Object is deployed
 * and an exact WSS origin is verified. Existing QR calling uses its own
 * separate, working one-request signaling config.
 */
window.EZERO_TRUSTED_INBOX_CONFIG=Object.freeze({
  enabled:false,
  websocketOrigin:"",
  version:"0.1-dev-only"
});