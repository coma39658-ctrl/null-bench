/* Keep all phones on the one public E-ZERO green Secure Connect page. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
function fix(){
 const back=$("modernBack"),qr=$("modernQrLink");
 if(back){back.href="./index.html";back.textContent="↩ E-ZERO مرکزی ویب سائٹ";}
 if(qr)qr.href="./ezero_secure_connect_one_request_lab_20261106.html";
}
fix();
$("language")?.addEventListener("change",fix);
})();
