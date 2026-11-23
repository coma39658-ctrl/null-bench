import { verifyCallInvite } from "./inbox_protocol.mjs";

const FINGERPRINT_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const CHALLENGE_TTL_MS = 30_000;
const MAX_MESSAGE_BYTES = 10 * 1024;

function randomBase64url(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + canonical(value[key])).join(",") + "}";
  }
  throw new Error("INBOX_CANONICAL_INVALID");
}

function decodeBase64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("INBOX_BASE64_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("INBOX_BASE64_INVALID"); }
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

async function fingerprintFor(spki) {
  const digest = await crypto.subtle.digest("SHA-256", decodeBase64url(spki));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

async function verifyHello(spki, signature, payload) {
  const key = await crypto.subtle.importKey("spki", decodeBase64url(spki), { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" }, key, decodeBase64url(signature),
    new TextEncoder().encode(canonical(payload))
  );
}

function send(ws, value) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(value)); } catch (_) {}
}

function close(ws, code = 1008, reason = "inbox rejected") {
  try { if (ws.readyState === 0 || ws.readyState === 1) ws.close(code, reason.slice(0, 100)); } catch (_) {}
}

/**
 * Foreground-only, volatile inbox. It never stores call invitations or signaling
 * payloads in Durable Object storage; only WebSocket attachments hold routing
 * metadata while the sockets are connected.
 */
export class EzeroConnectInbox {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const inboxFingerprint = url.pathname.split("/").pop() || "";
    const origin = request.headers.get("Origin");
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    if (!this.env.PUBLIC_ORIGIN || origin !== this.env.PUBLIC_ORIGIN) return new Response("Origin rejected", { status: 403 });
    if (!FINGERPRINT_RE.test(inboxFingerprint)) return new Response("Inbox address invalid", { status: 400 });
    const now = Date.now();
    const pendingExists = this.ctx.getWebSockets().some(ws => {
      const a = ws.deserializeAttachment();
      return a?.state === "PENDING" && a.challengeExpiresAt > now;
    });
    if (pendingExists) return new Response("Inbox handshake already pending", { status: 409 });

