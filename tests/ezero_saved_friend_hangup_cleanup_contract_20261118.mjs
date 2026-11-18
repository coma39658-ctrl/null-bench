import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const source=readFileSync(new URL("../js/ezero_saved_friend_stage_engine_v0_1.js",import.meta.url),"utf8");
const helper=source.match(/function clearVoiceTransfers\(\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(helper,"A dedicated synchronous voice-transfer cleanup helper must exist");
assert.match(helper[1],/clearTimeout\(transfer\.timer\)/,
  "Every pending chunk-expiry timer must be cancelled");
assert.match(helper[1],/voiceTransfers\.clear\(\)/,
  "All incomplete in-memory voice transfers must be discarded");

const hangup=source.match(/function hardHangup\(show=true\)\s*\{([\s\S]*?)\n  \}/);
assert.ok(hangup,"The shared hardHangup cleanup path must exist");
assert.ok(hangup[1].indexOf("clearVoiceTransfers()")>=0,
  "Hangup must clear partial voice transfers synchronously");
assert.ok(hangup[1].indexOf("clearVoiceTransfers()")<
  hangup[1].indexOf("channel.onmessage=channel.onopen=channel.onclose=null"),
  "Voice timers must be cleared before detaching DataChannel close handlers");

const closeHandler=source.match(/c\.onclose=\(\)=>\s*\{([\s\S]*?)\n    \};/);
assert.ok(closeHandler,"DataChannel close cleanup must remain installed");
assert.match(closeHandler[1],/clearVoiceTransfers\(\)/,
  "Unexpected DataChannel close must use the same cleanup helper");

console.log("EZERO_HANGUP_CLEARS_PENDING_VOICE_TRANSFER_TIMERS: PASS");
console.log("EZERO_HANGUP_DISCARDS_PARTIAL_VOICE_DATA_SYNCHRONOUSLY: PASS");
console.log("EZERO_DATACHANNEL_CLOSE_REUSES_SHARED_CLEANUP: PASS");
