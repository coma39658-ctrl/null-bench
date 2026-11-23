(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const qrPanel = $("qrScanStatus")?.closest(".panel");
  if (!qrPanel) return;

  const panel = document.createElement("section");
  panel.className = "panel";
  panel.id = "automaticPairingPanel";
  panel.hidden = true;
  panel.innerHTML = `
    <div class="panel-head"><strong id="autoPairTitle">محفوظ دوست</strong><span class="muted" id="autoPairRole"></span></div>
    <p class="status" id="autoPairStatus" role="status" aria-live="polite"></p>
    <div class="muted" id="autoPairFingerprint" style="direction:ltr;overflow-wrap:anywhere"></div>
    <button class="secondary" id="autoPairCancel" type="button" style="width:100%;margin-top:9px">منسوخ کریں</button>
  `;
  qrPanel.append(panel);

  const words = {
    ur: {
      title:"محفوظ دوست", host:"QR دکھانے والا فون", guest:"QR اسکین کرنے والا فون",
      waiting:"آپ کا QR تیار ہے۔ دوست کے اسکین کرنے کا انتظار ہے…",
      verifying:"دونوں فونوں کی محفوظ شناخت کی تصدیق ہو رہی ہے…",
      saving:"تصدیق مکمل۔ دوست اس فون میں خودکار طور پر محفوظ ہو رہا ہے…",
      saved:"تصدیق کامیاب — دوست اس فون کی فہرست میں محفوظ ہو گیا۔ دوبارہ QR کی ضرورت نہیں۔",
      disconnected:"دوسرا فون رابطے سے منقطع ہو گیا۔ نیا QR بنا کر دوبارہ کوشش کریں۔",
      error:"محفوظ رابطہ مکمل نہیں ہو سکا: ", cancel:"منسوخ کریں"
    },
    en: {
      title:"Trusted friend", host:"QR owner phone", guest:"Scanning phone",
      waiting:"Your QR is ready. Waiting for your friend to scan…",
      verifying:"Verifying both device identities securely…",
      saving:"Verified. Saving this friend on this phone automatically…",
      saved:"Verified — friend saved on this phone. No QR is needed next time.",
      disconnected:"The other phone disconnected. Create a fresh QR and try again.",
      error:"Secure pairing could not complete: ", cancel:"Cancel"
    },
    ar: {
      title:"صديق موثوق", host:"هاتف صاحب QR", guest:"الهاتف الماسح",
      waiting:"رمز QR جاهز. بانتظار أن يمسحه صديقك…",
      verifying:"جارٍ التحقق الآمن من هويتي الجهازين…",
      saving:"تم التحقق. جارٍ حفظ الصديق تلقائياً على هذا الهاتف…",
      saved:"تم التحقق — حُفظ الصديق على هذا الهاتف. لن تحتاج إلى QR مرة أخرى.",
      disconnected:"انقطع اتصال الهاتف الآخر. أنشئ رمزاً جديداً وحاول مرة أخرى.",
      error:"تعذر إكمال الاقتران الآمن: ", cancel:"إلغاء"
    }
  };

  let language = document.documentElement.lang || "ur";
  let connection = null;
  let session = null;
  let role = null;
  let busy = false;
  let completed = false;
  const t = () => words[language] || words.en;

  function status(message, kind = "") {
    $("autoPairStatus").textContent = message;
    $("autoPairStatus").dataset.kind = kind;
  }

  function renderLanguage() {
    $("autoPairTitle").textContent = t().title;
    $("autoPairRole").textContent = role === "host" ? t().host : t().guest;
    $("autoPairCancel").textContent = t().cancel;
  }

  async function renderContacts() {
    const list = $("savedFriendsList");
    if (!list || !globalThis.EZERO_CONNECT_TRUST) return;
    try {
      const contacts = await globalThis.EZERO_CONNECT_TRUST.listTrustedContacts();
      const query = $("searchFriends")?.value.trim().toLocaleLowerCase() || "";
      const visible = contacts.filter(contact => contact.status === "TRUSTED" &&
        (!query || contact.displayName.toLocaleLowerCase().includes(query) ||
          contact.remoteFingerprint.toLowerCase().includes(query)));
      list.replaceChildren();
      $("emptyState").hidden = visible.length > 0;
      for (const contact of visible) {
        const item = document.createElement("div");
        item.className = "panel";
        item.style.marginTop = "9px";
        const name = document.createElement("strong");
        name.textContent = contact.displayName || (language === "ar" ? "صديق E-ZERO" : language === "ur" ? "E-ZERO دوست" : "E-ZERO friend");
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
    if (info.remoteFingerprint) $("autoPairFingerprint").textContent = info.remoteFingerprint;
    if (info.state === "WAITING_FOR_FRIEND_TO_SCAN") status(t().waiting);
    else if (info.state === "VERIFYING_BOTH_DEVICES") status(t().verifying);
    else if (info.state === "SAVING_VERIFIED_FRIEND") status(t().saving, "ok");
    else if (info.state === "SAVED") {
      completed = true;
      status(t().saved, "ok");
      $("autoPairCancel").hidden = true;
      renderContacts();
    } else if (info.state === "PEER_DISCONNECTED") status(t().disconnected, "error");
    else if (info.state === "ERROR") status(t().error + (info.error || "PAIRING_V2_FAILED"), "error");
  }

  async function beginPairing({ inviteCode, invitePayload, nextRole }) {
    if (completed || busy) return;
    if (!invitePayload || invitePayload.origin !== location.origin) {
      panel.hidden = false;
      status(t().error + "INVITE_ORIGIN_OR_VERSION_INVALID", "error");
      return;
    }
    if (connection && !connection.closed) connection.close();
    if (session) session.close();
    connection = null;
    session = null;
    role = nextRole;
    busy = true;
    panel.hidden = false;
    renderLanguage();
    status(t().verifying);
    try {
      const config = globalThis.EZERO_CONNECT_CONFIG;
      if (!config || typeof config.signalingUrl !== "string" || !config.signalingUrl) {
        throw new Error("SIGNALING_ENDPOINT_NOT_CONFIGURED");
      }
      const nextConnection = globalThis.EZERO_CONNECT_SIGNAL.connect({
        inviteCode, invitePayload, role: nextRole, signalingBaseUrl: config.signalingUrl
      });
      connection = nextConnection;
      await nextConnection.ready;
      if (connection !== nextConnection) return;
      session = globalThis.EZERO_CONNECT_PAIRING_V2.create({
        connection: nextConnection, invitePayload, role: nextRole, onState: renderState
      });
      renderState({ state: session.state, role: nextRole });
      if (nextRole === "host") {
        document.dispatchEvent(new CustomEvent("ezero:invite-host-ready", { detail: { roomId: invitePayload.roomId } }));
      }
    } catch (error) {
      status(t().error + (error?.message || "SIGNAL_CONNECTION_FAILED"), "error");
      if (nextRole === "host") {
        document.dispatchEvent(new CustomEvent("ezero:invite-host-failed", { detail: { roomId: invitePayload.roomId } }));
      }
    } finally {
      busy = false;
    }
  }

  $("autoPairCancel").addEventListener("click", () => {
    if (session) session.close();
    if (connection && !connection.closed) connection.close();
    status(t().disconnected, "error");
    $("autoPairCancel").hidden = true;
  });

  document.addEventListener("ezero:invite-created", event => {
    const invite = event.detail?.invite;
    if (invite?.inviteCode) beginPairing({ inviteCode: invite.inviteCode, invitePayload: invite, nextRole: "host" });
  });
  document.addEventListener("ezero:invite-verified", event => {
    const verified = event.detail?.verified;
    const inviteCode = event.detail?.inviteCode;
    if (verified && typeof inviteCode === "string") {
      beginPairing({ inviteCode, invitePayload: verified, nextRole: "guest" });
    }
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
