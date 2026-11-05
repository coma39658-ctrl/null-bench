/* E-ZERO private short invitation pilot.
 * Only opaque AES-GCM ciphertext reaches this Worker (no SDP, names,
 * avatars, contact lists or plaintext messages). Browser holds key in #k=
 * URL fragment, never sent over HTTP. Links expire in ten minutes.
 * STAGING ONLY: independent rate limiting is required before public use.
 */
import { DurableObject } from "cloudflare:workers";

const ID=/^[A-Za-z0-9_-]{22}$/;
const CIPHER=/^[A-Za-z0-9_-]{32,180000}$/;
const IV=/^[A-Za-z0-9_-]{16}$/;
const TEN_MINUTES=600000;
const MAX_BODY=181000;
const PAGE="https://coma39658-ctrl.github.io/null-bench/ezero_secure_connect_communications_v0_3.html";
const LOGO="https://coma39658-ctrl.github.io/null-bench/icon-512.png";
const json=value=>JSON.stringify(value);
const baseHeaders={"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
function corsHeaders(origin,env){
  if(origin!==env.PUBLIC_ORIGIN)return baseHeaders;
  return {...baseHeaders,"Access-Control-Allow-Origin":env.PUBLIC_ORIGIN,
    "Access-Control-Allow-Methods":"GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
}
const respond=(data,status=200,headers={})=>new Response(json(data),{
  status,headers:{"Content-Type":"application/json",...headers}
});
function landing(id){
  // Generic E-ZERO preview image only, never a private friend's DP.
  // Static server-rendered OG metadata works with supported link crawlers.
  const canonical="https://ezero-shortlink-pilot.coma39658.workers.dev/i/"+id;
  return '<!doctype html><html lang="ur" dir="rtl"><head>'+
    '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="referrer" content="no-referrer">'+
    '<title>E-ZERO Secure Connect — محفوظ دعوت</title>'+
    '<meta property="og:type" content="website">'+
    '<meta property="og:title" content="E-ZERO Secure Connect — دوست کی محفوظ دعوت">'+
    '<meta property="og:description" content="دوست کی محفوظ عارضی دعوت؛ کھولنے کے بعد منظوری دیں۔">'+
    '<meta property="og:url" content="'+canonical+'">'+
    '<meta property="og:image" content="'+LOGO+'">'+
    '<meta name="robots" content="noindex,nofollow,noarchive">'+
    '<script src="/v1/redirect.js" defer></script></head>'+
    '<body><main><h1>E-ZERO Secure Connect</h1>'+
    '<p id="message">محفوظ دعوت E-ZERO میں کھولی جارہی ہے۔</p>'+
    '<a href="'+PAGE+'">E-ZERO کھولیں</a></main></body></html>';
}
const redirectScript="(() => {\n  \"use strict\";\n  const id=location.pathname.match(/^\\/i\\/([A-Za-z0-9_-]{22})$/);\n  const key=location.hash.match(/^#k=([A-Za-z0-9_-]{43})$/);\n  if(!id||!key){\n    const el=document.getElementById(\"message\");\n    if(el)el.textContent=\"دعوت کا محفوظ حصہ غائب ہے؛ دوست سے مکمل لنک منگوائیں۔\";\n    return;\n  }\n  const target=new URL(\"https://coma39658-ctrl.github.io/null-bench/ezero_secure_connect_communications_v0_3.html\");\n  target.hash=\"s=\"+id[1]+\".\"+key[1];\n  location.replace(target.href);\n})();";
export default {
  async fetch(request,env){
    const u=new URL(request.url);
    const origin=request.headers.get("Origin");
    const headers=corsHeaders(origin,env);
    if(request.method==="GET"&&u.pathname==="/v1/health")
      return respond({status:"ok",version:"0.1",purpose:"encrypted-shortlink-only"},200,baseHeaders);
    if(request.method==="GET"&&u.pathname==="/v1/redirect.js")
      return new Response(redirectScript,{headers:{...baseHeaders,
        "Content-Type":"text/javascript; charset=utf-8","Cross-Origin-Resource-Policy":"same-origin"}});
    const landingPath=/^\/i\/([A-Za-z0-9_-]{22})$/.exec(u.pathname);
    if(request.method==="GET"&&landingPath&&!u.search)
      return new Response(landing(landingPath[1]),{headers:{
        ...baseHeaders,"Content-Type":"text/html; charset=utf-8",
        "Content-Security-Policy":"default-src 'none'; script-src 'self'; img-src 'self' https://coma39658-ctrl.github.io; style-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
      }});
    // Browser Origin check is NOT authentication. Add service quotas before public.
    if(origin!==env.PUBLIC_ORIGIN)return respond({error:"FORBIDDEN_ORIGIN"},403,baseHeaders);
    if(request.method==="OPTIONS")
      return new Response(null,{status:204,headers});
    const read=/^\/v1\/links\/([A-Za-z0-9_-]{22})$/.exec(u.pathname);
    if(request.method==="GET"&&read&&!u.search){
      const result=await env.SHORT_LINKS.getByName(read[1]).fetch(new Request("https://internal/get"));
      return new Response(result.body,{status:result.status,
        headers:{...headers,"Content-Type":"application/json"}});
    }
    if(request.method==="POST"&&u.pathname==="/v1/links"&&!u.search){
      if(request.headers.get("Content-Type")?.split(";")[0]!=="application/json")
        return respond({error:"UNSUPPORTED_TYPE"},415,headers);
      if(Number(request.headers.get("Content-Length")||0)>MAX_BODY)
        return respond({error:"TOO_LARGE"},413,headers);
      const raw=await request.text();
      if(raw.length>MAX_BODY)return respond({error:"TOO_LARGE"},413,headers);
      let data;try{data=JSON.parse(raw);}catch(_){return respond({error:"BAD_JSON"},400,headers);}
      if(!data||!CIPHER.test(data.cipher||"")||!IV.test(data.iv||"")||
         data.iv.length!==16)return respond({error:"BAD_CIPHERTEXT"},400,headers);
      const bytes=crypto.getRandomValues(new Uint8Array(16));
      const id=btoa(String.fromCharCode(...bytes)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
      const stored=await env.SHORT_LINKS.getByName(id).fetch(
        new Request("https://internal/put",{method:"POST",body:raw}));
      if(stored.status!==201)return respond({error:"STORE_FAILED"},503,headers);
      return respond({id,ttlSeconds:600,url:"https://ezero-shortlink-pilot.coma39658.workers.dev/i/"+id},
        201,headers);
    }
    return respond({error:"NOT_FOUND"},404,headers);
  }
};
export class ShortInvite extends DurableObject {
  async fetch(request){
    const path=new URL(request.url).pathname;
    if(path==="/put"&&request.method==="POST"){
      const old=await this.ctx.storage.get("value");
      if(old)return respond({error:"ALREADY_SET"},409,baseHeaders);
      const value=JSON.parse(await request.text());
      if(!CIPHER.test(value.cipher||"")||!IV.test(value.iv||"")||value.iv.length!==16)
        return respond({error:"BAD_CIPHERTEXT"},400,baseHeaders);
      const expires=Date.now()+TEN_MINUTES;
      await this.ctx.storage.put("value",{cipher:value.cipher,iv:value.iv,expires});
      await this.ctx.storage.setAlarm(expires);
      return respond({stored:true},201,baseHeaders);
    }
    if(path==="/get"&&request.method==="GET"){
      const value=await this.ctx.storage.get("value");
      if(!value||!Number.isSafeInteger(value.expires)||Date.now()>=value.expires)
        return respond({error:"EXPIRED"},410,baseHeaders);
      return respond({cipher:value.cipher,iv:value.iv,expires:value.expires},200,baseHeaders);
    }
    return respond({error:"NOT_FOUND"},404,baseHeaders);
  }
  async alarm(){await this.ctx.storage.delete("value");}
}
