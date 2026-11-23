(() => {
  "use strict";

  const ALLOWED_SEND = new Set([
    "trust-request", "trust-approval", "trust-decline",
    "call-invite", "call-accept", "call-decline", "hangup",
    "offer", "answer", "ice-candidate", "profile-metadata"
  ]);

  function stableCanonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
    }
    throw new Error("SIGNAL_CANONICAL_PAYLOAD_INVALID");
  }

  function makeHandshakePayload({ origin, roomId, inviteNonce, role, fingerprint, publicKeySpki, challenge, challengeExpiresAt }) {
    return {
      v: 1,
      protocol: "E-ZERO-SIGNAL-HELLO-1",
      origin,
      roomId,
      inviteNonce,
      role,
      fingerprint,
      publicKeySpki,
      challenge,
      challengeExpiresAt
    };
  }

  function toWebSocketUrl(baseUrl, roomId, role) {
    const url = new URL(baseUrl);
    if (url.protocol === "https:") url.protocol = "wss:";
    else if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) url.protocol = "ws:";
    else if (url.protocol !== "wss:") throw new Error("SIGNAL_TLS_REQUIRED");
    if (url.protocol === "ws:" && !["localhost", "127.0.0.1"].includes(url.hostname)) {
      throw new Error("SIGNAL_TLS_REQUIRED");
    }
    if (!["wss:", "ws:"].includes(url.protocol)) throw new Error("SIGNAL_PROTOCOL_INVALID");
    url.pathname = "/v1/rooms/" + encodeURIComponent(roomId);
    url.search = new URLSearchParams({ role }).toString();
    url.hash = "";
    return url.toString();
  }

  function connect({ inviteCode, invitePayload, role, signalingBaseUrl, onEvent }) {
    if (!["host", "guest"].includes(role)) throw new Error("SIGNAL_ROLE_INVALID");
    if (typeof inviteCode !== "string" || !inviteCode.startsWith("EZERO1.") || inviteCode.length > 8192) {
      throw new Error("SIGNAL_INVITE_INVALID");
    }
    if (!invitePayload || invitePayload.origin !== location.origin ||
        typeof invitePayload.roomId !== "string" || typeof invitePayload.nonce !== "string" ||
        !Number.isSafeInteger(invitePayload.expiresAt) || invitePayload.expiresAt <= Date.now()) {
      throw new Error("SIGNAL_VERIFIED_INVITE_REQUIRED");
    }
    if (!globalThis.EZERO_CONNECT_IDENTITY || !globalThis.WebSocket) throw new Error("SIGNAL_RUNTIME_UNAVAILABLE");

    const identityPromise = globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    const socket = new WebSocket(toWebSocketUrl(signalingBaseUrl, invitePayload.roomId, role));
    let settled = false;
    let authenticated = false;
    let closed = false;
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });

    const subscribers = new Set();
    if (typeof onEvent === "function") subscribers.add(onEvent);
    const emit = event => {
      for (const callback of subscribers) {
        try { callback(event); } catch (_) {}
      }
    };

    const fail = error => {
      if (!settled) {
        settled = true;
        rejectReady(error instanceof Error ? error : new Error("SIGNAL_CONNECTION_FAILED"));
      }
      try { socket.close(1008, "connection rejected"); } catch (_) {}
    };

    socket.addEventListener("message", async event => {
      if (typeof event.data !== "string" || event.data.length > 20_000) {
        fail(new Error("SIGNAL_SERVER_MESSAGE_INVALID"));
        return;
      }
      let message;
      try { message = JSON.parse(event.data); } catch (_) {
        fail(new Error("SIGNAL_SERVER_MESSAGE_INVALID"));
        return;
      }
      if (!authenticated && message?.type === "challenge") {
        try {
          if (message.roomId !== invitePayload.roomId || message.role !== role ||
              typeof message.challenge !== "string" ||
              !Number.isSafeInteger(message.challengeExpiresAt)) {
            throw new Error("SIGNAL_CHALLENGE_INVALID");
          }
          const identity = await identityPromise;
          const signed = makeHandshakePayload({
            origin: location.origin,
            roomId: invitePayload.roomId,
            inviteNonce: invitePayload.nonce,
            role,
            fingerprint: identity.fingerprint,
            publicKeySpki: identity.publicKeySpki,
            challenge: message.challenge,
            challengeExpiresAt: message.challengeExpiresAt
          });
          const signature = await globalThis.EZERO_CONNECT_IDENTITY.signCanonical(signed);
          socket.send(JSON.stringify({
            type: "hello",
            inviteCode,
            inviteNonce: invitePayload.nonce,
            fingerprint: identity.fingerprint,
            publicKeySpki: identity.publicKeySpki,
            signature
          }));
          emit({ type: "challenge-signed", role });
        } catch (error) {
          fail(error);
        }
        return;
      }
      if (!authenticated && message?.type === "hello-accepted") {
        if (message.role !== role || message.roomId !== invitePayload.roomId ||
            !Number.isSafeInteger(message.expiresAt) || message.expiresAt <= Date.now()) {
          fail(new Error("SIGNAL_ACCEPTANCE_INVALID"));
          return;
        }
        authenticated = true;
        if (!settled) {
          settled = true;
          resolveReady(connection);
        }
        emit(message);
        return;
      }
      if (!authenticated) {
        if (message?.type === "room-closed") fail(new Error("SIGNAL_ROOM_CLOSED"));
        else fail(new Error("SIGNAL_HANDSHAKE_NOT_ACCEPTED"));
        return;
      }
      emit(message);
    });

    socket.addEventListener("error", () => fail(new Error("SIGNAL_SOCKET_ERROR")));
    socket.addEventListener("close", event => {
      closed = true;
      if (!settled) fail(new Error("SIGNAL_SOCKET_CLOSED"));
      emit({ type: "socket-closed", code: event.code });
    });

    const connection = Object.freeze({
      ready,
      get authenticated() { return authenticated; },
      get closed() { return closed; },
      subscribe(callback) {
        if (typeof callback !== "function" || closed) throw new Error("SIGNAL_SUBSCRIBER_INVALID");
        subscribers.add(callback);
        return () => subscribers.delete(callback);
      },
      send(type, payload = {}) {
        if (!authenticated || closed || socket.readyState !== WebSocket.OPEN) throw new Error("SIGNAL_NOT_CONNECTED");
        if (!ALLOWED_SEND.has(type) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("SIGNAL_MESSAGE_NOT_ALLOWED");
        }
        const message = JSON.stringify({ type, sentAt: Date.now(), payload });
        if (new TextEncoder().encode(message).length > 16 * 1024) throw new Error("SIGNAL_MESSAGE_TOO_LARGE");
        socket.send(message);
      },
      close() {
        if (closed) return;
        try { socket.close(1000, "user closed"); } catch (_) {}
      }
    });

    return connection;
  }

  globalThis.EZERO_CONNECT_SIGNAL = Object.freeze({ connect });
})();
