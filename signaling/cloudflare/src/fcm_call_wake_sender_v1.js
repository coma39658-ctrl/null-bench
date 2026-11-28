const encoder = new TextEncoder();
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALL_ID = /^[A-Za-z0-9_-]{8,128}$/;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function decodeBase64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("FCM_SECRET_ENCODING_INVALID");
  }
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") +
    "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("FCM_SECRET_ENCODING_INVALID"); }
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function pemPkcs8Bytes(pem) {
  if (typeof pem !== "string" || !pem.includes("-----BEGIN PRIVATE KEY-----") ||
      !pem.includes("-----END PRIVATE KEY-----")) {
    throw new Error("FCM_SERVICE_ACCOUNT_KEY_INVALID");
  }
  const body = pem.replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "").replace(/\s/g, "");
  try {
    const binary = atob(body);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  } catch (_) {
    throw new Error("FCM_SERVICE_ACCOUNT_KEY_INVALID");
  }
}

function derInteger(raw) {
  let start = 0;
  while (start < raw.length - 1 && raw[start] === 0) start++;
  let value = raw.slice(start);
  if (value[0] & 0x80) value = Uint8Array.from([0, ...value]);
  return Uint8Array.from([0x02, value.length, ...value]);
}

function p1363ToDer(signature) {
  if (!(signature instanceof Uint8Array) || signature.length !== 64) {
    throw new Error("CALL_WAKE_SIGNATURE_INVALID");
  }
  const r = derInteger(signature.slice(0, 32));
  const s = derInteger(signature.slice(32, 64));
  const length = r.length + s.length;
  return Uint8Array.from([0x30, length, ...r, ...s]);
}

export function canonicalCallWake({ callId, mode, expiresAt, nonce }) {
  if (!CALL_ID.test(callId || "")) throw new Error("CALL_WAKE_ID_INVALID");
  if (mode !== "AUDIO" && mode !== "VIDEO") throw new Error("CALL_WAKE_MODE_INVALID");
  if (!Number.isSafeInteger(expiresAt)) throw new Error("CALL_WAKE_EXPIRY_INVALID");
  if (!NONCE.test(nonce || "")) throw new Error("CALL_WAKE_NONCE_INVALID");
  return encoder.encode(
    "EZERO_CALL_WAKE_V1\n" +
    "wake_v=1\n" +
    `call_id=${callId}\n` +
    `mode=${mode}\n` +
    `expires_at=${expiresAt}\n` +
    `nonce=${nonce}\n`
  );
}

export async function createSignedCallWake(env, input, now = Date.now()) {
  const { callId, mode, expiresAt, nonce } = input || {};
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt - now > 120_000) {
    throw new Error("CALL_WAKE_EXPIRY_OUT_OF_RANGE");
  }
  const canonical = canonicalCallWake({ callId, mode, expiresAt, nonce });
  const encodedKey = env?.CALL_WAKE_SIGNING_PRIVATE_KEY_PKCS8_BASE64URL;
  if (!encodedKey) throw new Error("CALL_WAKE_SIGNING_KEY_NOT_CONFIGURED");
  const key = await crypto.subtle.importKey(
    "pkcs8", decodeBase64url(encodedKey),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const rawSignature = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, key, canonical
  ));
  return {
    wake_v: "1",
    call_id: callId,
    mode,
    expires_at: String(expiresAt),
    nonce,
    server_sig: base64url(p1363ToDer(rawSignature))
  };
}

async function createGoogleAccessToken(serviceAccount, fetchImpl, now) {
  const issuedAt = Math.floor(now / 1000);
  const header = base64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = base64url(encoder.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: TOKEN_URL,
    iat: issuedAt,
    exp: issuedAt + 3600
  })));
  const signingInput = header + "." + claims;
  const privateKey = await crypto.subtle.importKey(
    "pkcs8", pemPkcs8Bytes(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", privateKey, encoder.encode(signingInput)
  ));
  const assertion = signingInput + "." + base64url(signature);
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    }).toString()
  });
  if (!response.ok) throw new Error("FCM_OAUTH_EXCHANGE_FAILED");
  const result = await response.json();
  if (typeof result.access_token !== "string" || !result.access_token ||
      !Number.isFinite(result.expires_in) || result.expires_in <= 0) {
    throw new Error("FCM_OAUTH_RESPONSE_INVALID");
  }
  return result.access_token;
}

/**
 * Low-level FCM HTTP v1 sender. It deliberately has no public route and does
 * not authorize callers, look up friend relationships, or persist invitations.
 * Its caller must complete those checks before invoking this function.
 */
export async function sendSignedCallWake(env, input, options = {}) {
  const now = options.now ?? Date.now();
  const fetchImpl = options.fetchImpl ?? fetch;
  const serviceAccountText = env?.FCM_SERVICE_ACCOUNT_JSON;
  if (typeof serviceAccountText !== "string" || !serviceAccountText) {
    throw new Error("FCM_SERVICE_ACCOUNT_NOT_CONFIGURED");
  }
  let serviceAccount;
  try { serviceAccount = JSON.parse(serviceAccountText); }
  catch (_) { throw new Error("FCM_SERVICE_ACCOUNT_INVALID"); }
  if (typeof serviceAccount.project_id !== "string" ||
      !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(serviceAccount.project_id) ||
      typeof serviceAccount.client_email !== "string" ||
      !/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(serviceAccount.client_email) ||
      typeof serviceAccount.private_key !== "string") {
    throw new Error("FCM_SERVICE_ACCOUNT_INVALID");
  }
  if (typeof input?.fcmToken !== "string" || input.fcmToken.length < 20 ||
      input.fcmToken.length > 4096) throw new Error("FCM_TOKEN_INVALID");

  const wake = await createSignedCallWake(env, input, now);
  const ttlSeconds = Math.max(1, Math.min(120, Math.ceil((Number(wake.expires_at) - now) / 1000)));
  const accessToken = await createGoogleAccessToken(serviceAccount, fetchImpl, now);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`;
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      message: {
        token: input.fcmToken,
        data: wake,
        android: { priority: "HIGH", ttl: `${ttlSeconds}s` }
      }
    })
  });
  if (!response.ok) throw new Error("FCM_SEND_FAILED");
  const result = await response.json();
  if (typeof result.name !== "string" || !result.name) {
    throw new Error("FCM_SEND_RESPONSE_INVALID");
  }
  return { messageName: result.name, expiresAt: Number(wake.expires_at) };
}
