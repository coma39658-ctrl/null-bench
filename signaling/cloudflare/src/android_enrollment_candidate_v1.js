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
const enc = new TextEncoder();

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
const MANAGEMENT_ORDER = ["root_fp","action","device_fp","challenge_id","nonce","audience","expires_at"];

export default {
  async fetch(request, env) {
    const u = new URL(request.url);
    if (request.method === "OPTIONS" && u.pathname.startsWith("/v1/android/")) {
      if (request.headers.get("Origin") !== ORIGIN) return response({error:"ORIGIN_DENIED"},403);
      return new Response(null,{status:204,headers:{
        "Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"POST, OPTIONS",
        "Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"300","Vary":"Origin"
      }});
    }
    if (request.headers.get("Origin") !== ORIGIN) return response({error:"ORIGIN_DENIED"},403);
    if (!env.ENROLLMENT?.idFromName) return response({error:"UNAVAILABLE"},503);
    if (!["/v1/android/enrollment/challenge","/v1/android/enrollment/complete","/v1/admin/root-register","/v1/root/devices/challenge","/v1/root/devices/list","/v1/root/devices/revoke"].includes(u.pathname)) return response({error:"NOT_FOUND"},404);
    if (request.method !== "POST") return response({error:"METHOD_NOT_ALLOWED"},405);
    if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
      return response({error:"CONTENT_TYPE"},415);
    const body = await readJson(request);
    if (!body) return response({error:"BAD_BODY"},400);
    const id = env.ENROLLMENT.idFromName("global-root-enrollment-v1");
    return env.ENROLLMENT.get(id).fetch(new Request("https://enrollment.internal"+u.pathname,{
      method:"POST",headers:{
        "Content-Type":"application/json",
        "X-Root-Bootstrap":request.headers.get("X-Root-Bootstrap") || ""
      },body:JSON.stringify(body)
    }));
  }
};

