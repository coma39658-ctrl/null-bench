const encoder = new TextEncoder();
const MAX_WAKE_TTL_MS = 120_000;
const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer";

function decodeBase64(value) {
  const binary = atob(String(value).replace(/\\s+/g, ""));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\\+/g, "-").replace(/\\//g, "_").replace(/=+$/g, "");
}

function derLength(length) {
  if (length < 128) return [length];
  if (length < 256) return [0x81, length];
  return [0x82, (length >> 8) & 0xff, length & 0xff];
}

function derInteger(bytes) {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  let value = Array.from(bytes.slice(start));
  if (value[0] & 0x80) value.unshift(0);
  return [0x02, ...derLength(value.length), ...value];
}

export function rawEcdsaSignatureToDer(rawSignature) {
  if (!(rawSignature instanceof Uint8Array) || rawSignature.length !== 64) {
    throw new Error("WAKE_ECDSA_SIGNATURE_INVALID");
  }
  const r = derInteger(rawSignature.slice(0, 32));
  const s = derInteger(rawSignature.slice(32, 64));
  const sequence = [...r, ...s];
  return new Uint8Array([0x30, ...derLength(sequence.length), ...sequence]);
}

export function canonicalWakeMessage({ wake_v, call_id, mode, expires_at, nonce }) {
  return encoder.encode(
    "EZERO_CALL_WAKE_V1\\n" +
    "wake_v=" + wake_v + "\\n" +
    "call_id=" + call_id + "\\n" +
    "mode=" + mode + "\\n" +
    "expires_at=" + expires_at + "\\n" +
    "nonce=" + nonce + "\\n"
  );
}

export function validateWakePayload(payload, now = Date.now()) {
  if (!payload || payload.wake_v !== "1") throw new Error("WAKE_VERSION_INVALID");
  if (typeof payload.call_id !== "string" || !/^[A-Za-z0-9_-]{8,128}$/.test(payload.call_id)) {
    throw new Error("WAKE_CALL_ID_INVALID");
  }
  if (payload.mode !== "AUDIO" && payload.mode !== "VIDEO") throw new Error("WAKE_MODE_INVALID");
  const expiresAt = Number(payload.expires_at);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now || expiresAt - now > MAX_WAKE_TTL_MS) {
    throw new Error("WAKE_EXPIRY_INVALID");
  }
  if (typeof payload.nonce !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(payload.nonce)) {
    throw new Error("WAKE_NONCE_INVALID");
  }
  return { ...payload, expires_at: String(expiresAt) };
}

export async function signWakePayload(payload, privateKeyPkcs8Base64, now = Date.now()) {
  if (typeof privateKeyPkcs8Base64 !== "string" || !privateKeyPkcs8Base64.trim()) {
    throw new Error("WAKE_SIGNING_KEY_MISSING");
  }
  const normalized = validateWakePayload(payload, now);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    decodeBase64(privateKeyPkcs8Base64),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const raw = new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    canonicalWakeMessage(normalized)
  ));
  const der = rawEcdsaSignatureToDer(raw);
  return { ...normalized, server_sig: encodeBase64Url(der) };
}

function pemToPkcs8(privateKeyPem) {
  if (typeof privateKeyPem !== "string" || !privateKeyPem.includes("BEGIN PRIVATE KEY")) {
    throw new Error("FCM_SERVICE_ACCOUNT_KEY_INVALID");
  }
  return decodeBase64(privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/g, ""));
}

async function getFcmAccessToken(serviceAccount, fetchImpl, now = Date.now()) {
  const tokenUri = serviceAccount.token_uri || "https://oauth2.googleapis.com/token";
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const issuedAt = Math.floor(now / 1000);
  const header = encodeBase64Url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const claims = encodeBase64Url(encoder.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: FCM_SCOPE,
    aud: tokenUri,
    iat: issuedAt,
    exp: issuedAt + 3600
  })));
  const unsigned = header + "." + claims;
  const signature = new Uint8Array(await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned)
  ));
  const assertion = unsigned + "." + encodeBase64Url(signature);
  const response = await fetchImpl(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: FCM_GRANT, assertion })
  });
  if (!response.ok) throw new Error("FCM_OAUTH_TOKEN_FAILED");
  const result = await response.json();
  if (typeof result.access_token !== "string" || !result.access_token) {
    throw new Error("FCM_OAUTH_TOKEN_INVALID");
  }
  return result.access_token;
}

/**
 * Sends a data-only high-priority wake. The caller identity, display name,
 * SDP, chat data, and credentials are deliberately excluded from the payload.
 * This function is inert until the required Worker secrets are configured.
 */
export async function sendFcmWake(env, fcmToken, payload, fetchImpl = fetch, now = Date.now()) {
  if (typeof fcmToken !== "string" || fcmToken.length < 20 || fcmToken.length > 4096) {
    throw new Error("FCM_DEVICE_TOKEN_INVALID");
  }
  if (!env?.FCM_SERVICE_ACCOUNT_JSON || !env?.EZERO_WAKE_PRIVATE_KEY_PKCS8_BASE64) {
    throw new Error("FCM_STAGING_SECRETS_MISSING");
  }
  let serviceAccount;
  try { serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT_JSON); }
  catch (_) { throw new Error("FCM_SERVICE_ACCOUNT_INVALID"); }
  const projectId = env.FCM_PROJECT_ID || serviceAccount.project_id;
  if (typeof projectId !== "string" || !/^[a-z0-9-]{4,128}$/.test(projectId)) {
    throw new Error("FCM_PROJECT_ID_INVALID");
  }
  const signed = await signWakePayload(payload, env.EZERO_WAKE_PRIVATE_KEY_PKCS8_BASE64, now);
  const ttlSeconds = Math.max(1, Math.min(120, Math.floor((Number(signed.expires_at) - now) / 1000)));
  const accessToken = await getFcmAccessToken(serviceAccount, fetchImpl, now);
  const endpoint = "https://fcm.googleapis.com/v1/projects/" + projectId + "/messages:send";
  const response = await fetchImpl(endpoint, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + accessToken,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: {
        token: fcmToken,
        data: {
          wake_v: signed.wake_v,
          call_id: signed.call_id,
          mode: signed.mode,
          expires_at: signed.expires_at,
          nonce: signed.nonce,
          server_sig: signed.server_sig
        },
        android: {
          priority: "HIGH",
          ttl: ttlSeconds + "s",
          collapse_key: "ezero-call-" + signed.call_id
        }
      }
    })
  });
  if (!response.ok) throw new Error("FCM_WAKE_SEND_FAILED");
  const result = await response.json();
  return { sent: true, messageId: typeof result.name === "string" ? result.name : null };
}

export const ANDROID_WAKE_LIMITS = Object.freeze({ maxTtlMs: MAX_WAKE_TTL_MS });
