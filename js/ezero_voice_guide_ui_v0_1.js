/*
 * E-ZERO Voice Guide — Public UI Logic V0.1
 *
 * Deterministic website guidance using only
 * window.EZERO_VOICE_GUIDE_KNOWLEDGE.
 */

(function () {
  "use strict";

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function currentLanguage() {
    const selector =
      document.getElementById("languageSelect");

    if (selector && selector.value) {
      return selector.value;
    }

    const lang =
      (document.documentElement.lang || "en").toLowerCase();

    return lang || "en";
  }

  function knowledgeI18nKey(entryId) {
    const map = {
      ezero_overview: "global_modules_intro",
      null_bench: "null_public_tool_note",
      vehicle_obd: "vehicle_intro",
      industrial: "industrial_intro",
      fleet: "fleet_section_title",
      benchmark006c: "benchmark006c_intro",
      adaptive_decision_lab: "adaptive_decision_lab_intro",
      evidence: "evidence_section_intro",
      condition_status: "claims_follow_evidence_text"
    };

    return map[entryId] || null;
  }

  function knowledgeTextFromI18n(entry, language) {
    const key = knowledgeI18nKey(entry && entry.id);
    const i18n = window.EZERO_I18N;

    if (
      key &&
      i18n &&
      i18n[language] &&
      typeof i18n[language][key] === "string" &&
      i18n[language][key].trim()
    ) {
      return i18n[language][key];
    }

    if (entry) {
      if (
        typeof entry[language] === "string" &&
        entry[language].trim()
      ) {
        return entry[language];
      }

      if (
        language === "ur" &&
        typeof entry.ur === "string" &&
        entry.ur.trim()
      ) {
        return entry.ur;
      }

      if (
        typeof entry.en === "string" &&
        entry.en.trim()
      ) {
        return entry.en;
      }
    }

    return "";
  }

  function findAnswer(question) {
    const kb = window.EZERO_VOICE_GUIDE_KNOWLEDGE;
    if (!kb) {
      return {
        text: currentLanguage() === "ur"
          ? "Voice Guide knowledge ابھی load نہیں ہوئی۔"
          : "Voice Guide knowledge is not loaded.",
        matched: false
      };
    }

    const q = normalizeText(question);
    const language = currentLanguage();

    if (!q) {
      return {
        text: language === "ur"
          ? "براہِ کرم E-ZERO کے بارے میں سوال لکھیں۔"
          : "Please enter a question about E-ZERO.",
        matched: false
      };
    }

    const registryLookup = window.EZERO_VOICE_GUIDE_REGISTRY_LOOKUP;

    if (registryLookup) {
      const controlAnswer =
        registryLookup.findControlRegistryAnswer(question);

      if (controlAnswer && controlAnswer.matched) {
        return controlAnswer;
      }

      const featureAnswer =
        registryLookup.findFeatureRegistryAnswer(question);

      if (featureAnswer && featureAnswer.matched) {
        return featureAnswer;
      }
    }

    let best = null;
    let bestScore = 0;

    for (const entry of kb.entries) {
      let score = 0;

      for (const keyword of entry.keywords) {
        const k = normalizeText(keyword);

        if (!k) continue;

        if (q === k) {
          score += 10;
        } else if (q.includes(k)) {
          score += Math.max(2, k.split(" ").length);
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = entry;
      }
    }

    if (!best || bestScore < 2) {
      return {
        text: kb.fallback[language] || kb.fallback.en,
        matched: false
      };
    }

    return {
      text: knowledgeTextFromI18n(best, language),
      matched: true,
      entryId: best.id
    };
  }

  function initializeVoiceGuide() {
    const askButton = document.getElementById("ezeroVoiceGuideAsk");
    const input = document.getElementById("ezeroVoiceGuideInput");
    const answer = document.getElementById("ezeroVoiceGuideAnswer");
    const status = document.getElementById("ezeroVoiceGuideStatus");

    if (!askButton || !input || !answer || !status) {
      console.warn("E-ZERO Voice Guide controls not found");
      return;
    }

    function runQuestion() {
      const result = findAnswer(input.value);

      answer.textContent = result.text;

      if (result.matched) {
        status.textContent =
          currentLanguage() === "ur"
            ? "✓ جواب تیار ہے"
            : "✓ Answer ready";
      } else {
        status.textContent =
          currentLanguage() === "ur"
            ? "تصدیق شدہ جواب دستیاب نہیں · Fail-closed"
            : "Verified answer unavailable · Fail-closed";
      }
    }

    askButton.addEventListener("click", runQuestion);

    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        runQuestion();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeVoiceGuide);
  } else {
    initializeVoiceGuide();
  }

  window.EZERO_VOICE_GUIDE = Object.freeze({
    findAnswer: findAnswer
  });
})();

