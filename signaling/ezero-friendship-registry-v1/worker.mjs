const PROTOCOL = "E-ZERO-TRUST-1";
const APPROVAL_PATH = "/v1/relationships/approve";
const AUTH_PATH = "/v1/authorize-call";
const FINGERPRINT_RE = /^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/;
const ID_RE = /^[A-Za-z0-9_-]{32}$/;
const RELATIONSHIP_RE = /^[a-f0-9]{64}$/;
const MAX_BODY = 16 * 1024;
const CALL_TTL_MS = 30_000;
const MAX_USED_CALLS = 256;

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}
function exactKeys(value, expected) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    Object.keys(value).sort().join(",") === [...expected].sort().join(",");
}
function canonical(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  throw new Error("REGISTRY_CANONICAL_INVALID");
}
function decode(value, expectedBytes) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("REGISTRY_BASE64_INVALID");
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
  let binary;
  try { binary = atob(padded); } catch (_) { throw new Error("REGISTRY_BASE64_INVALID"); }
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  if (expectedBytes && bytes.length !== expectedBytes) throw new Error("REGISTRY_BASE64_LENGTH_INVALID");
  return bytes;
}
async function sha256Hex(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
}
async function fingerprint(spki) {
  const digest = await crypto.subtle.digest("SHA-256", decode(spki));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0").toUpperCase()).join(":");
}
async function validateTranscript(t, now = Date.now()) {
  const keys = ["createdAt","inviteExpiresAt","inviteIssuedAt","inviteNonce","participants","protocol","purpose","roomId","v"];
  if (!exactKeys(t, keys) || t.v !== 1 || t.protocol !== PROTOCOL || t.purpose !== "mutual-contact-save" ||
      !ID_RE.test(t.roomId || "") || !ID_RE.test(t.inviteNonce || "") ||
      !Number.isSafeInteger(t.inviteIssuedAt) || !Number.isSafeInteger(t.inviteExpiresAt) ||
      !Number.isSafeInteger(t.createdAt) || t.inviteExpiresAt <= now ||
      t.inviteExpiresAt <= t.inviteIssuedAt || t.inviteExpiresAt - t.inviteIssuedAt > 90_000 ||
      t.createdAt < t.inviteIssuedAt || t.createdAt > t.inviteExpiresAt ||
      !Array.isArray(t.participants) || t.participants.length !== 2) throw new Error("REGISTRY_TRANSCRIPT_INVALID");
  const [a,b] = t.participants;
  if (!exactKeys(a, ["fingerprint","publicKeySpki"]) || !exactKeys(b, ["fingerprint","publicKeySpki"]) ||
      !FINGERPRINT_RE.test(a.fingerprint || "") || !FINGERPRINT_RE.test(b.fingerprint || "") ||
      !(a.fingerprint < b.fingerprint)) throw new Error("REGISTRY_PARTICIPANTS_INVALID");
  for (const p of t.participants) if (await fingerprint(p.publicKeySpki) !== p.fingerprint) {
    throw new Error("REGISTRY_PARTICIPANT_KEY_MISMATCH");
  }
  return t;
}
async function validateApproval(transcript, approval) {
  if (!exactKeys(approval, ["signerFingerprint","transcriptHash","signature"])) throw new Error("REGISTRY_APPROVAL_INVALID");
  const participant = transcript.participants.find(p => p.fingerprint === approval.signerFingerprint);
  if (!participant) throw new Error("REGISTRY_APPROVAL_SIGNER_UNKNOWN");
  const transcriptBytes = new TextEncoder().encode(canonical(transcript));
  if (approval.transcriptHash !== await sha256Hex(transcriptBytes)) throw new Error("REGISTRY_TRANSCRIPT_HASH_MISMATCH");
  const key = await crypto.subtle.importKey("spki", decode(participant.publicKeySpki),
    { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  const valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key,
    decode(approval.signature, 64), transcriptBytes);
  if (!valid) throw new Error("REGISTRY_APPROVAL_SIGNATURE_INVALID");
  return true;
}

async function validateV2Transcript(t, now = Date.now(), publicOrigin = "") {
  const keys = ["inviteExpiresAt","inviteIssuedAt","inviteNonce","inviterFingerprint","origin","participants","protocol","purpose","roomId","v"];
  if (!exactKeys(t, keys) || t.v !== 2 || t.protocol !== "E-ZERO-TRUST-2" ||
      t.purpose !== "consented-invite-auto-save" || t.origin !== publicOrigin ||
      !ID_RE.test(t.roomId || "") || !ID_RE.test(t.inviteNonce || "") ||
      !Number.isSafeInteger(t.inviteIssuedAt) || !Number.isSafeInteger(t.inviteExpiresAt) ||
      t.inviteExpiresAt <= now || t.inviteExpiresAt <= t.inviteIssuedAt ||
      t.inviteExpiresAt - t.inviteIssuedAt > 90_000 ||
      !FINGERPRINT_RE.test(t.inviterFingerprint || "") ||
      !Array.isArray(t.participants) || t.participants.length !== 2) throw new Error("REGISTRY_V2_TRANSCRIPT_INVALID");
  const [a,b] = t.participants;
  if (!exactKeys(a, ["fingerprint","publicKeySpki"]) || !exactKeys(b, ["fingerprint","publicKeySpki"]) ||
      !FINGERPRINT_RE.test(a.fingerprint || "") || !FINGERPRINT_RE.test(b.fingerprint || "") ||
      !(a.fingerprint < b.fingerprint) || !t.participants.some(p => p.fingerprint === t.inviterFingerprint)) {
    throw new Error("REGISTRY_V2_PARTICIPANTS_INVALID");
  }
  for (const p of t.participants) if (await fingerprint(p.publicKeySpki) !== p.fingerprint) throw new Error("REGISTRY_V2_PARTICIPANT_KEY_MISMATCH");
}
async function validateV2Handshake(transcript, role, proof) {
  if (!exactKeys(proof, ["payload","signature"]) || !exactKeys(proof.payload,
      ["challenge","challengeExpiresAt","fingerprint","inviteNonce","origin","protocol","publicKeySpki","role","roomId","v"])) throw new Error("REGISTRY_V2_HANDSHAKE_INVALID");
  const p = proof.payload;
  const participant = transcript.participants.find(x => x.fingerprint === p.fingerprint);
  if (!participant || p.v !== 1 || p.protocol !== "E-ZERO-SIGNAL-HELLO-1" ||
      p.origin !== transcript.origin || p.roomId !== transcript.roomId || p.inviteNonce !== transcript.inviteNonce ||
      p.role !== role || p.publicKeySpki !== participant.publicKeySpki ||
      !/^[A-Za-z0-9_-]{43}$/.test(p.challenge || "") || !Number.isSafeInteger(p.challengeExpiresAt) ||
      p.challengeExpiresAt < transcript.inviteIssuedAt || p.challengeExpiresAt > transcript.inviteExpiresAt + 30_000) {
    throw new Error("REGISTRY_V2_HANDSHAKE_BINDING_INVALID");
  }
  const key = await crypto.subtle.importKey("spki", decode(participant.publicKeySpki), { name: "ECDSA", namedCurve: "P-256" }, true, ["verify"]);
  if (!await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, decode(proof.signature, 64), new TextEncoder().encode(canonical(p)))) {
    throw new Error("REGISTRY_V2_HANDSHAKE_SIGNATURE_INVALID");
  }
}

