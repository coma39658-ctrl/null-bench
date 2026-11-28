/* E-ZERO Trusted Friends external inbox STAGING gate (2026-11-28).
 * FAIL-CLOSED: keep this experimental inbox disabled until all three gates pass:
 * 1) the exact Worker is deployed in an isolated staging account with the exact
 *    GitHub Pages Origin and a dedicated Durable Object namespace;
 * 2) client and Worker use the same endpoint, handshake, authenticated message
 *    names, call invite/response schema, and server-authoritative friendship gate;
 * 3) signed handshake plus two-device foreground tests pass against that Worker.
 *
 * The current browser client expects /v1/trusted/{fingerprint} and compact t
 * messages; the available Worker currently exposes /v1/inbox/{fingerprint} and
 * type messages. Do not enable either side by changing this flag alone.
 *
 * Existing QR/WebRTC calling has its own separate signaling path and is untouched.
 */
window.EZERO_TRUSTED_INBOX_CONFIG=Object.freeze({
  enabled:false,
  websocketOrigin:"",
  version:"0.2-fail-closed"
});
