import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import {webcrypto} from "node:crypto";
import {chromium} from "playwright";
import {__test as protocol} from "../cloudflare/signaling_worker_v0_1.mjs";

const SITE="https://coma39658-ctrl.github.io/null-bench";
const ENTRY=SITE+"/secure_connect/client/pilot_friends_v0_1.html";
const ENDPOINT="https://ezero-sc-pilot.example.workers.dev/v1/friends";
const TOKEN="staging-pilot-friend-two-phones-tests-only";
const browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
const accounts=new Map(),pending=new Map(),friends=new Map();
const contexts=[];
const falseClaims=[];
function accepted(a,b){return friends.get(a)?.has(b)===true;}
async function verifyRequest(payload){
  const pub=payload.type==="register"?payload.pub:accounts.get(payload.account);
  if(!pub)return false;
  try{
    const bytes=Uint8Array.from(atob(pub.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-pub.length%4)%4)),c=>c.charCodeAt(0));
    const fingerprint=await protocol.sha256(bytes);
    if(fingerprint!==payload.account)return false;
    const key=await webcrypto.subtle.importKey("spki",bytes,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const sig=Uint8Array.from(atob(payload.signature.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-payload.signature.length%4)%4)),c=>c.charCodeAt(0));
    return webcrypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},key,sig,
      new TextEncoder().encode(protocol.signedText(payload)));
  }catch(_){return false;}
}
async function mockServer(req){
  const b=req.postDataJSON();
  assert.equal(await verifyRequest(b),true,"The browser must genuinely ECDSA-sign friend requests");
  if(b.type==="register"){
    assert.equal(req.headers()["x-ezero-pilot-join"],TOKEN);
    accounts.set(b.account,b.pub);
    return {ok:true,account:b.account,code:"REGISTERED"};
  }
  if(b.type==="request"){
    assert.ok(accounts.has(b.account)&&accounts.has(b.to));
    if(accepted(b.account,b.to))return {ok:true,code:"ALREADY_FRIENDS"};
    pending.set(b.to+"|"+b.account,b);
    return {ok:true,code:"REQUEST_SENT"};
  }
  if(b.type==="inbox"){
    return {ok:true,pending:[...pending.entries()].filter(([key])=>key.startsWith(b.account+"|"))
      .map(([,p])=>({from:p.account,expiresAt:Date.now()+60000}))};
  }
  if(b.type==="respond"){
    const k=b.account+"|"+b.to;
    assert.ok(pending.has(k),"Only the recipient may accept a pending friend invitation");
    pending.delete(k);
    if(b.decision==="accept"){
      if(!friends.has(b.account))friends.set(b.account,new Set());
      if(!friends.has(b.to))friends.set(b.to,new Set());
      friends.get(b.account).add(b.to);
      friends.get(b.to).add(b.account);
      return {ok:true,code:"FRIENDSHIP_ACCEPTED",bothLinked:true};
    }
    return {ok:true,code:"INVITE_DECLINED",bothLinked:false};
  }
  if(b.type==="friends")return {ok:true,friends:[...(friends.get(b.account)||[])]};
  if(b.type==="delete_account"){
    accounts.delete(b.account);
    friends.delete(b.account);
    for(const links of friends.values())links.delete(b.account);
    for(const k of pending.keys())if(k.includes(b.account))pending.delete(k);
    return {ok:true,code:"ACCOUNT_DELETED",friendsRevoked:true,localIdentityDeleted:false};
  }
  if(b.type==="remove"){
    friends.get(b.account)?.delete(b.to);
    friends.get(b.to)?.delete(b.account);
    return {ok:true,code:"FRIEND_REMOVED"};
  }
  return {ok:false,code:"UNSUPPORTED"};
}
async function phone(url=ENTRY){
  const ctx=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true});
  contexts.push(ctx);
  await ctx.addInitScript(()=>{
    window.__sharedLink=null;
    navigator.share=async p=>{window.__sharedLink=p;};
  });
  await ctx.route("**/*",async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.origin===new URL(SITE).origin && url.pathname.startsWith("/null-bench/")){
      const rel=url.pathname.slice("/null-bench/".length);
      if(rel.includes(".."))return route.fulfill({status:403});
      const full=path.join(process.cwd(),rel);
      try{
        const data=await fs.readFile(full);
        const type=full.endsWith(".html")?"text/html":
          full.endsWith(".css")?"text/css":full.endsWith(".mjs")?"text/javascript":"application/octet-stream";
        return route.fulfill({status:200,contentType:type,body:data});
      }catch(_){return route.fulfill({status:404,body:"Not Found"});}
    }
    if(url.href===ENDPOINT){
      const headers={
        "Access-Control-Allow-Origin":SITE.split("/null-bench")[0],
        "Access-Control-Allow-Methods":"POST, OPTIONS",
        "Access-Control-Allow-Headers":"content-type,x-ezero-pilot-join",
        "Content-Type":"application/json"
      };
      if(req.method()==="OPTIONS")return route.fulfill({status:204,headers});
      try{return route.fulfill({status:200,headers,body:JSON.stringify(await mockServer(req))});}
      catch(error){
        falseClaims.push(String(error));
        return route.fulfill({status:403,headers,body:JSON.stringify({ok:false,code:"SIGNATURE_INVALID"})});
      }
    }
    return route.abort("blockedbyclient");
  });
  const page=await ctx.newPage();
  page.on("pageerror",e=>falseClaims.push("PAGE:"+String(e)));
  await page.goto(url,{waitUntil:"domcontentloaded"});
  return page;
}
async function register(page){
  await page.locator("#agree").check();
  await page.locator("details.pilot-setup > summary").click();
  await page.locator("#serverUrl").fill(ENDPOINT);
  await page.locator("#pilotSecret").fill(TOKEN);
  await page.locator("#register").click();
  await page.waitForFunction(()=>document.querySelector("#accountStatus")?.dataset.status==="registered",{timeout:20000});
  return (await page.locator("#ownIdentity").innerText()).trim();
}
try{
  const a=await phone();
  assert.equal(await a.locator("#shareLink").isDisabled(),true,"No sharing before registration");
  await a.locator("#agree").check();
  await a.locator("#register").click();
  assert.match(await a.locator("#accountStatus").innerText(),/Cloudflare سرور/);
  const aid=await register(a);
  assert.match(aid,/^[a-f0-9]{64}$/);
  assert.equal(await a.locator("#pilotSecret").inputValue(),"","Pilot access secret is discarded after registration");
  await a.locator("#shareLink").click();
  const share=await a.evaluate(()=>window.__sharedLink);
  assert.ok(share.url.endsWith("#friend="+aid));
  assert.equal(share.url.includes(TOKEN),false);
  assert.equal(share.url.includes("pub="),false);
  console.log("REGISTERED_NONEXTRACTABLE_ID_AND_SHARE_LINK_WITHOUT_SECRETS: PASS");

  const b=await phone(share.url);
  assert.equal(await b.locator("#incomingFingerprint").innerText(),aid);
  assert.equal(await b.locator("#sendRequest").isDisabled(),true,"Unregistered recipient cannot silently friend");
  const bid=await register(b);
  assert.notEqual(aid,bid);
  assert.equal(await b.locator("#sendRequest").isEnabled(),true);
  await b.locator("#sendRequest").click();
  await b.waitForFunction(()=>document.querySelector("#requestStatus")?.dataset.status==="requestSent");
  assert.equal(accepted(aid,bid),false,"Sending is not automatically accepting");
  await a.locator("#checkInbox").click();
  await a.locator("#inbox .pilot-friend").waitFor();
  assert.equal(await a.locator("#inbox .pilot-friend .hash").innerText(),bid);
  assert.equal(accepted(aid,bid),false,"Opening request is not auto-accept");
  await a.locator("#inbox button").filter({hasText:"قبول"}).click();
  await a.waitForFunction(()=>document.querySelector("#requestStatus")?.dataset.status==="accepted");
  assert.equal(accepted(aid,bid),true,"Only recipient approval links the two accounts");
  await b.locator("#checkFriends").click();
  await b.locator("#friends .pilot-friend").waitFor();
  assert.equal(await b.locator("#friends .pilot-friend .hash").innerText(),aid);
  console.log("PERSONAL_LINK_REQUIRES_EXPLICIT_REQUEST_AND_RECIPIENT_APPROVAL: PASS");

  await b.locator("#language").selectOption("en");
  assert.match(await b.locator("h1").innerText(),/Friend invitations/);
  await b.locator("#language").selectOption("ar");
  assert.match(await b.locator("h1").innerText(),/الصداقة/);
  await b.locator("#language").selectOption("ur");
  await b.reload();
  assert.equal(await b.locator("#sendRequest").isDisabled(),true,"No automatic signup or sending on reload");
  const same=await register(b);
  assert.equal(same,bid,"Nonextractable identity key remains stable after reload on same origin");
  assert.deepEqual(falseClaims,[],"No page errors or unauthenticated attempts");
  console.log("TRILINGUAL_FRIEND_REQUEST_SCREENS_STABLE_PHONE_ID_REQUIRES_CONSENT: PASS");
  await b.evaluate(()=>{window.confirm=()=>true;});
  await b.locator("#privacyErasure > summary").click();
  assert.equal(await b.locator("#deleteAccount").isEnabled(),true);
  await b.locator("#deleteAccount").click();
  await b.waitForFunction(()=>document.querySelector("#deleteStatus")?.dataset.status==="accountDeleted");
  assert.equal(accounts.has(bid),false,"Server account must be removed");
  assert.equal(accepted(aid,bid),false,"Removing account revokes both friendships");
  assert.equal(await b.locator("#shareLink").isDisabled(),true);
  await b.reload();
  const replaced=await register(b);
  assert.notEqual(replaced,bid,"Old non-exportable browser identity must not survive explicit erasure");
  assert.deepEqual(falseClaims,[]);
  console.log("CONSENTED_ACCOUNT_ERASURE_AND_RECREATED_DEVICE_ID: PASS");
}finally{
  for(const ctx of contexts)await ctx.close().catch(()=>{});
  await browser.close();
}
