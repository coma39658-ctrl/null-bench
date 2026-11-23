import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("ezero-connect-app.html", "utf8");
const app = readFileSync("js/ezero_connect_app_v1.js", "utf8");
const invite = readFileSync("js/ezero_connect_invite_v1.js", "utf8");
const ui = readFileSync("js/ezero_connect_pairing_ui_v1.js", "utf8");
const config = readFileSync("js/ezero_connect_config_v1.js", "utf8");
const worker = readFileSync("signaling/ezero-connect-v1/wrangler.jsonc", "utf8");

for (const source of [
  "js/ezero_connect_config_v1.js",
  "js/ezero_connect_signal_client_v1.js",
  "js/ezero_connect_pairing_v1.js",
  "js/ezero_connect_app_v1.js",
  "js/ezero_connect_pairing_ui_v1.js"
]) assert.ok(html.includes(source), `Missing browser module: ${source}`);

assert.ok(html.includes('id="savedFriendsList"'), "Saved friend list container must exist");
assert.ok(html.includes('id="shareInviteLink"'), "A one-tap invite-link share action must exist");
assert.ok(html.includes('id="installEzero"'), "An install action must exist");
assert.ok(html.includes("صرف 90 سیکنڈ") || html.includes("90 سیکنڈ تک"), "The first invite must visibly explain its 90-second expiry");
assert.ok(app.includes('navigator.share'), "Invite link must use the native share sheet when available");
assert.ok(app.includes('#invite='), "Shared invite links must carry the signed invite token in the URL fragment");
assert.ok(app.includes('acceptInviteFromSharedLink'), "Opening a shared invite link must enter the same verification path");
assert.ok(app.includes('beforeinstallprompt'), "PWA install action must support the browser install prompt");
assert.ok(app.includes('ezero:invite-created'), "Host QR creation must start host pairing");
assert.ok(app.includes('ezero:invite-verified'), "Verified guest QR must start guest pairing");
assert.ok(invite.includes("origin: payload.origin"), "Verified invite must retain exact origin for signaling");
assert.ok(ui.includes('session.approveOutgoing()'), "Host must explicitly approve outgoing friend request");
assert.ok(ui.includes('session.approveIncoming()'), "Guest must explicitly approve incoming friend request");
assert.ok(ui.includes('session.save({ displayName, explicitConsent: true })'), "Each device must explicitly consent before local save");
assert.ok(ui.includes('listTrustedContacts()'), "Saved contacts must render from encrypted local vault");
assert.ok(ui.includes('pairSaveConsent'), "Local save consent checkbox must be present");
assert.ok(ui.includes('pairDecline'), "Decline/cancel control must be present");
assert.ok(config.includes("wss://ezero-connect-signal-staging-20261120.coma39658.workers.dev"), "Must use isolated signaling staging endpoint");
assert.ok(worker.includes('"PUBLIC_ORIGIN": "https://ezero-connect-camera-preview-20261120.onrender.com"'), "Worker origin must match current Render staging origin");
assert.ok(!ui.includes("getUserMedia("), "Pairing UI must not request camera or microphone");
assert.ok(!ui.includes("RTCPeerConnection("), "Pairing UI must not change or start the frozen calling engine");

console.log("EZERO_MUTUAL_APPROVAL_UI_WIRING_CONTRACT_PASS");
