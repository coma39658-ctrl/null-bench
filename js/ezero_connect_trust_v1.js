(() => {
  "use strict";
  const DB_NAME = "ezero-connect-trusted-contacts";
  const DB_VERSION = 3;
  const CONTACTS = "contacts";
  const VAULT = "vault";
  const FRIEND_PROFILES = "friendProfiles";
  const MESSAGES = "messages";
  const VAULT_ID = "local-aes-gcm-key";
  // Contact metadata is AES-GCM encrypted locally; the non-extractable vault key stays in IndexedDB.

  function stableCanonical(value) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
    if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
    }
    throw new Error("TRUST_TRANSCRIPT_INVALID");
  }

  function decodeBase64url(value, expectedBytes) {
    if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("TRUST_KEY_ENCODING_INVALID");
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
    const bytes = Uint8Array.from(atob(padded), c => c.charCodeAt(0));
    if (expectedBytes && bytes.length !== expectedBytes) throw new Error("TRUST_KEY_LENGTH_INVALID");
    return bytes;
  }

  function toHex(bytes) {
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
  }

  async function hashHex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
  }

  async function openDb() {
    if (!globalThis.indexedDB || !globalThis.crypto?.subtle || !globalThis.isSecureContext) {
      throw new Error("TRUST_SECURE_STORAGE_UNAVAILABLE");
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CONTACTS)) db.createObjectStore(CONTACTS, { keyPath: "relationshipId" });
        if (!db.objectStoreNames.contains(VAULT)) db.createObjectStore(VAULT, { keyPath: "id" });
        if (!db.objectStoreNames.contains(FRIEND_PROFILES)) db.createObjectStore(FRIEND_PROFILES, { keyPath: "relationshipId" });
        let messagesStore;
        if (!db.objectStoreNames.contains(MESSAGES)) {
          messagesStore = db.createObjectStore(MESSAGES, { keyPath: ["relationshipId", "messageId"] });
        } else {
          messagesStore = request.transaction.objectStore(MESSAGES);
        }
        if (!messagesStore.indexNames.contains("byRelationshipCreatedAt")) {
          messagesStore.createIndex("byRelationshipCreatedAt", ["relationshipId", "createdAt"], { unique: false });
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      request.onerror = () => reject(new Error("TRUST_DATABASE_OPEN_FAILED"));
    });
  }

  let cachedVaultKey = null;
  let vaultKeyPromise = null;
  async function readVaultKey(createIfMissing) {
    if (cachedVaultKey) return cachedVaultKey;
    if (vaultKeyPromise) return vaultKeyPromise;
    vaultKeyPromise = (async () => {
      const db = await openDb();
      const existing = await new Promise((resolve, reject) => {
        const request = db.transaction(VAULT, "readonly").objectStore(VAULT).get(VAULT_ID);
        request.onsuccess = () => resolve(request.result?.key || null);
        request.onerror = () => reject(new Error("TRUST_VAULT_READ_FAILED"));
      });
      if (existing || !createIfMissing) {
        db.close();
        cachedVaultKey = existing;
        return existing;
      }
      const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(VAULT, "readwrite");
        tx.objectStore(VAULT).put({ id: VAULT_ID, key });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error("TRUST_VAULT_WRITE_FAILED"));
        tx.onabort = () => reject(new Error("TRUST_VAULT_WRITE_ABORTED"));
      });
      db.close();
      cachedVaultKey = key;
      return key;
    })();
    try { return await vaultKeyPromise; }
    finally { vaultKeyPromise = null; }
  }

  async function readEncryptedRecords() {
    const db = await openDb();
    const records = await new Promise((resolve, reject) => {
      const request = db.transaction(CONTACTS, "readonly").objectStore(CONTACTS).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(new Error("TRUST_CONTACT_READ_FAILED"));
    });
    db.close();
    return records;
  }

  async function decryptRecord(record, key) {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv) },
      key,
      new Uint8Array(record.ciphertext)
    );
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(plaintext));
    if (value.relationshipId !== record.relationshipId) throw new Error("TRUST_RECORD_ID_MISMATCH");
    return value;
  }

  async function encryptRecord(value, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify(value));
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
    return { relationshipId: value.relationshipId, iv, ciphertext: new Uint8Array(ciphertext) };
  }

  async function allContacts() {
    const encrypted = await readEncryptedRecords();
    if (!encrypted.length) return [];
    const key = await readVaultKey(false);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("TRUST_VAULT_KEY_MISSING_OR_INVALID");
    }
    const values = [];
    for (const record of encrypted) values.push(await decryptRecord(record, key));
    return values;
  }

  async function validateTranscript(transcript) {
    if (!transcript || transcript.v !== 1 || transcript.protocol !== "E-ZERO-TRUST-1" ||
        transcript.purpose !== "mutual-contact-save" || !Array.isArray(transcript.participants) ||
        transcript.participants.length !== 2 || !/^[A-Za-z0-9_-]{32}$/.test(transcript.roomId) ||
        !/^[A-Za-z0-9_-]{32}$/.test(transcript.inviteNonce) ||
        !Number.isSafeInteger(transcript.inviteIssuedAt) || !Number.isSafeInteger(transcript.inviteExpiresAt) ||
        !Number.isSafeInteger(transcript.createdAt) || transcript.createdAt < transcript.inviteIssuedAt ||
        transcript.createdAt > transcript.inviteExpiresAt) {
      throw new Error("TRUST_TRANSCRIPT_INVALID");
    }
    const participants = transcript.participants;
    if (!(participants[0].fingerprint < participants[1].fingerprint)) throw new Error("TRUST_PARTICIPANT_ORDER_INVALID");
    for (const participant of participants) {
      if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(participant.fingerprint)) {
        throw new Error("TRUST_PARTICIPANT_FINGERPRINT_INVALID");
      }
      const spki = decodeBase64url(participant.publicKeySpki);
      const digest = await crypto.subtle.digest("SHA-256", spki);
      if (toHex(digest) !== participant.fingerprint) throw new Error("TRUST_PARTICIPANT_KEY_MISMATCH");
    }
    return transcript;
  }

  async function buildTranscript(invite, responderIdentity, createdAt = Date.now()) {
    if (!invite || !responderIdentity || typeof invite.inviterFingerprint !== "string" ||
        typeof invite.inviterPublicKeySpki !== "string" || typeof invite.roomId !== "string" ||
        typeof invite.nonce !== "string" || !Number.isSafeInteger(invite.issuedAt) ||
        !Number.isSafeInteger(invite.expiresAt)) {
      throw new Error("TRUST_INVITE_METADATA_INVALID");
    }
    const participants = [
      { fingerprint: invite.inviterFingerprint, publicKeySpki: invite.inviterPublicKeySpki },
      { fingerprint: responderIdentity.fingerprint, publicKeySpki: responderIdentity.publicKeySpki }
    ].sort((a, b) => a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0);
    if (participants[0].fingerprint === participants[1].fingerprint) throw new Error("TRUST_SELF_PAIRING_FORBIDDEN");
    const transcript = {
      v: 1,
      protocol: "E-ZERO-TRUST-1",
      purpose: "mutual-contact-save",
      participants,
      roomId: invite.roomId,
      inviteNonce: invite.nonce,
      inviteIssuedAt: invite.issuedAt,
      inviteExpiresAt: invite.expiresAt,
      createdAt
    };
    await validateTranscript(transcript);
    const relationshipId = await hashHex(new TextEncoder().encode(stableCanonical(transcript)));
    return { transcript, relationshipId };
  }

  async function signApproval(transcript) {
    await validateTranscript(transcript);
    const identity = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    if (!transcript.participants.some(p => p.fingerprint === identity.fingerprint && p.publicKeySpki === identity.publicKeySpki)) {
      throw new Error("TRUST_LOCAL_IDENTITY_NOT_IN_TRANSCRIPT");
    }
    const transcriptHash = await hashHex(new TextEncoder().encode(stableCanonical(transcript)));
    const signature = await globalThis.EZERO_CONNECT_IDENTITY.signCanonical(transcript);
    return { signerFingerprint: identity.fingerprint, transcriptHash, signature };
  }

  async function verifyApproval(transcript, approval) {
    await validateTranscript(transcript);
    if (!approval || typeof approval.signature !== "string" || typeof approval.signerFingerprint !== "string") {
      throw new Error("TRUST_APPROVAL_INVALID");
    }
    const participant = transcript.participants.find(p => p.fingerprint === approval.signerFingerprint);
    if (!participant) throw new Error("TRUST_APPROVAL_SIGNER_UNKNOWN");
    const transcriptHash = await hashHex(new TextEncoder().encode(stableCanonical(transcript)));
    if (approval.transcriptHash !== transcriptHash) throw new Error("TRUST_APPROVAL_TRANSCRIPT_MISMATCH");
    const publicKey = await crypto.subtle.importKey(
      "spki",
      decodeBase64url(participant.publicKeySpki),
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["verify"]
    );
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      decodeBase64url(approval.signature, 64),
      new TextEncoder().encode(stableCanonical(transcript))
    );
    if (!valid) throw new Error("TRUST_APPROVAL_SIGNATURE_INVALID");
    return true;
  }

  async function saveTrustedContact({ transcript, localApproval, remoteApproval, displayName = "", explicitConsent }) {
    if (explicitConsent !== true) throw new Error("TRUST_EXPLICIT_SAVE_CONSENT_REQUIRED");
    await validateTranscript(transcript);
    const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    const localParticipant = transcript.participants.find(p => p.fingerprint === local.fingerprint);
    const remote = transcript.participants.find(p => p.fingerprint !== local.fingerprint);
    if (!localParticipant || localParticipant.publicKeySpki !== local.publicKeySpki || !remote) {
      throw new Error("TRUST_LOCAL_OR_REMOTE_IDENTITY_MISMATCH");
    }
    if (localApproval?.signerFingerprint !== local.fingerprint || remoteApproval?.signerFingerprint !== remote.fingerprint) {
      throw new Error("TRUST_APPROVAL_ROLE_MISMATCH");
    }
    await verifyApproval(transcript, localApproval);
    await verifyApproval(transcript, remoteApproval);
    const name = String(displayName).trim();
    if (name.length > 64 || /[\u0000-\u001F\u007F]/.test(name)) throw new Error("TRUST_DISPLAY_NAME_INVALID");
    const relationshipId = await hashHex(new TextEncoder().encode(stableCanonical(transcript)));
    const existing = await allContacts();
    if (existing.some(contact => contact.relationshipId === relationshipId)) throw new Error("TRUST_RELATIONSHIP_ALREADY_EXISTS");
    if (existing.some(contact => contact.remoteFingerprint === remote.fingerprint && contact.status === "BLOCKED")) {
      throw new Error("TRUST_REMOTE_DEVICE_BLOCKED");
    }
    const record = {
      relationshipId,
      remoteFingerprint: remote.fingerprint,
      remotePublicKeySpki: remote.publicKeySpki,
      displayName: name,
      transcript,
      localApproval,
      remoteApproval,
      status: "TRUSTED",
      createdAt: new Date().toISOString()
    };
    const key = await readVaultKey(true);
    const encrypted = await encryptRecord(record, key);
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CONTACTS, "readwrite");
      const store = tx.objectStore(CONTACTS);
      const request = store.get(relationshipId);
      request.onsuccess = () => {
        if (request.result) {
          tx.abort();
          return;
        }
        store.put(encrypted);
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error("TRUST_CONTACT_SAVE_FAILED"));
      tx.onabort = () => reject(new Error("TRUST_RELATIONSHIP_ALREADY_EXISTS"));
    });
    db.close();
    return { relationshipId, remoteFingerprint: remote.fingerprint, status: "TRUSTED" };
  }

  async function listTrustedContacts() {
    const records = await allContacts();
    return records.map(({ relationshipId, remoteFingerprint, displayName, status, createdAt }) =>
      ({ relationshipId, remoteFingerprint, displayName, status, createdAt })
    );
  }

  async function getTrustedContact(relationshipId) {
    if (typeof relationshipId !== "string" || !/^[a-f0-9]{64}$/.test(relationshipId)) {
      throw new Error("TRUST_RELATIONSHIP_ID_INVALID");
    }
    const records = await allContacts();
    const record = records.find(item => item.relationshipId === relationshipId);
    if (!record || record.status !== "TRUSTED") throw new Error("TRUST_RELATIONSHIP_NOT_TRUSTED");
    return Object.freeze({
      relationshipId: record.relationshipId,
      remoteFingerprint: record.remoteFingerprint,
      remotePublicKeySpki: record.remotePublicKeySpki,
      displayName: record.displayName,
      status: record.status,
      trustProof: Object.freeze({
        transcript: record.transcript,
        approvals: Object.freeze([record.localApproval, record.remoteApproval])
      })
    });
  }

  function bytesToBase64(bytes) {
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
    }
    return btoa(binary);
  }

  function base64ToBytes(value) {
    if (typeof value !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("TRUST_FRIEND_PROFILE_ENCODING_INVALID");
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

  async function trustedProfileContext(relationshipId, remoteFingerprint) {
    const contact = await getTrustedContact(relationshipId);
    if (contact.status !== "TRUSTED" || contact.remoteFingerprint !== remoteFingerprint) {
      throw new Error("TRUST_FRIEND_PROFILE_TRUST_MISMATCH");
    }
    return contact;
  }

  async function readFriendProfileState(relationshipId, key) {
    const db = await openDb();
    const record = await new Promise((resolve, reject) => {
      const request = db.transaction(FRIEND_PROFILES, "readonly").objectStore(FRIEND_PROFILES).get(relationshipId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error("TRUST_FRIEND_PROFILE_READ_FAILED"));
    });
    db.close();
    if (!record) return { avatarBase64: "", lastSharedHash: "", updatedAt: "" };
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv), additionalData: new TextEncoder().encode(relationshipId) },
      key,
      new Uint8Array(record.ciphertext)
    );
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(clear));
    if (value.relationshipId !== relationshipId || typeof value.avatarBase64 !== "string" ||
        typeof value.lastSharedHash !== "string") throw new Error("TRUST_FRIEND_PROFILE_RECORD_INVALID");
    return value;
  }

  async function writeFriendProfileState(relationshipId, value, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = new TextEncoder().encode(JSON.stringify({ relationshipId, ...value }));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(relationshipId) },
      key,
      plaintext
    );
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FRIEND_PROFILES, "readwrite");
      tx.objectStore(FRIEND_PROFILES).put({ relationshipId, iv, ciphertext: new Uint8Array(ciphertext) });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error("TRUST_FRIEND_PROFILE_WRITE_FAILED"));
      tx.onabort = () => reject(new Error("TRUST_FRIEND_PROFILE_WRITE_ABORTED"));
    });
    db.close();
  }

  async function saveTrustedFriendProfile(relationshipId, remoteFingerprint, bytes) {
    await trustedProfileContext(relationshipId, remoteFingerprint);
    if (!(bytes instanceof Uint8Array) || bytes.length < 4 || bytes.length > 140 * 1024 ||
        bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error("TRUST_FRIEND_PROFILE_JPEG_INVALID");
    }
    const key = await readVaultKey(true);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("TRUST_VAULT_KEY_MISSING_OR_INVALID");
    }
    const previous = await readFriendProfileState(relationshipId, key);
    await writeFriendProfileState(relationshipId, {
      avatarBase64: bytesToBase64(bytes),
      lastSharedHash: previous.lastSharedHash || "",
      updatedAt: new Date().toISOString()
    }, key);
    return { relationshipId, updated: true };
  }

  async function getTrustedFriendProfile(relationshipId, remoteFingerprint) {
    await trustedProfileContext(relationshipId, remoteFingerprint);
    const key = await readVaultKey(false);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("TRUST_VAULT_KEY_MISSING_OR_INVALID");
    }
    const value = await readFriendProfileState(relationshipId, key);
    return Object.freeze({
      bytes: value.avatarBase64 ? base64ToBytes(value.avatarBase64) : null,
      updatedAt: value.updatedAt || "",
      lastSharedHash: value.lastSharedHash || ""
    });
  }

  async function setTrustedFriendProfileSharedHash(relationshipId, remoteFingerprint, hash) {
    await trustedProfileContext(relationshipId, remoteFingerprint);
    if (typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) throw new Error("TRUST_FRIEND_PROFILE_HASH_INVALID");
    const key = await readVaultKey(true);
    const previous = await readFriendProfileState(relationshipId, key);
    await writeFriendProfileState(relationshipId, {
      avatarBase64: previous.avatarBase64 || "",
      lastSharedHash: hash,
      updatedAt: previous.updatedAt || ""
    }, key);
    return true;
  }

  const MESSAGE_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
  const MESSAGE_STATUSES = new Set(["sending", "delivered", "failed", "received"]);

  function validateStoredMessage(input) {
    if (!input || typeof input !== "object" || Array.isArray(input) ||
        !MESSAGE_ID_PATTERN.test(input.messageId || "") ||
        !["text", "voice"].includes(input.type) ||
        !["incoming", "outgoing"].includes(input.direction) ||
        !MESSAGE_STATUSES.has(input.status) ||
        !Number.isSafeInteger(input.createdAt) || input.createdAt < 0 ||
        !(input.bytes instanceof Uint8Array) || input.bytes.length === 0) {
      throw new Error("TRUST_MESSAGE_INPUT_INVALID");
    }
    if ((input.direction === "incoming" && input.status !== "received") ||
        (input.direction === "outgoing" && input.status === "received")) {
      throw new Error("TRUST_MESSAGE_STATUS_INVALID");
    }
    const maxBytes = input.type === "text" ? 8000 : 180 * 1024;
    if (input.bytes.length > maxBytes) throw new Error("TRUST_MESSAGE_SIZE_INVALID");
    if (input.type === "text") {
      try { new TextDecoder("utf-8", { fatal: true }).decode(input.bytes); }
      catch (_) { throw new Error("TRUST_MESSAGE_TEXT_ENCODING_INVALID"); }
    }
    return {
      messageId: input.messageId,
      type: input.type,
      direction: input.direction,
      status: input.status,
      createdAt: input.createdAt,
      bytes: new Uint8Array(input.bytes)
    };
  }

  function messageAdditionalData(relationshipId, messageId) {
    return new TextEncoder().encode(relationshipId + ":" + messageId);
  }

  async function encryptStoredMessage(value, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintextValue = {
      relationshipId: value.relationshipId,
      messageId: value.messageId,
      type: value.type,
      direction: value.direction,
      status: value.status,
      createdAt: value.createdAt,
      payloadBase64: bytesToBase64(value.bytes)
    };
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: messageAdditionalData(value.relationshipId, value.messageId) },
      key,
      new TextEncoder().encode(JSON.stringify(plaintextValue))
    );
    return {
      relationshipId: value.relationshipId,
      messageId: value.messageId,
      createdAt: value.createdAt,
      iv,
      ciphertext: new Uint8Array(ciphertext)
    };
  }

  async function decryptStoredMessage(record, key) {
    const clear = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(record.iv), additionalData: messageAdditionalData(record.relationshipId, record.messageId) },
      key,
      new Uint8Array(record.ciphertext)
    );
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(clear));
    if (value.relationshipId !== record.relationshipId || value.messageId !== record.messageId ||
        value.createdAt !== record.createdAt || !["text", "voice"].includes(value.type) ||
        !["incoming", "outgoing"].includes(value.direction) || !MESSAGE_STATUSES.has(value.status) ||
        typeof value.payloadBase64 !== "string") {
      throw new Error("TRUST_MESSAGE_RECORD_INVALID");
    }
    const bytes = base64ToBytes(value.payloadBase64);
    const maxBytes = value.type === "text" ? 8000 : 180 * 1024;
    if (!bytes.length || bytes.length > maxBytes) throw new Error("TRUST_MESSAGE_RECORD_SIZE_INVALID");
    if (value.type === "text") new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return Object.freeze({
      messageId: value.messageId,
      relationshipId: value.relationshipId,
      type: value.type,
      direction: value.direction,
      status: value.status,
      createdAt: value.createdAt,
      bytes
    });
  }

  async function saveTrustedMessage(relationshipId, remoteFingerprint, input) {
    await trustedProfileContext(relationshipId, remoteFingerprint);
    const value = validateStoredMessage(input);
    const key = await readVaultKey(true);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("TRUST_VAULT_KEY_MISSING_OR_INVALID");
    }
    const record = await encryptStoredMessage({ ...value, relationshipId }, key);
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(MESSAGES, "readwrite");
        tx.objectStore(MESSAGES).add(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error("TRUST_MESSAGE_WRITE_FAILED"));
        tx.onabort = () => reject(new Error("TRUST_MESSAGE_WRITE_ABORTED"));
      });
    } finally { db.close(); }
    return Object.freeze({ messageId: value.messageId, createdAt: value.createdAt, status: value.status });
  }

  async function listTrustedMessages(relationshipId, remoteFingerprint, limit = 100) {
    await trustedProfileContext(relationshipId, remoteFingerprint);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) throw new Error("TRUST_MESSAGE_LIMIT_INVALID");
    const db = await openDb();
    let records;
    try {
      records = await new Promise((resolve, reject) => {
        const rows = [];
        const range = IDBKeyRange.bound([relationshipId, 0], [relationshipId, Number.MAX_SAFE_INTEGER]);
        const request = db.transaction(MESSAGES, "readonly")
          .objectStore(MESSAGES).index("byRelationshipCreatedAt").openCursor(range, "prev");
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor && rows.length < limit) {
            rows.push(cursor.value);
            cursor.continue();
          } else resolve(rows);
        };
        request.onerror = () => reject(new Error("TRUST_MESSAGE_READ_FAILED"));
      });
    } finally { db.close(); }
    const key = await readVaultKey(false);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("TRUST_VAULT_KEY_MISSING_OR_INVALID");
    }
    const values = [];
    for (const record of records.reverse()) values.push(await decryptStoredMessage(record, key));
    return Object.freeze(values);
  }

  async function updateTrustedMessageStatus(relationshipId, remoteFingerprint, messageId, status) {
    await trustedProfileContext(relationshipId, remoteFingerprint);
    if (!MESSAGE_ID_PATTERN.test(messageId || "") || !["delivered", "failed"].includes(status)) {
      throw new Error("TRUST_MESSAGE_STATUS_UPDATE_INVALID");
    }
    const db = await openDb();
    let record;
    try {
      record = await new Promise((resolve, reject) => {
        const request = db.transaction(MESSAGES, "readonly").objectStore(MESSAGES).get([relationshipId, messageId]);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(new Error("TRUST_MESSAGE_READ_FAILED"));
      });
    } finally { db.close(); }
    if (!record) throw new Error("TRUST_MESSAGE_NOT_FOUND");
    const key = await readVaultKey(false);
    if (!key || key.extractable !== false || key.algorithm?.name !== "AES-GCM") {
      throw new Error("TRUST_VAULT_KEY_MISSING_OR_INVALID");
    }
    const current = await decryptStoredMessage(record, key);
    if (current.direction !== "outgoing" || current.status !== "sending") {
      throw new Error("TRUST_MESSAGE_STATUS_TRANSITION_INVALID");
    }
    const updated = await encryptStoredMessage({ ...current, relationshipId, status }, key);
    const writeDb = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = writeDb.transaction(MESSAGES, "readwrite");
        tx.objectStore(MESSAGES).put(updated);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error("TRUST_MESSAGE_STATUS_WRITE_FAILED"));
        tx.onabort = () => reject(new Error("TRUST_MESSAGE_STATUS_WRITE_ABORTED"));
      });
    } finally { writeDb.close(); }
    return Object.freeze({ messageId, status });
  }

  async function deleteTrustedMessagesForRelationship(relationshipId) {
    const db = await openDb();
    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(MESSAGES, "readwrite");
        const range = IDBKeyRange.bound([relationshipId, 0], [relationshipId, Number.MAX_SAFE_INTEGER]);
        const request = tx.objectStore(MESSAGES).index("byRelationshipCreatedAt").openCursor(range);
        request.onsuccess = () => {
          const cursor = request.result;
          if (cursor) { cursor.delete(); cursor.continue(); }
        };
        request.onerror = () => reject(new Error("TRUST_MESSAGE_DELETE_FAILED"));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error("TRUST_MESSAGE_DELETE_FAILED"));
        tx.onabort = () => reject(new Error("TRUST_MESSAGE_DELETE_ABORTED"));
      });
    } finally { db.close(); }
  }

  async function canReconnect(remoteFingerprint) {
    if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(remoteFingerprint)) return false;
    const records = await allContacts();
    if (records.some(r => r.remoteFingerprint === remoteFingerprint && r.status === "BLOCKED")) return false;
    return records.some(r => r.remoteFingerprint === remoteFingerprint && r.status === "TRUSTED");
  }

  async function deleteFriendProfileRecord(relationshipId) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FRIEND_PROFILES, "readwrite");
      tx.objectStore(FRIEND_PROFILES).delete(relationshipId);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error("TRUST_FRIEND_PROFILE_DELETE_FAILED"));
      tx.onabort = () => reject(new Error("TRUST_FRIEND_PROFILE_DELETE_ABORTED"));
    });
    db.close();
  }

  async function changeStatus(remoteFingerprint, status) {
    if (!["REVOKED", "BLOCKED"].includes(status)) throw new Error("TRUST_STATUS_INVALID");
    const records = await allContacts();
    const key = await readVaultKey(false);
    if (!key) return false;
    const changed = records.filter(r => r.remoteFingerprint === remoteFingerprint && r.status !== status);
    if (!changed.length) return false;
    const db = await openDb();
    for (const record of changed) {
      record.status = status;
      record.updatedAt = new Date().toISOString();
      const encrypted = await encryptRecord(record, key);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CONTACTS, "readwrite");
        tx.objectStore(CONTACTS).put(encrypted);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error("TRUST_STATUS_UPDATE_FAILED"));
        tx.onabort = () => reject(new Error("TRUST_STATUS_UPDATE_ABORTED"));
      });
    }
    db.close();
    for (const record of changed) {
      await deleteFriendProfileRecord(record.relationshipId);
      await deleteTrustedMessagesForRelationship(record.relationshipId);
    }
    return true;
  }

  async function revoke(remoteFingerprint) {
    return changeStatus(remoteFingerprint, "REVOKED");
  }

  async function block(remoteFingerprint) {
    return changeStatus(remoteFingerprint, "BLOCKED");
  }

  async function unblock(remoteFingerprint) {
    const records = await allContacts();
    const key = await readVaultKey(false);
    if (!key) return false;
    const changed = records.filter(r => r.remoteFingerprint === remoteFingerprint && r.status === "BLOCKED");
    if (!changed.length) return false;
    const db = await openDb();
    for (const record of changed) {
      record.status = "REVOKED";
      record.updatedAt = new Date().toISOString();
      const encrypted = await encryptRecord(record, key);
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CONTACTS, "readwrite");
        tx.objectStore(CONTACTS).put(encrypted);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(new Error("TRUST_UNBLOCK_FAILED"));
        tx.onabort = () => reject(new Error("TRUST_UNBLOCK_ABORTED"));
      });
    }
    db.close();
    return true;
  }

  globalThis.EZERO_CONNECT_TRUST = Object.freeze({
    buildTranscript,
    signApproval,
    verifyApproval,
    saveTrustedContact,
    listTrustedContacts,
    getTrustedContact,
    saveTrustedFriendProfile,
    getTrustedFriendProfile,
    setTrustedFriendProfileSharedHash,
    saveTrustedMessage,
    listTrustedMessages,
    updateTrustedMessageStatus,
    canReconnect,
    revoke,
    block,
    unblock
  });
})();
