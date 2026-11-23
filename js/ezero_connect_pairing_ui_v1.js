(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const qrPanel = $("qrScanStatus")?.closest(".panel");
  if (!qrPanel) return;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "mutualApprovalPanel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="panel-head"><strong id="pairTitle">دونوں طرف منظوری</strong><span class="muted" id="pairRole"></span></div>
    <p class="status" id="pairStatus" role="status" aria-live="polite"></p>
    <div class="muted" id="pairFingerprint" style="direction:ltr;overflow-wrap:anywhere"></div>
    <button class="primary" id="pairApprove" type="button" hidden style="width:100%;margin-top:10px">منظوری دیں</button>
    <div id="pairSaveArea" hidden>
      <label class="muted" id="pairNameLabel" for="pairFriendName" style="display:block;margin-top:12px">دوست کا نام</label>
      <input class="search" id="pairFriendName" type="text" maxlength="64" autocomplete="off" style="margin-top:7px">
      <label class="muted" style="display:flex;gap:9px;align-items:flex-start;line-height:1.8;margin:12px 0">
        <input id="pairSaveConsent" type="checkbox" style="margin-top:4px;accent-color:#174c39">
        <span id="pairConsentText">میں اس تصدیق شدہ دوست کو اس فون کی محفوظ فہرست میں شامل کرنے کی اجازت دیتا/دیتی ہوں۔</span>
      </label>
      <button class="primary" id="pairSave" type="button" disabled style="width:100%">دوست محفوظ کریں</button>
    </div>
    <button class="secondary" id="pairDecline" type="button" hidden style="width:100%;margin-top:9px">انکار / منسوخ</button>
  `;
  qrPanel.append(panel);

  const words = {
    ur: {
      title:"دونوں طرف منظوری", host:"QR دکھانے والا فون", guest:"QR اسکین کرنے والا فون",
      connecting:"محفوظ رابطہ قائم ہو رہا ہے…", waitingPeer:"دوسرے فون کے محفوظ رابطے کا انتظار ہے…",
      hostPrompt:"دوسرے فون کی شناخت موصول ہو گئی۔ کیا آپ اس ڈیوائس کو دوست بنانے کی درخواست بھیجنا چاہتے ہیں؟",
      hostApprove:"دوست بنانے کی درخواست بھیجیں", hostWaiting:"درخواست بھیج دی گئی۔ اب دوسرے فون کی منظوری کا انتظار ہے۔",
      guestWaiting:"محفوظ رابطہ قائم ہے۔ دوست کی درخواست کا انتظار ہے…",
      guestPrompt:"یہ فون آپ کو محفوظ دوست بنانا چاہتا ہے۔ کیا آپ اس درخواست کو قبول کرتے ہیں؟",
      guestApprove:"درخواست قبول کریں", mutual:"دونوں طرف دستخطی منظوری مکمل ہے۔ اب اس فون پر دوست محفوظ کرنے کی الگ اجازت دیں۔",
      name:"دوست کا نام", consent:"میں اس تصدیق شدہ دوست کو اس فون کی محفوظ فہرست میں شامل کرنے کی اجازت دیتا/دیتی ہوں۔",
      save:"دوست محفوظ کریں", saved:"دوست اس فون کی محفوظ فہرست میں شامل ہو گیا۔", declined:"درخواست مسترد یا منسوخ ہو گئی۔",
      error:"محفوظ منظوری مکمل نہیں ہو سکی: ", decline:"انکار / منسوخ", noName:"دوست کا نام لکھیں۔",
      noConsent:"دوست محفوظ کرنے کے لیے خانے پر نشان لگائیں۔", connectingError:"محفوظ سگنلنگ سروس سے رابطہ نہیں ہو سکا: ",
      friends:"محفوظ دوست", fingerprint:"دوسرے فون کی شناخت: "
    },
    en: {
      title:"Mutual approval", host:"QR owner phone", guest:"Scanning phone",
      connecting:"Establishing secure connection…", waitingPeer:"Waiting for the other device to connect securely…",
      hostPrompt:"The other device is verified. Do you want to send a friend request?",
      hostApprove:"Send friend request", hostWaiting:"Request sent. Waiting for approval on the other phone.",
      guestWaiting:"Secure connection is ready. Waiting for the friend request…",
      guestPrompt:"This device wants to add you as a trusted friend. Do you accept?",
      guestApprove:"Accept friend request", mutual:"Both device signatures are verified. Give separate consent to save this friend on this phone.",
      name:"Friend's name", consent:"I consent to adding this verified friend to this phone's trusted list.",
      save:"Save friend", saved:"Friend added to this phone's trusted list.", declined:"Request declined or canceled.",
      error:"Secure approval could not complete: ", decline:"Decline / cancel", noName:"Enter a friend name.",
      noConsent:"Tick the box to save this friend.", connectingError:"Could not connect to secure signaling: ",
      friends:"Saved friends", fingerprint:"Other device identity: "
    },
    ar: {
      title:"الموافقة المتبادلة", host:"هاتف صاحب رمز QR", guest:"الهاتف الذي مسح الرمز",
      connecting:"جارٍ إنشاء اتصال آمن…", waitingPeer:"بانتظار اتصال الجهاز الآخر بشكل آمن…",
      hostPrompt:"تم التحقق من الجهاز الآخر. هل تريد إرسال طلب صداقة؟",
      hostApprove:"إرسال طلب الصداقة", hostWaiting:"تم إرسال الطلب. بانتظار موافقة الهاتف الآخر.",
      guestWaiting:"الاتصال الآمن جاهز. بانتظار طلب الصداقة…",
      guestPrompt:"يريد هذا الجهاز إضافتك كصديق موثوق. هل توافق؟",
      guestApprove:"قبول طلب الصداقة", mutual:"تم التحقق من توقيعي الجهازين. امنح إذناً منفصلاً لحفظ هذا الصديق على هذا الهاتف.",
      name:"اسم الصديق", consent:"أوافق على إضافة هذا الصديق الموثّق إلى قائمة هذا الهاتف.",
      save:"حفظ الصديق", saved:"تمت إضافة الصديق إلى القائمة الآمنة لهذا الهاتف.", declined:"تم رفض الطلب أو إلغاؤه.",
      error:"تعذر إكمال الموافقة الآمنة: ", decline:"رفض / إلغاء", noName:"أدخل اسم الصديق.",
      noConsent:"حدد المربع لحفظ هذا الصديق.", connectingError:"تعذر الاتصال بخدمة الإشارة الآمنة: ",
      friends:"الأصدقاء المحفوظون", fingerprint:"هوية الجهاز الآخر: "
    }
  };

  let language = document.documentElement.lang || "ur";
  let connection = null;
  let session = null;
  let role = null;
  let busy = false;
  let completed = false;

  const t = () => words[language] || words.en;
  const status = (message, kind = "") => {
    $("pairStatus").textContent = message;
    $("pairStatus").dataset.kind = kind;
  };
  const showPanel = () => { panel.hidden = false; };
  const setApprovalButton = (visible, label) => {
    $("pairApprove").hidden = !visible;
    $("pairApprove").textContent = label || "";
  };
  const setDeclineVisible = visible => { $("pairDecline").hidden = !visible; };

  function renderLanguage() {
    $("pairTitle").textContent = t().title;
    $("pairNameLabel").textContent = t().name;
    $("pairConsentText").textContent = t().consent;
    $("pairSave").textContent = t().save;
    $("pairDecline").textContent = t().decline;
    if (role) $("pairRole").textContent = role === "host" ? t().host : t().guest;
  }

  async function renderContacts() {
    const list = $("savedFriendsList");
    if (!list || !globalThis.EZERO_CONNECT_TRUST) return;
    try {
      const contacts = await globalThis.EZERO_CONNECT_TRUST.listTrustedContacts();
      const query = $("searchFriends")?.value.trim().toLocaleLowerCase() || "";
      const visible = contacts.filter(contact => contact.status === "TRUSTED" &&
        (!query || contact.displayName.toLocaleLowerCase().includes(query) || contact.remoteFingerprint.toLowerCase().includes(query)));
      list.replaceChildren();
      $("emptyState").hidden = visible.length > 0;
      for (const contact of visible) {
        const item = document.createElement("div");
        item.className = "panel";
        item.style.marginTop = "9px";
        const name = document.createElement("strong");
        name.textContent = contact.displayName || t().friends;
        const fingerprint = document.createElement("div");
        fingerprint.className = "muted";
        fingerprint.style.direction = "ltr";
        fingerprint.style.overflowWrap = "anywhere";
        fingerprint.textContent = contact.remoteFingerprint;
        item.append(name, fingerprint);
        list.append(item);
      }
    } catch (error) {
      status(t().error + (error?.message || "TRUST_CONTACT_READ_FAILED"), "error");
    }
  }

  function renderState(info) {
    const state = info.state;
    if (info.remoteFingerprint) $("pairFingerprint").textContent = t().fingerprint + info.remoteFingerprint;
    if (state === "WAITING_FOR_PEER") {
      status(t().waitingPeer);
      setApprovalButton(false);
      setDeclineVisible(true);
    } else if (state === "WAITING_FOR_HOST_APPROVAL") {
      status(t().guestWaiting);
      setApprovalButton(false);
      setDeclineVisible(true);
    } else if (state === "READY_FOR_LOCAL_APPROVAL") {
      status(t().hostPrompt, "ok");
      setApprovalButton(true, t().hostApprove);
      setDeclineVisible(true);
    } else if (state === "AWAITING_REMOTE_APPROVAL") {
      status(t().hostWaiting);
      setApprovalButton(false);
      setDeclineVisible(true);
    } else if (state === "AWAITING_LOCAL_APPROVAL") {
      status(t().guestPrompt, "ok");
      setApprovalButton(true, t().guestApprove);
      setDeclineVisible(true);
    } else if (state === "MUTUAL_APPROVAL_READY") {
      status(t().mutual, "ok");
      setApprovalButton(false);
      $("pairSaveArea").hidden = false;
      $("pairSaveConsent").checked = false;
      $("pairSave").disabled = true;
      setDeclineVisible(true);
    } else if (state === "SAVED") {
      completed = true;
      status(t().saved, "ok");
      $("pairSaveArea").hidden = true;
      setApprovalButton(false);
      setDeclineVisible(false);
      renderContacts();
    } else if (state === "DECLINED") {
      status(t().declined, "error");
      setApprovalButton(false);
      $("pairSaveArea").hidden = true;
      setDeclineVisible(false);
    } else if (state === "ERROR") {
      status(t().error + (info.error || "PAIRING_PROTOCOL_ERROR"), "error");
      setApprovalButton(false);
      setDeclineVisible(false);
    }
  }

  async function beginPairing({ inviteCode, invitePayload, nextRole }) {
    if (completed) return;
    if (busy) return;
    if (!invitePayload || invitePayload.origin !== location.origin) {
      status(t().error + "INVITE_ORIGIN_OR_VERSION_INVALID", "error");
      showPanel();
      return;
    }
    if (connection && !connection.closed) connection.close();
    if (session) session.close();
    connection = null;
    session = null;
    role = nextRole;
    busy = true;
    showPanel();
    renderLanguage();
    $("pairSaveArea").hidden = true;
    setApprovalButton(false);
    setDeclineVisible(true);
    status(t().connecting);
    try {
      const config = globalThis.EZERO_CONNECT_CONFIG;
      if (!config || typeof config.signalingUrl !== "string" || !config.signalingUrl) {
        throw new Error("SIGNALING_ENDPOINT_NOT_CONFIGURED");
      }
      const nextConnection = globalThis.EZERO_CONNECT_SIGNAL.connect({
        inviteCode,
        invitePayload,
        role: nextRole,
        signalingBaseUrl: config.signalingUrl
      });
      connection = nextConnection;
      await nextConnection.ready;
      if (connection !== nextConnection) return;
      session = globalThis.EZERO_CONNECT_PAIRING.create({
        connection: nextConnection,
        invitePayload,
        role: nextRole,
        onState: renderState
      });
      renderState({ state: session.state, role: nextRole });
    } catch (error) {
      status(t().connectingError + (error?.message || "SIGNAL_CONNECTION_FAILED"), "error");
      setDeclineVisible(false);
    } finally {
      busy = false;
    }
  }

  $("pairApprove").addEventListener("click", async () => {
    if (!session || busy) return;
    busy = true;
    $("pairApprove").disabled = true;
    try {
      if (session.state === "READY_FOR_LOCAL_APPROVAL") await session.approveOutgoing();
      else if (session.state === "AWAITING_LOCAL_APPROVAL") await session.approveIncoming();
      renderState({ state: session.state, role });
    } catch (error) {
      status(t().error + (error?.message || "PAIRING_APPROVAL_FAILED"), "error");
    } finally {
      busy = false;
      $("pairApprove").disabled = false;
    }
  });

  $("pairSaveConsent").addEventListener("change", () => {
    $("pairSave").disabled = !$("pairSaveConsent").checked || !$("pairFriendName").value.trim();
  });
  $("pairFriendName").addEventListener("input", () => {
    $("pairSave").disabled = !$("pairSaveConsent").checked || !$("pairFriendName").value.trim();
  });
  $("pairSave").addEventListener("click", async () => {
    if (!session || busy) return;
    const displayName = $("pairFriendName").value.trim();
    if (!displayName) { status(t().noName, "error"); return; }
    if (!$("pairSaveConsent").checked) { status(t().noConsent, "error"); return; }
    busy = true;
    $("pairSave").disabled = true;
    try {
      await session.save({ displayName, explicitConsent: true });
      renderState({ state: session.state, role });
      await renderContacts();
    } catch (error) {
      status(t().error + (error?.message || "TRUST_CONTACT_SAVE_FAILED"), "error");
      $("pairSave").disabled = false;
    } finally {
      busy = false;
    }
  });

  $("pairDecline").addEventListener("click", () => {
    if (session) session.decline();
    if (connection && !connection.closed) connection.close();
    setDeclineVisible(false);
  });

  document.addEventListener("ezero:invite-created", event => {
    const invite = event.detail?.invite;
    if (!invite?.inviteCode) return;
    beginPairing({ inviteCode: invite.inviteCode, invitePayload: invite, nextRole: "host" });
  });
  document.addEventListener("ezero:invite-verified", event => {
    const verified = event.detail?.verified;
    const inviteCode = event.detail?.inviteCode;
    if (!verified || typeof inviteCode !== "string") return;
    beginPairing({ inviteCode, invitePayload: verified, nextRole: "guest" });
  });
  document.addEventListener("ezero:language-changed", event => {
    language = event.detail?.language || document.documentElement.lang || "ur";
    renderLanguage();
  });
  $("searchFriends")?.addEventListener("input", renderContacts);
  window.addEventListener("pagehide", () => {
    if (session && !completed) session.close();
    if (connection && !connection.closed) connection.close();
  });

  renderLanguage();
  renderContacts();
})();