/* Phase 0 browser speech input/output */
(function () {
  "use strict";

  function voiceLanguage() {
    const selector =
      document.getElementById("languageSelect");

    const selected =
      selector && selector.value
        ? selector.value
        : "en";

    const localeMap = Object.freeze({
      "en": "en-US",
      "ar": "ar-SA",
      "ur": "ur-PK",
      "hi": "hi-IN",
      "zh-CN": "zh-CN",
      "es": "es-ES",
      "fr": "fr-FR",
      "pt": "pt-PT",
      "bn": "bn-BD",
      "ru": "ru-RU",
      "id": "id-ID",
      "ja": "ja-JP",
      "de": "de-DE",
      "tr": "tr-TR",
      "ko": "ko-KR"
    });

    return localeMap[selected] || "en-US";
  }

  function initializeSpeechLayer() {
    const micButton = document.getElementById("ezeroVoiceGuideMic");
    const speakButton = document.getElementById("ezeroVoiceGuideSpeak");
    const input = document.getElementById("ezeroVoiceGuideInput");
    const answer = document.getElementById("ezeroVoiceGuideAnswer");
    const status = document.getElementById("ezeroVoiceGuideStatus");
    const askButton = document.getElementById("ezeroVoiceGuideAsk");

    if (!micButton || !speakButton || !input || !answer || !status || !askButton) {
      console.warn("E-ZERO Voice Guide speech controls not found");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      let autoSpeakAfterRecognition = false;

      recognition.continuous = false;
      recognition.interimResults = false;

      micButton.textContent = "🎤";
      micButton.title = "E-ZERO Voice Guide";
      micButton.setAttribute(
        "aria-label",
        "Start E-ZERO Voice Guide microphone"
      );

      micButton.style.userSelect = "none";
      micButton.style.webkitUserSelect = "none";
      micButton.style.webkitTouchCallout = "none";
      micButton.style.touchAction = "manipulation";
      micButton.style.webkitTapHighlightColor = "transparent";

      micButton.addEventListener("selectstart", function (event) {
        event.preventDefault();
      });

      micButton.addEventListener("contextmenu", function (event) {
        event.preventDefault();
      });

      micButton.addEventListener("pointerdown", function () {
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        }
      });

      micButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        try {
          recognition.lang = voiceLanguage();
          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "🎤 مائک شروع ہو رہا ہے…"
              : "🎤 Starting microphone…";

          recognition.start();
        } catch (error) {
          const name =
            error && error.name ? error.name : "UNKNOWN";

          status.textContent =
            "MIC START ERROR: " + name;

          console.warn(
            "E-ZERO microphone start error:",
            error
          );

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.error();
          }
        }
      });

      recognition.onresult = function (event) {
        const transcript =
          event &&
          event.results &&
          event.results[0] &&
          event.results[0][0]
            ? event.results[0][0].transcript
            : "";

        if (!transcript) {
          status.textContent = "No speech detected · Use text input";
          return;
        }

        input.value = transcript;
        status.textContent =
          voiceLanguage() === "ur-PK"
            ? "⏳ سوال مل گیا · جواب تیار ہو رہا ہے…"
            : "⏳ Question captured · Preparing answer…";

        if (window.EZERO_MIC_VISUAL) {
          window.EZERO_MIC_VISUAL.processing();
        }

        askButton.click();
        autoSpeakAfterRecognition = true;
      };

      recognition.onerror = function (event) {
        const code = event && event.error ? event.error : "unknown";
        status.textContent = "MIC ERROR: " + code;
        console.warn("E-ZERO Voice Guide microphone error:", code);

        if (window.EZERO_MIC_VISUAL) {
          window.EZERO_MIC_VISUAL.error();
        }
      };

      recognition.onstart = function () {
        status.textContent =
          voiceLanguage() === "ur-PK"
            ? "🎤 بولیں… خاموش ہونے پر خود بند ہو جائے گا"
            : "🎤 Speak now… it will stop automatically after you finish";
        if (window.EZERO_MIC_VISUAL) {
          window.EZERO_MIC_VISUAL.listening();
        }
      };

      recognition.onend = function () {
        if (
          status.textContent.includes("بولیں") ||
          status.textContent.includes("Speak now")
        ) {
          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "مائک بند ہوا · کوئی واضح آواز نہیں ملی · دوبارہ 🎤 دبائیں"
              : "Microphone stopped · No clear speech detected · Tap 🎤 again";
        }

        if (window.EZERO_MIC_VISUAL) {
          window.EZERO_MIC_VISUAL.idle();
        }

        if (autoSpeakAfterRecognition) {
          autoSpeakAfterRecognition = false;

          setTimeout(function () {
            const spokenAnswer =
              (answer.textContent || "").trim();

            if (spokenAnswer) {
              status.textContent =
                voiceLanguage() === "ur-PK"
                  ? "🔊 جواب تیار ہے · اب سنیں…"
                  : "🔊 Answer ready · Speaking…";
              speakButton.click();
            }
          }, 150);
        }
      };
    } else {
      micButton.disabled = true;
      micButton.title = "Speech recognition is not supported in this browser";
    }

    if ("speechSynthesis" in window && window.SpeechSynthesisUtterance) {
      speakButton.addEventListener("click", function () {
        const text = (answer.textContent || "").trim();

        if (!text) {
          status.textContent = "Nothing available to speak";
          return;
        }

        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const requestedLang = voiceLanguage();
        const voices = window.speechSynthesis.getVoices() || [];

        let selectedVoice = null;

        if (requestedLang === "ur-PK") {
          selectedVoice =
            voices.find(v => /^ur(-|_)/i.test(v.lang)) ||
            voices.find(v => /^hi(-|_)/i.test(v.lang)) ||
            voices.find(v => /^ar(-|_)/i.test(v.lang)) ||
            null;
        } else {
          const base = requestedLang.split("-")[0];
          selectedVoice =
            voices.find(v => v.lang === requestedLang) ||
            voices.find(v => v.lang && v.lang.toLowerCase().startsWith(base.toLowerCase())) ||
            null;
        }

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        } else {
          utterance.lang = requestedLang;
        }

        utterance.onerror = function (event) {
          console.warn("E-ZERO Voice Guide speech synthesis error:", event.error || event);
          status.textContent =
            requestedLang === "ur-PK"
              ? "Urdu voice unavailable on this device · Text answer is available"
              : "Speech output unavailable · Text answer is available";
        };

        utterance.onstart = function () {
          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "🔊 جواب سنایا جا رہا ہے…"
              : "🔊 Speaking answer…";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.speaking();
          }
        };

        utterance.onend = function () {
          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "✓ تیار · نیا سوال پوچھنے کے لیے 🎤 دبائیں"
              : "✓ Ready · Tap 🎤 to ask another question";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.idle();
          }
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      });
    } else {
      speakButton.disabled = true;
      speakButton.title = "Speech output is not supported in this browser";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeSpeechLayer);
  } else {
    initializeSpeechLayer();
  }
})();