async function readJson(request) {
  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY) throw new Error("REGISTRY_BODY_TOO_LARGE");
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY) throw new Error("REGISTRY_BODY_TOO_LARGE");
  try { return JSON.parse(raw); } catch (_) { throw new Error("REGISTRY_JSON_INVALID"); }
}
function errorStatus(error) {
  if (/TOO_LARGE/.test(error.message)) return 413;
  if (/INVALID|MISMATCH|UNKNOWN|SIGNATURE|HASH/.test(error.message)) return 400;
  return 503;
}

export class EzeroFriendshipRelationship {
  constructor(ctx) { this.ctx = ctx; }
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
    const url = new URL(request.url);
    if (url.pathname !== "/approve" && url.pathname !== "/authorize" && url.pathname !== "/register-v2") return json({ error: "NOT_FOUND" }, 404);
    return this.ctx.blockConcurrencyWhile(async () => {
      try {
        const body = await readJson(request);

        if (url.pathname === "/register-v2") {
          if (!exactKeys(body, ["protocol","relationshipId","transcript","handshakes"]) ||
              body.protocol !== "E-ZERO-REGISTRY-V2-REGISTER-1" || !RELATIONSHIP_RE.test(body.relationshipId || "") ||
              !exactKeys(body.handshakes, ["host","guest"])) return json({ error: "REGISTRY_V2_REQUEST_INVALID" }, 400);
          await validateV2Transcript(body.transcript, Date.now(), body.transcript?.origin || "");
          await validateV2Handshake(body.transcript, "host", body.handshakes.host);
          await validateV2Handshake(body.transcript, "guest", body.handshakes.guest);
          const relationshipId = await sha256Hex(new TextEncoder().encode(canonical(body.transcript)));
          if (body.relationshipId !== relationshipId) return json({ error: "REGISTRY_V2_RELATIONSHIP_ID_MISMATCH" }, 400);
          const prior = await this.ctx.storage.get("relationship");
          if (prior && (prior.relationshipId !== relationshipId || canonical(prior.transcript) !== canonical(body.transcript))) {
            return json({ error: "RELATIONSHIP_CONFLICT" }, 409);
          }
          const record = prior || { relationshipId, transcript: body.transcript, approvals: {},
            status: "ACTIVE", registration: "SERVER_VERIFIED_MUTUAL_V2_HANDSHAKES", createdAt: Date.now() };
          record.status = "ACTIVE";
          record.updatedAt = Date.now();
          await this.ctx.storage.put("relationship", record);
          return json({ protocol: "E-ZERO-REGISTRY-RESULT-2", relationshipId, status: "ACTIVE" }, 200);
        }

        if (url.pathname === "/approve") {
          if (!exactKeys(body, ["protocol","relationshipId","transcript","approval"]) ||
              body.protocol !== "E-ZERO-REGISTRY-APPROVAL-1") return json({ error: "REQUEST_INVALID" }, 400);
          const transcript = await validateTranscript(body.transcript);
          const relationshipId = await sha256Hex(new TextEncoder().encode(canonical(transcript)));
          if (body.relationshipId !== relationshipId || !RELATIONSHIP_RE.test(body.relationshipId)) {
            return json({ error: "RELATIONSHIP_ID_MISMATCH" }, 400);
          }
          await validateApproval(transcript, body.approval);
          let record = await this.ctx.storage.get("relationship");
          if (record && (record.relationshipId !== relationshipId || canonical(record.transcript) !== canonical(transcript))) {
            return json({ error: "RELATIONSHIP_CONFLICT" }, 409);
          }
          if (!record) record = { relationshipId, transcript, approvals: {}, status: "PENDING", createdAt: Date.now() };
          const signer = body.approval.signerFingerprint;
          const prior = record.approvals[signer];
          if (prior && prior.signature !== body.approval.signature) return json({ error: "APPROVAL_CONFLICT" }, 409);
          record.approvals[signer] = body.approval;
          const approved = transcript.participants.filter(p => record.approvals[p.fingerprint]);
          record.status = approved.length === 2 ? "ACTIVE" : "PENDING";
          record.updatedAt = Date.now();
          await this.ctx.storage.put("relationship", record);
          return json({ protocol: "E-ZERO-REGISTRY-RESULT-1", relationshipId,
            status: record.status, approvals: approved.length }, record.status === "ACTIVE" ? 200 : 202);
        }

        if (!exactKeys(body, ["protocol","relationshipId","callerFingerprint","recipientFingerprint","callId","nonce","mode","expiresAt"]) ||
            body.protocol !== "E-ZERO-SAVED-FRIEND-AUTH-1" ||
            !RELATIONSHIP_RE.test(body.relationshipId || "") ||
            !FINGERPRINT_RE.test(body.callerFingerprint || "") ||
            !FINGERPRINT_RE.test(body.recipientFingerprint || "") ||
            body.callerFingerprint === body.recipientFingerprint ||
            !ID_RE.test(body.callId || "") || !ID_RE.test(body.nonce || "") ||
            !["audio","video"].includes(body.mode) ||
            !Number.isSafeInteger(body.expiresAt) || body.expiresAt <= Date.now() ||
            body.expiresAt > Date.now() + CALL_TTL_MS) return json({ error: "CALL_AUTH_REQUEST_INVALID" }, 400);
        const record = await this.ctx.storage.get("relationship");
        if (!record || record.status !== "ACTIVE" ||
            !record.transcript.participants.some(p => p.fingerprint === body.callerFingerprint) ||
            !record.transcript.participants.some(p => p.fingerprint === body.recipientFingerprint)) {
          return json({ authorized: false }, 403);
        }
        const now = Date.now();
        const used = (await this.ctx.storage.get("usedCalls") || []).filter(x => x.expiresAt > now);
        if (used.some(x => x.callId === body.callId || x.nonce === body.nonce)) {
          return json({ error: "CALL_REPLAY_REJECTED" }, 409);
        }
        used.push({ callId: body.callId, nonce: body.nonce, expiresAt: body.expiresAt });
        await this.ctx.storage.put("usedCalls", used.slice(-MAX_USED_CALLS));
        return json({ authorized: true, relationshipId: record.relationshipId });
      } catch (error) {
        return json({ error: error?.message || "REGISTRY_FAILURE" }, errorStatus(error));
      }
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") return json({ service: "ezero-friendship-registry", status: "ok", release: "staging" });

    if (url.pathname === "/v1/relationships/register-v2") {
      if (request.method !== "POST" || !env.PUBLIC_ORIGIN || request.headers.get("Origin") !== env.PUBLIC_ORIGIN) return json({ error: "ORIGIN_OR_METHOD_REJECTED" }, 403);
      try {
        const body = await readJson(request);
        if (!exactKeys(body, ["protocol","relationshipId","transcript","handshakes"]) ||
            body.protocol !== "E-ZERO-REGISTRY-V2-REGISTER-1" || !RELATIONSHIP_RE.test(body.relationshipId || "") || body.transcript?.origin !== env.PUBLIC_ORIGIN) return json({ error: "REGISTRY_V2_REQUEST_INVALID" }, 400);
        const id = env.RELATIONSHIPS.idFromName(body.relationshipId);
        return env.RELATIONSHIPS.get(id).fetch("https://relationship.internal/register-v2", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
      } catch (error) { return json({ error: error?.message || "REGISTRY_V2_REGISTER_FAILED" }, errorStatus(error)); }
    }
    if (url.pathname === APPROVAL_PATH) {
      if (request.method !== "POST" || !env.PUBLIC_ORIGIN || request.headers.get("Origin") !== env.PUBLIC_ORIGIN) {
        return json({ error: "ORIGIN_OR_METHOD_REJECTED" }, 403);
      }
      try {
        const body = await readJson(request);
        if (!exactKeys(body, ["protocol","relationshipId","transcript","approval"]) ||
            body.protocol !== "E-ZERO-REGISTRY-APPROVAL-1" ||
            !RELATIONSHIP_RE.test(body.relationshipId || "")) return json({ error: "APPROVAL_REQUEST_INVALID" }, 400);
        const id = env.RELATIONSHIPS.idFromName(body.relationshipId);
        return env.RELATIONSHIPS.get(id).fetch("https://relationship.internal/approve", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
      } catch (error) { return json({ error: error?.message || "APPROVAL_FAILED" }, errorStatus(error)); }
    }
    if (url.pathname === AUTH_PATH) {
      if (request.method !== "POST" || !env.PUBLIC_ORIGIN || request.headers.get("Origin") !== env.PUBLIC_ORIGIN) {
        return json({ error: "ORIGIN_OR_METHOD_REJECTED" }, 403);
      }
      try {
        const body = await readJson(request);
        if (!RELATIONSHIP_RE.test(body?.relationshipId || "")) return json({ error: "RELATIONSHIP_ID_INVALID" }, 400);
        const id = env.RELATIONSHIPS.idFromName(body.relationshipId);
        return env.RELATIONSHIPS.get(id).fetch("https://relationship.internal/authorize", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
        });
      } catch (error) { return json({ error: error?.message || "AUTHORIZATION_FAILED" }, errorStatus(error)); }
    }
    return json({ error: "NOT_FOUND" }, 404);
  }
};
