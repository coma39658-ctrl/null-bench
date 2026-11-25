const CHALLENGE_TTL_MS = 30_000;
const SESSION_TTL_MS = 120_000;
const MAX_PENDING_CALL_TTL_MS = 120_000;
const MAX_MESSAGE_BYTES = 16 * 1024;
const MAX_SDP_CHARS = 12 * 1024;
const MAX_ICE_BYTES = 2 * 1024;
const ALLOWED = new Set(["offer", "answer", "ice-candidate", "call-invite", "call-accept", "call-decline", "call-offer", "call-answer", "call-ice-candidate", "call-hangup", "hangup"]);

export function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new Error("RENDEZVOUS_CANONICAL_INVALID");
}

function decode(value, expectedBytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("RENDEZVOUS_ENCODING_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let bytes;
  try { bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0)); }
  catch (_) { throw new Error("RENDEZVOUS_ENCODING_INVALID"); }
  if (expectedBytes && bytes.length !== expectedBytes) throw new Error("RENDEZVOUS_LENGTH_INVALID");
  return bytes;
}

async function hashHex(text) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

async function verifySignature(spki, signature, value) {
  const key = await crypto.subtle.importKey("spki", decode(spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, decode(signature, 64), new TextEncoder().encode(canonical(value)));
}

export async function verifyReconnectProof(proof, expectedRelationshipId, challenge, challengeExpiresAt, now = Date.now()) {
  if (!proof || Object.keys(proof).sort().join(",") !== "approvals,payload,signature,transcript") {
    throw new Error("RENDEZVOUS_PROOF_SHAPE_INVALID");
  }
  const p = proof.payload, t = proof.transcript;
  if (!p || Object.keys(p).sort().join(",") !== "challenge,challengeExpiresAt,issuedAt,localFingerprint,protocol,relationshipId,remoteFingerprint,transcriptHash,v" ||
      p.v !== 1 || p.protocol !== "E-ZERO-TRUSTED-RECONNECT-1" ||
      p.relationshipId !== expectedRelationshipId || p.challenge !== challenge ||
      p.challengeExpiresAt !== challengeExpiresAt || !Number.isSafeInteger(p.issuedAt) ||
      p.issuedAt > now + 5_000 || p.issuedAt < now - CHALLENGE_TTL_MS ||
      challengeExpiresAt <= now || challengeExpiresAt > now + CHALLENGE_TTL_MS) {
    throw new Error("RENDEZVOUS_PROOF_BINDING_INVALID");
  }
  if (!t || t.v !== 1 || t.protocol !== "E-ZERO-TRUST-1" || t.purpose !== "mutual-contact-save" ||
      !Array.isArray(t.participants) || t.participants.length !== 2) {
    throw new Error("RENDEZVOUS_TRANSCRIPT_INVALID");
  }
  if (!/^[A-F0-9:]{95}$/.test(p.localFingerprint) || !/^[A-F0-9:]{95}$/.test(p.remoteFingerprint) ||
      !/^[A-Za-z0-9_-]{32}$/.test(t.roomId || "") || !/^[A-Za-z0-9_-]{32}$/.test(t.inviteNonce || "") ||
      !Number.isSafeInteger(t.inviteIssuedAt) || !Number.isSafeInteger(t.inviteExpiresAt) ||
      !Number.isSafeInteger(t.createdAt) || t.createdAt < t.inviteIssuedAt || t.createdAt > t.inviteExpiresAt ||
      !(t.participants[0].fingerprint < t.participants[1].fingerprint)) {
    throw new Error("RENDEZVOUS_TRANSCRIPT_FIELDS_INVALID");
  }
  for (const participant of t.participants) {
    if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(participant.fingerprint) || typeof participant.publicKeySpki !== "string") {
      throw new Error("RENDEZVOUS_PARTICIPANT_INVALID");
    }
    const digest = await crypto.subtle.digest("SHA-256", decode(participant.publicKeySpki));
    const fingerprint = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
    if (fingerprint !== participant.fingerprint) throw new Error("RENDEZVOUS_PARTICIPANT_KEY_MISMATCH");
  }
  const transcriptHash = await hashHex(canonical(t));
  const relationshipId = await hashHex(canonical(t));
  if (transcriptHash !== p.transcriptHash || relationshipId !== expectedRelationshipId) {
    throw new Error("RENDEZVOUS_TRANSCRIPT_BINDING_INVALID");
  }
  const local = t.participants.find(x => x.fingerprint === p.localFingerprint);
  const remote = t.participants.find(x => x.fingerprint === p.remoteFingerprint);
  if (!local || !remote || local === remote || !local.publicKeySpki || !remote.publicKeySpki) {
    throw new Error("RENDEZVOUS_PARTICIPANT_INVALID");
  }
  if (!Array.isArray(proof.approvals) || proof.approvals.length !== 2) throw new Error("RENDEZVOUS_APPROVALS_REQUIRED");
  const signers = new Set();
  for (const approval of proof.approvals) {
    if (!approval || signers.has(approval.signerFingerprint)) throw new Error("RENDEZVOUS_APPROVAL_DUPLICATE");
    const participant = t.participants.find(x => x.fingerprint === approval.signerFingerprint);
    if (!participant || approval.transcriptHash !== transcriptHash ||
        !await verifySignature(participant.publicKeySpki, approval.signature, t)) {
      throw new Error("RENDEZVOUS_APPROVAL_INVALID");
    }
    signers.add(approval.signerFingerprint);
  }
  if (!signers.has(p.localFingerprint) || !signers.has(p.remoteFingerprint) ||
      !await verifySignature(local.publicKeySpki, proof.signature, p)) {
    throw new Error("RENDEZVOUS_IDENTITY_SIGNATURE_INVALID");
  }
  return Object.freeze({ localFingerprint: p.localFingerprint, remoteFingerprint: p.remoteFingerprint });
}

