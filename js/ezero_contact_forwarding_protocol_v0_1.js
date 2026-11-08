/* E-ZERO public contact referral protocol v0.1 — staging only.
 * SIGNED PUBLIC SHARE CARD, never a WebRTC invite or trusted friend.
 * The subject explicitly consents to forwardable disclosure and signs
 * their own card with a non-exportable device key. Nothing is uploaded.
 */
(function (root, factory) {
  const api=factory();
  if(typeof module==="object" && module.exports)module.exports=api;
  else root.EZERO_CONTACT_REFERRAL=Object.freeze(api);
})(typeof globalThis==="object"?globalThis:this,function(){
"use strict";
const FP=/^[a-f0-9]{64}$/;
const BASE64=/^[A-Za-z0-9_-]+$/;
const PAGE=/\/ezero_trusted_friends_staging_20261106\.html$/;
const TYPE="EZERO-SIGNED-CONTACT-1";
const MAX_LIFE=24*60*60*1000;
const MAX_TOKEN=2100;
const MAX_NAME=40;
const te=new TextEncoder();
function cryptoApi(){
  const c=globalThis.crypto;
  if(!c?.subtle||!c?.getRandomValues)throw Error("CRYPTO_UNAVAILABLE");
  return c;
}
function b64encode(bytes){
  let binary="";
  for(const b of bytes)binary+=String.fromCharCode(b);
  return btoa(binary).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function b64decode(str,maxBytes=1800){
  if(typeof str!=="string"||!BASE64.test(str)||str.length>Math.ceil(maxBytes*4/3)+4)
    throw Error("INVALID_BASE64");
  const bin=atob(str.replace(/-/g,"+").replace(/_/g,"/")+
    "=".repeat((4-str.length%4)%4));
  if(bin.length>maxBytes)throw Error("OVERSIZED_PAYLOAD");
  return Uint8Array.from(bin,c=>c.charCodeAt(0));
}
function nameOf(v){
  if(typeof v!=="string")throw Error("INVALID_NAME");
  const text=v.trim().replace(/\s+/g," ");
  if(!text||text.length>MAX_NAME||/[\u0000-\u001f\u007f]/.test(text))
    throw Error("INVALID_NAME");
  return text;
}
function urlOf(link){
  let u;try{u=new URL(link);}catch(_){throw Error("INVALID_CONTACT_URL");}
  if(u.protocol!=="https:"||!PAGE.test(u.pathname)||u.search)
    throw Error("INVALID_CONTACT_URL");
  return u;
}
function canonical(p){
  return JSON.stringify([TYPE,p.v,p.origin,p.fp,p.spki,p.name,
    p.issued,p.expires,p.nonce,p.allowForward===true]);
}
function validate(p,u,now){
  if(!p||typeof p!=="object"||Array.isArray(p)||p.v!==1||
    p.type!==TYPE||p.origin!==u.origin||!FP.test(p.fp||"")||
    typeof p.spki!=="string"||!BASE64.test(p.spki)||p.spki.length>240||
    !BASE64.test(p.nonce||"")||p.nonce.length!==22||
    p.allowForward!==true||!Number.isSafeInteger(p.issued)||
    !Number.isSafeInteger(p.expires)||p.issued>now+60*1000||
    p.expires<=now||p.expires-p.issued>MAX_LIFE||
    p.expires<=p.issued)throw Error("INVALID_OR_EXPIRED_CONTACT");
  nameOf(p.name);
  return p;
}
async function fingerprint(spki){
  const digest=await cryptoApi().subtle.digest("SHA-256",b64decode(spki,150));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}
async function create({identity,name,baseUrl,consent=false,now=Date.now()}){
  if(consent!==true)throw Error("OWNER_CONSENT_REQUIRED");
  const u=urlOf(baseUrl);
  if(!identity?.keys?.privateKey||identity.keys.privateKey.extractable!==false||
     identity.keys.privateKey.algorithm?.name!=="ECDSA"||
     identity.keys.privateKey.algorithm?.namedCurve!=="P-256"||
     !FP.test(identity.fingerprint||"")||typeof identity.spki!=="string")
    throw Error("INVALID_SAVED_DEVICE_IDENTITY");
  if((await fingerprint(identity.spki))!==identity.fingerprint)
    throw Error("DEVICE_IDENTITY_MISMATCH");
  const rand=new Uint8Array(16);cryptoApi().getRandomValues(rand);
  const p={type:TYPE,v:1,origin:u.origin,fp:identity.fingerprint,
    spki:identity.spki,name:nameOf(name),issued:now,expires:now+MAX_LIFE,
    nonce:b64encode(rand),allowForward:true};
  const pub=await cryptoApi().subtle.importKey("spki",b64decode(p.spki,150),
    {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  const bytes=te.encode(canonical(p));
  const signature=await cryptoApi().subtle.sign({name:"ECDSA",hash:"SHA-256"},
    identity.keys.privateKey,bytes);
  // Ensure the saved private key matches the bound public device identity.
  if(!await cryptoApi().subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,signature,bytes))
    throw Error("IDENTITY_KEY_MISMATCH");
  const token=b64encode(te.encode(JSON.stringify({p,s:b64encode(new Uint8Array(signature))})));
  if(token.length>MAX_TOKEN)throw Error("CONTACT_TOO_LARGE");
  u.hash="contact="+token;
  return {url:u.href,payload:p};
}
async function verify(link,{expectedOrigin,now=Date.now()}={}){
  const u=urlOf(link);
  if(u.origin!==expectedOrigin||!expectedOrigin)throw Error("CROSS_ORIGIN_CONTACT");
  if(!/^#contact=[A-Za-z0-9_-]+$/.test(u.hash))throw Error("INVALID_CONTACT_HASH");
  const token=u.hash.slice("#contact=".length);
  if(token.length>MAX_TOKEN)throw Error("OVERSIZED_CONTACT");
  let data;try{
    data=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(b64decode(token,1600)));
  }catch(_){throw Error("INVALID_CONTACT_PAYLOAD");}
  const p=validate(data?.p,u,now);
  if(typeof data.s!=="string"||!BASE64.test(data.s)||data.s.length>180)
    throw Error("INVALID_CONTACT_SIGNATURE");
  if((await fingerprint(p.spki))!==p.fp)throw Error("FINGERPRINT_MISMATCH");
  const key=await cryptoApi().subtle.importKey("spki",b64decode(p.spki,150),
    {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
  const ok=await cryptoApi().subtle.verify({name:"ECDSA",hash:"SHA-256"},
    key,b64decode(data.s,100),te.encode(canonical(p)));
  if(!ok)throw Error("SIGNATURE_INVALID");
  return Object.freeze({url:u.href,fp:p.fp,name:p.name,
    expires:p.expires,forwardable:true,proof:"SIGNED_DEVICE_KEY_NOT_HUMAN_IDENTITY"});
}
return Object.freeze({create,verify,TYPE,MAX_LIFE});
});