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
          const broadOverviewAlias =
            entry.id === "ezero_overview" &&
            ["e-zero", "ezero", "ای زیرو"].includes(k);

          const overviewIntent =
            /^(?:what is|about|explain|tell me about)\s+(?:the\s+)?(?:e-zero|ezero)(?:\s+(?:system|platform))?[?.!؟]*$/i.test(q) ||
            /^(?:e-zero|ezero|ای زیرو)\s+(?:کیا ہے|کیا کرتا ہے|کے بارے میں بتائیں|کا تعارف)[؟?.!]*$/u.test(q);

          if (!broadOverviewAlias || overviewIntent) {
            score += Math.max(2, k.split(" ").length);
          }
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

    // Never claim these are AI-verified results. Search is opened by user.
    function offerPublicSearchLinks(question, language) {
      if (!answer.parentElement || typeof question !== "string" ||
          !question.trim() || question.length > 240) return;
      if (/https?:\/\/|\b[^\s@]+@[^\s@]+\.[^\s@]+\b|\b[A-HJ-NPR-Z0-9]{17}\b|\b\+?\d(?:[ ()-]*\d){7,}\b|(?:password|passcode|secret|api[_ -]?key|private key|otp|credit.card|bank.account|پاسورڈ|خفیہ|شناختی نمبر|میرا وِن)/iu.test(question)) return;
      const prior=answer.parentElement.querySelector("[data-ezero-search-alternatives]");
      if(prior)prior.remove();
      const panel=document.createElement("section");
      panel.setAttribute("data-ezero-search-alternatives","true");
      const heading=document.createElement("strong");
      heading.textContent=language==="ur"
        ?"مفت بیرونی ویب سرچ — خود کھولیں":"Open public web search — optional";
      const note=document.createElement("p");
      note.textContent=language==="ur"
        ?"E-ZERO نے موجودہ قیمت یا دستیابی کی ویب تصدیق نہیں کی۔ لنک کھولنے پر سوال بیرونی سرچ انجن کو جائے گا؛ قیمت، تاریخ اور مفت رسائی خود چیک کریں۔"
        :"E-ZERO did not verify current prices or availability. Clicking sends your question to an external search engine; check prices, dates and access yourself.";
      panel.appendChild(heading);panel.appendChild(note);
      const list=document.createElement("ul");
      for(const engine of [
        {name:"DuckDuckGo",prefix:"https://duckduckgo.com/?q="},
        {name:"Bing",prefix:"https://www.bing.com/search?q="}
      ]){
        const item=document.createElement("li");
        const link=document.createElement("a");
        link.href=engine.prefix+encodeURIComponent(question);
        link.target="_blank";
        link.rel="noopener noreferrer nofollow";
        link.textContent=engine.name;
        item.appendChild(link);list.appendChild(item);
      }
      panel.appendChild(list);
      answer.insertAdjacentElement("afterend",panel);
    }

    async function runQuestion() {
      const question = (input.value || "").trim();
      // A new answer must never inherit links from an older question, even
      // when AI is disabled, times out, or falls back to static guidance.
      const oldSources = answer.parentElement?.querySelector("[data-ezero-web-sources]");
      if (oldSources) oldSources.remove();
      const oldAlternatives=answer.parentElement?.querySelector("[data-ezero-search-alternatives]");
      if(oldAlternatives)oldAlternatives.remove();
      const deterministicResult = findAnswer(question);
      const language = currentLanguage();

      if (!question) {
        answer.textContent =
          language === "ur"
            ? "براہِ کرم سوال لکھیں یا 🎤 دباکر بولیں۔"
            : "Please enter a question or tap 🎤 and speak.";
        return;
      }

      if (deterministicResult.matched &&
          window.EZERO_PUBLIC_AI_ENABLED !== true) {
        answer.textContent = deterministicResult.text;

        if (
          window.EZERO_VOICE_CONVERSATION &&
          typeof window.EZERO_VOICE_CONVERSATION.setState === "function"
        ) {
          window.EZERO_VOICE_CONVERSATION.setState("ANSWER");
        }

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
            ? "اس سوال کے لیے ابھی ای زیرو کا تصدیق شدہ جواب دستیاب نہیں۔ عوامی معاون ابھی فعال نہیں ہے۔"
            : "No verified E-ZERO answer is available for this question yet. Public AI is not enabled yet.";

        if (
          window.EZERO_VOICE_CONVERSATION &&
          typeof window.EZERO_VOICE_CONVERSATION.setState === "function"
        ) {
          window.EZERO_VOICE_CONVERSATION.setState("ANSWER");
        }

        status.textContent =
          language === "ur"
            ? "تصدیق شدہ جواب دستیاب نہیں · حفاظتی طور پر جواب روکا گیا"
            : "Verified answer unavailable · Fail-closed";

        return;
      }

      if (
        window.EZERO_VOICE_CONVERSATION &&
        typeof window.EZERO_VOICE_CONVERSATION.setState === "function"
      ) {
        window.EZERO_VOICE_CONVERSATION.setState("THINKING");
      }

      status.textContent =
        language === "ur"
          ? "⏳ ای زیرو کا ذہین معاون جواب تیار کر رہا ہے…"
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
                sourceClass: agentResult.source_class,
                sources: agentResult.sources
              }
            : {
                answer: agentResult.answer,
                sourceClass: agentResult.source_class,
                sources: agentResult.sources
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

          if (
            window.EZERO_VOICE_CONVERSATION &&
            typeof window.EZERO_VOICE_CONVERSATION.setState === "function"
          ) {
            window.EZERO_VOICE_CONVERSATION.setState("ANSWER");
          }

          status.textContent =
            language === "ur"
              ? "تصدیق شدہ evidence ناکافی · Fail-closed"
              : "Insufficient verified evidence · Fail-closed";

          if (/\b(?:prices?|market|used|listings?|for sale|availability|dealers?)\b|(?:قیمت|قیمتیں|مارکیٹ|فروخت|پرانی گاڑی|مستعملة|أسعار|سعر)/iu.test(question)) offerPublicSearchLinks(question,language);
          return;
        }

        answer.textContent = data.answer;

        if (answer.parentElement && Array.isArray(data.sources)) {
          const list = document.createElement("ul");
          const seen = new Set();

          for (const item of data.sources.slice(0, 5)) {
            if (!item || item.sourceClass !== "WEB_SEARCH_UNVERIFIED"
                || typeof item.url !== "string") continue;

            let url;
            try { url = new URL(item.url); }
            catch { continue; }

            const host = url.hostname.toLowerCase();
            if (url.protocol !== "https:" || url.username || url.password
                || host === "localhost"
                || host.endsWith(".localhost")
                || host.endsWith(".local")
                || /^(127|10|192\.168|169\.254)\./.test(host)
                || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)
                || /^\[(::1|fc|fd|fe80)/.test(host)
                || seen.has(url.href)) continue;

            seen.add(url.href);
            const li = document.createElement("li");
            const link = document.createElement("a");
            link.href = url.href;
            link.target = "_blank";
            link.rel = "noopener noreferrer nofollow";
            link.textContent = typeof item.title === "string"
              ? item.title.slice(0, 140) : host;
            li.appendChild(link);
            list.appendChild(li);
          }

          if (list.children.length) {
            const panel = document.createElement("section");
            panel.setAttribute("data-ezero-web-sources", "true");
            const heading = document.createElement("strong");
            heading.textContent = language === "ur"
              ? "بیرونی ویب روابط (غیر تصدیق شدہ)"
              : "External web links (unverified)";
            panel.appendChild(heading);
            panel.appendChild(list);
            answer.insertAdjacentElement("afterend", panel);
          }
        }


        if (
          window.EZERO_VOICE_CONVERSATION &&
          typeof window.EZERO_VOICE_CONVERSATION.setState === "function"
        ) {
          window.EZERO_VOICE_CONVERSATION.setState("ANSWER");
        }

        // Never imply that a live market price or recent event was verified
        // when the gateway did not return current public web sources.
        const freshnessQuestion =
          /\b(?:latest|today|current|recent|prices?|market|news|availability|in stock|used|pre-owned|for sale|listings?|dealers?|resale|auction|new car|spare parts?)\b|(?:آج|ابھی|تازہ|حالیہ|قیمت|قیمتیں|مارکیٹ|خبر|خبریں|دستیاب|فروخت|پرانی گاڑی|نئی گاڑی|ڈیلر|نیلامی|السعر|الأسعار|اليوم|مستعملة|بيع)/iu
            .test(question);
        const currentWebNotVerified = freshnessQuestion &&
          agentResult.web_research_status !== "WEB_CONTEXT_AVAILABLE";

        status.textContent = currentWebNotVerified
          ? (language === "ur"
              ? "تازہ مارکیٹ معلومات کی ویب تصدیق نہیں ہوئی؛ جواب عمومی AI معلومات ہے۔"
              : "Live market information was not verified; this is a general AI answer.")
          : data.sourceClass === "VERIFIED_STATIC"
            ? (language === "ur"
                ? "✓ تصدیق شدہ E-ZERO جواب · فوری"
                : "✓ Verified E-ZERO answer · instant")
            : (language === "ur"
                ? "✓ E-ZERO AI Agent جواب تیار ہے"
                : "✓ E-ZERO AI Agent answer ready");

        if(currentWebNotVerified)offerPublicSearchLinks(question,language);

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
        if (/\b(?:prices?|market|used|listings?|for sale|availability|dealers?)\b|(?:قیمت|قیمتیں|مارکیٹ|فروخت|پرانی گاڑی|مستعملة|أسعار|سعر)/iu.test(question)) offerPublicSearchLinks(question,language);

        if (
          window.EZERO_VOICE_CONVERSATION &&
          typeof window.EZERO_VOICE_CONVERSATION.setState === "function"
        ) {
          window.EZERO_VOICE_CONVERSATION.setState("ANSWER");
        }

        if (deterministicResult.matched) {
          status.textContent =
            language === "ur"
              ? "✓ Local Verified Guide fallback · AI Agent دستیاب نہیں"
              : "✓ Local Verified Guide fallback · AI Agent unavailable";
        } else {
          status.textContent =
            language === "ur"
              ? "تصدیق شدہ جواب دستیاب نہیں · حفاظتی طور پر جواب روکا گیا"
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

    if (conversationState.value === nextState) {
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
        input.dir = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(transcript)
          ? "rtl" : "auto";
        input.setSelectionRange(input.value.length, input.value.length);

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
          setConversationState("READY");

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.idle();
          }
        }

        autoSpeakAfterRecognition = false;
      };

      askButton.addEventListener("click", function () {
        askButton.textContent = "✓ Ask";
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

        const currentState =
          window.EZERO_VOICE_CONVERSATION &&
          typeof window.EZERO_VOICE_CONVERSATION.getState === "function"
            ? window.EZERO_VOICE_CONVERSATION.getState()
            : null;

        if (currentState !== "THINKING" && currentState !== "SPEAKING") {
          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.idle();
          }
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
      let browserSpeechVersion = 0;
      let aegisPhase = "idle";
      let aegisText = "";
      let aegisTimer = null;
      let aegisVersion = 0;
      const originalSpeakLabel = speakButton.textContent;

      function resetAegis() {
        aegisVersion += 1;
        if (aegisTimer !== null) {
          clearTimeout(aegisTimer);
          aegisTimer = null;
        }
        if (window.EZERO_URDU_AEGIS_TTS) {
          try { window.EZERO_URDU_AEGIS_TTS.stop(); }
          catch (_) {}
        }
        aegisPhase = "idle";
        aegisText = "";
        speakButton.textContent = originalSpeakLabel;
        speakButton.disabled = false;
        micButton.disabled = false;
      }

      askButton.addEventListener("click", function () {
        if (aegisPhase !== "idle") resetAegis();
      });

      micButton.addEventListener("click", function () {
        if (aegisPhase !== "idle") resetAegis();
      });

      speakButton.addEventListener("click", function () {
        const text = (answer.textContent || "").trim();

        if (!text) {
          status.textContent = "Nothing available to speak";
          return;
        }

        const answerLang = voiceLanguage();
        const configuredLocale = String(
          (window.EZERO_VOICE_GUIDE_SETTINGS &&
           window.EZERO_VOICE_GUIDE_SETTINGS.voiceLocale) || "auto"
        );
        const allowedLocales = [
          "ur-PK", "ur-IN", "en-US", "en-GB",
          "ar-SA", "ar-EG", "hi-IN"
        ];
        const requestedLang =
          allowedLocales.includes(configuredLocale) &&
          configuredLocale.split("-")[0].toLowerCase() ===
            answerLang.split("-")[0].toLowerCase()
            ? configuredLocale
            : answerLang;

        const configuredRate =
          window.EZERO_VOICE_GUIDE_SETTINGS &&
          Number(window.EZERO_VOICE_GUIDE_SETTINGS.voiceSpeed)
            ? Number(window.EZERO_VOICE_GUIDE_SETTINGS.voiceSpeed)
            : 1;

        const useAegis =
          requestedLang === "ur-PK" &&
          (configuredLocale === "auto" ||
           configuredLocale === "ur-PK") &&
          window.EZERO_URDU_AEGIS_TTS &&
          typeof window.EZERO_URDU_AEGIS_TTS.prepareAudio === "function" &&
          typeof window.EZERO_URDU_AEGIS_TTS.playPrepared === "function";

        if (aegisPhase !== "idle" &&
            (!useAegis || aegisText !== text)) {
          resetAegis();
        }

        if (useAegis) {
          const tts = window.EZERO_URDU_AEGIS_TTS;

          if (aegisPhase === "preparing" ||
              aegisPhase === "playing") {
            resetAegis();
            setConversationState("READY");
            status.textContent = "⏹ پاکستانی اردو کی آواز روک دی گئی";
            if (window.EZERO_MIC_VISUAL) {
              window.EZERO_MIC_VISUAL.idle();
            }
            return;
          }

          if (aegisPhase === "prepared") {
            const currentVersion = aegisVersion;
            aegisPhase = "playing";
            speakButton.textContent = "⏹ آواز بند کریں";
            status.textContent = "🔊 پاکستانی اردو کی آواز چل رہی ہے…";
            setConversationState("SPEAKING");
            if (window.EZERO_MIC_VISUAL) {
              window.EZERO_MIC_VISUAL.speaking();
            }

            tts.playPrepared().then(function () {
              if (currentVersion !== aegisVersion ||
                  aegisPhase !== "playing") return;
              resetAegis();
              setConversationState("READY");
              status.textContent = "✅ پاکستانی اردو کی آواز مکمل ہوگئی";
              if (window.EZERO_MIC_VISUAL) {
                window.EZERO_MIC_VISUAL.idle();
              }
            }).catch(function (error) {
              if (currentVersion !== aegisVersion ||
                  aegisPhase !== "playing") return;
              resetAegis();
              setConversationState("ERROR");
              status.textContent =
                "آواز چلانے میں مسئلہ: " +
                (error && error.name ? error.name : "Error");
              if (window.EZERO_MIC_VISUAL) {
                window.EZERO_MIC_VISUAL.error();
              }
            });
            return;
          }

          window.speechSynthesis.cancel();
          resetAegis();
          const currentVersion = aegisVersion;
          aegisPhase = "preparing";
          aegisText = text;
          speakButton.textContent = "⏹ تیاری روکیں";
          micButton.disabled = true;
          setConversationState("SPEAKING");
          status.textContent =
            "⏳ پاکستانی اردو کی آواز تیار ہو رہی ہے…";
          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.speaking();
          }

          aegisTimer = setTimeout(function () {
            if (currentVersion !== aegisVersion ||
                aegisPhase !== "preparing") return;
            resetAegis();
            setConversationState("ERROR");
            status.textContent =
              "پاکستانی اردو کی آواز 180 سیکنڈ میں تیار نہیں ہوئی · تحریری جواب موجود ہے";
            if (window.EZERO_MIC_VISUAL) {
              window.EZERO_MIC_VISUAL.error();
            }
          }, 180000);

          tts.prepareAudio(text, {
            rate: configuredRate,
            onProgress: function (progress) {
              if (currentVersion !== aegisVersion ||
                  aegisPhase !== "preparing") return;
              if (progress && Number(progress.total) > 0) {
                const pct = Math.max(0, Math.min(100,
                  Math.round(
                    Number(progress.loaded) * 100 /
                    Number(progress.total)
                  )
                ));
                status.textContent =
                  "⏳ اردو صوتی وسائل: " + pct +
                  "% · آواز کی تیاری جاری ہے";
              }
            }
          }).then(function () {
            if (currentVersion !== aegisVersion ||
                aegisPhase !== "preparing") return;
            clearTimeout(aegisTimer);
            aegisTimer = null;
            aegisPhase = "prepared";
            micButton.disabled = false;
            speakButton.textContent = "🔊 آواز سنیں";
            setConversationState("READY");
            status.textContent =
              "✅ پاکستانی اردو کی آواز تیار ہے · 🔊 آواز سنیں دبائیں";
            if (window.EZERO_MIC_VISUAL) {
              window.EZERO_MIC_VISUAL.idle();
            }
          }).catch(function (error) {
            if (currentVersion !== aegisVersion ||
                aegisPhase !== "preparing") return;
            resetAegis();
            setConversationState("ERROR");
            console.warn("E-ZERO Aegis preparation:", error);
            status.textContent =
              "پاکستانی اردو کی آواز تیار نہیں ہوئی: " +
              (error && error.name ? error.name : "Error");
            if (window.EZERO_MIC_VISUAL) {
              window.EZERO_MIC_VISUAL.error();
            }
          });
          return;
        }

        const speechRun = ++browserSpeechVersion;
        window.speechSynthesis.cancel();

        const speechParts = [];
        let remainingSpeech = text;

        while (remainingSpeech.length > 140) {
          const portion = remainingSpeech.slice(0, 140);
          let cut = Math.max(
            portion.lastIndexOf(" "),
            portion.lastIndexOf("\n"),
            portion.lastIndexOf("۔") + 1,
            portion.lastIndexOf("؟") + 1
          );
          if (cut < 70) cut = 140;
          speechParts.push(remainingSpeech.slice(0, cut).trim());
          remainingSpeech = remainingSpeech.slice(cut).trimStart();
        }

        if (remainingSpeech) speechParts.push(remainingSpeech);

        const utterance = new SpeechSynthesisUtterance(
          speechParts.shift()
        );
        utterance.rate = configuredRate;
        let activeSpeech = utterance;
        let speechStarted = false;
        let recoveryUsed = false;
        const voices = window.speechSynthesis.getVoices() || [];

        let selectedVoice = null;

        const normalizedLocale = value =>
          String(value || "").replace(/_/g, "-").toLowerCase();

        const wanted = normalizedLocale(requestedLang);
        const base = wanted.split("-")[0];

        selectedVoice =
          voices.find(v => normalizedLocale(v.lang) === wanted) ||
          voices.find(v =>
            normalizedLocale(v.lang).split("-")[0] === base
          ) ||
          null;

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        } else {
          utterance.lang = requestedLang;
        }

        utterance.onerror = function (event) {
          if (speechRun !== browserSpeechVersion ||
              this !== activeSpeech) return;

          if (event && event.error === "synthesis-failed" &&
              !speechStarted && !recoveryUsed) {
            recoveryUsed = true;

            const retry = new SpeechSynthesisUtterance(
              activeSpeech.text
            );
            retry.rate = utterance.rate;
            retry.lang = utterance.lang;
            retry.voice = utterance.voice;
            retry.onstart = utterance.onstart;
            retry.onerror = utterance.onerror;
            retry.onend = utterance.onend;

            activeSpeech = retry;
            status.textContent =
              requestedLang.toLowerCase().startsWith("ur-")
                ? "🔄 اردو آواز دوبارہ شروع کرنے کی کوشش…"
                : "🔄 Retrying speech once…";

            setTimeout(function () {
              if (speechRun !== browserSpeechVersion ||
                  activeSpeech !== retry) return;

              try {
                window.speechSynthesis.cancel();
                window.speechSynthesis.resume();
                window.speechSynthesis.speak(retry);
              } catch (_) {
                retry.onerror({error:"synthesis-failed"});
              }
            }, 350);
            return;
          }

          setConversationState("ERROR");
          micButton.disabled = false;

          const errorCode =
            event &&
            typeof event.error === "string" &&
            /^[a-z-]+$/.test(event.error)
              ? event.error
              : "unknown";

          window.EZERO_LAST_SPEECH_ERROR = Object.freeze({
            code: errorCode,
            requestedLocale: requestedLang,
            selectedLocale: selectedVoice ? selectedVoice.lang : null,
            voiceFound: !!selectedVoice
          });

          console.warn(
            "E-ZERO Voice Guide speech synthesis error:",
            window.EZERO_LAST_SPEECH_ERROR
          );

          status.textContent =
            requestedLang.toLowerCase().startsWith("ur-")
              ? "اردو آواز نہیں چل سکی · خرابی: " +
                errorCode +
                " · تحریری جواب موجود ہے"
              : "Speech playback failed · " +
                errorCode +
                " · Text answer is available";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.error();
          }
        };

        utterance.onstart = function () {
          if (speechRun !== browserSpeechVersion ||
              this !== activeSpeech) return;
          speechStarted = true;
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
          if (speechRun !== browserSpeechVersion ||
              this !== activeSpeech) return;

          if (speechParts.length > 0) {
            speechStarted = false;
            recoveryUsed = false;
            const next = new SpeechSynthesisUtterance(
              speechParts.shift()
            );
            next.rate = utterance.rate;
            next.lang = utterance.lang;
            next.voice = utterance.voice;
            next.onstart = utterance.onstart;
            next.onerror = utterance.onerror;
            next.onend = utterance.onend;
            activeSpeech = next;
            window.speechSynthesis.speak(next);
            return;
          }

          setConversationState("READY");
          micButton.disabled = false;

          status.textContent =
            voiceLanguage() === "ur-PK"
              ? "✅ تیار · نیا سوال پوچھنے کے لیے 🎤 دبائیں"
              : "✅ Ready · Tap 🎤 to ask another question";

          if (window.EZERO_MIC_VISUAL) {
            window.EZERO_MIC_VISUAL.idle();
          }
        };

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

    /* E-ZERO PROFESSIONAL MIC VISUAL V0.1 */

    const icons = Object.freeze({
      mic: `
        <span aria-hidden="true"
          style="display:inline-flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:25px;line-height:1;">🎙️</span>`,
      processing: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-3-6.2"></path>
          <path d="M17 3.8v4h-4"></path>
        </svg>`,
      speaking: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M4 10v4M8 7v10M12 5v14M16 8v8M20 10v4"></path>
        </svg>`,
      error: `
        <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
          <path d="M12 3 2.8 20h18.4L12 3z"></path>
          <path d="M12 9v5M12 17.2h.01"></path>
        </svg>`
    });

    function isUrdu() {
      try {
        return voiceLanguage() === "ur-PK";
      } catch (_) {
        return false;
      }
    }

    const arabicMicAccessibility = Object.freeze({
      idle: { aria: "بدء ميكروفون إي زيرو", title: "اضغط مرة واحدة ثم تحدث" },
      listening: { aria: "إي زيرو يستمع إليك", title: "جارٍ الاستماع إليك" },
      processing: { aria: "إي زيرو يُعد الرد", title: "جارٍ إعداد الرد" },
      speaking: { aria: "إي زيرو يقرأ الرد", title: "جارٍ قراءة الرد" },
      error: { aria: "خطأ في الميكروفون", title: "خطأ في الميكروفون" }
    });

    function micLocalizedText(state, field, fallback) {
      if (voiceLanguage() === "ar-SA") {
        const entry = arabicMicAccessibility[state];
        if (entry && entry[field]) return entry[field];
      }
      return fallback;
    }

    const arabicMicLabels = Object.freeze({
      idle: "تحدث",
      listening: "جارٍ الاستماع",
      processing: "جارٍ إعداد الرد",
      speaking: "جارٍ التحدث",
      error: "خطأ في الميكروفون"
    });

    function render(state, en, ur) {
      const icon =
        state === "processing" ? icons.processing :
        state === "speaking" ? icons.speaking :
        state === "error" ? icons.error :
        icons.mic;

      const locale = voiceLanguage();
      const label =
        locale === "ar-SA" ? arabicMicLabels[state] :
        locale === "ur-PK" ? ur : en;

      const subtitle =
        locale === "ar-SA" ? "المساعد الصوتي" :
        locale === "ur-PK" ? "وائس گائیڈ" :
        "Voice Guide";

      micButton.dataset.ezeroMicState = state;
      micButton.innerHTML =
        '<span class="ezero-pro-mic-icon">' + icon + '</span>' +
        '<span class="ezero-pro-mic-copy">' +
          '<strong>' + label + '</strong>' +
          '<small>' + subtitle + '</small>' +
        '</span>';
    }

    if (!document.getElementById("ezeroVoiceMicVisualStyles")) {
      const style = document.createElement("style");
      style.id = "ezeroVoiceMicVisualStyles";
      style.textContent = `
        #ezeroVoiceGuideMic{
          position:relative;
          min-height:50px;
          padding:6px 11px !important;
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:8px;
          border-radius:14px !important;
          overflow:visible;
          transition:
            transform .18s ease,
            box-shadow .18s ease,
            border-color .18s ease,
            opacity .18s ease;
        }

        #ezeroVoiceGuideMic .ezero-pro-mic-icon{
          width:34px;
          height:34px;
          flex:0 0 34px;
          display:grid;
          place-items:center;
          position:relative;
          border-radius:11px;
          color:#fff;
          background:linear-gradient(145deg,#0b4f66,#278fa3);
          box-shadow:
            0 6px 14px rgba(11,79,102,.24),
            inset 0 1px 0 rgba(255,255,255,.25);
        }

        #ezeroVoiceGuideMic .ezero-pro-mic-icon svg{
          width:20px;
          height:20px;
          fill:none;
          stroke:currentColor;
          stroke-width:1.8;
          stroke-linecap:round;
          stroke-linejoin:round;
        }

        #ezeroVoiceGuideMic .ezero-pro-mic-copy{
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          line-height:1.05;
        }

        #ezeroVoiceGuideMic .ezero-pro-mic-copy strong{
          font-size:12px;
          font-weight:900;
          color:#123b4b;
        }

        #ezeroVoiceGuideMic .ezero-pro-mic-copy small{
          margin-top:3px;
          font-size:9px;
          font-weight:700;
          color:#6b818a;
        }

        #ezeroVoiceGuideMic.ezero-mic-listening{
          transform:scale(1.035);
          border-color:#278fa3 !important;
          background:#effafd !important;
          box-shadow:
            0 0 0 3px rgba(39,143,163,.09),
            0 8px 20px rgba(11,79,102,.15);
        }

        #ezeroVoiceGuideMic.ezero-mic-listening .ezero-pro-mic-icon::after{
          content:"";
          position:absolute;
          inset:-6px;
          border:2px solid rgba(39,143,163,.32);
          border-radius:15px;
          animation:ezeroProMicPulse 1.15s ease-out infinite;
        }

        #ezeroVoiceGuideMic.ezero-mic-processing .ezero-pro-mic-icon{
          background:linear-gradient(145deg,#4c6570,#718b96);
        }

        #ezeroVoiceGuideMic.ezero-mic-processing .ezero-pro-mic-icon svg{
          animation:ezeroProMicSpin .9s linear infinite;
        }

        #ezeroVoiceGuideMic.ezero-mic-speaking{
          border-color:#63b4c5 !important;
          background:#f0fbfd !important;
        }

        #ezeroVoiceGuideMic.ezero-mic-speaking .ezero-pro-mic-icon{
          background:linear-gradient(145deg,#0d6178,#35a2b6);
        }

        #ezeroVoiceGuideMic.ezero-mic-speaking .ezero-pro-mic-icon svg{
          animation:ezeroProMicSpeak .7s ease-in-out infinite alternate;
        }

        #ezeroVoiceGuideMic.ezero-mic-error{
          border-color:#d89a9a !important;
          background:#fff7f7 !important;
          animation:ezeroProMicError .35s linear 2;
        }

        #ezeroVoiceGuideMic.ezero-mic-error .ezero-pro-mic-icon{
          background:linear-gradient(145deg,#913c3c,#bd5c5c);
        }

        #ezeroVoiceGuideMic:disabled{
          opacity:.55;
          cursor:not-allowed;
          transform:none;
        }

        @keyframes ezeroProMicPulse{
          0%{opacity:.85;transform:scale(.86)}
          75%,100%{opacity:0;transform:scale(1.3)}
        }

        @keyframes ezeroProMicSpin{
          to{transform:rotate(360deg)}
        }

        @keyframes ezeroProMicSpeak{
          from{transform:scaleY(.84);opacity:.7}
          to{transform:scaleY(1.08);opacity:1}
        }

        @keyframes ezeroProMicError{
          0%,100%{transform:translateX(0)}
          25%{transform:translateX(-3px)}
          75%{transform:translateX(3px)}
        }

        @media(prefers-reduced-motion:reduce){
          #ezeroVoiceGuideMic,
          #ezeroVoiceGuideMic .ezero-pro-mic-icon,
          #ezeroVoiceGuideMic .ezero-pro-mic-icon::after{
            animation:none !important;
            transition:none !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    let micErrorGeneration = 0;

    window.EZERO_MIC_VISUAL = Object.freeze({
      idle: function () {
        micButton.classList.remove(
          "ezero-mic-listening",
          "ezero-mic-processing",
          "ezero-mic-error",
          "ezero-mic-speaking"
        );
        render("idle", "Speak", "بولیں");
        micButton.setAttribute(
          "aria-label",
          micLocalizedText("idle", "aria", (isUrdu() ? "ای زیرو کا مائیکروفون شروع کریں" : "Start E-ZERO Voice Guide microphone"))
        );
        micButton.title = micLocalizedText("idle", "title", isUrdu() ? "ایک بار دبائیں اور بولیں" : "Tap once and speak");
      },

      listening: function () {
        micButton.classList.remove(
          "ezero-mic-processing",
          "ezero-mic-error",
          "ezero-mic-speaking"
        );
        micButton.classList.add("ezero-mic-listening");
        render("listening", "Listening", "سن رہا ہے");
        micButton.setAttribute(
          "aria-label",
          micLocalizedText("listening", "aria", (isUrdu() ? "ای زیرو آپ کی بات سن رہا ہے" : "E-ZERO Voice Guide is listening"))
        );
        micButton.title = micLocalizedText("listening", "title", isUrdu() ? "آپ کی بات سنی جا رہی ہے" : "Listening");
      },

      processing: function () {
        micButton.classList.remove(
          "ezero-mic-listening",
          "ezero-mic-error",
          "ezero-mic-speaking"
        );
        micButton.classList.add("ezero-mic-processing");
        render("processing", "Processing", "تیار ہو رہا ہے");
        micButton.setAttribute(
          "aria-label",
          micLocalizedText("processing", "aria", (isUrdu() ? "ای زیرو جواب تیار کر رہا ہے" : "E-ZERO Voice Guide is processing"))
        );
        micButton.title = micLocalizedText("processing", "title", isUrdu() ? "جواب تیار ہو رہا ہے" : "Preparing answer");
      },

      speaking: function () {
        micButton.classList.remove(
          "ezero-mic-listening",
          "ezero-mic-processing",
          "ezero-mic-error"
        );
        micButton.classList.add("ezero-mic-speaking");
        render("speaking", "Speaking", "جواب دے رہا ہے");
        micButton.setAttribute(
          "aria-label",
          micLocalizedText("speaking", "aria", (isUrdu() ? "ای زیرو جواب سنا رہا ہے" : "E-ZERO Voice Guide is speaking"))
        );
        micButton.title = micLocalizedText("speaking", "title", isUrdu() ? "جواب سنایا جا رہا ہے" : "Speaking");
      },

      error: function () {
        micButton.classList.remove(
          "ezero-mic-listening",
          "ezero-mic-processing",
          "ezero-mic-speaking"
        );
        micButton.classList.add("ezero-mic-error");
        render("error", "Microphone error", "مائیکروفون میں خرابی");
        micButton.setAttribute(
          "aria-label",
          micLocalizedText("error", "aria",
            isUrdu() ? "مائیکروفون میں خرابی" : "Microphone error")
        );
        micButton.title = micLocalizedText(
          "error", "title",
          isUrdu() ? "مائیکروفون میں خرابی" : "Microphone error"
        );

        const thisErrorGeneration = ++micErrorGeneration;
        setTimeout(function () {
          if (
            micButton.dataset.ezeroMicState === "error" &&
            thisErrorGeneration === micErrorGeneration
          ) {
            window.EZERO_MIC_VISUAL.idle();
          }
        }, 900);
      }
    });

    document.addEventListener("ezero:languagechange", function () {
      const state = micButton.dataset.ezeroMicState || "idle";
      const labels = {
        idle: ["Speak", "بولیں"],
        listening: ["Listening", "سن رہا ہے"],
        processing: ["Processing", "تیار ہو رہا ہے"],
        speaking: ["Speaking", "جواب دے رہا ہے"],
        error: ["Microphone error", "مائیکروفون میں خرابی"]
      };
      if (!Object.prototype.hasOwnProperty.call(labels, state)) return;

      const entry = labels[state];
      render(state, entry[0], entry[1]);

      const accessibility = {
        idle: ["Start E-ZERO Voice Guide microphone", "ای زیرو کا مائیکروفون شروع کریں", "Tap once and speak", "ایک بار دبائیں اور بولیں"],
        listening: ["E-ZERO Voice Guide is listening", "ای زیرو آپ کی بات سن رہا ہے", "Listening", "آپ کی بات سنی جا رہی ہے"],
        processing: ["E-ZERO Voice Guide is processing", "ای زیرو جواب تیار کر رہا ہے", "Preparing answer", "جواب تیار ہو رہا ہے"],
        speaking: ["E-ZERO Voice Guide is speaking", "ای زیرو جواب سنا رہا ہے", "Speaking", "جواب سنایا جا رہا ہے"],
        error: ["Microphone error", "مائیکروفون میں خرابی", "Microphone error", "مائیکروفون میں خرابی"]
      };

      const a = accessibility[state];
      micButton.setAttribute(
        "aria-label",
        micLocalizedText(state, "aria", isUrdu() ? a[1] : a[0])
      );
      micButton.title = micLocalizedText(
        state, "title", isUrdu() ? a[3] : a[2]
      );
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

    if (typeof window.EZERO_POSITION_AI_AGENT_PANEL === "function") {
      window.EZERO_POSITION_AI_AGENT_PANEL();
    }

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
