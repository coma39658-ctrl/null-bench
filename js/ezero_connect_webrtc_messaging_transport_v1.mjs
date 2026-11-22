import { createMessagingController } from "./ezero_connect_messaging_v1.mjs";

function fail(code) { throw new Error(code); }

function validateIceServers(iceServers) {
  if (!Array.isArray(iceServers) || iceServers.length > 8) fail("WEBRTC_ICE_SERVERS_REQUIRED");
  for (const server of iceServers) {
    if (!server || typeof server !== "object" || Array.isArray(server)) fail("WEBRTC_ICE_SERVER_INVALID");
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    if (!urls.length || urls.length > 4 || urls.some(url =>
      typeof url !== "string" || url.length > 512 ||
      !/^(stun|stuns|turn|turns):[A-Za-z0-9.:[\]_-]+(?::[0-9]{1,5})?(?:\?[A-Za-z0-9=&._-]+)?$/.test(url)
    )) fail("WEBRTC_ICE_SERVER_URL_INVALID");
    if (server.username !== undefined && (typeof server.username !== "string" || server.username.length > 256)) {
      fail("WEBRTC_ICE_USERNAME_INVALID");
    }
    if (server.credential !== undefined && (typeof server.credential !== "string" || server.credential.length > 512)) {
      fail("WEBRTC_ICE_CREDENTIAL_INVALID");
    }
  }
  return iceServers.map(server => ({ ...server }));
}

function isDescription(value, type) {
  return value && typeof value === "object" && value.type === type &&
    typeof value.sdp === "string" && value.sdp.length > 0 && value.sdp.length <= 12_000;
}

