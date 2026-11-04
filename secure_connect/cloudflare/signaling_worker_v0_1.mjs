/*
 * E-ZERO Secure Connect — consent-based friend directory on Cloudflare Workers.
 * Staging candidate ONLY. No media, chat text, contact names, SDP or IP history stored.
 * Single SQLite-backed Durable Object for bounded 2-phone / small pilot, not global scale.
 * Fail closed without PILOT_ENABLED=true AND a separate PILOT_JOIN_SECRET.
 * Authentication: signed ECDSA P-256 requests tied to SHA-256 of SPKI public key,
 * timestamp and one-time nonce. Registration requires proof of key ownership.
 * Use an independent security review before any broader public launch.
 */
const VERSION = 1;
const PROTOCOL = "EZERO_SC_SIGNED_V1";
const LIMIT_BYTES = 4096;
const INVITE_TTL = 24 * 60 * 60 * 1000;
const REJECT_COOLDOWN = 60 * 60 * 1000;
const NONCE_TTL = 5 * 60 * 1000;
const MAX_SKEW = 2 * 60 * 1000;
const MAX_ACCOUNTS = 100;
const MAX_INCOMING = 20;
const MAX_FRIENDS = 50;
const REQUESTS_PER_MINUTE = 24;
const VALID_TYPES = new Set(["register","request","respond","inbox","friends","remove"]);
const HEX_ID = /^[a-f0-9]{64}$/;
const NONCE = /^[a-f0-9]{32}$/;
const B64URL = /^[A-Za-z0-9_-]+$/;

