import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("ezero-connect-app.html", "utf8");
const app = readFileSync("js/ezero_connect_app_v1.js", "utf8");
const invite = readFileSync("js/ezero_connect_invite_v1.js", "utf8");
const ui = readFileSync("js/ezero_connect_pairing_auto_ui_v2.js", "utf8");
const pairing = readFileSync("js/ezero_connect_pairing_v2.js", "utf8");
const trust = readFileSync("js/ezero_connect_trust_v1.js", "utf8");
const config = readFileSync("js/ezero_connect_config_v1.js", "utf8");
const worker = readFileSync("signaling/ezero-connect-v1/wrangler.jsonc", "utf8");

for (const source of [
  "js/ezero_connect_config_v1.js",
  "js/ezero_connect_signal_client_v1.js",
  "js/ezero_connect_pairing_v2.js",
  "js/ezero_connect_app_v1.js",
  "js/ezero_connect_pairing_auto_ui_v2.js"
]) assert.ok(html.includes(source), `Missing browser module: ${source}`);
assert.ok(!html.includes("js/ezero_connect_pairing_ui_v1.js"), "Legacy approval UI must not be loaded");
assert.ok(!html.includes("js/ezero_connect_pairing_v1.js"), "Legacy pairing protocol must not be loaded");

assert.ok(html.includes('id="savedFriendsList"'), "Saved friend list container must exist");
assert.ok(html.includes('id="shareInviteLink"'), "A one-tap invite-link share action must exist");
assert.ok(html.includes('id="installEzero"'), "An install action must exist");
assert.ok(html.includes("90 سیکنڈ"), "The first invite must visibly explain its 90-second expiry");
assert.ok(app.includes("navigator.share"), "Invite link must use the native share sheet when available");
assert.ok(app.includes("#invite="), "Shared invite links must carry the signed invite token in the URL fragment");
assert.ok(app.includes("acceptInviteFromSharedLink"), "Opening a shared invite link must enter the same verification path");
assert.ok(app.includes("beforeinstallprompt"), "PWA install action must support the browser install prompt");
assert.ok(app.includes("ezero:invite-created"), "Host QR creation must start host pairing");
assert.ok(app.includes("ezero:invite-host-ready"), "Host QR must not be shown until the signed signaling handshake is ready");
assert.ok(app.includes("ezero:invite-host-failed"), "A failed host handshake must cancel the pending QR");
assert.ok(app.includes("ezero:invite-verified"), "Verified guest QR must start guest pairing");
assert.ok(invite.includes("origin: payload.origin"), "Verified invite must retain exact origin for signaling");
assert.ok(pairing.includes("event.peerHandshake"), "Pairing must require the Worker's peer challenge proof");
assert.ok(pairing.includes("saveVerifiedPeer"), "Pairing must automatically save after verified peer-ready");
assert.ok(trust.includes("TRUST_V2_PEER_SIGNATURE_INVALID"), "Trust module must cryptographically verify the peer challenge signature");
assert.ok(trust.includes("consented-invite-auto-save"), "V2 trust transcript must bind the one-time invite consent");
assert.ok(ui.includes("listTrustedContacts()"), "Saved contacts must render from encrypted local vault");
assert.ok(ui.includes("session.state"), "UI must render pairing state");
assert.ok(!ui.includes("pairApprove") && !ui.includes("approveOutgoing") && !ui.includes("approveIncoming"),
  "No redundant bilateral approval buttons may remain");
assert.ok(!ui.includes("pairSaveConsent") && !ui.includes("explicitConsent") && !ui.includes("pairSave"),
  "No separate save checkbox or Save button may remain");
assert.ok(config.includes("wss://ezero-connect-signal-staging-20261120.coma39658.workers.dev"),
  "Must use isolated signaling staging endpoint");
assert.ok(worker.includes('"PUBLIC_ORIGIN": "https://ezero-connect-pairing-v2-preview-20261123.onrender.com"'),
  "Worker origin must match current Render staging origin");
assert.ok(!ui.includes("getUserMedia("), "Pairing UI must not request camera or microphone");
assert.ok(!ui.includes("RTCPeerConnection("), "Pairing UI must not change or start the frozen calling engine");

console.log("EZERO_AUTOMATIC_INVITE_CONSENT_PAIRING_UI_CONTRACT_PASS");
