/* E-ZERO signaling ciphertext envelope v0.1.
 * Both browsers share a 256-bit AES-GCM secret in the URL fragment.
 * The signaling server receives only a random room ID, public timestamp and
 * ciphertext. Key never enters HTTP query strings, server URLs or logs.
 * Signed WebRTC SDP is still checked by the existing real call engine.
 */
const te=new TextEncoder(),td=new TextDecoder("utf-8",{fatal:true});
const ROOM=/^[a-f0-9]{32}$/,B64URL=/^[A-Za-z0-9_-]+$/;
export function b64url(bytes){
 let binary="";
 for(const b of bytes)binary+=String.fromCharCode(b);
 return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
export function unb64url(str){
 if(typeof str!=="string"||!B64URL.test(str)||str.length>200000)throw Error("BAD_BASE64");
 const raw=atob(str.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-str.length%4)%4));
 return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
export async function createRoom(){
 if(!globalThis.crypto?.subtle||!globalThis.crypto?.getRandomValues)
   throw Error("CRYPTO_REQUIRED");
 const roomBytes=new Uint8Array(16),secret=new Uint8Array(32);
 crypto.getRandomValues(roomBytes);crypto.getRandomValues(secret);
 return {room:Array.from(roomBytes,b=>b.toString(16).padStart(2,"0")).join(""),
   key:b64url(secret),created:Date.now()};
}
export function validRoom(v, now=Date.now()){
 return !!v&&ROOM.test(v.room||"")&&typeof v.key==="string"&&
   unb64url(v.key).length===32&&Number.isSafeInteger(v.created)&&
   v.created<=now+60000&&now-v.created<=600000;
}
export function buildRoomLink(pageUrl,room){
 if(!validRoom(room))throw Error("INVALID_ROOM");
 const url=new URL(pageUrl);
 if(url.protocol!=="https:" && url.hostname!=="localhost")throw Error("HTTPS_REQUIRED");
 url.searchParams.delete("connectRoom");url.searchParams.delete("created");
 url.searchParams.set("connectRoom",room.room);
 url.searchParams.set("created",String(room.created));
 url.hash="roomKey="+room.key;
 return url.href;
}
export function readRoomLink(url, now=Date.now()){
 const u=new URL(url);
 const room=u.searchParams.get("connectRoom"),created=Number(u.searchParams.get("created"));
 const hash=/^#roomKey=([A-Za-z0-9_-]{43})$/.exec(u.hash);
 if(!ROOM.test(room||"")||!Number.isSafeInteger(created)||
   !hash)throw Error("ROOM_LINK_INCOMPLETE");
 const result={room,created,key:hash[1]};
 if(!validRoom(result,now))throw Error("ROOM_LINK_EXPIRED_OR_INVALID");
 return result;
}
const associated=(room,type)=>te.encode("E-ZERO-SIGNAL-v1|"+room+"|"+type);
async function importSecret(room){
 if(!validRoom(room))throw Error("INVALID_ROOM");
 return crypto.subtle.importKey("raw",unb64url(room.key),
   {name:"AES-GCM"},false,["encrypt","decrypt"]);
}
export async function encryptSignal(room,type,signedSdpJson){
 if(!["offer","answer"].includes(type)||typeof signedSdpJson!=="string"||
   signedSdpJson.length<100||signedSdpJson.length>145000)throw Error("INVALID_SIGNAL");
 const key=await importSecret(room),iv=crypto.getRandomValues(new Uint8Array(12));
 const ciphertext=await crypto.subtle.encrypt({name:"AES-GCM",iv,
   additionalData:associated(room.room,type),tagLength:128},key,te.encode(signedSdpJson));
 return JSON.stringify({v:1,kind:"encrypted-signal",type,
   iv:b64url(iv),cipher:b64url(new Uint8Array(ciphertext))});
}
export async function decryptSignal(room,frame){
 if(typeof frame!=="string"||frame.length>180000)throw Error("FRAME_TOO_LARGE");
 let data;
 try{data=JSON.parse(frame);}catch(_){throw Error("INVALID_FRAME");}
 if(data?.v!==1||data.kind!=="encrypted-signal"||
    !["offer","answer"].includes(data.type)||
    typeof data.iv!=="string"||data.iv.length!==16||
    typeof data.cipher!=="string"||data.cipher.length>175000)
   throw Error("INVALID_FRAME");
 const iv=unb64url(data.iv),ct=unb64url(data.cipher);
 if(iv.length!==12||ct.length<30||ct.length>145500)throw Error("INVALID_FRAME");
 const key=await importSecret(room);
 let plain;
 try{plain=await crypto.subtle.decrypt({name:"AES-GCM",iv,
  additionalData:associated(room.room,data.type),tagLength:128},key,ct);}
 catch(_){throw Error("SIGNAL_AUTHENTICATION_FAILED");}
 const decoded=td.decode(new Uint8Array(plain));
 if(decoded.length>145000)throw Error("SIGNAL_TOO_LARGE");
 // Signature and fingerprint still must be verified by E-ZERO WebRTC core.
 return {type:data.type,raw:decoded};
}
