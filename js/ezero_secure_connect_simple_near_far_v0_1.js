/* E-ZERO Secure Connect: honest low-friction near QR / distant copy-paste UX.
 * This enhances the existing peer-to-peer lab, not a signaling backend.
 * QR is for signed ephemeral identity verification ONLY, never an automatic call.
 * No remote requests, no persistent data, no automatic camera/microphone.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const q = sel => document.querySelector(sel);
  const ui = {
    ur: {
      friendCopied:"شناختی کوڈ کاپی ہوا۔ صرف قابلِ اعتماد دوست کو میسج کریں۔",
      shareUnsupported:"شیئرنگ دستیاب نہیں؛ کاپی کرکے میسج میں بھیج دیں۔",
      clipboardBlocked:"فون نے کلپ بورڈ کی اجازت نہیں دی؛ میسج کے کوڈ کو لمبا دبا کر پیسٹ کریں۔",
      pasted:"موصولہ شناختی کوڈ پیسٹ ہوگیا؛ تصدیق دبائیں۔",
      pastedEmpty:"کلپ بورڈ خالی ہے؛ دوست کا میسج کاپی کریں۔",
      invitationNeeded:"دوست کا مکمل دعوت یا جواب میسج یہاں پیسٹ کریں۔",
      invitationInvalid:"میسج درست دعوت/جواب نہیں؛ پوری تحریر کاپی کرکے دوبارہ پیسٹ کریں۔",
      invited:"دعوت تیار ہے؛ شیئر کریں۔ دوسرے فون کا جواب بھی یہاں پیسٹ کرنا ہوگا۔",
      preparing:"کال کی درخواست تیار ہو رہی ہے؛ تیار ہونے پر شیئر بٹن فعال ہوگا۔",
      answered:"جواب تیار ہے؛ اسے پہلے فون پر میسج کریں۔",
      applying:"جواب کی تصدیق جاری ہے؛ کنکشن کا انتظار کریں۔",
      ready:"دعوت بناکر بھیجیں یا دوسرے فون سے آیا میسج پیسٹ کریں۔",
      fallback:"QR اسکین نہ چلے تو میرا شناختی کوڈ کاپی کریں اور دوست کو میسج کریں۔",
      noCode:"پہلے دعوت یا جواب تیار کریں۔",
      copiedSignal:"کال کا رابطہ میسج کاپی ہوگیا؛ صرف اپنے دوست کو بھیجیں۔",
      shareSignalFallback:"فون کی شیئرنگ دستیاب نہیں؛ رابطہ میسج کاپی کریں۔"
    },
    en: {
      friendCopied:"Signed identity copied. Send only to someone you trust.",
      shareUnsupported:"Share is unavailable. Copy the identity and send it in a message.",
      clipboardBlocked:"Clipboard permission unavailable. Long-press the field and paste your friend's message.",
      pasted:"Friend identity pasted. Tap Verify.",
      pastedEmpty:"Clipboard is empty. Copy your friend's identity message first.",
      invitationNeeded:"Paste the full invitation or answer from the other phone.",
      invitationInvalid:"This is not an offer or answer. Copy the complete message and paste again.",
      invited:"Invitation ready. Share it, then paste the answer from the other phone here.",
      preparing:"Preparing the call invitation; Share will enable when ready.",
      answered:"Answer ready. Share it back to the first phone.",
      applying:"Verifying the answer; connecting the phones…",
      ready:"Create and share an invitation or paste the message from the other phone.",
      fallback:"If QR scanning is unavailable, copy your signed identity and send it in a message.",
      noCode:"Create an invitation or answer first.",
      copiedSignal:"Call connection message copied. Send only to your friend.",
      shareSignalFallback:"Native sharing unavailable. Copy and send the call message manually."
    },
    ar: {
      friendCopied:"تم نسخ رمز الهوية الموقّع. أرسله إلى شخص موثوق فقط.",
      shareUnsupported:"المشاركة غير متاحة؛ انسخ الهوية وأرسلها في رسالة.",
      clipboardBlocked:"إذن الحافظة غير متاح؛ اضغط مطولاً على الحقل والصق رسالة الصديق.",
      pasted:"تم لصق هوية الصديق. اضغط للتحقق.",
      pastedEmpty:"الحافظة فارغة. انسخ رسالة هوية صديقك أولاً.",
      invitationNeeded:"ألصق الدعوة أو الرد كاملاً من الهاتف الآخر.",
      invitationInvalid:"هذا ليس عرض اتصال أو رداً صحيحاً. انسخ الرسالة كاملة وحاول مجدداً.",
      invited:"الدعوة جاهزة. أرسلها ثم الصق رد الهاتف الآخر هنا.",
      preparing:"جارٍ إعداد دعوة الاتصال؛ سيتفعّل زر المشاركة عندما تصبح جاهزة.",
      answered:"الرد جاهز. أرسله إلى الهاتف الأول.",
      applying:"يجري التحقق من الرد وتوصيل الهاتفين…",
      ready:"أنشئ دعوة وأرسلها، أو الصق رسالة الهاتف الآخر.",
      fallback:"إذا تعذر مسح QR، انسخ هويتك الموقّعة وأرسلها في رسالة.",
      noCode:"أنشئ دعوة أو رداً أولاً.",
      copiedSignal:"تم نسخ رسالة الاتصال؛ أرسلها إلى الصديق فقط.",
      shareSignalFallback:"المشاركة غير متاحة؛ انسخ رسالة الاتصال وأرسلها يدوياً."
    }
  };
  const say = key => (ui[document.documentElement.lang] || ui.ur)[key] || ui.ur[key] || key;
  const identityMessage = () => $("myDigitalId").value;
  const identityStatus = msg => { $("identityPeerStatus").textContent=msg; };
  let selected = "nearby";

  function choose(which) {
    selected = which === "remote" ? "remote" : "nearby";
    $("nearbyPanel").hidden = selected !== "nearby";
    $("remotePanel").hidden = selected !== "remote";
    for(const [id,mode] of [["chooseNearby","nearby"],["chooseRemote","remote"]]){
      $(id).setAttribute("aria-pressed",String(mode===selected));
      $(id).classList.toggle("selected",mode===selected);
    }
    // Do not leave the rear camera operating while switching modes.
    if(selected==="remote" && !$("stopScan").disabled) $("stopScan").click();
  }
  $("chooseNearby").addEventListener("click",()=>choose("nearby"));
  $("chooseRemote").addEventListener("click",()=>choose("remote"));
  choose("nearby");

  $("nearCopyIdentity").addEventListener("click",()=>{
    choose("remote");
    $("copyIdentity").click();
    identityStatus(say("fallback"));
  });

  $("shareIdentity").addEventListener("click",async()=>{
    const code=identityMessage();
    if(!code){identityStatus(say("noCode"));return;}
    if(typeof navigator.share === "function"){
      try{await navigator.share({title:"E-ZERO signed temporary identity",text:code});return;}
      catch(e){if(e?.name==="AbortError")return;}
    }
    $("copyIdentity").click();
    identityStatus(say("shareUnsupported"));
  });

  $("pasteFriend").addEventListener("click",async()=>{
    if(!navigator.clipboard?.readText){identityStatus(say("clipboardBlocked"));return;}
    try{
      const raw=await navigator.clipboard.readText();
      const cleaned=raw?.trim() || "";
      if(!cleaned){identityStatus(say("pastedEmpty"));return;}
      $("friendIdInput").value=cleaned.slice(0,4000);
      identityStatus(say("pasted"));
    }catch(_){identityStatus(say("clipboardBlocked"));}
  });

  function guideStatus(message){ $("guidedStatus").textContent=message; }
  // Reflect only the verified browser connection state, never assume QR pairing
  // implies a connected call. No new network traffic, records, or background polling.
  document.addEventListener("ezero:call-status",event=>{
    const stage=event.detail?.stage;
    if(!["offerReady","answerReady","iceChecking","iceNoRoute","connected",
          "offline","signalInvalid","micDenied","missingOffer","fingerprintMismatch"].includes(stage))return;
    const actualStatus=$("connectionStatus")?.textContent || "";
    if(actualStatus) $("callDiagnostic").textContent=actualStatus;
    if(stage==="connected") guideStatus(actualStatus);
    if(stage==="iceNoRoute" || stage==="signalInvalid" || stage==="micDenied" ||
       stage==="missingOffer" || stage==="fingerprintMismatch") guideStatus(actualStatus);
  });

  // Preserve existing signed-offer/answer verification in the core script.
  $("guidedOffer").addEventListener("click",()=>{
    $("createOffer").click();
    guideStatus(say("preparing"));
  });
  $("guidedContinue").addEventListener("click",()=>{
    const code=$("guidedIncoming").value.trim();
    if(!code){guideStatus(say("invitationNeeded"));return;}
    let signal;
    try{signal=JSON.parse(code);}catch(_){guideStatus(say("invitationInvalid"));return;}
    if(signal?.v!==1 || !["offer","answer"].includes(signal.type) ||
       typeof signal.sdp!=="string" || code.length>145000) {
      guideStatus(say("invitationInvalid")); return;
    }
    $("remoteSignal").value=code;
    if(signal.type==="offer") {
      $("acceptOffer").click();
      guideStatus(say("preparing"));
    } else {
      $("applyAnswer").click();
      guideStatus(say("applying"));
    }
  });
  document.addEventListener("ezero:signal-ready",event=>{
    const offer=event.detail?.type==="offer";
    $("guidedShare").disabled=false;$("guidedCopy").disabled=false;
    guideStatus(say(offer?"invited":"answered"));
  });
  $("guidedShare").addEventListener("click",()=>{
    if(!$("localSignal").value){guideStatus(say("noCode"));return;}
    // Real user gesture propagates to browser-native share dialog.
    $("shareSignal").click();
  });
  $("guidedCopy").addEventListener("click",()=>{
    if(!$("localSignal").value){guideStatus(say("noCode"));return;}
    $("copySignal").click();
  });
  document.addEventListener("ezero:copy-result",event=>{
    if(event.detail?.success) guideStatus(say("copiedSignal"));
    else guideStatus(say("shareSignalFallback"));
  });
  $("language").addEventListener("change",()=>{ if(!$("localSignal").value)guideStatus(say("ready")); });
  window.addEventListener("pagehide",()=>{ // Core code independently closes media and drops session keys.
    $("guidedIncoming").value="";
    $("friendIdInput").value="";
  });
})();