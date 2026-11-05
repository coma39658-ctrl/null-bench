"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const page=fs.readFileSync("ezero_secure_connect_privacy_v0_2.html","utf8");
const script=fs.readFileSync("js/ezero_secure_connect_policy_i18n_v0_3.js","utf8");
const qr=fs.readFileSync("js/ezero_secure_connect_public_qr_v0_2.js","utf8");
const css=fs.readFileSync("css/ezero_secure_connect_public_qr_v0_2.css","utf8");
new vm.Script(script,{filename:"E-ZERO privacy language switcher"});
assert.match(page,/id="policyLanguage"/);
for(const lang of ["ur","ar","en"]){
  assert.match(page,new RegExp('value="'+lang+'"'));
  const start=page.indexOf('data-policy-lang="'+lang+'"');
  assert.ok(start>0,"Missing "+lang+" policy");
  const end=page.indexOf("</div>",start);
  const section=page.slice(start,end);
  assert.equal((section.match(/<section class=/g)||[]).length,9,
    "Every language must contain intro, commitment, and 7 policy sections ("+lang+")");
  assert.equal((section.match(/<tr>/g)||[]).length,6,
    "Every language must include full 5-row data handling table ("+lang+")");
  assert.equal((section.match(/<li>/g)||[]).length,9,
    "Every language must retain 3 camera safeguards + 6 technical safeguards ("+lang+")");
  assert.match(section,/SHA-256/);
  assert.match(section,/localStorage/);
  assert.match(section,/MediaRecorder/);
  assert.match(section,/WhatsApp/);
  assert.match(section,/GitHub Pages/);
  assert.match(section,/c\.html/);
}
assert.match(page,/<div class="policy-language" data-policy-lang="ur">/);
assert.match(page,/<div class="policy-language" data-policy-lang="en" lang="en" dir="ltr" hidden>/);
assert.match(page,/<div class="policy-language" data-policy-lang="ar" lang="ar" dir="rtl" hidden>/);
assert.match(page,/id="policyBack"/);
assert.match(page,/id="policyBrandSubtitle"/);
assert.match(page,/id="policyFooter"/);
assert.match(page,/script-src 'self'/);
assert.match(page,/ezero_secure_connect_policy_i18n_v0_3\.js/);
assert.match(script,/document\.documentElement\.dir=lang==="en"\?"ltr":"rtl"/);
assert.match(script,/history\.replaceState/);
assert.match(script,/goBack\.searchParams\.set\("lang",lang\)/);
assert.match(script,/section\.hidden=section\.dataset\.policyLang!==lang/);
assert.match(qr,/policyLink\.href=language==="ur"\?base:base\+"\?lang="\+encodeURIComponent\(language\)/);
assert.match(css,/\.policy-language\[hidden\]\{display:none!important\}/);
assert.doesNotMatch(page,/https?:\/\/[^"'\s]+\.js|<iframe\b/i);
assert.doesNotMatch(script,/\bfetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB/);
assert.match(page,/ڈیٹا فروخت/);
assert.match(page,/No website can guarantee/);
assert.match(page,/لا يستطيع أي موقع ضمان/);
console.log("COMPLETE_POLICY_UR_AR_EN_ALL_7_SECTIONS_AND_5_DATA_ROWS: PASS");
console.log("NO_NEW_NETWORK_OR_AD_TRACKING_AND_PRIVACY_BOUNDARIES: PASS");
console.log("LANGUAGE_SAFE_RETURN_NAVIGATION_AND_RTL_LTR: PASS");
