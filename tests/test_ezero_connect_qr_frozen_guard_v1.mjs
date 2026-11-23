import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

// These exact Git blobs are the already-tested QR + friend-pairing baseline.
// Any intentional QR change requires a separate, reviewed QR release gate.
const frozen = {
  "ezero-connect-app.html": "d1267b5e157327f43201e2e8e3eb461b4092bb6d",
  "js/ezero_connect_identity_v1.js": "164b1571ab6fbef759f17417b70350f1d5a56d29",
  "js/ezero_connect_invite_v1.js": "857109f14d728bb0bf08421e3bd6b8e7f67209c4",
  "js/ezero_connect_trust_v1.js": "b999f54feacea438870eae67f89102fcd8346b6d",
  "js/ezero_connect_signal_client_v1.js": "108ff382d8221cf856b3b4ec1a6877d867341218",
  "js/ezero_connect_pairing_v2.js": "e29dde007456e850e92ec41078f3fd2b669892f0",
  "js/ezero_connect_pairing_auto_ui_v2.js": "85918b49691cdb2c1ab59c8f191738b589a56fc4",
  "js/ezero_connect_app_v1.js": "f475f6bf563753c6f09d5c06eca0920cd5bf1182"
};

for (const [path, expected] of Object.entries(frozen)) {
  const actual = execFileSync("git", ["rev-parse", `HEAD:${path}`], { encoding: "utf8" }).trim();
  assert.equal(actual, expected, `FROZEN_QR_PAIRING_FILE_CHANGED: ${path}`);
}

const html = execFileSync("git", ["show", "HEAD:ezero-connect-app.html"], { encoding: "utf8" });
assert.match(html, /id="audioCall"[^>]*disabled/);
assert.match(html, /id="videoCall"[^>]*disabled/);
assert.doesNotMatch(html, /ezero_trusted_friends_staging|ezero_saved_friend_stage_engine/);
console.log("EZERO_QR_AND_AUTO_FRIEND_PAIRING_BASELINE_FROZEN_PASS");
