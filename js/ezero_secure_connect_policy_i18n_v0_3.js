/* E-ZERO privacy policy: complete local Urdu/Arabic/English sections.
 * No network calls, cookies, storage, analytics or external translation services.
 * A URL language parameter lets users return to Secure Connect in the same language.
 */
(() => {
  "use strict";
  const select=document.getElementById("policyLanguage");
  const back=document.getElementById("policyBack");
  const footer=document.getElementById("policyFooter");
  const label=document.getElementById("policyLanguageLabel");
  const subtitle=document.getElementById("policyBrandSubtitle");
  if(!select||!back||!footer||!label)return;
  const messages={
    ur:{
      back:"↩ رابطے پر واپس",language:"زبان",brand:"پرائیویسی اور سیکیورٹی",
      title:"E-ZERO Secure Connect — پرائیویسی اور سیکیورٹی پالیسی",
      footer:"E-ZERO · رازداری کو ترجیح · اشتہار نہیں · نجی ڈیٹا فروخت نہیں"
    },
    ar:{
      back:"↩ العودة إلى الاتصال",language:"اللغة",brand:"الخصوصية والأمان",
      title:"E-ZERO Secure Connect — سياسة الخصوصية والأمان",
      footer:"E-ZERO · الخصوصية أولاً · بلا إعلانات · لا بيع للبيانات الخاصة"
    },
    en:{
      back:"↩ Back to Connect",language:"Language",brand:"Privacy & Security",
      title:"E-ZERO Secure Connect — Privacy & Security Policy",
      footer:"E-ZERO · Privacy first · No ads · No sale of private data"
    }
  };
  const current=new URL(location.href);
  function render(lang,changeUrl){
    lang=Object.hasOwn(messages,lang)?lang:"ur";
    select.value=lang;
    document.documentElement.lang=lang;
    document.documentElement.dir=lang==="en"?"ltr":"rtl";
    for(const section of document.querySelectorAll("[data-policy-lang]")){
      section.hidden=section.dataset.policyLang!==lang;
      section.setAttribute("aria-hidden",String(section.hidden));
    }
    const m=messages[lang];
    back.textContent=m.back;label.textContent=m.language;
    if(subtitle)subtitle.textContent=m.brand;
    footer.textContent=m.footer;document.title=m.title;
    const goBack=new URL("./ezero_secure_connect_live_p2p_v0_1.html",location.href);
    if(lang!=="ur")goBack.searchParams.set("lang",lang);
    back.href=goBack.href;
    if(changeUrl){
      const address=new URL(location.href);
      if(lang==="ur")address.searchParams.delete("lang");
      else address.searchParams.set("lang",lang);
      try{history.replaceState(null,"",address.href);}catch(_){}
    }
  }
  select.addEventListener("change",event=>render(event.target.value,true));
  render(current.searchParams.get("lang")||"ur",false);
})();
