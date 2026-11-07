/* E-ZERO front-of-page call QR hub — staging only.
 * One real call QR, one scanner, one approved share flow. The existing signed
 * WebRTC and profile consent gates remain authoritative. No static identity QR
 * is ever mislabeled as a call invitation.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const unified = $("ezeroUnifiedCard"), heading = unified?.querySelector(".ezero-unified-heading");
  const qrBox = $("ezeroOneQrBox"), scannerButton = $("ezeroOneScanInvite");
  const scannerVideo = $("ezeroOneScannerVideo"), scannerStop = $("ezeroOneStopScan");
  const scannerStatus = $("ezeroOneScanStatus"), share = $("ezeroAutoShare");
  const copy = $("ezeroOneCopyInvite"), incoming = $("ezeroOneIncomingShell");
  const progress = $("ezeroOneCallProgress"), join = $("ezeroOneJoinPanel");
  if(!unified || !heading || !qrBox || !scannerButton || !scannerVideo ||
     !scannerStop || !scannerStatus || !share || !copy || !incoming || !progress || !join)return;

  const hub = document.createElement("section");
  hub.id = "ezeroFrontQrHub";
  hub.className = "ezero-front-qr-hub";
  hub.setAttribute("aria-labelledby","ezeroFrontQrHeading");
  hub.innerHTML = `
    <div class="ezero-front-qr-head">
      <strong id="ezeroFrontQrHeading">▦ میرا QR اور دوست کا QR</strong>
      <small id="ezeroFrontQrVersion" aria-label="Staging version">E-ZERO TEST</small>
    </div>
    <div class="ezero-front-qr-pair">
      <button type="button" id="ezeroFrontAudioQr" class="ezero-front-qr-square" aria-controls="ezeroOneQrBox" aria-expanded="false">
        <span class="ezero-front-qr-symbol" aria-hidden="true">▦</span>
        <strong id="ezeroFrontAudioQrText">میرا کال QR</strong>
        <small id="ezeroFrontAudioQrNote">آڈیو دعوت بنائیں</small>
      </button>
      <div id="ezeroFrontScannerSlot" class="ezero-front-scanner-slot"></div>
    </div>
    <div id="ezeroFrontQrRenderSlot"></div>
    <div id="ezeroFrontQrScanMedia" class="ezero-front-qr-scanner-media"></div>
    <div id="ezeroFrontQrIncomingSlot"></div>
    <div id="ezeroFrontQrShareSlot" class="ezero-front-qr-share"></div>
    <div id="ezeroFrontVideoSlot">
      <button type="button" id="ezeroFrontVideoQr" class="ezero-front-video-qr" aria-controls="ezeroOneQrBox" aria-expanded="false">
        📹 ویڈیو کال کا QR بنائیں
      </button>
    </div>
    <p id="ezeroFrontQrStatus" role="status" aria-live="polite"></p>
    <p id="ezeroFrontQrHelp" class="ezero-front-qr-help">
      میرا QR دبائیں تو عارضی کوڈ فوراً اسی کے نیچے آئے گا۔ اسکین دبائیں تو کیمرہ وہیں کھلے گا۔ پہلی کال میں دوسرے فون کی منظوری ضروری ہے۔
    </p>
  `;
  heading.insertAdjacentElement("afterend",hub);
  // Reuse, don't copy, the existing authoritative QR/link, scanner controls,
  // and Accept/Decline. Moving nodes retains their existing event listeners.
  $("ezeroFrontScannerSlot").append(scannerButton);
  $("ezeroFrontQrRenderSlot").append(qrBox);
  $("ezeroFrontQrShareSlot").append(share,copy);
  $("ezeroFrontQrScanMedia").append(scannerVideo,scannerStop,scannerStatus);
  $("ezeroFrontQrIncomingSlot").append(incoming,progress);
  // Keep old compatibility panel mounted (its JS relies on its ID), but do not
  // expose a second misleading QR/scanner or a second colored layer.
  join.hidden = true;
  const own = $("ezeroFrontAudioQr"),video = $("ezeroFrontVideoQr");
  const imageShare = document.createElement("button");
  imageShare.id = "ezeroFrontShareQrImage";
  imageShare.type = "button";
  imageShare.disabled = true;
  imageShare.className = "ezero-front-share-qr-image";
  $("ezeroFrontQrShareSlot").prepend(imageShare);
  const message=$("ezeroFrontQrStatus");
  let fromQrButton=false,qrWhere="own";
  const videoSlot=$("ezeroFrontVideoSlot"),qrRenderSlot=$("ezeroFrontQrRenderSlot"),shareSlot=$("ezeroFrontQrShareSlot");
  const featureGrid=unified.querySelector(".modern-feature-grid");
  const scannerSlot=$("ezeroFrontScannerSlot");
  scannerSlot.append($("ezeroFrontQrScanMedia"),$("ezeroFrontQrIncomingSlot"));
  const callResult=document.createElement("div");
  callResult.id="ezeroInlineCallResult";
  callResult.className="ezero-inline-feature-result";
  callResult.hidden=true;
  callResult.setAttribute("role","status");
  callResult.setAttribute("aria-live","polite");
  const callText=document.createElement("p");
  callText.id="ezeroInlineCallText";
  callResult.append(callText);
  featureGrid?.querySelector('[data-modern-select="video"]')?.insertAdjacentElement("afterend",callResult);
  const voiceButton=featureGrid?.querySelector('[data-modern-select="voice"]');
  const chatButton=featureGrid?.querySelector('[data-modern-select="chat"]');
  const voicePanel=$("modernVoicePanel"),chatPanel=$("modernChatPanel");
  // Each companion feature opens DIRECTLY after the button pressed.
  if(voicePanel&&voiceButton)voiceButton.insertAdjacentElement("afterend",voicePanel);
  if(chatPanel&&chatButton)chatButton.insertAdjacentElement("afterend",chatPanel);
  // Profile editor belongs next to 'Complete name/photo', not inside the
  // far-away optional-details section. Existing save/consent logic is reused.
  const profileGate=$("ezeroProfileFirstGate"),editor=$("ezeroProfileEditor");
  if(profileGate&&editor)profileGate.append(editor);
  function placeQr(where){
    qrWhere=where;
    // One authoritative signed QR, never duplicate a stale QR image.
    if(where==="video"){
      videoSlot.append(qrBox,shareSlot);
    }else if(where==="call"){
      callResult.append(qrBox,shareSlot);
    }else{
      // A personal QR and its share/copy actions belong to the MY QR tile,
      // never below the other phone's scanning camera.
      qrRenderSlot.append(qrBox,shareSlot);
    }
  }
  function callNote(key){
    const phrase={
      ur:{calling:"دوست سے محفوظ کال ملائی جا رہی ہے؛ دوسرے فون کی منظوری ضروری ہے۔",first:"پہلی کال کے لیے اسی جگہ QR دعوت دکھائی جائے گی؛ دوست اسکین یا لنک قبول کرے۔",connected:"✓ دونوں فونوں کا محفوظ کنکشن قائم ہے۔",failed:"کال نہیں ملی؛ نیٹ ورک یا اجازت کا مسئلہ چیک کریں۔",ended:"کال ختم ہو گئی۔"},
      en:{calling:"Calling friend securely; their approval is required.",first:"First call: the signed QR invitation appears here. Your friend must accept.",connected:"✓ Two phones connected securely.",failed:"Call failed. Check network and permissions.",ended:"Call ended."},
      ar:{calling:"جارٍ الاتصال الآمن؛ يلزم قبول الصديق.",first:"للمكالمة الأولى يظهر QR هنا ويجب قبول الدعوة.",connected:"✓ اتصل الهاتفان بأمان.",failed:"تعذر الاتصال؛ تحقق من الشبكة والأذونات.",ended:"انتهت المكالمة."}
    };
    callResult.hidden=false;
    callText.textContent=(phrase[document.documentElement.lang]||phrase.ur)[key];
  }
  const label = k => (translations[document.documentElement.lang]||translations.ur)[k];
  function setStatus(key){message.textContent=label(key);message.dataset.state=key;}
  const translations={
    ur:{
      head:"▦ میرا QR اور دوست کا QR",
      own:"میرا کال QR",audio:"آڈیو دعوت بنائیں",
      scan:"▦ دوست کا QR اسکین کریں",video:"📹 ویڈیو کال کا QR بنائیں",
      help:"دونوں فونوں میں یہی صفحہ کھولیں۔ میرا QR دبائیں؛ نیا عارضی کال QR سامنے آئے گا۔ دوسرے فون سے اسکین کرکے درخواست قبول کریں۔",
      shareImage:"↗ QR تصویر شیئر کریں",shareLink:"↗ دعوتی لنک شیئر کریں",
      copyLink:"📋 لنک کاپی کریں",ready:"✓ نیا کال QR تیار ہے۔ دوست کو دکھائیں یا شیئر کریں۔",
      waiting:"QR بن رہا ہے؛ صرف آپ کی منظوری پر کال شروع ہوگی۔",
      needProfile:"پہلے نام، DP اور اجازت محفوظ کریں؛ پھر نیا کال QR بنے گا۔",
      endFirst:"پہلی کال ختم کریں، پھر نیا QR بنائیں۔",
      notReady:"ابھی QR تیار نہیں۔ پہلے میرا کال QR دبائیں۔",
      fallback:"اس فون پر QR تصویر شیئر نہیں ہوئی؛ دعوتی لنک شیئر کرنے کا اختیار کھول دیا ہے۔",
      shareFailed:"QR شیئر نہیں ہوا؛ دعوتی لنک کاپی کریں۔",
      cancelled:"شیئرنگ منسوخ ہو گئی۔"
    },
    en:{
      head:"▦ My QR / Scan QR",own:"My call QR",audio:"Create audio invite",
      scan:"▦ Scan friend's QR",video:"📹 Create video call QR",
      help:"Open the same page on both phones. Tap My QR to create a fresh, temporary call invitation. The other phone scans and accepts.",
      shareImage:"↗ Share QR image",shareLink:"↗ Share invite link",copyLink:"📋 Copy link",
      ready:"✓ Fresh call QR ready. Show or share it.",
      waiting:"Creating QR. Calls require explicit acceptance.",
      needProfile:"Save your name, photo and consent first, then create QR.",
      endFirst:"End the current call before creating a fresh QR.",
      notReady:"No call QR yet. Tap My call QR first.",
      fallback:"Sharing an image is unavailable; share the invite link instead.",
      shareFailed:"QR not shared. Try copying the invite link.",
      cancelled:"Sharing cancelled."
    },
    ar:{
      head:"▦ رمزي QR / مسح QR",own:"رمز مكالمتي QR",audio:"إنشاء دعوة صوتية",
      scan:"▦ مسح رمز صديقي",video:"📹 إنشاء رمز مكالمة فيديو",
      help:"افتح الصفحة نفسها على الهاتفين. اضغط رمزي لإنشاء دعوة مؤقتة، ثم يمسحها الطرف الآخر ويوافق.",
      shareImage:"↗ مشاركة صورة QR",shareLink:"↗ مشاركة رابط الدعوة",copyLink:"📋 نسخ الرابط",
      ready:"✓ رمز المكالمة الجديد جاهز للمشاركة.",waiting:"جارٍ إنشاء الرمز. الاتصال يحتاج موافقة واضحة.",
      needProfile:"احفظ الاسم والصورة والموافقة أولًا.",endFirst:"أنهِ المكالمة الأولى قبل إنشاء رمز جديد.",
      notReady:"لا يوجد رمز مكالمة بعد. اضغط رمزي أولًا.",
      fallback:"تعذرت مشاركة الصورة؛ شارك رابط الدعوة بدلًا منها.",
      shareFailed:"لم تتم المشاركة. انسخ رابط الدعوة.",
      cancelled:"أُلغيت المشاركة."
    }
  };
  const scannedLabel = () => {
    $("ezeroFrontQrHeading").textContent=label("head");
    $("ezeroFrontAudioQrText").textContent=label("own");
    $("ezeroFrontAudioQrNote").textContent=label("audio");
    scannerButton.textContent=label("scan");
    video.textContent=label("video");
    $("ezeroFrontQrHelp").textContent=label("help");
    imageShare.textContent=label("shareImage");
    share.textContent=label("shareLink");
    copy.textContent=label("copyLink");
    const stage=document.querySelector(".ezero-stage-banner")?.textContent||"";
    const sha=/SHA:\s*([a-f0-9]{12})/i.exec(stage)?.[1];
    $("ezeroFrontQrVersion").textContent=sha?"TEST · "+sha:"E-ZERO · TEST";
  };
  scannedLabel();
  $("language")?.addEventListener("change",scannedLabel);
  function start(kind) {
    if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true){
      setStatus("endFirst");return;
    }
    placeQr(kind==="video"?"video":"own");
    fromQrButton=true;
    if($("ezeroProfileFirstStatus")?.dataset.state!=="ready"){
      setStatus("needProfile");
    }else setStatus("waiting");
    // QR creates a *fresh* one-shot invitation even if a contact is saved.
    // The existing consent and cryptographic gates still decide if it starts.
    const fresh=$("ezeroFreshQr"+(kind==="video"?"Video":"Audio"));
    const original=unified.querySelector('[data-modern-select="'+kind+'"]');
    try{
      if(fresh)fresh.click();
      else original?.click();
    }finally{fromQrButton=false;}
  }
  own.addEventListener("click",()=>start("audio"));
  video.addEventListener("click",()=>start("video"));
  // Show the outcome of the top Audio / Video actions right under those
  // buttons; direct saved-friend calls remain direct, first-time calls need QR.
  featureGrid?.addEventListener("click",e=>{
    const button=e.target.closest('[data-modern-select="audio"],[data-modern-select="video"]');
    if(!button||fromQrButton)return;
    let hasFriends=false;
    try{hasFriends=Array.isArray(JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]"))&&
      JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]").length>0;}
    catch(_){hasFriends=false;}
    if(!hasFriends)placeQr("call");
    callNote(hasFriends?"calling":"first");
  },true);
  const onReady=()=>{
    if(qrBox.hidden)return;
    imageShare.disabled=!qrBox.querySelector("svg");
    setStatus("ready");
    own.setAttribute("aria-expanded",String(qrWhere==="own"));
    video.setAttribute("aria-expanded",String(qrWhere==="video"));
  };
  document.addEventListener("ezero:auto-call-starting",()=>{
    imageShare.disabled=true;message.textContent="";
  });
  // This listener runs after the original QR renderer; queue one microtask to
  // avoid a stale SVG and to preserve existing signed invite validation.
  document.addEventListener("ezero:auto-invite-ready",()=>{
    queueMicrotask(onReady);
  });
  document.addEventListener("ezero:channel-state",e=>{
    if(e.detail?.connected===false){ imageShare.disabled=true; }
  });
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="connected")callNote("connected");
    else if(["micDenied","iceNoRoute","signalInvalid","fingerprintMismatch","failed"].includes(e.detail?.stage))callNote("failed");
  });
  scannerButton.addEventListener("click",()=>{
    // The scanner expands its own tile, directly beneath its Scan control.
    scannerSlot.classList.add("ezero-scanner-active");
  });
  scannerStop.addEventListener("click",()=>scannerSlot.classList.remove("ezero-scanner-active"));
  const scannerObserver=new MutationObserver(()=>{
    if(scannerVideo.hidden)scannerSlot.classList.remove("ezero-scanner-active");
  });
  scannerObserver.observe(scannerVideo,{attributes:true,attributeFilter:["hidden"]});
  $("modernHangup")?.addEventListener("click",()=>{
    imageShare.disabled=true;message.textContent="";
    own.setAttribute("aria-expanded","false");
    video.setAttribute("aria-expanded","false");
    if(!callResult.hidden)callNote("ended");
  });
  imageShare.addEventListener("click",async()=>{
    if(qrBox.hidden||!qrBox.querySelector("svg")){
      setStatus("notReady");return;
    }
    const svg=qrBox.querySelector("svg");
    const rendered=new XMLSerializer().serializeToString(svg);
    try{
      const photo=new Image();
      const url="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(rendered);
      await new Promise((resolve,reject)=>{
        photo.onload=resolve;photo.onerror=()=>reject(Error("QR_IMAGE_FAILED"));
        photo.src=url;
      });
      const canvas=document.createElement("canvas");
      const size=480;canvas.width=size;canvas.height=size;
      const ctx=canvas.getContext("2d");
      if(!ctx)throw Error("QR_IMAGE_UNSUPPORTED");
      ctx.fillStyle="#ffffff";ctx.fillRect(0,0,size,size);
      ctx.drawImage(photo,0,0,size,size);
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
      if(!blob)throw Error("PNG_FAILED");
      const file=new File([blob],"ezero-call-invite-qr.png",{type:"image/png"});
      if(!navigator.share||!navigator.canShare?.({files:[file]}))throw Error("IMAGE_SHARE_UNAVAILABLE");
      await navigator.share({title:"E-ZERO Secure App",files:[file]});
    }catch(e){
      if(e?.name==="AbortError"){setStatus("cancelled");return;}
      setStatus("fallback");
      if(!share.disabled)share.click();
      else setStatus("shareFailed");
    }
  });
})();
