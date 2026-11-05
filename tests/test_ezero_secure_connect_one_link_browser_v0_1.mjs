/*
 * E-ZERO: two-phone one-QR / one-accept Chromium pilot.
 * Synthetic encrypted relay: proves foreground UX, key matching and WebRTC.
 * DOES NOT touch Cloudflare staging/public services or access a real phone.
 */
import assert from "node:assert/strict";
import {createHmac} from "node:crypto";
import {chromium} from "playwright";
const host="http://127.0.0.1:8769";
const inviteEndpoint="https://ezero-secure-connect-call-lab-disabled.coma39658.workers.dev/v1/invite";
const browser=await chromium.launch({
 headless:true,args:["--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"]
});
const owner="f".repeat(64);
const sockets=new Map(),frames=[];
let errorCount=0,requestCount=0;
async function deliver(peer,frame){
 if(!peer||peer.closed)return;
 await peer.page.evaluate(({id,frame})=>{
  const ws=window.__ezeroMockSockets?.get(id);
  ws?.onmessage?.({data:JSON.stringify(frame)});
 },{id:peer.id,frame});
}
async function relay(source,evt){
 if(evt.action==="open"){
  const u=new URL(evt.url),peers=[...sockets.values()].filter(x=>!x.closed&&x.room===u.pathname);
  if(peers.length>=2)return {ok:false};
  if(evt.protocols.length!==4||
     !/^ezero-key-[0-9a-f]{64}$/.test(evt.protocols[1])||
     !/^ezero-time-[0-9]{13}$/.test(evt.protocols[2])||
     !/^ezero-proof-[0-9a-f]{64}$/.test(evt.protocols[3]))return {ok:false};
  if(peers.length&&(peers[0].key!==evt.protocols[1]||peers[0].proof!==evt.protocols[3]))
   return {ok:false};
  const item={id:evt.id,page:source.page,room:u.pathname,key:evt.protocols[1],
   proof:evt.protocols[3],closed:false,role:peers.length?"callee":"caller",
   qrPending:false,hostApproved:false,approved:false,helloSent:false};
  sockets.set(evt.id,item);
  await new Promise(resolve=>setTimeout(resolve,50));
  await deliver(item,{v:1,type:"ready",role:item.role,expires:Date.now()+600000});
  for(const p of peers){await deliver(p,{v:1,type:"peer_joined"});await deliver(item,{v:1,type:"peer_joined"});}
  return {ok:true};
 }
 const current=sockets.get(evt.id);if(!current)return {ok:false};
 if(evt.action==="close"){current.closed=true;return {ok:true};}
 if(evt.action!=="send")return {ok:false};
 const f=JSON.parse(evt.data);
 const other=[...sockets.values()].find(x=>x!==current&&x.room===current.room&&!x.closed);
 if(["guest_hello","offer","answer"].includes(f.type)){
  assert.equal(typeof f.blob,"string");
  assert.ok(f.blob.length>128);
  assert.ok(!evt.data.includes("a=fingerprint"));
  assert.ok(!evt.data.includes("EZERO1."));
  frames.push({type:f.type,blob:f.blob});
  if(!other){errorCount++;return {ok:false};}
  if(f.type==="guest_hello"){
   if(current.role!=="callee"||current.helloSent){errorCount++;return {ok:false};}
   current.helloSent=true;other.qrPending=true;await deliver(other,f);return {ok:true};
  }
  if(f.type==="offer"&&
    (current.role!=="caller"||!current.hostApproved||!other.approved)){errorCount++;return {ok:false};}
  if(f.type==="answer"&&(current.role!=="callee"||!current.approved)){errorCount++;return {ok:false};}
  await deliver(other,f);return {ok:true};
 }
 if(f.type==="host_accept"){
  if(current.role!=="caller"||!current.qrPending||current.hostApproved){errorCount++;return {ok:false};}
  current.hostApproved=true;await deliver(other,{v:1,type:"host_accepted"});return {ok:true};
 }
 if(f.type==="accept"){
  if(current.role!=="callee"||!other?.hostApproved){errorCount++;return {ok:false};}
  current.approved=true;await deliver(other,{v:1,type:"accepted"});return {ok:true};
 }
 if(f.type==="decline"||f.type==="hangup"){
  await deliver(other,{v:1,type:f.type});return {ok:true};
 }
 errorCount++;return {ok:false};
}
const ctxs=[];
async function phone(label){
 const ctx=await browser.newContext({
  viewport:{width:393,height:852},isMobile:true,hasTouch:true,
  permissions:["camera","microphone"],locale:"en-US"
 });ctxs.push(ctx);
 await ctx.route("**/*",async route=>{
  const req=route.request(),url=req.url();
  if(url===inviteEndpoint){
   requestCount++;
   assert.equal(req.method(),"POST");
   const j=JSON.parse(req.postData());
   assert.match(j.auth,/^[0-9a-f]{64}$/);
   const proof=createHmac("sha256",owner).update(j.id+"."+j.auth+"."+j.issued).digest("hex");
   return route.fulfill({status:200,contentType:"application/json",headers:{
    "access-control-allow-origin":host,"cache-control":"no-store","vary":"Origin"
   },body:JSON.stringify({ok:true,code:"INVITE_CREATED",proof,expires:j.issued+600000})});
  }
  if(url.startsWith(host+"/"))return route.continue();
  return route.abort("blockedbyclient");
 });
 await ctx.addInitScript(()=>{
  window.__connectedEvents=0;
  document.addEventListener("ezero:call-status",e=>{
   if(e.detail?.stage==="connected")window.__connectedEvents++;
  });
  window.__mediaCalls=[];
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia=opts=>{
   window.__mediaCalls.push(opts);return original(opts);
  };
  window.__ezeroMockSockets=new Map();
  window.__testQrValue="";
  window.BarcodeDetector=class{
   constructor(){this.frames=0;}
   async detect(){this.frames++;return window.__testQrValue?
    [{rawValue:window.__testQrValue}]:[];}
  };
  let seq=0;
  class MockWebSocket{
   static OPEN=1;
   constructor(url,protocols){
    this.id=String(++seq)+"_"+Math.random().toString(36).slice(2);
    this.readyState=1;this.url=url;this.protocols=protocols;
    window.__ezeroMockSockets.set(this.id,this);
    window.__relayRoom({action:"open",id:this.id,url,protocols}).then(r=>{
     if(!r.ok){this.readyState=3;this.onerror?.({});this.onclose?.({code:1006});}
     else this.onopen?.({});
    }).catch(()=>{this.readyState=3;this.onerror?.({});});
   }
   send(data){if(this.readyState!==1)throw Error("WS_CLOSED");
    void window.__relayRoom({action:"send",id:this.id,data});}
   close(){if(this.readyState===3)return;this.readyState=3;
    void window.__relayRoom({action:"close",id:this.id});this.onclose?.({code:1000});}
  }
  window.WebSocket=MockWebSocket;
 });
 const page=await ctx.newPage();
 page.on("pageerror",e=>{console.log(label+"_PAGEERROR",String(e).slice(0,180));});
 await page.exposeBinding("__relayRoom",relay);
 await page.goto(host+"/ezero_secure_connect_live_p2p_v0_1.html");
 await page.waitForFunction(()=>document.querySelector("#myDigitalId")?.value.startsWith("EZERO1."));
 return page;
}
const receiver=await phone("B"),scanner=await phone("A");
try{
 assert.equal(await receiver.locator("#oneQrShow").isVisible(),true);
 assert.equal(await scanner.locator("#oneQrScan").isVisible(),true);
 assert.equal(await receiver.evaluate(()=>window.__mediaCalls.length),0);
 await receiver.locator("#oneQrShow").click();
 await receiver.waitForFunction(()=>document.querySelector("#oneQrVisual").hidden===false,
  {timeout:20000});
 assert.equal(requestCount,1,"Only the host creates one server-minted invite");
 const invite=await receiver.locator("#roomLink").inputValue();
 assert.match(invite,/#callroom=[0-9a-f]{32}\.[0-9a-f]{64}\.[0-9]{13}\.[0-9a-f]{64}&identity=EZERO1\./);
 assert.equal(await receiver.evaluate(()=>window.__mediaCalls.length),0);
 assert.equal(await receiver.locator("#roomOwnerSecret").inputValue(),"",
  "Owner secret never entered into visitor's browser");
 assert.ok((await receiver.locator("#oneQrCode svg").count())>0);
 console.log("ONE_PHONE_SHOWS_SINGLE_QR_WITHOUT_OWNER_SECRET_OR_MIC: PASS");
 await scanner.evaluate(value=>window.__testQrValue=value,invite);
 await scanner.locator("#oneQrScan").click();
 try{
  await receiver.waitForFunction(()=>!document.querySelector("#oneQrRequest").hidden,
   {timeout:12000});
 }catch(e){
  const diag=await Promise.all([receiver,scanner].map(async page=>page.evaluate(()=>{
   const ids=["oneQrStatus","roomStatus","qrScanStatus","identityPeerStatus","peerFingerprint","scanQR","oneQrVisual"];
   return Object.fromEntries(ids.map(id=>{const el=document.getElementById(id);
    return [id,{text:el?.textContent?.slice(0,160),state:el?.dataset?.state,
     hidden:el?.hidden,disabled:el?.disabled}];}));
  })));
  console.log("ONE_QR_SCAN_DIAGNOSTIC_NO_PRIVATE_DATA",JSON.stringify(diag));
  throw e;
 }
 assert.equal(await scanner.evaluate(()=>window.__mediaCalls.filter(o=>o.audio===true).length),0);
 assert.equal(await receiver.evaluate(()=>window.__mediaCalls.length),0);
 assert.equal(await receiver.locator("#oneQrAccept").isEnabled(),true);
 assert.match(await receiver.locator("#oneQrCaller").innerText(),/دستخط|Signed|المفتاح/);
 // Main signed-QR verifier displays BOTH exact remote key fingerprints.
 const bFp=await receiver.locator("#myFingerprint").innerText();
 const aFp=await scanner.locator("#myFingerprint").innerText();
 assert.equal((await receiver.locator("#peerFingerprint").innerText()).trim(),aFp.trim());
 assert.equal((await scanner.locator("#peerFingerprint").innerText()).trim(),bFp.trim());
 console.log("SCANNER_AUTO_PAIRS_BOTH_SIGNED_SHA256_IDENTITIES_NO_OFFER_COPY: PASS");
 await receiver.locator("#oneQrAccept").click();
 await Promise.all([receiver,scanner].map(page=>
  page.waitForFunction(()=>document.querySelector("#sendMessage")?.disabled===false,
   {timeout:40000})));
 assert.equal(frames.some(f=>f.type==="guest_hello"),true);
 assert.equal(frames.some(f=>f.type==="offer"),true);
 assert.equal(frames.some(f=>f.type==="answer"),true);
 assert.equal(errorCount,0);
 assert.equal(await receiver.evaluate(()=>window.__mediaCalls.some(o=>o.audio!==false)),true);
 assert.equal(await scanner.evaluate(()=>window.__mediaCalls.some(o=>o.audio!==false)),true);
 // Require the actual browser-observed WebRTC connected event on both
 // phones, not a transient text label that ICE callbacks can overwrite.
 await Promise.all([receiver,scanner].map(page=>page.waitForFunction(
   ()=>window.__connectedEvents>0,{timeout:18000}
 )));
 assert.equal(await receiver.evaluate(()=>window.__connectedEvents>0),true);
 assert.equal(await scanner.evaluate(()=>window.__connectedEvents>0),true);
 console.log("ONE_QR_ONE_ACCEPT_AUTOMATED_ENCRYPTED_SDP_REAL_TWO_BROWSER_WEBRTC: PASS");
 await receiver.locator("#oneQrEnd").click();
 await receiver.waitForFunction(()=>document.querySelector("#roomStatus").dataset.state==="ended");
 console.log("ONE_QR_EXPLICIT_END_CLOSES_ROOM: PASS");
 // Distant friend: opening the single private link initiates signaling
 // automatically, without copying SDP or opening a microphone until Accept.
 const priorMic=await receiver.evaluate(()=>window.__mediaCalls.length);
 await receiver.locator("#oneQrShow").click();
 await receiver.waitForFunction(()=>!document.querySelector("#oneQrVisual").hidden,
  {timeout:18000});
 const remoteLink=await receiver.locator("#roomLink").inputValue();
 await scanner.goto(remoteLink);
 await scanner.waitForFunction(()=>document.querySelector("#myDigitalId")?.value.startsWith("EZERO1."));
 try{
  await receiver.waitForFunction(()=>!document.querySelector("#oneQrRequest").hidden,
   {timeout:12000});
 }catch(error){
  const diag=await Promise.all([receiver,scanner].map(async page=>page.evaluate(()=>{
   const ids=["oneQrStatus","roomStatus","qrScanStatus","identityPeerStatus","oneQrRequest",
    "oneQrVisual","myDigitalId"];
   return Object.fromEntries(ids.map(id=>{
    const el=document.getElementById(id);
    return [id,{state:el?.dataset?.state,hidden:el?.hidden,
     valuePresent:id==="myDigitalId"?!!el?.value:undefined,
     status:id==="myDigitalId"?undefined:el?.textContent?.slice(0,170)}];
   }));
  })));
  // Deliberately do not print bearer link, signed identities, keys, or fingerprints.
  console.log("REMOTE_ONE_LINK_DIAGNOSTIC_NO_PRIVATE_DATA",JSON.stringify(diag));
  throw error;
 }
 assert.equal((await scanner.evaluate(()=>location.hash)),"","Private link erased from browser history");
 assert.equal(await receiver.evaluate(()=>window.__mediaCalls.length),priorMic,
  "Incoming distant request never silently opens host mic");
 assert.equal(await scanner.evaluate(()=>window.__mediaCalls.length),0,
  "Opening one private URL never silently opens guest mic");
 await receiver.locator("#oneQrAccept").click();
 await Promise.all([receiver,scanner].map(page=>page.waitForFunction(
  ()=>document.querySelector("#sendMessage")?.disabled===false,{timeout:40000})));
 assert.equal(await scanner.evaluate(()=>window.__connectedEvents>0),true);
 console.log("REMOTE_PRIVATE_LINK_AUTO_REQUEST_ONE_ACCEPT_NO_COPY_NO_AUTO_MIC: PASS");
 await receiver.locator("#oneQrEnd").click();
}finally{
 await Promise.allSettled([...ctxs.map(c=>c.close()),browser.close()]);
}
