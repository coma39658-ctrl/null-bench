import { EzeroConnectRendezvous } from "./rendezvous.mjs";
export { EzeroConnectRendezvous };

const INVITE_PREFIX = "EZERO1.";
const INVITE_TTL_MS = 90_000;
const INVITE_CLOCK_SKEW_TOLERANCE_MS = 2 * 60_000;
const ROOM_TTL_MS = 10 * 60_000;
const CHALLENGE_TTL_MS = 30_000;
const MAX_PENDING_PER_ROLE = 3;
const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_ICE_BYTES = 2 * 1024;
const MAX_SDP_CHARS = 12 * 1024;
const ALLOWED_MESSAGES = new Set([
  "trust-request", "trust-approval", "trust-decline",
  "call-invite", "call-accept", "call-decline", "hangup",
  "offer", "answer", "ice-candidate", "profile-metadata"
]);

export function stableCanonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
  }
  throw new Error("CANONICAL_VALUE_INVALID");
}

export function decodeBase64url(value, expectedBytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("BASE64URL_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("BASE64URL_INVALID"); }
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (expectedBytes && bytes.length !== expectedBytes) throw new Error("BASE64URL_LENGTH_INVALID");
  return bytes;
}

export function toFingerprint(digest) {
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

export async function verifyEcdsa(publicKeySpki, signature, payload) {
  const publicKey = await crypto.subtle.importKey(
    "spki",
    decodeBase64url(publicKeySpki),
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    decodeBase64url(signature, 64),
    new TextEncoder().encode(stableCanonical(payload))
  );
  return valid;
}

export async function verifyInviteCode(inviteCode, expectedOrigin, expectedRoomId, now = Date.now()) {
  if (typeof inviteCode !== "string" || inviteCode.length > 8192 || !inviteCode.startsWith(INVITE_PREFIX)) {
    throw new Error("INVITE_FORMAT_INVALID");
  }
  let envelope;
  try {
    const bytes = decodeBase64url(inviteCode.slice(INVITE_PREFIX.length));
    envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (_) {
    throw new Error("INVITE_FORMAT_INVALID");
  }
  if (Object.keys(envelope || {}).sort().join(",") !== "payload,signature") throw new Error("INVITE_ENVELOPE_INVALID");
  const payload = envelope.payload;
  if (!payload || typeof payload !== "object" || typeof envelope.signature !== "string") throw new Error("INVITE_FORMAT_INVALID");
  const expectedFields = ["expiresAt","inviterFingerprint","inviterPublicKeySpki","issuedAt","nonce","origin","roomId","v"].sort().join(",");
  if (Object.keys(payload).sort().join(",") !== expectedFields) throw new Error("INVITE_FIELDS_INVALID");
  if (payload.v !== 1 || payload.origin !== expectedOrigin || payload.roomId !== expectedRoomId) {
    throw new Error("INVITE_ORIGIN_OR_ROOM_INVALID");
  }
  if (!Number.isSafeInteger(payload.issuedAt) || !Number.isSafeInteger(payload.expiresAt) ||
      payload.expiresAt <= now - INVITE_CLOCK_SKEW_TOLERANCE_MS ||
      payload.issuedAt > now + INVITE_CLOCK_SKEW_TOLERANCE_MS ||
      payload.expiresAt - payload.issuedAt > INVITE_TTL_MS || payload.issuedAt > payload.expiresAt) {
    throw new Error("INVITE_EXPIRED_OR_TIME_INVALID");
  }
  decodeBase64url(payload.roomId, 24);
  decodeBase64url(payload.nonce, 24);
  if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(payload.inviterFingerprint)) throw new Error("INVITE_FINGERPRINT_INVALID");
  const spki = decodeBase64url(payload.inviterPublicKeySpki);
  const digest = await crypto.subtle.digest("SHA-256", spki);
  if (toFingerprint(digest) !== payload.inviterFingerprint) throw new Error("INVITE_FINGERPRINT_MISMATCH");
  if (!await verifyEcdsa(payload.inviterPublicKeySpki, envelope.signature, payload)) {
    throw new Error("INVITE_SIGNATURE_INVALID");
  }
  return payload;
}

export function handshakePayload({ origin, roomId, inviteNonce, role, fingerprint, publicKeySpki, challenge, challengeExpiresAt }) {
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

export async function verifyHandshake(hello, attachment, room, now = Date.now()) {
  if (!hello || typeof hello !== "object" || hello.type !== "hello" ||
      typeof hello.fingerprint !== "string" || typeof hello.publicKeySpki !== "string" ||
      typeof hello.signature !== "string" || hello.inviteNonce !== room.inviteNonce) {
    throw new Error("HELLO_FIELDS_INVALID");
  }
  if (attachment.challengeExpiresAt <= now) throw new Error("HELLO_CHALLENGE_EXPIRED");
  if (attachment.origin !== room.origin || attachment.roomId !== room.roomId || !["host", "guest"].includes(attachment.role)) throw new Error("HELLO_ROOM_BINDING_INVALID");
  const digest = await crypto.subtle.digest("SHA-256", decodeBase64url(hello.publicKeySpki));
  if (toFingerprint(digest) !== hello.fingerprint) throw new Error("HELLO_FINGERPRINT_MISMATCH");
  const signed = handshakePayload({
    origin: attachment.origin,
    roomId: attachment.roomId,
    inviteNonce: room.inviteNonce,
    role: attachment.role,
    fingerprint: hello.fingerprint,
    publicKeySpki: hello.publicKeySpki,
    challenge: attachment.challenge,
    challengeExpiresAt: attachment.challengeExpiresAt
  });
  if (!await verifyEcdsa(hello.publicKeySpki, hello.signature, signed)) throw new Error("HELLO_SIGNATURE_INVALID");
  if (attachment.role === "host") {
    if (hello.fingerprint !== room.hostFingerprint || hello.publicKeySpki !== room.hostPublicKeySpki) {
      throw new Error("HELLO_HOST_IDENTITY_MISMATCH");
    }
  } else {
    if (hello.fingerprint === room.hostFingerprint) throw new Error("HELLO_SELF_PAIRING_FORBIDDEN");
    if (room.guestFingerprint && (hello.fingerprint !== room.guestFingerprint || hello.publicKeySpki !== room.guestPublicKeySpki)) {
      throw new Error("HELLO_GUEST_IDENTITY_MISMATCH");
    }
  }
  return { fingerprint: hello.fingerprint, publicKeySpki: hello.publicKeySpki, proof: { payload: signed, signature: hello.signature } };
}

export function validateSignalMessage(raw, now = Date.now()) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
    throw new Error("SIGNAL_MESSAGE_TOO_LARGE");
  }
  let message;
  try { message = JSON.parse(raw); } catch (_) { throw new Error("SIGNAL_JSON_INVALID"); }
  if (!message || typeof message !== "object" || Array.isArray(message) ||
      Object.keys(message).sort().join(",") !== "payload,sentAt,type" ||
      !ALLOWED_MESSAGES.has(message.type) ||
      !Number.isSafeInteger(message.sentAt) || Math.abs(now - message.sentAt) > 30_000 ||
      !message.payload || typeof message.payload !== "object" || Array.isArray(message.payload)) {
    throw new Error("SIGNAL_MESSAGE_INVALID");
  }
  if (message.type === "ice-candidate") {
    if (typeof message.payload.candidate !== "string" ||
        new TextEncoder().encode(message.payload.candidate).length > MAX_ICE_BYTES) {
      throw new Error("ICE_CANDIDATE_INVALID");
    }
  }
  if (message.type === "offer" || message.type === "answer") {
    if (typeof message.payload.sdp !== "string" || message.payload.sdp.length > MAX_SDP_CHARS) {
      throw new Error("SDP_PAYLOAD_INVALID");
    }
  }
  if (message.type === "call-invite" && !["audio", "video"].includes(message.payload.mode)) {
    throw new Error("CALL_MODE_INVALID");
  }
  if (message.type === "profile-metadata") {
    const name = message.payload.displayName;
    if (name !== undefined && (typeof name !== "string" || name.length > 64 || /[\u0000-\u001F\u007F]/.test(name))) {
      throw new Error("PROFILE_METADATA_INVALID");
    }
    if (Object.keys(message.payload).some(key => key !== "displayName")) throw new Error("PROFILE_METADATA_FIELDS_INVALID");
  }
  return message;
}

function randomBase64url(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function safeSend(ws, value) {
  try {
    if (ws.readyState === 1) ws.send(JSON.stringify(value));
  } catch (_) {}
}

function safeClose(ws, code = 1008, reason = "connection rejected") {
  try {
    if (ws.readyState === 0 || ws.readyState === 1) ws.close(code, reason.slice(0, 120));
  } catch (_) {}
}

function rejectWithDiagnostic(ws, stage, code, reason) {
  safeSend(ws, { type: "server-error", stage, code });
  safeClose(ws, 1008, reason);
}

function safeDiagnosticCode(error) {
  const message = String(error?.message || "");
  if (/^INVITE_/.test(message)) return "INVITE_REJECTED";
  if (/^(HELLO_|BASE64URL_|CANONICAL_)/.test(message)) return "IDENTITY_PROOF_REJECTED";
  if (/^(ROOM_|ROLE_|PEER_)/.test(message)) return "ROOM_STATE_REJECTED";
  return "INTERNAL_ERROR";
}

export function isSameAuthenticatedDevice(state, role, verified) {
  return state?.state === "AUTHENTICATED" &&
    state.role === role &&
    state.fingerprint === verified?.fingerprint &&
    state.publicKeySpki === verified?.publicKeySpki;
}

export class EzeroConnectRoom {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
    // Durable Objects can interleave event handlers across awaits. Serialize
    // socket admission and handshake verification so a single-use guest
    // identity cannot be claimed by two simultaneous first connections.
    this.operationQueue = Promise.resolve();
  }

  enqueueOperation(operation) {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.catch(() => {});
    return result;
  }

  async scheduleAlarm(roomExpiresAt) {
    const pending = await this.ctx.storage.get("pendingChallenges") || {};
    const deadlines = Object.values(pending).filter(value => Number.isSafeInteger(value) && value > Date.now());
    if (Number.isSafeInteger(roomExpiresAt) && roomExpiresAt > Date.now()) deadlines.push(roomExpiresAt);
    if (deadlines.length) await this.ctx.storage.setAlarm(Math.min(...deadlines));
    else await this.ctx.storage.deleteAlarm();
  }

  async removePendingChallenge(challenge, roomExpiresAt) {
    const pending = await this.ctx.storage.get("pendingChallenges") || {};
    delete pending[challenge];
    if (Object.keys(pending).length) await this.ctx.storage.put("pendingChallenges", pending);
    else await this.ctx.storage.delete("pendingChallenges");
    await this.scheduleAlarm(roomExpiresAt);
  }

  fetch(request) {
    return this.enqueueOperation(() => this.processFetch(request));
  }

  async processFetch(request) {
    const url = new URL(request.url);
    const roomId = url.pathname.split("/").pop() || "";
    const role = url.searchParams.get("role");
    const origin = request.headers.get("Origin");
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    if (!this.env.PUBLIC_ORIGIN || origin !== this.env.PUBLIC_ORIGIN) return new Response("Origin rejected", { status: 403 });
    if (!/^[A-Za-z0-9_-]{32}$/.test(roomId) || !["host", "guest"].includes(role)) {
      return new Response("Room or role invalid", { status: 400 });
    }
    const now = Date.now();
    // Allow bounded parallel pending handshakes. A single abandoned socket
    // must not lock this role out; only an authenticated device identity may
    // claim the role. Expired pending sockets are cleaned by the alarm.
    const pendingForRole = this.ctx.getWebSockets().filter(ws => {
      const state = ws.deserializeAttachment();
      return ws.readyState === 1 && state?.state === "PENDING" &&
        state.role === role && state.challengeExpiresAt > now;
    });
    if (pendingForRole.length >= MAX_PENDING_PER_ROLE) {
      return new Response("Too many pending handshakes", { status: 429 });
    }
    const challenge = randomBase64url(32);
    const challengeExpiresAt = now + CHALLENGE_TTL_MS;
    const pendingChallenges = await this.ctx.storage.get("pendingChallenges") || {};
    pendingChallenges[challenge] = challengeExpiresAt;
    await this.ctx.storage.put("pendingChallenges", pendingChallenges);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      state: "PENDING",
      roomId,
      role,
      origin,
      challenge,
      challengeExpiresAt,
      messageTimes: []
    });
    const existingRoom = await this.ctx.storage.get("room");
    await this.scheduleAlarm(existingRoom?.expiresAt);
    safeSend(server, { type: "challenge", roomId, role, challenge, challengeExpiresAt });
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws, raw) {
    return this.enqueueOperation(() => this.processWebSocketMessage(ws, raw));
  }

  async processWebSocketMessage(ws, raw) {
    let diagnosticStage = "admission";
    try {
      if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
        safeClose(ws, 1009, "message too large");
        return;
      }
      let parsed;
      try { parsed = JSON.parse(raw); } catch (_) { safeClose(ws, 1007, "invalid JSON"); return; }
      const attachment = ws.deserializeAttachment();
      if (!attachment) { safeClose(ws); return; }
      diagnosticStage = attachment.state === "PENDING" ? "handshake" : "relay";

      if (attachment.state === "PENDING") {
        const helloKeys = Object.keys(parsed || {}).sort().join(",");
        if (!parsed || typeof parsed !== "object" ||
            !["fingerprint,inviteCode,inviteNonce,publicKeySpki,signature,type", "fingerprint,inviteNonce,publicKeySpki,signature,type"].includes(helloKeys) ||
            parsed.type !== "hello" || typeof parsed.inviteNonce !== "string") {
          rejectWithDiagnostic(ws, "handshake", "IDENTITY_PROOF_REJECTED", "hello required");
          return;
        }
        let room = await this.ctx.storage.get("room");
        const now = Date.now();
        if (!room) {
          if (typeof parsed.inviteCode !== "string") { rejectWithDiagnostic(ws, "handshake", "INVITE_REJECTED", "signed invite required"); return; }
          const invite = await verifyInviteCode(parsed.inviteCode, this.env.PUBLIC_ORIGIN, attachment.roomId, now);
          if (parsed.inviteNonce !== invite.nonce) { rejectWithDiagnostic(ws, "handshake", "INVITE_REJECTED", "invite nonce mismatch"); return; }
          const expiresAt = now + ROOM_TTL_MS;
          if (expiresAt <= now) { safeClose(ws, 1008, "room expired"); return; }
          room = {
            v: 1,
            roomId: attachment.roomId,
            origin: invite.origin,
            inviteNonce: invite.nonce,
            inviteExpiresAt: invite.expiresAt,
            hostFingerprint: invite.inviterFingerprint,
            hostPublicKeySpki: invite.inviterPublicKeySpki,
            guestFingerprint: null,
            guestPublicKeySpki: null,
            createdAt: now,
            expiresAt
          };
        } else if (room.roomId !== attachment.roomId || room.origin !== attachment.origin ||
                   room.inviteNonce !== parsed.inviteNonce || room.expiresAt <= now) {
          rejectWithDiagnostic(ws, "handshake", "ROOM_STATE_REJECTED", "room state mismatch or expired");
          return;
        }
        if (attachment.role === "guest" && !room.guestFingerprint &&
            room.inviteExpiresAt <= now - INVITE_CLOCK_SKEW_TOLERANCE_MS) {
          rejectWithDiagnostic(ws, "handshake", "INVITE_REJECTED", "invite expired before guest joined");
          return;
        }
        const verified = await verifyHandshake(parsed, attachment, room, now);
        const activeSameRole = this.ctx.getWebSockets().filter(other => {
          if (other === ws || other.readyState !== 1) return false;
          const state = other.deserializeAttachment();
          return state?.state === "AUTHENTICATED" && state.role === attachment.role;
        });
        // A different device must never take over an authenticated role. The
        // same cryptographically verified device may replace its stale socket
        // after refresh, network recovery, or an interrupted pairing attempt.
        if (activeSameRole.some(other =>
          !isSameAuthenticatedDevice(other.deserializeAttachment(), attachment.role, verified)
        )) {
          rejectWithDiagnostic(ws, "handshake", "ROOM_STATE_REJECTED", "role belongs to another device");
          return;
        }
        if (attachment.role === "guest") {
          room.guestFingerprint = verified.fingerprint;
          room.guestPublicKeySpki = verified.publicKeySpki;
          room.guestHandshake = verified.proof;
        } else {
          room.hostHandshake = verified.proof;
        }
        await this.ctx.storage.put("room", room);
        await this.removePendingChallenge(attachment.challenge, room.expiresAt);
        attachment.state = "AUTHENTICATED";
        attachment.fingerprint = verified.fingerprint;
        attachment.publicKeySpki = verified.publicKeySpki;
        attachment.inviteNonce = room.inviteNonce;
        attachment.expiresAt = room.expiresAt;
        attachment.messageTimes = [];
        ws.serializeAttachment(attachment);
        // Publish the replacement as authenticated before closing old sockets,
        // so their close callbacks cannot report a false peer-disconnected event.
        for (const previous of activeSameRole) {
          safeClose(previous, 4001, "replaced by authenticated same-device reconnect");
        }
        safeSend(ws, { type: "hello-accepted", role: attachment.role, roomId: room.roomId, expiresAt: room.expiresAt });
        await this.notifyPeerReady();
        return;
      }

      if (attachment.state !== "AUTHENTICATED") { safeClose(ws); return; }
      const room = await this.ctx.storage.get("room");
      if (!room || room.expiresAt <= Date.now() || room.inviteNonce !== attachment.inviteNonce) {
        safeClose(ws, 1008, "room expired");
        return;
      }
      const roleRecord = attachment.role === "host"
        ? { fingerprint: room.hostFingerprint, publicKeySpki: room.hostPublicKeySpki }
        : { fingerprint: room.guestFingerprint, publicKeySpki: room.guestPublicKeySpki };
      if (!roleRecord.fingerprint || roleRecord.fingerprint !== attachment.fingerprint ||
          roleRecord.publicKeySpki !== attachment.publicKeySpki) {
        safeClose(ws, 1008, "role identity mismatch");
        return;
      }

      const message = validateSignalMessage(raw);
      const now = Date.now();
      const recent = (attachment.messageTimes || []).filter(time => now - time < 1000);
      if (recent.length >= 20) {
        safeSend(ws, { type: "rate-limited" });
        return;
      }
      recent.push(now);
      attachment.messageTimes = recent;
      ws.serializeAttachment(attachment);

      const peer = this.ctx.getWebSockets().find(other => {
        if (other === ws || other.readyState !== 1) return false;
        const state = other.deserializeAttachment();
        return state?.state === "AUTHENTICATED" && state.role !== attachment.role;
      });
      if (!peer) {
        safeSend(ws, { type: "peer-not-connected" });
        return;
      }
      safeSend(peer, { type: "relay", fromFingerprint: attachment.fingerprint, message });
      if (message.type === "hangup" || message.type === "trust-decline") {
        await this.closeRoom(message.type);
      }
    } catch (error) {
      safeSend(ws, {
        type: "server-error",
        stage: diagnosticStage,
        code: safeDiagnosticCode(error)
      });
      safeClose(ws, 1011, "signaling failure");
    }
  }

  async notifyPeerReady() {
    const sockets = this.ctx.getWebSockets();
    const host = sockets.find(ws => ws.readyState === 1 && ws.deserializeAttachment()?.state === "AUTHENTICATED" && ws.deserializeAttachment()?.role === "host");
    const guest = sockets.find(ws => ws.readyState === 1 && ws.deserializeAttachment()?.state === "AUTHENTICATED" && ws.deserializeAttachment()?.role === "guest");
    if (!host || !guest) {
      for (const ws of sockets) {
        const state = ws.deserializeAttachment();
        if (state?.state === "AUTHENTICATED") safeSend(ws, { type: "waiting-for-peer" });
      }
      return;
    }
    const room = await this.ctx.storage.get("room");
    const h = host.deserializeAttachment();
    const g = guest.deserializeAttachment();
    safeSend(host, {
      type: "peer-ready",
      peerFingerprint: g.fingerprint,
      peerPublicKeySpki: g.publicKeySpki,
      peerHandshake: room?.guestHandshake || null
    });
    safeSend(guest, {
      type: "peer-ready",
      peerFingerprint: h.fingerprint,
      peerPublicKeySpki: h.publicKeySpki,
      peerHandshake: room?.hostHandshake || null
    });
  }

  async closeRoom(reason = "closed") {
    for (const ws of this.ctx.getWebSockets()) {
      safeSend(ws, { type: "room-closed", reason });
      safeClose(ws, 1000, "room closed");
    }
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
  }

  async webSocketClose(ws, code, reason) {
    const attachment = ws.deserializeAttachment();
    if (attachment?.state === "PENDING") {
      const room = await this.ctx.storage.get("room");
      await this.removePendingChallenge(attachment.challenge, room?.expiresAt);
    }
    if (attachment?.state === "AUTHENTICATED") {
      const replacementExists = this.ctx.getWebSockets().some(other => {
        if (other === ws || other.readyState !== 1) return false;
        return isSameAuthenticatedDevice(other.deserializeAttachment(), attachment.role, attachment);
      });
      if (!replacementExists) {
        const peer = this.ctx.getWebSockets().find(other => {
          if (other === ws || other.readyState !== 1) return false;
          const state = other.deserializeAttachment();
          return state?.state === "AUTHENTICATED" && state.role !== attachment.role;
        });
        if (peer) safeSend(peer, { type: "peer-disconnected", role: attachment.role });
      }
    }
    if (code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code)) {
      try { ws.close(code, reason); } catch (_) {}
    }
  }

  async webSocketError(ws) {
    safeClose(ws, 1011, "websocket error");
  }

  async alarm() {
    const now = Date.now();
    const pending = await this.ctx.storage.get("pendingChallenges") || {};
    for (const [challenge, expiresAt] of Object.entries(pending)) {
      if (expiresAt <= now) {
        const ws = this.ctx.getWebSockets().find(socket => socket.deserializeAttachment()?.challenge === challenge);
        if (ws) safeClose(ws, 1008, "handshake challenge expired");
        delete pending[challenge];
      }
    }
    if (Object.keys(pending).length) await this.ctx.storage.put("pendingChallenges", pending);
    else await this.ctx.storage.delete("pendingChallenges");
    const room = await this.ctx.storage.get("room");
    if (room && room.expiresAt <= now) {
      await this.closeRoom("expired");
      return;
    }
    await this.scheduleAlarm(room?.expiresAt);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return new Response(JSON.stringify({ service: "ezero-connect-signal", status: "ok", release: "staging" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
      });
    }
    if (!env.PUBLIC_ORIGIN || request.headers.get("Origin") !== env.PUBLIC_ORIGIN) {
      return new Response("Origin rejected", { status: 403 });
    }
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    const rendezvousMatch = url.pathname.match(/^\/v1\/rendezvous\/([a-f0-9]{64})$/);
    if (rendezvousMatch) {
      const rendezvousId = env.RENDEZVOUS.idFromName(rendezvousMatch[1]);
      return env.RENDEZVOUS.get(rendezvousId).fetch(request);
    }
    const match = url.pathname.match(/^\/v1\/rooms\/([A-Za-z0-9_-]{32})$/);
    if (!match || !["host", "guest"].includes(url.searchParams.get("role"))) {
      return new Response("Not found", { status: 404 });
    }
    const id = env.ROOMS.idFromName(match[1]);
    return env.ROOMS.get(id).fetch(request);
  }
};
