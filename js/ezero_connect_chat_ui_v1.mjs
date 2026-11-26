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
      voiceIncoming:"وائس پیغام", error:"محفوظ چیٹ کنکشن دستیاب نہیں۔", historyUnavailable:"پیغامات اس فون میں محفوظ نہیں ہو سکے۔",
      noRelation:"اس محفوظ دوست کا relationship ID دستیاب نہیں۔", shareProfile:"اپنی DP محفوظ دوست کو بھیجیں", profileSent:"پروفائل تصویر محفوظ کنکشن پر بھیج دی گئی۔", profileReceived:"دوست کی DP فون میں محفوظ ہو گئی", profileMissing:"پہلے اپنی پروفائل میں تصویر محفوظ کریں۔", profileInvalid:"موصولہ پروفائل تصویر درست نہیں۔", callReady:"محفوظ دوست کال کے لیے تیار ہے۔", callOutgoing:"دوست کو کال کی دعوت بھیجی جا رہی ہے…", callIncoming:"آپ کے محفوظ دوست کی کال آ رہی ہے۔", callAccepted:"کال قبول ہو گئی؛ رابطہ بن رہا ہے…", callConnected:"کال منسلک ہے۔", callDeclined:"کال مسترد کر دی گئی۔", callExpired:"کال کی دعوت کی مدت ختم ہو گئی۔", callEnded:"کال ختم ہو گئی۔", callFailed:"کال منسلک نہیں ہو سکی۔", acceptCall:"کال قبول کریں", declineCall:"کال مسترد کریں", hangupCall:"کال ختم کریں", incomingCallLabel:"آنے والی کال"
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
      error:"Secure chat connection is unavailable.", historyUnavailable:"Chat history could not be saved on this device.",
      noRelation:"The saved friend relationship ID is unavailable.", shareProfile:"Share my DP with saved friend", profileSent:"Profile photo sent over the secure connection.", profileReceived:"Friend DP saved on this phone", profileMissing:"Save a photo in your profile first.", profileInvalid:"The received profile image is invalid.", callReady:"Your saved friend is ready to call.", callOutgoing:"Calling your friend…", callIncoming:"Incoming call from your saved friend.", callAccepted:"Call accepted; connecting…", callConnected:"Call connected.", callDeclined:"Call declined.", callExpired:"Call invitation expired.", callEnded:"Call ended.", callFailed:"The call could not connect.", acceptCall:"Accept call", declineCall:"Decline call", hangupCall:"End call", incomingCallLabel:"Incoming call"
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
      error:"اتصال المحادثة الآمنة غير متاح.", historyUnavailable:"تعذر حفظ سجل المحادثة على هذا الهاتف.",
      noRelation:"معرّف علاقة الصديق المحفوظ غير متاح.", shareProfile:"مشاركة صورتي مع الصديق", profileSent:"تم إرسال الصورة عبر الاتصال الآمن.", profileReceived:"تم حفظ صورة الصديق على الهاتف", profileMissing:"احفظ صورة في ملفك الشخصي أولاً.", profileInvalid:"صورة الملف الشخصي المستلمة غير صالحة.", callReady:"صديقك المحفوظ جاهز للاتصال.", callOutgoing:"جارٍ الاتصال بصديقك…", callIncoming:"مكالمة واردة من صديقك المحفوظ.", callAccepted:"تم قبول المكالمة؛ جارٍ الاتصال…", callConnected:"المكالمة متصلة.", callDeclined:"تم رفض المكالمة.", callExpired:"انتهت صلاحية دعوة المكالمة.", callEnded:"انتهت المكالمة.", callFailed:"تعذر الاتصال بالمكالمة.", acceptCall:"قبول المكالمة", declineCall:"رفض المكالمة", hangupCall:"إنهاء المكالمة", incomingCallLabel:"مكالمة واردة"
    }
  };

  let language = "ur";
  let session = null;
  let callController = null;
  let callState = "idle";
  let activeCallMode = null;
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
  const messageAudioUrls = new Set();
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
  function callStatus(message, kind = "") {
    const node = $("callStatus");
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }
  function clearCallMedia() {
    for (const id of ["remoteCallVideo", "localCallVideo", "remoteCallAudio"]) {
      const node = $(id);
      if (node) { try { node.pause?.(); } catch (_) {} node.srcObject = null; }
    }
    if ($("remoteCallVideo")) $("remoteCallVideo").hidden = true;
    if ($("localCallVideo")) $("localCallVideo").hidden = true;
    if ($("callMediaStage")) $("callMediaStage").hidden = true;
  }
  function handleCallState(value) {
    callState = value?.state || "idle";
    if (value?.mode) activeCallMode = value.mode;
    if (["ended", "declined", "expired", "failed", "closed"].includes(callState)) {
      activeCallMode = null;
      clearCallMedia();
    }
    const labels = {
      ready:"callReady", outgoing:"callOutgoing", incoming:"callIncoming",
      accepted:"callAccepted", "starting-media":"callAccepted", connected:"callConnected",
      declined:"callDeclined", expired:"callExpired", ended:"callEnded",
      failed:"callFailed", error:"callFailed", "media-error":"callFailed"
    };
    const key = labels[callState];
    if (key) callStatus(t(key), ["failed","error","media-error"].includes(callState) ? "error" : callState === "connected" || callState === "ready" ? "ok" : "");
    if (callState === "incoming") $("incomingCallLabel").textContent = t("incomingCallLabel") + (currentFriendName ? " · " + currentFriendName : "");
    const activeLabel = { ready:"callReady", outgoing:"callOutgoing", incoming:"callIncoming", accepted:"callAccepted", "starting-media":"callAccepted", connected:"callConnected", declined:"callDeclined", expired:"callExpired", ended:"callEnded", failed:"callFailed" }[callState];
    if (activeLabel) callStatus(t(activeLabel), callState === "failed" ? "error" : "");
    controls();
  }
  function controls() {
    const connected = secure();
    $("chatMessage").disabled = !connected;
    $("sendChatMessage").disabled = !connected;
    $("recordVoice").disabled = !connected || Boolean(recorder);
    $("stopVoice").disabled = !recorder;
    $("sendVoice").disabled = !connected || !voiceBlob;
    shareProfileButton.disabled = !connected;
    const callReady = connected && Boolean(callController) && !callController.callId && !["error","closed","verifying"].includes(callState);
    $("audioCall").disabled = !callReady;
    $("videoCall").disabled = !callReady;
    $("acceptIncomingCall").disabled = !callController || callState !== "incoming";
    $("declineIncomingCall").disabled = !callController || callState !== "incoming";
    $("hangupCall").disabled = !callController || !["outgoing","accepted","starting-media","connected"].includes(callState);
    $("acceptIncomingCall").hidden = callState !== "incoming";
    $("declineIncomingCall").hidden = callState !== "incoming";
    $("hangupCall").hidden = !["outgoing","accepted","starting-media","connected"].includes(callState);
    $("incomingCallActions").hidden = callState !== "incoming" && $("hangupCall").hidden;
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
  function messageMetaText(label, createdAt) {
    const locale = language === "ar" ? "ar-SA" : language === "en" ? "en-SA" : "ur-SA";
    const time = new Date(createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return label + " · " + time;
  }
  function addMessage(label, body, kind = "received", createdAt = Date.now()) {
    const row = document.createElement("div");
    row.className = "ezero-chat-message " + kind;
    row.style.cssText = "margin:8px 0;padding:10px 12px;border-radius:13px;background:#f1f7f3;font-size:12px;overflow-wrap:anywhere";
    const content = document.createElement("div");
    content.textContent = body;
    const state = document.createElement("small");
    state.textContent = messageMetaText(label, createdAt);
    state.style.cssText = "display:block;margin-top:5px;color:#718278;font-size:10px";
    row.append(content, state);
    $("chatMessages").append(row);
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
    return state;
  }
  function addVoiceMessage(label, source, kind = "received", createdAt = Date.now()) {
    const blob = source instanceof Blob ? source : new Blob([source], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    messageAudioUrls.add(url);
    const row = document.createElement("div");
    row.className = "ezero-chat-message " + kind;
    row.style.cssText = "margin:8px 0;padding:10px 12px;border-radius:13px;background:#f1f7f3";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = url;
    audio.style.width = "100%";
    const state = document.createElement("small");
    state.textContent = messageMetaText(label, createdAt);
    state.style.cssText = "display:block;margin-top:5px;color:#718278;font-size:10px";
    row.append(audio, state);
    $("chatMessages").append(row);
    $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
    return state;
  }
  function clearRenderedMessages() {
    for (const url of messageAudioUrls) URL.revokeObjectURL(url);
    messageAudioUrls.clear();
    clearRenderedMessages();
  }
  function renderStoredMessage(record) {
    const label = record.direction === "incoming" ? t("received")
      : record.status === "delivered" ? t("delivered")
      : record.status === "failed" ? t("failed") : t("sending");
    const kind = record.direction === "outgoing" ? "sent" : "received";
    if (record.type === "text") {
      addMessage(label, decoder.decode(record.bytes), kind, record.createdAt);
    } else if (record.type === "voice") {
      addVoiceMessage(label, record.bytes, kind, record.createdAt);
    }
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
    try { callController?.close(); } catch (_) {}
    callController = null;
    callState = "idle";
    callStatus(t("callReady"));
    activeCallMode = null;
    clearCallMedia();
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
    // Ignore late frames from a previously selected friend before rendering any message type.
    if (generation !== connectionGeneration || relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) return;
    if (message.type === "text") {
      const createdAt = Date.now();
      await globalThis.EZERO_CONNECT_TRUST.saveTrustedMessage(relationshipId, fingerprint, {
        messageId: message.messageId, type: "text", direction: "incoming",
        status: "received", createdAt, bytes: message.bytes
      });
      if (generation !== connectionGeneration || relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) return;
      const decoded = decoder.decode(message.bytes);
      addMessage(t("received"), decoded, "received", createdAt);
      return;
    }
    if (message.type === "profile") {
      const bytes = message.bytes;
      if (bytes.length < 4 || bytes.length > 140 * 1024 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) throw new Error("CHAT_PROFILE_JPEG_INVALID");
      if (relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) throw new Error("CHAT_PROFILE_RELATIONSHIP_CHANGED");
      await globalThis.EZERO_CONNECT_TRUST.saveTrustedFriendProfile(relationshipId, fingerprint, bytes);
      document.dispatchEvent(new CustomEvent("ezero:friend-profile-updated", {
        detail: { relationshipId, fingerprint }
      }));
      // Persist under the original relationship, but never paint an old friend's
      // delayed profile into a newly selected friend's chat.
      if (generation !== connectionGeneration || relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) return;
      showFriendAvatar(bytes);
      addMessage(t("profileReceived"), "JPEG · " + Math.round(bytes.length / 1024) + " KB", "received");
      return;
    }
    if (message.type === "voice") {
      const createdAt = Date.now();
      await globalThis.EZERO_CONNECT_TRUST.saveTrustedMessage(relationshipId, fingerprint, {
        messageId: message.messageId, type: "voice", direction: "incoming",
        status: "received", createdAt, bytes: message.bytes
      });
      if (generation !== connectionGeneration || relationshipId !== currentRelationshipId || fingerprint !== currentFingerprint) return;
      addVoiceMessage(t("voiceIncoming"), message.bytes, "received", createdAt);
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
    try {
      const history = await globalThis.EZERO_CONNECT_TRUST.listTrustedMessages(relationshipId, fingerprint, 100);
      if (generation !== connectionGeneration || currentRelationshipId !== relationshipId || currentFingerprint !== fingerprint) return;
      for (const record of history) renderStoredMessage(record);
    } catch (_) {
      status(t("historyUnavailable"), "error");
    }
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
      callController = await session.createCallController({
        onState: handleCallState,
        onLocalStream: localStream => {
          if (activeCallMode === "video") {
            $("localCallVideo").srcObject = localStream;
            $("localCallVideo").hidden = false;
            $("callMediaStage").hidden = false;
          }
        },
        onRemoteStream: remoteStream => {
          $("remoteCallAudio").srcObject = remoteStream;
          if (activeCallMode === "video") {
            $("remoteCallVideo").srcObject = remoteStream;
            $("remoteCallVideo").hidden = false;
          }
          $("callMediaStage").hidden = false;
        }
      });
      await callController.ready;
      if (generation !== connectionGeneration || currentFingerprint !== fingerprint || currentRelationshipId !== relationshipId) {
        callController.close();
        callController = null;
        return;
      }
      status(t("secure"), "ok");
      callStatus(t("callReady"), "ok");
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
    const existing = profileSyncPromises.get(syncId);
    if (existing) {
      // Coalesce rapid profile edits, but never lose the newest saved photo.
      existing.dirty = true;
      return existing.promise;
    }
    const syncState = { dirty: false, promise: null };
    const promise = (async () => {
      const stillCurrent = () => generation === connectionGeneration && relationshipId === currentRelationshipId && fingerprint === currentFingerprint && activeSession === session && secure();
      if (!relationshipId || !fingerprint || !activeSession || !stillCurrent()) return false;
      let shouldForce = Boolean(force);
      let sent = false;
      do {
        syncState.dirty = false;
        const bytes = await getOwnProfileBytes();
        if (!bytes || !stillCurrent()) return sent;
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        const trust = globalThis.EZERO_CONNECT_TRUST;
        const previous = await trust.getTrustedFriendProfile(relationshipId, fingerprint);
        if (!stillCurrent()) return sent;
        if (shouldForce || previous.lastSharedHash !== hash) {
          await activeSession.sendProfile(bytes);
          if (!stillCurrent()) return sent;
          await trust.setTrustedFriendProfileSharedHash(relationshipId, fingerprint, hash);
          sent = true;
        }
        shouldForce = false;
      } while (syncState.dirty && stillCurrent());
      return sent;
    })();
    syncState.promise = promise;
    profileSyncPromises.set(syncId, syncState);
    try { return await promise; }
    finally { if (profileSyncPromises.get(syncId) === syncState) profileSyncPromises.delete(syncId); }
  }

  shareProfileButton.addEventListener("click", async () => {
    if (!secure()) return;
    try {
      shareProfileButton.disabled = true;
      const sent = await sendCurrentProfileIfChanged(true);
      status(sent ? t("profileSent") : t("profileMissing"), sent ? "ok" : "error");
    } catch (_) { status(t("failed"), "error"); } finally { controls(); }
  });

  $("audioCall").addEventListener("click", async () => {
    if (!callController || !secure()) return;
    try { await callController.call("audio"); } catch (_) { callStatus(t("callFailed"), "error"); }
  });
  $("videoCall").addEventListener("click", async () => {
    if (!callController || !secure()) return;
    try { await callController.call("video"); } catch (_) { callStatus(t("callFailed"), "error"); }
  });
  $("acceptIncomingCall").addEventListener("click", async () => {
    if (!callController) return;
    try { await callController.accept(); } catch (_) { callStatus(t("callFailed"), "error"); }
  });
  $("declineIncomingCall").addEventListener("click", async () => {
    if (!callController) return;
    try { await callController.decline(); } catch (_) { callStatus(t("callFailed"), "error"); }
  });
  $("hangupCall").addEventListener("click", () => { callController?.hangup(); });

  $("sendChatMessage").addEventListener("click", async () => {
    const value = $("chatMessage").value.trim();
    if (!value || !secure()) return;
    $("sendChatMessage").disabled = true;
    const messageId = crypto.randomUUID().replaceAll("-", "");
    const createdAt = Date.now();
    const bytes = encoder.encode(value);
    let receipt = null;
    try {
      await globalThis.EZERO_CONNECT_TRUST.saveTrustedMessage(currentRelationshipId, currentFingerprint, {
        messageId, type: "text", direction: "outgoing", status: "sending", createdAt, bytes
      });
      receipt = addMessage(t("sending"), value, "sent", createdAt);
      try {
        await session.sendText(value);
        receipt.textContent = messageMetaText(t("delivered"), createdAt);
        $("chatMessage").value = "";
        try { await globalThis.EZERO_CONNECT_TRUST.updateTrustedMessageStatus(currentRelationshipId, currentFingerprint, messageId, "delivered"); }
        catch (_) { status(t("historyUnavailable"), "error"); }
      } catch (_) {
        try { await globalThis.EZERO_CONNECT_TRUST.updateTrustedMessageStatus(currentRelationshipId, currentFingerprint, messageId, "failed"); } catch (_) {}
        receipt.textContent = messageMetaText(t("failed"), createdAt);
      }
    } catch (_) {
      status(t("historyUnavailable"), "error");
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
    const messageId = crypto.randomUUID().replaceAll("-", "");
    const createdAt = Date.now();
    let receipt = null;
    try {
      await globalThis.EZERO_CONNECT_TRUST.saveTrustedMessage(currentRelationshipId, currentFingerprint, {
        messageId, type: "voice", direction: "outgoing", status: "sending", createdAt, bytes
      });
      receipt = addVoiceMessage(t("sending"), blob, "sent", createdAt);
      try {
        await session.sendVoice(bytes);
        receipt.textContent = messageMetaText(t("delivered"), createdAt);
        clearVoice();
        try { await globalThis.EZERO_CONNECT_TRUST.updateTrustedMessageStatus(currentRelationshipId, currentFingerprint, messageId, "delivered"); }
        catch (_) { status(t("historyUnavailable"), "error"); }
      } catch (_) {
        try { await globalThis.EZERO_CONNECT_TRUST.updateTrustedMessageStatus(currentRelationshipId, currentFingerprint, messageId, "failed"); } catch (_) {}
        receipt.textContent = messageMetaText(t("failed"), createdAt);
        controls();
      }
    } catch (_) {
      status(t("historyUnavailable"), "error");
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
    $("acceptIncomingCall").textContent = t("acceptCall");
    $("declineIncomingCall").textContent = t("declineCall");
    $("hangupCall").textContent = t("hangupCall");
    if (callState === "incoming") $("incomingCallLabel").textContent = t("incomingCallLabel") + (currentFriendName ? " · " + currentFriendName : "");
  });
  window.addEventListener("pagehide", () => {
    if (recorder && recorder.state !== "inactive") { cancelRecording = true; recorder.stop(); }
    releaseRecorder();
    closeSession();
    clearVoice();
    for (const url of messageAudioUrls) URL.revokeObjectURL(url);
    messageAudioUrls.clear();
  });
  document.dispatchEvent(new CustomEvent("ezero:language-changed", { detail: { language: "ur" } }));
})();
