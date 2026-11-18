import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../js/ezero_saved_friend_stage_engine_v0_1.js",import.meta.url),"utf8");
const initPeer=source.match(/async function initPeer\(\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(initPeer,"Saved-friend peer initialization must exist");
const connection=initPeer[1].match(/p\.onconnectionstatechange=\(\)=>\s*\{([\s\S]*?)\n    \};/);
assert.ok(connection,"Peer connection state handler must exist");
assert.match(connection[1],/connectionState==="disconnected"/,
  "A mobile network path loss must be explicitly observed");
assert.match(connection[1],/setTimeout\([\s\S]*?15000/,
  "Transient disconnection must receive a bounded 15-second recovery window");
assert.match(connection[1],/peer===p&&p\.connectionState==="disconnected"/,
  "The expiry callback must verify the same peer is still disconnected");
assert.match(connection[1],/connectionState==="connected"[\s\S]*?clearTimeout\(peerDisconnectGuardTimer\)/,
  "A recovered connection must cancel the pending disconnect guard");
assert.match(connection[1],/connectionState==="failed"[\s\S]*?clearTimeout\(peerDisconnectGuardTimer\)/,
  "A failed connection must cancel the transient recovery timer");
assert.doesNotMatch(connection[1],/restartIce\(|createOffer\(/,
  "The disconnect handler must not silently create a new call or restart ICE");

const hangup=source.match(/function hardHangup\(show=true\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(hangup,"Shared hangup cleanup must exist");
assert.match(hangup[1],/clearTimeout\(peerDisconnectGuardTimer\)[\s\S]*?peerDisconnectGuardTimer=null/,
  "Hangup must synchronously cancel the network recovery timer");

console.log("EZERO_MOBILE_DISCONNECT_STATE_IS_EXPLICIT: PASS");
console.log("EZERO_TRANSIENT_NETWORK_LOSS_HAS_15S_RECOVERY_WINDOW: PASS");
console.log("EZERO_NETWORK_RECOVERY_CLEARS_GUARD_WITHOUT_NEW_CALL: PASS");
console.log("EZERO_HANGUP_CLEARS_NETWORK_RECOVERY_TIMER: PASS");
