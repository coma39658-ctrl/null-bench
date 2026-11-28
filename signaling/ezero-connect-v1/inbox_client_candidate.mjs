import { verifyCallInvite } from "./inbox_protocol.mjs";

/*
 * E-ZERO Trusted Inbox V1 browser transport candidate.
 * Foreground-only and deliberately not imported by the public page.
 * No auto-answer, persistence, push, or background wake behavior.
 */
const FP = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;
const PROTOCOL = "E-ZERO-INBOX-HELLO-1";

export function canonicalInboxJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalInboxJson).join(",") + "]";
  if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonicalInboxJson(value[k])).join(",") + "}";
  }
  throw new Error("INBOX_CANONICAL_INVALID");
}

function decodeB64url(value) {
  if (typeof value !== "string" || !B64URL.test(value)) throw new Error("INBOX_BASE64_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("INBOX_BASE64_INVALID"); }
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function encodeB64url(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fingerprintFromBytes(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}

function exactKeys(value, expected) {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}

export class EzeroTrustedInboxClient {
  constructor({ websocketOrigin, origin, identityProvider, WebSocketImpl = globalThis.WebSocket, onEvent = () => {} }) {
    let wsUrl, pageUrl;
    try {
      wsUrl = new URL(websocketOrigin);
      pageUrl = new URL(origin);
    } catch (_) {
      throw new Error("INBOX_ORIGIN_INVALID");
    }
    if (typeof websocketOrigin !== "string" || wsUrl.protocol !== "wss:" ||
        !wsUrl.hostname || wsUrl.username || wsUrl.password ||
        (wsUrl.port && wsUrl.port !== "443") || wsUrl.pathname !== "/" ||
        wsUrl.search || wsUrl.hash || websocketOrigin !== wsUrl.origin) {
      throw new Error("INBOX_WSS_ORIGIN_INVALID");
    }
    if (typeof origin !== "string" || pageUrl.protocol !== "https:" ||
        !pageUrl.hostname || pageUrl.username || pageUrl.password ||
        pageUrl.pathname !== "/" || pageUrl.search || pageUrl.hash ||
        origin !== pageUrl.origin) throw new Error("INBOX_ORIGIN_INVALID");
    if (typeof identityProvider !== "function" || typeof WebSocketImpl !== "function") throw new Error("INBOX_DEPENDENCY_MISSING");
    this.websocketOrigin = websocketOrigin;
    this.origin = origin;
    this.identityProvider = identityProvider;
    this.WebSocketImpl = WebSocketImpl;
    this.onEvent = onEvent;
    this.socket = null;
    this.identity = null;
    this.targetFingerprint = null;
    this.pending = new Map();
  }

  async loadIdentity() {
    const row = await this.identityProvider();
    if (!row?.keys?.privateKey || row.keys.privateKey.extractable !== false ||
        row.keys.privateKey.algorithm?.name !== "ECDSA" ||
        row.keys.privateKey.algorithm?.namedCurve !== "P-256" ||
        typeof row.spki !== "string" || typeof row.fingerprint !== "string" ||
        !/^[a-f0-9]{64}$/.test(row.fingerprint)) throw new Error("INBOX_DEVICE_IDENTITY_INVALID");
    const spki = decodeB64url(row.spki);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
    const fingerprint = Array.from(digest, b => b.toString(16).padStart(2, "0")).join("");
    if (fingerprint !== row.fingerprint) throw new Error("INBOX_DEVICE_IDENTITY_MISMATCH");
    this.identity = { ...row, fingerprintColon: fingerprintFromBytes(digest) };
    return this.identity;
  }

  async openInbox(targetFingerprint) {
    if (!FP.test(targetFingerprint || "")) throw new Error("INBOX_TARGET_INVALID");
    if (this.socket && this.socket.readyState <= 1) throw new Error("INBOX_ALREADY_OPEN");
    const identity = await this.loadIdentity();
    const ws = new this.WebSocketImpl(this.websocketOrigin + "/v1/inbox/" + targetFingerprint);
    this.socket = ws;
    this.targetFingerprint = targetFingerprint;
    return new Promise((resolve, reject) => {
      let settled = false;
      let authenticated = false;
      const timeout = setTimeout(() => fail("INBOX_HANDSHAKE_TIMEOUT"), 15000);
      const finish = () => { clearTimeout(timeout); };
      const fail = code => {
        if (!settled) { settled = true; finish(); reject(new Error(code)); }
        try { ws.close(1008, code); } catch (_) {}
      };
      ws.addEventListener("message", async event => {
        if (typeof event.data !== "string" || event.data.length > 12000) return fail("INBOX_MESSAGE_INVALID");
        let message;
        try { message = JSON.parse(event.data); } catch (_) { return fail("INBOX_JSON_INVALID"); }
        if (!authenticated) {
          if (!exactKeys(message, ["type", "payload"]) || message.type !== "challenge" ||
              !exactKeys(message.payload, ["v", "protocol", "origin", "inboxFingerprint", "challenge", "challengeExpiresAt"])) {
            return fail("INBOX_CHALLENGE_SCHEMA_INVALID");
          }
          const p = message.payload;
          const now = Date.now();
          let challengeBytes;
          try {
            challengeBytes = decodeB64url(p.challenge);
          } catch (_) {
            return fail("INBOX_CHALLENGE_ENCODING_INVALID");
          }
          if (p.v !== 1 || p.protocol !== PROTOCOL || p.origin !== this.origin ||
              p.inboxFingerprint !== targetFingerprint || typeof p.challenge !== "string" ||
              !B64URL.test(p.challenge) || challengeBytes.length !== 32 ||
              !Number.isSafeInteger(p.challengeExpiresAt) ||
              p.challengeExpiresAt <= now || p.challengeExpiresAt > now + 30000) {
            return fail("INBOX_CHALLENGE_INVALID");
          }
          const signedPayload = {
            v: 1, protocol: PROTOCOL, origin: this.origin,
            fingerprint: identity.fingerprintColon,
            inboxFingerprint: targetFingerprint,
            challenge: p.challenge, challengeExpiresAt: p.challengeExpiresAt
          };
          try {
            const signature = await crypto.subtle.sign(
              { name: "ECDSA", hash: "SHA-256" }, identity.keys.privateKey,
              new TextEncoder().encode(canonicalInboxJson(signedPayload))
            );
            if (ws.readyState !== 1) return fail("INBOX_SOCKET_CLOSED");
            ws.send(JSON.stringify({
              type: "hello", fingerprint: identity.fingerprintColon,
              publicKeySpki: identity.spki, signature: encodeB64url(signature)
            }));
            authenticated = true;
          } catch (_) { fail("INBOX_HELLO_SIGN_FAILED"); }
          return;
        }
        if (!settled) {
          if (!exactKeys(message, ["type", "fingerprint"]) || message.type !== "inbox-ready" ||
              message.fingerprint !== identity.fingerprintColon) return fail("INBOX_READY_INVALID");
          settled = true;
          finish();
          resolve(this);
          this.onEvent({ type: "inbox-online", fingerprint: identity.fingerprintColon });
          return;
        }
        await this.handleAuthenticatedMessage(message, fail);
      });
      ws.addEventListener("close", () => {
        if (!settled) { settled = true; finish(); reject(new Error("INBOX_SOCKET_CLOSED")); }
        if (this.socket === ws) this.socket = null;
        this.onEvent({ type: "inbox-offline" });
      });
      ws.addEventListener("error", () => { if (!settled) fail("INBOX_SOCKET_ERROR"); });
    });
  }

  async handleAuthenticatedMessage(message, fail) {
    if (!message || typeof message !== "object" || Array.isArray(message) || typeof message.type !== "string") {
      return fail("INBOX_FRAME_INVALID");
    }
    const schemas = {
      "incoming-call": ["type", "inviteCode"],
      "invite-routed": ["type", "callId", "expiresAt"],
      "call-response": ["type", "callId", "decision"],
      "unavailable": ["type", "callId"],
      "busy": ["type"],
      "friendship-not-authorized": ["type", "callId"],
      "replay-rejected": ["type", "callId"],
      "call-expired": ["type", "callId"],
      "call-room-invite": ["type", "callId", "inviteCode"],
      "call-room-routed": ["type", "callId"],
      "call-room-unavailable": ["type", "callId"],
      "call-cancelled": ["type", "callId"],
      "peer-inbox-disconnected": ["type", "callId"]
    };
    const expected = schemas[message.type];
    if (!expected || !exactKeys(message, expected)) return fail("INBOX_FRAME_SCHEMA_INVALID");
    const validCallId = value => typeof value === "string" && /^[A-Za-z0-9_-]{32}$/.test(value);
    if (["invite-routed", "call-response", "unavailable", "friendship-not-authorized",
         "replay-rejected", "call-expired", "call-room-invite", "call-room-routed",
         "call-room-unavailable", "call-cancelled"].includes(message.type) &&
        !validCallId(message.callId)) return fail("INBOX_FRAME_VALUE_INVALID");
    if (message.type === "invite-routed" &&
        (!Number.isSafeInteger(message.expiresAt) || message.expiresAt <= Date.now())) {
      return fail("INBOX_FRAME_VALUE_INVALID");
    }
    if (message.type === "call-response" && !["accept", "decline"].includes(message.decision)) return fail("INBOX_RESPONSE_INVALID");
    if (message.type === "call-room-invite" &&
        (typeof message.inviteCode !== "string" || !message.inviteCode.startsWith("EZERO1.") || message.inviteCode.length > 8192)) {
      return fail("INBOX_ROOM_INVITE_INVALID");
    }
    if (message.type === "peer-inbox-disconnected" &&
        message.callId !== null && !validCallId(message.callId)) return fail("INBOX_FRAME_VALUE_INVALID");
    if (message.type === "incoming-call") {
      try {
        const invite = await verifyCallInvite(message.inviteCode, this.origin, this.identity.fingerprintColon);
        if (invite.recipientFingerprint !== this.identity.fingerprintColon) return fail("INBOX_INCOMING_RECIPIENT_MISMATCH");
        this.onEvent({ type: "incoming-call", inviteCode: message.inviteCode, invite });
      } catch (_) {
        return fail("INBOX_INCOMING_INVITE_INVALID");
      }
      return;
    }
    this.onEvent({ ...message });
  }

  sendExact(message, keys) {
    if (!this.socket || this.socket.readyState !== 1 || !exactKeys(message, keys)) throw new Error("INBOX_NOT_CONNECTED_OR_BAD_FRAME");
    this.socket.send(JSON.stringify(message));
  }

  async sendCallInvite(inviteCode) {
    if (!this.identity || !this.targetFingerprint || typeof inviteCode !== "string" ||
        !inviteCode.startsWith("EZERO-CALL1.") || inviteCode.length > 8192) {
      throw new Error("INBOX_SIGNED_INVITE_REQUIRED");
    }
    const invite = await verifyCallInvite(inviteCode, this.origin, this.targetFingerprint);
    if (invite.callerFingerprint !== this.identity.fingerprintColon ||
        invite.recipientFingerprint !== this.targetFingerprint) throw new Error("INBOX_CALL_INVITE_IDENTITY_MISMATCH");
    this.sendExact({ type: "call-invite", inviteCode }, ["type", "inviteCode"]);
    return invite;
  }

  respondToCall(callId, decision) {
    if (typeof callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(callId) ||
        !["accept", "decline"].includes(decision)) throw new Error("INBOX_RESPONSE_INVALID");
    this.sendExact({ type: "call-response", callId, decision }, ["type", "callId", "decision"]);
  }

  sendRoomInvite(callId, inviteCode) {
    if (typeof callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(callId) ||
        typeof inviteCode !== "string" || !inviteCode.startsWith("EZERO1.") || inviteCode.length > 8192) {
      throw new Error("INBOX_ROOM_INVITE_INVALID");
    }
    this.sendExact({ type: "call-room-invite", callId, inviteCode }, ["type", "callId", "inviteCode"]);
  }

  cancelCall(callId) {
    if (typeof callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(callId)) throw new Error("INBOX_CALL_ID_INVALID");
    this.sendExact({ type: "call-cancel", callId }, ["type", "callId"]);
  }

  close() {
    const ws = this.socket;
    this.socket = null;
    try { ws?.close(1000, "user closed inbox"); } catch (_) {}
  }
}
