/*
 * E-ZERO Secure Connect — privacy-first room protocol, independent of Cloudflare.
 * No account database, chat/audio/video storage or phone-book access.
 */
export const ORIGIN = "https://coma39658-ctrl.github.io";
export const ROOM_TTL_MS = 10 * 60 * 1000;
export const MAX_BODY_BYTES = 4000;
const encoder = new TextEncoder();
const hex = bytes => Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");
const validHex64 = s => typeof s==="string" && /^[a-f0-9]{64}$/.test(s);
export function randomHex(size) {
  if (!Number.isInteger(size) || size<12 || size>64) throw Error("BAD_RANDOM_SIZE");
  const b=new Uint8Array(size);
  crypto.getRandomValues(b);
  return hex(b);
}
export async function hashSecret(token) {
  if(!validHex64(token))throw Error("BAD_CAPABILITY");
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",encoder.encode(token))));
}
function decode64(s) {
  if(typeof s!=="string" || s.length>800 || !/^[A-Za-z0-9_-]+$/.test(s)) throw Error("INVALID_INVITE");
  const raw=atob(s.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-s.length%4)%4));
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function verifySignedIdentity(raw, now=Date.now()) {
  if(typeof raw!=="string" || raw.length>1400)throw Error("INVALID_INVITE");
  const p=raw.split(".");
  if(p.length!==6 || p[0]!=="EZERO1" || !validHex64(p[2]) ||
     !/^[a-f0-9]{24}$/.test(p[3]) || !/^\d{13}$/.test(p[4]))
    throw Error("INVALID_INVITE");
  const exp=Number(p[4]);
  if(!Number.isSafeInteger(exp)||exp<=now||exp>now+ROOM_TTL_MS+10000)throw Error("EXPIRED_INVITE");
  let spki,sig,key;
  try {
    spki=decode64(p[1]);sig=decode64(p[5]);
    if(spki.length<45 || spki.length>140 || sig.length<55 || sig.length>96)throw Error("BAD_KEY");
    key=await crypto.subtle.importKey("spki",spki,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  }catch(_){throw Error("INVALID_INVITE");}
  const fp=hex(new Uint8Array(await crypto.subtle.digest("SHA-256",spki)));
  if(fp!==p[2])throw Error("FINGERPRINT_MISMATCH");
  const msg=["EZERO-IDENTITY-1",ORIGIN,p[1],p[2],p[3],String(exp)].join("|");
  if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,sig,encoder.encode(msg)))
    throw Error("INVALID_SIGNATURE");
  return Object.freeze({fingerprint:fp,signedId:raw,expiresAt:exp});
}
export function roomDecision(room,action,authHash,claim,now=Date.now()) {
  if(!room || room.expiresAt<=now)return {status:410,code:"INVITE_EXPIRED"};
  const isOwner=authHash===room.ownerHash;
  const isJoiner=authHash===room.joinHash;
  if(!isOwner&&!isJoiner)return {status:404,code:"INVITE_NOT_FOUND"};
  if(action==="lookup" && isJoiner)
    return {status:200,code:"INVITE_FOUND",inviterSignedId:room.ownerSignedId,
      inviterFingerprint:room.ownerFp,expiresAt:room.expiresAt};
  if(action==="request" && isJoiner) {
    if(!claim?.signedId || !validHex64(claim.fp) || claim.fp===room.ownerFp)
      return {status:400,code:"INVALID_REQUEST"};
    if(room.state!=="INVITED")
      return {status:409,code:"ALREADY_REQUESTED"};
    const next={...room,state:"REQUEST_PENDING",joinerSignedId:claim.signedId,joinerFp:claim.fp};
    return {status:202,code:"REQUEST_PENDING",next};
  }
  if(action==="decide" && isOwner) {
    if(room.state!=="REQUEST_PENDING")return {status:409,code:"NO_PENDING_REQUEST"};
    if(typeof claim?.approve!=="boolean")return {status:400,code:"DECISION_REQUIRED"};
    const next={...room,state:claim.approve?"FRIEND_APPROVED":"FRIEND_DECLINED"};
    return {status:200,code:next.state,next};
  }
  if(action==="status") {
    if(!isOwner&&!isJoiner)return {status:404,code:"INVITE_NOT_FOUND"};
    // Consent boundary: a requester sees the sender's public ID only after its
    // capability is valid; the sender sees requester's signed public ID for review.
    const info={status:200,code:room.state,expiresAt:room.expiresAt};
    if(isOwner && room.joinerFp) {
      info.requesterFingerprint=room.joinerFp;
      info.requesterSignedId=room.joinerSignedId;
    }
    if(isJoiner && room.state==="FRIEND_APPROVED") {
      info.inviterFingerprint=room.ownerFp;
      info.inviterSignedId=room.ownerSignedId;
    }
    return info;
  }
  return {status:403,code:"NOT_AUTHORIZED"};
}
