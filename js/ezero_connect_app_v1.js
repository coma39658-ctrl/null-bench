(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const translations = {
    ur: {
      welcome:"السلام علیکم 👋", sub:"آپ کے دوست، ایک ہی جگہ", quick:"فوری رابطہ", hint:"دوست منتخب کریں",
      audio:"آڈیو کال", video:"ویڈیو کال", callStatus:"ابھی کوئی تصدیق شدہ دوست منتخب نہیں۔",
      people:"آپ کے رابطے", add:"＋ دوست شامل کریں", search:"دوست تلاش کریں",
      friends:"دوست", chats:"چیٹس", calls:"کالز", empty:"ابھی کوئی دوست محفوظ نہیں",
      emptyText:"پہلی بار دوست سے جڑنے کے بعد، باہمی منظوری سے اسے یہاں محفوظ کیا جائے گا۔",
      privacy:"آپ کی پرائیویسی", privacyText:"کیمرہ اور مائیک صرف آپ کے واضح عمل کے بعد مانگے جائیں گے۔ کال صرف تصدیق شدہ محفوظ دوست کے ساتھ شروع ہو گی۔",
      footer:"نیا نظام — محفوظ تعمیراتی Preview، ابھی عوامی کال سروس نہیں۔",
      dialogTitle:"دوست شامل کریں", dialogText:"QR شناخت، محفوظ رابطہ اور دونوں طرف منظوری کا نیا نظام ابھی تعمیر کے مرحلے میں ہے۔ اس Preview میں QR یا رابطہ بھیجنے کا جھوٹا دعویٰ نہیں کیا جائے گا۔",
      close:"بند کریں", searchEmpty:"اس تلاش کے لیے کوئی محفوظ دوست موجود نہیں۔", identityTitle:"اس فون کی محفوظ شناخت", identityState:"ابھی نہیں بنی", identityExplain:"آپ کی منظوری کے بعد اس فون پر ایک نجی شناختی کلید بنے گی۔ نجی کلید اسی ڈیوائس میں رہے گی؛ صرف عوامی شناختی فنگرپرنٹ دکھایا جائے گا۔", identityConsent:"میں اس فون پر غیر قابلِ برآمد نجی کلید بنانے اور اسے مقامی طور پر محفوظ کرنے کی اجازت دیتا/دیتی ہوں۔", identityButton:"اپنی محفوظ شناخت بنائیں", identityStatus:"بغیر اجازت کوئی شناخت نہیں بنائی جائے گی۔", fingerprint:"عوامی شناختی فنگرپرنٹ", identitySaved:"اس فون کی شناخت محفوظ ہو گئی۔", identityExisting:"اس فون کی پہلے سے محفوظ شناخت مل گئی۔", identityNoConsent:"پہلے اجازت والے خانے پر نشان لگائیں۔", identityError:"شناخت محفوظ نہیں ہو سکی۔ محفوظ کنکشن یا براؤزر اسٹوریج چیک کریں۔", qrTitle:"محفوظ QR رابطہ", qrExplain:"پہلی بار دوست سے محفوظ رابطے کے لیے عارضی QR بنائیں یا دوست کا QR اسکین کریں۔ QR صرف 90 سیکنڈ کے لیے کارآمد ہوگا۔", createQr:"میرا QR بنائیں", scanQr:"دوست کا QR اسکین کریں", galleryQr:"گیلری سے QR تصویر منتخب کریں", stopScanner:"اسکین بند کریں", qrNeedIdentity:"QR بنانے یا اسکین کرنے سے پہلے اس فون کی محفوظ شناخت بنائیں۔", qrReady:"آپ کا QR تیار ہے؛ یہ 90 سیکنڈ بعد ختم ہو جائے گا۔", qrVerified:"QR کی دستخطی تصدیق کامیاب ہے۔ اگلے مرحلے میں دونوں طرف منظوری ہوگی۔", qrInvalid:"یہ QR درست یا قابلِ اعتماد نہیں، یا اس کی مدت ختم ہو چکی ہے۔", qrCameraError:"کیمرہ شروع نہیں ہو سکا۔ براؤزر کی اجازت چیک کریں۔", qrGalleryError:"اس تصویر میں قابلِ تصدیق E-ZERO QR نہیں ملا۔", qrExpired:"یہ QR ختم ہو گیا۔ نیا QR بنائیں۔", qrSeconds:"باقی وقت: {n} سیکنڈ"
    },
    en: {
      welcome:"Hello 👋", sub:"Your friends, all in one place", quick:"Quick contact", hint:"Choose a friend",
      audio:"Audio call", video:"Video call", callStatus:"No verified friend is selected yet.",
      people:"Your contacts", add:"＋ Add friend", search:"Search friends",
      friends:"Friends", chats:"Chats", calls:"Calls", empty:"No saved friends yet",
      emptyText:"After a first connection and mutual approval, a friend can be saved here.",
      privacy:"Your privacy", privacyText:"Camera and microphone access is requested only after your explicit action. Calls are available only with a verified saved friend.",
      footer:"New system — clean-build preview; public calling is not available yet.",
      dialogTitle:"Add a friend", dialogText:"The new QR identity, secure connection and mutual-approval flow is still being built. This preview will not pretend to scan a QR code or send an invite.",
      close:"Close", searchEmpty:"No saved friend matches this search.", identityTitle:"This device identity", identityState:"Not created", identityExplain:"After your consent, this device creates a private signing key. The private key stays on this device; only its public fingerprint is shown.", identityConsent:"I consent to creating a non-extractable private key and saving it locally on this device.", identityButton:"Create secure device identity", identityStatus:"No identity will be created without your consent.", fingerprint:"Public identity fingerprint", identitySaved:"This device identity has been saved.", identityExisting:"An existing identity for this device was found.", identityNoConsent:"Please tick the consent box first.", identityError:"Identity could not be saved. Check secure connection and browser storage.", qrTitle:"Secure QR connection", qrExplain:"Create a temporary QR for a first secure connection, or scan your friend’s QR. The QR expires after 90 seconds.", createQr:"Create my QR", scanQr:"Scan friend QR", galleryQr:"Choose QR image from gallery", stopScanner:"Stop scanning", qrNeedIdentity:"Create this device’s secure identity before making or scanning a QR.", qrReady:"Your QR is ready and expires in 90 seconds.", qrVerified:"QR signature verified. Both people must approve in the next step.", qrInvalid:"This QR is invalid, untrusted, already used, or expired.", qrCameraError:"Could not start the camera. Check browser permission.", qrGalleryError:"No verifiable E-ZERO QR was found in this image.", qrExpired:"This QR has expired. Create a new one.", qrSeconds:"Expires in {n} seconds"
    },
    ar: {
      welcome:"مرحباً 👋", sub:"أصدقاؤك في مكان واحد", quick:"اتصال سريع", hint:"اختر صديقاً",
      audio:"مكالمة صوتية", video:"مكالمة فيديو", callStatus:"لم يتم اختيار صديق موثّق بعد.",
      people:"جهات الاتصال", add:"＋ إضافة صديق", search:"ابحث عن صديق",
      friends:"الأصدقاء", chats:"المحادثات", calls:"المكالمات", empty:"لا يوجد أصدقاء محفوظون بعد",
      emptyText:"بعد الاتصال الأول والموافقة المتبادلة، يمكن حفظ الصديق هنا.",
      privacy:"خصوصيتك", privacyText:"لن نطلب إذن الكاميرا والميكروفون إلا بعد إجراء صريح منك. المكالمات متاحة فقط مع صديق محفوظ وموثّق.",
      footer:"النظام الجديد — معاينة بناء نظيف؛ خدمة الاتصال العامة غير متاحة بعد.",
      dialogTitle:"إضافة صديق", dialogText:"يجري بناء نظام هوية QR والاتصال الآمن والموافقة المتبادلة. لن تدّعي هذه المعاينة مسح رمز أو إرسال دعوة.",
      close:"إغلاق", searchEmpty:"لا يوجد صديق محفوظ يطابق هذا البحث.", identityTitle:"هوية هذا الجهاز", identityState:"لم تُنشأ بعد", identityExplain:"بعد موافقتك، ينشئ هذا الجهاز مفتاح توقيع خاصاً. يبقى المفتاح الخاص على هذا الجهاز، ويُعرض فقط البصمة العامة.", identityConsent:"أوافق على إنشاء مفتاح خاص غير قابل للتصدير وحفظه محلياً على هذا الجهاز.", identityButton:"إنشاء هوية آمنة للجهاز", identityStatus:"لن يتم إنشاء أي هوية دون موافقتك.", fingerprint:"بصمة الهوية العامة", identitySaved:"تم حفظ هوية هذا الجهاز.", identityExisting:"تم العثور على هوية محفوظة مسبقاً لهذا الجهاز.", identityNoConsent:"يرجى تحديد مربع الموافقة أولاً.", identityError:"تعذر حفظ الهوية. تحقق من الاتصال الآمن ومساحة تخزين المتصفح.", qrTitle:"اتصال QR آمن", qrExplain:"أنشئ رمز QR مؤقتاً للاتصال الأول الآمن أو امسح رمز صديقك. تنتهي صلاحية الرمز بعد 90 ثانية.", createQr:"إنشاء رمز QR الخاص بي", scanQr:"مسح رمز الصديق", galleryQr:"اختيار صورة QR من المعرض", stopScanner:"إيقاف المسح", qrNeedIdentity:"أنشئ هوية آمنة لهذا الجهاز قبل إنشاء رمز QR أو مسحه.", qrReady:"رمز QR جاهز وتنتهي صلاحيته بعد 90 ثانية.", qrVerified:"تم التحقق من توقيع QR. يجب أن يوافق الطرفان في الخطوة التالية.", qrInvalid:"رمز QR غير صالح أو غير موثوق أو مستخدم أو منتهي الصلاحية.", qrCameraError:"تعذر تشغيل الكاميرا. تحقق من إذن المتصفح.", qrGalleryError:"لم يتم العثور على رمز E-ZERO QR قابل للتحقق في هذه الصورة.", qrExpired:"انتهت صلاحية رمز QR. أنشئ رمزاً جديداً.", qrSeconds:"الوقت المتبقي: {n} ثانية"
    }
  };
  const LANGUAGE_KEY = "ezero_connect_language_v1";
  function loadLanguage() {
    try { const saved = localStorage.getItem(LANGUAGE_KEY); return ["ur","en","ar"].includes(saved) ? saved : "ur"; }
    catch (_) { return "ur"; }
  }
  let language = loadLanguage();
  let activeTab = "friends";
  const backdrop = $("dialogBackdrop");

  function renderLanguage() {
    const t = translations[language];
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" || language === "ur" ? "rtl" : "ltr";
    const map = {
      welcomeTitle:t.welcome,welcomeSub:t.sub,quickTitle:t.quick,quickHint:t.hint,
      audioLabel:t.audio,videoLabel:t.video,callStatus:t.callStatus,peopleTitle:t.people,
      addFriend:t.add,emptyAdd:t.add,searchFriends:null,tabFriends:t.friends,tabChats:t.chats,
      tabCalls:t.calls,emptyTitle:t.empty,emptyText:t.emptyText,privacyTitle:t.privacy,
      privacyText:t.privacyText,footerStatus:t.footer,identityTitle:t.identityTitle,identityExplain:t.identityExplain,identityConsentText:t.identityConsent,createIdentity:t.identityButton,identityState:t.identityState,fingerprintLabel:t.fingerprint,qrTitle:t.qrTitle,qrExplain:t.qrExplain,createMyQrLabel:t.createQr,scanFriendQrLabel:t.scanQr,chooseGalleryQr:t.galleryQr,stopQrScanner:t.stopScanner,dialogTitle:t.dialogTitle,
      dialogText:t.dialogText,closeDialog:t.close
    };
    for (const [id,value] of Object.entries(map)) if (value !== null && $(id)) $(id).textContent = value;
    $("searchFriends").placeholder = t.search;
    if ($("identityStatus") && !$("identityStatus").dataset.kind && $("identityFingerprintWrap").hidden) $("identityStatus").textContent = t.identityStatus;
    $("language").textContent = language === "ur" ? "اردو · EN · AR" : language === "en" ? "EN · AR · اردو" : "العربية · EN · اردو";
    document.dispatchEvent(new CustomEvent("ezero:language-changed", { detail: { language } }));
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.tab === activeTab));
    });
  }

  function openDialog() {
    backdrop.classList.add("open");
    $("closeDialog").focus();
  }
  function closeDialog() {
    backdrop.classList.remove("open");
    $("addFriend").focus();
  }
  function renderSearch() {
    const hasQuery = $("searchFriends").value.trim().length > 0;
    $("emptyTitle").textContent = hasQuery ? translations[language].searchEmpty : translations[language].empty;
  }

  $("language").addEventListener("click", () => {
    language = language === "ur" ? "en" : language === "en" ? "ar" : "ur";
    try { localStorage.setItem(LANGUAGE_KEY, language); } catch (_) {}
    renderLanguage();
    renderSearch();
  });
  $("addFriend").addEventListener("click", openDialog);
  $("emptyAdd").addEventListener("click", openDialog);
  $("closeDialog").addEventListener("click", closeDialog);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && backdrop.classList.contains("open")) closeDialog();
  });
  $("searchFriends").addEventListener("input", renderSearch);
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderLanguage();
      renderSearch();
    });
  });

  function showIdentity(info, existing) {
    $("identityState").textContent = translations[language].identitySaved;
    $("identityStatus").textContent = existing ? translations[language].identityExisting : translations[language].identitySaved;
    $("identityStatus").dataset.kind = "ok";
    $("identityFingerprint").textContent = info.fingerprint;
    $("identityFingerprintWrap").hidden = false;
    $("createIdentity").disabled = true;
    $("createMyQr").disabled = false;
    $("scanFriendQr").disabled = false;
    $("chooseGalleryQr").disabled = false;
    $("identityConsent").disabled = true;
  }

  async function initializeIdentity() {
    const api = window.EZERO_CONNECT_IDENTITY;
    if (!api) {
      $("identityStatus").textContent = translations[language].identityError;
      $("identityStatus").dataset.kind = "error";
      return;
    }
    try {
      const saved = await api.load();
      if (saved) showIdentity(saved, true);
    } catch (_) {
      $("identityStatus").textContent = translations[language].identityError;
      $("identityStatus").dataset.kind = "error";
    }
  }

  $("createIdentity").addEventListener("click", async () => {
    if (!$("identityConsent").checked) {
      $("identityStatus").textContent = translations[language].identityNoConsent;
      $("identityStatus").dataset.kind = "error";
      return;
    }
    $("createIdentity").disabled = true;
    $("identityStatus").textContent = "…";
    try {
      const result = await window.EZERO_CONNECT_IDENTITY.createAfterConsent(true);
      showIdentity(result, result.alreadyExisted);
    } catch (_) {
      $("identityStatus").textContent = translations[language].identityError;
      $("identityStatus").dataset.kind = "error";
      $("createIdentity").disabled = false;
    }
  });


  let activeInvite = null;
  let inviteTimer = null;
  let stopCameraScan = null;
  let nativeScanStream = null;
  let nativeScanFrame = 0;
  let nativeScanDetector = null;
  let scanResultAccepted = false;

  function setQrStatus(message, kind) {
    $("qrScanStatus").textContent = message;
    $("qrScanStatus").dataset.kind = kind || "";
  }

  function stopQrCamera() {
    if (nativeScanFrame) cancelAnimationFrame(nativeScanFrame);
    nativeScanFrame = 0;
    if (nativeScanStream) {
      for (const track of nativeScanStream.getTracks()) track.stop();
      nativeScanStream = null;
    }
    if (stopCameraScan) {
      try { stopCameraScan(); } catch (_) {}
      stopCameraScan = null;
    }
    const video = $("qrScannerVideo");
    video.pause?.();
    video.srcObject = null;
    video.hidden = true;
    $("stopQrScanner").hidden = true;
    scanResultAccepted = false;
  }

  async function startNativeQrScanner(video) {
    if (!("BarcodeDetector" in window) || !navigator.mediaDevices?.getUserMedia) return false;
    const supported = await window.BarcodeDetector.getSupportedFormats();
    if (!supported.includes("qr_code")) return false;
    nativeScanDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    nativeScanStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = nativeScanStream;
    video.hidden = false;
    await video.play();
    const scanFrame = async () => {
      if (!nativeScanStream || scanResultAccepted) return;
      try {
        const codes = await nativeScanDetector.detect(video);
        const value = codes.find(item => typeof item.rawValue === "string" && item.rawValue.startsWith("EZERO1."))?.rawValue;
        if (value) {
          scanResultAccepted = true;
          await acceptScannedCode(value);
          return;
        }
      } catch (_) {
        // Keep the camera active; transient frame decode errors are recoverable.
      }
      if (nativeScanStream && !scanResultAccepted) nativeScanFrame = requestAnimationFrame(scanFrame);
    };
    nativeScanFrame = requestAnimationFrame(scanFrame);
    return true;
  }

  function clearActiveQr() {
    if (inviteTimer) clearInterval(inviteTimer);
    inviteTimer = null;
    activeInvite = null;
    $("myQrDisplay").hidden = true;
    $("myQrImage").replaceChildren();
    $("qrCountdown").textContent = "";
  }

  async function acceptScannedCode(code) {
    stopQrCamera();
    try {
      const verified = await window.EZERO_CONNECT_INVITES.verifyInvite(code);
      setQrStatus(translations[language].qrVerified + " " + verified.inviterFingerprint, "ok");
      document.dispatchEvent(new CustomEvent("ezero:invite-verified", { detail: { verified, inviteCode: code } }));
    } catch (_) {
      setQrStatus(translations[language].qrInvalid, "error");
    }
  }

  $("createMyQr").addEventListener("click", async () => {
    clearActiveQr();
    try {
      if (!window.EZERO_CONNECT_INVITES || !window.EZERO_QR) throw new Error("QR_RUNTIME_UNAVAILABLE");
      const invite = await window.EZERO_CONNECT_INVITES.createInvite();
      const imageUrl = window.EZERO_QR.encodeDataUrl(invite.inviteCode);
      if (!imageUrl.startsWith("data:image/gif;base64,")) throw new Error("QR_DATA_URL_INVALID");
      const image = document.createElement("img");
      image.alt = "E-ZERO one-time connection QR";
      image.width = 300;
      image.height = 300;
      image.style.width = "min(100%, 300px)";
      image.style.height = "auto";
      image.style.imageRendering = "pixelated";
      image.src = imageUrl;
      $("myQrImage").replaceChildren(image);
      $("myQrDisplay").hidden = false;
      activeInvite = invite;
      document.dispatchEvent(new CustomEvent("ezero:invite-created", { detail: { invite } }));
      setQrStatus(translations[language].qrReady, "ok");
      const updateExpiry = () => {
        const remaining = Math.max(0, Math.ceil((invite.expiresAt - Date.now()) / 1000));
        $("qrCountdown").textContent = translations[language].qrSeconds.replace("{n}", String(remaining));
        $("myQrExpiry").textContent = $("qrCountdown").textContent;
        if (remaining <= 0) {
          clearActiveQr();
          setQrStatus(translations[language].qrExpired, "error");
        }
      };
      updateExpiry();
      inviteTimer = setInterval(updateExpiry, 1000);
    } catch (_) {
      setQrStatus(translations[language].qrInvalid, "error");
    }
  });

  $("scanFriendQr").addEventListener("click", async () => {
    stopQrCamera();
    const video = $("qrScannerVideo");
    try {
      video.hidden = false;
      $("stopQrScanner").hidden = false;
      video.setAttribute("playsinline", "");
      video.setAttribute("autoplay", "");
      video.muted = true;
      // Prefer Android Chrome's native QR decoder; use the bundled decoder only
      // when native BarcodeDetector is unavailable on this browser.
      const nativeStarted = await startNativeQrScanner(video);
      if (!nativeStarted) {
        if (!window.EZERO_QR?.startCamera) throw new Error("QR_DECODER_UNAVAILABLE");
        stopCameraScan = await window.EZERO_QR.startCamera(video, code => {
          if (typeof code === "string" && code.startsWith("EZERO1.")) void acceptScannedCode(code);
        });
      }
      setQrStatus("کیمرہ QR تلاش کر رہا ہے؛ کوڈ کو فریم کے درمیان رکھیں۔", "ok");
    } catch (_) {
      stopQrCamera();
      setQrStatus(translations[language].qrCameraError, "error");
    }
  });

  $("stopQrScanner").addEventListener("click", stopQrCamera);
  $("chooseGalleryQr").addEventListener("click", () => $("qrGalleryFile").click());
  $("qrGalleryFile").addEventListener("change", async () => {
    const file = $("qrGalleryFile").files?.[0];
    if (!file) return;
    try {
      const code = await window.EZERO_QR.decodeImageFile(file);
      await acceptScannedCode(code);
    } catch (_) {
      setQrStatus(translations[language].qrGalleryError, "error");
    } finally {
      $("qrGalleryFile").value = "";
    }
  });
  window.addEventListener("pagehide", () => {
    stopQrCamera();
    clearActiveQr();
  });

  // Call buttons stay disabled in HTML until the saved-friend chat module
  // confirms an authenticated, mutually trusted session.
  renderLanguage();
  initializeIdentity();
})();
