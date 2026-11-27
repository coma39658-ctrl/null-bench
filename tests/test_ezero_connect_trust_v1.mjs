import assert from "node:assert/strict";
import { createPublicKey, verify as verifySignature } from "node:crypto";

function stableCanonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
  return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stableCanonical(value[key])).join(",") + "}";
}
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

  const atRest = await a.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("ezero-connect-trusted-contacts", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(["contacts", "vault"], "readonly");
      const contactsRequest = tx.objectStore("contacts").getAll();
      const vaultRequest = tx.objectStore("vault").get("local-aes-gcm-key");
      tx.oncomplete = () => resolve({ contact: contactsRequest.result[0], vault: vaultRequest.result });
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return {
      contactKeys: Object.keys(result.contact).sort(),
      ciphertextBytes: result.contact.ciphertext.byteLength,
      vaultExtractable: result.vault.key.extractable,
      vaultAlgorithm: result.vault.key.algorithm.name
    };
  });
  assert.deepEqual(atRest.contactKeys, ["ciphertext", "iv", "relationshipId"]);
  assert.ok(atRest.ciphertextBytes > 0);
  assert.equal(atRest.vaultExtractable, false);
  assert.equal(atRest.vaultAlgorithm, "AES-GCM");

  await a.evaluate(fp => window.EZERO_CONNECT_TRUST.revoke(fp), identityB.fingerprint);
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


  // V2: the invite creator and QR scanner have already supplied the two deliberate
  // consent actions. Each phone verifies the other phone's Worker-accepted signed
  // challenge proof, then saves locally without approval buttons or a save checkbox.
  const autoInvite = await a.evaluate(() => window.EZERO_CONNECT_INVITES.createInvite());
  const autoVerified = await b.evaluate(code => window.EZERO_CONNECT_INVITES.verifyInvite(code), autoInvite.inviteCode);

  async function signedPeerHandshake(page, invite, role) {
    return page.evaluate(async ({ invite, role }) => {
      const identity = await window.EZERO_CONNECT_IDENTITY.getPublicIdentity();
      const random = crypto.getRandomValues(new Uint8Array(32));
      let binary = "";
      for (const byte of random) binary += String.fromCharCode(byte);
      const challenge = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
      const payload = {
        v: 1,
        protocol: "E-ZERO-SIGNAL-HELLO-1",
        origin: invite.origin,
        roomId: invite.roomId,
        inviteNonce: invite.nonce,
        role,
        fingerprint: identity.fingerprint,
        publicKeySpki: identity.publicKeySpki,
        challenge,
        challengeExpiresAt: Date.now() + 30_000
      };
      return { payload, signature: await window.EZERO_CONNECT_IDENTITY.signCanonical(payload) };
    }, { invite, role });
  }

  const guestProof = await signedPeerHandshake(b, autoVerified, "guest");
  const hostProof = await signedPeerHandshake(a, autoInvite, "host");
  const autoSavedA = await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
    invitePayload: args.invite,
    peerHandshake: args.proof,
    localRole: "host",
    peerFingerprint: args.peerFingerprint,
    peerPublicKeySpki: args.peerPublicKeySpki
  }), { invite: autoInvite, proof: guestProof, peerFingerprint: identityB.fingerprint, peerPublicKeySpki: identityB.publicKeySpki });
  const autoSavedB = await b.evaluate(args => window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
    invitePayload: args.invite,
    peerHandshake: args.proof,
    localRole: "guest",
    peerFingerprint: args.peerFingerprint,
    peerPublicKeySpki: args.peerPublicKeySpki
  }), { invite: autoVerified, proof: hostProof, peerFingerprint: identityA.fingerprint, peerPublicKeySpki: identityA.publicKeySpki });
  assert.equal(autoSavedA.status, "TRUSTED");
  assert.equal(autoSavedB.status, "TRUSTED");
  assert.equal(autoSavedA.relationshipId, autoSavedB.relationshipId);
  const deniedExport = await a.evaluate(fp => window.EZERO_CONNECT_TRUST.exportTrustedContactBundle({
    remoteFingerprint: fp, explicitConsent: false
  }).then(() => "ACCEPTED").catch(error => error.message), identityB.fingerprint);
  assert.equal(deniedExport, "TRUST_EXPORT_EXPLICIT_CONSENT_REQUIRED");
  const exportedBundle = await a.evaluate(fp => window.EZERO_CONNECT_TRUST.exportTrustedContactBundle({
    remoteFingerprint: fp, explicitConsent: true
  }), identityB.fingerprint);
  assert.ok(exportedBundle.startsWith("EZERO-ANDROID-TRUST1."));
  const exportedEnvelope = JSON.parse(Buffer.from(
    exportedBundle.slice("EZERO-ANDROID-TRUST1.".length), "base64url"
  ).toString("utf8"));
  assert.equal(exportedEnvelope.payload.protocol, "E-ZERO-ANDROID-TRUST-BUNDLE-1");
  assert.equal(exportedEnvelope.payload.remoteFingerprint, identityB.fingerprint);
  assert.equal(exportedEnvelope.payload.relationshipId, autoSavedA.relationshipId);
  assert.equal(exportedEnvelope.payload.trustVersion, 2);
  const rootPublicKey = createPublicKey({
    key: Buffer.from(exportedEnvelope.payload.rootSpki, "base64url"),
    format: "der",
    type: "spki"
  });
  assert.equal(verifySignature(
    "sha256",
    Buffer.from(stableCanonical(exportedEnvelope.payload), "utf8"),
    { key: rootPublicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(exportedEnvelope.signature, "base64url")
  ), true);

  const callPeerA = await a.evaluate(fp => window.EZERO_CONNECT_TRUST.getTrustedPeerForCall(fp), identityB.fingerprint);
  const callPeerB = await b.evaluate(fp => window.EZERO_CONNECT_TRUST.getTrustedPeerForCall(fp), identityA.fingerprint);
  assert.deepEqual(Object.keys(callPeerA).sort(), ["displayName","relationshipId","remoteFingerprint","remotePublicKeySpki"]);
  assert.equal(callPeerA.relationshipId, autoSavedA.relationshipId);
  assert.equal(callPeerA.remoteFingerprint, identityB.fingerprint);
  assert.equal(callPeerA.remotePublicKeySpki, identityB.publicKeySpki);
  assert.equal(callPeerB.remoteFingerprint, identityA.fingerprint);
  assert.equal(callPeerB.remotePublicKeySpki, identityA.publicKeySpki);
  assert.equal(await a.evaluate(() => window.EZERO_CONNECT_TRUST.getTrustedPeerForCall("invalid")), null);
  const duplicateAutoSave = await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
    invitePayload: args.invite,
    peerHandshake: args.proof,
    localRole: "host",
    peerFingerprint: args.peerFingerprint,
    peerPublicKeySpki: args.peerPublicKeySpki
  }), { invite: autoInvite, proof: guestProof, peerFingerprint: identityB.fingerprint, peerPublicKeySpki: identityB.publicKeySpki });
  assert.equal(duplicateAutoSave.alreadySaved, true);

  // A fresh QR from the same already-trusted device must not create a second
  // active contact row for that fingerprint.
  const secondInvite = await a.evaluate(() => window.EZERO_CONNECT_INVITES.createInvite());
  const secondVerified = await b.evaluate(code => window.EZERO_CONNECT_INVITES.verifyInvite(code), secondInvite.inviteCode);
  const secondGuestProof = await signedPeerHandshake(b, secondVerified, "guest");
  const freshQrSave = await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
    invitePayload: args.invite, peerHandshake: args.proof, localRole: "host",
    peerFingerprint: args.peerFingerprint, peerPublicKeySpki: args.peerPublicKeySpki
  }), { invite: secondInvite, proof: secondGuestProof, peerFingerprint: identityB.fingerprint, peerPublicKeySpki: identityB.publicKeySpki });
  assert.equal(freshQrSave.status, "TRUSTED");
  assert.equal(freshQrSave.alreadySaved, true);
  assert.equal(freshQrSave.relationshipId, autoSavedA.relationshipId);
  const activeContactsAfterFreshQr = await a.evaluate(() => window.EZERO_CONNECT_TRUST.listTrustedContacts());
  assert.equal(activeContactsAfterFreshQr.filter(c => c.remoteFingerprint === identityB.fingerprint && c.status === "TRUSTED").length, 1);

  const invalidPeerProof = { ...guestProof, signature: (guestProof.signature[0] === "A" ? "B" : "A") + guestProof.signature.slice(1) };
  const invalidPeerResult = await a.evaluate(async args => {
    try {
      await window.EZERO_CONNECT_TRUST.saveVerifiedPeer({
        invitePayload: args.invite, peerHandshake: args.proof, localRole: "host",
        peerFingerprint: args.peerFingerprint, peerPublicKeySpki: args.peerPublicKeySpki
      });
      return "ACCEPTED";
    } catch (error) { return error.message; }
  }, { invite: autoInvite, proof: invalidPeerProof, peerFingerprint: identityB.fingerprint, peerPublicKeySpki: identityB.publicKeySpki });
  assert.equal(invalidPeerResult, "TRUST_V2_PEER_SIGNATURE_INVALID");

  await a.evaluate(fp => window.EZERO_CONNECT_TRUST.block(fp), identityB.fingerprint);
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.getTrustedPeerForCall(fp), identityB.fingerprint), null);
  await a.evaluate(fp => window.EZERO_CONNECT_TRUST.unblock(fp), identityB.fingerprint);
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.getTrustedPeerForCall(fp), identityB.fingerprint), null);
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityB.fingerprint), false);

  console.log("EZERO_MUTUAL_TRUST_TWO_PROFILE_ENCRYPTED_CONTACT_REVOCATION_PASS");
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
