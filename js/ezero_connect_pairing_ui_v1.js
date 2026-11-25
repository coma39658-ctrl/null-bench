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
      waiting:"دوست کے جڑنے کا انتظار ہے…", peer:"محفوظ کنکشن بن گیا۔ دعوت خود بھیج دی گئی ہے؛ دوست کی ایک منظوری کا انتظار ہے۔", requestSent:"دعوت بھیج دی گئی ہے۔ دوسری طرف سے ایک بار قبول ہونے کا انتظار ہے…", recipientAccept:"ایک بار قبول کریں؛ محفوظ دوستی اور دونوں فونوں کی دوستوں کی فہرست بنے گی۔",
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
      waiting:"Waiting for the other device…", peer:"Secure peer connection established. The invitation has been sent; wait for the friend to accept once.", requestSent:"Invitation sent. Waiting for the recipient to Accept once…", recipientAccept:"Accept once to establish trusted friendship and save each other on both phones.",
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
      waiting:"بانتظار الجهاز الآخر…", peer:"تم إنشاء اتصال آمن وإرسال الدعوة تلقائياً؛ بانتظار قبول الصديق مرة واحدة.", requestSent:"تم إرسال الدعوة؛ بانتظار قبول الطرف الآخر مرة واحدة…", recipientAccept:"اقبل مرة واحدة لإنشاء صداقة موثوقة وحفظ الطرفين في قائمة الأصدقاء.",
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
    $("pairingNameLabel").hidden = true;
    $("pairingFriendName").hidden = true;
    $("pairingAction").hidden = true;
    $("pairingAction").disabled = true;
    status(message || t("waiting"));
    if (roleValue === "guest") { markDone("qr"); markDone("identity"); }
    else setStep("qr", "active");
  }
  function closeSession() {
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
    $("pairingNameLabel").hidden = true;
    $("pairingFriendName").hidden = true;
    $("pairingFriendName").value = "";
    $("pairingAction").textContent = actionLabel;
    $("pairingAction").disabled = !enabled;
    $("pairingAction").hidden = !enabled;
  }
  function friendAlias(fingerprint) {
    const suffix = typeof fingerprint === "string" ? fingerprint.replaceAll(":", "").slice(0, 8) : "verified";
    return "E-ZERO friend · " + suffix;
  }
  function fail(error) {
    busy = false;
    const code = String(error?.message || "UNKNOWN_ERROR");
    const reason = ({PAIRING_REQUEST_INVALID:"دوسرے فون کی درخواست یا دستخط کی تصدیق درست نہیں۔",PAIRING_GUEST_APPROVAL_INVALID:"دوسرے فون کی منظوری کی تصدیق ناکام ہوئی۔",PAIRING_HOST_APPROVAL_INVALID:"پہلے فون کی منظوری کی تصدیق ناکام ہوئی۔",PAIRING_FRIEND_NAME_REQUIRED:"دوست کا نام موجود نہیں۔",PAIRING_STATE_INVALID:"رابطے کا مرحلہ درست نہیں؛ دونوں فون دوبارہ جوڑیں۔",INVITE_EXPIRED_OR_TIME_INVALID:"QR کی مدت ختم یا فون کا وقت مختلف ہے۔",INVITE_REPLAYED:"یہ QR پہلے استعمال ہو چکا ہے؛ نیا QR بنائیں۔"}[code] || "تفصیل: " + code);
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
    try {
      session = api.connect({ role: roleValue, inviteCode, inviteMetadata: metadata });
      session.on("peer-ready", async remote => {
        peer = remote;
        markDone("qr");
        markDone("peer");
        for (const queued of pendingMessages.splice(0)) void handleMessage(queued);
        if (role !== "host") { status(t("guestWait")); return; }
        try {
          transcript = (await window.EZERO_CONNECT_TRUST.buildTranscript(invite, remote, Date.now())).transcript;
          localApproval = await window.EZERO_CONNECT_TRUST.signApproval(transcript);
          // The caller's deliberate QR/invitation creation is consent to save
          // this verified relationship. The recipient's single Accept below
          // is the only additional human approval required.
          localConsent = true;
          remoteName = friendAlias(remote.fingerprint);
          markDone("identity");
          setStep("approval", "active");
          session.send("trust-request", { transcript, approval: localApproval });
          status(t("requestSent"), "ok");
          $("pairingNameLabel").hidden = true;
          $("pairingFriendName").hidden = true;
          $("pairingAction").hidden = true;
        } catch (error) { fail(error); }
      });
      session.on("message", message => { void handleMessage(message); });
      session.on("error", fail);
      session.on("close", () => { if (!panel.hidden && !busy) status(t("error"), "error"); });
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
        remoteName = friendAlias(peer.fingerprint);
        status(t("recipientAccept"), "ok");
        controls(t("guestName"), t("guestAction"), true);
        return;
      }
      if (message.type === "trust-approval" && role === "host" && p.stage === "guest-accepted") {
        if (canonical(p.transcript) !== canonical(transcript) ||
            p.approval?.signerFingerprint !== peer?.fingerprint ||
            !await window.EZERO_CONNECT_TRUST.verifyApproval(transcript, p.approval)) throw new Error("PAIRING_GUEST_APPROVAL_INVALID");
        remoteApproval = p.approval;
        const name = remoteName || friendAlias(peer?.fingerprint);
        if (!name) throw new Error("PAIRING_FRIEND_NAME_REQUIRED");
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
    if (role !== "guest" || !transcript || !remoteApproval || !peer) return;
    busy = true;
    $("pairingAction").disabled = true;
    try {
      if (role === "guest" && transcript && remoteApproval) {
        localApproval = await window.EZERO_CONNECT_TRUST.signApproval(transcript);
        remoteName = friendAlias(peer.fingerprint);
        localConsent = true;
        session.send("trust-approval", { transcript, approval: localApproval, stage: "guest-accepted" });
        status(t("guestWait"), "ok");
        $("pairingAction").hidden = true;
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