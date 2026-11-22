import { createE2EDataChannelSession } from "./ezero_connect_e2e_datachannel_v1.mjs";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export function createMessagingController({
  trustApi = globalThis.EZERO_CONNECT_TRUST,
  identityApi = globalThis.EZERO_CONNECT_IDENTITY,
  onState = () => {}
} = {}) {
  if (!trustApi?.getTrustedContact || !identityApi?.getPublicIdentity || !identityApi?.signCanonical) {
    throw new Error("E2E_MESSAGING_IDENTITY_OR_TRUST_API_UNAVAILABLE");
  }
  let active = null;
  const subscribers = new Set();

  function emitState(state, detail = {}) {
    try { onState(Object.freeze({ state, ...detail })); } catch (_) {}
  }
  async function attach({ relationshipId, channel, role }) {
    const trust = await trustApi.getTrustedContact(relationshipId);
    if (!trust || trust.status !== "TRUSTED" || trust.relationshipId !== relationshipId) {
      throw new Error("E2E_MESSAGING_FRIEND_NOT_TRUSTED");
    }
    if (active) active.session.close();
    const record = { relationshipId, session: null };
    const session = createE2EDataChannelSession({
      channel, role, relationshipId, trustApi, identityApi,
      onState: (state, detail) => {
        if (active === record) emitState(state, { relationshipId, detail });
      },
      onMessage: async message => {
        if (active !== record) throw new Error("E2E_MESSAGING_SESSION_REPLACED");
        const delivered = Object.freeze({
          relationshipId,
          messageId: message.messageId,
          type: message.type,
          bytes: message.bytes
        });
        if (!subscribers.size) throw new Error("E2E_MESSAGING_NO_RECEIVER");
        for (const subscriber of [...subscribers]) await subscriber(delivered);
      }
    });
    record.session = session;
    active = record;
    emitState("connecting", { relationshipId });
    if (role === "initiator") await session.start();
    else await session.ready;
    if (active !== record || !session.isSecure) throw new Error("E2E_MESSAGING_SECURE_SESSION_NOT_ESTABLISHED");
    emitState("secure", { relationshipId });
    return Object.freeze({ relationshipId, isSecure: true });
  }
  async function sendText(text) {
    if (typeof text !== "string" || !text.trim() || text.length > 8000) {
      throw new Error("E2E_MESSAGING_TEXT_INVALID");
    }
    if (!active?.session.isSecure) throw new Error("E2E_MESSAGING_NOT_CONNECTED");
    const result = await active.session.send("text", encoder.encode(text));
    return result;
  }
  async function sendVoice(bytes) {
    if (!(bytes instanceof Uint8Array) || !bytes.length) throw new Error("E2E_MESSAGING_VOICE_INVALID");
    if (!active?.session.isSecure) throw new Error("E2E_MESSAGING_NOT_CONNECTED");
    return active.session.send("voice", bytes);
  }
  async function sendProfile(bytes) {\n    if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 140 * 1024) throw new Error("E2E_MESSAGING_PROFILE_INVALID");\n    if (!active?.session.isSecure) throw new Error("E2E_MESSAGING_NOT_CONNECTED");\n    return active.session.send("profile", bytes);\n  }\n  function subscribe(handler) {
    if (typeof handler !== "function") throw new Error("E2E_MESSAGING_SUBSCRIBER_INVALID");
    subscribers.add(handler);
    return () => subscribers.delete(handler);
  }
  function close() {
    const current = active;
    active = null;
    current?.session.close();
    if (current) emitState("closed", { relationshipId: current.relationshipId });
  }
  return Object.freeze({
    attach, sendText, sendVoice, sendProfile, subscribe, close,
    get state() { return active?.session.isSecure ? "secure" : active ? "connecting" : "disconnected"; },
    get relationshipId() { return active?.relationshipId || null; }
  });
}
