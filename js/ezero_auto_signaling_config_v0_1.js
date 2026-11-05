/* E-ZERO auto-call feature flag. Remains OFF until a verified, owned signaling
 * server and STUN/TURN deployment pass real two-device testing.
 * NEVER place TURN service API tokens or room secrets in this static file. */
window.EZERO_AUTO_SIGNALING_CONFIG=Object.freeze({
  enabled:false,
  websocketOrigin:"",
  version:"0.1",
  maximumRoomMinutes:10
});
