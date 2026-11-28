(() => {
  "use strict";

  function canonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
    }
    throw new Error("PAIRING_TRANSCRIPT_INVALID");
  }

  function create({ connection, invitePayload, role, onState }) {
    if (!connection || typeof connection.subscribe !== "function" || typeof connection.send !== "function" ||
        connection.authenticated !== true || !["host", "guest"].includes(role) ||
        !invitePayload || invitePayload.origin !== location.origin) {
      throw new Error("PAIRING_SESSION_PREREQUISITES_INVALID");
    }
    if (!globalThis.EZERO_CONNECT_TRUST || !globalThis.EZERO_CONNECT_IDENTITY) {
      throw new Error("PAIRING_CRYPTO_MODULES_UNAVAILABLE");
    }

    let state = role === "host" ? "WAITING_FOR_PEER" : "WAITING_FOR_HOST_APPROVAL";
    let transcript = null;
    let localApproval = null;
    let remoteApproval = null;
    let remoteFingerprint = null;
    let remotePublicKeySpki = null;
    let saved = false;
    const emit = extra => {
      if (typeof onState === "function") {
        try { onState({ state, role, remoteFingerprint, ...extra }); } catch (_) {}
      }
    };

    const unsubscribe = connection.subscribe(async event => {
      try {
        if (event?.type === "peer-ready" && role === "host" && state === "WAITING_FOR_PEER") {
          if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(event.peerFingerprint) ||
              typeof event.peerPublicKeySpki !== "string") throw new Error("PAIRING_PEER_IDENTITY_INVALID");
          remoteFingerprint = event.peerFingerprint;
          remotePublicKeySpki = event.peerPublicKeySpki;
          state = "READY_FOR_LOCAL_APPROVAL";
          emit();
          return;
        }

        if (event?.type !== "relay" || !event.message || !["trust-request", "trust-approval", "trust-decline"].includes(event.message.type)) return;
        const payload = event.message.payload;
        if (event.message.type === "trust-decline") {
          state = "DECLINED";
          emit();
          return;
        }

        if (event.message.type === "trust-request" && role === "guest" && state === "WAITING_FOR_HOST_APPROVAL") {
          if (!payload?.transcript || !payload?.approval) throw new Error("PAIRING_REQUEST_INVALID");
          const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
          const localPart = payload.transcript.participants?.find(p => p.fingerprint === local.fingerprint && p.publicKeySpki === local.publicKeySpki);
          const remotePart = payload.transcript.participants?.find(p => p.fingerprint !== local.fingerprint);
          if (!localPart || !remotePart || remotePart.fingerprint !== event.fromFingerprint ||
              remotePart.fingerprint !== payload.approval.signerFingerprint) throw new Error("PAIRING_REQUEST_IDENTITY_MISMATCH");
          await globalThis.EZERO_CONNECT_TRUST.verifyApproval(payload.transcript, payload.approval);
          transcript = payload.transcript;
          remoteApproval = payload.approval;
          remoteFingerprint = remotePart.fingerprint;
          remotePublicKeySpki = remotePart.publicKeySpki;
          state = "AWAITING_LOCAL_APPROVAL";
          emit();
          return;
        }

        if (event.message.type === "trust-approval" && role === "host" && state === "AWAITING_REMOTE_APPROVAL") {
          if (!payload?.transcript || !payload?.approval || canonical(payload.transcript) !== canonical(transcript)) {
            throw new Error("PAIRING_APPROVAL_TRANSCRIPT_MISMATCH");
          }
          if (event.fromFingerprint !== remoteFingerprint || payload.approval.signerFingerprint !== remoteFingerprint) {
            throw new Error("PAIRING_APPROVAL_IDENTITY_MISMATCH");
          }
          await globalThis.EZERO_CONNECT_TRUST.verifyApproval(transcript, payload.approval);
          remoteApproval = payload.approval;
          state = "MUTUAL_APPROVAL_READY";
          emit();
        }
      } catch (error) {
        state = "ERROR";
        emit({ error: error?.message || "PAIRING_PROTOCOL_ERROR" });
      }
    });

    async function approveOutgoing() {
      if (role !== "host" || state !== "READY_FOR_LOCAL_APPROVAL") throw new Error("PAIRING_NOT_READY_FOR_HOST_APPROVAL");
      const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
      if (local.fingerprint !== invitePayload.inviterFingerprint ||
          local.publicKeySpki !== invitePayload.inviterPublicKeySpki) throw new Error("PAIRING_INVITER_IDENTITY_MISMATCH");
      const built = await globalThis.EZERO_CONNECT_TRUST.buildTranscript(invitePayload, {
        fingerprint: remoteFingerprint,
        publicKeySpki: remotePublicKeySpki
      });
      transcript = built.transcript;
      localApproval = await globalThis.EZERO_CONNECT_TRUST.signApproval(transcript);
      await globalThis.EZERO_CONNECT_TRUST.verifyApproval(transcript, localApproval);
      connection.send("trust-request", { transcript, approval: localApproval });
      state = "AWAITING_REMOTE_APPROVAL";
      emit();
    }

    async function approveIncoming() {
      if (role !== "guest" || state !== "AWAITING_LOCAL_APPROVAL") throw new Error("PAIRING_NOT_READY_FOR_GUEST_APPROVAL");
      localApproval = await globalThis.EZERO_CONNECT_TRUST.signApproval(transcript);
      await globalThis.EZERO_CONNECT_TRUST.verifyApproval(transcript, localApproval);
      connection.send("trust-approval", { transcript, approval: localApproval });
      state = "MUTUAL_APPROVAL_READY";
      emit();
    }

    async function save({ displayName = "", explicitConsent } = {}) {
      if (state !== "MUTUAL_APPROVAL_READY" || !localApproval || !remoteApproval || saved) {
        throw new Error("PAIRING_MUTUAL_APPROVAL_INCOMPLETE");
      }
      if (explicitConsent !== true) throw new Error("TRUST_EXPLICIT_SAVE_CONSENT_REQUIRED");
      const result = await globalThis.EZERO_CONNECT_TRUST.saveTrustedContact({
        transcript,
        localApproval,
        remoteApproval,
        displayName,
        explicitConsent: true
      });
      saved = true;
      state = "SAVED";
      emit({ result });
      return result;
    }

    function decline() {
      if (["SAVED", "DECLINED", "CLOSED"].includes(state)) return;
      connection.send("trust-decline", { reason: "user-declined" });
      state = "DECLINED";
      emit();
    }

    function close() {
      unsubscribe();
      if (state !== "SAVED" && state !== "DECLINED") state = "CLOSED";
      emit();
    }

    return Object.freeze({
      get state() { return state; },
      get transcript() { return transcript; },
      get localApproval() { return localApproval; },
      get remoteApproval() { return remoteApproval; },
      approveOutgoing,
      approveIncoming,
      save,
      decline,
      close
    });
  }

  globalThis.EZERO_CONNECT_PAIRING = Object.freeze({ create });
})();
