(() => {
  "use strict";

  const FINGERPRINT_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
  const SIGNAL_TYPES = new Set(["offer", "answer", "ice-candidate", "hangup"]);

  function canonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
    }
    throw new Error("MEDIA_CANONICAL_INVALID");
  }

  function requireRuntime() {
    if (!globalThis.isSecureContext || !globalThis.crypto?.subtle ||
        !globalThis.EZERO_CONNECT_IDENTITY || !globalThis.EZERO_CONNECT_TRUST ||
        !globalThis.EZERO_CONNECT_SAVED_CALLS || !globalThis.EZERO_CONNECT_SIGNAL ||
        !globalThis.EZERO_CONNECT_INVITES || !globalThis.EZERO_CONNECT_CONFIG ||
        !globalThis.RTCPeerConnection || !globalThis.WebSocket) {
      throw new Error("MEDIA_RUNTIME_UNAVAILABLE");
    }
  }

  async function verifyPeerHandshake(message, expectedFingerprint, expectedSpki, expectedRoomId, expectedRole) {
    if (!message || message.type !== "peer-ready" ||
        message.peerFingerprint !== expectedFingerprint ||
        message.peerPublicKeySpki !== expectedSpki ||
        !message.peerHandshake || typeof message.peerHandshake.signature !== "string" ||
        !message.peerHandshake.payload) throw new Error("MEDIA_PEER_IDENTITY_MISMATCH");
    const p = message.peerHandshake.payload;
    if (p.v !== 1 || p.protocol !== "E-ZERO-SIGNAL-HELLO-1" ||
        p.origin !== location.origin || p.roomId !== expectedRoomId ||
        p.role !== expectedRole || p.fingerprint !== expectedFingerprint ||
        p.publicKeySpki !== expectedSpki || typeof p.challenge !== "string" ||
        !Number.isSafeInteger(p.challengeExpiresAt)) throw new Error("MEDIA_PEER_HANDSHAKE_BINDING_INVALID");
    const raw = expectedSpki.replaceAll("-", "+").replaceAll("_", "/");
    const spki = Uint8Array.from(atob(raw + "=".repeat((4 - raw.length % 4) % 4)), c => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
    const sigRaw = message.peerHandshake.signature.replaceAll("-", "+").replaceAll("_", "/");
    const sig = Uint8Array.from(atob(sigRaw + "=".repeat((4 - sigRaw.length % 4) % 4)), c => c.charCodeAt(0));
    if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, new TextEncoder().encode(canonical(p)))) {
      throw new Error("MEDIA_PEER_HANDSHAKE_SIGNATURE_INVALID");
    }
    return true;
  }

  function createManager({ onStatus = () => {}, onIncomingCall = () => {}, onRemoteStream = () => {}, onCallEnded = () => {} } = {}) {
    requireRuntime();
    let listener = null;
    let active = null;
    let pendingIncoming = null;
    let disposed = false;
    const config = globalThis.EZERO_CONNECT_CONFIG;

    const status = (state, detail = {}) => {
      try { onStatus(Object.freeze({ state, ...detail })); } catch (_) {}
    };

    function closeMedia(call, sendHangup = false) {
      if (!call || call.closed) return;
      call.closed = true;
      if (sendHangup && call.signal?.authenticated && !call.signal.closed) {
        try { call.signal.send("hangup", { callId: call.callId }); } catch (_) {}
      }
      for (const track of call.localStream?.getTracks?.() || []) {
        try { track.stop(); } catch (_) {}
      }
      try { call.peer?.close(); } catch (_) {}
      try { call.signal?.close(); } catch (_) {}
      try { call.inbox?.cancelCall?.(call.callId); } catch (_) {}
      if (call.inbox && call.inbox !== listener) { try { call.inbox.close?.(); } catch (_) {} }
      if (active === call) active = null;
      try { onCallEnded(Object.freeze({ callId: call.callId, reason: call.endReason || "ended" })); } catch (_) {}
    }

    async function setupRoom(call, inviteCode, invitePayload, role) {
      if (call.closed || active !== call) return;
      call.roomInvite = inviteCode;
      call.roomPayload = invitePayload;
      call.role = role;
      const expectedPeer = await globalThis.EZERO_CONNECT_TRUST.getTrustedPeerForCall(call.peerFingerprint);
      if (!expectedPeer || expectedPeer.relationshipId !== call.relationshipId) throw new Error("MEDIA_PEER_NOT_TRUSTED");
      const signal = globalThis.EZERO_CONNECT_SIGNAL.connect({
        inviteCode,
        invitePayload,
        role,
        signalingBaseUrl: config.signalingUrl,
        onEvent: event => handleSignalEvent(call, event, expectedPeer)
      });
      call.signal = signal;
      await signal.ready;
      if (call.closed || active !== call) { signal.close(); return; }
      status("room-connected", { callId: call.callId, mode: call.mode, role });
    }

    async function connectAcceptedRoomAsCaller(call) {
      const room = await globalThis.EZERO_CONNECT_SAVED_CALLS.createRoomInviteForAcceptedCall({
        call: { callId: call.callId, mode: call.mode, accepted: true }
      });
      await setupRoom(call, room.inviteCode, room.invite, "host");
      if (call.closed || active !== call) return;
      call.inbox.sendRoomInvite(call.callId, room.inviteCode);
      status("waiting-for-friend-media", { callId: call.callId, mode: call.mode });
    }

    async function acceptRoomAsReceiver(call, inviteCode) {
      const invite = await globalThis.EZERO_CONNECT_SAVED_CALLS.verifyRoomInviteForAcceptedCall({
        call: {
          callId: call.callId,
          accepted: true,
          callerFingerprint: call.peerFingerprint,
          relationshipId: call.relationshipId
        },
        inviteCode
      });
      await setupRoom(call, inviteCode, invite, "guest");
      status("joining-media", { callId: call.callId, mode: call.mode });
    }

    async function startPeerConnection(call) {
      if (call.peer || call.closed || active !== call) return;
      const expected = await globalThis.EZERO_CONNECT_TRUST.getTrustedPeerForCall(call.peerFingerprint);
      if (!expected) throw new Error("MEDIA_PEER_NOT_TRUSTED");
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }]
      });
      call.peer = pc;
      call.remoteStream = new MediaStream();
      call.pendingCandidates = [];
      pc.ontrack = event => {
        if (call.closed || active !== call) return;
        const stream = event.streams?.[0] || call.remoteStream;
        if (!event.streams?.[0]) call.remoteStream.addTrack(event.track);
        try { onRemoteStream(stream, Object.freeze({ mode: call.mode, peerFingerprint: call.peerFingerprint })); } catch (_) {}
      };
      pc.onicecandidate = event => {
        if (!event.candidate || call.closed || !call.signal?.authenticated) return;
        try { call.signal.send("ice-candidate", { candidate: JSON.stringify(event.candidate.toJSON()) }); }
        catch (error) { status("ice-send-failed", { error: error.message }); }
      };
      pc.onconnectionstatechange = () => {
        if (call.closed || active !== call) return;
        status("media-" + pc.connectionState, { callId: call.callId, mode: call.mode });
        if (pc.connectionState === "failed") {
          status("media-route-failed", { callId: call.callId });
          call.endReason = "media-route-failed";
          closeMedia(call, false);
        }
      };
      const constraints = {
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: call.mode === "video" ? { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } } : false
      };
      call.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (call.closed || active !== call) {
        call.localStream.getTracks().forEach(track => track.stop());
        pc.close();
        return;
      }
      for (const track of call.localStream.getTracks()) pc.addTrack(track, call.localStream);
      if (call.role === "host") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        call.signal.send("offer", { sdp: pc.localDescription.sdp });
        status("offer-sent", { callId: call.callId, mode: call.mode });
      } else {
        status("waiting-for-offer", { callId: call.callId, mode: call.mode });
      }
    }

    async function applyRemoteOffer(call, sdp) {
      if (!call.peer || call.role !== "guest" || !call.peerReady) throw new Error("MEDIA_PEER_NOT_VERIFIED");
      await call.peer.setRemoteDescription({ type: "offer", sdp });
      for (const candidate of call.pendingCandidates.splice(0)) await call.peer.addIceCandidate(candidate);
      const answer = await call.peer.createAnswer();
      await call.peer.setLocalDescription(answer);
      call.signal.send("answer", { sdp: call.peer.localDescription.sdp });
      status("answer-sent", { callId: call.callId });
    }

    async function handleSignalEvent(call, event, expectedPeer) {
      if (!event || call.closed || active !== call) return;
      try {
        if (event.type === "peer-ready") {
          await verifyPeerHandshake(event, expectedPeer.remoteFingerprint, expectedPeer.remotePublicKeySpki,
            call.roomPayload.roomId, call.role === "host" ? "guest" : "host");
          if (call.peerReady) return;
          call.peerReady = true;
          status("peer-verified", { callId: call.callId, mode: call.mode });
          await startPeerConnection(call);
          if (call.role === "guest" && call.pendingOfferSdp) {
            const pending = call.pendingOfferSdp;
            call.pendingOfferSdp = null;
            await applyRemoteOffer(call, pending);
          }
          return;
        }
        if (event.type === "relay") {
          if (event.fromFingerprint !== call.peerFingerprint || !event.message ||
              !SIGNAL_TYPES.has(event.message.type)) throw new Error("MEDIA_SIGNAL_SENDER_INVALID");
          const payload = event.message.payload || {};
          if (event.message.type === "offer" && call.role === "guest") {
            if (!call.peerReady) { call.pendingOfferSdp = payload.sdp; return; }
            await applyRemoteOffer(call, payload.sdp);
          } else if (event.message.type === "answer" && call.role === "host") {
            if (!call.peer || call.peer.signalingState !== "have-local-offer") throw new Error("MEDIA_UNEXPECTED_ANSWER");
            await call.peer.setRemoteDescription({ type: "answer", sdp: payload.sdp });
            status("answer-received", { callId: call.callId });
          } else if (event.message.type === "ice-candidate") {
            if (!call.peer || typeof payload.candidate !== "string") throw new Error("MEDIA_ICE_INVALID");
            const candidate = JSON.parse(payload.candidate);
            if (call.peer.remoteDescription) await call.peer.addIceCandidate(candidate);
            else call.pendingCandidates.push(candidate);
          } else if (event.message.type === "hangup") {
            call.endReason = "peer-hangup";
            closeMedia(call, false);
          }
          return;
        }
        if (event.type === "peer-disconnected" || event.type === "room-closed" || event.type === "socket-closed") {
          call.endReason = "signaling-disconnected";
          closeMedia(call, false);
        }
      } catch (error) {
        call.endReason = error?.message || "media-failed";
        status("media-error", { callId: call.callId, error: call.endReason });
        closeMedia(call, true);
      }
    }

    async function listen() {
      if (disposed) throw new Error("MEDIA_MANAGER_DISPOSED");
      if (listener && !listener.closed) return listener;
      const identity = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
      listener = globalThis.EZERO_CONNECT_SAVED_CALLS.connectInbox({
        signalingBaseUrl: config.signalingUrl,
        inboxFingerprint: identity.fingerprint,
        onEvent: event => handleInboxEvent(event)
      });
      await listener.ready;
      status("inbox-listening", { fingerprint: identity.fingerprint });
      return listener;
    }

    async function handleInboxEvent(event) {
      if (!event || disposed) return;
      try {
        if (event.type === "incoming-call") {
          if (active || pendingIncoming) {
            const pending = await globalThis.EZERO_CONNECT_SAVED_CALLS.verifyIncomingCallInvite(event.inviteCode);
            const connection = listener;
            connection?.respondToCall(pending.callId, "decline");
            status("incoming-declined-busy", { callId: pending.callId });
            return;
          }
          const verified = await globalThis.EZERO_CONNECT_SAVED_CALLS.verifyIncomingCallInvite(event.inviteCode);
          const call = {
            callId: verified.callId, mode: verified.mode, peerFingerprint: verified.callerFingerprint,
            relationshipId: verified.relationshipId, peerName: verified.callerName,
            inbox: listener, role: "guest", accepted: false, closed: false
          };
          status("incoming-call", { callId: call.callId, mode: call.mode, peerName: call.peerName });
          pendingIncoming = call;
          const controls = Object.freeze({
            callId: call.callId, mode: call.mode, peerName: call.peerName,
            accept: async () => {
              if (active || call.closed || pendingIncoming !== call) throw new Error("MEDIA_BUSY");
              pendingIncoming = null;
              active = call;
              call.accepted = true;
              call.inbox.respondToCall(call.callId, "accept");
              status("call-accepted", { callId: call.callId, mode: call.mode });
            },
            decline: () => {
              if (!call.closed) {
                call.inbox.respondToCall(call.callId, "decline");
                call.closed = true;
                if (pendingIncoming === call) pendingIncoming = null;
                status("call-declined", { callId: call.callId });
              }
            }
          });
          try { onIncomingCall(controls); } catch (_) {}
          return;
        }
        if (event.type === "call-room-invite" && active && active.callId === event.callId && active.accepted) {
          await acceptRoomAsReceiver(active, event.inviteCode);
          return;
        }
        if (event.type === "call-cancelled" || event.type === "peer-inbox-disconnected") {
          if (pendingIncoming && (!event.callId || event.callId === pendingIncoming.callId)) {
            pendingIncoming.closed = true;
            pendingIncoming = null;
            status("incoming-call-cancelled", { callId: event.callId });
          }
          if (active) { active.endReason = event.type; closeMedia(active, false); }
          return;
        }
        if (event.type === "call-response" && active && active.callId === event.callId) {
          if (event.decision === "decline") {
            active.endReason = "declined";
            closeMedia(active, false);
            status("call-declined", { callId: event.callId });
          } else if (event.decision === "accept") {
            active.accepted = true;
            await connectAcceptedRoomAsCaller(active);
          }
          return;
        }
        if (event.type === "unavailable" || event.type === "busy" || event.type === "call-expired") {
          if (active) {
            active.endReason = event.type;
            closeMedia(active, false);
          }
          status(event.type, { callId: event.callId });
        }
      } catch (error) {
        status("media-error", { error: error?.message || "MEDIA_INBOX_FAILED" });
        if (active) { active.endReason = error?.message || "MEDIA_INBOX_FAILED"; closeMedia(active, true); }
      }
    }

    async function call({ recipientFingerprint, mode = "audio" }) {
      if (disposed) throw new Error("MEDIA_MANAGER_DISPOSED");
      if (active) throw new Error("MEDIA_CALL_ALREADY_ACTIVE");
      if (!FINGERPRINT_RE.test(recipientFingerprint) || !["audio", "video"].includes(mode)) {
        throw new Error("MEDIA_CALL_ARGUMENT_INVALID");
      }
      const peer = await globalThis.EZERO_CONNECT_TRUST.getTrustedPeerForCall(recipientFingerprint);
      if (!peer) throw new Error("MEDIA_PEER_NOT_TRUSTED");
      const invite = await globalThis.EZERO_CONNECT_SAVED_CALLS.createCallInvite({ recipientFingerprint, mode });
      const call = {
        callId: invite.callId, mode, peerFingerprint: recipientFingerprint,
        relationshipId: invite.relationshipId, peerName: peer.displayName,
        role: "host", accepted: false, closed: false
      };
      active = call;
      status("calling", { callId: call.callId, mode, peerName: call.peerName });
      try {
        call.inbox = globalThis.EZERO_CONNECT_SAVED_CALLS.connectInbox({
          signalingBaseUrl: config.signalingUrl,
          inboxFingerprint: recipientFingerprint,
          onEvent: event => handleInboxEvent(event)
        });
        await call.inbox.ready;
        call.inbox.sendCallInvite(invite.inviteCode);
        status("call-invite-sent", { callId: call.callId, mode });
        return Object.freeze({ callId: call.callId, mode, peerName: call.peerName });
      } catch (error) {
        call.endReason = error?.message || "CALL_INVITE_FAILED";
        closeMedia(call, false);
        throw error;
      }
    }

    function hangup() {
      if (!active) return false;
      active.endReason = "local-hangup";
      closeMedia(active, true);
      status("call-ended");
      return true;
    }

    function dispose() {
      disposed = true;
      if (active) { active.endReason = "page-closed"; closeMedia(active, true); }
      if (pendingIncoming) { pendingIncoming.closed = true; pendingIncoming = null; }
      try { listener?.close(); } catch (_) {}
      listener = null;
    }

    return Object.freeze({ listen, call, hangup, dispose, get activeCall() {
      return active ? Object.freeze({ callId: active.callId, mode: active.mode, peerFingerprint: active.peerFingerprint, role: active.role }) : null;
    } });
  }

  globalThis.EZERO_CONNECT_MEDIA = Object.freeze({ createManager });
})();