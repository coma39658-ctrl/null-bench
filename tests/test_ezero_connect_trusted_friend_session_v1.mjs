import assert from "node:assert/strict";
import { createTrustedFriendMessagingSession } from "../js/ezero_connect_trusted_friend_session_v1.mjs";

const relationshipId = "a".repeat(64);
const localFingerprint = "01:".repeat(31) + "01";
const remoteFingerprint = "02:".repeat(31) + "02";
let rendezvousOptions, transportOptions, startCount = 0;
const relayed = [];
const rendezvous = {
  ready: Promise.resolve({ state: "authenticated", relationshipId }),
  state: "authenticated",
  close() { this.state = "closed"; },
  on() { return () => {}; },
  send(type, payload) { relayed.push({ type, payload }); }
};
const rendezvousFactory = options => { rendezvousOptions = options; return rendezvous; };
const transport = {
  ready: Promise.resolve({ state: "secure", relationshipId }),
  state: "secure",
  start() { startCount++; return this.ready; },
  close() {},
  sendText: async text => ({ messageId: "m1", text }),
  sendVoice: async bytes => ({ messageId: "m2", length: bytes.length }),
  subscribe() { return () => {}; }
};
const transportFactory = options => { transportOptions = options; return transport; };
const trustApi = {
  async getTrustedContact(id) {
    assert.equal(id, relationshipId);
    return { status: "TRUSTED", relationshipId, remoteFingerprint };
  }
};
const identityApi = {
  async getPublicIdentity() { return { fingerprint: localFingerprint }; }
};
const states = [];
const session = createTrustedFriendMessagingSession({
  relationshipId, signalingUrl: "wss://example.invalid",
  trustApi, identityApi, rendezvousFactory, transportFactory,
  onState: value => states.push(value.state)
});
assert.equal(session.state, "authenticated");
assert.equal(startCount, 0);
rendezvousOptions.onState({ state: "peer-ready", peerFingerprint: remoteFingerprint });
const ready = await session.ready;
assert.equal(ready.state, "secure");
assert.equal(startCount, 1);
assert.equal(transportOptions.signalingSession, rendezvous);
assert.equal(transportOptions.localFingerprint, localFingerprint);
assert.equal(transportOptions.remoteFingerprint, remoteFingerprint);
assert.equal(await session.sendText("hello").then(x => x.text), "hello");
assert.equal((await session.sendVoice(new Uint8Array([1,2,3]))).length, 3);
const callController = await session.createCallController({ callIdFactory: () => "C".repeat(32) });
await callController.ready;
const outgoingCall = await callController.call("audio");
assert.equal(outgoingCall.callId, "C".repeat(32));
assert.equal(relayed.at(-1).type, "call-invite");
assert.equal(relayed.at(-1).payload.callId, outgoingCall.callId);
callController.close();
session.close();
assert.equal(session.state, "closed");
assert.ok(states.includes("rendezvous-peer-ready"));
console.log("PASS saved-friend session waits for authenticated peer-ready before WebRTC startup");
console.log("PASS remote fingerprint must match the locally saved trusted friend");
console.log("PASS secure transport exposes text and voice sends without repeating QR pairing");
console.log("PASS saved-friend messaging session exposes call control over the same authenticated rendezvous");
console.log("BOUNDARY: orchestration contract test only; no real RTC, TURN, physical device, or background push proof");