function json(value, status=200) {
  return new Response(JSON.stringify(value),{
    status, headers:{"content-type":"application/json; charset=utf-8",
      "cache-control":"no-store","x-content-type-options":"nosniff"}
  });
}
function failed(code,status=400) {return json({ok:false,code},status);}
function decode64(value, max=150) {
  if(typeof value!=="string" || !B64URL.test(value) || value.length>max*2)throw Error("BAD_ENCODING");
  const normalized=value.replace(/-/g,"+").replace(/_/g,"/");
  const raw=atob(normalized+"=".repeat((4-normalized.length%4)%4));
  if(raw.length<1 || raw.length>max)throw Error("BAD_ENCODING");
  return Uint8Array.from(raw,c=>c.charCodeAt(0));
}
function hex(bytes){return Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");}
async function sha256(bytes){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)));}
function signedText(b){
  // Each field used by the server's business logic MUST be represented here.
  return [PROTOCOL,b.type,b.account,b.to||"",b.decision||"",b.pub||"",
    String(b.ts),b.nonce].join("\n");
}
function expectedShape(b){
  const allowed=["v","type","account","to","decision","pub","ts","nonce","signature"];
  if(!b || typeof b!=="object" || Array.isArray(b) ||
     Object.keys(b).some(k=>!allowed.includes(k)) ||
     b.v!==VERSION || !VALID_TYPES.has(b.type) ||
     !HEX_ID.test(b.account) || !NONCE.test(b.nonce) ||
     !Number.isSafeInteger(b.ts) || Math.abs(Date.now()-b.ts)>MAX_SKEW ||
     typeof b.signature!=="string" || b.signature.length>200) return false;
  if(b.type==="register"){
    return typeof b.pub==="string" && b.pub.length<=200 &&
      b.to===undefined && b.decision===undefined;
  }
  if(b.pub!==undefined) return false;
  if(b.type==="request" || b.type==="remove"){
    return HEX_ID.test(b.to||"") && b.decision===undefined;
  }
  if(b.type==="respond"){
    return HEX_ID.test(b.to||"") && ["accept","decline"].includes(b.decision);
  }
  return b.to===undefined && b.decision===undefined;
}
async function importIdentity(b, accountPub) {
  const pub=decode64(accountPub,140);
  if(await sha256(pub)!==b.account)throw Error("BAD_FINGERPRINT");
  return crypto.subtle.importKey("spki",pub,
    {name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
}
async function signatureValid(b,pub) {
  try {
    const key=await importIdentity(b,pub);
    return await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,
      decode64(b.signature,100),new TextEncoder().encode(signedText(b)));
  }catch(_){return false;}
}
function pairKey(a,b){return "pair:"+[a,b].sort().join(":");}
function friendKey(a,b){return "friend:"+a+":"+b;}
function incomingKey(a,b){return "incoming:"+a+":"+b;}
function publicOrigin(request, env) {
  const origin=request.headers.get("Origin")||"";
  if(origin==="https://coma39658-ctrl.github.io")return origin;
  if(env.ALLOW_LOCAL_TEST_ORIGIN==="true" &&
     (origin==="http://127.0.0.1:8769" || origin==="http://localhost:8769"))return origin;
  return "";
}
function cors(response, origin) {
  const h=new Headers(response.headers);
  h.set("access-control-allow-origin",origin);
  h.set("access-control-allow-methods","POST, OPTIONS");
  h.set("access-control-allow-headers","content-type,x-ezero-pilot-join");
  h.set("access-control-max-age","300");
  h.set("vary","Origin");
  h.set("cache-control","no-store");
  return new Response(response.body,{status:response.status,headers:h});
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if(request.method==="GET" && url.pathname==="/health"){
      return json({service:"E-ZERO Secure Connect lab",version:VERSION,
        stage:"NOT_PRODUCTION",enabled:env.PILOT_ENABLED==="true" &&
          !!env.PILOT_JOIN_SECRET,
        calling:"NOT_AVAILABLE",mediaRelay:"NOT_AVAILABLE"});
    }
    const origin=publicOrigin(request,env);
    if(!origin)return failed("ORIGIN_DENIED",403);
    if(request.method==="OPTIONS")return cors(new Response(null,{status:204}),origin);
    if(request.method!=="POST"||url.pathname!=="/v1/friends")return cors(failed("NOT_FOUND",404),origin);
    if(env.PILOT_ENABLED!=="true" || !env.PILOT_JOIN_SECRET || !env.DIRECTORY)
      return cors(failed("PILOT_DISABLED",503),origin);
    if((request.headers.get("content-type")||"").split(";")[0].trim()!=="application/json")
      return cors(failed("JSON_REQUIRED",415),origin);
    if(Number(request.headers.get("content-length")||"0")>LIMIT_BYTES)
      return cors(failed("REQUEST_TOO_LARGE",413),origin);
    let payload;
    try{
      const raw=await request.text();
      if(raw.length>LIMIT_BYTES)return cors(failed("REQUEST_TOO_LARGE",413),origin);
      payload=JSON.parse(raw);
    }catch(_){return cors(failed("BAD_JSON",400),origin);}
    if(!expectedShape(payload))return cors(failed("BAD_SIGNED_REQUEST",400),origin);
    if(payload.type==="register"){
      // No pilot join secret in URL, source code, query strings or retained storage.
      const supplied=request.headers.get("x-ezero-pilot-join")||"";
      if(supplied.length<16 || supplied.length>200 ||
         supplied.length!==env.PILOT_JOIN_SECRET.length) return cors(failed("PILOT_ACCESS_DENIED",403),origin);
      const a=new TextEncoder().encode(supplied), b=new TextEncoder().encode(env.PILOT_JOIN_SECRET);
      let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];
      if(diff!==0)return cors(failed("PILOT_ACCESS_DENIED",403),origin);
    }
    const directory=env.DIRECTORY.getByName("ezero-secure-connect-pilot-v1");
    const internal=new Request("https://internal.invalid/submit",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify(payload)
    });
    try{return cors(await directory.fetch(internal),origin);}
    catch(_){return cors(failed("SERVER_UNAVAILABLE",503),origin);}
  }
};

