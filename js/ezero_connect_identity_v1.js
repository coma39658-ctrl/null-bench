(() => {
  "use strict";
  const DB_NAME = "ezero-connect-device-identity";
  const DB_VERSION = 1;
  const STORE = "device-keys";
  const RECORD_ID = "primary-device";
  let dbPromise;

  function openDb() {
    if (!globalThis.indexedDB) throw new Error("INDEXEDDB_UNAVAILABLE");
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error("IDENTITY_DATABASE_OPEN_FAILED"));
        request.onblocked = () => reject(new Error("IDENTITY_DATABASE_BLOCKED"));
      });
    }
    return dbPromise;
  }

  async function readRecord() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(RECORD_ID);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("IDENTITY_DATABASE_READ_FAILED"));
      tx.onabort = () => reject(new Error("IDENTITY_DATABASE_READ_ABORTED"));
    });
  }

  async function writeRecord(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(new Error("IDENTITY_DATABASE_WRITE_FAILED"));
      tx.onabort = () => reject(new Error("IDENTITY_DATABASE_WRITE_ABORTED"));
    });
  }

  function toHex(bytes) {
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
  }

  async function publicMetadata(publicKey) {
    const spki = await crypto.subtle.exportKey("spki", publicKey);
    const digest = await crypto.subtle.digest("SHA-256", spki);
    return { publicSpki: new Uint8Array(spki), fingerprint: toHex(digest) };
  }

  function validateRecord(record) {
    if (!record || record.id !== RECORD_ID || !record.privateKey || !record.publicKey) {
      throw new Error("IDENTITY_RECORD_INVALID");
    }
    if (record.privateKey.extractable !== false || record.privateKey.type !== "private" ||
        record.privateKey.algorithm?.name !== "ECDSA" || record.privateKey.algorithm?.namedCurve !== "P-256" ||
        !record.privateKey.usages.includes("sign")) {
      throw new Error("IDENTITY_PRIVATE_KEY_POLICY_INVALID");
    }
    if (record.publicKey.type !== "public" || record.publicKey.algorithm?.name !== "ECDSA" ||
        record.publicKey.algorithm?.namedCurve !== "P-256" || !record.publicKey.usages.includes("verify")) {
      throw new Error("IDENTITY_PUBLIC_KEY_POLICY_INVALID");
    }
    return record;
  }

  async function load() {
    const record = await readRecord();
    if (!record) return null;
    validateRecord(record);
    const metadata = await publicMetadata(record.publicKey);
    if (metadata.fingerprint !== record.fingerprint) throw new Error("IDENTITY_FINGERPRINT_MISMATCH");
    return { fingerprint: record.fingerprint, createdAt: record.createdAt, algorithm: "ECDSA-P256" };
  }

  async function createAfterConsent(consentGranted) {
    if (consentGranted !== true) throw new Error("EXPLICIT_CONSENT_REQUIRED");
    if (!globalThis.crypto?.subtle || !globalThis.isSecureContext) throw new Error("SECURE_CRYPTO_CONTEXT_REQUIRED");
    const existing = await readRecord();
    if (existing) {
      validateRecord(existing);
      const metadata = await publicMetadata(existing.publicKey);
      if (metadata.fingerprint !== existing.fingerprint) throw new Error("IDENTITY_FINGERPRINT_MISMATCH");
      return { fingerprint: existing.fingerprint, createdAt: existing.createdAt, alreadyExisted: true };
    }

    const pair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign", "verify"]
    );
    if (pair.privateKey.extractable !== false) throw new Error("PRIVATE_KEY_MUST_NOT_BE_EXTRACTABLE");
    const metadata = await publicMetadata(pair.publicKey);
    const record = {
      id: RECORD_ID,
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
      publicSpki: metadata.publicSpki,
      fingerprint: metadata.fingerprint,
      createdAt: new Date().toISOString(),
      algorithm: "ECDSA-P256"
    };
    await writeRecord(record);
    const saved = validateRecord(await readRecord());
    const verified = await publicMetadata(saved.publicKey);
    if (verified.fingerprint !== saved.fingerprint) throw new Error("IDENTITY_PERSISTENCE_VERIFICATION_FAILED");
    return { fingerprint: saved.fingerprint, createdAt: saved.createdAt, alreadyExisted: false };
  }


  function stableCanonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
    }
    throw new Error("CANONICAL_PAYLOAD_INVALID");
  }

  function toBase64Url(bytes) {
    let binary = "";
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
  }

  async function getPublicIdentity() {
    const record = validateRecord(await readRecord());
    const metadata = await publicMetadata(record.publicKey);
    if (metadata.fingerprint !== record.fingerprint) throw new Error("IDENTITY_FINGERPRINT_MISMATCH");
    return {
      algorithm: "ECDSA-P256-SHA256",
      fingerprint: record.fingerprint,
      publicKeySpki: toBase64Url(metadata.publicSpki)
    };
  }

  async function signCanonical(payload) {
    const record = validateRecord(await readRecord());
    const canonical = stableCanonical(payload);
    const bytes = new TextEncoder().encode(canonical);
    const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, record.privateKey, bytes);
    return toBase64Url(signature);
  }

  function lowerHex(bytes) {
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function validateSignedFields(fields, keys) {
    if (!fields || typeof fields !== "object" || Array.isArray(fields)) throw new Error("ROOT_COMMAND_INVALID");
    for (const key of keys) {
      if (typeof fields[key] !== "string" || !fields[key] || /[\\r\\n]/.test(fields[key])) {
      if (typeof fields[key] !== "string" || !fields[key] || /[\r\n]/.test(fields[key])) {
      }
    }
    if (fields.audience !== "https://coma39658-ctrl.github.io") throw new Error("ROOT_COMMAND_AUDIENCE_INVALID");
    const expires = Number(fields.expires_at);
    if (!Number.isSafeInteger(expires) || expires <= Date.now() || expires > Date.now() + 90000) {
      throw new Error("ROOT_COMMAND_EXPIRED");
    }
  }

  async function signProtocolCommand(tag, fields, order) {
    const record = validateRecord(await readRecord());
    const metadata = await publicMetadata(record.publicKey);
    if (metadata.fingerprint !== record.fingerprint) throw new Error("IDENTITY_FINGERPRINT_MISMATCH");
    const rootFp = lowerHex(await crypto.subtle.digest("SHA-256", metadata.publicSpki));
    const canonical = tag + "\n" + order.map(key => key + "=" + fields[key] + "\n").join("");
    const signature = await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      record.privateKey,
      new TextEncoder().encode(canonical)
    );
    return { root_fp: rootFp, signature: toBase64Url(signature) };
  }

  async function signAndroidRootApproval(challenge) {
    const order = ["root_fp", "device_fp", "challenge_id", "nonce", "audience", "expires_at"];
    validateSignedFields(challenge, order);
    if (!/^[a-f0-9]{64}$/.test(challenge.device_fp) ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(challenge.challenge_id) ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(challenge.nonce)) {
      throw new Error("ROOT_APPROVAL_BINDING_INVALID");
    }
    const record = validateRecord(await readRecord());
    const metadata = await publicMetadata(record.publicKey);
    const actualRootFp = lowerHex(await crypto.subtle.digest("SHA-256", metadata.publicSpki));
    if (challenge.root_fp !== actualRootFp) throw new Error("ROOT_APPROVAL_ROOT_MISMATCH");
    const signed = await signProtocolCommand("EZERO_ANDROID_ROOT_APPROVAL_V1", challenge, order);
    return { root_fp: signed.root_fp, signature: signed.signature };
  }

  async function signAndroidDeviceManagement(challenge) {
    const order = ["root_fp", "action", "device_fp", "challenge_id", "nonce", "audience", "expires_at"];
    validateSignedFields(challenge, order);
    if (!["LIST_DEVICES", "REVOKE_DEVICE"].includes(challenge.action) ||
        (challenge.action === "REVOKE_DEVICE" && !/^[a-f0-9]{64}$/.test(challenge.device_fp)) ||
        (challenge.action === "LIST_DEVICES" && challenge.device_fp !== "-") ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(challenge.challenge_id) ||
        !/^[A-Za-z0-9_-]{16,128}$/.test(challenge.nonce)) {
      throw new Error("ROOT_MANAGEMENT_BINDING_INVALID");
    }
    const record = validateRecord(await readRecord());
    const metadata = await publicMetadata(record.publicKey);
    const actualRootFp = lowerHex(await crypto.subtle.digest("SHA-256", metadata.publicSpki));
    if (challenge.root_fp !== actualRootFp) throw new Error("ROOT_MANAGEMENT_ROOT_MISMATCH");
    const signed = await signProtocolCommand("EZERO_ROOT_DEVICE_MANAGEMENT_V1", challenge, order);
    return { root_fp: signed.root_fp, signature: signed.signature };
  }

  globalThis.EZERO_CONNECT_IDENTITY = Object.freeze({
    load, createAfterConsent, getPublicIdentity, signCanonical,
    signAndroidRootApproval, signAndroidDeviceManagement
  });
})();
