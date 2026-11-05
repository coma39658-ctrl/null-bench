/*
 * E-ZERO Secure Pair V1 — device-to-device RECONNECT PROOF LAB.
 * NOT an account/WebAuthn verifier, a trusted-device registry or public API.
 * Caller must supply server-authenticated registry records and an independently
 * generated, atomically consumed server challenge. This crypto stage does not
 * itself authorize connections or permit microphones, cameras, or ECU access.
 * In particular, never let browser-supplied record.status grant trust.
 */
export const RECONNECT_PROOF_TTL_MS=90_000;
const HEX32=/^[a-f0-9]{32}$/;
const HEX64=/^[a-f0-9]{64}$/;
const ACCOUNT=/^[A-Za-z0-9_-]{12,64}$/;
const encoder=new TextEncoder();
function fail(code){throw Error(code);}
function validTime(t){return Number.isSafeInteger(t)&&t>0;}
function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");}
function copy(bytes){return bytes instanceof Uint8Array?new Uint8Array(bytes):null;}
function error(code){return Object.freeze({ok:false,code,authorized:false});}
function keysOnly(record,allowed){
 return record&&typeof record==="object"&&!Array.isArray(record)&&
  Object.keys(record).sort().join("|")===allowed.slice().sort().join("|");
}
const FIELDS=["accountId","aKeyHash","aNonce","bKeyHash","bNonce",
 "expires","issued","purpose","serverNonce","sessionId","v"];
export function reconnectTranscriptV1(fields,now=Date.now()){
 if(!keysOnly(fields,FIELDS))fail("TRANSCRIPT_FIELDS_INVALID");
 const {accountId,aKeyHash,bKeyHash,aNonce,bNonce,serverNonce,sessionId,
  issued,expires,purpose,v}=fields;
 if(v!==1||purpose!=="RECONNECT"||!ACCOUNT.test(accountId)||
    !HEX32.test(sessionId)||!HEX32.test(serverNonce)||
    !HEX32.test(aNonce)||!HEX32.test(bNonce)||
    !HEX64.test(aKeyHash)||!HEX64.test(bKeyHash)||
    aKeyHash===bKeyHash||
    !validTime(issued)||!validTime(expires)||!validTime(now)||
    issued>now+30_000||expires<=now||
    expires<=issued||expires-issued>RECONNECT_PROOF_TTL_MS)
  fail("TRANSCRIPT_INVALID_OR_EXPIRED");
 // Roles and both key hashes are in the signed transcript. Reversal requires
 // a NEW session and cannot reuse role A's signature as role B's proof.
 return [
  "EZERO-SECURE-PAIR-V1-TRUSTED-RECONNECT",
  "v1", "RECONNECT",sessionId,serverNonce,aNonce,bNonce,accountId,
  aKeyHash,bKeyHash,String(issued),String(expires)
 ].join("\n");
}
async function oneProof(record,signature,expectedHash,accountId,transcriptText){
 if(!record||record.status!=="ACTIVE"||record.revoked===true)
  return "DEVICE_REVOKED_OR_UNREGISTERED";
 if(record.accountId!==accountId||record.keyHash!==expectedHash)
  return "REGISTRY_BINDING_FAILED";
 const spki=copy(record.publicSpki),sig=copy(signature);
 if(!spki||spki.length<60||spki.length>200||!sig||sig.length!==64)
  return "DEVICE_PROOF_INVALID";
 try{
  const fp=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",spki)));
  if(fp!==expectedHash)return "REGISTRY_BINDING_FAILED";
  const pub=await crypto.subtle.importKey("spki",spki,
    {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  const ok=await crypto.subtle.verify(
    {name:"ECDSA",hash:"SHA-256"},pub,sig,encoder.encode(transcriptText));
  return ok?null:"SIGNATURE_INVALID";
 }catch(_){return "DEVICE_PROOF_INVALID";}
}
export async function verifyReconnectDeviceProofsV1({
 transcript,signatureA,signatureB,registryA,registryB,now=Date.now()
}){
 let text;
 try{text=reconnectTranscriptV1(transcript,now);}
 catch(_){return error("TRANSCRIPT_INVALID_OR_EXPIRED");}
 // These must be server-lookup records, never a JSON object provided by a peer.
 // Independent account auth, user consent, live device registry and replay
 // consume are release blockers even if the cryptographic checks all PASS.
 if(registryA?.deviceId===registryB?.deviceId)
  return error("SAME_DEVICE_NOT_ALLOWED");
 const a=await oneProof(registryA,signatureA,transcript.aKeyHash,
  transcript.accountId,text);
 if(a)return error("A_"+a);
 const b=await oneProof(registryB,signatureB,transcript.bKeyHash,
  transcript.accountId,text);
 if(b)return error("B_"+b);
 return Object.freeze({
  ok:true,code:"BOTH_DEVICE_SIGNATURES_VALID",
  authorized:false, // signing a transcript is NOT account or session authority
  serverChallengeConsumed:false
 });
}
/*
 * Deterministic, synchronous replay gate for unit tests only.
 * A real Worker MUST perform durable nonce consume and state transition in
 * an atomic Durable Object storage transaction; this in-memory Set is not
 * appropriate as a networked session ledger or multi-isolate datastore.
 */
export class LocalReplayGateForTestsV1{
 #consumed=new Set();
 consume(sessionId,serverNonce){
  if(!HEX32.test(sessionId)||!HEX32.test(serverNonce))
   return error("REPLAY_KEY_INVALID");
  const key=sessionId+":"+serverNonce;
  if(this.#consumed.has(key))return error("REPLAY_REJECTED");
  this.#consumed.add(key);
  return Object.freeze({
   ok:true,code:"CHALLENGE_CONSUMED_IN_MEMORY_TEST_ONLY",authorized:false
  });
 }
}