export class SecureConnectDirectory {
  constructor(ctx,env){this.ctx=ctx;this.env=env;}
  async alarm(){
    // Bounded best-effort expiration sweeps. DO SQLite-backed storage is managed
    // by Cloudflare; accepted friend IDs are retained until explicitly removed.
    let pending=false;
    for(const prefix of ["nonce:","incoming:","pair:"]){
      const items=await this.ctx.storage.list({prefix,limit:250});
      for(const [key,item] of items){
        const until=item?.until??item?.expires??item?.cooldownUntil;
        if(until && until<Date.now() && item?.status!=="accepted")
          await this.ctx.storage.delete(key);
        else if(until && until>=Date.now())pending=true;
      }
      if(items.size===250)pending=true;
    }
    if(pending)await this.ctx.storage.setAlarm(Date.now()+60_000);
  }
  async nextSweep(){
    const alarm=await this.ctx.storage.getAlarm();
    if(alarm===null || alarm>Date.now()+60_000)
      await this.ctx.storage.setAlarm(Date.now()+60_000);
  }
  async guard(b){
    let pub=b.pub;
    if(b.type!=="register"){
      const account=await this.ctx.storage.get("account:"+b.account);
      if(!account)return failed("ACCOUNT_NOT_REGISTERED",404);
      pub=account.pub;
    }
    if(!await signatureValid(b,pub))return failed("SIGNATURE_INVALID",403);
    const used="nonce:"+b.account+":"+b.nonce;
    const rateKey="rate:"+b.account;
    const result=await this.ctx.storage.transaction(async tx=>{
      if(await tx.get(used))return "REPLAY_BLOCKED";
      const prior=await tx.get(rateKey);
      const rate=prior && prior.until>Date.now()
        ? {n:prior.n,until:prior.until}:{n:0,until:Date.now()+60_000};
      if(rate.n>=REQUESTS_PER_MINUTE)return "RATE_LIMITED";
      await tx.put(rateKey,{n:rate.n+1,until:rate.until});
      await tx.put(used,{until:Date.now()+NONCE_TTL});
      return null;
    });
    if(result)return failed(result,result==="RATE_LIMITED"?429:409);
    await this.nextSweep();
    return null;
  }
  async register(b){
    if(!await signatureValid(b,b.pub))return failed("SIGNATURE_INVALID",403);
    const exists=await this.ctx.storage.get("account:"+b.account);
    if(exists && exists.pub!==b.pub)return failed("ACCOUNT_KEY_CONFLICT",409);
    if(!exists){
      const ok=await this.ctx.storage.transaction(async tx=>{
        const count=await tx.get("meta:account_count")||0;
        if(count>=MAX_ACCOUNTS)return false;
        await tx.put("account:"+b.account,{pub:b.pub,created:Date.now()});
        await tx.put("meta:account_count",count+1);
        return true;
      });
      if(!ok)return failed("PILOT_FULL",429);
    }
    // Even re-registration must pass nonce/rate gates.
    const error=await this.guard(b);if(error)return error;
    return json({ok:true,code:exists?"ALREADY_REGISTERED":"REGISTERED",
      account:b.account,online:false});
  }
  async request(b){
    if(b.account===b.to)return failed("SELF_REQUEST",400);
    if(!await this.ctx.storage.get("account:"+b.to))return failed("FRIEND_NOT_REGISTERED",404);
    if(await this.ctx.storage.get(friendKey(b.account,b.to)))
      return json({ok:true,code:"ALREADY_FRIENDS"});
    const incoming=await this.ctx.storage.list({prefix:"incoming:"+b.to+":",limit:MAX_INCOMING+1});
    let activeIncoming=0;
    for(const [key,item] of incoming){
      if(item?.expires>Date.now()) activeIncoming++;
      else await this.ctx.storage.delete(key);
    }
    if(activeIncoming>=MAX_INCOMING)return failed("INBOX_FULL",429);
    const key=pairKey(b.account,b.to);
    const existing=await this.ctx.storage.get(key);
    if(existing?.status==="pending" && existing.expires>Date.now())
      return json({ok:true,code:existing.from===b.account?"REQUEST_ALREADY_PENDING":"RECEIVED_INVITE_NEEDS_APPROVAL"});
    if(existing?.status==="declined" && existing.cooldownUntil>Date.now())
      return failed("DECLINED_COOLDOWN",429);
    const now=Date.now();
    await this.ctx.storage.transaction(async tx=>{
      await tx.put(key,{status:"pending",from:b.account,to:b.to,
        expires:now+INVITE_TTL});
      await tx.put(incomingKey(b.to,b.account),{from:b.account,
        expires:now+INVITE_TTL});
    });
    await this.nextSweep();
    return json({ok:true,code:"REQUEST_SENT",expiresAt:now+INVITE_TTL});
  }
  async respond(b){
    if(b.account===b.to)return failed("SELF_REQUEST",400);
    const key=pairKey(b.account,b.to);
    const pair=await this.ctx.storage.get(key);
    if(!pair||pair.status!=="pending"||pair.expires<=Date.now()||
       pair.from!==b.to||pair.to!==b.account)
      return failed("NO_PENDING_INVITE",404);
    const yes=b.decision==="accept";
    if(yes){
      const [listA,listB]=await Promise.all([
        this.ctx.storage.list({prefix:"friend:"+b.account+":",limit:MAX_FRIENDS}),
        this.ctx.storage.list({prefix:"friend:"+b.to+":",limit:MAX_FRIENDS})
      ]);
      if(listA.size>=MAX_FRIENDS||listB.size>=MAX_FRIENDS)
        return failed("FRIEND_LIMIT_REACHED",429);
    }
    const applied=await this.ctx.storage.transaction(async tx=>{
      // Re-read inside the transaction: acceptance is atomic even if an owner
      // is opening the same invite in two tabs.
      const latest=await tx.get(key);
      if(!latest || latest.status!=="pending" || latest.expires<=Date.now() ||
         latest.from!==b.to || latest.to!==b.account)return false;
      await tx.delete(incomingKey(b.account,b.to));
      if(yes){
        await tx.put(friendKey(b.account,b.to),{since:Date.now()});
        await tx.put(friendKey(b.to,b.account),{since:Date.now()});
        await tx.put(key,{status:"accepted",from:b.to,to:b.account});
      }else{
        await tx.put(key,{status:"declined",cooldownUntil:Date.now()+REJECT_COOLDOWN});
      }
      return true;
    });
    if(!applied)return failed("NO_PENDING_INVITE",409);
    return json({ok:true,code:yes?"FRIENDSHIP_ACCEPTED":"INVITE_DECLINED",
      bothLinked:yes});
  }
  async inbox(b){
    const records=await this.ctx.storage.list({prefix:"incoming:"+b.account+":",
      limit:MAX_INCOMING+1});
    const incoming=[];
    for(const [key,item] of records){
      if(!item || item.expires<=Date.now()){
        await this.ctx.storage.delete(key);continue;
      }
      incoming.push({from:item.from,expiresAt:item.expires});
    }
    return json({ok:true,pending:incoming.slice(0,MAX_INCOMING)});
  }
  async friends(b){
    const rows=await this.ctx.storage.list({prefix:"friend:"+b.account+":",
      limit:MAX_FRIENDS+1});
    return json({ok:true,friends:[...rows.keys()].slice(0,MAX_FRIENDS)
      .map(key=>key.slice(("friend:"+b.account+":").length))});
  }
  async remove(b){
    const existed=Boolean(await this.ctx.storage.get(friendKey(b.account,b.to)));
    await this.ctx.storage.transaction(async tx=>{
      await tx.delete(friendKey(b.account,b.to));
      await tx.delete(friendKey(b.to,b.account));
      await tx.delete(pairKey(b.account,b.to));
      await tx.delete(incomingKey(b.account,b.to));
      await tx.delete(incomingKey(b.to,b.account));
    });
    return json({ok:true,code:existed?"FRIEND_REMOVED":"NO_FRIENDSHIP"});
  }
  async fetch(request){
    if(request.method!=="POST")return failed("METHOD_NOT_ALLOWED",405);
    let b;try{b=await request.json();}catch(_){return failed("BAD_JSON");}
    if(!expectedShape(b))return failed("BAD_SIGNED_REQUEST");
    if(b.type==="register")return this.register(b);
    const error=await this.guard(b);if(error)return error;
    if(b.type==="request")return this.request(b);
    if(b.type==="respond")return this.respond(b);
    if(b.type==="inbox")return this.inbox(b);
    if(b.type==="friends")return this.friends(b);
    if(b.type==="remove")return this.remove(b);
    return failed("NOT_SUPPORTED",404);
  }
}

export const __test={signedText,expectedShape,sha256,pairKey};
