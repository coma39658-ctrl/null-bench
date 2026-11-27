// E-ZERO call-wake V1 signing primitive. Server-side only; no HTTP route or FCM sender.
const CALL_ID = /^[A-Za-z0-9_-]{8,128}$/;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;
const encoder = new TextEncoder();

export function canonicalCallWakeV1({ wake_v, call_id, mode, expires_at, nonce }) {
  if (wake_v !== "1" || !CALL_ID.test(call_id || "") ||
      !["AUDIO", "VIDEO"].includes(mode) ||
      !/^\d{13}$/.test(String(expires_at)) || !NONCE.test(nonce || "")) {
    throw new TypeError("Invalid E-ZERO call-wake fields");
  }
  return encoder.encode(
    "EZERO_CALL_WAKE_V1\n" +
    `wake_v=${wake_v}\n` +
    `call_id=${call_id}\n` +
    `mode=${mode}\n` +
    `expires_at=${expires_at}\n` +
    `nonce=${nonce}\n`
  );
}

// WebCrypto ECDSA returns IEEE-P1363 (r || s); Android SHA256withECDSA expects ASN.1 DER.
function p1363ToDer(signature) {
  if (!(signature instanceof Uint8Array) || signature.length !== 64) {
    throw new TypeError("Invalid P-256 P1363 signature length");
  }
  const integer = (part) => {
    let first = 0;
    while (first < part.length - 1 && part[first] === 0) first += 1;
    let value = part.slice(first);
    if (value[0] & 0x80) {
      const padded = new Uint8Array(value.length + 1);
      padded.set(value, 1);
      value = padded;
    }
    const encoded = new Uint8Array(2 + value.length);
    encoded[0] = 0x02;
    encoded[1] = value.length;
    encoded.set(value, 2);
    return encoded;
  };
  const r = integer(signature.slice(0, 32));
  const s = integer(signature.slice(32, 64));
  const body = new Uint8Array(r.length + s.length);
  body.set(r, 0);
  body.set(s, r.length);
  const der = new Uint8Array(2 + body.length);
  der[0] = 0x30;
  der[1] = body.length;
  der.set(body, 2);
  return der;
}

// privateKey must be a non-exported/imported server-side P-256 ECDSA signing key.
// The caller must atomically reserve call_id + nonce in durable storage BEFORE
// sending this envelope. This helper intentionally does not send FCM or persist state.
export async function signCallWakeV1({ privateKey, call_id, mode, nonce, nowMillis = Date.now() }) {
  if (!privateKey || privateKey.type !== "private" || privateKey.algorithm?.name !== "ECDSA" ||
      privateKey.algorithm?.namedCurve !== "P-256" || !privateKey.usages.includes("sign")) {
    throw new TypeError("A server-side P-256 ECDSA private signing key is required");
  }
  if (!Number.isSafeInteger(nowMillis) || nowMillis < 0) throw new TypeError("Invalid clock");
  const fields = {
    wake_v: "1",
    call_id,
    mode,
    expires_at: String(nowMillis + 90_000),
    nonce
  };
  const bytes = canonicalCallWakeV1(fields);
  const p1363Signature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, privateKey, bytes
  ));
  const signature = p1363ToDer(p1363Signature);
  let binary = "";
  for (const byte of signature) binary += String.fromCharCode(byte);
  const server_sig = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return { ...fields, server_sig };
}