/* Phase 0.2 — Feature Registry answer integration */
(function () {
  "use strict";

  function normalizeFeatureText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[؟?.,!،؛:()[\]{}"'`]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function activeGuideLanguage() {
    const selector =
      document.getElementById("languageSelect");

    if (selector && selector.value) {
      return selector.value;
    }

    const lang =
      (document.documentElement.lang || "en").toLowerCase();

    return lang || "en";
  }


  function getI18nText(key, fallback) {
    const lang = activeGuideLanguage();
    const i18n = window.EZERO_I18N;

    if (
      i18n &&
      i18n[lang] &&
      typeof i18n[lang][key] === "string" &&
      i18n[lang][key].trim()
    ) {
      return i18n[lang][key];
    }

    if (
      i18n &&
      i18n.en &&
      typeof i18n.en[key] === "string" &&
      i18n.en[key].trim()
    ) {
      return i18n.en[key];
    }

    return fallback || "";
  }

  function featureI18nKey(featureId) {
    const map = {
      vehicle_obd: "vehicle_intro",
      industrial_intelligence: "industrial_intro",
      fleet_shared_access: "fleet_section_title",
      benchmark006c: "benchmark006c_intro",
      evidence_governance: "evidence_section_intro",
      adaptive_decision_lab: "adaptive_decision_lab_intro"
    };

    return map[featureId] || null;
  }

  function findFeatureRegistryAnswer(question) {
    const registry = window.EZERO_VOICE_GUIDE_FEATURE_REGISTRY;

    if (!registry || !Array.isArray(registry.features)) {
      return null;
    }

    const q = normalizeFeatureText(question);

    if (!q) return null;

    let bestFeature = null;
    let bestScore = 0;

    registry.features.forEach(function (feature) {
      let score = 0;

      const searchable = []
        .concat(feature.keywords || [])
        .concat([
          feature.id || "",
          feature.title_en || "",
          feature.title_ur || ""
        ]);

      searchable.forEach(function (term) {
        const t = normalizeFeatureText(term);

        if (!t) return;

        if (q === t) {
          score += 20;
        } else if (q.includes(t)) {
          score += Math.max(3, t.split(" ").length * 2);
        }
      });

      if (score > bestScore) {
        bestScore = score;
        bestFeature = feature;
      }
    });

    if (!bestFeature || bestScore < 3) {
      return null;
    }

    const lang = activeGuideLanguage();
    const i18nKey = featureI18nKey(bestFeature.id);
    const fallbackText =
      lang === "ur"
        ? bestFeature.explanation_ur
        : bestFeature.explanation_en;

    return {
      matched: true,
      source: "FEATURE_REGISTRY",
      feature_id: bestFeature.id,
      section_id: bestFeature.section_id,
      text: i18nKey
        ? getI18nText(i18nKey, fallbackText)
        : fallbackText
    };
  }

  function findControlRegistryAnswer(question) {
    const registry = window.EZERO_VOICE_GUIDE_FEATURE_REGISTRY;

    if (!registry || !Array.isArray(registry.controls)) {
      return null;
    }

    const q = normalizeFeatureText(question);
    const lang = activeGuideLanguage();

    const aliases = {
      languageSelect: [
        "language",
        "language button",
        "language select",
        "زبان",
        "لینگویج"
      ],
      ezeroVoiceGuideButton: [
        "voice guide button",
        "voice button",
        "وائس گائیڈ بٹن",
        "وائس بٹن"
      ],
      ezeroVoiceGuideAsk: [
        "ask button",
        "ask",
        "سوال بٹن",
        "آسک بٹن"
      ],
      ezeroVoiceGuideMic: [
        "mic",
        "microphone",
        "mic button",
        "مائک",
        "مائیک",
        "مائک بٹن"
      ],
      ezeroVoiceGuideSpeak: [
        "speak",
        "speak button",
        "speaker",
        "سپیک",
        "بولنے والا بٹن",
        "آواز"
      ]
    };

    for (const control of registry.controls) {
      const terms = aliases[control.id] || [];

      for (const term of terms) {
        if (q.includes(normalizeFeatureText(term))) {
          const controlKeyMap = {
            languageSelect: "global_language_label"
          };

          const controlFallback =
            lang === "ur"
              ? control.purpose_ur
              : control.purpose_en;

          return {
            matched: true,
            source: "CONTROL_REGISTRY",
            control_id: control.id,
            text: controlKeyMap[control.id]
              ? getI18nText(controlKeyMap[control.id], controlFallback)
              : controlFallback
          };
        }
      }
    }

    return null;
  }

  window.EZERO_VOICE_GUIDE_REGISTRY_LOOKUP = Object.freeze({
    findFeatureRegistryAnswer,
    findControlRegistryAnswer
  });
})();

