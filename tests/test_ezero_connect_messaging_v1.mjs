import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { createMessagingController } from "../js/ezero_connect_messaging_v1.mjs";
globalThis.crypto = webcrypto;
const enc = new TextEncoder();
const b64u = bytes => Buffer.from(bytes).toString("base64url");
function canonical(v) {
  if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
  if (typeof v === "number" && Number.isFinite(v)) return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}";
}
const fingerprint = async spki => [...new Uint8Array(await crypto.subtle.digest("SHA-256", spki))]
  .map(x => x.toString(16).padStart(2, "0").toUpperCase()).join(":");
async function makeDevice() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  return {
    identity: { fingerprint: await fingerprint(spki), publicKeySpki: b64u(spki) },
    signCanonical: async value => b64u(await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, enc.encode(canonical(value))
    ))
  };
}
class Channel extends EventTarget {
  constructor() { super(); this.readyState="open"; this.ordered=true; this.maxRetransmits=null; this.maxPacketLifeTime=null; }
  send(data) { queueMicrotask(() => this.peer.dispatchEvent(new MessageEvent("message", { data }))); }
  close() { if(this.readyState==="closed") return; this.readyState="closed"; this.dispatchEvent(new Event("close")); }
}
const relationshipId = "b".repeat(64);
const a = await makeDevice(), b = await makeDevice();
const trustFor = remote => ({ getTrustedContact: async id => {
  if (id !== relationshipId) throw new Error("WRONG_RELATIONSHIP");
  return { relationshipId, status:"TRUSTED", remoteFingerprint:remote.identity.fingerprint, remotePublicKeySpki:remote.identity.publicKeySpki };
}});
const identityApi = device => ({ getPublicIdentity: async()=>device.identity, signCanonical:device.signCanonical });
const left = new Channel(), right = new Channel(); left.peer=right; right.peer=left;
const received = [];
const controllerA = createMessagingController({ trustApi:trustFor(b), identityApi:identityApi(a) });
const controllerB = createMessagingController({ trustApi:trustFor(a), identityApi:identityApi(b) });
controllerB.subscribe(async item => { received.push(item); });
const attachB = controllerB.attach({ relationshipId, channel:right, role:"responder" });
await controllerA.attach({ relationshipId, channel:left, role:"initiator" });
await attachB;
assert.equal(controllerA.state, "secure");
assert.equal(controllerB.state, "secure");
assert.equal((await controllerA.sendText("السلام علیکم")).status, "DELIVERED");
assert.equal(received[0].type, "text");
assert.equal(new TextDecoder().decode(received[0].bytes), "السلام علیکم");
assert.equal((await controllerA.sendVoice(Uint8Array.from([1,2,3,4]))).status, "DELIVERED");
assert.deepEqual([...received[1].bytes], [1,2,3,4]);
controllerA.close(); controllerB.close();
await assert.rejects(() => controllerA.sendText("blocked"), /E2E_MESSAGING_NOT_CONNECTED/);
const untrusted = createMessagingController({
  trustApi:{getTrustedContact:async()=>{throw new Error("TRUST_RELATIONSHIP_NOT_TRUSTED");}},
  identityApi:identityApi(a)
});
await assert.rejects(()=>untrusted.attach({relationshipId,channel:new Channel(),role:"initiator"}),/TRUST_RELATIONSHIP_NOT_TRUSTED/);
console.log("EZERO_MESSAGING_CONTROLLER_TRUSTED_TEXT_VOICE_ACK_AND_FAIL_CLOSED_PASS");
