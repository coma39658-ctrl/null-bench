import { createWebRTCMediaCallTransport } from "./ezero_connect_webrtc_media_call_v1.mjs";

function fail(code) { throw new Error(code); }
const validFingerprint = value => typeof value === "string" && /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value);
const validCallId = value => typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);

function makeCallId(cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.getRandomValues) fail("CALL_ID_CRYPTO_UNAVAILABLE");
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(24));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

/*
 * Call control for an already-authenticated, mutually trusted saved-friend
 * signaling session. The UI must call accept() from the explicit Accept action.
 * No microphone/camera is requested until the matching invite is accepted.
 */
export function createTrustedFriendCallController({
  signalingSession,
  relationshipId,
  trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY,
  iceServers = [],
  mediaDevices = globalThis.navigator?.mediaDevices,
  RTCPeerConnectionImpl = globalThis.RTCPeerConnection,
  mediaCallFactory = createWebRTCMediaCallTransport,
  callIdFactory = () => makeCallId(),
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  onLocalStream = () => {},
  onRemoteStream = () => {},
  onState = () => {}
} = {}) {
  if (!signalingSession?.on || !signalingSession?.send ||
      typeof relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(relationshipId) ||
      typeof onState !== "function" || typeof mediaCallFactory !== "function") {
    fail("TRUSTED_CALL_CONTROLLER_INPUT_INVALID");
  }

  let closed = false;
  let phase = "verifying";
  let active = null;
  let media = null;
  let expiryTimer = null;
  let localFingerprint = null;
  let remoteFingerprint = null;
  const subscribers = new Set();
  const pendingMessages = [];

  function emit(state, detail = {}) {
    const event = Object.freeze({ state, relationshipId, callId: active?.callId || null, mode: active?.mode || null, ...detail });
    try { onState(event); } catch (_) {}
    for (const subscriber of [...subscribers]) { try { subscriber(event); } catch (_) {} }
  }
  function clearExpiry() {
    if (expiryTimer !== null) clearTimer(expiryTimer);
    expiryTimer = null;
  }
  function reset(next = "idle", detail = {}) {
    clearExpiry();
    try { media?.close(false); } catch (_) {}
    media = null;
    active = null;
    phase = next;
    emit(next, detail);
  }
  function canStartNewCall() { return !active && ["idle", "ended", "declined", "expired", "failed"].includes(phase); }
  function isLive(call) {
    return !!call && Number.isSafeInteger(call.expiresAt) && call.expiresAt > now();
  }
  function startMedia(role) {
    const call = active;
    if (!call || !isLive(call) || closed) return fail("TRUSTED_CALL_EXPIRED");
    media = mediaCallFactory({
      signalingSession, callId: call.callId, mode: call.mode, role, remoteFingerprint,
      iceServers, mediaDevices, RTCPeerConnectionImpl, onLocalStream, onRemoteStream,
      onState: value => {
        if (!active || active.callId !== call.callId) return;
        if (value.state === "connected") { phase = "connected"; emit("connected", value); }
        else if (value.state === "error") emit("media-error", value);
        else if (value.state === "closed" && phase !== "idle") reset("ended", { reason: "media-closed" });
        else emit("media-" + value.state, value);
      }
    });
    phase = "starting-media";
    emit("starting-media", { role });
    return media.start();
  }
  function armExpiry(call) {
    clearExpiry();
    const delay = Math.max(0, call.expiresAt - now());
    expiryTimer = setTimer(() => {
      if (active?.callId === call.callId && phase !== "connected") reset("expired", { reason: "invite-expired" });
    }, delay);
  }

  async function verifyTrust() {
    if (!trustApi?.getTrustedContact || !identityApi?.getPublicIdentity) fail("TRUSTED_CALL_APIS_UNAVAILABLE");
    const [contact, identity] = await Promise.all([
      trustApi.getTrustedContact(relationshipId),
      identityApi.getPublicIdentity()
    ]);
    if (!contact || contact.status !== "TRUSTED" || contact.relationshipId !== relationshipId ||
        !validFingerprint(contact.remoteFingerprint) || !validFingerprint(identity?.fingerprint) ||
        contact.remoteFingerprint === identity.fingerprint) fail("TRUSTED_CALL_CONTACT_NOT_VERIFIED");
    localFingerprint = identity.fingerprint;
    remoteFingerprint = contact.remoteFingerprint;
    phase = "idle";
    emit("ready", { localFingerprint, remoteFingerprint });
    return Object.freeze({ state: "ready", relationshipId, localFingerprint, remoteFingerprint });
  }

  async function handleMessage(message) {
    if (closed || !message || !message.payload) return;
    // A valid invite can arrive just after rendezvous authentication but
    // before the local trust lookup finishes. Queue only bounded call invites;
    // verify the sender fingerprint once the trusted contact is loaded.
    if (!remoteFingerprint) {
      if (message.type === "call-invite" && pendingMessages.length < 8) pendingMessages.push(message);
      return;
    }
    if (message.fromFingerprint !== remoteFingerprint) return;
    const payload = message.payload;
    if (message.type === "call-invite") {
      if (!validCallId(payload.callId) || !["audio", "video"].includes(payload.mode) ||
          !Number.isSafeInteger(payload.expiresAt) || payload.expiresAt <= now() ||
          payload.expiresAt > now() + 60_000) return;
      if (!canStartNewCall()) {
        try { signalingSession.send("call-decline", { callId: payload.callId }); } catch (_) {}
        return;
      }
      active = { callId: payload.callId, mode: payload.mode, expiresAt: payload.expiresAt, direction: "incoming" };
      phase = "incoming";
      armExpiry(active);
      emit("incoming", { expiresAt: active.expiresAt, fromFingerprint: remoteFingerprint });
      return;
    }
    if (!active || payload.callId !== active.callId || !isLive(active)) return;
    if (message.type === "call-accept" && active.direction === "outgoing" && phase === "outgoing") {
      clearExpiry();
      phase = "accepted";
      emit("accepted");
      try { await startMedia("caller"); }
      catch (error) { reset("failed", { error: error?.message || "CALL_MEDIA_START_FAILED" }); }
    } else if (message.type === "call-decline" && active.direction === "outgoing") {
      reset("declined", { reason: "friend-declined" });
    } else if (message.type === "call-decline" && active.direction === "incoming") {
      reset("ended", { reason: "caller-cancelled-invite" });
    } else if (message.type === "call-hangup" && ["starting-media", "connected", "accepted"].includes(phase)) {
      reset("ended", { reason: "friend-hung-up" });
    }
  }

  function hangup() {
    if (closed || !active) return false;
    if (media) media.close(true);
    else {
      try { signalingSession.send("call-decline", { callId: active.callId }); } catch (_) {}
    }
    reset("ended", { reason: "local-hangup" });
    return true;
  }

  const removeListener = signalingSession.on("message", message => { void handleMessage(message); });
  const ready = verifyTrust().then(async result => {
    const queued = pendingMessages.splice(0);
    for (const message of queued) await handleMessage(message);
    return result;
  }).catch(error => {
    phase = "error";
    pendingMessages.length = 0;
    emit("error", { error: error?.message || "TRUSTED_CALL_VERIFICATION_FAILED" });
    throw error;
  });

  return Object.freeze({
    ready,
    async call(mode) {
      await ready;
      if (closed || !canStartNewCall() || !["audio", "video"].includes(mode)) fail("TRUSTED_CALL_NOT_AVAILABLE");
      const callId = callIdFactory();
      if (!validCallId(callId)) fail("TRUSTED_CALL_ID_INVALID");
      const expiresAt = now() + 45_000;
      active = { callId, mode, expiresAt, direction: "outgoing" };
      phase = "outgoing";
      armExpiry(active);
      try { signalingSession.send("call-invite", { callId, mode, expiresAt }); }
      catch (error) { reset("failed", { error: error?.message || "CALL_INVITE_SEND_FAILED" }); throw error; }
      emit("outgoing", { expiresAt, toFingerprint: remoteFingerprint });
      return Object.freeze({ callId, mode, expiresAt });
    },
    async accept() {
      await ready;
      if (closed || phase !== "incoming" || !isLive(active)) fail("TRUSTED_CALL_NO_INCOMING_INVITE");
      const call = active;
      clearExpiry();
      signalingSession.send("call-accept", { callId: call.callId });
      phase = "accepted";
      emit("accepted");
      try { await startMedia("callee"); }
      catch (error) { reset("failed", { error: error?.message || "CALL_MEDIA_START_FAILED" }); throw error; }
      return Object.freeze({ callId: call.callId, mode: call.mode });
    },
    async decline() {
      await ready;
      if (closed || phase !== "incoming" || !active) fail("TRUSTED_CALL_NO_INCOMING_INVITE");
      const callId = active.callId;
      signalingSession.send("call-decline", { callId });
      reset("declined", { reason: "local-decline" });
      return callId;
    },
    hangup,
    subscribe(handler) {
      if (typeof handler !== "function") fail("TRUSTED_CALL_SUBSCRIBER_INVALID");
      subscribers.add(handler);
      return () => subscribers.delete(handler);
    },
    close() {
      if (closed) return;
      if (active) hangup();
      closed = true;
      clearExpiry();
      try { removeListener?.(); } catch (_) {}
      try { media?.close(false); } catch (_) {}
      media = null;
      phase = "closed";
      emit("closed");
    },
    get state() { return phase; },
    get callId() { return active?.callId || null; }
  });
}
