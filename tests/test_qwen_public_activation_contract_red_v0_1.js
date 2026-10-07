"use strict";

const fs = require("fs");

const source = fs.readFileSync(
  "js/ezero_voice_guide_ui_v0_1.js",
  "utf8"
);

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log("PASS:", name);
    passed++;
  } else {
    console.log("FAIL:", name);
    failed++;
  }
}

/*
Frozen requirement:
Verified deterministic E-ZERO knowledge must have priority over governed Qwen
regardless of selected language.
*/
check(
  "deterministic verified answer priority is language-independent",
  source.includes("if (deterministicResult.matched)") &&
    !source.includes('if (language !== "en" && deterministicResult.matched)')
);

/*
Frozen automatic voice turn-loop:
LISTEN -> THINKING -> ANSWER -> SPEAKING -> READY

A recognized transcript is the user question, not the ANSWER state.
Therefore the automatic path must not set ANSWER before THINKING.
*/
const onResultStart = source.indexOf(
  "recognition.onresult = function (event)"
);
const onResultEnd = source.indexOf(
  "recognition.onerror = function (event)",
  onResultStart
);

const onResultBlock =
  onResultStart >= 0 && onResultEnd > onResultStart
    ? source.slice(onResultStart, onResultEnd)
    : "";

const autoSubmitStart = onResultBlock.indexOf(
  "window.EZERO_VOICE_GUIDE_SETTINGS.autoSubmit"
);

const thinkingIndex = onResultBlock.indexOf(
  'setConversationState("THINKING")'
);

const answerIndex = onResultBlock.indexOf(
  'setConversationState("ANSWER")'
);

check(
  "automatic microphone path enters THINKING before ANSWER",
  autoSubmitStart >= 0 &&
    thinkingIndex >= 0 &&
    (answerIndex < 0 || thinkingIndex < answerIndex)
);


check(
  "microphone onstart enters LISTEN",
  source.includes('recognition.onstart = function ()') &&
    source.includes('setConversationState("LISTEN")')
);

check(
  "auto-submit enters THINKING before triggering Ask",
  onResultBlock.includes('setConversationState("THINKING")') &&
    onResultBlock.indexOf('setConversationState("THINKING")') <
      onResultBlock.indexOf("askButton.click()")
);

check(
  "recognized transcript is not prematurely marked ANSWER",
  !onResultBlock.includes('setConversationState("ANSWER")')
);

check(
  "completed question paths expose ANSWER state",
  source.includes('window.EZERO_VOICE_CONVERSATION.setState("ANSWER")')
);

check(
  "speech path contains SPEAKING and READY states",
  source.includes('setConversationState("SPEAKING")') &&
    source.includes('setConversationState("READY")')
);

console.log("-----");
console.log("PASSED =", passed);
console.log("FAILED =", failed);

if (failed !== 0) {
  process.exit(1);
}
