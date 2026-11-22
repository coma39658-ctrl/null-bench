const encoder = new TextEncoder();
const PROTOCOL = "E-ZERO-E2E-DATA-1";
const MAX_FRAME_BYTES = 256 * 1024;
const encoderOptions = { name: "ECDH", namedCurve: "P-256" };

function fail(code) { throw new Error(code); }
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  return fail("E2E_CANONICAL_VALUE_INVALID");
}
function b64u(bytes) { return Buffer.from(bytes).toString("base64url"); }
function fromB64u(value, max = 2048) {
  if (typeof value !== "string" || value.length > max || !/^[A-Za-z0-9_-]+$/.test(value)) fail("E2E_ENCODING_INVALID");
  return new Uint8Array(Buffer.from(value, "base64url"));
}
function validFingerprint(value) { return typeof value === "string" && /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value); }
async function fingerprint(spki) {
  const digest = await crypto.subtle.digest("SHA-256", spki);
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
async function sha256(bytes) { return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)); }
function validateTrust(trust, relationshipId, localIdentity) {
  if (!trust || trust.status !== "TRUSTED" || trust.relationshipId !== relationshipId ||
      !validFingerprint(trust.remoteFingerprint) || !trust.remotePublicKeySpki) fail("E2E_RELATIONSHIP_NOT_TRUSTED");
  if (!localIdentity || !validFingerprint(localIdentity.fingerprint) ||
      localIdentity.fingerprint === trust.remoteFingerprint) fail("E2E_LOCAL_IDENTITY_INVALID");
}
async function verifySignature(publicKeySpki, payload, signature) {
  const raw = fromB64u(publicKeySpki, 1024);
  if (await fingerprint(raw) === "") fail("E2E_REMOTE_KEY_INVALID");
  const key = await crypto.subtle.importKey("spki", raw, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const sig = fromB64u(signature, 256);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, encoder.encode(canonical(payload)));
  if (!ok) fail("E2E_HANDSHAKE_SIGNATURE_INVALID");
}
async function makeEphemeral() {
  const pair = await crypto.subtle.generateKey(encoderOptions, false, ["deriveBits"]);
  const publicKey = await crypto.subtle.exportKey("raw", pair.publicKey);
  return { privateKey: pair.privateKey, publicKey: b64u(publicKey) };
}
function validateHello(payload, role, relationshipId, sessionId) {
  if (!payload || payload.v !== 1 || payload.protocol !== PROTOCOL ||
      payload.role !== role || payload.relationshipId !== relationshipId ||
      payload.sessionId !== sessionId || !validFingerprint(payload.fingerprint) ||
      typeof payload.ephemeralPublicKey !== "string" || typeof payload.nonce !== "string" ||
      fromB64u(payload.ephemeralPublicKey, 128).length !== 65 ||
      fromB64u(payload.nonce, 64).length !== 32) fail("E2E_HANDSHAKE_FIELDS_INVALID");
}
async function deriveKeys(privateKey, remoteEphemeral, transcript, role) {
  const remote = await crypto.subtle.importKey("raw", fromB64u(remoteEphemeral, 128), encoderOptions, false, []);
  const shared = await crypto.subtle.deriveBits({ name: "ECDH", public: remote }, privateKey, 256);
  const salt = await sha256(encoder.encode(canonical(transcript)));
  const material = await crypto.subtle.importKey("raw", shared, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({
    name: "HKDF", hash: "SHA-256", salt,
    info: encoder.encode(PROTOCOL + "|directional-keys")
  }, material, 512);
  const bytes = new Uint8Array(bits);
  const first = await crypto.subtle.importKey("raw", bytes.slice(0, 32), "AES-GCM", false, ["encrypt", "decrypt"]);
  const second = await crypto.subtle.importKey("raw", bytes.slice(32), "AES-GCM", false, ["encrypt", "decrypt"]);
  return role === "initiator" ? { sendKey: first, receiveKey: second, sendRole: role, receiveRole: "responder" } :
    { sendKey: second, receiveKey: first, sendRole: role, receiveRole: "initiator" };
}
async function createSessionOffer({ relationshipId, sessionId, trust, identity, signCanonical }) {
  validateTrust(trust, relationshipId, identity);
  if (typeof signCanonical !== "function" || typeof sessionId !== "string" || !/^[A-Za-z0-9_-]{22,64}$/.test(sessionId)) fail("E2E_SESSION_INPUT_INVALID");
  const ephemeral = await makeEphemeral();
  const payload = {
    v: 1, protocol: PROTOCOL, relationshipId, sessionId, role: "initiator",
    fingerprint: identity.fingerprint, ephemeralPublicKey: ephemeral.publicKey,
    nonce: b64u(crypto.getRandomValues(new Uint8Array(32)))
  };
  const signature = await signCanonical(payload);
  return { hello: { payload, signature }, privateKey: ephemeral.privateKey, trust, identity, relationshipId, sessionId };
}
async function acceptSessionOffer({ hello, relationshipId, sessionId, trust, identity, signCanonical }) {
  validateTrust(trust, relationshipId, identity);
  if (typeof signCanonical !== "function") fail("E2E_SIGNER_REQUIRED");
  validateHello(hello?.payload, "initiator", relationshipId, sessionId);
  if (hello.payload.fingerprint !== trust.remoteFingerprint) fail("E2E_REMOTE_IDENTITY_MISMATCH");
  await verifySignature(trust.remotePublicKeySpki, hello.payload, hello.signature);
  const ephemeral = await makeEphemeral();
  const payload = {
    v: 1, protocol: PROTOCOL, relationshipId, sessionId, role: "responder",
    fingerprint: identity.fingerprint, ephemeralPublicKey: ephemeral.publicKey,
    nonce: b64u(crypto.getRandomValues(new Uint8Array(32))),
    offerHash: b64u(await sha256(encoder.encode(canonical(hello.payload))))
  };
  const signature = await signCanonical(payload);
  const transcript = [hello.payload, payload];
  const keys = await deriveKeys(ephemeral.privateKey, hello.payload.ephemeralPublicKey, transcript, "responder");
  return { response: { payload, signature }, keys, relationshipId, sessionId };
}
async function finishSessionOffer({ pending, response }) {
  if (!pending || !pending.privateKey || !pending.trust) fail("E2E_PENDING_SESSION_INVALID");
  validateHello(response?.payload, "responder", pending.relationshipId, pending.sessionId);
  if (response.payload.fingerprint !== pending.trust.remoteFingerprint) fail("E2E_REMOTE_IDENTITY_MISMATCH");
  const expectedHash = b64u(await sha256(encoder.encode(canonical(pending.hello.payload))));
  if (response.payload.offerHash !== expectedHash) fail("E2E_OFFER_BINDING_INVALID");
  await verifySignature(pending.trust.remotePublicKeySpki, response.payload, response.signature);
  const transcript = [pending.hello.payload, response.payload];
  const keys = await deriveKeys(pending.privateKey, response.payload.ephemeralPublicKey, transcript, "initiator");
  return { keys, relationshipId: pending.relationshipId, sessionId: pending.sessionId };
}
function createSecureChannel({ keys, relationshipId, sessionId, role }) {
  if (!keys?.sendKey || !keys?.receiveKey || !["initiator", "responder"].includes(role)) fail("E2E_CHANNEL_KEYS_INVALID");
  let sendSequence = 0;
  let receiveSequence = 0;
  let closed = false;
  async function encrypt(type, bytes) {
    if (closed) fail("E2E_CHANNEL_CLOSED");
    if (!["text", "voice", "ack"].includes(type)) fail("E2E_FRAME_TYPE_INVALID");
    const plaintext = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (!plaintext.length || plaintext.length > MAX_FRAME_BYTES) fail("E2E_FRAME_SIZE_INVALID");
    const sequence = ++sendSequence;
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const metadata = { v: 1, protocol: PROTOCOL, relationshipId, sessionId, sender: role, recipient: role === "initiator" ? "responder" : "initiator", sequence, type };
    const aad = encoder.encode(canonical(metadata));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, additionalData: aad, tagLength: 128 }, keys.sendKey, plaintext);
    return Object.freeze({ metadata, nonce: b64u(nonce), ciphertext: b64u(ciphertext) });
  }
  async function decrypt(frame) {
    if (closed) fail("E2E_CHANNEL_CLOSED");
    const m = frame?.metadata;
    if (!m || m.v !== 1 || m.protocol !== PROTOCOL || m.relationshipId !== relationshipId ||
        m.sessionId !== sessionId || m.sender !== (role === "initiator" ? "responder" : "initiator") ||
        m.recipient !== role || !Number.isSafeInteger(m.sequence) || m.sequence !== receiveSequence + 1 ||
        !["text", "voice", "ack"].includes(m.type)) fail("E2E_FRAME_REPLAY_OR_CONTEXT_INVALID");
    const nonce = fromB64u(frame.nonce, 32);
    const ciphertext = fromB64u(frame.ciphertext, MAX_FRAME_BYTES * 2);
    if (nonce.length !== 12 || ciphertext.length < 17 || ciphertext.length > MAX_FRAME_BYTES + 16) fail("E2E_FRAME_SIZE_INVALID");
    let plaintext;
    try {
      plaintext = await crypto.subtle.decrypt({
        name: "AES-GCM", iv: nonce, additionalData: encoder.encode(canonical(m)), tagLength: 128
      }, keys.receiveKey, ciphertext);
    } catch (_) { fail("E2E_CIPHERTEXT_AUTHENTICATION_FAILED"); }
    receiveSequence = m.sequence;
    return Object.freeze({ type: m.type, sequence: m.sequence, bytes: new Uint8Array(plaintext) });
  }
  return Object.freeze({ encrypt, decrypt, close() { closed = true; } });
}
export { PROTOCOL, MAX_FRAME_BYTES, createSessionOffer, acceptSessionOffer, finishSessionOffer, createSecureChannel };
