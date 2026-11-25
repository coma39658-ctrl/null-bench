function fail(code) { throw new Error(code); }

function validCallId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);
}

function validateIceServers(servers) {
  if (!Array.isArray(servers) || servers.length > 8) fail("MEDIA_CALL_ICE_SERVERS_INVALID");
  return servers.map(server => {
    if (!server || typeof server !== "object" || Array.isArray(server)) fail("MEDIA_CALL_ICE_SERVER_INVALID");
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    if (!urls.length || urls.length > 4 || urls.some(url =>
      typeof url !== "string" || url.length > 512 ||
      !/^(stun|stuns|turn|turns):[A-Za-z0-9.:[\]_-]+(?::[0-9]{1,5})?(?:\?[A-Za-z0-9=&._-]+)?$/.test(url)
    )) fail("MEDIA_CALL_ICE_URL_INVALID");
    if (server.username !== undefined && (typeof server.username !== "string" || server.username.length > 256)) fail("MEDIA_CALL_ICE_USERNAME_INVALID");
    if (server.credential !== undefined && (typeof server.credential !== "string" || server.credential.length > 512)) fail("MEDIA_CALL_ICE_CREDENTIAL_INVALID");
    return { ...server };
  });
}

function validDescription(value, type) {
  return value && value.type === type && typeof value.sdp === "string" &&
    value.sdp.length > 0 && value.sdp.length <= 12_000;
}

/*
 * Media-only WebRTC adapter for an already authenticated saved-friend call.
 * Call-control invitation/acceptance is handled by the caller before start().
 * This module never captures media on construction; start() must be invoked
 * directly from an explicit user action after the other side accepted.
 */
