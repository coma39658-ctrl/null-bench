/* Persist the user's interface language on this device.
 * No account identifier or contact data is stored; only ur/en/ar preference.
 * An explicit ?lang= value takes precedence for a shared-language link.
 */
(()=>{"use strict";
const select=document.getElementById("language");
if(!select)return;
const KEY="ezero_secure_connect_language_v1";
const allowed=new Set(["ur","en","ar"]);
let stored=null;
try{stored=localStorage.getItem(KEY);}catch(_){}
let requested=null;
try{requested=new URLSearchParams(location.search).get("lang");}catch(_){}
const initial=allowed.has(requested)?requested:
  allowed.has(stored)?stored:
  allowed.has(select.value)?select.value:"ur";
function apply(value,persist){
  const lang=allowed.has(value)?value:"ur";
  select.value=lang;
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="en"?"ltr":"rtl";
  const callLanguage=document.getElementById("ezeroInCallLanguage");
  if(callLanguage&&callLanguage.value!==lang)callLanguage.value=lang;
  if(persist){try{localStorage.setItem(KEY,lang);}catch(_){}}
}
select.addEventListener("change",()=>apply(select.value,true));
apply(initial,false);
// Notify all existing, independently tested language dictionaries once so
// labels, accessibility text, call status and the compact home stay in sync.
select.dispatchEvent(new Event("change",{bubbles:true}));
})();