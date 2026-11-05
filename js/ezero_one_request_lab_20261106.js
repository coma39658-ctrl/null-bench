/* E-ZERO one-request test: one caller sends QR/link; receiver accepts once.
 * Server autonomously relays signed WebRTC answer; no second share/paste step.
 * This script never creates a call on page load, never automatically captures
 * camera/microphone, and never claims a connected friend without RTC evidence.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const choices=Array.from(document.querySelectorAll("[data-modern-select]"));
  const status=$("ezeroOneScanStatus");
  const qrBox=$("ezeroOneQrBox"), qrTarget=$("ezeroOneQr");
  const copyBtn=$("ezeroOneCopyInvite");
  const scanner=$("ezeroOneScannerVideo");
  const stopBtn=$("ezeroOneStopScan");
  let link="",stream=null,scanTimer=null,scanSerial=0,callIntent=null;
  const words={
    ur:{ready:"✓ مختصر دعوت تیار ہے۔ دوست QR اسکین کرے یا لنک کھولے؛ جواب خود واپس آئے گا۔",
      copied:"✓ صرف عارضی دعوتی لنک کاپی ہوا۔ اسے قابلِ اعتماد دوست کو بھیجیں۔",
      copyFail:"لنک کاپی نہیں ہوا؛ «دعوت شیئر کریں» دبائیں۔",
      invalid:"یہ E-ZERO کال دعوت کا صحیح QR نہیں۔",identityOnly:"یہ شناختی QR ہے، کال کی دعوت نہیں۔ پہلے فون پر 📞 یا 📹 دبائیں اور اس کا «دوست یہ QR اسکین کرے» والا QR دکھائیں۔",unsupported:"اس براؤزر میں QR اسکیننگ دستیاب نہیں۔ دوست کو لنک بھیجیں۔",
      scanning:"📷 کیمرہ فعال ہے؛ دوست کی E-ZERO کال QR سامنے رکھیں۔",stopped:"کیمرہ بند ہے۔",
      failure:"QR اسکین ناکام؛ لنک کھولنے کا طریقہ استعمال کریں۔",timeout:"20 سیکنڈ میں QR نہیں ملا؛ کیمرہ بند ہے۔",
      starting:"کال شروع کرنے کی درخواست۔ مائیک/کیمرے کی اجازت آپ سے مانگی جائے گی۔"},
    en:{ready:"✓ One short invite ready. Your friend scans QR or opens link; the answer returns automatically.",
      copied:"✓ Invitation link copied. Share only with someone you trust.",
      copyFail:"Cannot copy link; tap Share Invitation.",invalid:"This is not a valid E-ZERO call invitation QR.",identityOnly:"This QR verifies identity only. On the first phone tap Audio or Video, then scan the call invitation QR.",
      unsupported:"QR scan unavailable in this browser. Share the link instead.",scanning:"📷 Camera ready; scan friend's call QR.",
      stopped:"Camera off.",failure:"QR failed. Open the invitation link instead.",timeout:"No QR in 20 seconds; camera stopped.",
      starting:"Calling: camera/microphone permission will be requested."},
    ar:{ready:"✓ الدعوة المختصرة جاهزة؛ يفتحها الصديق ويعود الرد تلقائياً.",
      copied:"✓ نُسخ الرابط المؤقت. شاركه مع شخص موثوق فقط.",copyFail:"تعذر النسخ؛ اضغط مشاركة الدعوة.",
      invalid:"هذا ليس رمز QR صالحاً لدعوة مكالمة E-ZERO.",identityOnly:"هذا رمز هوية فقط. اضغط مكالمة صوتية أو فيديو في الهاتف الأول وامسح رمز دعوة الاتصال.",unsupported:"مسح QR غير متاح؛ شارك الرابط بدلاً منه.",
      scanning:"📷 الكاميرا تعمل. امسح رمز دعوة صديقك.",stopped:"تم إيقاف الكاميرا.",
      failure:"فشل المسح؛ افتح الرابط مباشرة.",timeout:"لم يُعثر على QR خلال 20 ثانية.",
      starting:"بدء المكالمة؛ سيطلب المتصفح إذن الميكروفون أو الكاميرا."}
  };
  const t=k=>(words[document.documentElement.lang]||words.ur)[k];
  function info(k,error=false){
    if(status){status.textContent=t(k);status.dataset.kind=error?"error":"info";}
  }
  function stopScan(){
    ++scanSerial;
    if(scanTimer!==null){clearTimeout(scanTimer);scanTimer=null;}
    if(stream){stream.getTracks().forEach(track=>track.stop());stream=null;}
    if(scanner){scanner.pause();scanner.srcObject=null;scanner.hidden=true;}
    if(stopBtn)stopBtn.hidden=true;
    const start=$("ezeroOneScanInvite");if(start)start.disabled=false;
  }
  function safeInvite(value){
    let url;
    try{url=new URL(value);}catch(_){return false;}
    const validOrigin=url.origin===location.origin;
    const validPage=url.pathname.endsWith("/ezero_secure_connect_one_request_lab_20261106.html") ||
      url.pathname.endsWith("/c.html");
    return validOrigin&&validPage&&/^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(url.hash);
  }
  // A call button initiates a real connection attempt, not a sticky choice.
  // Legacy JS changes its presentation first; we clear the selected state
  // unless a genuine authenticated WebRTC channel becomes connected.
  function resetSelection(){
    for(const button of choices)button.setAttribute("aria-pressed","false");
  }
  resetSelection();
  for(const button of choices){
    if(!["audio","video"].includes(button.dataset.modernSelect))continue;
    button.addEventListener("click",()=>{
      callIntent=button.dataset.modernSelect;
      resetSelection();
      const auto=$("ezeroAutoPilot");
      if(auto?.hidden===false && $("ezeroAutoIncoming").hidden &&
         $("ezeroAutoStart") && !$("ezeroAutoStart").disabled){
        info("starting");
        $("ezeroAutoStart").click();
        auto.scrollIntoView({block:"start",behavior:"smooth"});
      }
    });
  }
  function updateConnected(){
    const connected=window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
    resetSelection();
    if(connected && callIntent){
      const button=choices.find(x=>x.dataset.modernSelect===callIntent);
      button?.setAttribute("aria-pressed","true");
    }
  }
  document.addEventListener("ezero:channel-state",updateConnected);
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="idle"||["iceNoRoute","signalInvalid","micDenied","failed"].includes(e.detail?.stage)){
      if(e.detail.stage==="idle")callIntent=null;
      resetSelection();
    }else if(e.detail?.stage==="connected")updateConnected();
  });
  document.addEventListener("ezero:auto-invite-ready",e=>{
    const candidate=e.detail?.link;
    if(typeof candidate!=="string"||!safeInvite(candidate))return;
    link=candidate;qrBox.hidden=false;copyBtn.disabled=false;
    qrTarget.replaceChildren();
    if(typeof window.qrcode==="function"){
      try{
        const qr=window.qrcode(0,"L");qr.addData(link);qr.make();
        qrTarget.innerHTML=qr.createSvgTag(4,4);
        qrTarget.querySelector("svg")?.setAttribute("aria-label","E-ZERO single-request call invite");
      }catch(_){qrBox.hidden=true;}
    }else qrBox.hidden=true;
    info("ready");
  });
  copyBtn?.addEventListener("click",async()=>{
    if(!link)return;
    try{await navigator.clipboard.writeText(link);info("copied");}
    catch(_){info("copyFail",true);}
  });
  function hasIncoming(){
    const incoming=$("ezeroAutoIncoming");
    return incoming&&!incoming.hidden;
  }
  const incomingShell=$("ezeroOneIncomingShell"),progress=$("ezeroOneCallProgress");
  const messages={
    ur:{connecting:"درخواست قبول کر لی گئی؛ دونوں فونوں کا محفوظ رابطہ قائم کیا جا رہا ہے…",
        connected:"✓ دونوں فونوں کا حقیقی WebRTC کنکشن قائم ہوگیا۔",
        failed:"رابطہ مکمل نہیں ہوا۔ دونوں فونوں کی انٹرنیٹ اور STUN/TURN حالت چیک کریں۔",
        rejected:"درخواست مسترد ہو گئی۔ کال شروع نہیں ہوئی۔"},
    en:{connecting:"Request accepted; establishing the secure connection on both phones…",
        connected:"✓ Both phones are connected over WebRTC.",
        failed:"Connection not established. Check the two phones and STUN/TURN.",
        rejected:"Request declined. No call started."},
    ar:{connecting:"تم قبول الطلب؛ جارٍ توصيل الهاتفين بأمان…",
        connected:"✓ تم اتصال WebRTC الحقيقي بين الهاتفين.",
        failed:"تعذر الاتصال. تحقق من الإنترنت وخوادم STUN/TURN.",
        rejected:"رُفض الطلب؛ لم تبدأ مكالمة."}
  };
  const msg=k=>(messages[document.documentElement.lang]||messages.ur)[k];
  function showProgress(key){
    if(!progress)return;
    progress.hidden=false;
    progress.textContent=msg(key);
    progress.dataset.state=key;
  }
  function jumpIncoming(){
    if(!hasIncoming())return;
    incomingShell.hidden=false;
    const type=new URLSearchParams(location.search).get("mode")==="video"?"video":"audio";
    $("ezeroOneIncomingHeading").textContent=type==="video"?
      "📹 آنے والی ویڈیو کال — قبول کریں؟":"📞 آنے والی آڈیو کال — قبول کریں؟";
    $("ezeroOneJoinPanel")?.scrollIntoView({block:"start",behavior:"auto"});
  }
  document.addEventListener("ezero:auto-incoming-open",jumpIncoming);
  jumpIncoming();
  // Keep both Android phones on the unified green page after a language
  // switch; only the Back control returns to E-ZERO's parent website.
  function unifyNavigation(){
    const back=$("modernBack"),qr=$("modernQrLink");
    if(back){back.href="./index.html";back.textContent="↩ E-ZERO مرکزی ویب سائٹ";}
    if(qr)qr.href="./ezero_secure_connect_one_request_lab_20261106.html";
  }
  unifyNavigation();
  $("language")?.addEventListener("change",unifyNavigation);
  // Accept/reject is a single user action. The answer travels on WebSocket,
  // never through an extra copied invite or a second acceptance tap.
  $("ezeroAutoAccept")?.addEventListener("click",()=>{
    incomingShell.hidden=true;
    showProgress("connecting");
    $("ezeroOneJoinPanel")?.scrollIntoView({block:"start",behavior:"auto"});
  });
  $("ezeroAutoDecline")?.addEventListener("click",()=>{
    incomingShell.hidden=true;
    showProgress("rejected");
  });
  function showPeerResult(){
    if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true)
      showProgress("connected");
  }
  document.addEventListener("ezero:channel-state",showPeerResult);
  document.addEventListener("ezero:call-status",e=>{
    const stage=e.detail?.stage;
    if(stage==="connected")showPeerResult();
    else if(["iceNoRoute","signalInvalid","micDenied","fingerprintMismatch","failed"].includes(stage))
      showProgress("failed");
  });
  async function scan(){
    const start=$("ezeroOneScanInvite");
    if(!window.BarcodeDetector||!navigator.mediaDevices?.getUserMedia){
      info("unsupported",true);return;
    }
    stopScan();
    const serial=scanSerial;
    start.disabled=true;
    try{
      const detector=new BarcodeDetector({formats:["qr_code"]});
      const media=await navigator.mediaDevices.getUserMedia({
        video:{facingMode:{ideal:"environment"}},audio:false
      });
      if(serial!==scanSerial||document.hidden){media.getTracks().forEach(x=>x.stop());return;}
      stream=media;scanner.srcObject=media;scanner.hidden=false;
      await scanner.play();
      stopBtn.hidden=false;info("scanning");
      let loops=0;
      const expires=Date.now()+20000;
      async function frame(){
        if(serial!==scanSerial||!stream)return;
        if(Date.now()>expires){stopScan();info("timeout",true);return;}
        try{
          const found=await detector.detect(scanner);
          if(serial!==scanSerial||!stream)return;
          const raw=found?.[0]?.rawValue;
          if(raw){
            if(safeInvite(raw)){
              stopScan();
              location.assign(raw); // Shows accept/reject, never auto-accepts.
            }else{stopScan();info(raw.startsWith("EZERO1.")?"identityOnly":"invalid",true);}
            return;
          }
          loops=0;
        }catch(_){
          if(++loops>=5){stopScan();info("failure",true);return;}
        }
        scanTimer=setTimeout(frame,320);
      }
      scanTimer=setTimeout(frame,300);
    }catch(_){if(serial===scanSerial){stopScan();info("failure",true);}}
  }
  $("ezeroOneScanInvite")?.addEventListener("click",scan);
  stopBtn?.addEventListener("click",()=>{stopScan();info("stopped");});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stopScan();});
  window.addEventListener("pagehide",stopScan);
  $("modernHangup")?.addEventListener("click",()=>{
    resetSelection();callIntent=null;link="";copyBtn.disabled=true;
    qrBox.hidden=true;qrTarget.replaceChildren();
  });
})();