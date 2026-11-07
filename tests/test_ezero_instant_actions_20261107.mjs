import assert from "node:assert/strict";
import {chromium} from "playwright";

/* Stage-only UI + real two isolated Chromium WebRTC stacks; signaling is mocked.
 * Does NOT claim a physical two-phone call or real Cloudflare availability.
 */
const base="http://127.0.0.1:8769/";
const pagePath="ezero_trusted_friends_staging_20261106.html";
const service="wss://ezero-browser-signaling-pilot.coma39658.workers.dev/v1/rooms/";
const browser=await chromium.launch({headless:true,args:[
  "--no-sandbox","--use-fake-device-for-media-stream","--use-fake-ui-for-media-stream"
]});
const contexts=[],rooms=new Map();
let offers=0,answers=0;
function mockSocket(ws){
  const id=ws.url().slice(service.length);
  if(!/^[A-Za-z0-9_-]{32}$/.test(id))throw Error("Unexpected signaling room");
  if(!rooms.has(id))rooms.set(id,{});
  const room=rooms.get(id);let role="";
  ws.onMessage(payload=>{
    const msg=JSON.parse(payload);
    if(msg.t==="hello"){
      role=msg.role;
      if(role==="host"){
        room.host=ws;
        ws.send(JSON.stringify({t:"ready",role,expires:Date.now()+600000}));
      }else if(role==="guest"&&room.host){
        room.guest=ws;
        ws.send(JSON.stringify({t:"ready",role,expires:Date.now()+600000}));
        room.host.send(JSON.stringify({t:"peer",state:"joined"}));
      }else throw Error("No live host");
    }else if(msg.t==="signal"){
      if(role==="host"){
        offers++;assert.equal(JSON.parse(msg.payload).type,"offer");
        room.guest?.send(JSON.stringify({t:"signal",role:"host",payload:msg.payload}));
      }else if(role==="guest"){
        answers++;assert.equal(JSON.parse(msg.payload).type,"answer");
        room.host?.send(JSON.stringify({t:"signal",role:"guest",payload:msg.payload}));
      }else throw Error("Unauthenticated signal");
    }else if(msg.t==="leave"){
      (role==="host"?room.guest:room.host)?.send(JSON.stringify({t:"left"}));
    }
  });
}
async function phone(label, url=base+pagePath+"?quick=1"){
  const ctx=await browser.newContext({viewport:{width:393,height:852},
    hasTouch:true,isMobile:true,permissions:["microphone","camera"]});
  contexts.push(ctx);
  await ctx.routeWebSocket(service+"**",mockSocket);
  await ctx.route("**/*",route=>route.request().url().startsWith(base)?
    route.continue():route.abort("blockedbyclient"));
  await ctx.addInitScript(()=>{
    window.__mediaCalls=[];
    window.__invite="";
    document.addEventListener("ezero:auto-invite-ready",e=>window.__invite=e.detail?.link||"");
    const capture=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=constraints=>{
      window.__mediaCalls.push(constraints);
      return capture(constraints);
    };
  });
  const page=await ctx.newPage();
  page.on("pageerror",e=>console.error(label+" JS ERROR: "+e.message));
  await page.goto(url,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64);
  return page;
}
try{
  const a=await phone("A");
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0,
    "Landing page must never request media permission");
  assert.equal(await a.locator("[data-instant]").count(),6);
  assert.equal(await a.locator("#ezeroInstantSheet").isVisible(),false);
  const initialY=await a.evaluate(()=>scrollY);
  await a.locator('[data-instant="my"]').click();
  assert.equal(await a.locator("#ezeroInstantSheet").isVisible(),true);
  await a.waitForFunction(()=>document.getElementById("ezeroInstantQrPreview")?.children.length>0);
  assert.equal(await a.evaluate(()=>window.__mediaCalls.length),0,
    "Showing signed identity QR must not capture audio/video");
  assert.equal(await a.evaluate(()=>scrollY),initialY,"QR must not jump the whole page");
  await a.locator(".ezero-instant-close").click();

  await a.locator('[data-instant="voice"]').click();
  assert.equal(await a.locator("#modernVoicePanel").isVisible(),true,
    "Voice message controls must open immediately in the action sheet");
  await a.locator(".ezero-instant-close").click();
  await a.locator('[data-instant="chat"]').click();
  assert.equal(await a.locator("#modernChatPanel").isVisible(),true,
    "Chat composer must open without page jumping");
  await a.locator(".ezero-instant-close").click();
  assert.equal(await a.evaluate(()=>scrollY),initialY);
  console.log("INSTANT_IDENTITY_VOICE_CHAT_NO_PAGE_JUMP: PASS");

  await a.locator('[data-instant="video"]').click();
  assert.equal(await a.locator("#ezeroInstantSheet").isVisible(),true);
  await a.waitForFunction(()=>Boolean(window.__invite));
  assert.equal(await a.locator("#ezeroOneQrBox").isVisible(),true,
    "Actual signed call invitation QR should appear in the same sheet");
  assert.equal(await a.evaluate(()=>document.querySelector('input[name="mode"]:checked')?.value),"video");
  const invite=await a.evaluate(()=>window.__invite);
  const inviteUrl=new URL(invite);
  assert.match(inviteUrl.hash,/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/);
  inviteUrl.searchParams.set("quick","1");
  const b=await phone("B",inviteUrl.href);
  assert.equal(await b.locator("#ezeroInstantSheet").isVisible(),true,
    "Incoming call should open same-page sheet immediately");
  assert.equal(await b.locator("#ezeroAutoIncoming").isVisible(),true);
  assert.equal(await b.evaluate(()=>window.__mediaCalls.length),0,
    "Incoming request cannot activate the camera without acceptance");
  await b.locator("#ezeroAutoAccept").click();
  for(const p of [a,b]){
    await p.waitForFunction(()=>window.EZERO_VOICE_TRANSPORT?.connected()===true);
    await p.waitForFunction(()=>document.body.classList.contains("ezero-video-connected"));
    await p.waitForFunction(()=>document.getElementById("remoteVideo")?.srcObject?.getVideoTracks()
      .some(t=>t.readyState==="live"));
    assert.equal(await p.locator("#ezeroInstantSheet").isVisible(),false,
      "Video must return to the established immersive call controls, not cover them");
    assert.equal(await p.locator("#ezeroCallMediaSlot .videos").isVisible(),true);
    const size=await p.evaluate(()=>{
      const boxes=document.querySelectorAll("#ezeroCallMediaSlot .videoBox");
      const local=boxes[0]?.getBoundingClientRect(),remote=boxes[1]?.getBoundingClientRect();
      return {lw:local?.width||0,rw:remote?.width||0};
    });
    assert.ok(size.rw>size.lw*2,"Friend's video must be larger than local PiP");
  }
  assert.equal(offers,1);assert.equal(answers,1);
  console.log("INSTANT_TWO_CHROMIUM_WEBRTC_VIDEO_ACCEPT_VISIBLE_BOTH: PASS");
  await a.locator("#hangup").click();
  await b.waitForFunction(()=>!window.EZERO_VOICE_TRANSPORT?.connected());
  console.log("INSTANT_CALL_HANGUP_NO_REGRESSION: PASS");
}finally{
  await Promise.all(contexts.map(c=>c.close().catch(()=>{})));
  await browser.close();
}