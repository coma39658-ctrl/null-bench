(() => {
  "use strict";
  const PREFIX = "EZERO1.";
  const TTL_MS = 90_000;
  const MAX_CODE_CHARS = 8192;
  const DB_NAME = "ezero-connect-invite-replay";
  const DB_STORE = "used-nonces";
  const hostSessions = new Map();

  function base64url(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }

  function decodeBase64url(value, expectedBytes) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("INVITE_ENCODING_INVALID");
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
    let binary;
    try { binary = atob(padded); } catch (_) { throw new Error("INVITE_ENCODING_INVALID"); }
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    if (expectedBytes && bytes.length !== expectedBytes) throw new Error("INVITE_FIELD_LENGTH_INVALID");
    return bytes;
  }

  function stableCanonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
    }
    throw new Error("INVITE_PAYLOAD_INVALID");
  }

  async function digestHex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function secretProof(secret) {
    return digestHex(decodeBase64url(secret, 32));
  }

  function openReplayDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(DB_STORE)) {
          request.result.createObjectStore(DB_STORE, { keyPath: "nonce" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("INVITE_REPLAY_DB_FAILED"));
      request.onblocked = () => reject(new Error("INVITE_REPLAY_DB_BLOCKED"));
    });
  }

  async function consumeNonce(nonce, expiresAt, now) {
    const db = await openReplayDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      const store = tx.objectStore(DB_STORE);
      const get = store.get(nonce);
      let accepted = false;
      get.onsuccess = () => {
        const existing = get.result;
        if (!existing || existing.expiresAt <= now) {
          store.put({ nonce, expiresAt });
          accepted = true;
        }
      };
      tx.oncomplete = () => { db.close(); resolve(accepted); };
      tx.onerror = () => { db.close(); reject(new Error("INVITE_REPLAY_DB_FAILED")); };
      tx.onabort = () => { db.close(); reject(new Error("INVITE_REPLAY_DB_ABORTED")); };
    });
  }

  async function createInvite() {
    if (!globalThis.crypto?.subtle || !globalThis.isSecureContext) throw new Error("SECURE_CRYPTO_CONTEXT_REQUIRED");
    const identity = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    const roomId = base64url(crypto.getRandomValues(new Uint8Array(24)));
    const hostSecret = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const guestSecret = base64url(crypto.getRandomValues(new Uint8Array(32)));
    const nonce = base64url(crypto.getRandomValues(new Uint8Array(24)));
    const issuedAt = Date.now();
    const payload = {
      v: 1,
      origin: location.origin,
      inviterFingerprint: identity.fingerprint,
      inviterPublicKeySpki: identity.publicKeySpki,
      roomId,
      guestSecret,
      issuedAt,
      expiresAt: issuedAt + TTL_MS,
      nonce
    };
    const signature = await globalThis.EZERO_CONNECT_IDENTITY.signCanonical(payload);
    const envelope = { payload, signature };
    const inviteCode = PREFIX + base64url(new TextEncoder().encode(stableCanonical(envelope)));
    if (inviteCode.length > MAX_CODE_CHARS) throw new Error("INVITE_TOO_LARGE");
    hostSessions.set(roomId, {
      hostProof: await secretProof(hostSecret),
      guestProof: await secretProof(guestSecret),
      expiresAt: payload.expiresAt
    });
    return {
      inviteCode,
      roomId,
      expiresAt: payload.expiresAt,
      inviterFingerprint: identity.fingerprint
    };
  }

  async function verifyInvite(inviteCode, now = Date.now()) {
    if (typeof inviteCode !== "string" || inviteCode.length > MAX_CODE_CHARS || !inviteCode.startsWith(PREFIX)) {
      throw new Error("INVITE_FORMAT_INVALID");
    }
    let envelope;
    try {
      const bytes = decodeBase64url(inviteCode.slice(PREFIX.length));
      envelope = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch (_) {
      throw new Error("INVITE_FORMAT_INVALID");
    }
    const payload = envelope?.payload;
    const signature = envelope?.signature;
    if (!payload || typeof payload !== "object" || typeof signature !== "string") throw new Error("INVITE_FORMAT_INVALID");
    const keys = Object.keys(payload).sort().join(",");
    if (keys !== ["expiresAt","guestSecret","inviterFingerprint","inviterPublicKeySpki","issuedAt","nonce","origin","roomId","v"].sort().join(",")) {
      throw new Error("INVITE_FIELDS_INVALID");
    }
    if (payload.v !== 1 || payload.origin !== location.origin) throw new Error("INVITE_ORIGIN_OR_VERSION_INVALID");
    if (!Number.isSafeInteger(payload.issuedAt) || !Number.isSafeInteger(payload.expiresAt) ||
        payload.expiresAt <= now || payload.issuedAt > now + 30_000 ||
        payload.expiresAt - payload.issuedAt > TTL_MS || payload.issuedAt > payload.expiresAt) {
      throw new Error("INVITE_EXPIRED_OR_TIME_INVALID");
    }
    decodeBase64url(payload.roomId, 24);
    decodeBase64url(payload.guestSecret, 32);
    decodeBase64url(payload.nonce, 24);
    const spki = decodeBase64url(payload.inviterPublicKeySpki);
    const signatureBytes = decodeBase64url(signature, 64);
    if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(payload.inviterFingerprint)) {
      throw new Error("INVITE_FINGERPRINT_INVALID");
    }
    const publicKey = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
    const digest = await crypto.subtle.digest("SHA-256", spki);
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
    if (fingerprint !== payload.inviterFingerprint) throw new Error("INVITE_FINGERPRINT_MISMATCH");
    const canonical = new TextEncoder().encode(stableCanonical(payload));
    const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, publicKey, signatureBytes, canonical);
    if (!valid) throw new Error("INVITE_SIGNATURE_INVALID");
    const consumed = await consumeNonce(payload.nonce, payload.expiresAt, now);
    if (!consumed) throw new Error("INVITE_REPLAYED");
    return {
      inviterFingerprint: payload.inviterFingerprint,
      inviterPublicKeySpki: payload.inviterPublicKeySpki,
      roomId: payload.roomId,
      guestProof: await secretProof(payload.guestSecret),
      expiresAt: payload.expiresAt
    };
  }

  function takeHostProofs(roomId) {
    const session = hostSessions.get(roomId);
    if (!session || session.expiresAt <= Date.now()) {
      hostSessions.delete(roomId);
      throw new Error("INVITE_HOST_SESSION_EXPIRED");
    }
    hostSessions.delete(roomId);
    return { hostProof: session.hostProof, guestProof: session.guestProof, expiresAt: session.expiresAt };
  }

  globalThis.EZERO_CONNECT_INVITES = Object.freeze({ createInvite, verifyInvite, takeHostProofs });
})();
