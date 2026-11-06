/* E-ZERO automatic browser-to-browser signaling PILOT (feature-flagged OFF).
 * No media is sent over signaling. WebRTC engine signs and verifies each SDP.
 * No clipboard codes; media always requires explicit user-initiated call consent.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.EZERO_AUTO_SIGNALING_CONFIG;
  if(!$("ezeroAutoPilot") || !cfg?.enabled ||
     !/^wss:\/\/[a-z0-9.-]+(?::443)?$/i.test(cfg.websocketOrigin||"")) return;
  const ROOM=/^[A-Za-z0-9_-]{32}$/;
  const TOKEN=/^[A-Za-z0-9_-]{43}$/;
  const ttl=10*60*1000;
  const copy={
    ur:{title:"محفوظ خودکار رابطہ — تجرباتی",start:"📞 محفوظ دعوت بنائیں",
      share:"↗ دعوت شیئر کریں",join:"✓ درخواست قبول کریں",
      decline:"✕ درخواست مسترد کریں",idle:"فون ملانے کے لیے دعوت تیار کریں۔",
      incoming:"دوست کی کال کی دعوت ہے۔ قبول کریں تو مائیک/کیمرے کی اجازت مانگی جا سکتی ہے۔",
      connecting:"محفوظ رابطے کی کوشش جاری ہے۔",
      inviteReady:"دعوت تیار ہے؛ قابلِ اعتماد دوست کو بھیجیں۔",
      waiting:"دوست کے رابطہ کھولنے کا انتظار ہے۔",
      peerFound:"دوست نے دعوت کھولی ہے؛ محفوظ جواب کی تصدیق ہوگی۔",
      received:"دوست کی درخواست آئی ہے؛ قبول کرنے سے پہلے فرد کی شناخت چیک کریں۔",
      finished:"✓ حقیقی WebRTC رابطے کی تصدیق ہوئی۔",
      noRoute:"رابطہ قائم نہیں ہوا۔ دونوں فونوں کا انٹرنیٹ اور STUN/TURN چیک کریں۔",
      noShare:"شیئرنگ کی اجازت نہیں ملی؛ پہلے دعوت پھر سے بنائیں۔",
      bad:"دعوت نامکمل یا پرانی ہے؛ نئی محفوظ دعوت منگوائیں۔",
      server:"خودکار رابطہ سرور دستیاب نہیں۔ دستی دعوت والا موجودہ نظام برقرار ہے۔",
      expired:"دعوت کی مدت ختم ہوگئی، نئی دعوت بنائیں۔",
      rejected:"دعوت مسترد ہو گئی؛ کوئی کال شروع نہیں ہوئی۔",
      remoteLeft:"دوسرا فون رابطے سے نکل گیا؛ کال کی حالت WebRTC سے الگ دیکھی جائے گی۔",
      stun:"دوسرے نیٹ ورک کے لیے اختیاری STUN (IP/نیٹ ورک میٹاڈیٹا ظاہر ہو سکتا ہے)"},
    en:{title:"Secure auto-connect — pilot",start:"📞 Create secure invite",
      share:"↗ Share invite",join:"✓ Accept request",decline:"✕ Decline",
      idle:"Create an invitation to connect phones.",
      incoming:"A friend has invited you. Camera/microphone permission may be requested after you accept.",
      connecting:"Secure connection in progress.",
      inviteReady:"Invitation ready. Share with a trusted friend.",
      waiting:"Waiting for your friend to open the link.",
      peerFound:"Your friend opened the invitation. Verifying the signed answer.",
      received:"Incoming request. Verify the person before accepting.",
      finished:"✓ Actual WebRTC connection confirmed.",
      noRoute:"No connection. Check both phones' internet and STUN/TURN availability.",
      noShare:"Could not share the link. Create a fresh invitation.",
      bad:"Incomplete or expired invitation. Request a new secure link.",
      server:"Automatic signaling service unavailable. Existing manual calls remain available.",
      expired:"Invitation expired. Create a new one.",
      rejected:"Request declined; no call was started.",
      remoteLeft:"The other phone left signaling. WebRTC call state is checked separately.",
      stun:"Optional STUN for different networks (may expose IP/network metadata)"},
    ar:{title:"اتصال تلقائي آمن — تجريبي",start:"📞 إنشاء دعوة آمنة",
      share:"↗ مشاركة الدعوة",join:"✓ قبول الطلب",decline:"✕ رفض الطلب",
      idle:"أنشئ دعوة لربط الهاتفين.",
      incoming:"وصلتك دعوة. قد يُطلب إذن الكاميرا أو الميكروفون بعد قبولها.",
      connecting:"جارٍ إنشاء الاتصال الآمن.",
      inviteReady:"الدعوة جاهزة. شاركها مع صديق موثوق.",
      waiting:"بانتظار فتح الصديق للرابط.",
      peerFound:"فتح الصديق الدعوة. يجري التحقق من الرد الموقّع.",
      received:"وصل طلب. تحقق من هوية الشخص قبل القبول.",
      finished:"✓ تم التأكد من اتصال WebRTC حقيقي.",
      noRoute:"تعذر الاتصال. تحقق من إنترنت الهاتفين وتوافر STUN/TURN.",
      noShare:"تعذرت مشاركة الرابط. أنشئ دعوة جديدة.",
      bad:"الدعوة غير مكتملة أو منتهية؛ اطلب رابطًا جديدًا.",
      server:"خدمة الإشارة التلقائية غير متاحة. ما زالت الطريقة اليدوية موجودة.",
      expired:"انتهت صلاحية الدعوة؛ أنشئ دعوة جديدة.",
      rejected:"رُفض الطلب ولم تبدأ مكالمة.",
      remoteLeft:"غادر الطرف الآخر الإشارة. حالة المكالمة تتحقق عبر WebRTC بشكل منفصل.",
      stun:"STUN اختياري بين الشبكات (قد يكشف بيانات IP والشبكة)"}
  };
  const tr=key=>(copy[document.documentElement.lang]||copy.ur)[key]||key;
  const box=$("ezeroAutoPilot"),status=$("ezeroAutoStatus");
  const set=(key,kind="idle")=>{
    status.textContent=tr(key);status.dataset.state=kind;
  };
  const random=length=>{
    const bytes=crypto.getRandomValues(new Uint8Array(length));
    let raw="";for(const b of bytes)raw+=String.fromCharCode(b);
    return btoa(raw).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  };
  const sha=async token=>{
    const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
    return Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,"0")).join("");
  };
  const invitation=()=>{
    const h=/^#room=([A-Za-z0-9_-]{32})\.([A-Za-z0-9_-]{43})$/.exec(location.hash);
    if(!h)return null;
    const safe=new URL(location.href);safe.hash="";
    try{history.replaceState(null,"",safe.href);}catch(_){}
    return {room:h[1],guestToken:h[2]};
  };
  const incoming=invitation();
  // A second QR link can arrive on the *same page* as a new #room fragment.
  // Browsers do not rerun deferred scripts on same-document hash navigation.
  // Re-enter once only after the previous call is fully ended; on reload
  // invitation() consumes the new fragment and strips it from the address.
  window.addEventListener("hashchange",()=>{
    if(!/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(location.hash))return;
    if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()){
      const notice=$("ezeroAutoStatus");
      if(notice){notice.textContent="پہلی کال ختم کریں، پھر نئی دعوت کھولیں۔";notice.dataset.state="error";}
      return;
    }
    location.reload();
  });
  let session=null;
  let localOffer="",answerSent=false;
  const active=()=>session&&session.ws?.readyState===WebSocket.OPEN;
  function closeRoom(notify=true){
    if(!session)return;
    const ws=session.ws;
    if(notify&&ws?.readyState===WebSocket.OPEN){
      try{ws.send(JSON.stringify({t:"leave"}));}catch(_){}
    }
    try{ws?.close(1000,"finished");}catch(_){}
    session=null;localOffer="";answerSent=false;
    $("ezeroAutoShare").disabled=true;
  }
  const signalError=key=>{
    set(key,"error");
    if(!window.EZERO_PEER_PROFILE_TRANSPORT?.connected())closeRoom();
  };
  function secureSignal(raw,type){
    if(typeof raw!=="string"||raw.length>145000)return false;
    try{
      const v=JSON.parse(raw);
      return v?.v===1 && v.type===type && typeof v.sdp==="string" &&
        v.sdp.length>=100 && v.sdp.length<=120000 &&
        /^[a-f0-9]{64}$/.test(v.fp||"") &&
        Number.isSafeInteger(v.issued)&&Math.abs(Date.now()-v.issued)<ttl;
    }catch(_){return false;}
  }
  function forward(payload){
    if(!active()||!session || !secureSignal(payload,session.role==="host"?"offer":"answer"))
      return false;
    const toSend={t:"signal",payload};
    try{session.ws.send(JSON.stringify(toSend));return true;}catch(_){return false;}
  }
  function updateLanguage(){
    for(const el of document.querySelectorAll("[data-auto]"))el.textContent=tr(el.dataset.auto);
    if(session?.stage)set(session.stage,session.state||"idle");
  }
  function chooseStun(){
    // Never silently opt users into a third party STUN service.
    const consent=$("ezeroAutoStun").checked;
    $("enableStun").checked=consent;
  }
  async function connectSocket(s){
    return new Promise(async(resolve,reject)=>{
      let finished=false;
      const fail=()=>{if(finished)return;finished=true;reject(Error("SIGNAL_SERVER"))};
      let ws;
      try{ws=new WebSocket(cfg.websocketOrigin+"/v1/rooms/"+s.room);}
      catch(_){return fail();}
      s.ws=ws;
      const guard=setTimeout(()=>{try{ws.close();}catch(_){}fail();},9000);
      const settle=()=>{if(!finished){finished=true;clearTimeout(guard);resolve();}};
      const error=()=>{clearTimeout(guard);fail();};
      ws.addEventListener("open",async()=>{
        try{
          const hello={t:"hello",role:s.role};
          if(s.role==="host"){
            hello.hostProof=await sha(s.hostToken);
            hello.guestProof=await sha(s.guestToken);
          }else hello.guestProof=await sha(s.guestToken);
          if(ws.readyState!==WebSocket.OPEN)return error();
          ws.send(JSON.stringify(hello));
        }catch(_){error();}
      });
      ws.addEventListener("message",event=>{
        if(typeof event.data!=="string"||event.data.length>146000)return;
        let m;try{m=JSON.parse(event.data);}catch(_){return;}
        if(!m||!session||session!==s)return;
        if(m.t==="ready"&&m.role===s.role){
          s.expires=Number(m.expires)||0;
          if(s.expires<=Date.now()||s.expires>Date.now()+ttl+10000)return error();
          settle();
          s.stage=s.role==="host"?"waiting":"connecting";
          set(s.stage);
          return;
        }
        if(m.t==="peer"&&s.role==="host"){
          if(m.state==="joined"){
            s.peerJoined=true;
            set("peerFound");
            if(localOffer&&!s.offerForwarded){
              s.offerForwarded=forward(localOffer);
            }
          }else if(m.state==="left"&&!window.EZERO_PEER_PROFILE_TRANSPORT?.connected()){
            set("remoteLeft");s.peerJoined=false;
          }
          return;
        }
        if(m.t==="signal"){
          if(s.role==="guest"&&m.role==="host"&&secureSignal(m.payload,"offer")){
            // Only after a user explicitly chose Accept; the old signed
            // SDP verifier and media permission gate stay unchanged.
            $("guidedIncoming").value=m.payload;
            chooseStun();
            $("guidedContinue").click();
            return;
          }
          if(s.role==="host"&&m.role==="guest"&&secureSignal(m.payload,"answer")){
            $("guidedIncoming").value=m.payload;
            $("guidedContinue").click();
            return;
          }
          return signalError("bad");
        }
        if(m.t==="declined"){signalError("rejected");return;}
        if(m.t==="closed"){signalError(m.reason==="expired"?"expired":"server");return;}
        if(m.t==="error"){signalError("server");return;}
      });
      ws.addEventListener("error",error);
      ws.addEventListener("close",()=>{
        clearTimeout(guard);
        if(!finished)fail();
        if(session===s && !window.EZERO_PEER_PROFILE_TRANSPORT?.connected()){
          set("server","error");
        }
      });
    });
  }
  const shareLink=()=>{
    if(!session||session.role!=="host")return "";
    // When the user explicitly opens the opt-in lab, its one-request
    // invite uses the existing concise E-ZERO c.html public entry point.
    const isLab=cfg.version==="0.1-lab" &&
      location.pathname.endsWith("/ezero_trusted_friends_staging_20261106.html");
    // Staging caller and callee must share the same permanent-device identity
    // and inbox script: do not route this trial through the production c.html.
    const u=new URL(isLab?"./ezero_trusted_friends_staging_20261106.html":location.href,location.href);
    u.hash="room="+session.room+"."+session.guestToken;
    const mode=document.querySelector('input[name="mode"]:checked')?.value||"audio";
    u.searchParams.set("mode",mode);
    return u.href;
  };

  async function start(){
    if(session){
      // Never discard a still-valid invitation merely because Audio/Video was
      // tapped twice. Instead restore the QR for the same active room.
      if(active()&&session.role==="host"&&localOffer){
        set("inviteReady","ready");
        document.dispatchEvent(new CustomEvent("ezero:auto-invite-ready",{detail:{link:shareLink()}}));
        return;
      }
      // Do not interrupt an unfinished, active, user-authorized request.
      if(active()){
        set("connecting");
        return;
      }
      // A closed socket must never keep the single-call button locked forever.
      if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()){
        set("finished","connected");
        return;
      }
      closeRoom(false);
      // Dispose incomplete peer media/SDP before attempting another one-shot
      // call. This is an explicit new tap, never an automatic retry.
      $("hangup").click();
    }
    document.dispatchEvent(new CustomEvent("ezero:auto-call-starting"));
    const room=random(24),hostToken=random(32),guestToken=random(32);
    if(!ROOM.test(room)||!TOKEN.test(hostToken)||!TOKEN.test(guestToken))return signalError("bad");
    session={role:"host",room,hostToken,guestToken,offerForwarded:false,peerJoined:false};
    set("connecting");
    try{
      await connectSocket(session);
      chooseStun();
      document.dispatchEvent(new CustomEvent("ezero:call-intent",{detail:{
        direction:"outgoing",kind:document.querySelector('input[name="mode"]:checked')?.value||"audio"
      }}));
      // Reuse the existing signed WebRTC call engine. Nothing is silently
      // transmitted to a peer; the offer is relayed only after guest joins.
      $("guidedOffer").click();
    }catch(_){signalError("server");}
  }
  function openedInvite(){
    if(!incoming)return;
    $("ezeroAutoStart").hidden=true;
    $("ezeroAutoIncoming").hidden=false;
    set("received");
    document.dispatchEvent(new CustomEvent("ezero:auto-incoming-open"));
  }
  async function accept(){
    if(session||!incoming)return;
    session={role:"guest",room:incoming.room,guestToken:incoming.guestToken};
    $("ezeroAutoIncoming").hidden=true;
    set("connecting");
    try{await connectSocket(session);}
    catch(_){signalError("server");}
  }
  document.addEventListener("ezero:signal-ready",event=>{
    if(!session)return;
    const type=event.detail?.type;
    const raw=$("localSignal").value;
    if(session.role==="host"&&type==="offer"&&secureSignal(raw,"offer")){
      localOffer=raw;
      $("ezeroAutoShare").disabled=false;
      session.stage="inviteReady";
      set("inviteReady","ready");
      document.dispatchEvent(new CustomEvent("ezero:auto-invite-ready",{detail:{link:shareLink()}}));
      if(session.peerJoined&&!session.offerForwarded){
        session.offerForwarded=forward(raw);
      }
    }else if(session.role==="guest"&&type==="answer"&&!answerSent){
      answerSent=forward(raw);
      if(!answerSent)signalError("server");
    }
  });
  document.addEventListener("ezero:call-status",event=>{
    if(!session)return;
    const stage=event.detail?.stage;
    if(stage==="connected"&&window.EZERO_PEER_PROFILE_TRANSPORT?.connected()){
      set("finished","connected");
    }else if(["micDenied","iceNoRoute","signalInvalid","fingerprintMismatch"].includes(stage)){
      set(stage==="iceNoRoute"?"noRoute":"bad","error");
      // Fail closed and release the stale room so the next explicit call tap
      // can create a fresh request. No background retry or auto capture.
      if(!window.EZERO_PEER_PROFILE_TRANSPORT?.connected())closeRoom();
    }else if(stage==="idle")closeRoom();
  });
  document.addEventListener("ezero:channel-state",event=>{
    if(!session)return;
    if(event.detail?.connected&&window.EZERO_PEER_PROFILE_TRANSPORT?.connected())
      set("finished","connected");
  });
  $("ezeroAutoStart").addEventListener("click",start);
  $("ezeroAutoAccept").addEventListener("click",accept);
  $("ezeroAutoDecline").addEventListener("click",()=>{
    closeRoom();
    $("ezeroAutoIncoming").hidden=true;set("rejected");
  });
  $("ezeroAutoShare").addEventListener("click",async()=>{
    const link=shareLink();
    if(!link||!localOffer)return set("bad","error");
    try{
      if(typeof navigator.share==="function"){
        await navigator.share({title:"E-ZERO Secure Connect",url:link});
      }else if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(link);
      }else throw Error("NO_SHARE");
      set("waiting");
    }catch(error){
      if(error?.name!=="AbortError")set("noShare","error");
    }
  });
  window.addEventListener("pagehide",()=>closeRoom());
  $("language").addEventListener("change",updateLanguage);
  box.hidden=false;
  updateLanguage();
  if(incoming)openedInvite();
  else set("idle");
})();