/* E-ZERO Voice Guide — Microphone Visual State */
(function () {
  "use strict";

  function initMicVisualState() {
    const micButton = document.getElementById("ezeroVoiceGuideMic");
    const status = document.getElementById("ezeroVoiceGuideStatus");

    if (!micButton || !status) return;

    if (!document.getElementById("ezeroVoiceMicVisualStyles")) {
      const style = document.createElement("style");
      style.id = "ezeroVoiceMicVisualStyles";
      style.textContent = `
        #ezeroVoiceGuideMic {
          position: relative;
          transition: transform .18s ease, box-shadow .18s ease, opacity .18s ease;
        }

        #ezeroVoiceGuideMic.ezero-mic-listening {
          transform: scale(1.06);
          box-shadow:
            0 0 0 0 rgba(40, 120, 160, .35),
            0 0 18px rgba(40, 120, 160, .22);
          animation: ezeroMicPulse 1.1s infinite;
        }

        #ezeroVoiceGuideMic.ezero-mic-processing {
          transform: scale(1.03);
          opacity: .88;
        }

        #ezeroVoiceGuideMic.ezero-mic-error {
          animation: ezeroMicError .35s linear 2;
        }

        #ezeroVoiceGuideMic.ezero-mic-listening::after {
          content: ")))";
          position: absolute;
          right: -18px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 1px;
          animation: ezeroMicWave .8s infinite alternate;
          pointer-events: none;
        }

        @keyframes ezeroMicPulse {
          0% {
            box-shadow:
              0 0 0 0 rgba(40, 120, 160, .35),
              0 0 12px rgba(40, 120, 160, .18);
          }
          70% {
            box-shadow:
              0 0 0 12px rgba(40, 120, 160, 0),
              0 0 22px rgba(40, 120, 160, .24);
          }
          100% {
            box-shadow:
              0 0 0 0 rgba(40, 120, 160, 0),
              0 0 12px rgba(40, 120, 160, .18);
          }
        }

        @keyframes ezeroMicWave {
          from { opacity: .35; transform: translateY(-50%) scaleX(.85); }
          to   { opacity: 1; transform: translateY(-50%) scaleX(1.15); }
        }

        @keyframes ezeroMicError {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `;
      document.head.appendChild(style);
    }

    window.EZERO_MIC_VISUAL = Object.freeze({
      idle: function () {
        micButton.classList.remove(
          "ezero-mic-listening",
          "ezero-mic-processing",
          "ezero-mic-error",
          "ezero-mic-speaking"
        );
        micButton.textContent = "🎤";
        micButton.setAttribute("aria-label", "Start E-ZERO Voice Guide microphone");
        micButton.title = "Tap once and speak";
      },

      listening: function () {
        micButton.classList.remove("ezero-mic-processing", "ezero-mic-error", "ezero-mic-speaking");
        micButton.classList.add("ezero-mic-listening");
        micButton.textContent = "🎤";
        micButton.setAttribute("aria-label", "E-ZERO Voice Guide is listening");
        micButton.title = "Listening";
      },

      processing: function () {
        micButton.classList.remove("ezero-mic-listening", "ezero-mic-error", "ezero-mic-speaking");
        micButton.classList.add("ezero-mic-processing");
        micButton.textContent = "⏳";
        micButton.setAttribute("aria-label", "E-ZERO Voice Guide is processing");
        micButton.title = "Preparing answer";
      },

      speaking: function () {
        micButton.classList.remove("ezero-mic-listening", "ezero-mic-processing", "ezero-mic-error");
        micButton.classList.add("ezero-mic-speaking");
        micButton.textContent = "🔊";
        micButton.setAttribute("aria-label", "E-ZERO Voice Guide is speaking");
        micButton.title = "Speaking";
      },

      error: function () {
        micButton.classList.remove("ezero-mic-listening", "ezero-mic-processing", "ezero-mic-speaking");
        micButton.classList.add("ezero-mic-error");
        micButton.textContent = "⚠️";
        setTimeout(function () {
          window.EZERO_MIC_VISUAL.idle();
        }, 900);
      }
    });

    window.EZERO_MIC_VISUAL.idle();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMicVisualState);
  } else {
    initMicVisualState();
  }
})();
