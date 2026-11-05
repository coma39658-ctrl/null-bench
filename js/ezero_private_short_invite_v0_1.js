/* E-ZERO 10-minute encrypted short links.
 * HTTPS Cloudflare sees only AES-GCM ciphertext (not SDP, ICE IP addresses,
 * personal names/photos, or the random decryption key). Decryption key is
 * in the URL fragment, never sent in HTTP requests.
 * Strictly user-initiated upload; server is staging-only until tested.
 */
(() => {
  "use strict";
  const ENDPOINT="https://ezero-shortlink-pilot.coma39658.workers.dev";
  const B64=/^[A-Za-z0-9_-]+$/;
  const ID=/^[A-Za-z0-9_-]{22}$/;
  const KEY=/^[A-Za-z0-9_-]{43}$/;
  const MAX_SIGNAL=120000;
  const t64=bytes=>btoa(String.fromCharCode(...bytes))
    .replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  function from64(value,max=190000){
    if(typeof value!=="string"||!B64.test(value)||value.length>max)throw Error("INVALID_BASE64");
    const raw=atob(value.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-value.length%4)%4));
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  async function exchange(url,options={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{...options,mode:"cors",credentials:"omit",
        cache:"no-store",referrerPolicy:"no-referrer",signal:controller.signal});
      if(!response.ok)throw Error(response.status===410?"EXPIRED_SHORT_LINK":"SHORT_LINK_UNAVAILABLE");
      return await response.json();
    }finally{clearTimeout(timer);}
  }
  async function create(raw){
    if(typeof raw!=="string"||raw.length<100||raw.length>MAX_SIGNAL)
      throw Error("BAD_SIGNAL_SIZE");
    const parsed=JSON.parse(raw);
    if(parsed?.v!==1||!["offer","answer"].includes(parsed.type)||
       typeof parsed.sdp!=="string"||!parsed.sdp.startsWith("v=0")||
       typeof parsed.sig!=="string"||typeof parsed.fp!=="string"||
       !/^[a-f0-9]{64}$/.test(parsed.fp))throw Error("BAD_SIGNED_SIGNAL");
    const key=crypto.getRandomValues(new Uint8Array(32));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    try{
      const aes=await crypto.subtle.importKey("raw",key,{name:"AES-GCM"},false,["encrypt"]);
      const ciphertext=new Uint8Array(await crypto.subtle.encrypt(
        {name:"AES-GCM",iv},aes,new TextEncoder().encode(raw)));
      const result=await exchange(ENDPOINT+"/v1/links",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({cipher:t64(ciphertext),iv:t64(iv)})
      });
      if(!ID.test(result?.id)||result.ttlSeconds!==600 ||
         result.url!==ENDPOINT+"/i/"+result.id)throw Error("UNEXPECTED_SERVER");
      return result.url+"#k="+t64(key);
    }finally{key.fill(0);}
  }
  async function resolve(fragment){
    if(typeof fragment!=="string")throw Error("INVALID_SHORT_LINK");
    const m=/^#s=([A-Za-z0-9_-]{22})\.([A-Za-z0-9_-]{43})$/.exec(fragment);
    if(!m||!ID.test(m[1])||!KEY.test(m[2]))throw Error("INVALID_SHORT_LINK");
    const result=await exchange(ENDPOINT+"/v1/links/"+m[1]);
    const iv=from64(result?.iv,16);
    const cipher=from64(result?.cipher);
    const key=from64(m[2],43);
    if(iv.length!==12||key.length!==32||cipher.length>MAX_SIGNAL+200)throw Error("INVALID_SHORT_LINK");
    try{
      const aes=await crypto.subtle.importKey("raw",key,{name:"AES-GCM"},false,["decrypt"]);
      const bytes=await crypto.subtle.decrypt({name:"AES-GCM",iv},aes,cipher);
      const raw=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
      if(raw.length>MAX_SIGNAL)throw Error("BAD_SIGNAL_SIZE");
      return raw;
    }finally{key.fill(0);}
  }
  window.EZERO_PRIVATE_SHORT_INVITES=Object.freeze({create,resolve});
})();