import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../js/ezero_saved_friend_stage_engine_v0_1.js",import.meta.url),"utf8");

const initPeer=source.match(/async function initPeer\(\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(initPeer,"The saved-friend peer initializer must exist");
assert.match(initPeer[1],/if\(peer\)throw Error\("HANGUP_FIRST"\)/,
  "A second peer must not be created while an earlier peer is active");
assert.match(initPeer[1],/if\(peer!==p\)\{localStream\.getTracks\(\)\.forEach\(track=>track\.stop\(\)\);return;\}/,
  "Media acquired after a user hangup must be stopped instead of resurrecting the old session");
assert.match(initPeer[1],/p\.onconnectionstatechange=\(\)=>\{/,
  "Peer connection state changes must be observed");
assert.match(initPeer[1],/if\(peer!==p\)return;/,
  "Stale peer callbacks must not mutate the next call session");

const withBusy=source.match(/async function withBusy\(fn\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(withBusy,"Call action serialization guard must exist");
assert.match(withBusy[1],/if\(busy\)return/,
  "Repeated create/accept/apply actions must be ignored while a call action is pending");
assert.match(withBusy[1],/finally\{busy=false/,
  "Call action lock must be released even when an action fails");

const hangup=source.match(/function hardHangup\(show=true\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(hangup,"The shared hardHangup cleanup path must exist");
for(const [pattern,label] of [
  [/clearVoiceTransfers\(\)/,"partial voice data and expiry timers"],
  [/if\(peer\)[\s\S]*?peer\.close\(\)[\s\S]*?peer=null/,"peer connection"],
  [/if\(localStream\)[\s\S]*?getTracks\(\)\.forEach\(x=>x\.stop\(\)\)[\s\S]*?localStream=null/,"local microphone and camera tracks"],
  [/remoteStream=null/,"remote media stream reference"],
  [/remoteVideoGuardTimer=null/,"video guard timeout"],
  [/window\.EZERO_ACTIVE_CALL_MODE=null/,"active call mode"],
  [/window\.EZERO_SELECTED_CALL_MODE=null/,"selected call mode"]
]){
  assert.match(hangup[1],pattern,"Hangup must clean up "+label);
}
assert.match(hangup[1],/\["localVideo","remoteVideo"\][\s\S]*?srcObject=null/,
  "Local and remote video elements must release their media stream references");

console.log("EZERO_SAVED_FRIEND_RECONNECT_REUSES_CLEAN_PEER_SESSION: PASS");
console.log("EZERO_DUPLICATE_CALL_ACTIONS_ARE_SERIALIZED: PASS");
console.log("EZERO_HANGUP_STOPS_LOCAL_MEDIA_AND_CLOSES_PEER: PASS");
console.log("EZERO_HANGUP_RESETS_CALL_MODE_AND_VIDEO_REFERENCES: PASS");
console.log("EZERO_LATE_MEDIA_PERMISSION_RESOLUTION_CANNOT_RESURRECT_HUNGUP_CALL: PASS");
