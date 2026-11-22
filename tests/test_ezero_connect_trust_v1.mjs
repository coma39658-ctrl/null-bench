import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const contexts = [];
try {
  async function phone() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    contexts.push(context);
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
    await page.waitForFunction(() => Boolean(window.EZERO_CONNECT_TRUST && window.EZERO_CONNECT_IDENTITY && window.EZERO_CONNECT_INVITES));
    await page.waitForFunction(() => Boolean(document.querySelector("#identityConsent")));
    await page.locator("#identityConsent").check();
    await page.locator("#createIdentity").click();
    await page.waitForFunction(() => document.querySelector("#identityFingerprint").textContent.length > 30);
    return page;
  }

  const a = await phone();
  const b = await phone();
  const identityA = await a.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  const identityB = await b.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  assert.notEqual(identityA.fingerprint, identityB.fingerprint);

  async function pairAndSave() {
    const invite = await a.evaluate(() => window.EZERO_CONNECT_INVITES.createInvite());
    const verified = await b.evaluate(code => window.EZERO_CONNECT_INVITES.verifyInvite(code), invite.inviteCode);
    const createdAt = Date.now();
    const transcriptA = await a.evaluate(args =>
      window.EZERO_CONNECT_TRUST.buildTranscript(args.invite, args.identity, args.createdAt),
      { invite, identity: identityB, createdAt }
    );
    const transcriptB = await b.evaluate(args =>
      window.EZERO_CONNECT_TRUST.buildTranscript(args.invite, args.identity, args.createdAt),
      { invite: verified, identity: identityB, createdAt }
    );
    assert.deepEqual(transcriptA, transcriptB);

    const approvalA = await a.evaluate(transcript => window.EZERO_CONNECT_TRUST.signApproval(transcript), transcriptA.transcript);
    const approvalB = await b.evaluate(transcript => window.EZERO_CONNECT_TRUST.signApproval(transcript), transcriptB.transcript);
    return { transcriptA, transcriptB, approvalA, approvalB };
  }

  const first = await pairAndSave();
  const noConsent = await a.evaluate(async args => {
    try {
      await window.EZERO_CONNECT_TRUST.saveTrustedContact({
        transcript: args.transcript,
        localApproval: args.localApproval,
        remoteApproval: args.remoteApproval,
        displayName: "Friend B",
        explicitConsent: false
      });
      return "ACCEPTED";
    } catch (error) { return error.message; }
  }, { transcript: first.transcriptA.transcript, localApproval: first.approvalA, remoteApproval: first.approvalB });
  assert.equal(noConsent, "TRUST_EXPLICIT_SAVE_CONSENT_REQUIRED");

  const tampered = { ...first.approvalB, signature: (first.approvalB.signature[0] === "A" ? "B" : "A") + first.approvalB.signature.slice(1) };
  const badSignature = await a.evaluate(async args => {
    try {
      await window.EZERO_CONNECT_TRUST.saveTrustedContact({
        transcript: args.transcript,
        localApproval: args.localApproval,
        remoteApproval: args.remoteApproval,
        displayName: "Friend B",
        explicitConsent: true
      });
      return "ACCEPTED";
    } catch (error) { return error.message; }
  }, { transcript: first.transcriptA.transcript, localApproval: first.approvalA, remoteApproval: tampered });
  assert.equal(badSignature, "TRUST_APPROVAL_SIGNATURE_INVALID");

  const savedA = await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedContact({
    transcript: args.transcript,
    localApproval: args.localApproval,
    remoteApproval: args.remoteApproval,
    displayName: "Friend B",
    explicitConsent: true
  }), { transcript: first.transcriptA.transcript, localApproval: first.approvalA, remoteApproval: first.approvalB });
  const savedB = await b.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedContact({
    transcript: args.transcript,
    localApproval: args.localApproval,
    remoteApproval: args.remoteApproval,
    displayName: "Friend A",
    explicitConsent: true
  }), { transcript: first.transcriptB.transcript, localApproval: first.approvalB, remoteApproval: first.approvalA });
  assert.equal(savedA.relationshipId, savedB.relationshipId);

  const contactsA = await a.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts());
  const contactsB = await b.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts());
  assert.equal(contactsA[0].remoteFingerprint, identityB.fingerprint);
  assert.equal(contactsB[0].remoteFingerprint, identityA.fingerprint);
  assert.equal(contactsA[0].status, "TRUSTED");
  assert.equal(contactsB[0].status, "TRUSTED");
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityB.fingerprint), true);
  assert.equal(await b.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityA.fingerprint), true);

  const friendPhotoV1 = Uint8Array.from([0xff, 0xd8, 0xff, 0x11, 0x22, 0x33, 0xd9]);
  const friendPhotoV2 = Uint8Array.from([0xff, 0xd8, 0xff, 0x44, 0x55, 0x66, 0xd9]);
  await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedFriendProfile(args.id, args.fingerprint, args.bytes),
    { id: savedA.relationshipId, fingerprint: identityB.fingerprint, bytes: [...friendPhotoV1] });
  const persistedV1 = await a.evaluate(args => window.EZERO_CONNECT_TRUST.getTrustedFriendProfile(args.id, args.fingerprint),
    { id: savedA.relationshipId, fingerprint: identityB.fingerprint });
  assert.deepEqual([...persistedV1.bytes], [...friendPhotoV1]);
  await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedFriendProfile(args.id, args.fingerprint, args.bytes),
    { id: savedA.relationshipId, fingerprint: identityB.fingerprint, bytes: [...friendPhotoV2] });
  const persistedV2 = await a.evaluate(args => window.EZERO_CONNECT_TRUST.getTrustedFriendProfile(args.id, args.fingerprint),
    { id: savedA.relationshipId, fingerprint: identityB.fingerprint });
  assert.deepEqual([...persistedV2.bytes], [...friendPhotoV2]);
  assert.notEqual(persistedV2.updatedAt, "");
  await a.reload();
  await a.waitForFunction(() => Boolean(window.EZERO_CONNECT_TRUST));
  const afterReload = await a.evaluate(args => window.EZERO_CONNECT_TRUST.getTrustedFriendProfile(args.id, args.fingerprint),
    { id: savedA.relationshipId, fingerprint: identityB.fingerprint });
  assert.deepEqual([...afterReload.bytes], [...friendPhotoV2]);
  const wrongFriendPhotoIdentity = await a.evaluate(async args => {
    try { await window.EZERO_CONNECT_TRUST.saveTrustedFriendProfile(args.id, args.fingerprint, args.bytes); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, { id: savedA.relationshipId, fingerprint: identityA.fingerprint, bytes: [...friendPhotoV1] });
  assert.equal(wrongFriendPhotoIdentity, "TRUST_FRIEND_PROFILE_TRUST_MISMATCH");
  const invalidPhoto = await a.evaluate(async args => {
    try { await window.EZERO_CONNECT_TRUST.saveTrustedFriendProfile(args.id, args.fingerprint, args.bytes); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, { id: savedA.relationshipId, fingerprint: identityB.fingerprint, bytes: [1, 2, 3, 4] });
  assert.equal(invalidPhoto, "TRUST_FRIEND_PROFILE_JPEG_INVALID");

  const trustedPeerA = await a.evaluate(id => window.EZERO_CONNECT_TRUST.getTrustedContact(id), savedA.relationshipId);
  const trustedPeerB = await b.evaluate(id => window.EZERO_CONNECT_TRUST.getTrustedContact(id), savedB.relationshipId);
  assert.equal(trustedPeerA.relationshipId, savedA.relationshipId);
  assert.equal(trustedPeerA.remoteFingerprint, identityB.fingerprint);
  assert.equal(trustedPeerA.remotePublicKeySpki, identityB.publicKeySpki);
  assert.equal(trustedPeerA.status, "TRUSTED");
  assert.equal(trustedPeerB.remoteFingerprint, identityA.fingerprint);
  assert.equal(trustedPeerB.remotePublicKeySpki, identityA.publicKeySpki);
  const trustedPeerAFrozen = await a.evaluate(async id => Object.isFrozen(await window.EZERO_CONNECT_TRUST.getTrustedContact(id)), savedA.relationshipId);
  assert.equal(trustedPeerAFrozen, true);

  const unknownRelationship = await a.evaluate(async () => {
    try { await window.EZERO_CONNECT_TRUST.getTrustedContact("0".repeat(64)); return "ACCEPTED"; }
    catch (error) { return error.message; }
  });
  assert.equal(unknownRelationship, "TRUST_RELATIONSHIP_NOT_TRUSTED");

  const atRest = await a.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ezero-connect-trusted-contacts", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(["contacts", "vault", "friendProfiles"], "readonly");
      const contactsRequest = tx.objectStore("contacts").getAll();
      const vaultRequest = tx.objectStore("vault").get("local-aes-gcm-key");
      const friendProfileRequest = tx.objectStore("friendProfiles").getAll();
      tx.oncomplete = () => resolve({ contact: contactsRequest.result[0], vault: vaultRequest.result, friendProfile: friendProfileRequest.result[0] });
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return {
      contactKeys: Object.keys(result.contact).sort(),
      ciphertextBytes: result.contact.ciphertext.byteLength,
      vaultExtractable: result.vault.key.extractable,
      vaultAlgorithm: result.vault.key.algorithm.name,
      friendProfileKeys: Object.keys(result.friendProfile).sort(),
      friendProfileCiphertextBytes: result.friendProfile.ciphertext.byteLength
    };
  });
  assert.deepEqual(atRest.contactKeys, ["ciphertext", "iv", "relationshipId"]);
  assert.ok(atRest.ciphertextBytes > 0);
  assert.equal(atRest.vaultExtractable, false);
  assert.equal(atRest.vaultAlgorithm, "AES-GCM");
  assert.deepEqual(atRest.friendProfileKeys, ["ciphertext", "iv", "relationshipId"]);
  assert.ok(atRest.friendProfileCiphertextBytes > 0);

  await a.evaluate(fp => window.EZERO_CONNECT_TRUST.revoke(fp), identityB.fingerprint);
  const revokedProfileRead = await a.evaluate(async args => {
    try { await window.EZERO_CONNECT_TRUST.getTrustedFriendProfile(args.id, args.fingerprint); return "ACCEPTED"; }
    catch (error) { return error.message; }
  }, { id: savedA.relationshipId, fingerprint: identityB.fingerprint });
  assert.equal(revokedProfileRead, "TRUST_RELATIONSHIP_NOT_TRUSTED");
  const revokedPhotoCount = await a.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ezero-connect-trusted-contacts", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const count = await new Promise((resolve, reject) => {
      const request = db.transaction("friendProfiles", "readonly").objectStore("friendProfiles").count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return count;
  });
  assert.equal(revokedPhotoCount, 0);
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityB.fingerprint), false);
  await b.evaluate(fp => window.EZERO_CONNECT_TRUST.block(fp), identityA.fingerprint);
  assert.equal(await b.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityA.fingerprint), false);
  await b.evaluate(fp => window.EZERO_CONNECT_TRUST.unblock(fp), identityA.fingerprint);
  assert.equal(await b.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityA.fingerprint), false);

  const second = await pairAndSave();
  const reSavedA = await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedContact({
    transcript: args.transcript, localApproval: args.localApproval,
    remoteApproval: args.remoteApproval, displayName: "Friend B", explicitConsent: true
  }), { transcript: second.transcriptA.transcript, localApproval: second.approvalA, remoteApproval: second.approvalB });
  const reSavedB = await b.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedContact({
    transcript: args.transcript, localApproval: args.localApproval,
    remoteApproval: args.remoteApproval, displayName: "Friend A", explicitConsent: true
  }), { transcript: second.transcriptB.transcript, localApproval: second.approvalB, remoteApproval: second.approvalA });
  assert.equal(reSavedA.relationshipId, reSavedB.relationshipId);
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityB.fingerprint), true);
  assert.equal(await b.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityA.fingerprint), true);

  console.log("EZERO_MUTUAL_TRUST_TWO_PROFILE_ENCRYPTED_CONTACT_REVOCATION_PASS");
  console.log("EZERO_FRIEND_DP_ENCRYPTED_PERSISTENCE_UPDATE_TRUST_GATE_PASS");
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
