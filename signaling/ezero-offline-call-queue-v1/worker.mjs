const CALL_ID = /^[A-Za-z0-9_-]{8,128}$/;
const FINGERPRINT = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const NONCE = /^[A-Za-z0-9_-]{16,128}$/;
const MAX_INVITE_BYTES = 12 * 1024;
const MAX_PENDING_MS = 30_000;
const MAX_REPLAY = 256;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function exactKeys(value, keys) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...keys].sort().join(",");
}
function decode64url(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("QUEUE_KEY_ENCODING_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("QUEUE_KEY_ENCODING_INVALID"); }
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}
async function fingerprintFromSpki(spki) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", spki));
  return Array.from(digest, byte => byte.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new Error("QUEUE_CANONICAL_INVALID");
}
async function readJson(request, maxBytes = 16 * 1024) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > maxBytes) throw new Error("QUEUE_BODY_TOO_LARGE");
  try { return JSON.parse(raw); } catch (_) { throw new Error("QUEUE_JSON_INVALID"); }
}
function derToP1363(der) {
  if (!(der instanceof Uint8Array) || der.length < 8 || der.length > 80 ||
      der[0] !== 0x30 || der[1] !== der.length - 2) return null;
  let p = 2;
  const readInteger = () => {
    if (der[p++] !== 0x02) return null;
    const n = der[p++];
    if (!n || p + n > der.length) return null;
    let value = der.slice(p, p + n); p += n;
    if ((value[0] & 0x80) || (value.length > 1 && value[0] === 0 && !(value[1] & 0x80))) return null;
    if (value[0] === 0) value = value.slice(1);
    if (value.length > 32) return null;
    const out = new Uint8Array(32); out.set(value, 32 - value.length); return out;
  };
  const r = readInteger(), s = readInteger();
  if (!r || !s || p !== der.length) return null;
  const out = new Uint8Array(64); out.set(r, 0); out.set(s, 32); return out;
}
async function verifyDeviceProof(spki, signature, payload) {
  const key = await crypto.subtle.importKey("spki", decode64url(spki),
    { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const encoded = decode64url(signature);
  const sig = encoded.length === 64 ? encoded : derToP1363(encoded);
  if (!sig) return false;
  return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig,
    new TextEncoder().encode(canonical(payload)));
}
function statusFor(error) {
  if (/TOO_LARGE/.test(error.message)) return 413;
  if (/INVALID|ENCODING|CANONICAL|JSON/.test(error.message)) return 400;
  return 503;
}

/**
 * One instance must be addressed by a single recipient installation ID.
 * It is intentionally not bound to a public Worker route in this stage.
 * The trusted caller MUST re-check Registry authorization before /internal/create.
 */
export class EzeroOfflineCallQueue {
  constructor(ctx, env) { this.ctx = ctx; this.env = env || {}; }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    const url = new URL(request.url);
    if (!["/internal/v1/create", "/v1/claim", "/v1/reject"].includes(url.pathname)) {
      return json({ error: "NOT_FOUND" }, 404);
    }
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        const body = await readJson(request, url.pathname === "/internal/v1/create" ? 16 * 1024 : 4 * 1024);
        const now = Date.now();

        if (url.pathname.startsWith("/internal/")) {
          const secret = this.env.INTERNAL_QUEUE_SECRET;
          if (typeof secret !== "string" || secret.length < 32 ||
              request.headers.get("X-EZERO-Queue-Internal") !== secret) {
            return json({ error: "INTERNAL_UNAUTHORIZED" }, 403);
          }
        }

        if (url.pathname === "/internal/v1/create") {
          const keys = ["callId","callerFingerprint","devicePublicKeySpki","expiresAt","installationId",
            "invite","mode","nonce","recipientFingerprint","relationshipId"];
          if (!exactKeys(body, keys) || !CALL_ID.test(body.callId || "") ||
              !FINGERPRINT.test(body.callerFingerprint || "") ||
              !FINGERPRINT.test(body.recipientFingerprint || "") ||
              body.callerFingerprint === body.recipientFingerprint ||
              !/^[A-Za-z0-9_-]{16,128}$/.test(body.installationId || "") ||
              !/^[a-f0-9]{64}$/.test(body.relationshipId || "") ||
              !NONCE.test(body.nonce || "") || !["AUDIO","VIDEO"].includes(body.mode) ||
              !Number.isSafeInteger(body.expiresAt) || body.expiresAt <= now ||
              body.expiresAt > now + MAX_PENDING_MS ||
              typeof body.invite !== "string" ||
              new TextEncoder().encode(body.invite).length < 1 ||
              new TextEncoder().encode(body.invite).length > MAX_INVITE_BYTES ||
              typeof body.devicePublicKeySpki !== "string") {
            return json({ error: "QUEUE_CREATE_INVALID" }, 400);
          }
          const spki = decode64url(body.devicePublicKeySpki);
          if (spki.length < 80 || spki.length > 160) return json({ error: "QUEUE_DEVICE_KEY_INVALID" }, 400);
          await crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
          // Bind the claimed recipient identity to the exact installation public key.
          // The upstream enrollment service must still prove this key is root-approved and active.
          if (await fingerprintFromSpki(spki) !== body.recipientFingerprint) {
            return json({ error: "QUEUE_DEVICE_FINGERPRINT_MISMATCH" }, 400);
          }
          const current = await this.ctx.storage.get("pending");
          if (current && current.expiresAt > now && current.status === "PENDING") {
            return json({ error: "RECIPIENT_BUSY" }, 409);
          }
          const replay = (await this.ctx.storage.get("createdCalls") || []).filter(x => x.expiresAt > now);
          if (replay.some(x => x.callId === body.callId || x.nonce === body.nonce)) {
            return json({ error: "CALL_REPLAY_REJECTED" }, 409);
          }
          const record = {
            callId: body.callId, callerFingerprint: body.callerFingerprint,
            recipientFingerprint: body.recipientFingerprint, relationshipId: body.relationshipId,
            installationId: body.installationId, devicePublicKeySpki: body.devicePublicKeySpki,
            invite: body.invite, mode: body.mode, nonce: body.nonce,
            createdAt: now, expiresAt: body.expiresAt, status: "PENDING"
          };
          await this.ctx.storage.put("pending", record);
          replay.push({ callId: body.callId, nonce: body.nonce, expiresAt: body.expiresAt });
          await this.ctx.storage.put("createdCalls", replay.slice(-MAX_REPLAY));
          return json({ status: "PENDING", callId: body.callId, expiresAt: body.expiresAt }, 201);
        }

        const pending = await this.ctx.storage.get("pending");
        if (!pending || pending.expiresAt <= now || pending.status !== "PENDING") {
          if (pending && pending.expiresAt <= now) await this.ctx.storage.delete("pending");
          return json({ error: "CALL_NOT_AVAILABLE" }, 404);
        }
        if (body.callId !== pending.callId || body.installationId !== pending.installationId) {
          return json({ error: "DEVICE_OR_CALL_MISMATCH" }, 403);
        }
        if (!Number.isSafeInteger(body.issuedAt) || Math.abs(now - body.issuedAt) > 60_000 ||
            !NONCE.test(body.nonce || "") || typeof body.signature !== "string") {
          return json({ error: "DEVICE_PROOF_INVALID" }, 401);
        }
        const proofPayload = {
          protocol: "E-ZERO-OFFLINE-CALL-CLAIM-1",
          method: "POST",
          path: url.pathname,
          callId: pending.callId,
          installationId: pending.installationId,
          recipientFingerprint: pending.recipientFingerprint,
          issuedAt: body.issuedAt,
          nonce: body.nonce
        };
        if (!await verifyDeviceProof(pending.devicePublicKeySpki, body.signature, proofPayload)) {
          return json({ error: "DEVICE_AUTH_FAILED" }, 403);
        }
        const replay = (await this.ctx.storage.get("deviceProofNonces") || []).filter(x => x.expiresAt > now);
        if (replay.some(x => x.nonce === body.nonce)) return json({ error: "DEVICE_PROOF_REPLAY" }, 409);

        if (url.pathname === "/v1/claim") {
          pending.status = "CLAIMED";
          pending.claimedAt = now;
          await this.ctx.storage.put("pending", pending);
          replay.push({ nonce: body.nonce, expiresAt: now + 120_000 });
          await this.ctx.storage.put("deviceProofNonces", replay.slice(-MAX_REPLAY));
          return json({ status: "CLAIMED", callId: pending.callId, invite: pending.invite, mode: pending.mode });
        }
        if (url.pathname === "/v1/reject") {
          pending.status = "REJECTED";
          pending.rejectedAt = now;
          await this.ctx.storage.put("pending", pending);
          replay.push({ nonce: body.nonce, expiresAt: now + 120_000 });
          await this.ctx.storage.put("deviceProofNonces", replay.slice(-MAX_REPLAY));
          return json({ status: "REJECTED", callId: pending.callId });
        }
        return json({ error: "NOT_FOUND" }, 404);
      } catch (error) {
        return json({ error: error?.message || "QUEUE_FAILURE" }, statusFor(error));
      }
    });
  }
}
