import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// QR entry, identity, invite, signal client, pairing modules and app shell remain exact frozen blobs.
// The trust-vault file may add only the separately tested read-only call lookup; its pairing/save
// behavior remains covered by the full two-profile browser contract in test_ezero_connect_trust_v1.mjs.
const frozen = {
  "ezero-connect-app.html": "c275f90e5c13c7e2a230fc438cccad01d3689efe",
  "js/ezero_connect_identity_v1.js": "164b1571ab6fbef759f17417b70350f1d5a56d29",
  "js/ezero_connect_invite_v1.js": "857109f14d728bb0bf08421e3bd6b8e7f67209c4",
  "js/ezero_connect_signal_client_v1.js": "108ff382d8221cf856b3b4ec1a6877d867341218",
  "js/ezero_connect_pairing_v2.js": "e29dde007456e850e92ec41078f3fd2b669892f0",
  "js/ezero_connect_pairing_auto_ui_v2.js": "943f9b282ad72574f468593ba9f9440822fa2991",
  "js/ezero_connect_app_v1.js": "982b8d422374c1b9051fccb1ade65c67aa587862"
};

for (const [path, expected] of Object.entries(frozen)) {
  const actual = execFileSync("git", ["rev-parse", `HEAD:${path}`], { encoding: "utf8" }).trim();
  assert.equal(actual, expected, `FROZEN_QR_PAIRING_FILE_CHANGED: ${path}`);
}

const html = execFileSync("git", ["show", "HEAD:ezero-connect-app.html"], { encoding: "utf8" });
assert.match(html, /id="audioCall"[^>]*disabled/);
assert.match(html, /id="videoCall"[^>]*disabled/);
assert.doesNotMatch(html, /ezero_trusted_friends_staging|ezero_saved_friend_stage_engine/);
assert.match(html, /ezero_connect_saved_calls\.js/);
assert.match(html, /ezero_connect_media_v1\.js/);
assert.match(html, /ezero_connect_media_ui_v1\.js/);
console.log("EZERO_QR_AND_AUTO_FRIEND_PAIRING_BASELINE_FROZEN_PASS");
