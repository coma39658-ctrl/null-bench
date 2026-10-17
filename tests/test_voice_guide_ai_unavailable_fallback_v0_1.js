"use strict";

const fs = require("fs");
const vm = require("vm");

const elements = {
  languageSelect: { value: "ur" },
  ezeroVoiceGuideInput: {
    value: "",
    handlers: {},
    addEventListener: function (name, fn) {
      this.handlers[name] = fn;
    }
  },
  ezeroVoiceGuideAnswer: { textContent: "" },
  ezeroVoiceGuideStatus: { textContent: "" },
  ezeroVoiceGuideAsk: {
    handlers: {},
    addEventListener: function (name, fn) {
      this.handlers[name] = fn;
    }
  }
};

global.window = global;

global.document = {
  readyState: "complete",
  documentElement: { lang: "ur" },
  getElementById: function (id) {
    return elements[id] || null;
  },
  addEventListener: function () {}
};

window.EZERO_PUBLIC_AI_ENABLED = true;
window.EZERO_PUBLIC_AI_ENDPOINT =
  "https://ezero-qwen-lab-adapter.onrender.com/api/ezero-agent/v0.1/ask";

window.EZERO_VOICE_GUIDE_SETTINGS = {
  autoSpeak: false,
  answerLength: "short"
};

window.EZERO_QWEN_PUBLIC_AGENT_V0_1 = {
  ask: async function () {
    throw new Error("AI_GATEWAY_HTTP_503");
  }
};

window.EZERO_VOICE_CONVERSATION = {
  state: "READY",
  setState: function (next) {
    this.state = next;
  },
  getState: function () {
    return this.state;
  }
};

const knowledgeSource = fs.readFileSync(
  "js/ezero_voice_guide_knowledge_v0_1.js",
  "utf8"
);

vm.runInThisContext(knowledgeSource, {
  filename: "ezero_voice_guide_knowledge_v0_1.js"
});

const fullUiSource = fs.readFileSync(
  "js/ezero_voice_guide_ui_v0_1.js",
  "utf8"
);

const firstIife = fullUiSource.split(
  "/* Phase 0 browser speech input/output */"
)[0];

vm.runInThisContext(firstIife, {
  filename: "ezero_voice_guide_ui_v0_1.core.js"
});

const askHandler =
  elements.ezeroVoiceGuideAsk.handlers.click;

if (typeof askHandler !== "function") {
  throw new Error("VOICE_GUIDE_ASK_HANDLER_NOT_BOUND");
}

elements.ezeroVoiceGuideInput.value =
  "ایک ایسا غیر رجسٹرڈ سوال جس کا verified E-ZERO جواب موجود نہیں";

(async function () {
  await askHandler();

  const answer =
    elements.ezeroVoiceGuideAnswer.textContent;

  const status =
    elements.ezeroVoiceGuideStatus.textContent;

  console.log("FALLBACK_ANSWER:", answer);
  console.log("FALLBACK_STATUS:", status);
  console.log(
    "CONVERSATION_STATE:",
    window.EZERO_VOICE_CONVERSATION.getState()
  );

  if (answer !== "میرے پاس اس سوال کے لیے ابھی ای زیرو کی تصدیق شدہ معلومات موجود نہیں ہیں۔ براہِ کرم ای زیرو کی ویب سائٹ پر درج تصدیق شدہ شواہد دیکھیں یا ای زیرو کے کسی مخصوص حصے کے بارے میں پوچھیں۔") {
    throw new Error("AI_UNAVAILABLE_FALLBACK_TEXT_MISSING");
  }

  if (status !== "تصدیق شدہ جواب دستیاب نہیں · حفاظتی طور پر جواب روکا گیا") {
    throw new Error("AI_UNAVAILABLE_NOT_FAIL_CLOSED");
  }

  if (
    window.EZERO_VOICE_CONVERSATION.getState() !== "ANSWER"
  ) {
    throw new Error("AI_UNAVAILABLE_STATE_NOT_ANSWER");
  }

  console.log("VOICE_GUIDE_AI_UNAVAILABLE_FALLBACK: PASS");
  console.log("PUBLIC_AI_ACTIVATION: STILL_OFF");
})().catch(function (error) {
  console.error(error);
  process.exit(1);
});
