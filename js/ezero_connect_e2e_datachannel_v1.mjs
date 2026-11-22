import {
  createSessionOffer, acceptSessionOffer, finishSessionOffer, createSecureChannel, MAX_FRAME_BYTES
} from "./ezero_connect_e2e_crypto_v1.mjs";

const MAX_WIRE_CHARS = 700_000;
const ACK_TIMEOUT_MS = 30_000;
const MAX_PAYLOAD_BYTES = Math.floor((MAX_FRAME_BYTES - 1024) * 3 / 4);
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function fail(code) { throw new Error(code); }
function b64u(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}
function fromB64u(value) {
  if (typeof value !== "string" || value.length > Math.ceil(MAX_FRAME_BYTES * 4 / 3) + 8 ||
      !/^[A-Za-z0-9_-]+$/.test(value)) fail("E2E_DATA_PAYLOAD_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  return Uint8Array.from(atob(padded), c => c.charCodeAt(0));
}
function randomId() { return b64u(crypto.getRandomValues(new Uint8Array(18))); }
function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}
function assertReliableOrdered(channel) {
  if (!channel || channel.ordered !== true ||
      (channel.maxRetransmits !== null && channel.maxRetransmits !== undefined) ||
      (channel.maxPacketLifeTime !== null && channel.maxPacketLifeTime !== undefined)) {
    fail("E2E_DATA_CHANNEL_MUST_BE_RELIABLE_ORDERED");
  }
  if (typeof channel.send !== "function" || typeof channel.addEventListener !== "function") {
    fail("E2E_DATA_CHANNEL_API_INVALID");
  }
}
function safeSend(channel, value) {
  const wire = JSON.stringify(value);
  if (wire.length > MAX_WIRE_CHARS) fail("E2E_WIRE_FRAME_TOO_LARGE");
  if (channel.readyState !== "open") fail("E2E_DATA_CHANNEL_NOT_OPEN");
  channel.send(wire);
}

