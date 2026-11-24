(() => {
  "use strict";

  const CALL_PREFIX = "EZERO-CALL1.";
  const CALL_TTL_MS = 30_000;
  const MAX_CALL_CHARS = 8192;
  const FINGERPRINT_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
  const seenIncoming = new Set();

  function canonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
    }
    throw new Error("SAVED_CALL_CANONICAL_INVALID");
  }

  function toBase64Url(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }

  function fromBase64Url(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("SAVED_CALL_ENCODING_INVALID");
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
    let binary;
    try { binary = atob(padded); } catch (_) { throw new Error("SAVED_CALL_ENCODING_INVALID"); }
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  function randomId() {
    return toBase64Url(crypto.getRandomValues(new Uint8Array(24)));
  }

  async function fingerprintFor(spki) {
    const digest = await crypto.subtle.digest("SHA-256", fromBase64Url(spki));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
  }

  function requireRuntime() {
    if (!globalThis.crypto?.subtle || !globalThis.isSecureContext ||
        !globalThis.EZERO_CONNECT_IDENTITY || !globalThis.EZERO_CONNECT_TRUST) {
      throw new Error("SAVED_CALL_SECURE_RUNTIME_REQUIRED");
    }
  }

  async function createCallInvite({ recipientFingerprint, mode }) {
    requireRuntime();
    if (!FINGERPRINT_RE.test(recipientFingerprint) || !["audio", "video"].includes(mode)) {
      throw new Error("SAVED_CALL_ARGUMENT_INVALID");
    }
    const peer = await globalThis.EZERO_CONNECT_TRUST.getTrustedPeerForCall(recipientFingerprint);
    if (!peer || peer.remoteFingerprint !== recipientFingerprint) throw new Error("SAVED_CALL_PEER_NOT_TRUSTED");
    const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    if (local.fingerprint === recipientFingerprint) throw new Error("SAVED_CALL_SELF_FORBIDDEN");
    const issuedAt = Date.now();
    const payload = {
      v: 1,
      protocol: "E-ZERO-SAVED-FRIEND-CALL-1",
      origin: location.origin,
      callerFingerprint: local.fingerprint,
      callerPublicKeySpki: local.publicKeySpki,
      recipientFingerprint,
      relationshipId: peer.relationshipId,
      callId: randomId(),
      nonce: randomId(),
      mode,
      issuedAt,
      expiresAt: issuedAt + CALL_TTL_MS
    };
    const signature = await globalThis.EZERO_CONNECT_IDENTITY.signCanonical(payload);
    const inviteCode = CALL_PREFIX + toBase64Url(new TextEncoder().encode(JSON.stringify({ payload, signature })));
    if (inviteCode.length > MAX_CALL_CHARS) throw new Error("SAVED_CALL_INVITE_TOO_LARGE");
    return Object.freeze({ inviteCode, callId: payload.callId, mode, recipientFingerprint, relationshipId: peer.relationshipId, expiresAt: payload.expiresAt });
  }

  async function verifyIncomingCallInvite(inviteCode) {
    requireRuntime();
    if (typeof inviteCode !== "string" || inviteCode.length > MAX_CALL_CHARS || !inviteCode.startsWith(CALL_PREFIX)) {
      throw new Error("SAVED_CALL_INVITE_FORMAT_INVALID");
    }
    let envelope;
    try { envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(fromBase64Url(inviteCode.slice(CALL_PREFIX.length)))); }
    catch (_) { throw new Error("SAVED_CALL_INVITE_FORMAT_INVALID"); }
    if (!envelope || Object.keys(envelope).sort().join(",") !== "payload,signature" || typeof envelope.signature !== "string") {
      throw new Error("SAVED_CALL_INVITE_ENVELOPE_INVALID");
    }
    const p = envelope.payload;
    const fields = ["callerFingerprint","callerPublicKeySpki","callId","expiresAt","issuedAt","mode","nonce","origin","protocol","recipientFingerprint","relationshipId","v"].sort().join(",");
    if (!p || typeof p !== "object" || Array.isArray(p) || Object.keys(p).sort().join(",") !== fields) {
      throw new Error("SAVED_CALL_INVITE_FIELDS_INVALID");
    }
    const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    if (p.v !== 1 || p.protocol !== "E-ZERO-SAVED-FRIEND-CALL-1" ||
        p.origin !== location.origin || p.recipientFingerprint !== local.fingerprint ||
        !FINGERPRINT_RE.test(p.callerFingerprint) || p.callerFingerprint === local.fingerprint ||
        !["audio", "video"].includes(p.mode) ||
        typeof p.relationshipId !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(p.relationshipId) ||
        typeof p.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(p.callId) ||
        typeof p.nonce !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(p.nonce)) {
      throw new Error("SAVED_CALL_INVITE_BINDING_INVALID");
    }
    const now = Date.now();
    if (!Number.isSafeInteger(p.issuedAt) || !Number.isSafeInteger(p.expiresAt) ||
        p.issuedAt > now + 5_000 || p.expiresAt <= now ||
        p.expiresAt <= p.issuedAt || p.expiresAt - p.issuedAt > CALL_TTL_MS) {
      throw new Error("SAVED_CALL_INVITE_EXPIRED");
    }
    if (await fingerprintFor(p.callerPublicKeySpki) !== p.callerFingerprint) {
      throw new Error("SAVED_CALL_INVITE_FINGERPRINT_MISMATCH");
    }
    const peer = await globalThis.EZERO_CONNECT_TRUST.getTrustedPeerForCall(p.callerFingerprint);
    if (!peer || peer.relationshipId !== p.relationshipId ||
        peer.remotePublicKeySpki !== p.callerPublicKeySpki) {
      throw new Error("SAVED_CALL_CALLER_NOT_TRUSTED");
    }
    const key = await crypto.subtle.importKey("spki", fromBase64Url(p.callerPublicKeySpki),
      { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key,
      fromBase64Url(envelope.signature), new TextEncoder().encode(canonical(p)));
    if (!valid) throw new Error("SAVED_CALL_INVITE_SIGNATURE_INVALID");
    if (seenIncoming.has(p.callId) || seenIncoming.has(p.nonce)) throw new Error("SAVED_CALL_INVITE_REPLAYED");
    seenIncoming.add(p.callId);
    seenIncoming.add(p.nonce);
    if (seenIncoming.size > 256) seenIncoming.clear();
    return Object.freeze({
      callId: p.callId, mode: p.mode, callerFingerprint: p.callerFingerprint,
      callerName: peer.displayName, relationshipId: p.relationshipId, expiresAt: p.expiresAt
    });
  }

  async function createRoomInviteForAcceptedCall({ call }) {
    if (!call || call.accepted !== true || typeof call.callId !== "string" ||
        !["audio", "video"].includes(call.mode)) throw new Error("SAVED_CALL_ACCEPT_REQUIRED");
    const invite = await globalThis.EZERO_CONNECT_INVITES.createInvite();
    const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    if (invite.inviterFingerprint !== local.fingerprint || invite.origin !== location.origin) {
      throw new Error("SAVED_CALL_ROOM_INVITE_IDENTITY_INVALID");
    }
    return Object.freeze({ callId: call.callId, inviteCode: invite.inviteCode, invite });
  }

  async function verifyRoomInviteForAcceptedCall({ call, inviteCode }) {
    if (!call || call.accepted !== true || typeof call.callId !== "string" ||
        typeof call.callerFingerprint !== "string" || typeof inviteCode !== "string") {
      throw new Error("SAVED_CALL_ACCEPT_REQUIRED");
    }
    const invite = await globalThis.EZERO_CONNECT_INVITES.verifyInvite(inviteCode);
    const peer = await globalThis.EZERO_CONNECT_TRUST.getTrustedPeerForCall(call.callerFingerprint);
    if (!peer || peer.relationshipId !== call.relationshipId ||
        invite.inviterFingerprint !== call.callerFingerprint ||
        invite.inviterPublicKeySpki !== peer.remotePublicKeySpki ||
        invite.origin !== location.origin || invite.expiresAt <= Date.now()) {
      throw new Error("SAVED_CALL_ROOM_INVITE_PEER_MISMATCH");
    }
    return invite;
  }

  function connectInbox({ signalingBaseUrl, inboxFingerprint, onEvent }) {
    requireRuntime();
    if (!FINGERPRINT_RE.test(inboxFingerprint) || typeof signalingBaseUrl !== "string") {
      throw new Error("SAVED_CALL_INBOX_ARGUMENT_INVALID");
    }
    const url = new URL(signalingBaseUrl);
    if (url.protocol === "https:") url.protocol = "wss:";
    if (url.protocol !== "wss:") throw new Error("SAVED_CALL_INBOX_TLS_REQUIRED");
    url.pathname = "/v1/inbox/" + encodeURIComponent(inboxFingerprint);
    url.search = "";
    url.hash = "";
    const socket = new WebSocket(url.toString());
    let authenticated = false;
    let closed = false;
    let readySettled = false;
    let resolveReady;
    let rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    const emit = event => { try { if (typeof onEvent === "function") onEvent(event); } catch (_) {} };
    const rejectHandshake = error => {
      if (readySettled) return;
      readySettled = true;
      rejectReady(error instanceof Error ? error : new Error("SAVED_CALL_INBOX_FAILED"));
      try { socket.close(1008, "inbox handshake failed"); } catch (_) {}
    };
    const timer = setTimeout(() => rejectHandshake(new Error("SAVED_CALL_INBOX_TIMEOUT")), 10_000);

    socket.addEventListener("message", async event => {
      if (typeof event.data !== "string" || event.data.length > 12_000) {
        rejectHandshake(new Error("SAVED_CALL_INBOX_MESSAGE_INVALID")); return;
      }
      let message;
      try { message = JSON.parse(event.data); } catch (_) {
        rejectHandshake(new Error("SAVED_CALL_INBOX_MESSAGE_INVALID")); return;
      }
      if (!authenticated && message?.type === "challenge") {
        try {
          const p = message.payload;
          if (!p || p.v !== 1 || p.protocol !== "E-ZERO-INBOX-HELLO-1" ||
              p.origin !== location.origin || p.inboxFingerprint !== inboxFingerprint ||
              typeof p.challenge !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(p.challenge) ||
              !Number.isSafeInteger(p.challengeExpiresAt) || p.challengeExpiresAt <= Date.now() ||
              p.challengeExpiresAt > Date.now() + 30_000) throw new Error("SAVED_CALL_INBOX_CHALLENGE_INVALID");
          const identity = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
          const proof = {
            v: 1, protocol: "E-ZERO-INBOX-HELLO-1", origin: location.origin,
            fingerprint: identity.fingerprint, inboxFingerprint,
            challenge: p.challenge, challengeExpiresAt: p.challengeExpiresAt
          };
          const signature = await globalThis.EZERO_CONNECT_IDENTITY.signCanonical(proof);
          socket.send(JSON.stringify({ type: "hello", fingerprint: identity.fingerprint,
            publicKeySpki: identity.publicKeySpki, signature }));
        } catch (error) { rejectHandshake(error); }
        return;
      }
      if (!authenticated && message?.type === "inbox-ready" && message.fingerprint) {
        const identity = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
        if (message.fingerprint !== identity.fingerprint) {
          rejectHandshake(new Error("SAVED_CALL_INBOX_IDENTITY_MISMATCH")); return;
        }
        authenticated = true;
        readySettled = true;
        clearTimeout(timer);
        resolveReady(connection);
        emit(message);
        return;
      }
      if (!authenticated) { rejectHandshake(new Error("SAVED_CALL_INBOX_HANDSHAKE_REJECTED")); return; }
      emit(message);
    });
    socket.addEventListener("error", () => rejectHandshake(new Error("SAVED_CALL_INBOX_SOCKET_ERROR")));
    socket.addEventListener("close", event => {
      closed = true;
      clearTimeout(timer);
      if (!readySettled) rejectHandshake(new Error("SAVED_CALL_INBOX_SOCKET_CLOSED"));
      emit({ type: "inbox-closed", code: event.code });
    });

    const connection = Object.freeze({
      ready,
      get authenticated() { return authenticated; },
      get closed() { return closed; },
      sendCallInvite(inviteCode) {
        if (!authenticated || closed || socket.readyState !== WebSocket.OPEN ||
            typeof inviteCode !== "string" || !inviteCode.startsWith(CALL_PREFIX) || inviteCode.length > MAX_CALL_CHARS) {
          throw new Error("SAVED_CALL_INBOX_NOT_READY");
        }
        socket.send(JSON.stringify({ type: "call-invite", inviteCode }));
      },
      respondToCall(callId, decision) {
        if (!authenticated || closed || socket.readyState !== WebSocket.OPEN ||
            typeof callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(callId) ||
            !["accept", "decline"].includes(decision)) throw new Error("SAVED_CALL_RESPONSE_INVALID");
        socket.send(JSON.stringify({ type: "call-response", callId, decision }));
      },
      sendRoomInvite(callId, inviteCode) {
        if (!authenticated || closed || socket.readyState !== WebSocket.OPEN ||
            typeof callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(callId) ||
            typeof inviteCode !== "string" || !inviteCode.startsWith("EZERO1.") || inviteCode.length > 8192) {
          throw new Error("SAVED_CALL_ROOM_INVITE_INVALID");
        }
        socket.send(JSON.stringify({ type: "call-room-invite", callId, inviteCode }));
      },
      cancelCall(callId) {
        if (!authenticated || closed || socket.readyState !== WebSocket.OPEN ||
            typeof callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(callId)) throw new Error("SAVED_CALL_CANCEL_INVALID");
        socket.send(JSON.stringify({ type: "call-cancel", callId }));
      },
      close() { if (!closed) socket.close(1000, "user closed"); }
    });
    return connection;
  }

  globalThis.EZERO_CONNECT_SAVED_CALLS = Object.freeze({
    createCallInvite,
    verifyIncomingCallInvite,
    createRoomInviteForAcceptedCall,
    verifyRoomInviteForAcceptedCall,
    connectInbox
  });
})();