function send(ws, value) {
  try { if (ws.readyState === 1) ws.send(JSON.stringify(value)); } catch (_) {}
}
function close(ws, code = 1008, reason = "rejected") {
  try { if (ws.readyState === 0 || ws.readyState === 1) ws.close(code, reason.slice(0, 100)); } catch (_) {}
}

export function validateRelay(raw, now = Date.now()) {
  if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) throw new Error("RENDEZVOUS_MESSAGE_TOO_LARGE");
  const m = JSON.parse(raw);
  if (!m || Object.keys(m).sort().join(",") !== "payload,sentAt,type" ||
      !ALLOWED.has(m.type) || !Number.isSafeInteger(m.sentAt) || Math.abs(now - m.sentAt) > 30_000 ||
      !m.payload || typeof m.payload !== "object" || Array.isArray(m.payload)) throw new Error("RENDEZVOUS_MESSAGE_INVALID");
  if (m.type === "call-offer" || m.type === "call-answer") {
    if (Object.keys(m.payload).sort().join(",") !== "callId,sdp" ||
        typeof m.payload.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(m.payload.callId) ||
        typeof m.payload.sdp !== "string" || m.payload.sdp.length === 0 || m.payload.sdp.length > MAX_SDP_CHARS) throw new Error("RENDEZVOUS_CALL_SDP_INVALID");
  } else if (m.type === "call-ice-candidate") {
    if (Object.keys(m.payload).sort().join(",") !== "callId,candidate" ||
        typeof m.payload.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(m.payload.callId) ||
        typeof m.payload.candidate !== "string" || new TextEncoder().encode(m.payload.candidate).length > MAX_ICE_BYTES) throw new Error("RENDEZVOUS_CALL_ICE_INVALID");
  } else if (m.type === "call-hangup") {
    if (Object.keys(m.payload).join(",") !== "callId" || typeof m.payload.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(m.payload.callId)) throw new Error("RENDEZVOUS_CALL_HANGUP_INVALID");
  } else if (m.type === "offer" || m.type === "answer") {
    if (Object.keys(m.payload).sort().join(",") !== "sdp" ||
        typeof m.payload.sdp !== "string" || m.payload.sdp.length > MAX_SDP_CHARS) throw new Error("RENDEZVOUS_SDP_INVALID");
  } else if (m.type === "ice-candidate") {
    if (Object.keys(m.payload).sort().join(",") !== "candidate" ||
        typeof m.payload.candidate !== "string" ||
        new TextEncoder().encode(m.payload.candidate).length > MAX_ICE_BYTES) throw new Error("RENDEZVOUS_ICE_INVALID");
  } else if (m.type === "call-invite") {
    if (Object.keys(m.payload).sort().join(",") !== "callId,expiresAt,mode" ||
        typeof m.payload.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(m.payload.callId) ||
        !["audio", "video"].includes(m.payload.mode) ||
        !Number.isSafeInteger(m.payload.expiresAt) ||
        m.payload.expiresAt <= now || m.payload.expiresAt > m.sentAt + MAX_PENDING_CALL_TTL_MS ||
        m.payload.expiresAt <= m.sentAt) throw new Error("RENDEZVOUS_CALL_INVITE_INVALID");
  } else if (m.type === "call-accept" || m.type === "call-decline") {
    if (Object.keys(m.payload).join(",") !== "callId" ||
        typeof m.payload.callId !== "string" || !/^[A-Za-z0-9_-]{32}$/.test(m.payload.callId)) {
      throw new Error("RENDEZVOUS_CALL_RESPONSE_INVALID");
    }
  } else if (Object.keys(m.payload).length !== 0) throw new Error("RENDEZVOUS_HANGUP_INVALID");
  return m;
}

