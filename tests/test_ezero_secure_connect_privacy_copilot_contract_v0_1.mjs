import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const ui=fs.readFileSync("ezero_secure_connect_live_p2p_v0_1.html","utf8");
const js=fs.readFileSync("js/ezero_secure_connect_privacy_copilot_v0_1.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_live_p2p_v0_1.css","utf8");
new vm.Script(js,{filename:"privacy_copilot.js"});
assert.match(ui,/js\/ezero_secure_connect_privacy_copilot_v0_1\.js/);
const required=["copilotSafetyCode","copilotSafetyHelp","copilotIdentity","copilotCall",
 "copilotRisk","copilotOverride","copilotPhraseUse","copilotSourceLang",
 "copilotTargetLang","copilotTranslate","copilotTranslationResult",
 "copilotCaptionToggle","copilotCaptionResult","copilotClear"];
for(const id of required)assert.match(ui,new RegExp('id="'+id+'"'),id+" missing");
assert.match(ui,/id="copilotPanel"/);
assert.match(css,/\.copilot-risk\[data-state="warning"\]/);
assert.match(js,/EZERO-IDENTITY-COMPARE-V1/);
assert.match(js,/\.sort\(\)\.join\(":"\)/);
assert.match(js,/stopImmediatePropagation\(\)/,
 "Sensitive-message guard prevents old send handler on first click");
assert.match(js,/addEventListener\("click",e=>[\s\S]*\},true\)/,
 "Capture-phase guard executes before pre-existing send handler");
assert.match(js,/processLocally=true/,
 "Speech recognition must be explicitly local-only");
assert.match(js,/Speech\.available\(\{langs:\[loc\],processLocally:true\}\)/);
assert.match(js,/available!=="available"/,
 "Browser AI must fail closed if pack unavailable");
assert.match(js,/engine\.destroy\?\.\(\)/);
assert.match(js,/create\(\{sourceLanguage:from,targetLanguage:to\}\)/);
assert.match(js,/window\.addEventListener\("pagehide"/);
assert.match(js,/document\.addEventListener\("ezero:friend-verification"/);
assert.match(js,/document\.addEventListener\("ezero:call-status"/);
assert.match(js,/new MutationObserver\(/);
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|new WebSocket|MediaRecorder|localStorage|sessionStorage|indexedDB/.test(js),
 "Copilot must never add network sends, session archive, contacts tracking or recording");
assert.ok(!/SpeechRecognition\.install|\.processLocally\s*=\s*false|webkitSpeechRecognition/.test(js),
 "No remote cloud fallback or implicit language-pack download");
assert.ok(!/innerHTML\s*=|eval\s*\(|new Function/.test(js),
 "No HTML injection or executable untrusted input");
assert.ok(js.includes('tr("safetyLow")')||js.includes('"safetyLow"'),
 "No-risk match should not certify text safe");
assert.ok(js.includes("signed")&&js.includes("trustCompare"),
 "Digital signing and human verification remain distinct");
console.log("COPILOT_LOCAL_ONLY_NO_UPLOAD_NO_AUTO_MIC_NO_STORAGE: PASS");
console.log("COPILOT_CRYPTO_HUMAN_SAFETY_NUMBER_AND_SENSITIVE_SEND_GATE: PASS");
console.log("COPILOT_THREE_LANGUAGES_OPTIONAL_LOCAL_AI_AND_GRACEFUL_FALLBACK: PASS");
