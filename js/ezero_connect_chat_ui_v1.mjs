import { createTrustedFriendMessagingSession } from "./ezero_connect_trusted_friend_session_v1.mjs";

(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const panel = $("chatPanel");
  if (!panel) return;

  const text = {
    ur: {
      title:"محفوظ دوست کے ساتھ چیٹ", waiting:"محفوظ کنکشن بن رہا ہے…",
      peer:"دوست کے آن لائن ہونے کا انتظار ہے…", secure:"محفوظ چیٹ منسلک ہے",
      unavailable:"یہ دوست محفوظ/تصدیق شدہ نہیں؛ چیٹ شروع نہیں کی گئی۔",
      textPlaceholder:"محفوظ پیغام لکھیں…", send:"بھیجیں",
      voice:"وائس ریکارڈ کریں", stop:"ریکارڈنگ روکیں", preview:"وائس سنیں",
      cancel:"منسوخ", sendVoice:"وائس بھیجیں", micDenied:"مائیک کی اجازت نہیں ملی۔",
      recording:"ریکارڈنگ جاری ہے — زیادہ سے زیادہ 12 سیکنڈ",
      tooLarge:"وائس نوٹ حد سے بڑا ہے؛ مختصر ریکارڈ کریں۔",
      sending:"بھیجا جا رہا ہے…", delivered:"محفوظ طور پر وصول ہونے کی تصدیق ہوئی",
      failed:"وصولی کی تصدیق نہیں ملی؛ Delivered نہیں دکھایا گیا۔",
      received:"موصول ہوا", notReady:"پہلے محفوظ دوست کے ساتھ کنکشن بننے دیں۔",
      voiceIncoming:"وائس پیغام", error:"محفوظ چیٹ کنکشن دستیاب نہیں۔",
      noRelation:"اس محفوظ دوست کا relationship ID دستیاب نہیں۔", shareProfile:"اپنی DP محفوظ دوست کو بھیجیں", profileSent:"پروفائل تصویر محفوظ کنکشن پر بھیج دی گئی۔", profileReceived:"دوست کی DP فون میں محفوظ ہو گئی", profileMissing:"پہلے اپنی پروفائل میں تصویر محفوظ کریں۔", profileInvalid:"موصولہ پروفائل تصویر درست نہیں۔"
    },
    en: {
      title:"Chat with saved friend", waiting:"Establishing secure connection…",
      peer:"Waiting for your friend to come online…", secure:"Secure chat connected",
      unavailable:"This friend is not verified and trusted; chat was not started.",
      textPlaceholder:"Write an encrypted message…", send:"Send",
      voice:"Record voice", stop:"Stop recording", preview:"Play voice",
      cancel:"Cancel", sendVoice:"Send voice", micDenied:"Microphone permission was not granted.",
      recording:"Recording — up to 12 seconds",
      tooLarge:"Voice note is too large. Please record a shorter note.",
      sending:"Sending…", delivered:"Authenticated receipt confirmed",
      failed:"No authenticated receipt; not marked Delivered.",
      received:"Received", voiceIncoming:"Voice message",
      notReady:"Wait for a secure connection to the saved friend.",
      error:"Secure chat connection is unavailable.",
      noRelation:"The saved friend relationship ID is unavailable.", shareProfile:"Share my DP with saved friend", profileSent:"Profile photo sent over the secure connection.", profileReceived:"Friend DP saved on this phone", profileMissing:"Save a photo in your profile first.", profileInvalid:"The received profile image is invalid."
    },
    ar: {
      title:"محادثة مع صديق محفوظ", waiting:"جارٍ إنشاء اتصال آمن…",
      peer:"بانتظار اتصال صديقك…", secure:"تم الاتصال بالمحادثة الآمنة",
      unavailable:"هذا الصديق غير موثّق؛ لم تبدأ المحادثة.",
      textPlaceholder:"اكتب رسالة مشفّرة…", send:"إرسال",
      voice:"تسجيل صوت", stop:"إيقاف التسجيل", preview:"تشغيل الصوت",
      cancel:"إلغاء", sendVoice:"إرسال الصوت", micDenied:"لم يتم منح إذن الميكروفون.",
      recording:"جارٍ التسجيل — حتى 12 ثانية",
      tooLarge:"المقطع الصوتي كبير؛ سجّل مقطعاً أقصر.",
      sending:"جارٍ الإرسال…", delivered:"تم تأكيد الاستلام الموثّق",
      failed:"لم يصل تأكيد موثّق؛ لن تظهر حالة تم التسليم.",
      received:"تم الاستلام", voiceIncoming:"رسالة صوتية",
      notReady:"انتظر إنشاء اتصال آمن مع الصديق المحفوظ.",
      error:"اتصال المحادثة الآمنة غير متاح.",
      noRelation:"معرّف علاقة الصديق المحفوظ غير متاح.", shareProfile:"مشاركة صورتي مع الصديق", profileSent:"تم إرسال الصورة عبر الاتصال الآمن.", profileReceived:"تم حفظ صورة الصديق على الهاتف", profileMissing:"احفظ صورة في ملفك الشخصي أولاً.", profileInvalid:"صورة الملف الشخصي المستلمة غير صالحة."
    }
  };

  let language = "ur";
  let session = null;
  let unsubscribe = null;
  let currentFingerprint = null;
  let currentRelationshipId = null;
  let currentFriendName = "";
  let connectionGeneration = 0;
  let recorder = null;
  let cancelRecording = false;
  let stream = null;
  let chunks = [];
  let voiceBlob = null;
  let voiceUrl = null;
  let stopLimit = null;
  let friendAvatarUrl = null;
  const profileSyncPromises = new Map();
  const shareProfileButton = document.createElement("button");
  shareProfileButton.type = "button";
  shareProfileButton.className = "secondary";
  shareProfileButton.disabled = true;
  shareProfileButton.textContent = "اپنی DP محفوظ دوست کو بھیجیں";
  $("chatPanel").querySelector(".chat-tools")?.append(shareProfileButton);
  const friendAvatar = document.createElement("img");
  friendAvatar.alt = "Verified friend profile photo";
  friendAvatar.hidden = true;
  friendAvatar.style.cssText = "width:38px;height:38px;object-fit:cover;border-radius:50%;flex:0 0 38px";
  $("chatTitle")?.parentElement?.insertBefore(friendAvatar, $("chatTitle"));
  const encoder = new TextEncoder();
  const decoder = new TextDecoder("utf-8", { fatal: true });

  const t = key => (text[language] || text.ur)[key] || text.ur[key] || key;
  function status(message, kind = "") {
    const node = $("chatConnectionStatus");
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }
  function secure() { return Boolean(session && session.state === "secure"); }
  function controls() {
    const connected = secure();
    $("chatMessage").disabled = !connected;
    $("sendChatMessage").disabled = !connected;
    $("recordVoice").disabled = !connected || Boolean(recorder);
    $("stopVoice").disabled = !recorder;
    $("sendVoice").disabled = !connected || !voiceBlob;
    shareProfileButton.disabled = !connected;
  }
  function clearVoice() {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    voiceUrl = null;
    voiceBlob = null;
    $("voicePreview").removeAttribute("src");
    $("voicePreview").hidden = true;
    $("sendVoice").disabled = true;
    $("cancelVoice").hidden = true;
  }
  function addMessage(label, body, kind = "received") {
    const row = document.createElement("div");
    row.className = "ezero-chat-message " + kind;
    row.style.cssText = "margin:8px 0;padding:10px 12px;border-radius:13px;background:#f1f7f3;font-size:12px;overflow-wrap:anywhere";
    const content = document.createElement("div");
    content.textContent = body;
    const state = document.createElement("small");
    state.textContent = label;
    state.style.cssText = "display:block;margin-top:5px;color:#718278;font-size:10px";
    row.append(content, state);
    $("chatMessages").append(row);
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
    return state;
  }
  function releaseRecorder() {
    if (stopLimit) clearTimeout(stopLimit);
    stopLimit = null;
    if (stream) for (const track of stream.getTracks()) track.stop();
    stream = null;
    recorder = null;
    controls();
  }
  function closeSession() {
    try { unsubscribe?.(); } catch (_) {}
    unsubscribe = null;
    try { session?.close(); } catch (_) {}
    session = null;
    currentFingerprint = null;
    currentRelationshipId = null;
    controls();
  }
  function showFriendAvatar(bytes) {
    if (friendAvatarUrl) URL.revokeObjectURL(friendAvatarUrl);
    friendAvatarUrl = URL.createObjectURL(new Blob([bytes], { type: "image/jpeg" }));
    friendAvatar.src = friendAvatarUrl;
    friendAvatar.hidden = false;
  }
  async function receive(message, relationshipId, fingerprint, generation) {
    if (!message || !(message.bytes instanceof Uint8Array)) throw new Error("CHAT_INBOUND_FRAME_INVALID");
    if (message.type === "text") {
      const decoded = decoder.decode(message.bytes);
      addMessage(t("received"), decoded, "received");
      return;
    }
    if (message.type === "profile") {
      const bytes = message.bytes;
      if (bytes.length < 4 || bytes.length > 140 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("CHAT_PROFILE_JPEG_INVALID");
      if (relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) throw new Error("CHAT_PROFILE_RELATIONSHIP_CHANGED");
      await globalThis.EZERO_CONNECT_TRUST.saveTrustedFriendProfile(relationshipId, fingerprint, bytes);
      // Persist under the original relationship, but never paint an old friend's
      // delayed profile into a newly selected friend's chat.
      if (generation !== connectionGeneration || relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) return;
      showFriendAvatar(bytes);
      addMessage(t("profileReceived"), "JPEG · " + Math.round(bytes.length / 1024) + " KB", "received");
      return;
    }
    if (message.type === "voice") {
      const blob = new Blob([message.bytes], { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const row = document.createElement("div");
      row.className = "ezero-chat-message received";
      row.style.cssText = "margin:8px 0;padding:10px 12px;border-radius:13px;background:#f1f7f3";
      const label = document.createElement("div");
      label.textContent = t("voiceIncoming");
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = url;
      audio.style.width = "100%";
      row.append(label, audio);
      $("chatMessages").append(row);
      $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
      audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
      return;
    }
    throw new Error("CHAT_INBOUND_TYPE_UNSUPPORTED");
  }

  async function connect(detail) {
    const generation = ++connectionGeneration;
    const fingerprint = detail?.fingerprint;
    const relationshipId = detail?.relationshipId;
    if (!fingerprint || !relationshipId) {
      closeSession();
      panel.hidden = false;
      status(t("noRelation"), "error");
      return;
    }
    if (fingerprint === currentFingerprint && session) return;
    closeSession();
    currentFingerprint = fingerprint;
    currentRelationshipId = relationshipId;
    panel.hidden = false;
    $("chatMessages").replaceChildren();
    if (friendAvatarUrl) URL.revokeObjectURL(friendAvatarUrl);
    friendAvatarUrl = null;
    friendAvatar.hidden = true;
    friendAvatar.removeAttribute("src");
    try {
      const savedProfile = await globalThis.EZERO_CONNECT_TRUST.getTrustedFriendProfile(relationshipId, fingerprint);
      if (generation !== connectionGeneration || currentRelationshipId !== relationshipId || currentFingerprint !== fingerprint) return;
      if (savedProfile.bytes) showFriendAvatar(savedProfile.bytes);
    } catch (_) { /* No saved friend photo yet; keep the name/initials. */ }
    if (generation !== connectionGeneration || currentRelationshipId !== relationshipId || currentFingerprint !== fingerprint) return;
    currentFriendName = String(detail.displayName || "").trim();
    $("chatTitle").textContent = currentFriendName ? currentFriendName + " · " + t("title") : t("title");
    status(t("waiting"));
    try {
      session = createTrustedFriendMessagingSession({
        relationshipId,
        onState: value => {
          if (generation !== connectionGeneration || currentFingerprint !== fingerprint || currentRelationshipId !== relationshipId) return;
          if (value.state === "rendezvous-waiting-for-peer" || value.state === "rendezvous-peer-offline") {
            status(t("peer"));
          } else if (value.state === "transport-secure") {
            status(t("secure"), "ok");
            controls();
            void sendCurrentProfileIfChanged(false).catch(() => status(t("failed"), "error"));
          } else if (value.state === "error" || value.state === "transport-error") {
            status(t("error"), "error");
            controls();
          }
        }
      });
      unsubscribe = session.subscribe(message => receive(message, relationshipId, fingerprint, generation));
      controls();
      await session.ready;
      if (generation !== connectionGeneration || currentFingerprint !== fingerprint || currentRelationshipId !== relationshipId) return;
      status(t("secure"), "ok");
      controls();
      void sendCurrentProfileIfChanged(false).catch(() => status(t("failed"), "error"));
    } catch (_) {
      if (currentFingerprint === fingerprint) {
        closeSession();
        status(t("error"), "error");
        controls();
      }
    }
  }


  async function getOwnProfileBytes() {
    const profile = await globalThis.EZERO_CONNECT_LOCAL_PROFILE?.load?.();
    const dataUrl = String(profile?.avatarDataUrl || "");
    const prefix = "data:image/jpeg;base64,";
    if (!dataUrl.startsWith(prefix) || !/^[A-Za-z0-9+/]+={0,2}$/.test(dataUrl.slice(prefix.length))) return null;
    const binary = atob(dataUrl.slice(prefix.length));
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    if (bytes.length < 4 || bytes.length > 140 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      throw new Error("CHAT_PROFILE_JPEG_INVALID");
    }
    return bytes;
  }

  async function sendCurrentProfileIfChanged(force) {
    const relationshipId = currentRelationshipId;
    const fingerprint = currentFingerprint;
    const activeSession = session;
    const generation = connectionGeneration;
    const syncId = relationshipId;
    if (!syncId) return false;
    if (profileSyncPromises.has(syncId)) return profileSyncPromises.get(syncId);
    const promise = (async () => {
    const stillCurrent = () => generation === connectionGeneration && relationshipId === currentRelationshipId && fingerprint === currentFingerprint && activeSession === session && secure();
    if (!relationshipId || !fingerprint || !activeSession || !stillCurrent()) return false;
    const bytes = await getOwnProfileBytes();
    if (!bytes || !stillCurrent()) return false;
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const trust = globalThis.EZERO_CONNECT_TRUST;
    const previous = await trust.getTrustedFriendProfile(relationshipId, fingerprint);
    if (!stillCurrent()) return false;
    if (!force && previous.lastSharedHash === hash) return false;
    await activeSession.sendProfile(bytes);
    if (!stillCurrent()) return false;
    await trust.setTrustedFriendProfileSharedHash(relationshipId, fingerprint, hash);
    return true;
    })();
    profileSyncPromises.set(syncId, promise);
    try { return await promise; }
    finally { if (profileSyncPromises.get(syncId) === promise) profileSyncPromises.delete(syncId); }
  }

  shareProfileButton.addEventListener("click", async () => {
    if (!secure()) return;
    try {
      shareProfileButton.disabled = true;
      const sent = await sendCurrentProfileIfChanged(true);
      status(sent ? t("profileSent") : t("profileMissing"), sent ? "ok" : "error");
    } catch (_) { status(t("failed"), "error"); } finally { controls(); }
  });

  $("sendChatMessage").addEventListener("click", async () => {
    const value = $("chatMessage").value.trim();
    if (!value || !secure()) return;
    $("sendChatMessage").disabled = true;
    const receipt = addMessage(t("sending"), value, "sent");
    try {
      await session.sendText(value);
      receipt.textContent = t("delivered");
      $("chatMessage").value = "";
    } catch (_) {
      receipt.textContent = t("failed");
    } finally { controls(); }
  });
  $("chatMessage").addEventListener("keydown", event => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      $("sendChatMessage").click();
    }
  });

  $("recordVoice").addEventListener("click", async () => {
    if (!secure() || recorder) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder !== "function") throw new Error("VOICE_RECORDING_UNAVAILABLE");
      clearVoice();
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      recorder = new MediaRecorder(stream, { audioBitsPerSecond: 24000 });
      recorder.addEventListener("dataavailable", event => {
        if (event.data?.size) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const blob = new Blob(chunks, { type: recorder?.mimeType || "audio/webm" });
        const wasCancelled = cancelRecording;
        cancelRecording = false;
        releaseRecorder();
        if (wasCancelled) { chunks = []; clearVoice(); status(t("notReady")); return; }
        if (!blob.size || blob.size > 180 * 1024) {
          clearVoice();
          status(t("tooLarge"), "error");
          return;
        }
        voiceBlob = blob;
        voiceUrl = URL.createObjectURL(blob);
        $("voicePreview").src = voiceUrl;
        $("voicePreview").hidden = false;
        $("cancelVoice").hidden = false;
        $("sendVoice").disabled = !secure();
        status(t("preview"), "ok");
      }, { once: true });
      recorder.start();
      $("stopVoice").disabled = false;
      $("recordVoice").disabled = true;
      $("cancelVoice").hidden = false;
      status(t("recording"));
      stopLimit = setTimeout(() => {
        if (recorder && recorder.state !== "inactive") recorder.stop();
      }, 12_000);
    } catch (_) {
      releaseRecorder();
      status(t("micDenied"), "error");
    }
  });
  $("stopVoice").addEventListener("click", () => {
    if (recorder && recorder.state !== "inactive") recorder.stop();
  });
  $("cancelVoice").addEventListener("click", () => {
    if (recorder && recorder.state !== "inactive") { cancelRecording = true; recorder.stop(); }
    chunks = [];
    clearVoice();
    status(t("notReady"));
  });
  $("sendVoice").addEventListener("click", async () => {
    if (!secure() || !voiceBlob) return;
    const blob = voiceBlob;
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (!bytes.length || bytes.length > 180 * 1024) {
      status(t("tooLarge"), "error");
      return;
    }
    $("sendVoice").disabled = true;
    const receipt = addMessage(t("sending"), t("voiceIncoming"), "sent");
    try {
      await session.sendVoice(bytes);
      receipt.textContent = t("delivered");
      clearVoice();
    } catch (_) {
      receipt.textContent = t("failed");
      controls();
    }
  });

  document.addEventListener("ezero:friend-selected", event => { void connect(event.detail); });
  document.addEventListener("ezero:local-profile-updated", () => { void sendCurrentProfileIfChanged(false).catch(() => status(t("failed"), "error")); });
  document.addEventListener("ezero:language-changed", event => {
    language = ["ur", "en", "ar"].includes(event.detail?.language) ? event.detail.language : "ur";
    $("chatTitle").textContent = currentFriendName ? currentFriendName + " · " + t("title") : t("title");
    $("chatMessage").placeholder = t("textPlaceholder");
    $("sendChatMessage").textContent = t("send");
    $("recordVoice").textContent = t("voice");
    $("stopVoice").textContent = t("stop");
    $("cancelVoice").textContent = t("cancel");
    $("sendVoice").textContent = t("sendVoice");
    shareProfileButton.textContent = t("shareProfile");
  });
  window.addEventListener("pagehide", () => {
    if (recorder && recorder.state !== "inactive") { cancelRecording = true; recorder.stop(); }
    releaseRecorder();
    closeSession();
    clearVoice();
  });
  document.dispatchEvent(new CustomEvent("ezero:language-changed", { detail: { language: "ur" } }));
})();
