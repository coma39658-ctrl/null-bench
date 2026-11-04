/* E-ZERO Secure Connect V0.1 — LOCAL DEVICE PREVIEW ONLY.
 * No calling backend, contact discovery, message transport, signaling,
 * remote network upload, encrypted chat or hidden recording. No save/download.
 * All microphone/camera access requires a direct button click.
 */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const MODES = new Set(["video", "audio", "voice", "qr", "messages", "groups"]);
  const audioPreferences = Object.freeze({
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: { ideal: 1 }
  });
  let activeMode = "video";
  let requestGeneration = 0;
  let videoStream = null, audioStream = null, audioContext = null, meterFrame = null;
  let recorder = null, voiceStream = null, voiceChunks = [], voiceUrl = null, recordLimit = null;
  let voiceGeneration = 0, temporaryIdentity = null;

  function report(id, text) {
    const node = $(id);
    if (node) node.textContent = text;
  }
  function mediaAvailable() {
    return !!(window.isSecureContext && navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function");
  }
  function stopTracks(stream) {
    if (!stream) return;
    try { for (const track of stream.getTracks()) track.stop(); } catch (_) { /* best effort */ }
  }
  function releaseVideo() {
    stopTracks(videoStream);
    videoStream = null;
    if ($("cameraPreview")) $("cameraPreview").srcObject = null;
    if ($("startVideo")) $("startVideo").disabled = false;
    if ($("stopVideo")) $("stopVideo").disabled = true;
  }
  function releaseAudio() {
    if (meterFrame !== null) { cancelAnimationFrame(meterFrame); meterFrame = null; }
    stopTracks(audioStream);
    audioStream = null;
    if (audioContext) { try { audioContext.close(); } catch (_) {} audioContext = null; }
    if ($("micMeter")) $("micMeter").value = 0;
    if ($("startAudio")) $("startAudio").disabled = false;
    if ($("stopAudio")) $("stopAudio").disabled = true;
  }
  function releaseVoice() {
    voiceGeneration += 1;
    if (recordLimit !== null) { clearTimeout(recordLimit); recordLimit = null; }
    if (recorder && recorder.state !== "inactive") {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch (_) {}
    }
    recorder = null;
    stopTracks(voiceStream);
    voiceStream = null;
    voiceChunks = [];
    if (voiceUrl) { URL.revokeObjectURL(voiceUrl); voiceUrl = null; }
    if ($("voicePlayback")) {
      $("voicePlayback").pause();
      $("voicePlayback").removeAttribute("src");
      $("voicePlayback").load();
      $("voicePlayback").hidden = true;
    }
    if ($("recordVoice")) $("recordVoice").disabled = false;
    if ($("finishVoice")) $("finishVoice").disabled = true;
    if ($("clearVoice")) $("clearVoice").disabled = true;
  }
  function releaseAll() {
    requestGeneration += 1;
    releaseVideo();
    releaseAudio();
    releaseVoice();
    temporaryIdentity = null;
    if ($("fingerprint")) $("fingerprint").textContent = "کوئی مستقل شناخت نہیں بنائی گئی۔";
  }
  function selectMode(mode, updateHash) {
    if (!MODES.has(mode)) mode = "video";
    if (activeMode !== mode) releaseAll();
    activeMode = mode;
  for (const button of document.querySelectorAll("button[data-mode]")) {
      const selected = button.getAttribute("data-mode") === mode;
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("active", selected);
    }
    for (const section of document.querySelectorAll("[data-panel]")) {
      section.hidden = section.getAttribute("data-panel") !== mode;
    }
    if (updateHash && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", "#" + mode);
    }
  }
  function qualityRecommendation() {
    // Passive browser hint only; never uploaded, tracked or used to open camera.
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return { mode: "balanced", reason: "نیٹ ورک کی معلومات نہیں ملیں؛ 720p کی ترجیح۔" };
    const type = String(connection.effectiveType || "").toLowerCase();
    const downlink = Number(connection.downlink);
    const constrained = connection.saveData === true ||
      ["slow-2g", "2g", "3g"].includes(type) ||
      (Number.isFinite(downlink) && downlink > 0 && downlink < 1.5);
    return constrained
      ? { mode: "saver", reason: "کم ڈیٹا کا اشارہ ملا؛ 360p کی ترجیح۔" }
      : { mode: "balanced", reason: "نیٹ ورک کا اشارہ مناسب؛ 720p کی ترجیح۔" };
  }
  function updateQualityHint() {
    const selected = $("quality")?.value || "auto";
    const recommended = qualityRecommendation();
    report("autoQualityStatus", selected === "auto"
      ? "خودکار معیار: " + recommended.reason + " یہ صرف کیمرے کی مقامی ترجیح ہے، حقیقی کال نہیں۔"
      : "دستی معیار منتخب: " + selected + "۔ یہ کیمرے کی درخواست ہے؛ حقیقی نتیجہ فون کے مطابق ہوگا۔");
  }
  function cameraConstraints() {
    const q = $("quality").value === "auto" ? qualityRecommendation().mode : $("quality").value;
    const profiles = {
      saver: { width: 640, height: 360, fps: 15 },
      balanced: { width: 1280, height: 720, fps: 30 },
      hd: { width: 1920, height: 1080, fps: 30 }
    };
    const chosen = profiles[q] || profiles.balanced;
    return {
      facingMode: { ideal: "user" },
      width: { ideal: chosen.width },
      height: { ideal: chosen.height },
      frameRate: { ideal: chosen.fps, max: chosen.fps }
    };
  }
  async function startVideoPreview() {
    if (!mediaAvailable()) {
      report("videoStatus", "HTTPS / اجازت یافتہ Chrome میں ہی کیمرہ ٹیسٹ دستیاب ہے۔");
      return;
    }
    releaseVideo();
    const ticket = ++requestGeneration;
    $("startVideo").disabled = true;
    report("videoStatus", "فون سے کیمرہ اور مائک کی اجازت مانگی جا رہی ہے…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(), audio: audioPreferences
      });
      if (activeMode !== "video" || ticket !== requestGeneration) {
        stopTracks(stream);
        return;
      }
      videoStream = stream;
      $("cameraPreview").srcObject = stream;
      try { await $("cameraPreview").play(); } catch (_) {}
      $("stopVideo").disabled = false;
      const settings = stream.getVideoTracks()[0]?.getSettings?.() || {};
      const w = settings.width || "?", h = settings.height || "?";
      report("videoStatus", "✓ مقامی ٹیسٹ جاری ہے: " + w + "×" + h +
        " · یہ اصل کال کی کوالٹی یا کنکشن کی تصدیق نہیں ہے۔");
    } catch (error) {
      report("videoStatus", "ٹیسٹ شروع نہیں ہوا (" + String(error?.name || "ERROR") +
        ")۔ کیمرہ/مائک اجازت اور فون کی دستیابی چیک کریں۔");
      $("startVideo").disabled = false;
    }
  }
  function showMeter() {
    if (!audioStream || !audioContext || activeMode !== "audio") return;
    const analyser = audioContext.__ezeroAnalyser;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const draw = () => {
      if (!audioStream || activeMode !== "audio") return;
      analyser.getByteTimeDomainData(data);
      let squares = 0;
      for (const sample of data) {
        const diff = (sample - 128) / 128;
        squares += diff * diff;
      }
      $("micMeter").value = Math.max(0, Math.min(100, Math.round(Math.sqrt(squares / data.length) * 240)));
      meterFrame = requestAnimationFrame(draw);
    };
    draw();
  }
  async function startAudioTest() {
    if (!mediaAvailable()) {
      report("audioStatus", "یہ براؤزر محفوظ مائک ٹیسٹ نہیں چلا سکتا۔");
      return;
    }
    releaseAudio();
    const ticket = ++requestGeneration;
    $("startAudio").disabled = true;
    report("audioStatus", "صرف مقامی آواز جانچنے کے لیے مائک کی اجازت مانگی جا رہی ہے…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioPreferences, video: false
      });
      if (activeMode !== "audio" || ticket !== requestGeneration) { stopTracks(stream); return; }
      audioStream = stream;
      $("stopAudio").disabled = false;
      const Context = window.AudioContext || window.webkitAudioContext;
      if (Context) {
        audioContext = new Context();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContext.__ezeroAnalyser = analyser;
        showMeter();
      }
      const settings = stream.getAudioTracks()[0]?.getSettings?.() || {};
      report("audioStatus", "✓ مائک مقامی جانچ میں فعال ہے۔ Echo Cancellation: " +
        (settings.echoCancellation === true ? "On" : "فون/براؤزر پر منحصر") +
        " · کوئی فون کال یا سرور اپ لوڈ نہیں ہوا۔");
    } catch (error) {
      report("audioStatus", "مائک ٹیسٹ دستیاب نہیں (" + String(error?.name || "ERROR") +
        ")۔ فون کی اجازت چیک کریں۔");
      $("startAudio").disabled = false;
    }
  }
  function clearVoicePreview() {
    releaseVoice();
    report("voiceStatus", "مقامی ڈرافٹ مٹا دیا گیا۔ کوئی آڈیو اپ لوڈ یا شیئر نہیں ہوئی۔");
  }
  async function startVoiceDraft() {
    if (!mediaAvailable() || typeof window.MediaRecorder !== "function") {
      report("voiceStatus", "اس براؤزر میں محفوظ مقامی وائس ڈرافٹ کی سہولت نہیں۔");
      return;
    }
    releaseVoice();
    const ticket = ++requestGeneration;
    const voiceTicket = voiceGeneration;
    $("recordVoice").disabled = true;
    report("voiceStatus", "وائس ڈرافٹ کے لیے مائک کی اجازت مانگی جا رہی ہے…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioPreferences, video: false
      });
      if (activeMode !== "voice" || ticket !== requestGeneration || voiceTicket !== voiceGeneration) {
        stopTracks(stream); return;
      }
      voiceStream = stream;
      const supported = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"]
        .find(type => window.MediaRecorder.isTypeSupported?.(type));
      recorder = new MediaRecorder(stream, supported ? {
        mimeType: supported, audioBitsPerSecond: 64000
      } : { audioBitsPerSecond: 64000 });
      voiceChunks = [];
      recorder.ondataavailable = event => {
        if (voiceTicket === voiceGeneration && event.data && event.data.size) voiceChunks.push(event.data);
      };
      recorder.onstop = () => {
        stopTracks(voiceStream);
        voiceStream = null;
        if (recordLimit !== null) { clearTimeout(recordLimit); recordLimit = null; }
        if (voiceTicket !== voiceGeneration || activeMode !== "voice") return;
        const audio = new Blob(voiceChunks, { type: recorder?.mimeType || "audio/webm" });
        voiceChunks = [];
        recorder = null;
        $("recordVoice").disabled = false;
        $("finishVoice").disabled = true;
        if (!audio.size) {
          report("voiceStatus", "کوئی قابلِ سماعت ریکارڈنگ تیار نہیں ہوئی۔");
          return;
        }
        voiceUrl = URL.createObjectURL(audio);
        $("voicePlayback").src = voiceUrl;
        $("voicePlayback").hidden = false;
        $("clearVoice").disabled = false;
        report("voiceStatus", "✓ مقامی ڈرافٹ تیار ہے۔ صرف آپ سن سکتے ہیں؛ یہ نہ بھیجا گیا ہے نہ فون کی مستقل فائل بنا ہے۔");
      };
      recorder.onerror = () => {
        report("voiceStatus", "ریکارڈنگ کی خرابی؛ ڈرافٹ مٹانے کا اختیار استعمال کریں۔");
      };
      recorder.start(1000);
      $("finishVoice").disabled = false;
      report("voiceStatus", "● مقامی وائس ڈرافٹ ریکارڈ ہو رہا ہے (زیادہ سے زیادہ 60 سیکنڈ)۔");
      recordLimit = setTimeout(finishVoiceDraft, 60000);
    } catch (error) {
      stopTracks(voiceStream);
      voiceStream = null;
      $("recordVoice").disabled = false;
      report("voiceStatus", "ریکارڈ شروع نہیں ہوا (" + String(error?.name || "ERROR") +
        ")۔ مائک کی اجازت یا براؤزر چیک کریں۔");
    }
  }
  function finishVoiceDraft() {
    if (recorder?.state === "recording") {
      $("finishVoice").disabled = true;
      try { recorder.stop(); }
      catch (_) { clearVoicePreview(); }
    }
  }
  async function makeLocalFingerprint() {
    if (!window.crypto?.subtle || !window.crypto?.getRandomValues || !window.isSecureContext) {
      report("qrStatus", "شناختی تجربے کے لیے محفوظ HTTPS اور Web Crypto ضروری ہے۔");
      return;
    }
    const btn = $("makeFingerprint");
    btn.disabled = true;
    report("qrStatus", "فون میں عارضی چابی اور SHA-256 فنگرپرنٹ بنایا جا رہا ہے…");
    try {
      // Private signing key is non-exportable and kept in volatile page memory only.
      const pair = await window.crypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]
      );
      const publicBytes = await window.crypto.subtle.exportKey("spki", pair.publicKey);
      const fingerprint = await window.crypto.subtle.digest("SHA-256", publicBytes);
      const challenge = new TextEncoder().encode("E-ZERO local signing self-test v0.1");
      const signature = await window.crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" }, pair.privateKey, challenge
      );
      const verified = await window.crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" }, pair.publicKey, signature, challenge
      );
      if (!verified || activeMode !== "qr") throw new Error("LOCAL_SIGNATURE_NOT_VERIFIED");
      temporaryIdentity = pair;
      $("fingerprint").textContent = Array.from(new Uint8Array(fingerprint))
        .map(byte => byte.toString(16).padStart(2, "0")).join("");
      report("qrStatus", "✓ عارضی SHA-256 فنگرپرنٹ اور دستخط کی جانچ مکمل۔ یہ حقیقی اکاؤنٹ نہیں، کسی صارف کو شامل نہیں کرتا، اور ری لوڈ پر ختم ہوجائے گا۔");
    } catch (_) {
      temporaryIdentity = null;
      report("qrStatus", "مقامی شناختی جانچ مکمل نہیں ہوئی؛ کوئی QR یا مستقل شناخت نہیں بنی۔");
    } finally { btn.disabled = false; }
  }

    // Opt-in incoming-call UI demonstration. This is never a real remote call,
  // never runs on a timer or push, and cannot activate a microphone/camera.
  function openIncomingDemo() {
    releaseAll();
    const dialog = $("incomingCallDemo");
    if (!dialog) return;
    report("incomingDemoStatus", "یہ صرف نمونہ ہے؛ کوئی حقیقی کال نہیں۔ آڈیو، ویڈیو یا مسترد دبائیں۔");
    dialog.hidden = false;
    document.body.classList.add("incoming-open");
    $("demoAcceptAudio")?.focus();
  }
  function closeIncomingDemo() {
    const dialog = $("incomingCallDemo");
    if (!dialog || dialog.hidden) return;
    dialog.hidden = true;
    document.body.classList.remove("incoming-open");
    $("previewIncomingCall")?.focus();
  }
  function demoChoice(choice) {
    const texts = {
      audio: "نمونہ: آڈیو قبول کرنے کا بٹن درست ہے۔ کوئی کال، مائک، سرور یا ریکارڈنگ شروع نہیں ہوئی۔",
      video: "نمونہ: ویڈیو قبول کرنے کا بٹن درست ہے۔ کیمرہ اور مائک دونوں بند ہیں؛ حقیقی کال نہیں ہوئی۔",
      decline: "نمونہ: کال مسترد کرنے کا بٹن درست ہے۔ کوئی رابطہ قائم نہیں ہوا۔"
    };
    report("incomingDemoStatus", texts[choice] || "صرف نمونہ۔");
  }
  $("previewIncomingCall")?.addEventListener("click", openIncomingDemo);
  $("demoAcceptAudio")?.addEventListener("click", () => demoChoice("audio"));
  $("demoAcceptVideo")?.addEventListener("click", () => demoChoice("video"));
  $("demoDecline")?.addEventListener("click", () => demoChoice("decline"));
  $("demoClose")?.addEventListener("click", closeIncomingDemo);
  document.addEventListener("keydown", event => {
    const dialog = $("incomingCallDemo");
    if (!dialog || dialog.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); closeIncomingDemo(); }
    if (event.key !== "Tab") return;
    const buttons = Array.from(dialog.querySelectorAll("button:not([disabled])"));
    if (!buttons.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  });
  $("quality")?.addEventListener("change", updateQualityHint);
  const networkHint = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  networkHint?.addEventListener?.("change", updateQualityHint);
  updateQualityHint();

  for (const button of document.querySelectorAll("button[data-mode]")) {
    button.addEventListener("click", () => selectMode(button.getAttribute("data-mode"), true));
  }
  $("startVideo").addEventListener("click", startVideoPreview);
  $("stopVideo").addEventListener("click", () => { requestGeneration++; releaseVideo(); report("videoStatus", "کیمرہ اور مائک بند کر دیے گئے۔"); });
  $("startAudio").addEventListener("click", startAudioTest);
  $("stopAudio").addEventListener("click", () => { requestGeneration++; releaseAudio(); report("audioStatus", "مائک بند کر دیا گیا۔"); });
  $("recordVoice").addEventListener("click", startVoiceDraft);
  $("finishVoice").addEventListener("click", finishVoiceDraft);
  $("clearVoice").addEventListener("click", clearVoicePreview);
  $("makeFingerprint").addEventListener("click", makeLocalFingerprint);
  window.addEventListener("hashchange", () => selectMode(location.hash.slice(1), false));
  window.addEventListener("pagehide", releaseAll);
  window.addEventListener("pagehide", closeIncomingDemo);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      requestGeneration++;
      releaseVideo(); releaseAudio(); releaseVoice();
    }
  });
  selectMode(location.hash.slice(1), false);
})();