export function createWebRTCMediaCallTransport({
  signalingSession,
  callId,
  mode,
  role,
  remoteFingerprint,
  iceServers = [],
  mediaDevices = globalThis.navigator?.mediaDevices,
  RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
  onLocalStream = () => {},
  onRemoteStream = () => {},
  onState = () => {}
} = {}) {
  if (!signalingSession?.on || !signalingSession?.send ||
      !validCallId(callId) || !["audio", "video"].includes(mode) ||
      typeof remoteFingerprint !== "string" || !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(remoteFingerprint) ||
      !["caller", "callee"].includes(role) ||
      typeof mediaDevices?.getUserMedia !== "function" ||
      typeof RTCPeerConnectionImpl !== "function" ||
      typeof onLocalStream !== "function" || typeof onRemoteStream !== "function" ||
      typeof onState !== "function") fail("MEDIA_CALL_INPUT_INVALID");

  const servers = validateIceServers(iceServers);
  let pc = null, localStream = null, closed = false, started = false;
  let remoteDescriptionSet = false, pendingCandidates = [];
  const listeners = [];
  let resolveConnected, rejectConnected;
  const connected = new Promise((resolve, reject) => { resolveConnected = resolve; rejectConnected = reject; });
  connected.catch(() => {});

  const emit = (state, detail = {}) => {
    try { onState(Object.freeze({ state, callId, mode, role, ...detail })); } catch (_) {}
  };

  async function handleSignal(message) {
    if (closed || !message || message.fromFingerprint !== remoteFingerprint ||
        !["offer", "answer", "ice-candidate", "hangup"].includes(message.type)) return;
    try {
      if (message.type === "hangup") { close(false); return; }
      if (!pc) return fail("MEDIA_CALL_SIGNAL_BEFORE_START");
      if (message.type === "offer") {
        if (role !== "callee" || remoteDescriptionSet ||
            !validDescription({ type: "offer", sdp: message.payload?.sdp }, "offer")) fail("MEDIA_CALL_OFFER_INVALID");
        await pc.setRemoteDescription({ type: "offer", sdp: message.payload.sdp });
        remoteDescriptionSet = true;
        await flushCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (!validDescription(pc.localDescription, "answer")) fail("MEDIA_CALL_ANSWER_INVALID");
        signalingSession.send("answer", { sdp: pc.localDescription.sdp });
        emit("answer-sent");
      } else if (message.type === "answer") {
        if (role !== "caller" || remoteDescriptionSet ||
            !validDescription({ type: "answer", sdp: message.payload?.sdp }, "answer")) fail("MEDIA_CALL_UNEXPECTED_ANSWER");
        await pc.setRemoteDescription({ type: "answer", sdp: message.payload.sdp });
        remoteDescriptionSet = true;
        await flushCandidates();
        emit("answer-received");
      } else if (message.type === "ice-candidate") {
        const raw = message.payload?.candidate;
        if (typeof raw !== "string" || raw.length > 2048) fail("MEDIA_CALL_ICE_CANDIDATE_INVALID");
        let candidate;
        try { candidate = JSON.parse(raw); } catch (_) { fail("MEDIA_CALL_ICE_CANDIDATE_JSON_INVALID"); }
        if (!candidate || typeof candidate.candidate !== "string" || candidate.candidate.length > 1536) fail("MEDIA_CALL_ICE_CANDIDATE_INVALID");
        if (remoteDescriptionSet) await pc.addIceCandidate(candidate);
        else {
          if (pendingCandidates.length >= 64) fail("MEDIA_CALL_ICE_QUEUE_LIMIT");
          pendingCandidates.push(candidate);
        }
      }
    } catch (error) {
      emit("error", { error: error?.message || "MEDIA_CALL_SIGNAL_FAILED" });
      rejectConnected(error);
      close(false);
    }
  }

  async function flushCandidates() {
    for (const candidate of pendingCandidates.splice(0)) await pc.addIceCandidate(candidate);
  }

  function close(notify = true) {
    if (closed) return;
    closed = true;
    if (notify) {
      try { signalingSession.send("hangup", {}); } catch (_) {}
    }
    for (const remove of listeners.splice(0)) { try { remove?.(); } catch (_) {} }
    for (const track of localStream?.getTracks?.() || []) { try { track.stop(); } catch (_) {} }
    try { pc?.close(); } catch (_) {}
    pendingCandidates = [];
    emit("closed");
    rejectConnected(new Error("MEDIA_CALL_CLOSED"));
  }

  return Object.freeze({
    async start() {
      if (closed || started) fail("MEDIA_CALL_ALREADY_STARTED_OR_CLOSED");
      started = true;
      try {
        const constraints = mode === "audio"
          ? { audio: true, video: false }
          : { audio: true, video: true };
        localStream = await mediaDevices.getUserMedia(constraints);
        if (closed) {
          for (const track of localStream?.getTracks?.() || []) track.stop();
          return;
        }
        if (!localStream?.getAudioTracks?.().some(track => track.readyState === "live")) fail("MEDIA_CALL_AUDIO_TRACK_REQUIRED");
        if (mode === "audio" && (localStream.getVideoTracks?.().length || 0) !== 0) fail("MEDIA_CALL_AUDIO_MUST_NOT_OPEN_CAMERA");
        if (mode === "video" && !localStream.getVideoTracks?.().some(track => track.readyState === "live")) fail("MEDIA_CALL_VIDEO_TRACK_REQUIRED");
        onLocalStream(localStream);
        pc = new RTCPeerConnectionImpl({ iceServers: servers });
        for (const track of localStream.getTracks()) pc.addTrack(track, localStream);
        pc.onicecandidate = event => {
          if (!closed && event.candidate) {
            try { signalingSession.send("ice-candidate", { candidate: JSON.stringify(event.candidate.toJSON?.() || event.candidate) }); }
            catch (error) { emit("error", { error: error?.message || "MEDIA_CALL_ICE_SEND_FAILED" }); close(false); }
          }
        };
        pc.ontrack = event => {
          const stream = event.streams?.[0];
          if (stream) { try { onRemoteStream(stream); } catch (_) {} emit("remote-stream"); }
        };
        pc.onconnectionstatechange = () => {
          const state = pc.connectionState || "unknown";
          emit("connection", { connectionState: state, iceConnectionState: pc.iceConnectionState || "unknown" });
          if (state === "connected") resolveConnected(Object.freeze({ state: "connected", callId, mode }));
          if (["failed", "closed"].includes(state)) {
            rejectConnected(new Error("MEDIA_CALL_PEER_" + state.toUpperCase()));
            close(false);
          }
        };
        listeners.push(signalingSession.on("message", handleSignal));
        if (role === "caller") {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (!validDescription(pc.localDescription, "offer")) fail("MEDIA_CALL_OFFER_INVALID");
          signalingSession.send("offer", { sdp: pc.localDescription.sdp });
          emit("offer-sent");
        } else emit("waiting-for-offer");
        return Object.freeze({ state: "started", callId, mode, role });
      } catch (error) {
        emit("error", { error: error?.message || "MEDIA_CALL_START_FAILED" });
        close(false);
        throw error;
      }
    },
    close,
    get state() { return closed ? "closed" : started ? "started" : "idle"; },
    get connected() { return connected; }
  });
}
