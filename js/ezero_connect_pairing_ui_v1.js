(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "pairingPanel";
  panel.hidden = true;
  panel.innerHTML = '<div class="panel-head"><strong id="pairingTitle">محفوظ دوست بنائیں</strong><span class="muted" id="pairingRole"></span></div><ol class="pairing-steps" id="pairingSteps" aria-label="رابطے کے مراحل"><li data-step="qr"><span class="step-mark">○</span><span>QR اسکین</span><small>انتظار</small></li><li data-step="identity"><span class="step-mark">○</span><span>شناخت کی تصدیق</span><small>انتظار</small></li><li data-step="peer"><span class="step-mark">○</span><span>دونوں فون منسلک</span><small>انتظار</small></li><li data-step="approval"><span class="step-mark">○</span><span>باہمی منظوری</span><small>انتظار</small></li><li data-step="saved"><span class="step-mark">○</span><span>دوست محفوظ</span><small>انتظار</small></li></ol><p class="muted" id="pairingStatus" role="status" aria-live="polite"></p><label class="muted" id="pairingNameLabel" for="pairingFriendName">دوست کا نام</label><input class="search" id="pairingFriendName" maxlength="64" autocomplete="name" style="margin:8px 0" placeholder="دوست کا نام"><button class="primary" id="pairingAction" type="button" style="width:100%">منظوری دیں</button><button class="secondary" id="pairingCancel" type="button" style="width:100%;margin-top:8px">منسوخ کریں</button>';
  const qrPanel = $("qrScanStatus")?.closest(".panel");
  if (qrPanel) qrPanel.append(panel);

  const words = {
    ur: {
      title:"محفوظ دوست بنائیں", host:"آپ QR کے مالک ہیں", guest:"دوست کا QR اسکین ہوا",
      waiting:"دوست کے جڑنے کا انتظار ہے…", peer:"محفوظ کنکشن بن گیا۔ اب دوست کو محفوظ کرنے کی منظوری دیں۔",
      serverAccepted:"اس فون کی سرور سے تصدیق ہو گئی ہے؛ دوسرے فون کے آنے کا انتظار ہے۔", peerTimeout:"ابھی دوسرا فون نہیں ملا۔ دونوں فون اسی QR دعوت اور انٹرنیٹ کے ساتھ کھلے رکھیں۔",
      peerDisconnected:"دوسرا فون منقطع ہو گیا۔ دوبارہ رابطہ قائم ہونے کا انتظار ہے۔", roomClosed:"محفوظ رابطے کا کمرہ بند ہو گیا۔", rateLimited:"بہت زیادہ کوششیں ہوئیں؛ کچھ دیر بعد دوبارہ کوشش کریں۔", peerUnavailable:"دوسرا فون ابھی دستیاب نہیں۔ دونوں فون آن لائن ہونے چاہئیں.",
      hostName:"دوست کا نام لکھیں", hostAction:"درخواست بھیجیں اور محفوظ کرنے کی منظوری دیں",
      guestWait:"دوست کی درخواست کا انتظار ہے…", request:"دوست آپ کو محفوظ کرنا چاہتا ہے۔ نام لکھیں اور منظوری دیں۔",
      guestName:"اپنی فہرست میں دوست کا نام لکھیں", guestAction:"منظوری دیں اور دوست محفوظ کریں",
      hostSaved:"دوست محفوظ ہو گیا۔", guestSaved:"دوست محفوظ ہو گیا۔",
      canceled:"رابطہ منسوخ کر دیا گیا۔", error:"محفوظ رابطہ مکمل نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
      cancel:"منسوخ کریں", emptyName:"دوست کا نام لکھیں۔", notReady:"محفوظ رابطہ سروس دستیاب نہیں۔",
      invalid:"دوست کی منظوری کی تصدیق نہیں ہو سکی۔"
    },
    en: {
      title:"Save a trusted friend", host:"You are showing your QR", guest:"Friend QR verified",
      waiting:"Waiting for the other device…", peer:"Secure peer connection established. Approve saving this friend.",
      serverAccepted:"This device is authenticated; waiting for the other phone to join.", peerTimeout:"The other phone has not joined yet. Keep both phones online with this same invite.",
      peerDisconnected:"The other phone disconnected. Waiting for it to reconnect.", roomClosed:"The secure pairing room was closed.", rateLimited:"Too many attempts. Please wait before trying again.", peerUnavailable:"The other phone is not connected yet. Both phones must be online.",
      hostName:"Enter the friend's name", hostAction:"Send request and consent to save",
      guestWait:"Waiting for the friend's request…", request:"This person wants to save you as a trusted friend. Enter their name and approve.",
      guestName:"Name this friend in your list", guestAction:"Approve and save friend",
      hostSaved:"Friend saved.", guestSaved:"Friend saved.", canceled:"Pairing canceled.",
      error:"Secure pairing did not complete. Please try again.", cancel:"Cancel",
      emptyName:"Enter a friend name.", notReady:"Secure pairing service is unavailable.",
      invalid:"The friend's approval could not be verified."
    },
    ar: {
      title:"حفظ صديق موثوق", host:"أنت تعرض رمز QR", guest:"تم التحقق من رمز الصديق",
      waiting:"بانتظار الجهاز الآخر…", peer:"تم إنشاء اتصال آمن. وافق على حفظ هذا الصديق.",
      serverAccepted:"تم التحقق من هذا الجهاز؛ بانتظار انضمام الهاتف الآخر.", peerTimeout:"لم ينضم الهاتف الآخر بعد. أبقِ الهاتفين متصلين بالإنترنت وبنفس الدعوة.",
      peerDisconnected:"انقطع الهاتف الآخر. بانتظار إعادة اتصاله.", roomClosed:"تم إغلاق غرفة الاقتران الآمن.", rateLimited:"محاولات كثيرة؛ يرجى الانتظار قبل المحاولة مجدداً.", peerUnavailable:"الهاتف الآخر غير متصل حالياً. يجب أن يكون الهاتفان متصلين.",
      hostName:"أدخل اسم الصديق", hostAction:"إرسال الطلب والموافقة على الحفظ",
      guestWait:"بانتظار طلب الصديق…", request:"يريد هذا الشخص حفظك كصديق موثوق. أدخل اسمه ووافق.",
      guestName:"اكتب اسم هذا الصديق في قائمتك", guestAction:"الموافقة وحفظ الصديق",
      hostSaved:"تم حفظ الصديق.", guestSaved:"تم حفظ الصديق.", canceled:"تم إلغاء الاقتران.",
      error:"لم يكتمل الاقتران الآمن. حاول مرة أخرى.", cancel:"إلغاء",
      emptyName:"أدخل اسم الصديق.", notReady:"خدمة الاقتران الآمن غير متاحة.",
      invalid:"تعذر التحقق من موافقة الصديق."
    }
  };
  let lang = (() => { try { const v = localStorage.getItem("ezero_connect_language_v1"); return ["ur","en","ar"].includes(v) ? v : "ur"; } catch (_) { return "ur"; } })();
  let role = null;
  let session = null;
  let invite = null;
  let peer = null;
  let transcript = null;
  let localApproval = null;
  let remoteApproval = null;
  let remoteName = "";
  let localConsent = false;
  let busy = false;
  let pendingMessages = [];
  let peerWaitTimer = null;
  let peerConnected = false;
  const PEER_WAIT_TIMEOUT_MS = 45_000;

  function clearPeerWaitTimer() {
    if (peerWaitTimer !== null) clearTimeout(peerWaitTimer);
    peerWaitTimer = null;
  }
  function startPeerWaitTimer() {
    if (peerConnected || peerWaitTimer !== null) return;
    setStep("peer", "active");
    peerWaitTimer = setTimeout(() => {
      peerWaitTimer = null;
      if (!peerConnected && !panel.hidden) status(t("peerTimeout"), "warning");
    }, PEER_WAIT_TIMEOUT_MS);
  }

  function t(key) { return (words[lang] || words.ur)[key] || words.ur[key] || key; }
  const stepLabels = {
    ur: {done:"مکمل", waiting:"انتظار", active:"جاری", failed:"خرابی"},
    en: {done:"Done", waiting:"Waiting", active:"In progress", failed:"Error"},
    ar: {done:"مكتمل", waiting:"انتظار", active:"جارٍ", failed:"خطأ"}
  };
  const stepTitles = {
    ur: {qr:"QR اسکین",identity:"شناخت کی تصدیق",peer:"دونوں فون منسلک",approval:"باہمی منظوری",saved:"دوست محفوظ"},
    en: {qr:"QR scanned",identity:"Identity verified",peer:"Both phones connected",approval:"Mutual approval",saved:"Friend saved"},
    ar: {qr:"تم مسح QR",identity:"تم التحقق من الهوية",peer:"اتصال الجهازين",approval:"الموافقة المتبادلة",saved:"تم حفظ الصديق"}
  };
  const completedSteps = new Set();
  function renderStepTitles() {
    const titles = stepTitles[lang] || stepTitles.ur;
    for (const [name, label] of Object.entries(titles)) {
      const item = panel.querySelector('[data-step="' + name + '"]');
      if (item) item.querySelector("span:not(.step-mark)").textContent = label;
    }
  }
  function setStep(name, state) {
    const item = panel.querySelector('[data-step="' + name + '"]');
    if (!item) return;
    item.dataset.state = state;
    item.querySelector(".step-mark").textContent = state === "done" ? "✓" : state === "failed" ? "✕" : state === "active" ? "…" : "○";
    item.querySelector("small").textContent = (stepLabels[lang] || stepLabels.ur)[state] || state;
  }
  function resetSteps() {
    completedSteps.clear();
    for (const name of ["qr","identity","peer","approval","saved"]) setStep(name, "waiting");
  }
  function markDone(name) { completedSteps.add(name); setStep(name, "done"); }
  function status(message, kind) {
    $("pairingStatus").textContent = message;
    $("pairingStatus").dataset.kind = kind || "";
  }
  function show(roleValue, message) {
    role = roleValue;
    panel.hidden = false;
    resetSteps();
    renderStepTitles();
    $("pairingRole").textContent = roleValue === "host" ? t("host") : t("guest");
    $("pairingTitle").textContent = t("title");
    status(message || t("waiting"));
    if (roleValue === "guest") { markDone("qr"); markDone("identity"); }
    else setStep("qr", "active");
  }
  function closeSession() {
    clearPeerWaitTimer();
    peerConnected = false;
    if (session) { try { session.close(); } catch (_) {} }
    session = null;
  }
  function cancel() {
    closeSession();
    invite = peer = transcript = localApproval = remoteApproval = null;
    remoteName = "";
    localConsent = false;
    busy = false;
    panel.hidden = true;
    status(t("canceled"));
  }
  function canonical(value) {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
    return "{" + Object.keys(value).sort().map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
  }
  function controls(label, actionLabel, enabled) {
    $("pairingNameLabel").textContent = label;
    $("pairingFriendName").value = "";
    $("pairingFriendName").hidden = false;
    $("pairingAction").textContent = actionLabel;
    $("pairingAction").disabled = !enabled;
  }
  function fail(error) {
    busy = false;
    const code = String(error?.message || "UNKNOWN_ERROR");
    const reason = ({PAIRING_REQUEST_INVALID:"دوسرے فون کی درخواست یا دستخط کی تصدیق درست نہیں۔",PAIRING_GUEST_APPROVAL_INVALID:"دوسرے فون کی منظوری کی تصدیق ناکام ہوئی۔",PAIRING_HOST_APPROVAL_INVALID:"پہلے فون کی منظوری کی تصدیق ناکام ہوئی۔",PAIRING_FRIEND_NAME_REQUIRED:"دوست کا نام موجود نہیں۔",PAIRING_STATE_INVALID:"رابطے کا مرحلہ درست نہیں؛ دونوں فون دوبارہ جوڑیں۔",INVITE_EXPIRED_OR_TIME_INVALID:"QR کی مدت ختم یا فون کا وقت مختلف ہے۔",INVITE_REPLAYED:"یہ QR پہلے استعمال ہو چکا ہے؛ نیا QR بنائیں۔",SIGNAL_SERVER_HANDSHAKE_INVITE_REJECTED:"سرور نے دعوتی QR کی تصدیق قبول نہیں کی۔ نیا QR بنا کر ایک بار دوبارہ کوشش کریں۔",SIGNAL_SERVER_HANDSHAKE_IDENTITY_PROOF_REJECTED:"ڈیوائس کی محفوظ شناختی تصدیق سرور پر ناکام ہوئی۔",SIGNAL_SERVER_HANDSHAKE_ROOM_STATE_REJECTED:"دعوتی کمرے کی حالت یا مدت درست نہیں رہی۔",SIGNAL_SERVER_HANDSHAKE_INTERNAL_ERROR:"سرور پر محفوظ رابطے کے مرحلے میں اندرونی خرابی آئی۔",SIGNAL_SERVER_ADMISSION_INTERNAL_ERROR:"سرور نے رابطے کی درخواست قبول نہیں کی۔",SIGNAL_SERVER_RELAY_INTERNAL_ERROR:"دونوں فون کے درمیان پیغام پہنچانے کے مرحلے میں سرور کی خرابی آئی۔",SIGNAL_SERVER_RELAY_ROOM_STATE_REJECTED:"رابطے کا محفوظ کمرہ اب درست حالت میں نہیں۔",TRUST_SECURE_STORAGE_UNAVAILABLE:"اس فون کے محفوظ مقامی اسٹوریج تک رسائی نہیں ہو سکی۔ براہِ کرم عام براؤزر میں HTTPS صفحہ کھولیں۔",TRUST_DATABASE_OPEN_FAILED:"اس فون میں محفوظ رابطوں کا ڈیٹابیس نہیں کھل سکا۔",TRUST_VAULT_KEY_MISSING_OR_INVALID:"اس فون کی محفوظ چابی دستیاب نہیں؛ اس ڈیوائس کی محفوظ شناخت دوبارہ جانچنا ضروری ہے۔",TRUST_VAULT_READ_FAILED:"اس فون کی محفوظ چابی پڑھنے میں خرابی آئی۔",TRUST_VAULT_WRITE_FAILED:"اس فون کی محفوظ چابی محفوظ نہیں ہو سکی۔",TRUST_CONTACT_READ_FAILED:"محفوظ دوستوں کی فہرست نہیں پڑھی جا سکی۔",TRUST_CONTACT_SAVE_FAILED:"دوست کی معلومات اس فون میں محفوظ نہیں ہو سکیں۔",TRUST_RELATIONSHIP_ALREADY_EXISTS:"یہی محفوظ رابطہ پہلے سے اس فون میں موجود ہے۔",TRUST_EXPLICIT_SAVE_CONSENT_REQUIRED:"دوست محفوظ کرنے کی واضح منظوری مکمل نہیں ہوئی۔",TRUST_APPROVAL_ROLE_MISMATCH:"دونوں فونوں کی منظوری درست شناخت سے مطابقت نہیں رکھتی۔",TRUST_LOCAL_OR_REMOTE_IDENTITY_MISMATCH:"اس رابطے میں فون کی محفوظ شناخت مختلف ہے۔",TRUST_APPROVAL_SIGNATURE_INVALID:"دوست کی منظوری کے دستخط کی تصدیق ناکام ہوئی۔",TRUST_TRANSCRIPT_INVALID:"محفوظ رابطے کی مشترکہ تصدیق کی معلومات درست نہیں۔",TRUST_KEY_ENCODING_INVALID:"ڈیوائس کی عوامی شناختی کلید کا فارمیٹ درست نہیں۔",TRUST_KEY_LENGTH_INVALID:"ڈیوائس کی شناختی کلید کی لمبائی درست نہیں۔",TRUST_PARTICIPANT_ORDER_INVALID:"دونوں ڈیوائسز کی شناختی ترتیب درست نہیں۔",TRUST_PARTICIPANT_FINGERPRINT_INVALID:"ڈیوائس کی شناختی فنگرپرنٹ درست نہیں۔",TRUST_PARTICIPANT_KEY_MISMATCH:"ڈیوائس کی شناختی کلید اور فنگرپرنٹ آپس میں نہیں ملتے۔",TRUST_INVITE_METADATA_INVALID:"QR دعوت کی محفوظ معلومات نامکمل یا غلط ہیں۔",TRUST_SELF_PAIRING_FORBIDDEN:"ایک ہی ڈیوائس کو اپنا دوست نہیں بنایا جا سکتا۔",TRUST_LOCAL_IDENTITY_NOT_IN_TRANSCRIPT:"اس فون کی شناخت محفوظ رابطے میں شامل نہیں۔",TRUST_APPROVAL_INVALID:"دوست کی منظوری کا ڈیٹا درست نہیں۔",TRUST_APPROVAL_SIGNER_UNKNOWN:"منظوری دینے والی ڈیوائس کی شناخت نہیں ملی۔",TRUST_APPROVAL_TRANSCRIPT_MISMATCH:"منظوری محفوظ رابطے کی اسی درخواست سے مطابقت نہیں رکھتی۔",TRUST_RECORD_ID_MISMATCH:"محفوظ دوست کے ریکارڈ کی شناخت درست نہیں۔",TRUST_DISPLAY_NAME_INVALID:"دوست کا نام قابلِ قبول نہیں۔",TRUST_REMOTE_DEVICE_BLOCKED:"یہ ڈیوائس پہلے بلاک کی گئی ہے؛ پہلے بلاک ختم کرنا ہوگا۔",TRUST_RELATIONSHIP_ID_INVALID:"محفوظ دوست کی شناختی قدر درست نہیں۔",TRUST_RELATIONSHIP_NOT_TRUSTED:"یہ دوست اس ڈیوائس پر تصدیق شدہ محفوظ نہیں۔",TRUST_FRIEND_PROFILE_ENCODING_INVALID:"دوست کی پروفائل تصویر کا ڈیٹا درست نہیں۔",TRUST_FRIEND_PROFILE_HASH_INVALID:"دوست کی پروفائل تصویر کی تصدیق ناکام ہوئی۔",TRUST_FRIEND_PROFILE_JPEG_INVALID:"دوست کی پروفائل تصویر درست JPEG فائل نہیں۔",TRUST_FRIEND_PROFILE_TRUST_MISMATCH:"پروفائل تصویر تصدیق شدہ دوست سے مطابقت نہیں رکھتی۔",TRUST_FRIEND_PROFILE_READ_FAILED:"دوست کی پروفائل معلومات نہیں پڑھی جا سکیں۔",TRUST_FRIEND_PROFILE_RECORD_INVALID:"دوست کی محفوظ پروفائل معلومات خراب یا نامکمل ہیں۔",TRUST_FRIEND_PROFILE_WRITE_FAILED:"دوست کی پروفائل معلومات محفوظ نہیں ہو سکیں۔",TRUST_FRIEND_PROFILE_WRITE_ABORTED:"دوست کی پروفائل محفوظ کرنے کا عمل منسوخ ہو گیا۔",TRUST_FRIEND_PROFILE_DELETE_FAILED:"دوست کی پروفائل تصویر حذف نہیں ہو سکی۔",TRUST_FRIEND_PROFILE_DELETE_ABORTED:"پروفائل حذف کرنے کا عمل منسوخ ہو گیا۔",TRUST_MESSAGE_INPUT_INVALID:"پیغام کا مواد درست نہیں۔",TRUST_MESSAGE_LIMIT_INVALID:"پیغام کی حد یا ترتیب درست نہیں۔",TRUST_MESSAGE_SIZE_INVALID:"پیغام مقررہ محفوظ حد سے بڑا ہے۔",TRUST_MESSAGE_TEXT_ENCODING_INVALID:"پیغام کا متن درست UTF-8 فارمیٹ میں نہیں۔",TRUST_MESSAGE_RECORD_SIZE_INVALID:"محفوظ پیغام کا ریکارڈ مقررہ حد سے بڑا ہے۔",TRUST_MESSAGE_WRITE_FAILED:"پیغام اس ڈیوائس پر محفوظ نہیں ہو سکا۔",TRUST_MESSAGE_WRITE_ABORTED:"پیغام محفوظ کرنے کا عمل منسوخ ہو گیا۔",TRUST_MESSAGE_READ_FAILED:"محفوظ پیغامات نہیں پڑھے جا سکے۔",TRUST_MESSAGE_RECORD_INVALID:"محفوظ پیغام کا ریکارڈ درست نہیں۔",TRUST_MESSAGE_STATUS_INVALID:"پیغام کی ترسیل کی حالت درست نہیں۔",TRUST_MESSAGE_STATUS_UPDATE_INVALID:"پیغام کی ترسیل کی حالت تبدیل کرنے کی درخواست درست نہیں۔",TRUST_MESSAGE_STATUS_WRITE_FAILED:"پیغام کی ترسیل کی حالت محفوظ نہیں ہو سکی۔",TRUST_MESSAGE_STATUS_WRITE_ABORTED:"پیغام کی حالت محفوظ کرنے کا عمل منسوخ ہو گیا۔",TRUST_MESSAGE_STATUS_TRANSITION_INVALID:"پیغام کی ترسیل کی حالت کی تبدیلی محفوظ اصولوں کے خلاف ہے۔",TRUST_MESSAGE_NOT_FOUND:"درکار محفوظ پیغام نہیں ملا۔",TRUST_MESSAGE_DELETE_FAILED:"محفوظ پیغام حذف نہیں ہو سکا۔",TRUST_MESSAGE_DELETE_ABORTED:"پیغام حذف کرنے کا عمل منسوخ ہو گیا۔",TRUST_STATUS_INVALID:"دوست کے رابطے کی حالت درست نہیں۔",TRUST_STATUS_UPDATE_FAILED:"دوست کے رابطے کی حالت تبدیل نہیں ہو سکی۔",TRUST_STATUS_UPDATE_ABORTED:"رابطے کی حالت بدلنے کا عمل منسوخ ہو گیا۔",TRUST_UNBLOCK_FAILED:"دوست کو اَن بلاک نہیں کیا جا سکا۔",TRUST_UNBLOCK_ABORTED:"اَن بلاک کرنے کا عمل منسوخ ہو گیا۔"}[code] || "رابطے کی محفوظ تصدیق مکمل نہیں ہو سکی۔");
    const failedStep = completedSteps.has("approval") ? "saved" : completedSteps.has("peer") ? "approval" : "peer";
    setStep(failedStep, "failed");
    status(t("error") + " وجہ: " + reason, "error");
    $("pairingAction").disabled = true;
  }
  function refreshContacts() {
    document.dispatchEvent(new CustomEvent("ezero:friend-local-saved"));
    window.EZERO_CONNECT_CONTACTS_UI?.refresh?.();
  }

  async function start(roleValue, inviteCode, metadata) {
    closeSession();
    pendingMessages = [];
    const api = window.EZERO_CONNECT_SIGNALING;
    if (!api || !window.EZERO_CONNECT_TRUST || !window.EZERO_CONNECT_IDENTITY) {
      show(roleValue, t("notReady")); $("pairingAction").disabled = true; return;
    }
    show(roleValue, t("waiting"));
    peerConnected = false;
    try {
      session = api.connect({ role: roleValue, inviteCode, inviteMetadata: metadata });
      session.on("ready", () => {
        if (!peerConnected) {
          startPeerWaitTimer();
          status(t("serverAccepted"), "waiting");
        }
      });
      session.on("waiting-for-peer", () => {
        if (!peerConnected) {
          startPeerWaitTimer();
          status(t("serverAccepted"), "waiting");
        }
      });
      session.on("peer-disconnected", () => {
        peerConnected = false;
        clearPeerWaitTimer();
        setStep("peer", "failed");
        status(t("peerDisconnected"), "warning");
      });
      session.on("room-closed", () => {
        peerConnected = false;
        clearPeerWaitTimer();
        setStep("peer", "failed");
        status(t("roomClosed"), "error");
      });
      session.on("rate-limited", () => status(t("rateLimited"), "error"));
      session.on("peer-not-connected", () => status(t("peerUnavailable"), "warning"));
      session.on("peer-ready", async remote => {
        clearPeerWaitTimer();
        peerConnected = true;
        peer = remote;
        markDone("qr");
        markDone("peer");
        for (const queued of pendingMessages.splice(0)) void handleMessage(queued);
        if (role !== "host") { status(t("guestWait")); return; }
        try {
          const local = await window.EZERO_CONNECT_IDENTITY.getPublicIdentity();
          transcript = (await window.EZERO_CONNECT_TRUST.buildTranscript(invite, remote, Date.now())).transcript;
          localApproval = await window.EZERO_CONNECT_TRUST.signApproval(transcript);
          markDone("identity");
          setStep("approval", "active");
          status(t("peer"));
          controls(t("hostName"), t("hostAction"), true);
        } catch (error) { fail(error); }
      });
      session.on("message", message => { void handleMessage(message); });
      session.on("error", fail);
      session.on("close", () => {
        clearPeerWaitTimer();
        if (!panel.hidden && !busy && !peerConnected) status(t("peerDisconnected"), "warning");
      });
      await session.ready;
    } catch (error) { fail(error); }
  }

  async function handleMessage(message) {
    if (!message || !message.type || !message.payload) return;
    if (message.type === "trust-request" && role === "guest" && !peer) {
      pendingMessages.push(message);
      return;
    }
    const p = message.payload;
    try {
      if (message.type === "trust-request" && role === "guest") {
        const local = await window.EZERO_CONNECT_IDENTITY.getPublicIdentity();
        const rebuilt = (await window.EZERO_CONNECT_TRUST.buildTranscript(invite, local, p.transcript?.createdAt)).transcript;
        if (canonical(rebuilt) !== canonical(p.transcript) ||
            p.approval?.signerFingerprint !== peer?.fingerprint ||
            !await window.EZERO_CONNECT_TRUST.verifyApproval(p.transcript, p.approval)) throw new Error("PAIRING_REQUEST_INVALID");
        transcript = p.transcript;
        remoteApproval = p.approval;
        markDone("peer");
        setStep("approval", "active");
        status(t("request"), "ok");
        controls(t("guestName"), t("guestAction"), true);
        return;
      }
      if (message.type === "trust-approval" && role === "host" && p.stage === "guest-accepted") {
        if (canonical(p.transcript) !== canonical(transcript) ||
            p.approval?.signerFingerprint !== peer?.fingerprint ||
            !await window.EZERO_CONNECT_TRUST.verifyApproval(transcript, p.approval)) throw new Error("PAIRING_GUEST_APPROVAL_INVALID");
        remoteApproval = p.approval;
        const name = $("pairingFriendName").value.trim();
        if (!name || name.length > 64) throw new Error("PAIRING_FRIEND_NAME_REQUIRED");
        const saved = await window.EZERO_CONNECT_TRUST.saveTrustedContact({
          transcript, localApproval, remoteApproval, displayName: name, explicitConsent: localConsent
        });
        session.send("trust-approval", { transcript, approval: localApproval, stage: "host-saved" });
        markDone("approval");
        markDone("saved");
        status(t("hostSaved"), "ok");
        $("pairingAction").disabled = true;
        refreshContacts();
        return;
      }
      if (message.type === "trust-approval" && role === "guest" && p.stage === "host-saved") {
        if (!localConsent || canonical(p.transcript) !== canonical(transcript) ||
            p.approval?.signerFingerprint !== peer?.fingerprint ||
            !await window.EZERO_CONNECT_TRUST.verifyApproval(transcript, p.approval)) throw new Error("PAIRING_HOST_APPROVAL_INVALID");
        const saved = await window.EZERO_CONNECT_TRUST.saveTrustedContact({
          transcript, localApproval, remoteApproval: p.approval,
          displayName: remoteName, explicitConsent: true
        });
        markDone("approval");
        markDone("saved");
        status(t("guestSaved"), "ok");
        $("pairingAction").disabled = true;
        refreshContacts();
      }
    } catch (error) { fail(error); }
  }

  $("pairingAction").addEventListener("click", async () => {
    if (busy) return;
    const name = $("pairingFriendName").value.trim();
    if (!name || name.length > 64) { status(t("emptyName"), "error"); return; }
    busy = true;
    $("pairingAction").disabled = true;
    try {
      if (role === "host" && peer && transcript && localApproval) {
        localConsent = true;
        remoteName = name;
        session.send("trust-request", { transcript, approval: localApproval });
        status(t("guestWait"), "ok");
      } else if (role === "guest" && transcript && remoteApproval) {
        const identity = await window.EZERO_CONNECT_IDENTITY.getPublicIdentity();
        localApproval = await window.EZERO_CONNECT_TRUST.signApproval(transcript);
        remoteName = name;
        localConsent = true;
        session.send("trust-approval", { transcript, approval: localApproval, stage: "guest-accepted" });
        status(t("guestWait"), "ok");
      } else {
        throw new Error("PAIRING_STATE_INVALID");
      }
    } catch (error) { fail(error); }
    finally { busy = false; }
  });
  $("pairingCancel").textContent = t("cancel");
  $("pairingCancel").addEventListener("click", cancel);
  document.addEventListener("ezero:language-changed", event => {
    const value = event.detail?.language;
    if (["ur","en","ar"].includes(value)) lang = value;
    if (role) $("pairingRole").textContent = role === "host" ? t("host") : t("guest");
    $("pairingTitle").textContent = t("title");
    renderStepTitles();
    for (const item of panel.querySelectorAll(".pairing-steps li")) { const state = item.dataset.state || "waiting"; item.querySelector("small").textContent = (stepLabels[lang] || stepLabels.ur)[state] || state; }
    $("pairingCancel").textContent = t("cancel");
  });

  document.addEventListener("ezero:invite-created", event => {
    invite = event.detail?.invite;
    if (!invite) return;
    void start("host", invite.inviteCode, invite);
  });
  document.addEventListener("ezero:invite-verified", event => {
    const detail = event.detail;
    if (!detail?.verified || !detail?.inviteCode) return;
    invite = detail.verified;
    void start("guest", detail.inviteCode, detail.verified);
  });
  window.EZERO_CONNECT_PAIRING_UI = Object.freeze({ cancel });
})();