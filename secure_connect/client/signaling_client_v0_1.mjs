/*
 * E-ZERO Secure Connect — opt-in, persistent local identity and signed requests.
 * WebCrypto P-256 private key is non-extractable and stored via IndexedDB only
 * after a real user gesture/explicit consent; never in URL, shared link, localStorage.
 * Signed friend requests do not prove real-world human identity.
 * No default live API, no automatic registration, no background polling.
 */
const DB_NAME = "ezero_secure_connect_private_identity_v0_1";
const DB_STORE = "identity";
const PROFILE_KEY = "self";
const WIRE = "EZERO_SC_SIGNED_V1";
const ID = /^[0-9a-f]{64}$/;
const T = new TextEncoder();

function hex(bytes){return Array.from(bytes,x=>x.toString(16).padStart(2,"0")).join("");}
function b64(bytes){
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-")
    .replace(/\//g,"_").replace(/=+$/,"");
}
async function sha256(bytes){
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));
}
async function newIdentity(){
  if(!globalThis.isSecureContext && !globalThis.__EZERO_TEST_ONLY__)throw Error("HTTPS_REQUIRED");
  const keys=await crypto.subtle.generateKey({
    name:"ECDSA",namedCurve:"P-256"
  },false,["sign","verify"]);
  if(keys.privateKey.extractable)throw Error("PRIVATE_KEY_NOT_LOCKED");
  const spki=new Uint8Array(await crypto.subtle.exportKey("spki",keys.publicKey));
  return {version:1,keys,pub:b64(spki),account:await sha256(spki)};
}
async function idbStore() {
  if(typeof indexedDB==="undefined")throw Error("INDEXEDDB_NOT_AVAILABLE");
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(DB_STORE))
        req.result.createObjectStore(DB_STORE);
    };
    req.onerror=()=>reject(Error("PRIVATE_ID_STORAGE_UNAVAILABLE"));
    req.onsuccess=()=>{
      const db=req.result;
      const operate=(mode,fn)=>new Promise((ok,fail)=>{
        const tx=db.transaction(DB_STORE,mode);
        const r=fn(tx.objectStore(DB_STORE));
        r.onerror=()=>fail(Error("PRIVATE_ID_STORAGE_UNAVAILABLE"));
        r.onsuccess=()=>ok(r.result);
      });
      resolve({
        get:()=>operate("readonly",s=>s.get(PROFILE_KEY)),
        put:val=>operate("readwrite",s=>s.put(val,PROFILE_KEY)),
        close:()=>db.close()
      });
    };
  });
}
export async function createOrLoadIdentity({consent=false,storage}={}){
  if(!consent)throw Error("USER_CONSENT_REQUIRED");
  const own=!storage,db=storage||await idbStore();
  try{
    const saved=await db.get();
    if(saved && saved.version===1 && saved.keys?.privateKey?.extractable===false &&
       saved.keys.privateKey.usages?.includes("sign") && ID.test(saved.account)){
      const spki=new Uint8Array(await crypto.subtle.exportKey("spki",saved.keys.publicKey));
      if(await sha256(spki)===saved.account && b64(spki)===saved.pub)return saved;
    }
    // A lost/corrupted identity must not be silently replaced. User must know
    // that a new key means a new fingerprint and prior friends won't match it.
    if(saved)throw Error("IDENTITY_CORRUPTED_NO_AUTO_RESET");
    const created=await newIdentity();
    await db.put(created);
    return created;
  }finally{if(own)db.close();}
}
export function signatureText(body){
  return [WIRE,body.type,body.account,body.to||"",body.decision||"",
    body.pub||"",String(body.ts),body.nonce].join("\n");
}
export async function signAction(identity,type,{to,decision}={}){
  if(!identity?.keys?.privateKey || !ID.test(identity.account))throw Error("NO_LOCAL_IDENTITY");
  if(!["register","request","respond","inbox","friends","remove"].includes(type))throw Error("BAD_ACTION");
  if(["request","respond","remove"].includes(type) && !ID.test(to||""))throw Error("BAD_FRIEND");
  if(type==="respond" && !["accept","decline"].includes(decision))throw Error("BAD_DECISION");
  const nonce=hex(crypto.getRandomValues(new Uint8Array(16)));
  const body={v:1,type,account:identity.account};
  if(to)body.to=to;
  if(decision)body.decision=decision;
  if(type==="register")body.pub=identity.pub;
  body.ts=Date.now();body.nonce=nonce;
  body.signature=b64(await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},
    identity.keys.privateKey,T.encode(signatureText(body))));
  return body;
}
export function inviteLink(baseUrl,identity){
  const url=new URL(baseUrl);
  if(!ID.test(identity?.account||""))throw Error("BAD_ACCOUNT");
  if(url.protocol!=="https:")throw Error("HTTPS_REQUIRED");
  // The URL fragment is NOT sent in HTTP requests, Referer headers or host logs.
  url.search="";url.hash="friend="+identity.account;
  return url.href;
}
export function incomingInvite(href) {
  try{
    const hash=new URL(href).hash;
    const id=hash.startsWith("#friend=")?hash.slice(8):"";
    return ID.test(id)?id:null;
  }catch(_){return null;}
}
export async function apiRequest(endpoint,identity,type,{to,decision,pilotJoinSecret,transport}={}){
  const url=new URL(endpoint);
  if(url.protocol!=="https:" && !(globalThis.__EZERO_TEST_ONLY__ &&
      url.hostname==="127.0.0.1"))throw Error("HTTPS_REQUIRED");
  const body=await signAction(identity,type,{to,decision});
  const headers={"content-type":"application/json"};
  if(type==="register"){
    if(typeof pilotJoinSecret!=="string" || pilotJoinSecret.length<16)
      throw Error("PILOT_JOIN_SECRET_REQUIRED");
    headers["x-ezero-pilot-join"]=pilotJoinSecret;
  }
  const send=transport||fetch;
  const result=await send(url.href,{
    method:"POST",mode:"cors",cache:"no-store",credentials:"omit",
    referrerPolicy:"no-referrer",headers,body:JSON.stringify(body)
  });
  let data;
  try{data=await result.json();}catch(_){throw Error("SERVER_RESPONSE_INVALID");}
  if(!result.ok || data?.ok!==true){
    const error=new Error(data?.code||"SERVER_UNAVAILABLE");
    error.status=result.status;throw error;
  }
  return data;
}
export const __test={newIdentity,sha256};
