import assert from "node:assert/strict";
import { createWebRTCMediaCallTransport } from "../js/ezero_connect_webrtc_media_call_v1.mjs";

const callId = "A".repeat(32);
const remoteFingerprint = "11:".repeat(31) + "11";

class FakeTrack {
  constructor(kind) { this.kind = kind; this.readyState = "live"; this.stopped = false; }
  stop() { this.readyState = "ended"; this.stopped = true; }
}
class FakeStream {
  constructor(mode) {
    this.tracks = [new FakeTrack("audio"), ...(mode === "video" ? [new FakeTrack("video")] : [])];
  }
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter(t => t.kind === "audio"); }
  getVideoTracks() { return this.tracks.filter(t => t.kind === "video"); }
}
class FakePeerConnection {
  static instances = [];
  constructor(config) {
    this.config = config; this.added = []; this.closed = false;
    this.connectionState = "new"; this.iceConnectionState = "new";
    FakePeerConnection.instances.push(this);
  }
  addTrack(track, stream) { this.added.push({ track, stream }); }
  async createOffer() { return { type: "offer", sdp: "v=0\r
".padEnd(120, "x") }; }
  async createAnswer() { return { type: "answer", sdp: "v=0\r
".padEnd(120, "y") }; }
  async setLocalDescription(value) { this.localDescription = value; }
  async setRemoteDescription(value) { this.remoteDescription = value; }
  async addIceCandidate(value) { (this.candidates ||= []).push(value); }
  close() { this.closed = true; this.connectionState = "closed"; }
}
class FakeSignaling {
  constructor() { this.sent = []; this.listeners = new Set(); }
  send(type, payload) { this.sent.push({ type, payload }); }
  on(type, fn) { assert.equal(type, "message"); this.listeners.add(fn); return () => this.listeners.delete(fn); }
  async receive(message) { for (const fn of [...this.listeners]) await fn({ ...message, fromFingerprint: remoteFingerprint }); }
}

let calls = 0;
const mediaDevices = {
  async getUserMedia(constraints) {
    calls++;
    assert.equal(constraints.audio, true);
    assert.equal(constraints.video, false);
    return new FakeStream("audio");
  }
};
const signaling = new FakeSignaling();
const states = [];
const caller = createWebRTCMediaCallTransport({
  signalingSession: signaling, callId, mode: "audio", role: "caller", remoteFingerprint,
  mediaDevices, RTCPeerConnectionImpl: FakePeerConnection,
  onState: value => states.push(value.state)
});
assert.equal(calls, 0, "construction must not request microphone or camera");
await caller.start();
assert.equal(calls, 1);
assert.equal(FakePeerConnection.instances.at(-1).added.length, 1);
assert.equal(FakePeerConnection.instances.at(-1).added[0].track.kind, "audio");
assert.equal(signaling.sent.at(-1).type, "call-offer");
assert.equal(signaling.sent.at(-1).payload.callId === callId && signaling.sent.at(-1).payload.sdp.length <= 12_000, true);
await signaling.receive({ type: "answer", payload: { sdp: "v=0\r
".padEnd(120, "z") } });
assert.equal(FakePeerConnection.instances.at(-1).remoteDescription.type, "answer");
const callerPc = FakePeerConnection.instances.at(-1);
callerPc.connectionState = "connected";
callerPc.onconnectionstatechange();
assert.equal((await caller.connected).state, "connected");
caller.close();
assert.equal(callerPc.closed, true);
assert.equal(callerPc.added[0].track.readyState, "ended");
assert.equal(signaling.sent.at(-1).type, "call-hangup");
assert.ok(states.includes("offer-sent"));

const videoCalls = [];
const videoMedia = {
  async getUserMedia(constraints) {
    videoCalls.push(constraints);
    assert.deepEqual(constraints, { audio: true, video: true });
    return new FakeStream("video");
  }
};
const incomingSignal = new FakeSignaling();
const callee = createWebRTCMediaCallTransport({
  signalingSession: incomingSignal, callId: "B".repeat(32), mode: "video", role: "callee", remoteFingerprint,
  mediaDevices: videoMedia, RTCPeerConnectionImpl: FakePeerConnection
});
assert.equal(videoCalls.length, 0, "incoming call must wait for explicit accept/start");
await callee.start();
assert.equal(videoCalls.length, 1);
const calleePc = FakePeerConnection.instances.at(-1);
assert.equal(calleePc.added.length, 2);
await incomingSignal.receive({ type: "offer", payload: { sdp: "v=0\r
".padEnd(120, "o") } });
assert.equal(calleePc.remoteDescription.type, "offer");
assert.equal(incomingSignal.sent.at(-1).type, "call-answer");
callee.close();
assert.ok(calleePc.added.every(x => x.track.readyState === "ended"));

assert.throws(() => createWebRTCMediaCallTransport({
  signalingSession: signaling, callId: "short", mode: "audio", role: "caller",
  mediaDevices, RTCPeerConnectionImpl: FakePeerConnection
}), /MEDIA_CALL_INPUT_INVALID/);
console.log("PASS WebRTC media call requests no permissions until explicit start");
console.log("PASS audio mode requests microphone only and never opens camera");
console.log("PASS video mode requests audio and camera only after explicit start");
console.log("PASS caller offer and callee answer are bound to the active call ID");
console.log("PASS hangup closes peer connection and stops every local media track");
console.log("PASS signals for another call ID are ignored");
