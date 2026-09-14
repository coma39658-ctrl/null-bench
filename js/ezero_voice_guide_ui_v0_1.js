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

    const answerLength =
      window.EZERO_VOICE_GUIDE_SETTINGS &&
      window.EZERO_VOICE_GUIDE_SETTINGS.answerLength
        ? window.EZERO_VOICE_GUIDE_SETTINGS.answerLength
        : "normal";

    if (entry) {
      const lengthField =
        answerLength === "short"
          ? language + "_short"
          : answerLength === "detailed"
            ? language + "_detailed"
            : language;

      if (
        typeof entry[lengthField] === "string" &&
        entry[lengthField].trim()
      ) {
        return entry[lengthField];
      }
    }

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

    async function runQuestion() {
      const question = (input.value || "").trim();
      const deterministicResult = findAnswer(question);
      const language = currentLanguage();

      if (!question) {
        answer.textContent =
          language === "ur"
            ? "براہِ کرم سوال لکھیں یا 🎤 دباکر بولیں۔"
            : "Please enter a question or tap 🎤 and speak.";
        return;
      }

      if (language !== "en" && deterministicResult.matched) {
        answer.textContent = deterministicResult.text;

        status.textContent =
          language === "ur"
            ? "✓ تصدیق شدہ E-ZERO جواب تیار ہے"
            : "✓ Verified E-ZERO answer ready";

        if (
          (
            window.EZERO_VOICE_GUIDE_SETTINGS &&
            window.EZERO_VOICE_GUIDE_SETTINGS.autoSpeak
          ) ||
          window.EZERO_RESULT_AUTO_SPEAK_PENDING
        ) {
          window.EZERO_RESULT_AUTO_SPEAK_PENDING = false;
          setTimeout(function () {
            const speakButton =
              document.getElementById("ezeroVoiceGuideSpeak");

            if (speakButton) {
              speakButton.click();
            }
          }, 180);
        }

        return;
      }

      const publicAiEnabled =
        window.EZERO_PUBLIC_AI_ENABLED === true;

      const publicAiEndpoint =
        typeof window.EZERO_PUBLIC_AI_ENDPOINT === "string"
          ? window.EZERO_PUBLIC_AI_ENDPOINT.trim()
          : "";

      if (
        !publicAiEnabled ||
        !/^https:\/\//i.test(publicAiEndpoint)
      ) {
        answer.textContent =
          language === "ur"
            ? "اس سوال کے لیے ابھی تصدیق شدہ E-ZERO جواب دستیاب نہیں۔ Public AI ابھی فعال نہیں ہے۔"
            : "No verified E-ZERO answer is available for this question yet. Public AI is not enabled yet.";

        status.textContent =
          language === "ur"
            ? "تصدیق شدہ جواب دستیاب نہیں · Fail-closed"
            : "Verified answer unavailable · Fail-closed";

        return;
      }

      status.textContent =
        language === "ur"
          ? "⏳ E-ZERO AI Agent جواب تیار کر رہا ہے…"
          : "⏳ E-ZERO AI Agent is preparing an answer…";

      try {
        if (
          !window.EZERO_QWEN_PUBLIC_AGENT_V0_1 ||
          typeof window.EZERO_QWEN_PUBLIC_AGENT_V0_1.ask !== "function"
        ) {
          throw new Error("AI_AGENT_ADAPTER_UNAVAILABLE");
        }

        const agentResult =
          await window.EZERO_QWEN_PUBLIC_AGENT_V0_1.ask({
            question: question,
            responseLanguage: language,
            answerLength:
              window.EZERO_VOICE_GUIDE_SETTINGS &&
              window.EZERO_VOICE_GUIDE_SETTINGS.answerLength
                ? window.EZERO_VOICE_GUIDE_SETTINGS.answerLength
                : "normal"
          });

        const data =
          agentResult.status ===
          "INSUFFICIENT_VERIFIED_EZERO_EVIDENCE"
            ? {
                answer:
                  "INSUFFICIENT_VERIFIED_EZERO_EVIDENCE",
                sourceClass: agentResult.source_class
              }
            : {
                answer: agentResult.answer,
                sourceClass: agentResult.source_class
              };

        if (
          !data ||
          typeof data.answer !== "string" ||
          !data.answer.trim()
        ) {
          throw new Error("AI_BRIDGE_INVALID_RESPONSE");
        }

        if (data.answer === "INSUFFICIENT_VERIFIED_EZERO_EVIDENCE") {
          answer.textContent =
            language === "ur"
              ? "اس سوال کے لیے کافی تصدیق شدہ E-ZERO evidence دستیاب نہیں۔"
              : "Insufficient verified E-ZERO evidence for this question.";

          status.textContent =
            language === "ur"
              ? "تصدیق شدہ evidence ناکافی · Fail-closed"
              : "Insufficient verified evidence · Fail-closed";

          return;
        }

        answer.textContent = data.answer;

        status.textContent =
          data.sourceClass === "VERIFIED_STATIC"
            ? (
                language === "ur"
                  ? "✓ تصدیق شدہ E-ZERO جواب · فوری"
                  : "✓ Verified E-ZERO answer · instant"
              )
            : (
                language === "ur"
                  ? "✓ E-ZERO AI Agent جواب تیار ہے"
                  : "✓ E-ZERO AI Agent answer ready"
              );

        if (
          window.EZERO_VOICE_GUIDE_SETTINGS &&
          window.EZERO_VOICE_GUIDE_SETTINGS.autoSpeak
        ) {
          setTimeout(function () {
            const speakButton =
              document.getElementById("ezeroVoiceGuideSpeak");

            if (speakButton) {
              speakButton.click();
            }
          }, 180);
        }

      } catch (error) {
        console.warn(
          "E-ZERO governed AI unavailable; deterministic fallback used:",
          error
        );

        answer.textContent = deterministicResult.text;

        if (deterministicResult.matched) {
          status.textContent =
            language === "ur"
              ? "✓ Local Verified Guide fallback · AI Agent دستیاب نہیں"
              : "✓ Local Verified Guide fallback · AI Agent unavailable";
        } else {
          status.textContent =
            language === "ur"
              ? "تصدیق شدہ جواب دستیاب نہیں · Fail-closed"
              : "Verified answer unavailable · Fail-closed";
        }
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

  const conversationState = {
    value: "READY"
  };

  function setConversationState(nextState) {
    const allowed = [
      "READY",
      "LISTEN",
      "THINKING",
      "ANSWER",
      "SPEAKING",
      "ERROR"
    ];

    if (!allowed.includes(nextState)) {
      return;
    }

    conversationState.value = nextState;

    window.dispatchEvent(
      new CustomEvent("ezero:voice-conversation-state", {
        detail: Object.freeze({
          state: nextState
        })
      })
    );
  }

  window.EZERO_VOICE_CONVERSATION = Object.freeze({
    getState: function () {
      return conversationState.value;
    },
    setState: setConversationState
  });

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

        if (
          window.EZERO_VOICE_CONVERSATION &&
          window.EZERO_VOICE_CONVERSATION.getState() === "SPEAKING"
        ) {
          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "🔊 پہلے موجود جواب مکمل ہونے دیں"
              : "🔊 Please let the current answer finish first";
          return;
        }

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
        setConversationState("ANSWER");

        status.textContent =
          voiceLanguage() === "ur-PK"
            ? "✓ سوال مکمل ہے · سبز Ask بٹن دبائیں"
            : "✓ Question ready · Tap the green Ask button";

        askButton.textContent = "✓ Ask";
        askButton.style.background = "#16a34a";
        askButton.style.color = "#ffffff";
        askButton.style.borderColor = "#15803d";
        askButton.style.boxShadow = "0 0 0 4px rgba(22,163,74,.18)";
        askButton.style.transform = "scale(1.04)";

        if (
          window.EZERO_VOICE_GUIDE_SETTINGS &&
          window.EZERO_VOICE_GUIDE_SETTINGS.autoSubmit
        ) {
          setConversationState("THINKING");

          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "⏳ سوال مل گیا · AI جواب تیار کر رہا ہے…"
              : "⏳ Question captured · AI is preparing the answer…";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.processing();
          }

          askButton.click();
        } else {
          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.idle();
          }
        }

        autoSpeakAfterRecognition = false;
      };

      askButton.addEventListener("click", function () {
        askButton.textContent = "Ask";
        askButton.style.background = "";
        askButton.style.color = "";
        askButton.style.borderColor = "";
        askButton.style.boxShadow = "";
        askButton.style.transform = "";
      });

      recognition.onerror = function (event) {
        const code = event && event.error ? event.error : "unknown";
        status.textContent = "MIC ERROR: " + code;
        console.warn("E-ZERO Voice Guide microphone error:", code);

        if (window.EZERO_MIC_VISUAL) {
          window.EZERO_MIC_VISUAL.error();
        }
      };

      recognition.onstart = function () {
        setConversationState("LISTEN");

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

        const requestedLang = voiceLanguage();

        const configuredRate =
          window.EZERO_VOICE_GUIDE_SETTINGS &&
          Number(window.EZERO_VOICE_GUIDE_SETTINGS.voiceSpeed)
            ? Number(window.EZERO_VOICE_GUIDE_SETTINGS.voiceSpeed)
            : 1;

        if (
          requestedLang === "ur-PK" &&
          window.EZERO_URDU_AEGIS_TTS
        ) {
          setConversationState("SPEAKING");
          micButton.disabled = true;

          status.textContent =
            "🔊 Aegis اردو آواز تیار کی جا رہی ہے…";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.speaking();
          }

          window.EZERO_URDU_AEGIS_TTS
            .speak(text, {
              rate: configuredRate,
              onProgress: function (progress) {
                if (
                  progress &&
                  Number(progress.total) > 0
                ) {
                  const pct = Math.max(
                    0,
                    Math.min(
                      100,
                      Math.round(
                        Number(progress.loaded) *
                        100 /
                        Number(progress.total)
                      )
                    )
                  );

                  status.textContent =
                    "🔊 اردو Aegis آواز تیار ہو رہی ہے… " +
                    pct +
                    "%";
                }
              }
            })
            .then(function () {
              setConversationState("READY");
              micButton.disabled = false;

              status.textContent =
                "✓ تیار · نیا سوال پوچھنے کے لیے 🎤 دبائیں";

              if (window.EZERO_MIC_VISUAL) {
                window.EZERO_MIC_VISUAL.idle();
              }
            })
            .catch(function (error) {
              setConversationState("ERROR");
              micButton.disabled = false;

              console.warn(
                "E-ZERO Urdu Aegis TTS error:",
                error
              );

              const errorName =
                error && error.name ? error.name : "Error";
              const errorMessage =
                error && error.message
                  ? error.message
                  : String(error || "Unknown Aegis TTS error");

              window.EZERO_LAST_AEGIS_ERROR = {
                name: errorName,
                message: errorMessage
              };

              status.textContent =
                "AEGIS ERROR: " +
                errorName +
                " · " +
                errorMessage;

              if (window.EZERO_MIC_VISUAL) {
                window.EZERO_MIC_VISUAL.error();
              }
            });

          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = configuredRate;
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
          setConversationState("ERROR");
          micButton.disabled = false;

          console.warn("E-ZERO Voice Guide speech synthesis error:", event.error || event);
          status.textContent =
            requestedLang === "ur-PK"
              ? "Urdu voice unavailable on this device · Text answer is available"
              : "Speech output unavailable · Text answer is available";
        };

        utterance.onstart = function () {
          setConversationState("SPEAKING");
          micButton.disabled = true;

          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "🔊 جواب سنایا جا رہا ہے…"
              : "🔊 Speaking answer…";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.speaking();
          }
        };

        utterance.onend = function () {
          setConversationState("READY");
          micButton.disabled = false;

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

/* E-ZERO Result Intelligence Listener V0.1 */
(function () {
  "use strict";

  document.addEventListener("ezero:result", function (event) {
    const detail = event && event.detail ? event.detail : null;

    if (!detail) return;

    const panel = document.getElementById("ezeroVoiceGuidePanel");
    const input = document.getElementById("ezeroVoiceGuideInput");
    const answer = document.getElementById("ezeroVoiceGuideAnswer");
    const status = document.getElementById("ezeroVoiceGuideStatus");
    const askButton = document.getElementById("ezeroVoiceGuideAsk");

    if (!panel || !input || !answer || !status || !askButton) {
      console.warn("E-ZERO result listener: Voice Guide UI unavailable");
      return;
    }

    panel.style.display = "block";
    panel.setAttribute("aria-hidden", "false");

    const lang =
      window.EZERO_LANGUAGE &&
      typeof window.EZERO_LANGUAGE.current === "function"
        ? window.EZERO_LANGUAGE.current()
        : (document.documentElement.lang || "en");

    const isUrdu = lang === "ur";

    const prompt =
      isUrdu
        ? (
            "اس E-ZERO result کی مکمل مگر evidence-grounded وضاحت کریں۔ " +
            "اصل result یا status تبدیل نہ کریں۔ " +
            "تشخیص یا safety claim نہ بنائیں۔ " +
            "Module: " + detail.module +
            " | Result type: " + detail.result_type +
            " | Status: " + detail.status +
            " | Provenance: " + detail.provenance +
            " | Evidence level: " + detail.evidence_level +
            " | Diagnostic authority: FALSE" +
            " | Summary: " + detail.summary
          )
        : (
            "Explain this E-ZERO result clearly and in detail within its evidence boundary. " +
            "Do not alter the original result or status. " +
            "Do not create diagnosis or safety claims. " +
            "Module: " + detail.module +
            " | Result type: " + detail.result_type +
            " | Status: " + detail.status +
            " | Provenance: " + detail.provenance +
            " | Evidence level: " + detail.evidence_level +
            " | Diagnostic authority: FALSE" +
            " | Summary: " + detail.summary
          );

    input.value = prompt;

    answer.textContent =
      isUrdu
        ? "نیا E-ZERO result موصول ہوا ہے۔ وضاحت تیار کرنے کے لیے Ask دبائیں۔"
        : "A new E-ZERO result was received. Tap Ask to prepare an explanation.";

    status.textContent =
      isUrdu
        ? "✓ نیا result موصول ہوا · وضاحت تیار ہے"
        : "✓ New result received · Ready to explain";

    askButton.textContent = "✓ Ask";
    askButton.style.background = "#16a34a";
    askButton.style.color = "#ffffff";
    askButton.style.borderColor = "#15803d";
    askButton.style.boxShadow = "0 0 0 4px rgba(22,163,74,.18)";

    const settings =
      window.EZERO_VOICE_GUIDE_SETTINGS || {};

    if (settings.autoResultExplain) {
      status.textContent =
        isUrdu
          ? "⏳ Result موصول ہوا · وضاحت تیار کی جا رہی ہے…"
          : "⏳ Result received · Preparing explanation…";

      setTimeout(function () {
        askButton.click();
      }, 120);
    }

    window.EZERO_RESULT_AUTO_SPEAK_PENDING =
      !!(
        window.EZERO_VOICE_GUIDE_SETTINGS &&
        window.EZERO_VOICE_GUIDE_SETTINGS.autoSpeakResults
      );

    window.EZERO_LAST_RESULT = Object.freeze({
      module: detail.module,
      result_type: detail.result_type,
      status: detail.status,
      summary: detail.summary,
      provenance: detail.provenance,
      evidence_level: detail.evidence_level,
      timestamp: detail.timestamp,
      diagnostic_authority: false
    });
  });
})();
