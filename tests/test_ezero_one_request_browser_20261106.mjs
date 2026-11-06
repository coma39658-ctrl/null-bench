import assert from "node:assert/strict";
import {chromium} from "playwright";

const base="http://127.0.0.1:8769/";
const pagePath="ezero_secure_connect_one_request_lab_20261106.html";
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
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"false",
    "Audio must not be preselected until the user actually initiates a call");
  assert.equal(await caller.locator('[data-modern-select="video"]').getAttribute("aria-pressed"),"false");
  assert.equal(await caller.evaluate(()=>window.__mediaCalls.length),0,
    "Opening the call lab should not ask for microphone/camera permission");
  assert.equal(await caller.locator("#ezeroAutoPilot").isVisible(),true);
  assert.equal(await caller.locator("#ezeroUnifiedCard").isVisible(),true);
  assert.equal(await caller.locator("#ezeroLegacyCompatibility").isHidden(),true,
    "Old second-color duplicate layers must not be displayed");
  assert.equal(await caller.locator("#ezeroOneJoinPanel").isVisible(),true,
    "Call-QR scanner must be prominent on the receiving phone");
  assert.equal(await caller.locator("#ezeroOneScanInvite").isVisible(),true);
  assert.equal(await caller.locator("#oneTapPanel").isHidden(),true,
    "Identity-only scanner must not appear as a competing call scanner");
  // One click initiates offer; the share URL is short and has an ephemeral capability.
  await caller.locator('[data-modern-select="audio"]').click();
  await caller.waitForFunction(()=>!!window.__oneInvite,{timeout:30000});
  const invite=await caller.evaluate(()=>window.__oneInvite);
  assert.match(invite,/\/c\.html\?mode=audio#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/);
  assert.ok(invite.length<190,"One-request URL should not contain an entire SDP");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"false",
    "Call pending is not a connected state");
  console.log("SINGLE_CLICK_CREATES_COMPACT_QR_INVITE_NO_FAKE_CONNECTION: PASS");

  const callee=await createPhone("CALLEE");
  // c.html is a real public entry point; it redirects room fragments to lab.
  await callee.goto(invite,{waitUntil:"domcontentloaded"});
  await callee.waitForURL(new RegExp("one_request_lab_20261106.html"),{timeout:10000});
  await callee.locator("#ezeroAutoIncoming").waitFor({state:"visible"});
  assert.equal(await callee.locator("#ezeroOneIncomingShell").isVisible(),true,
    "Opening a call QR must directly expose the incoming-accept card");
  assert.equal(await callee.locator("#ezeroOneIncomingHeading").innerText(),
    "📞 آنے والی آڈیو کال — قبول کریں؟");
  assert.equal(await callee.evaluate(()=>window.__mediaCalls.length),0,
    "Opening a friend request must NOT activate camera or microphone");
  assert.equal(await callee.locator("#ezeroAutoAccept").isVisible(),true);
  assert.equal(await callee.locator("#ezeroAutoDecline").isVisible(),true);
  // Only recipient approval. No second link, pasted code or caller approval.
  await callee.locator("#ezeroAutoAccept").click();
  assert.equal(await callee.locator("#ezeroOneCallProgress").getAttribute("data-state"),
    "connecting","Accept should trigger connection without second link");
  await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  assert.equal(offers,1,"Only one signed offer should cross the signaling room");
  assert.equal(answers,1,"The answer should be sent automatically by WebSocket");
  assert.ok(await caller.evaluate(()=>window.__mediaCalls.length)>0);
  assert.ok(await callee.evaluate(()=>window.__mediaCalls.length)>0);
  assert.equal(await caller.locator("#modernConnectionStatus").getAttribute("data-state"),"connected");
  await callee.waitForFunction(()=>document.getElementById("ezeroOneCallProgress")?.dataset.state==="connected",
    {timeout:10000});
  assert.equal(await callee.locator("#ezeroOneCallProgress").getAttribute("data-state"),"connected");
  assert.equal(await caller.locator('[data-modern-select="audio"]').getAttribute("aria-pressed"),"true");
  console.log("ONE_REQUEST_ONE_ACCEPT_AUTOMATIC_SIGNED_ANSWER_REAL_BROWSER_WEBRTC: PASS");
  console.log("NO_SECOND_MANUAL_LINK_NO_AUTO_MIC_BEFORE_ACCEPT: PASS");

  // A verified first call must not strand the caller without the next QR.
  // Neither phone reloads before the caller starts another new room.
  await caller.locator("#modernHangup").click();
  await caller.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===false,{timeout:15000});
  // After the real peer hangs up, the recipient must automatically release
  // microphone (and camera in video mode) rather than keeping a hidden
  // end-call control or a stale media capture alive.
  await callee.waitForFunction(()=>{
    const stream=document.getElementById("localVideo")?.srcObject;
    return window.EZERO_VOICE_TRANSPORT?.connected()===false &&
      (!stream||stream.getTracks().every(track=>track.readyState==="ended"));
  },{timeout:15000});
  assert.equal(await callee.locator("#modernHangup").isVisible(),false,
    "Post-call idle screen should not show the red end-call advertisement");
  console.log("AUDIO_REMOTE_HANGUP_AUTOMATICALLY_RELEASES_MIC: PASS");
  await caller.locator('[data-modern-select="audio"]').click();
  await caller.waitForFunction(old=>
    !!window.__oneInvite&&window.__oneInvite!==old,invite,{timeout:30000});
  const newInvite=await caller.evaluate(()=>window.__oneInvite);
  assert.notEqual(newInvite,invite,"Every new call must have a fresh invite");
  assert.equal(await caller.locator("#ezeroOneQrBox").isVisible(),true);
  assert.equal(await caller.locator("#ezeroOneQr svg").count(),1,
    "The second call must actually render its QR, not merely show a success label");
  assert.equal(await caller.locator("#ezeroOneCopyInvite").isEnabled(),true);
  await callee.goto(newInvite,{waitUntil:"domcontentloaded"});
  await callee.waitForURL(new RegExp("one_request_lab_20261106.html"),{timeout:10000});
  await callee.locator("#ezeroAutoAccept").waitFor({state:"visible"});
  await callee.locator("#ezeroAutoAccept").click();
  await Promise.all([caller,callee].map(page=>page.waitForFunction(()=>
    window.EZERO_VOICE_TRANSPORT?.connected()===true,{timeout:45000})));
  assert.equal(offers,2,"Redial must create a new signed offer");
  assert.equal(answers,2,"Redial must receive another automatically relayed answer");
  console.log("HANGUP_AND_REDIAL_CREATES_NEW_QR_WITHOUT_CALLER_RELOAD: PASS");
}finally{
  await Promise.all(contexts.map(ctx=>ctx.close().catch(()=>{})));
  await browser.close();
}
