/* E-ZERO FRIEND_PAIR QR entry — isolated staging only.
 * Reuses existing signed identity QR and scanner; never substitutes a call-offer QR.
 * No automatic friendship, media permission, signaling or storage.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const source=$("myQr"), scan=$("scanQR"), hub=$("ezeroFrontQrHub");
  if(!source||!scan||!hub||$("ezeroFriendPairEntry"))return;
  const copy={
    ur:["پہلے دوست بنائیں","میرا شناختی QR","دوست کا QR اسکین کریں","QR تیار ہونے کا انتظار ہے۔","دستخط شدہ شناختی QR دکھایا جا رہا ہے۔","شناخت کی تصدیق کے بعد دونوں کی منظوری ضروری ہے؛ ابھی دوست محفوظ نہیں ہوا۔","اس براؤزر میں کیمرہ نہ کھلے تو گیلری سے QR پڑھیں۔"],
    en:["Add a friend first","My identity QR","Scan friend's QR","Waiting for signed QR.","Signed identity QR displayed.","Both users must approve verified pairing; no friend has been saved yet.","If camera scanning fails, use the gallery QR reader."],
    ar:["أضف صديقًا أولاً","رمز هويتي QR","امسح رمز الصديق","بانتظار رمز QR الموقّع.","تم عرض رمز الهوية الموقّع.","يلزم تحقق الهوية وموافقة الطرفين؛ لم يُحفظ الصديق بعد.","إذا تعذر تشغيل الكاميرا، استخدم قارئ QR من المعرض."]
  };
  const lang=()=>copy[document.documentElement.lang]||copy.ur;
  const section=document.createElement("section");section.id="ezeroFriendPairEntry";
  section.setAttribute("aria-label","Friend identity QR — staging");
  section.style.cssText="border:2px solid #56c99b;border-radius:20px;padding:16px;margin:16px 0;background:#073e30;color:#fff;";
  section.innerHTML='<h2 id="ezeroPairHeading"></h2><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" id="ezeroPairShow" style="flex:1;min-width:120px;padding:16px;border-radius:12px;background:#d9ffed;color:#063b2d;font-weight:bold"></button><button type="button" id="ezeroPairScan" style="flex:1;min-width:120px;padding:16px;border-radius:12px;background:#d9ffed;color:#063b2d;font-weight:bold"></button></div><div id="ezeroPairQrPanel" hidden style="margin-top:12px;background:#fff;border-radius:12px;padding:12px;color:#123;text-align:center"><div id="ezeroPairQrImage" role="img" aria-label="Signed identity QR"></div></div><p id="ezeroPairStatus" role="status" aria-live="polite"></p><p id="ezeroPairHelp"></p>';
  hub.parentNode.insertBefore(section,hub);
  const panel=$("ezeroPairQrPanel"), image=$("ezeroPairQrImage"), status=$("ezeroPairStatus");
  let shown=false;
  function render(){
    if(!shown)return;
    const nodes=Array.from(source.childNodes).map(n=>n.cloneNode(true));
    image.replaceChildren(...nodes);
    const hasQR=!!image.querySelector("svg,canvas,img");
    panel.hidden=!hasQR;
    status.textContent=lang()[hasQR?4:3];
  }
  new MutationObserver(render).observe(source,{subtree:true,childList:true,characterData:true});
  function translate(){const a=lang();$("ezeroPairHeading").textContent=a[0];$("ezeroPairShow").textContent=a[1];$("ezeroPairScan").textContent=a[2];$("ezeroPairHelp").textContent=a[5]+" "+a[6];if(shown)render();else status.textContent=a[3];}
  $("ezeroPairShow").addEventListener("click",()=>{shown=true;render();$("chooseNearby")?.click();render();});
  $("ezeroPairScan").addEventListener("click",()=>{if(scan.disabled){status.textContent=lang()[6];return;}scan.click();status.textContent=lang()[5];});
  document.addEventListener("ezero:friend-verification",e=>{if(e.detail?.ok===true&&e.detail?.signed===true)status.textContent=lang()[5];});
  $("language")?.addEventListener("change",translate);translate();
})();
