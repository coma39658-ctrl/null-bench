/* Explicit user-opened experimental lab page ONLY.
 * Production calls remain OFF in ezero_auto_signaling_config_v0_1.js.
 * Never embed Cloudflare API tokens, TURN keys or user secrets here.
 */
window.EZERO_AUTO_SIGNALING_CONFIG=Object.freeze({
 enabled:true,
 websocketOrigin:"wss://ezero-browser-signaling-pr156-preview-v2.coma39658.workers.dev",
 version:"0.1-pr156-preview-v2",
 maximumRoomMinutes:10
});
