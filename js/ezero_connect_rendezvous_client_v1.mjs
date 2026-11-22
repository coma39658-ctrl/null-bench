import { createTrustedReconnectProof } from "./ezero_connect_trusted_reconnect_v1.mjs";

const RELAY_TYPES = new Set(["offer", "answer", "ice-candidate", "hangup"]);

function fail(code) { throw new Error(code); }

export function createTrustedRendezvousClient({
  signalingUrl,
  relationshipId,
  trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY,
  WebSocketImpl = globalThis.WebSocket,
  onState = () => {}
} = {}) {
  if (typeof signalingUrl !== "string" || typeof relationshipId !== "string" ||
      !/^[a-f0-9]{64}$/.test(relationshipId) || typeof WebSocketImpl !== "function" ||
      typeof onState !== "function") fail("RENDEZVOUS_CLIENT_INPUT_INVALID");
  const base = new URL(signalingUrl);
  if (!["wss:", "ws:"].includes(base.protocol) ||
      (base.protocol === "ws:" && !["localhost", "127.0.0.1"].includes(base.hostname))) {
    fail("RENDEZVOUS_TLS_REQUIRED");
  }
  base.pathname = "/v1/rendezvous/" + relationshipId;
  base.search = "";
  base.hash = "";
  const socket = new WebSocketImpl(base.toString());
  let state = "connecting";
  let closed = false;
  let proofSent = false;
  const listeners = new Set();
  let resolveReady, rejectReady;
  const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
  ready.catch(() => {});

  function emit(next, detail = {}) {
    state = next;
    try { onState(Object.freeze({ state: next, relationshipId, ...detail })); } catch (_) {}
  }
  function sendRaw(value) {
    if (socket.readyState !== 1) fail("RENDEZVOUS_SOCKET_NOT_OPEN");
    socket.send(JSON.stringify(value));
  }
  async function handleMessage(event) {
    let message;
    try { message = JSON.parse(typeof event.data === "string" ? event.data : ""); }
    catch (_) { return terminate(new Error("RENDEZVOUS_SERVER_MESSAGE_INVALID")); }
    if (!message || typeof message.type !== "string") return terminate(new Error("RENDEZVOUS_SERVER_MESSAGE_INVALID"));
    if (message.type === "challenge") {
      if (proofSent || typeof message.challenge !== "string" || !Number.isSafeInteger(message.challengeExpiresAt)) {
        return terminate(new Error("RENDEZVOUS_CHALLENGE_INVALID"));
      }
      proofSent = true;
      try {
        const proof = await createTrustedReconnectProof({
          relationshipId, challenge: message.challenge,
          challengeExpiresAt: message.challengeExpiresAt, trustApi, identityApi
        });
        if (!closed) sendRaw({ type: "proof", proof });
        emit("proof-sent");
      } catch (error) { terminate(error); }
      return;
    }
    if (message.type === "authenticated") {
      if (state !== "proof-sent" || !Number.isSafeInteger(message.expiresAt)) return terminate(new Error("RENDEZVOUS_AUTH_RESPONSE_INVALID"));
      emit("authenticated", { expiresAt: message.expiresAt });
      resolveReady(Object.freeze({ state: "authenticated", relationshipId, expiresAt: message.expiresAt }));
      return;
    }
    if (message.type === "peer-ready") { emit("peer-ready", { peerFingerprint: message.peerFingerprint }); return; }
    if (message.type === "waiting-for-peer") { emit("waiting-for-peer"); return; }
    if (message.type === "peer-offline") { emit("peer-offline"); return; }
    if (message.type === "peer-disconnected") { emit("peer-disconnected"); return; }
    if (message.type === "rate-limited") { emit("rate-limited"); return; }
    if (message.type === "session-ended") { emit("session-ended"); return; }
    if (message.type === "relay") {
      if (!message.message || !RELAY_TYPES.has(message.message.type) ||
          typeof message.fromFingerprint !== "string") return terminate(new Error("RENDEZVOUS_RELAY_INVALID"));
      for (const listener of listeners) {
        try { listener(Object.freeze({ type: message.message.type, payload: message.message.payload, fromFingerprint: message.fromFingerprint })); }
        catch (_) {}
      }
      return;
    }
    if (message.type === "session-expired" || message.type === "room-closed") {
      emit("expired");
      terminate(new Error("RENDEZVOUS_SESSION_EXPIRED"));
      return;
    }
    terminate(new Error("RENDEZVOUS_SERVER_MESSAGE_UNRECOGNIZED"));
  }
  function terminate(error) {
    if (closed) return;
    closed = true;
    if (state !== "expired") emit("error", { error: error?.message || "RENDEZVOUS_FAILED" });
    rejectReady(error instanceof Error ? error : new Error("RENDEZVOUS_FAILED"));
    try { socket.close(1008, "rendezvous closed"); } catch (_) {}
  }
  socket.addEventListener("open", () => emit("socket-open"));
  socket.addEventListener("message", event => { void handleMessage(event); });
  socket.addEventListener("error", () => terminate(new Error("RENDEZVOUS_SOCKET_ERROR")));
  socket.addEventListener("close", () => {
    if (!closed) {
      closed = true;
      emit("closed");
      if (state !== "authenticated" && state !== "peer-ready") rejectReady(new Error("RENDEZVOUS_SOCKET_CLOSED"));
    }
  });

  return Object.freeze({
    ready,
    on(eventName, listener) {
      if (eventName !== "message" || typeof listener !== "function") fail("RENDEZVOUS_LISTENER_INVALID");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    send(type, payload = {}) {
      if (closed || state !== "authenticated" && state !== "peer-ready" && state !== "waiting-for-peer") {
        fail("RENDEZVOUS_NOT_AUTHENTICATED");
      }
      if (!RELAY_TYPES.has(type) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
        fail("RENDEZVOUS_RELAY_TYPE_INVALID");
      }
      sendRaw({ type, sentAt: Date.now(), payload });
    },
    close() {
      if (closed) return;
      closed = true;
      try { socket.close(1000, "client closed"); } catch (_) {}
      emit("closed");
    },
    get state() { return state; }
  });
}
