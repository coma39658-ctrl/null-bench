/* Keep all phones on one public E-ZERO green Secure Connect page.
 * The main website exit is an actual link. Never render a decorative
 * back button that traps a user on the video-call page. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const labels={
  ur:"↩ واپس / مرکزی صفحہ",
  en:"↩ Back / Main site",
  ar:"↩ رجوع / الصفحة الرئيسية"
};
function fix(){
 const back=$("modernBack"),qr=$("modernQrLink");
 if(back){
   const lang=document.documentElement.lang;
   back.href="./index.html";
   back.textContent=labels[lang]||labels.ur;
   back.setAttribute("aria-label",back.textContent);
   back.setAttribute("title",back.textContent);
 }
 if(qr)qr.href="./ezero_secure_connect_one_request_lab_20261106.html";
}
fix();
$("language")?.addEventListener("change",fix);
})();
