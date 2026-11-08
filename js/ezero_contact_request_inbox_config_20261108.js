/* E-ZERO Friend-of-Friend request inbox: OFF by default everywhere.
 * Exact WebSocket endpoint must be verified after ISOLATED staged deployment.
 * The existing Cloudflare voice/video Workers must never be repointed.
 */
window.EZERO_REFERRAL_INBOX_STAGE_CONFIG=Object.freeze({
  enabled:false,
  allowedOrigin:"https://coma39658-ctrl.github.io",
  wsOrigin:""
});
