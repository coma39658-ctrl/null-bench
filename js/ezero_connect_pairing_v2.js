(() => {
  "use strict";

  function create({ connection, invitePayload, role, onState }) {
    if (!connection || connection.authenticated !== true ||
        typeof connection.subscribe !== "function" ||
        !["host", "guest"].includes(role) ||
        !invitePayload || invitePayload.origin !== location.origin ||
        !globalThis.EZERO_CONNECT_TRUST?.saveVerifiedPeer) {
      throw new Error("PAIRING_V2_PREREQUISITES_INVALID");
    }

    let state = role === "host" ? "WAITING_FOR_FRIEND_TO_SCAN" : "VERIFYING_FRIEND";
    let remoteFingerprint = null;
    let saved = false;
    let closed = false;
    let processing = false;

    const emit = extra => {
      try { onState?.({ state, role, remoteFingerprint, ...extra }); } catch (_) {}
    };

    const unsubscribe = connection.subscribe(async event => {
      if (closed || saved || processing) return;
      if (event?.type === "peer-disconnected") {
        state = "PEER_DISCONNECTED";
        emit();
        return;
      }
      if (event?.type !== "peer-ready") return;
      processing = true;
      state = "VERIFYING_BOTH_DEVICES";
      remoteFingerprint = event.peerFingerprint || null;
      emit();
      try {
        if (!event.peerHandshake || typeof event.peerFingerprint !== "string" ||
            typeof event.peerPublicKeySpki !== "string") {
          throw new Error("PAIRING_V2_PEER_PROOF_MISSING");
        }
        state = "SAVING_VERIFIED_FRIEND";
        emit();
        const result = await globalThis.EZERO_CONNECT_TRUST.saveVerifiedPeer({
          invitePayload,
          peerHandshake: event.peerHandshake,
          localRole: role,
          peerFingerprint: event.peerFingerprint,
          peerPublicKeySpki: event.peerPublicKeySpki
        });
        saved = true;
        state = "SAVED";
        emit({ result });
      } catch (error) {
        state = "ERROR";
        emit({ error: error?.message || "PAIRING_V2_FAILED" });
      } finally {
        processing = false;
      }
    });

    function close() {
      if (closed) return;
      closed = true;
      unsubscribe();
      if (!saved && state !== "ERROR") state = "CLOSED";
      emit();
    }

    return Object.freeze({
      get state() { return state; },
      get saved() { return saved; },
      close
    });
  }

  globalThis.EZERO_CONNECT_PAIRING_V2 = Object.freeze({ create });
})();
