import test from "node:test";
import assert from "node:assert/strict";
import {
  generateKeyPairSync, sign as cryptoSign, verify as cryptoVerify
} from "node:crypto";

const ALLOWED = new Set(["wake_v", "call_id", "mode", "expires_at", "nonce", "server_sig"]);
const CALL_ID = /^[A-Za-z0-9_-]{8,128}$/;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;

function canonicalWake({wake_v, call_id, mode, expires_at, nonce}) {
  return Buffer.from(
    "EZERO_CALL_WAKE_V1\n" +
    `wake_v=${wake_v}\n` +
    `call_id=${call_id}\n` +
    `mode=${mode}\n` +
    `expires_at=${expires_at}\n` +
    `nonce=${nonce}\n`,
    "utf8"
  );
}

function validWake(fields, now) {
  if (!fields || fields.wake_v !== "1") return false;
  if (typeof fields.call_id !== "string" || !CALL_ID.test(fields.call_id)) return false;
  if (fields.mode !== "AUDIO" && fields.mode !== "VIDEO") return false;
  if (typeof fields.expires_at !== "string" || !/^[0-9]{13}$/.test(fields.expires_at)) return false;
  const expiry = Number(fields.expires_at);
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry - now > 120000) return false;
  if (typeof fields.nonce !== "string" || !NONCE.test(fields.nonce)) return false;
  return true;
}

function senderPayload(fields, privateKey) {
  const unsigned = {
    wake_v: fields.wake_v,
    call_id: fields.call_id,
    mode: fields.mode,
    expires_at: fields.expires_at,
    nonce: fields.nonce
  };
  const signature = cryptoSign("sha256", canonicalWake(unsigned), {
    key: privateKey, dsaEncoding: "der"
  }).toString("base64url");
  return {...unsigned, server_sig: signature};
}

test("canonical bytes are UTF-8, ordered, LF-only, and end with LF", () => {
  const bytes = canonicalWake({
    wake_v: "1", call_id: "call_12345678", mode: "AUDIO",
    expires_at: "1795555555000", nonce: "abcdefghijklmnopQRST"
  });
  assert.equal(bytes.toString("utf8"),
    "EZERO_CALL_WAKE_V1\nwake_v=1\ncall_id=call_12345678\nmode=AUDIO\nexpires_at=1795555555000\nnonce=abcdefghijklmnopQRST\n");
  assert.equal(bytes.at(-1), 0x0a);
  assert.equal(bytes.includes(0x0d), false);
});

test("deterministic test key signs DER ECDSA and Android-compatible canonical bytes", () => {
  const {publicKey, privateKey} = generateKeyPairSync("ec", {namedCurve:"prime256v1"});
  const fields = {
    wake_v:"1", call_id:"call_12345678", mode:"VIDEO",
    expires_at:"1795555555000", nonce:"abcdefghijklmnopQRST"
  };
  const payload = senderPayload(fields, privateKey);
  const signature = Buffer.from(payload.server_sig, "base64url");
  assert.ok(signature.length > 0 && signature.length <= 256);
  assert.equal(cryptoVerify("sha256", canonicalWake(fields), publicKey, signature), true);
  assert.equal(cryptoVerify("sha256", canonicalWake({...fields, mode:"AUDIO"}), publicKey, signature), false);
});

test("rejects malformed, expired, and overlong wake fields", () => {
  const now = 1795555550000;
  const good = {wake_v:"1",call_id:"call_12345678",mode:"AUDIO",expires_at:String(now+120000),nonce:"abcdefghijklmnopQRST"};
  assert.equal(validWake(good, now), true);
  for (const patch of [
    {wake_v:"2"}, {call_id:"short"}, {mode:"TEXT"},
    {expires_at:String(now)}, {expires_at:String(now+120001)},
    {expires_at:"1e12"}, {nonce:"tiny"}
  ]) assert.equal(validWake({...good,...patch}, now), false);
});

test("sender payload is data-minimal and excludes aliases, tokens, and invite material", () => {
  const {privateKey} = generateKeyPairSync("ec", {namedCurve:"prime256v1"});
  const payload = senderPayload({
    wake_v:"1", call_id:"call_12345678", mode:"AUDIO",
    expires_at:"1795555555000", nonce:"abcdefghijklmnopQRST",
    caller_alias:"untrusted", fcm_token:"secret", invite:"private"
  }, privateKey);
  assert.deepEqual(Object.keys(payload).sort(), [...ALLOWED].sort());
  assert.equal("caller_alias" in payload, false);
  assert.equal("fcm_token" in payload, false);
  assert.equal("invite" in payload, false);
});

test("unknown fields do not change the signed canonical bytes", () => {
  const base = {wake_v:"1",call_id:"call_12345678",mode:"AUDIO",expires_at:"1795555555000",nonce:"abcdefghijklmnopQRST"};
  assert.deepEqual(canonicalWake(base), canonicalWake({...base, caller_alias:"ignored", extra:"ignored"}));
});
