import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8769/";
const pagePath="ezero_trusted_friends_staging_20261106.html";
const service="wss://ezero-browser-signaling-pilot.coma39658.workers.dev/v1/rooms/";
const browser=await chromium.launch({headless:true,
  args:["--no-sandbox","--use-fake-device-for-media-stream",
    "--use-fake-ui-for-media-stream"]});
const contexts=[];
const rooms=new Map();
let offers=0,answers=0;
function mockSocket(ws){
  const id=ws.url().slice(service.length);
  if(!/^[A-Za-z0-9_-]{32}$/.test(id))throw Error("Bad room");
  if(!rooms.has(id))rooms.set(id,{});
  const room=rooms.get(id);
  let role="";
  ws.onMessage(payload=>{
    const m=JSON.parse(payload);
    if(m.t==="hello"){
      role=m.role;
      if(role==="host"){
        room.host=ws;
        ws.send(JSON.stringify({t:"ready",role,expires:Date.now()+600000}));
      }else if(role==="guest"&&room.host){
        room.guest=ws;
        ws.send(JSON.stringify({t:"ready",role,expires:Date.now()+600000}));
        room.host.send(JSON.stringify({t:"peer",state:"joined"}));
      }else throw Error("Guest without live host");
    }else if(m.t==="signal"){
      if(role==="host"){
        offers++;
        assert.equal(JSON.parse(m.payload).type,"offer");
        if(!room.guest)throw Error("Guest absent");
        room.guest.send(JSON.stringify({t:"signal",role:"host",payload:m.payload}));
      }else if(role==="guest"){
        answers++;
        assert.equal(JSON.parse(m.payload).type,"answer");
        if(!room.host)throw Error("Host absent");
        room.host.send(JSON.stringify({t:"signal",role:"guest",payload:m.payload}));
      }else throw Error("Unauthenticated mock signal");
    }else if(m.t==="leave"){
      const other=role==="host"?room.guest:room.host;
      other?.send(JSON.stringify({t:"left"}));
    }
  });
}
async function createPhone(name){
  const context=await browser.newContext({
    viewport:{width:393,height:852},isMobile:true,hasTouch:true,
    permissions:["camera","microphone"]
  });
  contexts.push(context);
  await context.routeWebSocket(service+"**",mockSocket);
  await context.route("**/*",route=>route.request().url().startsWith(base)?
    route.continue():route.abort("blockedbyclient"));
  await context.addInitScript(()=>{
    window.__mediaCalls=[];
    window.__oneInvite="";
    // Synthetic Web Audio test: verifies a ringtone starts for genuine
    // incoming calls and stops before the camera is opened by Accept.
    window.__ringCounts={contexts:0,resume:0,tones:0,suspend:0};
    class TestAudioContext {
      constructor(){window.__ringCounts.contexts++;this.state="suspended";this.currentTime=0;this.destination={};}
      async resume(){this.state="running";window.__ringCounts.resume++;}
      async suspend(){this.state="suspended";window.__ringCounts.suspend++;}
      async close(){this.state="closed";}
      createOscillator(){
        return {type:"",frequency:{setValueAtTime(){}},connect(){},disconnect(){},
          start(){window.__ringCounts.tones++;},stop(){},onended:null};
      }
      createGain(){
        return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},
          connect(){},disconnect(){}};
      }
    }
    window.AudioContext=TestAudioContext;
    document.addEventListener("ezero:auto-invite-ready",e=>{
      window.__oneInvite=e.detail?.link||"";
    });
    const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia=args=>{
      window.__mediaCalls.push(args);
      return original(args);
    };
  });
  const page=await context.newPage();
  page.on("pageerror",e=>console.error(name+"_PAGE_ERROR",e.message));
  await page.goto(base+pagePath,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.getElementById("myFingerprint")?.textContent.length===64);
  return page;
}

