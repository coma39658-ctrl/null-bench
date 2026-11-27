/*
 * E-ZERO Android root-approved enrollment Worker candidate V1.
 * ISOLATED / NOT DEPLOYED. Not referenced by the active wrangler entrypoint.
 *
 * Root keys must be pre-provisioned out-of-band with ROOT_BOOTSTRAP_SECRET.
 * This module intentionally has no Firebase/FCM token or push-sender surface.
 */
import { DurableObject } from "cloudflare:workers";

const ORIGIN = "https://coma39658-ctrl.github.io";
const FP = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9_-]{16,128}$/;
const B64 = /^[A-Za-z0-9_-]+$/;
const MAX_BODY = 4096;
const CHALLENGE_MS = 90000;
const RATE_RETENTION_MS = 24 * 60 * 60 * 1000;
const CLEANUP_BATCH = 100;
const COMMAND_MAX_AGE_MS = 60000;
const COMMAND_REPLAY_RETENTION_MS = 24 * 60 * 60 * 1000;
const AUDIT_RETENTION_MS = 365 * 24 * 60 * 60 * 1000;
const TOKEN_COMMAND_MAX_AGE_MS = 60000;
const enc = new TextEncoder();

function expiryIndexKey(expiresAt, recordKey) {
  return "expiry:" + String(expiresAt).padStart(16, "0") + ":" + recordKey;
}
function indexedExpiry(indexKey) {
  return Number(indexKey.slice(7, 23));
}

export function base64url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
export function decode64(value, max = 512) {
  if (typeof value !== "string" || !B64.test(value) || value.length > max) return null;
  try {
    const raw = atob(value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4-value.length%4)%4));
    return Uint8Array.from(raw, c => c.charCodeAt(0));
  } catch (_) { return null; }
}
export function hex(bytes) {
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
export async function fingerprint(spki) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", spki)));
}
export function canonical(tag, fields, order) {
  return enc.encode(tag + "\n" + order.map(k => k + "=" + fields[k] + "\n").join(""));
}
export async function importP256(spki) {
  return crypto.subtle.importKey("spki", spki, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
}
async function readJson(request) {
  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return null;
  const raw = await request.text();
  if (raw.length > MAX_BODY) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
}
function response(body, status=200) {
  return new Response(JSON.stringify(body), { status, headers: {
    "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff", "Access-Control-Allow-Origin":ORIGIN,
    "Vary":"Origin"
  }});
}
const CHALLENGE_ORDER = ["challenge_id","device_fp","nonce","audience","expires_at"];
const APPROVAL_ORDER = ["root_fp","device_fp","challenge_id","nonce","audience","expires_at"];
const ROOT_COMMAND_ORDER = ["root_fp","command_id","action","device_fp","nonce","audience","expires_at"];
const TOKEN_ORDER = ["device_fp","token_sha256","command_id","issued_at","nonce","audience"];

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (request.method === "OPTIONS" && (u.pathname.startsWith("/v1/android/") || u.pathname.startsWith("/v1/admin/root/"))) {
      if (request.headers.get("Origin") !== ORIGIN) return response({error:"ORIGIN_DENIED"},403);
      return new Response(null,{status:204,headers:{
        "Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST, OPTIONS",
        "Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"300","Vary":"Origin"
      }});
    }
    const origin = request.headers.get("Origin");
    const androidRoute = u.pathname === "/v1/android/enrollment/challenge" ||
      u.pathname === "/v1/android/enrollment/complete" ||
      u.pathname === "/v1/android/device-token";
    const rootAdminRoute = u.pathname === "/v1/admin/root-register" ||
      u.pathname === "/v1/admin/root/devices/list" ||
      u.pathname === "/v1/admin/root/devices/revoke";
    if (!androidRoute && !rootAdminRoute) return response({error:"NOT_FOUND"},404);

    // Native Android HTTP clients do not send a browser Origin header.
    // Permit an absent Origin only on the proof-gated Android endpoints.
    // Browser callers must still be the canonical web origin; foreign origins fail closed.
    if (rootAdminRoute && origin !== ORIGIN) return response({error:"ORIGIN_DENIED"},403);
    if (androidRoute && origin !== null && origin !== ORIGIN)
      return response({error:"ORIGIN_DENIED"},403);
    if (!env.ENROLLMENT?.idFromName) return response({error:"UNAVAILABLE"},503);
    if (request.method !== "POST") return response({error:"METHOD_NOT_ALLOWED"},405);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
      return response({error:"CONTENT_TYPE"},415);
    const body = await readJson(request);
    if (!body) return response({error:"BAD_BODY"},400);
    const id = env.ENROLLMENT.idFromName("global-root-enrollment-v1");
    return env.ENROLLMENT.get(id).fetch(new Request("https://enrollment.internal"+u.pathname,{
      method:"POST",headers:{
        "Content-Type":"application/json",
        "X-Root-Bootstrap":request.headers.get("X-Root-Bootstrap") || "",
        // Cloudflare supplies CF-Connecting-IP at the edge; only its hash is persisted.
        "X-EZERO-Client-IP":request.headers.get("CF-Connecting-IP") || "unknown"
      },body:JSON.stringify(body)
    }));
  }
};

