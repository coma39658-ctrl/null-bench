(() => {
  "use strict";
  const DB_NAME = "ezero-connect-trusted-contacts";
  const DB_VERSION = 1;
  const CONTACTS = "contacts";
  const VAULT = "vault";
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


  // V2: the inviter's deliberate invite creation and the invitee's deliberate scan/open
  // are the two consent actions. The Worker-verified peer challenge proof authenticates
  // the other device; local persistence is automatic and idempotent after peer-ready.
  async function saveVerifiedPeer({ invitePayload, peerHandshake, localRole, peerFingerprint, peerPublicKeySpki, displayName = "" }) {
    if (!invitePayload || invitePayload.origin !== location.origin ||
        !/^[A-Za-z0-9_-]{32}$/.test(invitePayload.roomId) ||
        !/^[A-Za-z0-9_-]{32}$/.test(invitePayload.nonce) ||
        !Number.isSafeInteger(invitePayload.issuedAt) || !Number.isSafeInteger(invitePayload.expiresAt) ||
        invitePayload.expiresAt <= invitePayload.issuedAt ||
        invitePayload.expiresAt - invitePayload.issuedAt > 90_000 ||
        !["host", "guest"].includes(localRole) || !peerHandshake?.payload ||
        typeof peerHandshake.signature !== "string") {
      throw new Error("TRUST_V2_INVITE_OR_ROLE_INVALID");
    }
    const proof = peerHandshake.payload;
    const exactKeys = ["challenge","challengeExpiresAt","fingerprint","inviteNonce","origin","protocol","publicKeySpki","roomId","role","v"].sort().join(",");
    if (!proof || Object.keys(proof).sort().join(",") !== exactKeys ||
        proof.v !== 1 || proof.protocol !== "E-ZERO-SIGNAL-HELLO-1" ||
        proof.origin !== invitePayload.origin || proof.roomId !== invitePayload.roomId ||
        proof.inviteNonce !== invitePayload.nonce ||
        proof.role !== (localRole === "host" ? "guest" : "host") ||
        proof.fingerprint !== peerFingerprint || proof.publicKeySpki !== peerPublicKeySpki ||
        !Number.isSafeInteger(proof.challengeExpiresAt) ||
        typeof proof.challenge !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(proof.challenge)) {
      throw new Error("TRUST_V2_PEER_PROOF_BINDING_INVALID");
    }
    const local = await globalThis.EZERO_CONNECT_IDENTITY.getPublicIdentity();
    const inviter = { fingerprint: invitePayload.inviterFingerprint, publicKeySpki: invitePayload.inviterPublicKeySpki };
    const remote = { fingerprint: proof.fingerprint, publicKeySpki: proof.publicKeySpki };
    const localIsInviter = local.fingerprint === inviter.fingerprint && local.publicKeySpki === inviter.publicKeySpki;
    const remoteIsInviter = remote.fingerprint === inviter.fingerprint && remote.publicKeySpki === inviter.publicKeySpki;
    if (localRole === "host" ? !localIsInviter || remoteIsInviter : !remoteIsInviter || localIsInviter) {
      throw new Error("TRUST_V2_INVITER_ROLE_MISMATCH");
    }
    if (local.fingerprint === remote.fingerprint || !/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(remote.fingerprint)) {
      throw new Error("TRUST_V2_PEER_IDENTITY_INVALID");
    }
    const spki = decodeBase64url(remote.publicKeySpki);
    const digest = await crypto.subtle.digest("SHA-256", spki);
    if (toHex(digest) !== remote.fingerprint) throw new Error("TRUST_V2_PEER_KEY_MISMATCH");
    const publicKey = await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
    const valid = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      decodeBase64url(peerHandshake.signature, 64),
      new TextEncoder().encode(stableCanonical(proof))
    );
    if (!valid) throw new Error("TRUST_V2_PEER_SIGNATURE_INVALID");
    const name = String(displayName).trim();
    if (name.length > 64 || /[\\u0000-\\u001F\\u007F]/.test(name)) throw new Error("TRUST_DISPLAY_NAME_INVALID");
    const participants = [local, remote].map(p => ({ fingerprint: p.fingerprint, publicKeySpki: p.publicKeySpki }))
      .sort((a, b) => a.fingerprint < b.fingerprint ? -1 : a.fingerprint > b.fingerprint ? 1 : 0);
    const transcript = {
      v: 2,
      protocol: "E-ZERO-TRUST-2",
      purpose: "consented-invite-auto-save",
      origin: invitePayload.origin,
      roomId: invitePayload.roomId,
      inviteNonce: invitePayload.nonce,
      inviteIssuedAt: invitePayload.issuedAt,
      inviteExpiresAt: invitePayload.expiresAt,
      inviterFingerprint: inviter.fingerprint,
      participants
    };
    const relationshipId = await hashHex(new TextEncoder().encode(stableCanonical(transcript)));
    const existing = await allContacts();
    const prior = existing.find(contact => contact.relationshipId === relationshipId);
    if (prior) {
      if (prior.status === "TRUSTED") return { relationshipId, remoteFingerprint: remote.fingerprint, status: "TRUSTED", alreadySaved: true };
      throw new Error(prior.status === "BLOCKED" ? "TRUST_REMOTE_DEVICE_BLOCKED" : "TRUST_RELATIONSHIP_REVOKED");
    }
    if (existing.some(contact => contact.remoteFingerprint === remote.fingerprint && contact.status === "BLOCKED")) {
      throw new Error("TRUST_REMOTE_DEVICE_BLOCKED");
    }
    const record = {
      relationshipId, trustVersion: 2, remoteFingerprint: remote.fingerprint,
      remotePublicKeySpki: remote.publicKeySpki, displayName: name, transcript,
      peerHandshake, status: "TRUSTED", createdAt: new Date().toISOString()
    };
    const key = await readVaultKey(true);
    const encrypted = await encryptRecord(record, key);
    const db = await openDb();
    let alreadySaved = false;
    await new Promise((resolve, reject) => {
      const tx = db.transaction(CONTACTS, "readwrite");
      const store = tx.objectStore(CONTACTS);
      const request = store.get(relationshipId);
      request.onsuccess = () => {
        if (request.result) { alreadySaved = true; return; }
        store.put(encrypted);
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(new Error("TRUST_CONTACT_SAVE_FAILED"));
      tx.onabort = () => reject(new Error("TRUST_CONTACT_SAVE_ABORTED"));
    });
    db.close();
    if (alreadySaved) {
      const refreshed = await allContacts();
      const recordNow = refreshed.find(contact => contact.relationshipId === relationshipId);
      if (recordNow?.status !== "TRUSTED") throw new Error("TRUST_RELATIONSHIP_NOT_ACTIVE");
    }
    return { relationshipId, remoteFingerprint: remote.fingerprint, status: "TRUSTED", alreadySaved };
  }

  async function listTrustedContacts() {
    const records = await allContacts();
    return records.map(({ relationshipId, remoteFingerprint, displayName, status, createdAt }) =>
      ({ relationshipId, remoteFingerprint, displayName, status, createdAt })
    );
  }

  async function canReconnect(remoteFingerprint) {
    if (!/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(remoteFingerprint)) return false;
    const records = await allContacts();
    if (records.some(r => r.remoteFingerprint === remoteFingerprint && r.status === "BLOCKED")) return false;
    return records.some(r => r.remoteFingerprint === remoteFingerprint && r.status === "TRUSTED");
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
    canReconnect,
    revoke,
    block,
    unblock
  });
})();