export class EzeroConnectRendezvous {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; }

  async fetch(request) {
    const url = new URL(request.url);
    const relationshipId = url.pathname.split("/").pop() || "";
    if (request.method !== "GET" || request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("WebSocket upgrade required", { status: 426 });
    }
    if (request.headers.get("Origin") !== this.env.PUBLIC_ORIGIN) return new Response("Origin rejected", { status: 403 });
    if (!/^[a-f0-9]{64}$/.test(relationshipId)) return new Response("Relationship invalid", { status: 400 });
    if (this.ctx.getWebSockets().length >= 4) return new Response("Rendezvous capacity reached", { status: 429 });
    const now = Date.now();
    const challenge = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
    const challengeExpiresAt = now + CHALLENGE_TTL_MS;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ state: "PENDING", relationshipId, challenge, challengeExpiresAt, messageTimes: [] });
    await this.scheduleAlarm();
    send(server, { type: "challenge", challenge, challengeExpiresAt });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws, raw) {
    try {
      if (typeof raw !== "string" || new TextEncoder().encode(raw).length > MAX_MESSAGE_BYTES) return close(ws, 1009, "message too large");
      const state = ws.deserializeAttachment();
      if (!state) return close(ws);
      if (state.state === "PENDING") {
        let envelope;
        try { envelope = JSON.parse(raw); } catch (_) { return close(ws, 1007, "invalid proof"); }
        if (!envelope || Object.keys(envelope).sort().join(",") !== "proof,type" || envelope.type !== "proof") return close(ws, 1008, "proof required");
        const identity = await verifyReconnectProof(envelope.proof, state.relationshipId, state.challenge, state.challengeExpiresAt);
        const duplicate = this.ctx.getWebSockets().some(other => {
          if (other === ws || other.readyState !== 1) return false;
          const a = other.deserializeAttachment();
          return a?.state === "AUTHENTICATED" && a.localFingerprint === identity.localFingerprint;
        });
        if (duplicate) return close(ws, 1008, "device already connected");
        state.state = "AUTHENTICATED";
        state.localFingerprint = identity.localFingerprint;
        state.remoteFingerprint = identity.remoteFingerprint;
        state.expiresAt = Date.now() + SESSION_TTL_MS;
        state.messageTimes = [];
        ws.serializeAttachment(state);
        await this.scheduleAlarm();
        send(ws, { type: "authenticated", expiresAt: state.expiresAt });
        await this.notifyReady();
        return;
      }
      if (state.state !== "AUTHENTICATED" || state.expiresAt <= Date.now()) return close(ws, 1008, "session expired");
      const message = validateRelay(raw);
      const now = Date.now();
      const recent = (state.messageTimes || []).filter(t => now - t < 1000);
      if (recent.length >= 20) return send(ws, { type: "rate-limited" });
      recent.push(now); state.messageTimes = recent; ws.serializeAttachment(state);
      const peer = this.ctx.getWebSockets().find(other => {
        if (other === ws || other.readyState !== 1) return false;
        const a = other.deserializeAttachment();
        return a?.state === "AUTHENTICATED" && a.localFingerprint === state.remoteFingerprint &&
          a.remoteFingerprint === state.localFingerprint && a.expiresAt > now;
      });
      if (!peer) {
        if (message.type === "call-invite") {
          const existing = await this.ctx.storage.get("pendingCall");
          if (existing && existing.expiresAt > now && existing.callId !== message.payload.callId) {
            return send(ws, { type: "call-busy" });
          }
          await this.ctx.storage.put("pendingCall", {
            fromFingerprint: state.localFingerprint,
            toFingerprint: state.remoteFingerprint,
            callId: message.payload.callId,
            expiresAt: message.payload.expiresAt,
            message
          });
          await this.scheduleAlarm();
        } else if (["call-decline", "call-hangup", "hangup"].includes(message.type)) {
          const pending = await this.ctx.storage.get("pendingCall");
          if (pending?.fromFingerprint === state.localFingerprint &&
              (message.type === "hangup" || pending.callId === message.payload.callId)) {
            await this.ctx.storage.delete("pendingCall");
            await this.scheduleAlarm();
          }
        }
        return send(ws, { type: "peer-offline" });
      }
      if (["call-accept", "call-decline", "call-hangup"].includes(message.type)) {
        const pending = await this.ctx.storage.get("pendingCall");
        if (pending?.callId === message.payload.callId) await this.ctx.storage.delete("pendingCall");
      }
      send(peer, { type: "relay", fromFingerprint: state.localFingerprint, message });
      if (message.type === "hangup") {
        send(peer, { type: "session-ended" });
        close(ws, 1000, "session ended"); close(peer, 1000, "session ended");
      }
    } catch (_) { close(ws, 1008, "authentication or message rejected"); }
  }

  async notifyReady() {
    const sockets = this.ctx.getWebSockets().filter(ws => ws.readyState === 1 && ws.deserializeAttachment()?.state === "AUTHENTICATED");
    let pending = await this.ctx.storage.get("pendingCall");
    if (pending && pending.expiresAt <= Date.now()) {
      await this.ctx.storage.delete("pendingCall");
      pending = null;
    }
    for (const ws of sockets) {
      const state = ws.deserializeAttachment();
      const peer = sockets.find(other => {
        if (other === ws) return false;
        const a = other.deserializeAttachment();
        return a.localFingerprint === state.remoteFingerprint && a.remoteFingerprint === state.localFingerprint;
      });
      if (peer) {
        send(ws, { type: "peer-ready", peerFingerprint: state.remoteFingerprint });
        if (pending && pending.toFingerprint === state.localFingerprint && pending.expiresAt > Date.now()) {
          send(ws, { type: "relay", fromFingerprint: pending.fromFingerprint, message: pending.message });
          await this.ctx.storage.delete("pendingCall");
          pending = null;
        }
      } else send(ws, { type: "waiting-for-peer" });
    }
    await this.scheduleAlarm();
  }

  async webSocketClose(ws) {
    const state = ws.deserializeAttachment();
    if (state?.state === "AUTHENTICATED") {
      const pending = await this.ctx.storage.get("pendingCall");
      if (pending?.fromFingerprint === state.localFingerprint) await this.ctx.storage.delete("pendingCall");
      for (const peer of this.ctx.getWebSockets()) {
        const a = peer.deserializeAttachment();
        if (a?.state === "AUTHENTICATED" && a.localFingerprint === state.remoteFingerprint) send(peer, { type: "peer-disconnected" });
      }
    }
    await this.scheduleAlarm();
  }

  async scheduleAlarm() {
    const now = Date.now();
    const deadlines = [];
    for (const ws of this.ctx.getWebSockets()) {
      const state = ws.deserializeAttachment();
      const deadline = state?.state === "PENDING" ? state.challengeExpiresAt :
        state?.state === "AUTHENTICATED" ? state.expiresAt : null;
      if (Number.isSafeInteger(deadline) && deadline > now) deadlines.push(deadline);
    }
    const pending = await this.ctx.storage.get("pendingCall");
    if (pending && pending.expiresAt <= now) await this.ctx.storage.delete("pendingCall");
    else if (Number.isSafeInteger(pending?.expiresAt)) deadlines.push(pending.expiresAt);
    if (deadlines.length) await this.ctx.storage.setAlarm(Math.min(...deadlines));
    else await this.ctx.storage.deleteAlarm();
  }

  async alarm() {
    const now = Date.now();
    for (const ws of this.ctx.getWebSockets()) {
      const state = ws.deserializeAttachment();
      if (state?.state === "PENDING" && state.challengeExpiresAt <= now) close(ws, 1008, "challenge expired");
      if (state?.state === "AUTHENTICATED" && state.expiresAt <= now) close(ws, 1008, "session expired");
    }
    await this.scheduleAlarm();
  }
}

export const RENDEZVOUS_LIMITS = Object.freeze({ challengeTtlMs: CHALLENGE_TTL_MS, sessionTtlMs: SESSION_TTL_MS, maxMessageBytes: MAX_MESSAGE_BYTES });
