import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const contexts = [];
try {
  async function phone() {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    contexts.push(context);
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.EZERO_CONNECT_CONFIG = { signalingUrl: "ws://127.0.0.1:8787" };
      window.__mediaCalls = 0;
      const media = navigator.mediaDevices;
      if (media?.getUserMedia) {
        const original = media.getUserMedia.bind(media);
        media.getUserMedia = (...args) => { window.__mediaCalls++; return original(...args); };
      }
    });
    await page.goto("http://127.0.0.1:8769/ezero-connect-app.html");
    await page.waitForFunction(() => Boolean(
      window.EZERO_CONNECT_SIGNALING && window.EZERO_CONNECT_TRUST &&
      window.EZERO_CONNECT_IDENTITY && window.EZERO_CONNECT_INVITES
    ));
    await page.locator("#identityConsent").check();
    await page.locator("#createIdentity").click();
    await page.waitForFunction(() => document.querySelector("#identityFingerprint").textContent.length > 30);
    return page;
  }

  const a = await phone();
  const b = await phone();
  const identityA = await a.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  const identityB = await b.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  const invite = await a.evaluate(() => window.EZERO_CONNECT_INVITES.createInvite());
  const verified = await b.evaluate(code => window.EZERO_CONNECT_INVITES.verifyInvite(code), invite.inviteCode);

  await a.evaluate(args => {
    const session = window.EZERO_CONNECT_SIGNALING.connect({
      role: "host", inviteCode: args.inviteCode, inviteMetadata: args.metadata
    });
    window.__ezeroSignal = session;
    session.on("peer-ready", peer => { window.__ezeroPeer = peer; });
    session.on("message", message => { window.__ezeroMessage = message; });
    session.on("room-closed", event => { window.__ezeroRoomClosed = event; });
    session.on("error", error => { window.__ezeroSignalError = error.message; });
  }, { inviteCode: invite.inviteCode, metadata: invite });

  await b.evaluate(args => {
    const session = window.EZERO_CONNECT_SIGNALING.connect({
      role: "guest", inviteCode: args.inviteCode, inviteMetadata: args.metadata
    });
    window.__ezeroSignal = session;
    session.on("peer-ready", peer => { window.__ezeroPeer = peer; });
    session.on("message", message => { window.__ezeroMessage = message; });
    session.on("room-closed", event => { window.__ezeroRoomClosed = event; });
    session.on("error", error => { window.__ezeroSignalError = error.message; });
  }, { inviteCode: invite.inviteCode, metadata: verified });

  await a.waitForFunction(() => window.__ezeroSignal?.ready);
  await b.waitForFunction(() => window.__ezeroSignal?.ready);
  await Promise.all([
    a.evaluate(() => window.__ezeroSignal.ready.then(() => true)),
    b.evaluate(() => window.__ezeroSignal.ready.then(() => true))
  ]);
  await a.waitForFunction(() => Boolean(window.__ezeroPeer));
  await b.waitForFunction(() => Boolean(window.__ezeroPeer));
  const peerA = await a.evaluate(() => window.__ezeroPeer);
  const peerB = await b.evaluate(() => window.__ezeroPeer);
  assert.equal(peerA.fingerprint, identityB.fingerprint);
  assert.equal(peerB.fingerprint, identityA.fingerprint);
  assert.equal(peerA.role, "guest");
  assert.equal(peerB.role, "host");

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

  await a.evaluate(args => window.__ezeroSignal.send("trust-request", {
    transcript: args.transcript, approval: args.approval
  }), { transcript: transcriptA.transcript, approval: approvalA });
  await b.waitForFunction(() => window.__ezeroMessage?.type === "trust-request");
  const requestMessage = await b.evaluate(() => window.__ezeroMessage);
  assert.equal(await b.evaluate(args =>
    window.EZERO_CONNECT_TRUST.verifyApproval(args.transcript, args.approval),
    { transcript: transcriptB.transcript, approval: requestMessage.payload.approval }
  ), true);

  await b.evaluate(args => window.__ezeroSignal.send("trust-approval", {
    transcript: args.transcript, approval: args.approval
  }), { transcript: transcriptB.transcript, approval: approvalB });
  await a.waitForFunction(() => window.__ezeroMessage?.type === "trust-approval");
  const responseMessage = await a.evaluate(() => window.__ezeroMessage);
  assert.equal(await a.evaluate(args =>
    window.EZERO_CONNECT_TRUST.verifyApproval(args.transcript, args.approval),
    { transcript: transcriptA.transcript, approval: responseMessage.payload.approval }
  ), true);

  const savedA = await a.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedContact({
    transcript: args.transcript, localApproval: args.localApproval,
    remoteApproval: args.remoteApproval, displayName: "Phone B", explicitConsent: true
  }), { transcript: transcriptA.transcript, localApproval: approvalA, remoteApproval: approvalB });
  const savedB = await b.evaluate(args => window.EZERO_CONNECT_TRUST.saveTrustedContact({
    transcript: args.transcript, localApproval: args.localApproval,
    remoteApproval: args.remoteApproval, displayName: "Phone A", explicitConsent: true
  }), { transcript: transcriptB.transcript, localApproval: approvalB, remoteApproval: approvalA });
  assert.equal(savedA.relationshipId, savedB.relationshipId);
  assert.equal(await a.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityB.fingerprint), true);
  assert.equal(await b.evaluate(fp => window.EZERO_CONNECT_TRUST.canReconnect(fp), identityA.fingerprint), true);

  // Simulate a same-device page refresh while its old authenticated socket is
  // still open. The verified device must replace its own stale socket without
  // causing the other phone to see a false peer-disconnected state.
  const aReconnect = await a.context().newPage();
  await aReconnect.addInitScript(() => {
    window.EZERO_CONNECT_CONFIG = { signalingUrl: "ws://127.0.0.1:8787" };
  });
  await aReconnect.goto("http://127.0.0.1:8769/ezero-connect-app.html");
  await aReconnect.waitForFunction(() => Boolean(
    window.EZERO_CONNECT_SIGNALING && window.EZERO_CONNECT_IDENTITY && window.EZERO_CONNECT_INVITES
  ));
  const reconnectIdentity = await aReconnect.evaluate(() => window.EZERO_CONNECT_IDENTITY.getPublicIdentity());
  assert.equal(reconnectIdentity.fingerprint, identityA.fingerprint,
    "a second page in the same device context must retain the same cryptographic identity");
  await aReconnect.evaluate(args => {
    const session = window.EZERO_CONNECT_SIGNALING.connect({
      role: "host", inviteCode: args.inviteCode, inviteMetadata: args.metadata
    });
    window.__ezeroSignal = session;
    session.on("peer-ready", peer => { window.__ezeroPeer = peer; });
    session.on("error", error => { window.__ezeroSignalError = error.message; });
    session.ready.then(() => { window.__ezeroReady = true; })
      .catch(error => { window.__ezeroReadyRejected = error.message; });
  }, { inviteCode: invite.inviteCode, metadata: invite });
  await aReconnect.waitForFunction(() => window.__ezeroReady === true, null, { timeout: 10000 });
  await aReconnect.waitForFunction(() => Boolean(window.__ezeroPeer), null, { timeout: 10000 });
  await b.waitForFunction(() => window.__ezeroPeer?.fingerprint === identityA.fingerprint, null, { timeout: 10000 });

  // A third, different device must not take over the already-bound guest
  // identity by replaying the same signed QR/nonce.
  const c = await phone();
  await c.evaluate(args => {
    const session = window.EZERO_CONNECT_SIGNALING.connect({
      role: "guest", inviteCode: args.inviteCode, inviteMetadata: args.metadata
    });
    window.__ezeroSignal = session;
    session.on("error", error => { window.__ezeroSignalError = error.message; });
    session.ready.catch(error => { window.__ezeroReadyRejected = error.message; });
  }, { inviteCode: invite.inviteCode, metadata: verified });
  await c.waitForFunction(() => Boolean(window.__ezeroReadyRejected), null, { timeout: 10000 });
  assert.equal(await c.evaluate(() => window.__ezeroReadyRejected), "SIGNAL_SERVER_HANDSHAKE_IDENTITY_PROOF_REJECTED");

  // Race two distinct guest identities against a fresh invite at the same time.
  // Exactly one guest may complete the first authenticated handshake.
  const host2 = await phone();
  const guest2a = await phone();
  const guest2b = await phone();
  const invite2 = await host2.evaluate(() => window.EZERO_CONNECT_INVITES.createInvite());
  const verified2a = await guest2a.evaluate(code => window.EZERO_CONNECT_INVITES.verifyInvite(code), invite2.inviteCode);
  const verified2b = await guest2b.evaluate(code => window.EZERO_CONNECT_INVITES.verifyInvite(code), invite2.inviteCode);
  await host2.evaluate(args => {
    const session = window.EZERO_CONNECT_SIGNALING.connect({
      role: "host", inviteCode: args.inviteCode, inviteMetadata: args.metadata
    });
    window.__ezeroSignal = session;
    session.ready.then(() => { window.__ezeroReady = true; })
      .catch(error => { window.__ezeroReadyRejected = error.message; });
  }, { inviteCode: invite2.inviteCode, metadata: invite2 });
  await host2.waitForFunction(() => window.__ezeroReady === true, null, { timeout: 10000 });
  await Promise.all([guest2a, guest2b].map((page, index) => page.evaluate(args => {
    const session = window.EZERO_CONNECT_SIGNALING.connect({
      role: "guest", inviteCode: args.inviteCode, inviteMetadata: args.metadata
    });
    window.__ezeroSignal = session;
    session.ready.then(() => { window.__ezeroReady = true; })
      .catch(error => { window.__ezeroReadyRejected = error.message; });
  }, { inviteCode: invite2.inviteCode, metadata: index === 0 ? verified2a : verified2b })));
  const racePages = [guest2a, guest2b];
  await Promise.all(racePages.map(page => page.waitForFunction(
    () => window.__ezeroReady === true || Boolean(window.__ezeroReadyRejected), null, { timeout: 10000 }
  )));
  const raceResults = await Promise.all(racePages.map(page => page.evaluate(async () => {
    return window.__ezeroReady === true ? "ACCEPTED" : (window.__ezeroReadyRejected || "REJECTED");
  })));
  assert.equal(raceResults.filter(value => value === "ACCEPTED").length, 1,
    "Only one simultaneous guest identity may claim a signed invite");
  assert.equal(raceResults.filter(value => value !== "ACCEPTED").length, 1,
    "The competing guest identity must be rejected");
  await host2.waitForFunction(() => Boolean(window.__ezeroSignal?.ready), null, { timeout: 10000 });
  await host2.evaluate(() => window.__ezeroSignal.send("hangup", {}));

  await aReconnect.evaluate(() => window.__ezeroSignal.send("hangup", {}));
  await b.waitForFunction(() => Boolean(window.__ezeroRoomClosed));
  await aReconnect.waitForFunction(() => Boolean(window.__ezeroRoomClosed));
  assert.equal(await a.evaluate(() => window.__mediaCalls), 0);
  assert.equal(await aReconnect.evaluate(() => window.__mediaCalls), 0);
  assert.equal(await b.evaluate(() => window.__mediaCalls), 0);
  assert.equal(await aReconnect.evaluate(() => window.__ezeroSignalError || null), null);
  assert.equal(await b.evaluate(() => window.__ezeroSignalError || null), null);

  console.log("EZERO_LOCAL_WORKER_TWO_BROWSER_TRUST_RELAY_PASS");
} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
