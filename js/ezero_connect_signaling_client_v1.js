(() => {
  "use strict";
  const ALLOWED_MESSAGES = new Set([
    "trust-request", "trust-approval", "trust-decline",
    "call-invite", "call-accept", "call-decline", "call-hangup",
    "call-offer", "call-answer", "call-ice-candidate", "hangup",
    "offer", "answer", "ice-candidate", "profile-metadata"
  ]);
  const MAX_MESSAGE_BYTES = 16 * 1024;

  function stableCanonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
    }
    throw new Error("SIGNAL_CANONICAL_VALUE_INVALID");
  }

  function decodeBase64url(value, expectedBytes) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("SIGNAL_BASE64URL_INVALID");
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    if (expectedBytes && bytes.length !== expectedBytes) throw new Error("SIGNAL_BASE64URL_LENGTH_INVALID");
    return bytes;
  }

  function toFingerprint(digest) {
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
  }

  async function verifyPeerHandshake(data, context) {
    const proof = data.peerHandshake;
    const payload = proof?.payload;
    if (!payload || typeof proof.signature !== "string" ||
        payload.v !== 1 || payload.protocol !== "E-ZERO-SIGNAL-HELLO-1" ||
        payload.origin !== context.origin || payload.roomId !== context.roomId ||
        payload.inviteNonce !== context.inviteNonce ||
        payload.role !== (context.role === "host" ? "guest" : "host") ||
        payload.fingerprint !== data.peerFingerprint ||
        payload.publicKeySpki !== data.peerPublicKeySpki ||
        !Number.isSafeInteger(payload.challengeExpiresAt)) {
      throw new Error("SIGNAL_PEER_PROOF_BINDING_INVALID");
    }
    decodeBase64url(payload.challenge, 32);
    const spki = decodeBase64url(payload.publicKeySpki);
    const digest = await crypto.subtle.digest("SHA-256", spki);
    if (toFingerprint(digest) !== payload.fingerprint) throw new Error("SIGNAL_PEER_FINGERPRINT_MISMATCH");
    const key = await crypto.subtle.importKey(
      "spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      decodeBase64url(proof.signature, 64),
      new TextEncoder().encode(stableCanonical(payload))
    );
    if (!valid) throw new Error("SIGNAL_PEER_SIGNATURE_INVALID");
    if (context.role === "guest" &&
        (payload.fingerprint !== context.inviterFingerprint ||
         payload.publicKeySpki !== context.inviterPublicKeySpki)) {
      throw new Error("SIGNAL_INVITER_KEY_MISMATCH");
    }
    return {
      fingerprint: payload.fingerprint,
      publicKeySpki: payload.publicKeySpki,
      role: payload.role
    };
  }

  function connect({ role, inviteCode = null, inviteMetadata }) {
    if (!["host", "guest"].includes(role) || !inviteMetadata ||
        typeof inviteMetadata.roomId !== "string" || typeof inviteMetadata.nonce !== "string" ||
        !Number.isSafeInteger(inviteMetadata.expiresAt)) {
      throw new Error("SIGNAL_CONNECT_ARGUMENTS_INVALID");
    }
    const config = globalThis.EZERO_CONNECT_CONFIG || {};
    if (!config.signalingUrl) throw new Error("SIGNALING_URL_NOT_CONFIGURED");
    const url = new URL(config.signalingUrl);
    const allowedProtocol = location.protocol === "https:" ? "wss:" : "ws:";
    if (url.protocol !== allowedProtocol || url.username || url.password || url.hash) {
      throw new Error("SIGNALING_URL_INVALID");
    }
    const origin = location.origin;
    url.pathname = "/v1/rooms/" + encodeURIComponent(inviteMetadata.roomId);
    url.search = "?role=" + role;
    url.hash = "";

    const identityPromise = globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    let identity = null;
    let peer = null;
    let helloAccepted = false;
    let challengeUsed = false;
    const pendingRelays = [];
    let timeout = null;
    const listeners = new Map();
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    const socket = new WebSocket(url.toString());

    const emit = (name, value) => {
      for (const handler of listeners.get(name) || []) {
        try { handler(value); } catch (_) {}
      }
    };
    const fail = error => {
      emit("error", error);
      if (!helloAccepted) rejectReady(error);
      try { socket.close(1008, "signaling verification failed"); } catch (_) {}
    };

    const session = {
      ready,
      on(name, handler) {
        if (typeof handler !== "function") throw new Error("SIGNAL_LISTENER_INVALID");
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name).add(handler);
        return () => listeners.get(name)?.delete(handler);
      },
      getPeer() { return peer; },
      send(type, payload = {}) {
        if (!helloAccepted || !peer || socket.readyState !== WebSocket.OPEN) throw new Error("SIGNAL_PEER_NOT_READY");
        if (!ALLOWED_MESSAGES.has(type) || !payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("SIGNAL_MESSAGE_INVALID");
        }
        const raw = JSON.stringify({ type, payload, sentAt: Date.now() });
        if (new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) throw new Error("SIGNAL_MESSAGE_TOO_LARGE");
        socket.send(raw);
      },
      close() {
        if (socket.readyState === WebSocket.OPEN && helloAccepted && peer) {
          try { socket.send(JSON.stringify({ type: "hangup", payload: {}, sentAt: Date.now() })); } catch (_) {}
        }
        if (timeout) clearTimeout(timeout);
        try { socket.close(1000, "user closed"); } catch (_) {}
      }
    };

    timeout = setTimeout(() => fail(new Error("SIGNAL_HANDSHAKE_TIMEOUT")), 35_000);

    socket.addEventListener("message", async event => {
      try {
        if (typeof event.data !== "string" || event.data.length > MAX_MESSAGE_BYTES + 2048) {
          throw new Error("SIGNAL_SERVER_MESSAGE_INVALID");
        }
        const data = JSON.parse(event.data);
        if (data.type === "challenge") {
          if (challengeUsed || data.roomId !== inviteMetadata.roomId || data.role !== role ||
              typeof data.challenge !== "string" || !Number.isSafeInteger(data.challengeExpiresAt) ||
              data.challengeExpiresAt <= Date.now() || data.challengeExpiresAt > Date.now() + 30_000) {
            throw new Error("SIGNAL_CHALLENGE_INVALID");
          }
          decodeBase64url(data.challenge, 32);
          challengeUsed = true;
          identity = await identityPromise;
          if (role === "host" &&
              (identity.fingerprint !== inviteMetadata.inviterFingerprint ||
               identity.publicKeySpki !== inviteMetadata.inviterPublicKeySpki)) {
            throw new Error("SIGNAL_HOST_IDENTITY_MISMATCH");
          }
          if (role === "guest" && identity.fingerprint === inviteMetadata.inviterFingerprint) {
            throw new Error("SIGNAL_SELF_PAIRING_FORBIDDEN");
          }
          const signedPayload = {
            v: 1,
            protocol: "E-ZERO-SIGNAL-HELLO-1",
            origin,
            roomId: inviteMetadata.roomId,
            inviteNonce: inviteMetadata.nonce,
            role,
            fingerprint: identity.fingerprint,
            publicKeySpki: identity.publicKeySpki,
            challenge: data.challenge,
            challengeExpiresAt: data.challengeExpiresAt
          };
          const signature = await globalThis.EZERO_CONNECT_IDENTITY.signCanonical(signedPayload);
          const hello = {
            type: "hello",
            inviteNonce: inviteMetadata.nonce,
            fingerprint: identity.fingerprint,
            publicKeySpki: identity.publicKeySpki,
            signature
          };
          if (inviteCode) hello.inviteCode = inviteCode;
          socket.send(JSON.stringify(hello));
          return;
        }
        if (data.type === "hello-accepted") {
          if (data.roomId !== inviteMetadata.roomId || data.role !== role) throw new Error("SIGNAL_HELLO_ACCEPTED_INVALID");
          helloAccepted = true;
          if (timeout) clearTimeout(timeout);
          timeout = null;
          resolveReady(session);
          emit("ready", data);
          return;
        }
        if (data.type === "peer-ready") {
          if (!helloAccepted) throw new Error("SIGNAL_PEER_BEFORE_READY");
          peer = await verifyPeerHandshake(data, {
            origin,
            roomId: inviteMetadata.roomId,
            inviteNonce: inviteMetadata.nonce,
            role,
            inviterFingerprint: inviteMetadata.inviterFingerprint,
            inviterPublicKeySpki: inviteMetadata.inviterPublicKeySpki
          });
          emit("peer-ready", peer);
          for (const queued of pendingRelays.splice(0)) {
            if (queued.fromFingerprint !== peer.fingerprint) throw new Error("SIGNAL_RELAY_SENDER_INVALID");
            emit("message", queued.message);
          }
          return;
        }
        if (data.type === "relay") {
          if (!peer) {
            if (pendingRelays.length >= 8) throw new Error("SIGNAL_RELAY_QUEUE_LIMIT");
            pendingRelays.push(data);
            return;
          }
          if (data.fromFingerprint !== peer.fingerprint) throw new Error("SIGNAL_RELAY_SENDER_INVALID");
          emit("message", data.message);
          return;
        }
        if (["waiting-for-peer", "peer-disconnected", "room-closed", "rate-limited", "peer-not-connected"].includes(data.type)) {
          emit(data.type, data);
          return;
        }
        throw new Error("SIGNAL_SERVER_MESSAGE_TYPE_INVALID");
      } catch (error) {
        fail(error);
      }
    });

    socket.addEventListener("error", () => fail(new Error("SIGNAL_SOCKET_ERROR")));
    socket.addEventListener("close", event => {
      if (timeout) clearTimeout(timeout);
      if (!helloAccepted) rejectReady(new Error("SIGNAL_SOCKET_CLOSED_BEFORE_READY"));
      emit("close", { code: event.code, reason: event.reason });
    });
    return session;
  }

  globalThis.EZERO_CONNECT_SIGNALING = Object.freeze({ connect });
})();
