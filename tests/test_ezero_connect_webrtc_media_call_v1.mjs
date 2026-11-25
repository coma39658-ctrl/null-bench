import assert from "node:assert/strict";
import { createWebRTCMediaCallTransport } from "../js/ezero_connect_webrtc_media_call_v1.mjs";

const callId = "A".repeat(32);
const remoteFingerprint = "11:".repeat(31) + "11";
class FakeTrack {
  constructor(kind) { this.kind = kind; this.readyState = "live"; }
  stop() { this.readyState = "ended"; }
}
class FakeStream {
  constructor(video) { this.tracks = [new FakeTrack("audio"), ...(video ? [new FakeTrack("video")] : [])]; }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter(t => t.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter(t => t.kind === "video"); }
}
class FakePeerConnection {
  static instances = [];
  constructor(config) { this.config = config; this.added = []; this.closed = false; this.connectionState = "new"; FakePeerConnection.instances.push(this); }
  addTrack(track, stream) { this.added.push({ track, stream }); }
  async createOffer() { return { type: "offer", sdp: "v=0\\r\\n".padEnd(120, "x") }; }
  async createAnswer() { return { type: "answer", sdp: "v=0\\r\\n".padEnd(120, "y") }; }
  async setLocalDescription(value) { this.localDescription = value; }
  async setRemoteDescription(value) { this.remoteDescription = value; }
  async addIceCandidate(value) { (this.candidates ||= []).push(value); }
  close() { this.closed = true; }
}
class FakeSignaling {
  constructor() { this.sent = []; this.listeners = new Set(); }
  send(type, payload) { this.sent.push({ type, payload }); }
  on(type, fn) { assert.equal(type, "message"); this.listeners.add(fn); return () => this.listeners.delete(fn); }
  async receive(message) { for (const fn of [...this.listeners]) await fn({ ...message, fromFingerprint: remoteFingerprint }); }
}

let micRequests = 0;
const mediaDevices = { async getUserMedia(constraints) {
  micRequests++;
  assert.deepEqual(constraints, { audio: true, video: false });
  return new FakeStream(false);
}};
const signaling = new FakeSignaling();
const caller = createWebRTCMediaCallTransport({
  signalingSession: signaling, callId, mode: "audio", role: "caller", remoteFingerprint,
  mediaDevices, RTCPeerConnectionImpl: FakePeerConnection
});
assert.equal(micRequests, 0, "construction must not request media");
await caller.start();
assert.equal(micRequests, 1);
const callerPc = FakePeerConnection.instances.at(-1);
assert.equal(callerPc.added.length, 1);
assert.equal(callerPc.added[0].track.kind, "audio");
assert.equal(signaling.sent.at(-1).type, "call-offer");
assert.equal(signaling.sent.at(-1).payload.callId, callId);
await signaling.receive({ type: "call-answer", payload: { callId: "Z".repeat(32), sdp: "v=0\\r\\n".padEnd(120, "z") } });
assert.equal(callerPc.remoteDescription, undefined, "wrong call ID must be ignored");
await signaling.receive({ type: "call-answer", payload: { callId, sdp: "v=0\\r\\n".padEnd(120, "z") } });
assert.equal(callerPc.remoteDescription.type, "answer");
callerPc.connectionState = "connected";
callerPc.onconnectionstatechange();
assert.equal((await caller.connected).state, "connected");
caller.close();
assert.equal(callerPc.closed, true);
assert.equal(callerPc.added[0].track.readyState, "ended");
assert.equal(signaling.sent.at(-1).type, "call-hangup");
assert.equal(signaling.sent.at(-1).payload.callId, callId);

const videoCalls = [];
const videoMedia = { async getUserMedia(constraints) {
  videoCalls.push(constraints);
  assert.deepEqual(constraints, { audio: true, video: true });
  return new FakeStream(true);
}};
const incomingSignal = new FakeSignaling();
const videoCallId = "B".repeat(32);
const callee = createWebRTCMediaCallTransport({
  signalingSession: incomingSignal, callId: videoCallId, mode: "video", role: "callee", remoteFingerprint,
  mediaDevices: videoMedia, RTCPeerConnectionImpl: FakePeerConnection
});
assert.equal(videoCalls.length, 0, "incoming call waits for explicit accept/start");
await callee.start();
assert.equal(videoCalls.length, 1);
const calleePc = FakePeerConnection.instances.at(-1);
assert.equal(calleePc.added.length, 2);
await incomingSignal.receive({ type: "call-offer", payload: { callId: "C".repeat(32), sdp: "v=0\\r\\n".padEnd(120, "o") } });
assert.equal(calleePc.remoteDescription, undefined, "wrong call ID must be ignored");
await incomingSignal.receive({ type: "call-offer", payload: { callId: videoCallId, sdp: "v=0\\r\\n".padEnd(120, "o") } });
assert.equal(calleePc.remoteDescription.type, "offer");
assert.equal(incomingSignal.sent.at(-1).type, "call-answer");
assert.equal(incomingSignal.sent.at(-1).payload.callId, videoCallId);
callee.close();
assert.ok(calleePc.added.every(x => x.track.readyState === "ended"));

assert.throws(() => createWebRTCMediaCallTransport({
  signalingSession: signaling, callId: "short", mode: "audio", role: "caller", remoteFingerprint,
  mediaDevices, RTCPeerConnectionImpl: FakePeerConnection
}), /MEDIA_CALL_INPUT_INVALID/);
console.log("PASS media permissions wait for explicit start");
console.log("PASS audio mode requests microphone only and never opens camera");
console.log("PASS video mode requests audio and camera only after explicit start");
console.log("PASS offer, answer and hangup carry the active call ID");
console.log("PASS signals for a different call ID are ignored");
console.log("PASS hangup closes peer connection and stops every local media track");
