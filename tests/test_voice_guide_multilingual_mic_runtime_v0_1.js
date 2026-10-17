 "use strict";
const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync(
  "js/ezero_voice_guide_ui_v0_1.js", "utf8"
);
const start = source.indexOf(
  "/* E-ZERO Voice Guide — Microphone Visual State */"
);
const end = source.indexOf(
  "/* E-ZERO Result Intelligence Listener V0.1 */",
  start
);
assert(start >= 0 && end > start, "Module boundaries missing");

const moduleCode = source.slice(start, end);
const locales = {
  en: ["Voice Guide", "Speak", "Listening", "Processing", "Speaking", "Microphone error"],
  ur: ["وائس گائیڈ", "بولیں", "سن رہا ہے", "تیار ہو رہا ہے", "جواب دے رہا ہے", "مائیکروفون میں خرابی"],
  ar: ["المساعد الصوتي", "تحدث", "جارٍ الاستماع", "جارٍ إعداد الرد", "جارٍ التحدث", "خطأ في الميكروفون"]
};
const states = ["idle", "listening", "processing", "speaking", "error"];
let checks = 0;

for (const language of Object.keys(locales)) {
  const events = {};
  const attributes = {};
  const classes = new Set();
  const button = {
    dataset: {},
    innerHTML: "",
    title: "",
    classList: {
      add: (...items) => items.forEach(x => classes.add(x)),
      remove: (...items) => items.forEach(x => classes.delete(x))
    },
    setAttribute: (key, value) => { attributes[key] = value; }
  };
  const selector = { value: language };
  const styleIds = new Set();
  let timers = 0;
  let network = 0;
  let recognitionStarts = 0;
  const document = {
    readyState: "complete",
    head: { appendChild: el => styleIds.add(el.id) },
    createElement: () => ({ id: "", textContent: "" }),
    getElementById: id => ({
      ezeroVoiceGuideMic: button,
      ezeroVoiceGuideStatus: {},
      languageSelect: selector,
      ezeroVoiceMicVisualStyles: styleIds.has(id) ? {} : null
    })[id] || null,
    addEventListener: (name, fn) => { events[name] = fn; }
  };
  const window = {
    SpeechRecognition: class {
      start() { recognitionStarts++; }
    }
  };
  const context = {
    window, document,
    voiceLanguage: () => ({
      en: "en-US", ur: "ur-PK", ar: "ar-SA"
    })[selector.value],
    setTimeout: () => { timers++; return timers; },
    fetch: () => { network++; throw Error("Network forbidden"); },
    console
  };
  vm.runInNewContext(moduleCode, context, { timeout: 1000 });
  assert(window.EZERO_MIC_VISUAL, "Visual API missing");
  assert(events["ezero:languagechange"], "Language listener missing");

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    window.EZERO_MIC_VISUAL[state]();
    assert.strictEqual(button.dataset.ezeroMicState, state);
    assert(button.innerHTML.includes(locales[language][0]));
    assert(button.innerHTML.includes(locales[language][i + 1]));
    assert(attributes["aria-label"], "Missing aria-label");
    assert(button.title, "Missing title");
    checks++;
  }

  for (const state of states) {
    window.EZERO_MIC_VISUAL[state]();
    const oldTimers = timers;
    const original = selector.value;
    selector.value = original === "en" ? "ur" : "en";
    events["ezero:languagechange"]();
    assert.strictEqual(button.dataset.ezeroMicState, state);
    assert.strictEqual(timers, oldTimers, "Language switch created timer");
    selector.value = original;
    events["ezero:languagechange"]();
    checks++;
  }
  assert.strictEqual(network, 0);
  assert.strictEqual(recognitionStarts, 0);
}
console.log("MULTILINGUAL_MIC_RUNTIME: PASS");
console.log("STATE_AND_LANGUAGE_CHECKS:", checks);
console.log("NETWORK_AND_RECOGNITION: NONE");