try{
  const caller=await createPhone("CALLER");
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),0,
    "Opening public site must not access the camera or microphone");
  assert.equal(await caller.locator("#modernCallPanel").isVisible(),false,
    "No video preview before user starts a call");
  await caller.locator('[data-modern-select="video"]').click();
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:30000});
  const invite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(invite,/\/ezero_trusted_friends_staging_20261106\.html\?mode=video#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/);
  const callerSetup=await caller.evaluate(()=>({
    mode:document.querySelector('input[name="mode"]:checked')?.value,
    mediaCalls:window.__mediaCalls.map(x=>({video:!!x.video,audio:!!x.audio}))
  }));
  assert.equal(callerSetup.mode,"video","A video tap must choose video mode");
  assert.ok(callerSetup.mediaCalls.some(x=>x.video&&x.audio),
    "A video tap must request both camera and microphone");

  const callee=await createPhone("CALLEE");
  await callee.goto(invite,{waitUntil:"domcontentloaded"});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible",timeout:12000});
  assert.equal(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    "📹 آنے والی ویڈیو کال — قبول کریں؟");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
    "Receiving a video QR must not open camera until explicit acceptance");
  assert.equal(await callee.locator("#modernCallPanel").isVisible(),false);
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  assert.equal(offers,1);
  assert.equal(answers,1);
  for(const [idx,phone] of [caller,callee].entries()){
    await phone.waitForFunction(()=>
      document.body.classList.contains("ezero-video-connected")&&
      document.getElementById("remoteVideo")?.srcObject?.getVideoTracks?.()
        .some(track=>track.readyState==="live")===true,{timeout:12000});
    const verified=await phone.evaluate(()=>{
      const local=document.getElementById("localVideo");
      const remote=document.getElementById("remoteVideo");
      const box=document.getElementById("modernCallPanel");
      const large=remote.closest(".videoBox").getBoundingClientRect();
      const small=local.closest(".videoBox").getBoundingClientRect();
      return {
        mode:document.querySelector('input[name="mode"]:checked')?.value,
        cameraRequests:window.__mediaCalls.filter(v=>!!v.video&&!!v.audio).length,
        local:local.srcObject?.getVideoTracks()?.filter(t=>t.readyState==="live").length||0,
        remote:remote.srcObject?.getVideoTracks()?.filter(t=>t.readyState==="live").length||0,
        visible:getComputedStyle(box).display!=="none",
        large:{w:large.width,h:large.height},
        small:{w:small.width,h:small.height}
      };
    });
    assert.equal(verified.mode,"video","Receiver and caller must both remain on video mode");
    assert.ok(verified.cameraRequests>0,"Each phone must consent to camera capture");
    assert.equal(verified.local,1,"Each phone must have a local live camera track");
    assert.equal(verified.remote,1,"Each phone must receive remote camera track");
    assert.equal(verified.visible,true,"Public video panel must not be CSS-hidden");
    assert.ok(verified.large.w>verified.small.w*2&&verified.large.h>verified.small.h*2,
      "Remote video must be visibly larger than local preview");
    assert.equal(await phone.locator("#ezeroCallMediaSlot .videos").isVisible(),true,
      "Video tiles must be actually visible in the browser");
    console.log("PUBLIC_REAL_VIDEO_TRACKS_AND_VISIBLE_PIP_PHONE_"+(idx+1)+": PASS");
  }
  await caller.locator("#hangup").click();
  await callee.waitForFunction(()=>{
    const media=document.getElementById("localVideo")?.srcObject;
    return !window.EZERO_VOICE_TRANSPORT?.connected() &&
      (!media||media.getTracks().every(t=>t.readyState==="ended"));
  },{timeout:15000});
  console.log("PUBLIC_VIDEO_HANGUP_RELEASES_REMOTE_CAMERA: PASS");
  console.log("PUBLIC_VIDEO_QR_ONE_ACCEPT_CAMERA_BOTH_PHONES: PASS");
}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
