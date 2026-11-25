import { createTrustedRendezvousClient } from "./ezero_connect_rendezvous_client_v1.mjs";
import { createWebRTCMessagingTransport } from "./ezero_connect_webrtc_messaging_transport_v1.mjs";
import { createTrustedFriendCallController } from "./ezero_connect_trusted_friend_call_controller_v1.mjs";

function fail(code) { throw new Error(code); }

export function createTrustedFriendMessagingSession({
  signalingUrl = globalThis.EZERO_CONNECT_CONFIG?.signalingUrl,
  relationshipId,
  iceServers = [],
  trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY,
  WebSocketImpl = globalThis.WebSocket,
  RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
  rendezvousFactory = createTrustedRendezvousClient,
  transportFactory = createWebRTCMessagingTransport,
  onMessage = null,
  onState = () => {}
} = {}) {
  if (typeof relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(relationshipId) ||
      (onMessage !== null && typeof onMessage !== "function") || typeof onState !== "function") fail("TRUSTED_FRIEND_SESSION_INPUT_INVALID");

  let closed = false;
  // The trusted call controller is armed independently of chat readiness.
  let transport = null;
  let callController = null;
  let callControllerPromise = null;
  const callCallbacks = new Set();
  let starting = false;
  let settled = false;
  const subscribers = new Set();
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});

  function emit(state, detail = {}) {
    try { onState(Object.freeze({ ...detail, state, relationshipId })); } catch (_) {}
  }
  function reject(error) {
    if (settled) return;
    settled = true;
    rejectReady(error instanceof Error ? error : new Error("TRUSTED_FRIEND_SESSION_FAILED"));
  }
  function resolve(value) {
    if (settled) return;
    settled = true;
    resolveReady(value);
  }
  function close() {
    if (closed) return;
    closed = true;
    try { callController?.close(); } catch (_) {}
    callController = null;
    callCallbacks.clear();
    try { transport?.close(); } catch (_) {}
    try { rendezvous.close(); } catch (_) {}
    emit("closed");
    reject(new Error("TRUSTED_FRIEND_SESSION_CLOSED"));
  }

  const rendezvous = rendezvousFactory({
    signalingUrl, relationshipId, trustApi, identityApi, WebSocketImpl,
    onState: value => {
      emit("rendezvous-" + value.state, value);
      if (value.state === "peer-ready" && !starting && !closed) void attachPeer(value.peerFingerprint);
      if (["error", "expired", "closed"].includes(value.state) && !transport) {
        reject(new Error(value.error || "TRUSTED_RENDEZVOUS_" + value.state.toUpperCase()));
      }
    }
  });

  callControllerPromise = rendezvous.ready.then(() => {
    if (closed) fail("TRUSTED_FRIEND_SESSION_CLOSED");
    callController = createTrustedFriendCallController({
      signalingSession: rendezvous, relationshipId, trustApi, identityApi, iceServers,
      RTCPeerConnectionImpl,
      onState: value => {
        try { globalThis.document?.dispatchEvent?.(new CustomEvent("ezero:trusted-call-state", { detail: value })); } catch (_) {}
        for (const callback of [...callCallbacks]) { try { callback.onState?.(value); } catch (_) {} }
      },
      onLocalStream: value => { for (const callback of [...callCallbacks]) { try { callback.onLocalStream?.(value); } catch (_) {} } },
      onRemoteStream: value => { for (const callback of [...callCallbacks]) { try { callback.onRemoteStream?.(value); } catch (_) {} } }
    });
    return callController;
  });
  callControllerPromise.catch(() => {});

  async function attachPeer(peerFingerprint) {
    starting = true;
    try {
      await rendezvous.ready;
      const [contact, identity] = await Promise.all([
        trustApi.getTrustedContact(relationshipId),
        identityApi.getPublicIdentity()
      ]);
      if (closed) return;
      if (!contact || contact.status !== "TRUSTED" || contact.relationshipId !== relationshipId ||
          contact.remoteFingerprint !== peerFingerprint ||
          identity?.fingerprint === peerFingerprint) fail("TRUSTED_FRIEND_PEER_IDENTITY_MISMATCH");
      transport = transportFactory({
        signalingSession: rendezvous,
        relationshipId,
        localFingerprint: identity.fingerprint,
        remoteFingerprint: contact.remoteFingerprint,
        iceServers,
        RTCPeerConnectionImpl,
        trustApi,
        identityApi,
        onMessage: async message => {
          let delivered = false;
          if (onMessage) { await onMessage(message); delivered = true; }
          for (const subscriber of [...subscribers]) { await subscriber(message); delivered = true; }
          if (!delivered) throw new Error("TRUSTED_FRIEND_NO_MESSAGE_RECEIVER");
        },
        onState: value => {
          emit("transport-" + value.state, value);
          if (value.state === "secure") resolve(Object.freeze({ state: "secure", relationshipId }));
          if (value.state === "error") reject(new Error(value.error || "TRUSTED_FRIEND_TRANSPORT_FAILED"));
        }
      });
      void transport.start().catch(reject);
      await transport.ready;
      if (!closed && !settled) resolve(Object.freeze({ state: "secure", relationshipId }));
    } catch (error) {
      emit("error", { error: error?.message || "TRUSTED_FRIEND_ATTACH_FAILED" });
      reject(error);
      close();
    }
  }

  return Object.freeze({
    ready,
    sendText(text) {
      if (closed || !transport) fail("TRUSTED_FRIEND_NOT_SECURE");
      return transport.sendText(text);
    },
    sendVoice(bytes) {
      if (closed || !transport) fail("TRUSTED_FRIEND_NOT_SECURE");
      return transport.sendVoice(bytes);
    },
    sendProfile(bytes) {
      if (closed || !transport) fail("TRUSTED_FRIEND_NOT_SECURE");
      return transport.sendProfile(bytes);
    },
    subscribe(handler) {
      if (typeof handler !== "function") fail("TRUSTED_FRIEND_SUBSCRIBER_INVALID");
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
    async createCallController(options = {}) {
      if (closed) fail("TRUSTED_FRIEND_SESSION_CLOSED");
      const callback = { onState: options.onState, onLocalStream: options.onLocalStream, onRemoteStream: options.onRemoteStream };
      callCallbacks.add(callback);
      try {
        const controller = await callControllerPromise;
        if (options.callIdFactory || options.mediaCallFactory || options.now || options.setTimer || options.clearTimer || options.iceServers || options.mediaDevices || options.RTCPeerConnectionImpl) {
          controller.configure?.(options);
        }
        await controller.ready;
        if (typeof callback.onState === "function") callback.onState({
          state: controller.state, relationshipId, callId: controller.callId, mode: controller.mode || null
        });
        return controller;
      } catch (error) {
        callCallbacks.delete(callback);
        throw error;
      }
    },
    close,
    get state() { return closed ? "closed" : transport?.state || rendezvous.state; }
  });
}
