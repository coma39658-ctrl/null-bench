import assert from "node:assert/strict";
import { createWebRTCMessagingTransport } from "../js/ezero_connect_webrtc_messaging_transport_v1.mjs";

const listeners = new Map();
function pairSignaling() {
  const endpoints = [0, 1].map(() => ({
    on(name, fn) {
      if (!listeners.has(this)) listeners.set(this, new Map());
      const map = listeners.get(this);
      if (!map.has(name)) map.set(name, new Set());
      map.get(name).add(fn);
      return () => map.get(name)?.delete(fn);
    },
    send(type, payload) {
      const peer = endpoints[1 - endpoints.indexOf(this)];
      for (const fn of listeners.get(peer)?.get("message") || []) fn({ type, payload });
    }
  }));
  return endpoints;
}

class FakeDataChannel {
  constructor() {
    this.ordered = true;
    this.maxRetransmits = null;
    this.maxPacketLifeTime = null;
    this.readyState = "open";
    this.handlers = new Map();
  }
  addEventListener(name, fn) {
    if (!this.handlers.has(name)) this.handlers.set(name, new Set());
    this.handlers.get(name).add(fn);
  }
  removeEventListener(name, fn) { this.handlers.get(name)?.delete(fn); }
  send() {}
  close() { this.readyState = "closed"; }
}
const instances = [];
class FakePeerConnection {
  constructor(config) {
    this.config = config;
    this.connectionState = "new";
    this.iceConnectionState = "new";
    this.addedCandidates = [];
    instances.push(this);
  }
  createDataChannel(label, options) {
    assert.equal(label, "ezero-secure-messages-v1");
    assert.deepEqual(options, { ordered: true });
    const local = new FakeDataChannel();
    const remote = new FakeDataChannel();
    this.remoteChannel = remote;
    this.localChannel = local;
    return local;
  }
  async createOffer() { return { type: "offer", sdp: "v=0\r\no=ezero-offer" }; }
  async createAnswer() { return { type: "answer", sdp: "v=0\r\no=ezero-answer" }; }
  async setLocalDescription(value) { this.localDescription = value; }
  async setRemoteDescription(value) {
    this.remoteDescription = value;
    if (value.type === "offer") {
      const initiator = instances.find(item => item.remoteChannel);
      this.incomingChannel = initiator.remoteChannel;
      queueMicrotask(() => this.ondatachannel?.({ channel: this.incomingChannel }));
    }
  }
  async addIceCandidate(value) { this.addedCandidates.push(value); }
  close() { this.connectionState = "closed"; }
}

const signaling = pairSignaling();
const secureAttach = [];
const fakeMessagingSessions = [];
function fakeMessagingFactory() {
  let state = "disconnected";
  let receiver = null;
  const api = {
    subscribe(fn) { receiver = fn; return () => { receiver = null; }; },
    async attach({ relationshipId, channel, role }) {
      assert.match(relationshipId, /^[a-f0-9]{64}$/);
      assert.equal(channel.ordered, true);
      secureAttach.push(role);
      state = "secure";
    },
    close() { state = "disconnected"; },
    get state() { return state; },
    get receiver() { return receiver; }
  };
  fakeMessagingSessions.push(api);
  return api;
}

const relationshipId = "a".repeat(64);
const low = "01:" + "00:".repeat(30) + "00";
const high = "02:" + "00:".repeat(30) + "00";
const states = [];
const initiator = createWebRTCMessagingTransport({
  signalingSession: signaling[0], relationshipId, localFingerprint: low, remoteFingerprint: high,
  iceServers: [], RTCPeerConnectionImpl: FakePeerConnection, messagingFactory: fakeMessagingFactory,
  onState: value => states.push(value.state)
});
const responder = createWebRTCMessagingTransport({
  signalingSession: signaling[1], relationshipId, localFingerprint: high, remoteFingerprint: low,
  iceServers: [], RTCPeerConnectionImpl: FakePeerConnection, messagingFactory: fakeMessagingFactory,
  onState: value => states.push(value.state)
});
assert.equal(initiator.role, "initiator");
assert.equal(responder.role, "responder");
assert.equal(instances[0].config.iceServers.length, 0);
const responderReady = responder.start();
await initiator.start();
const [left, right] = await Promise.all([initiator.ready, responderReady]);
assert.equal(left.state, "secure");
assert.equal(right.state, "secure");
assert.deepEqual(secureAttach.sort(), ["initiator", "responder"]);
await assert.rejects(() => fakeMessagingSessions[0].receiver({ messageId: "no-listener" }), /WEBRTC_MESSAGING_NO_RECEIVER/);
let received = false;
const unsubscribe = initiator.subscribe(async message => { received = message.messageId === "delivered"; });
await fakeMessagingSessions[0].receiver({ messageId: "delivered" });
assert.equal(received, true);
unsubscribe();

assert.ok(states.includes("offer-sent"));
assert.ok(states.includes("answer-sent"));
initiator.close();
responder.close();

assert.throws(() => createWebRTCMessagingTransport({
  signalingSession: signaling[0], relationshipId, localFingerprint: low, remoteFingerprint: high,
  iceServers: "stun:invalid", RTCPeerConnectionImpl: FakePeerConnection, messagingFactory: fakeMessagingFactory
}), /WEBRTC_ICE_SERVERS_REQUIRED/);
console.log("PASS deterministic initiator/responder role");
console.log("PASS SDP offer/answer relayed through signed signaling session");
console.log("PASS reliable ordered DataChannel attached to trusted messaging controller");
console.log("PASS empty ICE configuration explicitly remains host-candidate-only");
console.log("PASS invalid ICE configuration rejected");
console.log("BOUNDARY: fake peer connections only; no real network, TURN, mobile devices, or background calls");