export class AndroidEnrollmentRegistry extends DurableObject {
  async fetch(request) {
    const u = new URL(request.url), body = await readJson(request);
    if (!body) return response({error:"BAD_BODY"},400);

    if (u.pathname === "/v1/admin/root-register") {
      const secret = this.env.ROOT_BOOTSTRAP_SECRET;
      const expectedFp = this.env.ROOT_BOOTSTRAP_EXPECTED_FP;
      if (!secret || request.headers.get("X-Root-Bootstrap") !== secret)
        return response({error:"ADMIN_UNAUTHORIZED"},403);
      if (typeof expectedFp !== "string" || !FP.test(expectedFp))
        return response({error:"BOOTSTRAP_CONFIG_INVALID"},503);
      const spki = decode64(body.root_spki, 512);
      if (!spki || spki.length < 80 || spki.length > 160)
        return response({error:"BAD_ROOT_KEY"},400);
      let failureStage = "P256_IMPORT";
      try {
        await importP256(spki);
        failureStage = "FINGERPRINT";
        const fp = await fingerprint(spki);
        if (fp !== expectedFp) return response({error:"ROOT_FINGERPRINT_MISMATCH"},403);
        failureStage = "ATOMIC_STORAGE_TRANSACTION";
        const record = { spki:body.root_spki, added_at:Date.now(), active:true };
        // The durable transaction is the single-use gate. Concurrent requests
        // cannot both consume bootstrap authorization or install competing roots.
        const registered = this.ctx.storage.transactionSync(() => {
          const kv = this.ctx.storage.kv;
          if (kv.get("root-bootstrap-v1-used") === true) return "USED";
          const roots = kv.get("roots") || {};
          if (Object.keys(roots).length !== 0) return "ROOT_ALREADY_REGISTERED";
          kv.put("roots", { [fp]: record });
          kv.put("root-bootstrap-v1-used", true);
          return "REGISTERED";
        });
        if (registered === "USED") return response({error:"BOOTSTRAP_ALREADY_USED"},409);
        if (registered === "ROOT_ALREADY_REGISTERED") return response({error:"ROOT_ALREADY_REGISTERED"},409);
        return response({ok:true,root_fp:fp,status:"ROOT_REGISTERED"});
      } catch (error) {
        console.error("ROOT_BOOTSTRAP_INTERNAL_FAILURE", failureStage, error?.name || "Error");
        // Safe stage label only; never return key material, fingerprints, or secrets.
        return response({error:"BOOTSTRAP_INTERNAL_FAILURE", stage:failureStage},500);
      }
    }


    if (u.pathname === "/v1/root/devices/challenge") {
      if (!FP.test(body.root_fp || "") || !["LIST_DEVICES","REVOKE_DEVICE"].includes(body.action) || (body.action === "REVOKE_DEVICE" && !FP.test(body.device_fp || ""))) return response({error:"BAD_MANAGEMENT_REQUEST"},400);
      const roots=(await this.ctx.storage.get("roots"))||{};
      if (!roots[body.root_fp]?.active) return response({error:"ROOT_NOT_AUTHORIZED"},403);
      if (body.action==="REVOKE_DEVICE") {
        const devices=(await this.ctx.storage.get("devices"))||{};
        if (!devices[body.device_fp] || devices[body.device_fp].root_fp!==body.root_fp) return response({error:"DEVICE_NOT_FOUND"},404);
      }
      const now=Date.now();
      const challenge={root_fp:body.root_fp,action:body.action,device_fp:body.action==="REVOKE_DEVICE"?body.device_fp:"-",challenge_id:base64url(crypto.getRandomValues(new Uint8Array(24))),nonce:base64url(crypto.getRandomValues(new Uint8Array(24))),audience:ORIGIN,expires_at:String(now+CHALLENGE_MS)};
      await this.ctx.storage.put("management:"+challenge.challenge_id,{challenge,created_at:now});
      return response({challenge,root_command:base64url(canonical("EZERO_ROOT_DEVICE_MANAGEMENT_V1",challenge,MANAGEMENT_ORDER))});
    }

    if (u.pathname === "/v1/root/devices/list" || u.pathname === "/v1/root/devices/revoke") {
      const action=u.pathname.endsWith("/list")?"LIST_DEVICES":"REVOKE_DEVICE";
      const challengeId=body.challenge_id;
      if (!ID.test(challengeId||"") || !FP.test(body.root_fp||"") || typeof body.signature!=="string" || (action==="REVOKE_DEVICE" && !FP.test(body.device_fp||""))) return response({error:"BAD_MANAGEMENT_PROOF"},400);
      const key="management:"+challengeId;
      const saved=this.ctx.storage.transactionSync(() => {
        const kv = this.ctx.storage.kv;
        const value = kv.get(key);
        if (!value) return null;
        kv.delete(key);
        return value;
      });
      if (!saved) return response({error:"CHALLENGE_UNKNOWN_OR_USED"},409);
      const c=saved.challenge;
      if (Number(c.expires_at)<=Date.now() || Number(c.expires_at)-saved.created_at>CHALLENGE_MS) return response({error:"CHALLENGE_EXPIRED"},410);
      if (c.root_fp!==body.root_fp || c.action!==action || c.device_fp!==(action==="REVOKE_DEVICE"?body.device_fp:"-")) return response({error:"COMMAND_BINDING_MISMATCH"},403);
      const roots=(await this.ctx.storage.get("roots"))||{};
      const root=roots[c.root_fp];
      if (!root?.active) return response({error:"ROOT_NOT_AUTHORIZED"},403);
      try {
        const rootSpki=decode64(root.spki,512);
        if (await fingerprint(rootSpki)!==c.root_fp) return response({error:"ROOT_REGISTRY_CORRUPT"},503);
        const rootKey=await importP256(rootSpki);
        const sig=decode64(body.signature,86);
        if (!sig || sig.length !== 64) return response({error:"SIGNATURE_ENCODING"},400);
        const bytes=canonical("EZERO_ROOT_DEVICE_MANAGEMENT_V1",c,MANAGEMENT_ORDER);
        const valid=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},rootKey,sig,bytes);
        if (!valid) return response({error:"PROOF_INVALID"},403);
      } catch (_) { return response({error:"PROOF_INVALID"},403); }
      const devices=(await this.ctx.storage.get("devices"))||{};
      if (action==="LIST_DEVICES") {
        const owned=Object.entries(devices).filter(([fp,d])=>d.root_fp===c.root_fp).map(([device_fp,d])=>({device_fp,active:!!d.active,enrolled_at:d.enrolled_at,revoked_at:d.revoked_at||null}));
        return response({ok:true,devices:owned});
      }
      const target=devices[c.device_fp];
      if (!target || target.root_fp!==c.root_fp) return response({error:"DEVICE_NOT_FOUND"},404);
      if (!target.active) return response({ok:true,status:"ALREADY_REVOKED",device_fp:c.device_fp});
      target.active=false;
      target.revoked_at=Date.now();
      devices[c.device_fp]=target;
      await this.ctx.storage.put("devices",devices);
      return response({ok:true,status:"REVOKED",device_fp:c.device_fp});
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
        await this.ctx.storage.put("challenge:"+challenge.challenge_id,{
          challenge,device_spki:body.device_spki,created_at:now
        });
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
      const saved = this.ctx.storage.transactionSync(() => {
        const kv = this.ctx.storage.kv;
        const value = kv.get(key);
        if (!value) return null;
        kv.delete(key);
        return value;
      });
      if (!saved) return response({error:"CHALLENGE_UNKNOWN_OR_USED"},409);
      const c = saved.challenge, now = Date.now();
      if (Number(c.expires_at) <= now || Number(c.expires_at)-saved.created_at > CHALLENGE_MS) {
        await this.ctx.storage.delete(key);
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
        const deviceSig = decode64(body.device_proof,86);
        const rootSig = decode64(body.root_approval,86);
        if (!deviceSig || !rootSig || deviceSig.length !== 64 || rootSig.length !== 64)
          return response({error:"SIGNATURE_ENCODING"},400);
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