    const challenge = randomBase64url(32);
    const challengeExpiresAt = now + CHALLENGE_TTL_MS;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ state: "PENDING", inboxFingerprint, origin, challenge, challengeExpiresAt });
    send(server, {
      type: "challenge",
      payload: { v: 1, protocol: "E-ZERO-INBOX-HELLO-1", origin, inboxFingerprint, challenge, challengeExpiresAt }
    });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    try {
      if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) {
        close(ws, 1009, "message too large"); return;
      }
      let message;
      try { message = JSON.parse(raw); } catch (_) { close(ws, 1007, "invalid JSON"); return; }
      const a = ws.deserializeAttachment();
      if (!a) { close(ws); return; }

      if (a.state === "PENDING") {
        if (!message || Object.keys(message).sort().join(",") !== "fingerprint,publicKeySpki,signature,type" ||
            message.type !== "hello" || typeof message.publicKeySpki !== "string" ||
            typeof message.signature !== "string" || !FINGERPRINT_RE.test(message.fingerprint) ||
            a.challengeExpiresAt <= Date.now()) {
          close(ws, 1008, "valid signed hello required"); return;
        }
        if (await fingerprintFor(message.publicKeySpki) !== a.inboxFingerprint) {
          close(ws, 1008, "inbox identity mismatch"); return;
        }
        const payload = {
          v: 1, protocol: "E-ZERO-INBOX-HELLO-1", origin: a.origin,
          fingerprint: message.fingerprint, inboxFingerprint: a.inboxFingerprint, challenge: a.challenge,
          challengeExpiresAt: a.challengeExpiresAt
        };
        if (!await verifyHello(message.publicKeySpki, message.signature, payload)) {
          close(ws, 1008, "inbox proof invalid"); return;
        }
        const alreadyOnline = this.ctx.getWebSockets().some(other => {
          if (other === ws || other.readyState !== 1) return false;
          const state = other.deserializeAttachment();\n          return state?.state === "AUTHENTICATED" && state.fingerprint === message.fingerprint;
        });
        if (alreadyOnline) { close(ws, 1008, "device inbox already connected"); return; }
        a.state = "AUTHENTICATED";
        a.fingerprint = message.fingerprint;
        a.publicKeySpki = message.publicKeySpki;
        a.pendingCallId = null;
        a.peerCallId = null;
        ws.serializeAttachment(a);
        send(ws, { type: "inbox-ready", fingerprint: a.fingerprint });
        return;
      }

      if (a.state !== "AUTHENTICATED") { close(ws); return; }
      if (message?.type === "call-invite" && Object.keys(message).sort().join(",") === "inviteCode,type") {
        if (a.pendingCallId) { send(ws, { type: "busy" }); return; }
        const invite = await verifyCallInvite(message.inviteCode, a.origin, a.inboxFingerprint);
        if (invite.callerFingerprint !== a.fingerprint) throw new Error("INBOX_CALLER_IDENTITY_MISMATCH");
        const recipient = this.ctx.getWebSockets().find(other => {
          if (other === ws || other.readyState !== 1) return false;
          const peer = other.deserializeAttachment();
          return peer?.state === "AUTHENTICATED" && peer.fingerprint === a.inboxFingerprint && !peer.peerCallId && !peer.pendingCallId;
        });
        if (!recipient) { send(ws, { type: "unavailable", callId: invite.callId }); return; }
        const recipientState = recipient.deserializeAttachment();
        a.pendingCallId = invite.callId;
        a.peerFingerprint = invite.recipientFingerprint;
        a.callExpiresAt = invite.expiresAt;
        recipientState.peerCallId = invite.callId;
        recipientState.peerFingerprint = invite.callerFingerprint;
        recipientState.callExpiresAt = invite.expiresAt;
        recipient.serializeAttachment(recipientState);
        ws.serializeAttachment(a);
        send(recipient, { type: "incoming-call", inviteCode: message.inviteCode });
        send(ws, { type: "invite-routed", callId: invite.callId, expiresAt: invite.expiresAt });
        return;
      }

      if (message?.type === "call-response" &&
          Object.keys(message).sort().join(",") === "callId,decision,type" &&
          typeof message.callId === "string" && ["accept", "decline"].includes(message.decision) &&
          a.peerCallId === message.callId && a.callExpiresAt > Date.now()) {
        const caller = this.ctx.getWebSockets().find(other => {
          if (other === ws || other.readyState !== 1) return false;
          const peer = other.deserializeAttachment();
          return peer?.state === "AUTHENTICATED" && peer.pendingCallId === message.callId &&
            peer.fingerprint === a.peerFingerprint;
        });
        if (!caller) { send(ws, { type: "call-expired", callId: message.callId }); return; }
        send(caller, { type: "call-response", callId: message.callId, decision: message.decision });
        const callerState = caller.deserializeAttachment();
        callerState.pendingCallId = null; callerState.peerFingerprint = null; callerState.callExpiresAt = null;
        caller.serializeAttachment(callerState);
        a.peerCallId = null; a.peerFingerprint = null; a.callExpiresAt = null;
        ws.serializeAttachment(a);
        return;
      }

      if (message?.type === "call-cancel" && Object.keys(message).sort().join(",") === "callId,type" &&
          typeof message.callId === "string" && a.pendingCallId === message.callId) {
        const peer = this.ctx.getWebSockets().find(other => {
          if (other === ws || other.readyState !== 1) return false;
          const state = other.deserializeAttachment();
          return state?.state === "AUTHENTICATED" && state.peerCallId === message.callId &&
            state.peerFingerprint === a.fingerprint;
        });
        if (peer) {
          const peerState = peer.deserializeAttachment();
          peerState.peerCallId = null; peerState.peerFingerprint = null; peerState.callExpiresAt = null;
          peer.serializeAttachment(peerState);
          send(peer, { type: "call-cancelled", callId: message.callId });
        }
        a.pendingCallId = null; a.peerFingerprint = null; a.callExpiresAt = null;
        ws.serializeAttachment(a);
        return;
      }
      close(ws, 1008, "message not allowed");
    } catch (_) {
      close(ws, 1008, "inbox message rejected");
    }
  }

  async webSocketClose(ws) {
    const a = ws.deserializeAttachment();
    if (a?.state !== "AUTHENTICATED") return;
    const other = this.ctx.getWebSockets().find(peer => {
      if (peer === ws || peer.readyState !== 1) return false;
      const state = peer.deserializeAttachment();
      return state?.state === "AUTHENTICATED" &&
        (state.peerCallId === a.pendingCallId || state.pendingCallId === a.peerCallId);
    });
    if (other) {
      const state = other.deserializeAttachment();
      const callId = state.peerCallId || state.pendingCallId;
      state.peerCallId = null; state.pendingCallId = null;
      state.peerFingerprint = null; state.callExpiresAt = null;
      other.serializeAttachment(state);
      send(other, { type: "peer-inbox-disconnected", callId: callId || null });
    }
  }

  async webSocketError(ws) {
    close(ws, 1011, "inbox socket error");
  }
}
