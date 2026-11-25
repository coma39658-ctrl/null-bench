import test from "node:test";
import assert from "node:assert/strict";
import { createWebRTCMediaCallTransport } from "./ezero_connect_webrtc_media_call_v1.mjs";

const callId = "0123456789abcdefghijklmnopqrstuv";
const remote = "02:" + "BB:".repeat(30) + "BB";

function harness(role, mode = "audio") {
  const listeners = new Set();
  const sent = [];
  const constraints = [];
  const tracks = [];
  const pcList = [];
  const signalingSession = {
    on(name, fn) { assert.equal(name, "message"); listeners.add(fn); return () => listeners.delete(fn); },
    send(type, payload) { sent.push({ type, payload }); }
  };
  const mediaDevices = {
    async getUserMedia(value) {
      constraints.push(value);
      const audio = { kind: "audio", readyState: "live", stopped: false, stop() { this.stopped = true; } };
      const video = mode === "video" ? { kind: "video", readyState: "live", stopped: false, stop() { this.stopped = true; } } : null;
      tracks.push(audio, ...(video ? [video] : []));
      return {
        getTracks: () => tracks,
        getAudioTracks: () => [audio],
        getVideoTracks: () => video ? [video] : []
      };
    }
  };
  class FakePC {
    constructor(config) { this.config = config; this.connectionState = "new"; this.iceConnectionState = "new"; pcList.push(this); }
    addTrack(track) { (this.addedTracks ||= []).push(track); }
    async createOffer() { return { type: "offer", sdp: "fake-offer-sdp" }; }
    async createAnswer() { return { type: "answer", sdp: "fake-answer-sdp" }; }
    async setLocalDescription(value) { this.localDescription = value; }
    async setRemoteDescription(value) { this.remoteDescription = value; }
    async addIceCandidate(value) { (this.candidates ||= []).push(value); }
    close() { this.connectionState = "closed"; }
  }
  const transport = createWebRTCMediaCallTransport({
    signalingSession, callId, mode, role, remoteFingerprint: remote,
    mediaDevices, RTCPeerConnectionImpl: FakePC,
    onLocalStream() {}, onRemoteStream() {}, onState() {}
  });
  return {
    transport, sent, constraints, tracks, pcList,
    async receive(type, payload, fromFingerprint = remote) {
      for (const fn of [...listeners]) await fn({ type, payload, fromFingerprint });
    }
  };
}

test("construction never requests microphone or camera", () => {
  const h = harness("caller");
  assert.equal(h.constraints.length, 0);
  assert.equal(h.transport.state, "idle");
  h.transport.close(false);
});
test("caller captures audio only after start and sends a call-scoped offer", async () => {
  const h = harness("caller", "audio");
  await h.transport.start();
  assert.deepEqual(h.constraints, [{ audio: true, video: false }]);
  assert.equal(h.pcList.length, 1);
  assert.equal(h.pcList[0].addedTracks.length, 1);
  assert.equal(h.sent[0].type, "call-offer");
  assert.equal(h.sent[0].payload.callId, callId);
  assert.equal(h.sent[0].payload.sdp, "fake-offer-sdp");
  h.transport.close(false);
});
test("video call requests both tracks only after start", async () => {
  const h = harness("caller", "video");
  await h.transport.start();
  assert.deepEqual(h.constraints, [{ audio: true, video: true }]);
  assert.equal(h.pcList[0].addedTracks.length, 2);
  h.transport.close(false);
});
test("callee waits for an offer and answers only matching trusted call signal", async () => {
  const h = harness("callee");
  await h.transport.start();
  assert.equal(h.sent.length, 0);
  await h.receive("call-offer", { callId: "different-call", sdp: "ignored" });
  assert.equal(h.sent.length, 0);
  await h.receive("call-offer", { callId, sdp: "remote-offer-sdp" });
  assert.equal(h.pcList[0].remoteDescription.type, "offer");
  assert.deepEqual(h.sent[0], { type: "call-answer", payload: { callId, sdp: "fake-answer-sdp" } });
  h.transport.close(false);
});
test("untrusted sender cannot inject SDP", async () => {
  const h = harness("callee");
  await h.transport.start();
  await h.receive("call-offer", { callId, sdp: "spoofed" }, "03:" + "CC:".repeat(30) + "CC");
  assert.equal(h.pcList[0].remoteDescription, undefined);
  assert.equal(h.sent.length, 0);
  h.transport.close(false);
});
test("audio mode rejects a camera track and closes local media", async () => {
  const h = harness("caller", "audio");
  const original = h.transport;
  original.close(false);
  const badMedia = {
    async getUserMedia() {
      const a = { kind: "audio", readyState: "live", stop() { this.stopped = true; } };
      const v = { kind: "video", readyState: "live", stop() { this.stopped = true; } };
      return { getTracks: () => [a,v], getAudioTracks: () => [a], getVideoTracks: () => [v] };
    }
  };
  const bad = createWebRTCMediaCallTransport({
    signalingSession: h.transport ? {
      on: () => () => {}, send() {}
    } : null,
    callId, mode: "audio", role: "caller", remoteFingerprint: remote,
    mediaDevices: badMedia, RTCPeerConnectionImpl: class {}
  });
  await assert.rejects(bad.start(), /MEDIA_CALL_AUDIO_MUST_NOT_OPEN_CAMERA/);
});
test("close stops all local tracks", async () => {
  const h = harness("caller");
  await h.transport.start();
  h.transport.close(false);
  assert.ok(h.tracks.every(track => track.stopped));
  assert.equal(h.transport.state, "closed");
});
test("malformed SDP is rejected and transport closes", async () => {
  const h = harness("callee");
  await h.transport.start();
  await h.receive("call-offer", { callId, sdp: "" });
  assert.equal(h.transport.state, "closed");
});
