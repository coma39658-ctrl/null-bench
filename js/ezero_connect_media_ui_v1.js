(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const list = $("savedFriendsList");
  const audioButton = $("audioCall");
  const videoButton = $("videoCall");
  const statusBox = $("callStatus");
  if (!list || !audioButton || !videoButton || !statusBox) return;

  let manager = null;
  let selectedFingerprint = null;
  let selectedName = "";
  let initialized = false;
  let busy = false;
  let callPanel = null;
  let mediaElement = null;

  const language = () => document.documentElement.lang || "ur";
  const words = {
    ur: {
      select:"کال کے لیے منتخب کریں", selected:"منتخب دوست", idle:"دوست منتخب کریں",
      connecting:"محفوظ کال رابطہ قائم ہو رہا ہے…", calling:"کال کی دعوت بھیجی جا رہی ہے…",
      incoming:"کی طرف سے آنے والی کال", accept:"کال قبول کریں", decline:"مسترد کریں",
      hangup:"کال بند کریں", mic:"مائیک کی اجازت درکار ہے۔", unavailable:"دوست اس وقت آن لائن نہیں یا رابطہ دستیاب نہیں۔",
      busy:"دوست پہلے سے کال پر ہے۔", failed:"کال شروع نہیں ہو سکی: ", ended:"کال ختم ہو گئی۔",
      audio:"آڈیو کال", video:"ویڈیو کال", accepted:"کال قبول ہو گئی؛ محفوظ میڈیا رابطہ بن رہا ہے…",
      connected:"کال منسلک ہو گئی۔", waiting:"دوست کے میڈیا رابطے کا انتظار ہے…"
    },
    en: {
      select:"Select for call", selected:"Selected friend", idle:"Choose a friend",
      connecting:"Connecting securely…", calling:"Sending call invitation…",
      incoming:"Incoming call from", accept:"Accept call", decline:"Decline",
      hangup:"End call", mic:"Microphone permission is required.", unavailable:"Friend is offline or unreachable.",
      busy:"Friend is already on a call.", failed:"Call could not start: ", ended:"Call ended.",
      audio:"Audio call", video:"Video call", accepted:"Call accepted; establishing secure media…",
      connected:"Call connected.", waiting:"Waiting for friend's media connection…"
    },
    ar: {
      select:"اختيار للاتصال", selected:"الصديق المحدد", idle:"اختر صديقاً",
      connecting:"جارٍ إنشاء اتصال آمن…", calling:"جارٍ إرسال دعوة الاتصال…",
      incoming:"مكالمة واردة من", accept:"قبول المكالمة", decline:"رفض",
      hangup:"إنهاء المكالمة", mic:"يلزم السماح باستخدام الميكروفون.", unavailable:"الصديق غير متصل أو لا يمكن الوصول إليه.",
      busy:"الصديق في مكالمة أخرى.", failed:"تعذر بدء المكالمة: ", ended:"انتهت المكالمة.",
      audio:"مكالمة صوتية", video:"مكالمة فيديو", accepted:"تم قبول المكالمة؛ جارٍ إنشاء اتصال الوسائط الآمن…",
      connected:"المكالمة متصلة.", waiting:"بانتظار اتصال الوسائط لدى الصديق…"
    }
  };
  const t = () => words[language()] || words.en;
  function setStatus(message, kind = "") {
    statusBox.textContent = message;
    statusBox.dataset.kind = kind;
  }
  function updateButtons() {
    audioButton.disabled = !selectedFingerprint || busy;
    videoButton.disabled = !selectedFingerprint || busy;
  }
  function removeCallPanel() {
    if (callPanel) callPanel.remove();
    callPanel = null;
  }
  function addCallPanel(title, actions) {
    removeCallPanel();
    callPanel = document.createElement("section");
    callPanel.className = "panel";
    callPanel.id = "ezeroActiveCallPanel";
    const heading = document.createElement("strong");
    heading.textContent = title;
    const actionRow = document.createElement("div");
    actionRow.className = "actions";
    for (const action of actions) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = action.primary ? "primary" : "secondary";
      button.textContent = action.label;
      button.addEventListener("click", action.run);
      actionRow.append(button);
    }
    callPanel.append(heading, actionRow);
    $("audioCall").closest(".panel").after(callPanel);
  }
  function removeRemoteMedia() {
    if (mediaElement) {
      try { mediaElement.pause(); } catch (_) {}
      mediaElement.srcObject = null;
      mediaElement.remove();
      mediaElement = null;
    }
  }
  function showRemoteMedia(stream, info) {
    removeRemoteMedia();
    mediaElement = document.createElement(info.mode === "video" ? "video" : "audio");
    mediaElement.autoplay = true;
    mediaElement.playsInline = true;
    if (info.mode === "video") {
      mediaElement.controls = true;
      mediaElement.style.width = "100%";
      mediaElement.style.maxHeight = "52dvh";
      mediaElement.style.borderRadius = "14px";
      mediaElement.style.background = "#10291f";
    }
    mediaElement.srcObject = stream;
    callPanel?.append(mediaElement);
    mediaElement.play().catch(() => setStatus("آواز/ویڈیو چلانے کے لیے اسکرین پر Play دبائیں۔", "warning"));
  }
  function statusHandler(event) {
    const state = event.state;
    if (state === "inbox-listening") setStatus(t().connecting, "ok");
    else if (state === "calling" || state === "call-invite-sent") setStatus(t().calling);
    else if (state === "call-accepted" || state === "room-connected" || state === "peer-verified") setStatus(t().accepted, "ok");
    else if (state === "waiting-for-friend-media" || state === "waiting-for-offer") setStatus(t().waiting);
    else if (state === "media-connected") setStatus(t().connected, "ok");
    else if (state === "unavailable" || state === "busy") {
      setStatus(state === "busy" ? t().busy : t().unavailable, "error");
      busy = false; updateButtons(); removeCallPanel(); removeRemoteMedia();
    } else if (state === "media-error") {
      setStatus(t().failed + (event.error || "MEDIA_ERROR"), "error");
      busy = false; updateButtons(); removeCallPanel(); removeRemoteMedia();
    } else if (state === "media-route-failed") {
      setStatus("اس نیٹ ورک پر براہِ راست میڈیا راستہ نہیں ملا؛ TURN ریلے ابھی دستیاب نہیں۔", "error");
    } else if (state === "call-declined" || state === "call-ended") {
      setStatus(t().ended); busy = false; updateButtons(); removeCallPanel(); removeRemoteMedia();
    } else if (state === "media-disconnected" || state === "media-closed") {
      setStatus(t().ended); busy = false; updateButtons(); removeCallPanel(); removeRemoteMedia();
    }
  }

  function initialize() {
    if (initialized || !globalThis.EZERO_CONNECT_MEDIA || !globalThis.EZERO_CONNECT_IDENTITY) return;
    initialized = true;
    manager = globalThis.EZERO_CONNECT_MEDIA.createManager({
      onStatus: statusHandler,
      onRemoteStream: showRemoteMedia,
      onCallEnded: () => {
        busy = false;
        updateButtons();
        removeCallPanel();
        removeRemoteMedia();
      },
      onIncomingCall: incoming => {
        busy = true;
        updateButtons();
        addCallPanel(t().incoming + " " + (incoming.peerName || incoming.callId), [
          { label: t().accept, primary: true, run: async () => {
            try {
              await incoming.accept();
              setStatus(t().accepted, "ok");
              addCallPanel(t().accepted, [{ label: t().hangup, run: () => manager.hangup() }]);
            } catch (error) {
              setStatus(t().failed + (error.message || "ACCEPT_FAILED"), "error");
              busy = false; updateButtons(); removeCallPanel();
            }
          }},
          { label: t().decline, run: () => {
            incoming.decline();
            busy = false; updateButtons(); removeCallPanel();
          }}
        ]);
      }
    });
    manager.listen().catch(error => {
      setStatus(t().failed + (error.message || "INBOX_CONNECT_FAILED"), "error");
      initialized = false;
    });
  }

  list.addEventListener("click", event => {
    const button = event.target.closest("button[data-ezero-select-friend='true']");
    if (!button) return;
    selectedFingerprint = button.dataset.fingerprint;
    selectedName = button.parentElement?.querySelector("strong")?.textContent || "";
    list.querySelectorAll("button[data-ezero-select-friend='true']").forEach(item => {
      item.textContent = item === button ? (language() === "en" ? "Selected" : language() === "ar" ? "محدد" : "منتخب") : t().select;
      item.setAttribute("aria-pressed", String(item === button));
    });
    setStatus(t().selected + ": " + selectedName, "ok");
    updateButtons();
  });

  async function startCall(mode) {
    if (!manager || !selectedFingerprint || busy) return;
    busy = true;
    updateButtons();
    setStatus(t().calling);
    addCallPanel((mode === "video" ? t().video : t().audio) + " · " + selectedName, [
      { label: t().hangup, run: () => manager.hangup() }
    ]);
    try {
      await manager.call({ recipientFingerprint: selectedFingerprint, mode });
    } catch (error) {
      setStatus(t().failed + (error.message || "CALL_FAILED"), "error");
      busy = false; updateButtons(); removeCallPanel();
    }
  }
  audioButton.addEventListener("click", () => startCall("audio"));
  videoButton.addEventListener("click", () => startCall("video"));

  document.addEventListener("ezero:identity-ready", initialize);
  document.addEventListener("ezero:language-changed", () => {
    if (selectedFingerprint) setStatus(t().selected + ": " + selectedName);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !initialized && globalThis.EZERO_CONNECT_IDENTITY) {
      globalThis.EZERO_CONNECT_IDENTITY.load().then(info => { if (info) initialize(); }).catch(() => {});
    }
  });
  window.addEventListener("pagehide", () => { try { manager?.dispose(); } catch (_) {} });
  globalThis.EZERO_CONNECT_IDENTITY?.load?.().then(info => {
    if (info) initialize();
  }).catch(() => {});
  updateButtons();
})();