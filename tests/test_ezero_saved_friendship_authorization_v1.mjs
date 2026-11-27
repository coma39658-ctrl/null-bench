import assert from "node:assert/strict";
import { authorizeSavedFriendshipForCall } from "../signaling/ezero-connect-v1/saved_friendship_authorization_v1.mjs";

const invite = {
  callerFingerprint: "AA:".repeat(31) + "01",
  recipientFingerprint: "BB:".repeat(31) + "02",
  relationshipId: "relationship_1234567890",
  callId: "A".repeat(32),
  nonce: "B".repeat(32),
  mode: "audio",
  expiresAt: Date.now() + 20_000
};
let requestSeen;
const env = {
  FRIENDSHIP_REGISTRY: {
    async fetch(url, init) {
      requestSeen = { url, init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({
        authorized: true,
        relationshipId: invite.relationshipId
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  }
};
const result = await authorizeSavedFriendshipForCall(env, invite);
assert.deepEqual(result, { authorized: true, relationshipId: invite.relationshipId });
assert.equal(requestSeen.url, "https://friendship-registry.internal/v1/authorize-call");
assert.equal(requestSeen.init.method, "POST");
assert.equal(requestSeen.body.protocol, "E-ZERO-SAVED-FRIEND-AUTH-1");
assert.equal(requestSeen.body.callerFingerprint, invite.callerFingerprint);
assert.equal(requestSeen.body.recipientFingerprint, invite.recipientFingerprint);

await assert.rejects(
  () => authorizeSavedFriendshipForCall({}, invite),
  /FRIENDSHIP_REGISTRY_UNAVAILABLE/
);
await assert.rejects(
  () => authorizeSavedFriendshipForCall({ FRIENDSHIP_REGISTRY: { fetch: async () => new Response("no", { status: 403 }) } }, invite),
  /FRIENDSHIP_REGISTRY_REJECTED/
);
await assert.rejects(
  () => authorizeSavedFriendshipForCall({ FRIENDSHIP_REGISTRY: { fetch: async () => new Response(JSON.stringify({ authorized: true, relationshipId: "wrong" }), { status: 200 }) } }, invite),
  /FRIENDSHIP_REGISTRY_RESPONSE_INVALID/
);
await assert.rejects(
  () => authorizeSavedFriendshipForCall(env, { ...invite, expiresAt: Date.now() - 1 }),
  /FRIENDSHIP_INVITE_INVALID/
);
await assert.rejects(
  () => authorizeSavedFriendshipForCall(env, { ...invite, callerFingerprint: "not-a-fingerprint" }),
  /FRIENDSHIP_INVITE_INVALID/
);
console.log("EZERO_SERVER_AUTHORITATIVE_FRIENDSHIP_GATE_PASS");
