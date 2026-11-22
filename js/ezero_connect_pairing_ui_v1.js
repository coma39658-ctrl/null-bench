(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "pairingPanel";
  panel.hidden = true;
  panel.innerHTML = '<div class="panel-head"><strong id="pairingTitle">محفوظ دوست بنائیں</strong><span class="muted" id="pairingRole"></span></div><p class="muted" id="pairingStatus" role="status" aria-live="polite"></p><label class="muted" id="pairingNameLabel" for="pairingFriendName">دوست کا نام</label><input class="search" id="pairingFriendName" maxlength="64" autocomplete="name" style="margin:8px 0" placeholder="دوست کا نام"><button class="primary" id="pairingAction" type="button" style="width:100%">منظوری دیں</button><button class="secondary" id="pairingCancel" type="button" style="width:100%;margin-top:8px">منسوخ کریں</button>';
  const qrPanel = $("qrScanStatus")?.closest(".panel");
  if (qrPanel) qrPanel.append(panel);

  const words = {
    ur: {
      title:"محفوظ دوست بنائیں", host:"آپ QR کے مالک ہیں", guest:"دوست کا QR اسکین ہوا",
      waiting:"دوست کے جڑنے کا انتظار ہے…", peer:"محفوظ کنکشن بن گیا۔ اب دوست کو محفوظ کرنے کی منظوری دیں۔",
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
  function status(message, kind) {
    $("pairingStatus").textContent = message;
    $("pairingStatus").dataset.kind = kind || "";
  }
  function show(roleValue, message) {
    role = roleValue;
    panel.hidden = false;
    $("pairingRole").textContent = roleValue === "host" ? t("host") : t("guest");
    $("pairingTitle").textContent = t("title");
    status(message || t("waiting"));
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
    $("pairingNameLabel").textContent = label;
    $("pairingFriendName").value = "";
    $("pairingFriendName").hidden = false;
    $("pairingAction").textContent = actionLabel;
    $("pairingAction").disabled = !enabled;
  }
  function fail(error) {
    busy = false;
    status(t("error") + (error?.message ? " (" + error.message + ")" : ""), "error");
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
        for (const queued of pendingMessages.splice(0)) void handleMessage(queued);
        if (role !== "host") { status(t("guestWait")); return; }
        try {
          const local = await window.EZERO_CONNECT_IDENTITY.getPublicIdentity();
          transcript = (await window.EZERO_CONNECT_TRUST.buildTranscript(invite, remote, Date.now())).transcript;
          localApproval = await window.EZERO_CONNECT_TRUST.signApproval(transcript);
          status(t("peer"));
          controls(t("hostName"), t("hostAction"), true);
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