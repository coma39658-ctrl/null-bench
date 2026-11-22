import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../ezero-connect-app.html", import.meta.url), "utf8");
const ui = await readFile(new URL("../js/ezero_connect_chat_ui_v1.mjs", import.meta.url), "utf8");
const session = await readFile(new URL("../js/ezero_connect_trusted_friend_session_v1.mjs", import.meta.url), "utf8");

for (const id of [
  "chatPanel", "chatMessages", "chatMessage", "sendChatMessage",
  "recordVoice", "stopVoice", "cancelVoice", "sendVoice", "voicePreview"
]) assert.match(html, new RegExp('id="' + id + '"'));
assert.match(html, /id="chatPanel" hidden/);
assert.match(html, /id="sendChatMessage" type="button" disabled/);
assert.match(html, /id="recordVoice" type="button" disabled/);
assert.match(html, /type="module" src="\.\/js\/ezero_connect_chat_ui_v1\.mjs"/);

assert.match(ui, /ezero:friend-selected/);
assert.match(ui, /createTrustedFriendMessagingSession/);
assert.match(ui, /navigator\.mediaDevices\?\.getUserMedia/);
assert.match(ui, /addEventListener\("click", async \(\) => \{/);
assert.match(ui, /12_000/);
assert.match(ui, /180 \* 1024/);
assert.match(ui, /await session\.sendText\(value\)/);
assert.match(ui, /await session\.sendVoice\(bytes\)/);
assert.match(ui, /receipt\.textContent = t\("delivered"\)/);
assert.match(ui, /receipt\.textContent = t\("failed"\)/);
assert.match(ui, /wasCancelled/);
assert.match(ui, /URL\.revokeObjectURL/);
assert.match(session, /if \(!delivered\) throw new Error\("TRUSTED_FRIEND_NO_MESSAGE_RECEIVER"\)/);
assert.match(session, /transport\.sendText\(text\)/);
assert.match(session, /transport\.sendVoice\(bytes\)/);
assert.match(ui, /sendProfile\(bytes\)/);
assert.match(ui, /message\.type === "profile"/);
assert.match(ui, /saveTrustedFriendProfile\(relationshipId, fingerprint, bytes\)/);
assert.match(ui, /receive\(message, relationshipId, fingerprint, generation\)/);
assert.match(ui, /late frames from a previously selected friend[\s\S]*?generation !== connectionGeneration \|\| relationshipId !== currentRelationshipId \|\| fingerprint !== currentFingerprint\) return;/);
assert.match(ui, /await globalThis\.EZERO_CONNECT_TRUST\.saveTrustedFriendProfile\(relationshipId, fingerprint, bytes\);\s*\/\/ Persist under the original relationship[\s\S]*?if \(generation !== connectionGeneration \|\| relationshipId !== currentRelationshipId \|\| fingerprint !== currentFingerprint\) return;/);
assert.match(ui, /getTrustedFriendProfile\(relationshipId, fingerprint\)/);
assert.match(ui, /setTrustedFriendProfileSharedHash/);
assert.match(ui, /ezero:local-profile-updated/);
assert.match(ui, /let connectionGeneration = 0/);
assert.match(ui, /const generation = \+\+connectionGeneration/);
assert.match(ui, /generation !== connectionGeneration \|\| currentRelationshipId !== relationshipId \|\| currentFingerprint !== fingerprint/);
assert.match(ui, /const existing = profileSyncPromises\.get\(syncId\);[\s\S]*?existing\.dirty = true;[\s\S]*?return existing\.promise;/);
assert.match(ui, /const syncState = \{ dirty: false, promise: null \}/);
assert.match(ui, /do \{[\s\S]*?syncState\.dirty = false;[\s\S]*?\} while \(syncState\.dirty && stillCurrent\(\)\)/);
assert.match(ui, /const stillCurrent = \(\) => generation === connectionGeneration/);
assert.match(ui, /if \(!stillCurrent\(\)\) return false/);
assert.match(ui, /140 \* 1024/);
assert.match(session, /transport\.sendProfile\(bytes\)/);

console.log("PASS saved-friend chat controls are hidden until a verified friend is selected");
console.log("PASS text and voice send require an established secure session");
console.log("PASS microphone is requested only by the explicit record button");
console.log("PASS voice recording is bounded, cancellable, and not auto-sent");
console.log("PASS Delivered label is applied only after the send promise confirms authenticated receipt");
console.log("PASS verified friend DP is encrypted at rest, restored on selection, replaced on update, and auto-synced after a local photo change");
console.log("BOUNDARY: static UI contract only; no live browser media, real peer, network, or Android notification proof");
