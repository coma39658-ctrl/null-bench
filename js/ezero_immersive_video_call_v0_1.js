/* E-ZERO Secure Connect: one immersive call surface + consented incoming ringtone.
 * The existing signed WebRTC call and its original <video> elements remain
 * authoritative. Nothing here creates an RTC peer, obtains camera/microphone
 * streams, records audio/video or automatically accepts calls.
 *
 * Ringback is an ORIGINAL two-tone non-musical alert generated with Web Audio.
 * Browsers may block automatic audio; provide an explicit "Ring" button.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const body=document.body;
  if(!body?.classList.contains("ezero-one-lab"))return;
  const panel=$("modernCallPanel");
  const media=$("ezeroCallMediaSlot");
  const invite=$("ezeroAutoIncoming");
  const shell=$("ezeroOneIncomingShell");
  if(!panel||!media||!invite||!shell)return;

  const strings={
    ur:{
      ready:"حقیقی ویڈیو کال جاری ہے",waiting:"رابطہ قائم ہے؛ دوست کی ویڈیو کا انتظار ہے",
      bell:"🔔 بیل سنیں",silent:"🔕 بیل بند کریں",
      blocked:"بیل سننے کے لیے 🔔 دبائیں۔ موبائل براؤزر خودکار آواز روک سکتا ہے۔"
    },
    en:{
      ready:"Secure video call connected",waiting:"Connected — waiting for your friend's video",
      bell:"🔔 Play ringtone",silent:"🔕 Silence ringtone",
      blocked:"Tap 🔔 to enable ringing; mobile browsers can block autoplay."
    },
    ar:{
      ready:"مكالمة فيديو متصلة",waiting:"متصل — في انتظار فيديو صديقك",
      bell:"🔔 تشغيل الرنين",silent:"🔕 إيقاف الرنين",
      blocked:"اضغط 🔔 لسماع الرنين؛ قد يمنع المتصفح التشغيل التلقائي."
    }
  };
  const t=k=>(strings[document.documentElement.lang]||strings.ur)[k];
  const header=document.createElement("div");
  header.id="ezeroVideoSceneHeader";
  const dot=document.createElement("span");dot.className="ezero-live-dot";dot.setAttribute("aria-hidden","true");
  const sceneLabel=document.createElement("span");
  sceneLabel.id="ezeroVideoSceneLabel";
  header.append(dot,sceneLabel);
  panel.insertBefore(header,media);
  header.hidden=true;
  const bellButton=document.createElement("button");
  bellButton.id="ezeroIncomingRingToggle";
  bellButton.type="button";
  bellButton.textContent=t("bell");
  const ringStatus=document.createElement("small");
  ringStatus.id="ezeroIncomingRingStatus";
  ringStatus.setAttribute("role","status");
  ringStatus.setAttribute("aria-live","polite");
  shell.append(bellButton,ringStatus);

  let ringContext=null,ringInterval=null,ringLimit=null,ringActive=false;
  const AudioCtor=window.AudioContext||window.webkitAudioContext;

  function toneOnce(){
    if(!ringActive||!ringContext||ringContext.state!=="running"||
       invite.hidden||shell.hidden)return;
    const now=ringContext.currentTime;
    // Short, soft two-tone incoming-call notification; no copyrighted song.
    for(let i=0;i<2;i++){
      const oscillator=ringContext.createOscillator();
      const gain=ringContext.createGain();
      const start=now+i*.37;
      oscillator.type="sine";oscillator.frequency.setValueAtTime(i?650:540,start);
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(.065,start+.04);
      gain.gain.setValueAtTime(.065,start+.22);
      gain.gain.linearRampToValueAtTime(0,start+.31);
      oscillator.connect(gain);gain.connect(ringContext.destination);
      oscillator.start(start);oscillator.stop(start+.34);
      oscillator.onended=()=>{
        try{oscillator.disconnect();gain.disconnect();}catch(_){}
      };
    }
  }
  function stopRing(){
    ringActive=false;
    if(ringInterval!==null){clearInterval(ringInterval);ringInterval=null;}
    if(ringLimit!==null){clearTimeout(ringLimit);ringLimit=null;}
    if(ringContext){try{ringContext.suspend().catch(()=>{});}catch(_){}}
    bellButton.textContent=t("bell");
    ringStatus.textContent="";
  }
  async function startRing(){
    if(!AudioCtor||invite.hidden||shell.hidden)return;
    if(ringActive&&ringContext?.state==="running")return;
    try{
      if(!ringContext)ringContext=new AudioCtor();
      await ringContext.resume(); // may be blocked by browser autoplay policy
      if(invite.hidden||shell.hidden||ringContext.state!=="running"){
        stopRing();ringStatus.textContent=t("blocked");return;
      }
      if(ringInterval!==null)clearInterval(ringInterval);
      if(ringLimit!==null)clearTimeout(ringLimit);
      ringActive=true;
      bellButton.textContent=t("silent");
      ringStatus.textContent="";
      toneOnce();
      ringInterval=setInterval(toneOnce,2750);
      ringLimit=setTimeout(stopRing,45000); // time-bound; no background sound
    }catch(_){stopRing();ringStatus.textContent=t("blocked");}
  }
  function showIncoming(){
    if(invite.hidden||shell.hidden)return;
    bellButton.hidden=false;
    // Attempt a single ringtone only for a genuine incoming invitation.
    // On mobile, user gesture may be required; explicit toggle always remains.
    startRing();
  }
  bellButton.addEventListener("click",()=>{
    if(ringActive)stopRing();
    else startRing();
  });
  for(const id of ["ezeroAutoAccept","ezeroAutoDecline","modernHangup","hangup","closeAll"]){
    $(id)?.addEventListener("click",stopRing);
  }
  function remoteHasVideo(){
    const stream=$("remoteVideo")?.srcObject;
    return stream && typeof stream.getVideoTracks==="function" &&
      stream.getVideoTracks().some(track=>track.readyState==="live");
  }
  let hadVerifiedCall=false;
  function updateScene(){
    const connected=window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
    if(connected)hadVerifiedCall=true;
    const mode=document.querySelector('input[name="mode"]:checked')?.value;
    const video=connected&&mode==="video";
    body.classList.toggle("ezero-call-connected",connected);
    body.classList.toggle("ezero-video-connected",video);
    header.hidden=!video;
    if(video)sceneLabel.textContent=t(remoteHasVideo()?"ready":"waiting");
    if(connected)stopRing();
  }
  document.addEventListener("ezero:auto-incoming-open",showIncoming);
  document.addEventListener("ezero:call-status",event=>{
    const stage=event.detail?.stage;
    if(["connecting","connected","idle","failed","micDenied",
        "iceNoRoute","signalInvalid","fingerprintMismatch"].includes(stage)){
      if(stage!=="connected")stopRing();
      // The immersive hangup uses the original core button rather than the
      // former top-card modernHangup wrapper. Hide its expired QR too.
      if(stage==="idle"){
        const qrBox=$("ezeroOneQrBox"),qr=$("ezeroOneQr"),copy=$("ezeroOneCopyInvite");
        if(qrBox)qrBox.hidden=true;
        qr?.replaceChildren();
        if(copy)copy.disabled=true;
      }
      updateScene();
    }
  });
  // A remote hangup closes the authenticated DataChannel. Release this
  // device's camera/microphone too, even if the UI has already collapsed
  // the video scene. Never auto-retry or capture media in this handler.
  document.addEventListener("ezero:channel-state",event=>{
    if(event.detail?.connected===false&&hadVerifiedCall){
      hadVerifiedCall=false;
      queueMicrotask(()=>{
        if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true)return;
        const stream=$("localVideo")?.srcObject;
        if(stream?.getTracks?.().some(t=>t.readyState==="live"))
          $("hangup")?.click(); // Original core releases tracks and resets peer.
        updateScene();
      });
    }
    updateScene();
  });
  $("remoteVideo")?.addEventListener("loadedmetadata",updateScene);
  $("remoteVideo")?.addEventListener("playing",updateScene);
  $("localVideo")?.addEventListener("playing",updateScene);
  document.querySelectorAll('input[name="mode"]').forEach(radio=>
    radio.addEventListener("change",updateScene));
  $("language")?.addEventListener("change",()=>{
    bellButton.textContent=t(ringActive?"silent":"bell");
    updateScene();
  });
  document.addEventListener("visibilitychange",()=>{
    if(document.hidden)stopRing();
  });
  window.addEventListener("pagehide",()=>{
    stopRing();
    const context=ringContext;ringContext=null;
    try{context?.close().catch(()=>{});}catch(_){}
  });
  // Deferred script executes after the main incoming card has been initialized.
  if(!invite.hidden&&!shell.hidden)showIncoming();
  updateScene();
})();
