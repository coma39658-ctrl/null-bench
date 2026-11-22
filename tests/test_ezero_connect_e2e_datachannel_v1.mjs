import assert from "node:assert/strict";
import { createE2EDataChannelSession } from "../js/ezero_connect_e2e_datachannel_v1.mjs";

const enc = new TextEncoder();
const b64u = bytes => Buffer.from(bytes).toString("base64url");
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}
const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
async function device() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const fingerprint = hex(await crypto.subtle.digest("SHA-256", spki));
  return {
    identity: { fingerprint, publicKeySpki: b64u(spki) },
    signCanonical: value => crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, enc.encode(canonical(value))
    ).then(b64u)
  };
}
class FakeChannel extends EventTarget {
  constructor() {
    super();
    this.readyState = "open";
    this.ordered = true;
    this.maxRetransmits = null;
    this.maxPacketLifeTime = null;
    this.peer = null;
  }
  send(data) {
    if (this.readyState !== "open" || this.peer?.readyState !== "open") throw new Error("CHANNEL_NOT_OPEN");
    queueMicrotask(() => this.peer.dispatchEvent(new MessageEvent("message", { data })));
  }
  close() {
    if (this.readyState === "closed") return;
    this.readyState = "closed";
    this.dispatchEvent(new Event("close"));
  }
}
const a = await device(), b = await device();
const relationshipId = "a".repeat(64);
const trustA = { getTrustedContact: async id => {
  assert.equal(id, relationshipId);
  return { relationshipId, status: "TRUSTED", remoteFingerprint: b.identity.fingerprint, remotePublicKeySpki: b.identity.publicKeySpki };
} };
const trustB = { getTrustedContact: async id => {
  assert.equal(id, relationshipId);
  return { relationshipId, status: "TRUSTED", remoteFingerprint: a.identity.fingerprint, remotePublicKeySpki: a.identity.publicKeySpki };
} };
const identityA = { getPublicIdentity: async () => a.identity, signCanonical: a.signCanonical };
const identityB = { getPublicIdentity: async () => b.identity, signCanonical: b.signCanonical };
const chA = new FakeChannel(), chB = new FakeChannel();
chA.peer = chB; chB.peer = chA;
const received = [];
const sessionB = createE2EDataChannelSession({
  channel: chB, role: "responder", relationshipId, trustApi: trustB, identityApi: identityB,
  onMessage: async item => { received.push(item); }
});
const sessionA = createE2EDataChannelSession({
  channel: chA, role: "initiator", relationshipId, trustApi: trustA, identityApi: identityA,
  onMessage: async () => {}
});
await sessionA.start();
await sessionB.ready;
assert.equal(sessionA.isSecure, true);
assert.equal(sessionB.isSecure, true);
const text = enc.encode("Encrypted DataChannel text");
const delivered = await sessionA.send("text", text);
assert.equal(delivered.status, "DELIVERED");
assert.equal(received.length, 1);
assert.equal(received[0].type, "text");
assert.equal(new TextDecoder().decode(received[0].bytes), "Encrypted DataChannel text");
const voice = Uint8Array.from([0, 1, 2, 3, 254, 255]);
const voiceDelivered = await sessionA.send("voice", voice);
assert.equal(voiceDelivered.status, "DELIVERED");
assert.deepEqual([...received[1].bytes], [...voice]);
sessionA.close();
assert.equal(sessionA.isSecure, false);

const unordered = new FakeChannel();
unordered.ordered = false;
assert.throws(() => createE2EDataChannelSession({
  channel: unordered, role: "initiator", relationshipId, trustApi: trustA, identityApi: identityA, onMessage: async () => {}
}), /E2E_DATA_CHANNEL_MUST_BE_RELIABLE_ORDERED/);
console.log("EZERO_E2E_DATA_CHANNEL_HANDSHAKE_ENCRYPTED_TEXT_VOICE_ACK_RELIABLE_ORDER_PASS");