export function createWebRTCMessagingTransport({
  signalingSession,
  relationshipId,
  localFingerprint,
  remoteFingerprint,
  iceServers,
  RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
  messagingFactory = createMessagingController,
  trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY,
  onMessage = null,
  onState = () => {}
} = {}) {
  if (!signalingSession?.on || !signalingSession?.send ||
      typeof relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(relationshipId) ||
      typeof localFingerprint !== "string" || typeof remoteFingerprint !== "string" ||
      localFingerprint === remoteFingerprint || typeof RTCPeerConnectionImpl !== "function" ||
      typeof messagingFactory !== "function" || (onMessage !== null && typeof onMessage !== "function")) {
    fail("WEBRTC_MESSAGING_TRANSPORT_INPUT_INVALID");
  }
  const validatedIceServers = validateIceServers(iceServers);
  const role = localFingerprint < remoteFingerprint ? "initiator" : "responder";
  const pc = new RTCPeerConnectionImpl({ iceServers: validatedIceServers });
  const messaging = messagingFactory({ trustApi, identityApi, onState: value => emit(value.state, value) });
  const subscribers = new Set();
  const unsubscribeMessage = messaging.subscribe(async message => {
    let delivered = false;
    if (onMessage) { await onMessage(message); delivered = true; }
    for (const subscriber of [...subscribers]) { await subscriber(message); delivered = true; }
    if (!delivered) throw new Error("WEBRTC_MESSAGING_NO_RECEIVER");
  });
  let closed = false;
  let started = false;
  let attached = false;
  let remoteDescriptionSet = false;
  let pendingCandidates = [];
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });

  function emit(state, detail = {}) {
    try { onState(Object.freeze({ state, relationshipId, role, ...detail })); } catch (_) {}
  }
  function failTransport(error) {
    if (closed) return;
    emit("error", { error: error?.message || "WEBRTC_MESSAGING_FAILED" });
    rejectReady(error instanceof Error ? error : new Error("WEBRTC_MESSAGING_FAILED"));
    close();
  }
  async function flushCandidates() {
    if (!remoteDescriptionSet) return;
    for (const candidate of pendingCandidates.splice(0)) {
      await pc.addIceCandidate(candidate);
    }
  }
  async function attachDataChannel(channel) {
    if (closed || attached) {
      try { channel.close(); } catch (_) {}
      return;
    }
    attached = true;
    if (channel.ordered !== true ||
        (channel.maxRetransmits !== null && channel.maxRetransmits !== undefined) ||
        (channel.maxPacketLifeTime !== null && channel.maxPacketLifeTime !== undefined)) {
      failTransport(new Error("WEBRTC_DATA_CHANNEL_NOT_RELIABLE_ORDERED"));
      return;
    }
    emit("data-channel-open-pending");
    try {
      await messaging.attach({ relationshipId, channel, role });
      if (closed) return;
      if (messaging.state !== "secure") fail("WEBRTC_E2E_SESSION_NOT_SECURE");
      emit("secure");
      resolveReady(Object.freeze({ relationshipId, role, state: "secure" }));
    } catch (error) {
      failTransport(error);
    }
  }

  pc.onicecandidate = event => {
    if (closed || !event.candidate) return;
    try {
      signalingSession.send("ice-candidate", { candidate: JSON.stringify(event.candidate.toJSON?.() || event.candidate) });
    } catch (error) { failTransport(error); }
  };
  pc.onconnectionstatechange = () => {
    emit("peer-connection", { connectionState: pc.connectionState || "unknown", iceConnectionState: pc.iceConnectionState || "unknown" });
    if (["failed", "closed"].includes(pc.connectionState)) failTransport(new Error("WEBRTC_PEER_CONNECTION_" + pc.connectionState.toUpperCase()));
  };
  pc.ondatachannel = event => { void attachDataChannel(event.channel); };

  async function handleSignal(message) {
    if (closed || !message || typeof message.type !== "string" || !message.payload) return;
    try {
      if (message.type === "offer") {
        if (role !== "responder" || remoteDescriptionSet || !isDescription({ type: "offer", sdp: message.payload.sdp }, "offer")) {
          fail("WEBRTC_UNEXPECTED_OR_INVALID_OFFER");
        }
        await pc.setRemoteDescription({ type: "offer", sdp: message.payload.sdp });
        remoteDescriptionSet = true;
        await flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!isDescription(pc.localDescription, "answer")) fail("WEBRTC_LOCAL_ANSWER_INVALID");
        signalingSession.send("answer", { sdp: pc.localDescription.sdp });
        emit("answer-sent");
      } else if (message.type === "answer") {
        if (role !== "initiator" || remoteDescriptionSet || !isDescription({ type: "answer", sdp: message.payload.sdp }, "answer")) {
          fail("WEBRTC_UNEXPECTED_OR_INVALID_ANSWER");
        }
        await pc.setRemoteDescription({ type: "answer", sdp: message.payload.sdp });
        remoteDescriptionSet = true;
        await flushCandidates();
        emit("answer-received");
      } else if (message.type === "ice-candidate") {
        if (typeof message.payload.candidate !== "string" || message.payload.candidate.length > 2048) fail("WEBRTC_ICE_CANDIDATE_INVALID");
        let candidate;
        try { candidate = JSON.parse(message.payload.candidate); } catch (_) { fail("WEBRTC_ICE_CANDIDATE_JSON_INVALID"); }
        if (!candidate || typeof candidate !== "object" || typeof candidate.candidate !== "string" ||
            candidate.candidate.length > 1536) fail("WEBRTC_ICE_CANDIDATE_INVALID");
        if (remoteDescriptionSet) await pc.addIceCandidate(candidate);
        else {
          if (pendingCandidates.length >= 64) fail("WEBRTC_ICE_QUEUE_LIMIT");
          pendingCandidates.push(candidate);
        }
      }
    } catch (error) { failTransport(error); }
  }

  const removeSignalListener = signalingSession.on("message", handleSignal);
  const transport = Object.freeze({
    ready,
    role,
    start: async () => {
      if (closed || started) fail("WEBRTC_TRANSPORT_ALREADY_STARTED_OR_CLOSED");
      started = true;
      if (role !== "initiator") {
        emit("waiting-for-offer");
        return ready;
      }
      try {
        const channel = pc.createDataChannel("ezero-secure-messages-v1", { ordered: true });
        void attachDataChannel(channel);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (!isDescription(pc.localDescription, "offer")) fail("WEBRTC_LOCAL_OFFER_INVALID");
        signalingSession.send("offer", { sdp: pc.localDescription.sdp });
        emit("offer-sent");
      } catch (error) { failTransport(error); }
      return ready;
    },
    sendText: text => messaging.sendText(text),
    sendVoice: bytes => messaging.sendVoice(bytes),\n    sendProfile: bytes => messaging.sendProfile(bytes),
    subscribe(handler) {
      if (typeof handler !== "function") fail("WEBRTC_MESSAGING_SUBSCRIBER_INVALID");
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
    close,
    get state() { return closed ? "closed" : messaging.state; }
  });

  function close() {
    if (closed) return;
    closed = true;
    try { removeSignalListener?.(); } catch (_) {}
    try { unsubscribeMessage?.(); } catch (_) {}
    try { messaging.close(); } catch (_) {}
    try { pc.close(); } catch (_) {}
    pendingCandidates = [];
    emit("closed");
  }

  emit("created", { iceServerCount: validatedIceServers.length, hostCandidatesOnlyPossible: validatedIceServers.length === 0 });
  return transport;
}