export function createE2EDataChannelSession({
  channel, role, relationshipId, trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY, onMessage, onState
}) {
  assertReliableOrdered(channel);
  if (!["initiator", "responder"].includes(role) ||
      typeof relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(relationshipId) ||
      !trustApi?.getTrustedContact || !identityApi?.getPublicIdentity || !identityApi?.signCanonical ||
      typeof onMessage !== "function") fail("E2E_DATA_SESSION_INPUT_INVALID");

  let closed = false;
  let started = false;
  let secureChannel = null;
  let pendingOffer = null;
  let readyResolve, readyReject;
  const ready = new Promise((resolve, reject) => { readyResolve = resolve; readyReject = reject; });
  const pendingAcks = new Map();

  function state(value, detail) {
    try { onState?.(value, detail); } catch (_) {}
  }
  function rejectPending(error) {
    for (const entry of pendingAcks.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    pendingAcks.clear();
  }
  function terminate(error) {
    if (closed) return;
    closed = true;
    secureChannel?.close();
    rejectPending(error || new Error("E2E_DATA_SESSION_CLOSED"));
    readyReject(error || new Error("E2E_DATA_SESSION_CLOSED"));
    state("closed", error?.message || "E2E_DATA_SESSION_CLOSED");
  }
  function sendFrame(frame) {
    safeSend(channel, { kind: "e2e-frame", frame });
  }
  async function establishResponder(hello) {
    if (role !== "responder" || secureChannel) fail("E2E_HANDSHAKE_ROLE_OR_STATE_INVALID");
    if (!exactKeys(hello, ["payload", "signature"]) ||
        hello.payload?.relationshipId !== relationshipId ||
        typeof hello.payload.sessionId !== "string") fail("E2E_HANDSHAKE_MESSAGE_INVALID");
    const [trust, identity] = await Promise.all([
      trustApi.getTrustedContact(relationshipId), identityApi.getPublicIdentity()
    ]);
    const accepted = await acceptSessionOffer({
      hello, relationshipId, sessionId: hello.payload.sessionId, trust, identity,
      signCanonical: value => identityApi.signCanonical(value)
    });
    safeSend(channel, { kind: "e2e-response", response: accepted.response });
    secureChannel = createSecureChannel({
      keys: accepted.keys, relationshipId, sessionId: accepted.sessionId, role: "responder"
    });
    state("secure");
    readyResolve();
  }
  async function establishInitiator(response) {
    if (role !== "initiator" || !pendingOffer || secureChannel) fail("E2E_HANDSHAKE_ROLE_OR_STATE_INVALID");
    const finished = await finishSessionOffer({ pending: pendingOffer, response });
    pendingOffer = null;
    secureChannel = createSecureChannel({
      keys: finished.keys, relationshipId, sessionId: finished.sessionId, role: "initiator"
    });
    state("secure");
    readyResolve();
  }
  async function receiveFrame(frame) {
    if (!secureChannel) fail("E2E_DATA_BEFORE_SECURE_HANDSHAKE");
    const opened = await secureChannel.decrypt(frame);
    if (opened.type === "ack") {
      let ack;
      try { ack = JSON.parse(decoder.decode(opened.bytes)); } catch (_) { fail("E2E_ACK_INVALID"); }
      if (!exactKeys(ack, ["messageId"]) || typeof ack.messageId !== "string") fail("E2E_ACK_INVALID");
      const pending = pendingAcks.get(ack.messageId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingAcks.delete(ack.messageId);
        pending.resolve({ status: "DELIVERED", messageId: ack.messageId });
      }
      return;
    }
    let envelope;
    try { envelope = JSON.parse(decoder.decode(opened.bytes)); } catch (_) { fail("E2E_DATA_ENVELOPE_INVALID"); }
    if (!exactKeys(envelope, ["messageId", "payload"]) ||
        typeof envelope.messageId !== "string" || typeof envelope.payload !== "string") fail("E2E_DATA_ENVELOPE_INVALID");
    const bytes = fromB64u(envelope.payload);
    if (!bytes.length || bytes.length > MAX_FRAME_BYTES || (opened.type === "profile" && bytes.length > 140 * 1024)) fail("E2E_DATA_PAYLOAD_SIZE_INVALID");
    await onMessage(Object.freeze({ type: opened.type, messageId: envelope.messageId, bytes }));
    const ack = encoder.encode(JSON.stringify({ messageId: envelope.messageId }));
    sendFrame(await secureChannel.encrypt("ack", ack));
  }
  async function onData(event) {
    if (closed) return;
    try {
      if (typeof event.data !== "string" || event.data.length > MAX_WIRE_CHARS) fail("E2E_WIRE_MESSAGE_INVALID");
      let message;
      try { message = JSON.parse(event.data); } catch (_) { fail("E2E_WIRE_JSON_INVALID"); }
      if (message?.kind === "e2e-hello" && exactKeys(message, ["kind", "hello"])) {
        await establishResponder(message.hello);
      } else if (message?.kind === "e2e-response" && exactKeys(message, ["kind", "response"])) {
        await establishInitiator(message.response);
      } else if (message?.kind === "e2e-frame" && exactKeys(message, ["kind", "frame"])) {
        await receiveFrame(message.frame);
      } else {
        fail("E2E_WIRE_KIND_INVALID");
      }
    } catch (error) {
      terminate(error);
      try { channel.close(); } catch (_) {}
    }
  }
  async function start() {
    if (closed || started) fail("E2E_DATA_SESSION_ALREADY_STARTED_OR_CLOSED");
    if (role !== "initiator") fail("E2E_ONLY_INITIATOR_STARTS_HANDSHAKE");
    started = true;
    try {
      if (channel.readyState !== "open") await new Promise((resolve, reject) => {
        const onOpen = () => { cleanup(); resolve(); };
        const onClose = () => { cleanup(); reject(new Error("E2E_DATA_CHANNEL_CLOSED_BEFORE_OPEN")); };
        const cleanup = () => {
          channel.removeEventListener("open", onOpen);
          channel.removeEventListener("close", onClose);
        };
        channel.addEventListener("open", onOpen, { once: true });
        channel.addEventListener("close", onClose, { once: true });
      });
      if (closed) fail("E2E_DATA_SESSION_CLOSED");
      const [trust, identity] = await Promise.all([
        trustApi.getTrustedContact(relationshipId), identityApi.getPublicIdentity()
      ]);
      const sessionId = randomId();
      pendingOffer = await createSessionOffer({
        relationshipId, sessionId, trust, identity,
        signCanonical: value => identityApi.signCanonical(value)
      });
      safeSend(channel, { kind: "e2e-hello", hello: pendingOffer.hello });
      state("handshaking");
    } catch (error) {
      terminate(error);
      throw error;
    }
    return ready;
  }
  async function send(type, bytes) {
    if (closed || !secureChannel) fail("E2E_DATA_SESSION_NOT_READY");
    if (!["text", "voice", "profile"].includes(type)) fail("E2E_DATA_TYPE_INVALID");
    const payload = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!payload.length || payload.length > MAX_PAYLOAD_BYTES || (type === "profile" && payload.length > 140 * 1024)) fail("E2E_DATA_PAYLOAD_SIZE_INVALID");
    const messageId = randomId();
    const envelope = encoder.encode(JSON.stringify({ messageId, payload: b64u(payload) }));
    const frame = await secureChannel.encrypt(type, envelope);
    const delivery = new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingAcks.delete(messageId);
        reject(new Error("E2E_DELIVERY_ACK_TIMEOUT"));
      }, ACK_TIMEOUT_MS);
      pendingAcks.set(messageId, { resolve, reject, timer });
    });
    try { sendFrame(frame); } catch (error) {
      const pending = pendingAcks.get(messageId);
      if (pending) { clearTimeout(pending.timer); pendingAcks.delete(messageId); pending.reject(error); }
      throw error;
    }
    return delivery;
  }
  function close() {
    if (closed) return;
    terminate(new Error("E2E_DATA_SESSION_CLOSED"));
    try { channel.close(); } catch (_) {}
  }

  channel.addEventListener("message", onData);
  channel.addEventListener("close", () => terminate(new Error("E2E_DATA_CHANNEL_CLOSED")));
  channel.addEventListener("error", () => terminate(new Error("E2E_DATA_CHANNEL_ERROR")));
  state("waiting");
  return Object.freeze({ start, ready, send, close, get isSecure() { return !!secureChannel && !closed; } });
}
