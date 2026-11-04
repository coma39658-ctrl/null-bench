import assert from "node:assert/strict";
import {chromium} from "playwright";
/*
 * Synthetic two-mobile-Chromium end-to-end one-link call.
 * A local, in-memory WebSocket model relays only encrypted ciphertext:
 * never touches Cloudflare, the public website, or paid infrastructure.
 */
const host="http://127.0.0.1:8769";
const browser=await chromium.launch({headless:true,args:[
  "--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"
]});
let next=1,wrongFrames=0;
const sockets=new Map(),frames=[];
async function deliver(peer,frame){
  if(!peer||peer.closed)return;
  await peer.page.evaluate(({id,frame})=>{
    const ws=window.__ezeroMockSockets?.get(id);
    ws?.onmessage?.({data:JSON.stringify(frame)});
  },{id:peer.id,frame});
}
async function bridge(source,evt){
  if(evt.action==="open"){
    const u=new URL(evt.url);
    const id=evt.id;
    const peers=[...sockets.values()].filter(s=>s.room===u.pathname && !s.closed);
    if(peers.length>=2)return {ok:false};
    if(evt.protocols.length!==4 || !/^ezero-time-[0-9]{13}$/.test(evt.protocols[2])||
       !/^ezero-proof-[a-f0-9]{64}$/.test(evt.protocols[3]))return {ok:false};
    if(peers.length&&(peers[0].key!==evt.protocols[1]||peers[0].proof!==evt.protocols[3]||
       peers[0].issued!==evt.protocols[2]))return {ok:false};
    const item={id,page:source.page,room:u.pathname,key:evt.protocols[1],
      issued:evt.protocols[2],proof:evt.protocols[3],closed:false,
      role:peers.length?"callee":"caller",approved:false};
    sockets.set(id,item);
    await new Promise(resolve=>setTimeout(resolve,60));
    await deliver(item,{v:1,type:"ready",role:item.role,expires:Date.now()+600000});
    for(const peer of peers){
      await deliver(peer,{v:1,type:"peer_joined"});
      await deliver(item,{v:1,type:"peer_joined"});
    }
    return {ok:true};
  }
  const current=sockets.get(evt.id);
  if(!current)return {ok:false};
  if(evt.action==="close"){current.closed=true;return {ok:true};}
  if(evt.action!=="send")return {ok:false};
  const frame=JSON.parse(evt.data);
  const other=[...sockets.values()].find(s=>s!==current&&s.room===current.room&&!s.closed);
  if(frame.type==="accept"){
    assert.equal(current.role,"callee");
    current.approved=true;
    await deliver(other,{v:1,type:"accepted"});return {ok:true};
  }
  if(frame.type==="offer"||frame.type==="answer"){
    frames.push(frame);
    assert.equal(typeof frame.blob,"string");
    assert.equal(frame.blob.length>128,true);
    assert.equal("payload" in frame,false,"SDP must not be plaintext on server");
    assert.equal(evt.data.includes("a=fingerprint"),false,"No plaintext ICE/SDP in frames");
    if((frame.type==="offer"&&current.role!=="caller")||
      (frame.type==="answer"&&current.role!=="callee")||!other){wrongFrames++;return {ok:false};}
    await deliver(other,frame);return {ok:true};
  }
  if(frame.type==="decline"||frame.type==="hangup"){
    await deliver(other,{v:1,type:frame.type});return {ok:true};
  }
  wrongFrames++;return {ok:false};
}
async function makePhone(){
  const ctx=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    permissions:["camera","microphone"],locale:"en-US"
  });
  await ctx.route("**/*",r=>{
    if(r.request().url().startsWith(host+"/"))return r.continue();
    return r.abort("blockedbyclient");
  });
  await ctx.addInitScript(()=>{
    window.__mediaCalls=0;
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=opts=>{
      window.__mediaCalls++;return original(opts);
    };
    window.__ezeroMockSockets=new Map();
    let seq=0;
    class MockWebSocket{
      static OPEN=1;
      constructor(url,protocols){
        this.id="mock"+(++seq)+"-"+Math.random().toString(36).slice(2);
        this.readyState=1;
        this.url=url;this.protocols=protocols;
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
  await page.exposeBinding("__relayRoom",bridge);
  return {ctx,page};
}
const a=await makePhone(),b=await makePhone();
try{
  await a.page.goto(host+"/ezero_secure_connect_live_p2p_v0_1.html");
  await a.page.waitForFunction(()=>document.querySelector("#myFingerprint")?.textContent.length===64);
  await a.page.locator("#callSetup").evaluate(e=>e.open=true);
  await a.page.locator("#roomCreate").click();
  assert.match(await a.page.locator("#roomStatus").innerText(),/مالک|owner|المالك/,
    "Cannot create room without operator authorization");
  await a.page.locator("#roomOwnerSecret").fill("EZEROOwnerPilotSecret_2026_TestOnly_64chars");
  await a.page.locator("#roomCreate").click();
  await a.page.waitForFunction(()=>document.querySelector("#roomStatus")?.dataset.state==="joined");
  const invite=await a.page.locator("#roomLink").inputValue();
  assert.match(invite,/#callroom=[a-f0-9]{32}\.[a-f0-9]{64}\.[0-9]{13}\.[a-f0-9]{64}$/);
  assert.equal(invite.includes("EZEROOwnerPilotSecret"),false,"Owner secret must not enter URL");
  assert.equal(await a.page.locator("#roomOwnerSecret").inputValue(),"",
    "Owner secret cleared after creating invitation");
  const linkSegments=invite.split("#callroom=")[1].split(".");
  const rawAesKey=linkSegments[1];
  const handshakeToken=[...sockets.values()][0].key;
  assert.notEqual(handshakeToken,"ezero-key-"+rawAesKey,
    "Never send the decryptable AES-256 key via WebSocket protocols");
  assert.match(handshakeToken,/^ezero-key-[a-f0-9]{64}$/);
  const authBytes=new TextEncoder().encode("EZERO-ROOM-AUTH-1:"+rawAesKey);
  const authHash=await crypto.subtle.digest("SHA-256",authBytes);
  const authHex=[...new Uint8Array(authHash)].map(x=>x.toString(16).padStart(2,"0")).join("");
  assert.equal(handshakeToken,"ezero-key-"+authHex,
    "Domain-separated one-way key derivation for server auth");
  assert.equal(await a.page.evaluate(()=>window.__mediaCalls),0,
    "Creating call link never activates microphone or camera");

  await b.page.goto(invite);
  await b.page.waitForFunction(()=>document.querySelector("#myFingerprint")?.textContent.length===64);
  assert.equal(await b.page.evaluate(()=>location.hash),"",
    "Browser strips secret fragment immediately without putting it in requests");
  assert.equal(await b.page.evaluate(()=>window.__mediaCalls),0);
  await b.page.locator("#callSetup").evaluate(e=>e.open=true);
  await b.page.locator("#roomJoin").click();
  await b.page.waitForFunction(()=>document.querySelector("#roomStatus")?.dataset.state==="peer");
  await b.page.locator("#roomAccept").click();
  await a.page.waitForFunction(()=>document.querySelector("#roomStatus")?.dataset.state==="accepted");
  assert.equal(await a.page.evaluate(()=>window.__mediaCalls),0,
    "Recipient acceptance alone does not activate caller microphone");
  await a.page.locator("#roomStart").click();
  await Promise.all([a.page,b.page].map(page=>page.waitForFunction(
    ()=>document.querySelector("#sendMessage")?.disabled===false,{timeout:40000})));
  assert.equal(frames.some(x=>x.type==="offer"),true);
  assert.equal(frames.some(x=>x.type==="answer"),true);
  assert.equal(wrongFrames,0);
  assert.equal(await a.page.evaluate(()=>window.__mediaCalls>0),true);
  assert.equal(await b.page.evaluate(()=>window.__mediaCalls>0),true);
  assert.equal(await a.page.locator("#connectionStatus").innerText().then(v=>/WebRTC/.test(v)),true);
  console.log("TWO_MOBILE_ONE_LINK_AES256_CONSENTED_WEBRTC_CONNECTED: PASS");
  console.log("NO_PLAINTEXT_SDP_TO_SIGNAL_SERVER_NO_AUTO_MIC: PASS");
  await a.page.locator("#roomEnd").click();
  await a.page.waitForFunction(()=>document.querySelector("#roomStatus")?.dataset.state==="ended");
  console.log("ONE_LINK_EXPLICIT_HANGUP: PASS");
}finally{
  await Promise.allSettled([a.ctx.close(),b.ctx.close(),browser.close()]);
}