export class AndroidEnrollmentRegistry extends DurableObject {
  async scheduleCleanup(expiresAt) {
    // Serialize alarm comparisons: concurrent callers must not let a later
    // expiry overwrite an earlier alarm after both observed an empty slot.
    const previous = this.scheduleQueue || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const current = await this.ctx.storage.getAlarm();
      if (current === null || current > expiresAt) {
        await this.ctx.storage.setAlarm(expiresAt);
      }
    });
    this.scheduleQueue = next;
    await next;
  }

  async alarm() {
    const now = Date.now();
    const due = await this.ctx.storage.list({ prefix: "expiry:", limit: CLEANUP_BATCH });
    for (const [indexKey] of due) {
      const expiresAt = indexedExpiry(indexKey);
      if (!Number.isFinite(expiresAt) || expiresAt > now) break;
      const recordKey = indexKey.slice(24);
      await this.ctx.storage.transaction(async (txn) => {
        const record = await txn.get(recordKey);
        const recordExpiry = record?.expires_at ?? record?.challenge?.expires_at;
        // A rate bucket may have been refreshed into a newer window while an
        // older index row still exists. Never let that stale row delete it.
        if (Number(recordExpiry) === expiresAt) await txn.delete(recordKey);
        await txn.delete(indexKey);
      });
    }

    // The index is timestamp-sorted. If more expired rows remain, yield and
    // continue in another bounded alarm rather than scanning unbounded storage.
    const next = await this.ctx.storage.list({ prefix: "expiry:", limit: 1 });
    if (next.size) {
      const nextKey = next.keys().next().value;
      const nextExpiry = indexedExpiry(nextKey);
      const scheduledAt = nextExpiry <= now ? now + 1000 : nextExpiry;
      await this.scheduleCleanup(scheduledAt);
    }
  }

  async consumeRateLimit(request, route) {
    const clientIp = request.headers.get("X-EZERO-Client-IP") || "unknown";
    // Do not persist raw IP addresses; use a one-way digest in the per-route bucket key.
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(clientIp)));
    const key = "rate:" + route + ":" + hex(digest);
    const now = Date.now();
    const admin = route.startsWith("/v1/admin/");
    const windowMs = admin ? 60 * 60 * 1000 : 60 * 1000;
    const limit = admin ? 3 : 10;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    // A shared route ceiling limits distributed-IP bypass. It is deliberately
    // conservative and updated atomically with the per-IP bucket.
    const globalKey = "rate:global:" + route;
    const globalLimit = admin ? 20 : 300;
    return this.ctx.storage.transaction(async (txn) => {
      const [previous, globalPrevious] = await Promise.all([
        txn.get(key), txn.get(globalKey)
      ]);
      const count = previous?.window_start === windowStart ? previous.count : 0;
      const globalCount = globalPrevious?.window_start === windowStart
        ? globalPrevious.count : 0;
      if (count >= limit || globalCount >= globalLimit) return false;
      const expiresAt = windowStart + windowMs + RATE_RETENTION_MS;
      await txn.put(key, { window_start:windowStart, count:count + 1, expires_at:expiresAt });
      await txn.put(expiryIndexKey(expiresAt, key), { record_key:key });
      await txn.put(globalKey, {
        window_start:windowStart, count:globalCount + 1, expires_at:expiresAt
      });
      await txn.put(expiryIndexKey(expiresAt, globalKey), { record_key:globalKey });
      return true;
    }).then(async (allowed) => {
      if (allowed) {
        const expiresAt = windowStart + windowMs + RATE_RETENTION_MS;
        await this.scheduleCleanup(expiresAt);
      }
      return allowed;
    });
  }

  async registerDeviceToken(body) {
    const now = Date.now();
    if (!FP.test(body.device_fp || "") ||
        typeof body.fcm_token !== "string" ||
        !/^[A-Za-z0-9_:-]{32,2048}$/.test(body.fcm_token) ||
        typeof body.issued_at !== "string" || !/^\d{13}$/.test(body.issued_at) ||
        !Number.isSafeInteger(Number(body.issued_at)) ||
        Math.abs(now - Number(body.issued_at)) > TOKEN_COMMAND_MAX_AGE_MS ||
        !ID.test(body.command_id || "")) {
      return { error: "BAD_DEVICE_TOKEN_REQUEST", status: 400 };
    }
    const nonce = decode64(body.nonce, 64);
    const signature = decode64(body.signature, 128);
    if (!nonce || nonce.length !== 24 || !signature || signature.length !== 64) {
      return { error: "BAD_DEVICE_TOKEN_SIGNATURE", status: 400 };
    }

    const tokenDigest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(body.fcm_token)));
    const tokenHash = base64url(tokenDigest);
    const command = {
      device_fp: body.device_fp,
      token_sha256: tokenHash,
      command_id: body.command_id,
      issued_at: body.issued_at,
      nonce: body.nonce,
      audience: ORIGIN
    };
    const devices = (await this.ctx.storage.get("devices")) || {};
    const device = devices[body.device_fp];
    if (!device?.active) return { error: "DEVICE_NOT_ENROLLED_OR_REVOKED", status: 403 };
    try {
      const spki = decode64(device.device_spki, 512);
      if (!spki || await fingerprint(spki) !== body.device_fp) {
        return { error: "DEVICE_REGISTRY_CORRUPT", status: 503 };
      }
      const key = await importP256(spki);
      const valid = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" }, key, signature,
        canonical("EZERO_ANDROID_FCM_TOKEN_V1", command, TOKEN_ORDER)
      );
      if (!valid) return { error: "DEVICE_TOKEN_SIGNATURE_INVALID", status: 403 };

      const replayKey = "device-token-command:" + body.command_id;
      const replayExpiry = now + COMMAND_REPLAY_RETENTION_MS;
      const auditKey = "audit:device-token:" + body.command_id;
      const auditExpiry = now + AUDIT_RETENTION_MS;
      const result = await this.ctx.storage.transaction(async (txn) => {
        const current = (await txn.get("devices")) || {};
        const active = current[body.device_fp];
        if (!active?.active) return { error: "DEVICE_NOT_ENROLLED_OR_REVOKED", status: 403 };
        if (await txn.get(replayKey)) return { error: "DEVICE_TOKEN_COMMAND_REPLAY", status: 409 };
        current[body.device_fp] = {
          ...active, fcm_token: body.fcm_token, fcm_token_sha256: tokenHash,
          fcm_token_updated_at: now
        };
        await txn.put("devices", current);
        await txn.put(replayKey, { expires_at: replayExpiry, device_fp: body.device_fp });
        await txn.put(expiryIndexKey(replayExpiry, replayKey), { record_key: replayKey });
        await txn.put(auditKey, {
          at: now, expires_at: auditExpiry, device_fp: body.device_fp,
          action: "FCM_TOKEN_REGISTERED", token_sha256: tokenHash
        });
        await txn.put(expiryIndexKey(auditExpiry, auditKey), { record_key: auditKey });
        return { ok: true };
      });
      if (result.error) return result;
      await this.scheduleCleanup(replayExpiry);
      await this.scheduleCleanup(auditExpiry);
      return { ok: true, status: "TOKEN_REGISTERED", device_fp: body.device_fp };
    } catch (_) {
      return { error: "DEVICE_TOKEN_VERIFICATION_FAILED", status: 403 };
    }
  }

  async executeRootCommand(body, expectedAction) {
    const now = Date.now();
    if (!FP.test(body.root_fp || "") || !ID.test(body.command_id || "") ||
        body.action !== expectedAction ||
        (expectedAction === "LIST_DEVICES" ? body.device_fp !== "" : !FP.test(body.device_fp || "")) ||
        typeof body.expires_at !== "string" || !/^\d{13}$/.test(body.expires_at) ||
        !Number.isSafeInteger(Number(body.expires_at)) ||
        Number(body.expires_at) <= now || Number(body.expires_at) > now + COMMAND_MAX_AGE_MS) {
      return { error: "BAD_ROOT_COMMAND", status: 400 };
    }
    const nonce = decode64(body.nonce, 64);
    const signature = decode64(body.signature, 128);
    if (!nonce || nonce.length !== 24 || !signature || signature.length !== 64) {
      return { error: "BAD_ROOT_COMMAND", status: 400 };
    }

    const roots = (await this.ctx.storage.get("roots")) || {};
    const root = roots[body.root_fp];
    if (!root?.active) return { error: "ROOT_NOT_AUTHORIZED", status: 403 };
    try {
      const spki = decode64(root.spki, 512);
      if (!spki || await fingerprint(spki) !== body.root_fp) {
        return { error: "ROOT_REGISTRY_CORRUPT", status: 503 };
      }
      const key = await importP256(spki);
      const command = {
        root_fp: body.root_fp,
        command_id: body.command_id,
        action: body.action,
        device_fp: body.device_fp,
        nonce: body.nonce,
        audience: ORIGIN,
        expires_at: body.expires_at
      };
      const valid = await crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        key,
        signature,
        canonical("EZERO_ANDROID_ROOT_COMMAND_V1", command, ROOT_COMMAND_ORDER)
      );
      if (!valid) return { error: "ROOT_SIGNATURE_INVALID", status: 403 };

      const replayKey = "root-command:" + body.command_id;
      const auditKey = "audit:root-command:" + body.command_id;
      const replayExpiry = now + COMMAND_REPLAY_RETENTION_MS;
      const auditExpiry = now + AUDIT_RETENTION_MS;
      const transactionResult = await this.ctx.storage.transaction(async (txn) => {
        const currentRoots = (await txn.get("roots")) || {};
        if (!currentRoots[body.root_fp]?.active) return { error: "ROOT_NOT_AUTHORIZED", status: 403 };
        if (await txn.get(replayKey)) return { error: "ROOT_COMMAND_REPLAY", status: 409 };

        let devices = (await txn.get("devices")) || {};
        if (expectedAction === "REVOKE_DEVICE") {
          const device = devices[body.device_fp];
          if (!device || device.root_fp !== body.root_fp) return { error: "DEVICE_NOT_FOUND", status: 404 };
          if (!device.active) return { error: "DEVICE_ALREADY_REVOKED", status: 409 };
          devices[body.device_fp] = { ...device, active: false, revoked_at: now, fcm_token: null, fcm_token_sha256: null };
          await txn.put("devices", devices);
        }

        await txn.put(replayKey, { expires_at: replayExpiry, root_fp: body.root_fp });
        await txn.put(expiryIndexKey(replayExpiry, replayKey), { record_key: replayKey });
        await txn.put(auditKey, {
          at: now, expires_at: auditExpiry, root_fp: body.root_fp,
          action: expectedAction, device_fp: body.device_fp || null,
          outcome: expectedAction === "REVOKE_DEVICE" ? "DEVICE_REVOKED" : "DEVICE_LISTED"
        });
        await txn.put(expiryIndexKey(auditExpiry, auditKey), { record_key: auditKey });
        return { ok: true, devices };
      });
      if (transactionResult.error) return transactionResult;
      await this.scheduleCleanup(replayExpiry);
      await this.scheduleCleanup(auditExpiry);
      if (expectedAction === "REVOKE_DEVICE") {
        return { ok: true, status: "DEVICE_REVOKED", device_fp: body.device_fp };
      }
      const all = Object.entries(transactionResult.devices || {})
        .filter(([fp, device]) => device.root_fp === body.root_fp)
        .map(([fp, device]) => ({
          device_fp: fp, root_fp: device.root_fp,
          enrolled_at: device.enrolled_at, active: device.active === true,
          revoked_at: device.revoked_at || null
        }))
        .sort((a, b) => b.enrolled_at - a.enrolled_at);
      return { ok: true, devices: all.slice(0, 100), truncated: all.length > 100 };
    } catch (_) {
      return { error: "ROOT_COMMAND_VERIFICATION_FAILED", status: 403 };
    }
  }

  async fetch(request) {
    const u = new URL(request.url), body = await readJson(request);
    if (!body) return response({error:"BAD_BODY"},400);
    let rateAllowed;
    try {
      rateAllowed = await this.consumeRateLimit(request, u.pathname);
    } catch (_) {
      // Limiter storage errors fail closed; never continue enrollment unmetered.
      return response({error:"RATE_LIMIT_UNAVAILABLE"},503);
    }
    if (!rateAllowed) return new Response(JSON.stringify({error:"RATE_LIMITED"}), {
      status:429, headers:{"Content-Type":"application/json; charset=utf-8",
        "Cache-Control":"no-store","Retry-After":u.pathname.startsWith("/v1/admin/") ? "3600" : "60",
        "X-Content-Type-Options":"nosniff","Access-Control-Allow-Origin":ORIGIN,"Vary":"Origin"}
    });

    if (u.pathname === "/v1/admin/root-register") {
      const secret = this.env.ROOT_BOOTSTRAP_SECRET;
      if (!secret || request.headers.get("X-Root-Bootstrap") !== secret)
        return response({error:"ADMIN_UNAUTHORIZED"},403);
      const spki = decode64(body.root_spki, 512);
      if (!spki || spki.length < 80 || spki.length > 160)
        return response({error:"BAD_ROOT_KEY"},400);
      try {
        const key = await importP256(spki);
        const fp = await fingerprint(spki);
        const roots = (await this.ctx.storage.get("roots")) || {};
        if (roots[fp]) return response({error:"ROOT_EXISTS"},409);
        roots[fp] = { spki:body.root_spki, added_at:Date.now(), active:true };
        await this.ctx.storage.put("roots",roots);
        return response({ok:true,root_fp:fp});
      } catch (_) { return response({error:"BAD_ROOT_KEY"},400); }
    }

    if (u.pathname === "/v1/admin/root/devices/list") {
      const result = await this.executeRootCommand(body, "LIST_DEVICES");
      return result.error ? response({error: result.error}, result.status) : response(result);
    }

    if (u.pathname === "/v1/admin/root/devices/revoke") {
      const result = await this.executeRootCommand(body, "REVOKE_DEVICE");
      return result.error ? response({error: result.error}, result.status) : response(result);
    }

    if (u.pathname === "/v1/android/device-token") {
      const result = await this.registerDeviceToken(body);
      return result.error ? response({error: result.error}, result.status) : response(result);
    }

    if (u.pathname === "/v1/android/enrollment/challenge") {
      const spki = decode64(body.device_spki,512);
      if (!spki || spki.length < 80 || spki.length > 160)
        return response({error:"BAD_DEVICE_KEY"},400);
      try {
        await importP256(spki);
        const deviceFp = await fingerprint(spki);
        const now = Date.now();
        const challenge = {
          challenge_id:base64url(crypto.getRandomValues(new Uint8Array(24))),
          device_fp:deviceFp,
          nonce:base64url(crypto.getRandomValues(new Uint8Array(24))),
          audience:ORIGIN,
          expires_at:String(now+CHALLENGE_MS)
        };
        const challengeKey = "challenge:" + challenge.challenge_id;
        const expiresAt = Number(challenge.expires_at);
        await this.ctx.storage.transaction(async (txn) => {
          await txn.put(challengeKey, {
            challenge,device_spki:body.device_spki,created_at:now
          });
          await txn.put(expiryIndexKey(expiresAt, challengeKey), { record_key:challengeKey });
        });
        await this.scheduleCleanup(expiresAt);
        return response({challenge,device_challenge:base64url(canonical(
          "EZERO_ANDROID_ENROLL_CHALLENGE_V1",challenge,CHALLENGE_ORDER))});
      } catch (_) { return response({error:"BAD_DEVICE_KEY"},400); }
    }

    if (u.pathname === "/v1/android/enrollment/complete") {
      const challengeId = body.challenge_id;
      if (!ID.test(challengeId || "") || !FP.test(body.root_fp || "") ||
          typeof body.device_proof !== "string" || typeof body.root_approval !== "string")
        return response({error:"BAD_ENROLLMENT"},400);
      const key = "challenge:"+challengeId;
      // Atomically reserve/consume before asynchronous signature checks. This
      // prevents two concurrent completion requests from both enrolling.
      // Invalid proofs require a fresh challenge; fail closed rather than replay.
      const saved = await this.ctx.storage.transaction(async (txn) => {
        const value = await txn.get(key);
        if (!value) return null;
        await txn.delete(key);
        if (value.challenge?.expires_at) {
          await txn.delete(expiryIndexKey(Number(value.challenge.expires_at), key));
        }
        return value;
      });
      if (!saved) return response({error:"CHALLENGE_UNKNOWN_OR_USED"},409);
      const c = saved.challenge, now = Date.now();
      if (Number(c.expires_at) <= now || Number(c.expires_at)-saved.created_at > CHALLENGE_MS) {
        return response({error:"CHALLENGE_EXPIRED"},410);
      }
      const roots = (await this.ctx.storage.get("roots")) || {};
      const root = roots[body.root_fp];
      if (!root?.active) return response({error:"ROOT_NOT_AUTHORIZED"},403);
      try {
        const deviceSpki = decode64(saved.device_spki,512);
        const deviceKey = await importP256(deviceSpki);
        const rootSpki = decode64(root.spki,512);
        if (await fingerprint(rootSpki) !== body.root_fp) return response({error:"ROOT_REGISTRY_CORRUPT"},503);
        const rootKey = await importP256(rootSpki);
        const deviceSig = decode64(body.device_proof,180);
        const rootSig = decode64(body.root_approval,180);
        const challengeBytes = canonical("EZERO_ANDROID_ENROLL_CHALLENGE_V1",c,CHALLENGE_ORDER);
        const approval = {
          root_fp:body.root_fp, device_fp:c.device_fp, challenge_id:c.challenge_id,
          nonce:c.nonce, audience:c.audience, expires_at:c.expires_at
        };
        const approvalBytes = canonical("EZERO_ANDROID_ROOT_APPROVAL_V1",approval,APPROVAL_ORDER);
        const [deviceOK,rootOK] = await Promise.all([
          crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},deviceKey,deviceSig,challengeBytes),
          crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},rootKey,rootSig,approvalBytes)
        ]);
        if (!deviceOK || !rootOK) return response({error:"PROOF_INVALID"},403);
        const devices = (await this.ctx.storage.get("devices")) || {};
        if (devices[c.device_fp]?.active) return response({error:"DEVICE_ALREADY_ENROLLED"},409);
        devices[c.device_fp] = {root_fp:body.root_fp,device_spki:saved.device_spki,
          enrolled_at:now,active:true};
        await this.ctx.storage.put("devices",devices);
        await this.ctx.storage.delete(key);
        return response({ok:true,device_fp:c.device_fp,root_fp:body.root_fp,status:"ENROLLED"});
      } catch (_) { return response({error:"PROOF_INVALID"},403); }
    }
    return response({error:"NOT_FOUND"},404);
  }
}
