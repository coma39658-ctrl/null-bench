/* E-ZERO Secure Connect: one-tap QR-first presentation.
 * Existing signed QR validation, camera permission and WebRTC security are unchanged.
 * No signaling relay, background camera start, automatic calling or secret storage.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const messages = {
    ur: {
      heading:"ایک بٹن سے QR رابطہ", description:"بٹن دبائیں۔ آپ کا QR ظاہر ہوگا اور آپ کی اجازت سے کیمرہ دوست کا QR اسکین کرے گا۔",
      start:"📷 QR رابطہ شروع کریں", again:"📷 دوبارہ اسکین کریں",
      ready:"آغاز کے لیے بٹن دبائیں۔", stop:"■ کیمرہ بند کریں",
      options:"⚙ مزید اختیارات · دوست، شیئر، آڈیو/ویڈیو",
      truth:"QR صرف عارضی ڈیجیٹل شناخت کی تصدیق ہے، مکمل کال نہیں۔ کال کے لیے محفوظ دعوت اور جواب ابھی ضروری ہیں۔",
      confirmed:"✓ دوست کی دستخط شدہ QR شناخت درست ہے۔ کال خودکار شروع نہیں ہوئی۔",
      tryCall:"📞 کال کی آزمائش کے اختیارات", qrLabel:"میرا عارضی QR شناختی کوڈ",
      unavailable:"اس براؤزر میں QR اسکین دستیاب نہیں۔ مزید اختیارات سے شناختی میسج استعمال کریں۔"
    },
    en: {
      heading:"QR connection in one tap", description:"Tap once to show your QR and, with your permission, scan your friend's QR.",
      start:"📷 Start QR connection", again:"📷 Scan again",
      ready:"Tap the button to begin.", stop:"■ Stop camera",
      options:"⚙ More options · friends, sharing, audio/video",
      truth:"QR verifies only a temporary digital key, not a completed call. A signed invite and answer are still required for a call.",
      confirmed:"✓ Your friend's signed QR identity is verified. No call has started automatically.",
      tryCall:"📞 Try the call options", qrLabel:"My temporary identity QR",
      unavailable:"QR scanning is unavailable in this browser. Use identity messages under More options."
    },
    ar: {
      heading:"اتصال QR بضغطة واحدة", description:"اضغط لإظهار رمز QR الخاص بك ومسح رمز صديقك بعد إذنك للكاميرا.",
      start:"📷 بدء اتصال QR", again:"📷 المسح مجددًا",
      ready:"اضغط الزر للبدء.", stop:"■ إيقاف الكاميرا",
      options:"⚙ خيارات إضافية · الأصدقاء والمشاركة والمكالمات",
      truth:"يتحقق QR من مفتاح هوية مؤقت فقط، وليس مكالمة مكتملة. ما زالت الدعوة والرد الموقَّعان مطلوبين للمكالمة.",
      confirmed:"✓ تم التحقق من هوية QR الموقَّعة لصديقك. لم تبدأ مكالمة تلقائيًا.",
      tryCall:"📞 خيارات تجربة المكالمة", qrLabel:"رمز QR لهويتي المؤقتة",
      unavailable:"مسح QR غير متاح في هذا المتصفح. استخدم رسائل الهوية في الخيارات الإضافية."
    }
  };
  const t = key => (messages[document.documentElement.lang] || messages.ur)[key];
  const button=$("oneTapStartButton"), stage=$("oneTapStage"), sourceQR=$("myQr"),
    preview=$("oneTapQr"), sourceStatus=$("qrScanStatus"), status=$("oneTapResult"),
    stop=$("oneTapStop"), originalStop=$("stopScan"), originalScan=$("scanQR"),
    callButton=$("oneTapCall"), advanced=$("secureAdvanced");
  if(!button || !stage || !sourceQR || !preview || !sourceStatus ||
     !status || !stop || !originalStop || !originalScan || !callButton || !advanced) return;

  let started=false, verified=false;
  function translate(){
    for(const el of document.querySelectorAll("[data-one-tap-i18n]")){
      const key=el.dataset.oneTapI18n;
      if(messages[document.documentElement.lang]?.[key] || messages.ur[key]) el.textContent=t(key);
    }
    button.textContent=t(started?"again":"start");
    callButton.textContent=t("tryCall");
    stop.textContent=t("stop");
    preview.setAttribute("aria-label",t("qrLabel"));
    if(verified)status.textContent=t("confirmed");
    else if(!started)status.textContent=t("ready");
    else mirrorStatus();
  }
  function mirrorQR(){
    // Clone the existing signed offline SVG; never generate or upload a new identity.
    preview.replaceChildren(...Array.from(sourceQR.childNodes,child=>child.cloneNode(true)));
  }
  function mirrorStatus(){
    if(verified)return;
    status.textContent=sourceStatus.textContent || t("ready");
    status.dataset.kind=sourceStatus.dataset.kind || "info";
  }
  function syncStop(){
    stop.hidden=originalStop.disabled;
  }
  new MutationObserver(mirrorQR).observe(sourceQR,{childList:true,subtree:true,characterData:true});
  new MutationObserver(mirrorStatus).observe(sourceStatus,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["data-kind"]});
  new MutationObserver(syncStop).observe(originalStop,{attributes:true,attributeFilter:["disabled"]});
  mirrorQR(); syncStop(); translate();
  $("language")?.addEventListener("change",translate);
  button.addEventListener("click",()=>{
    // Explicit click is the sole entry to a camera permission request.
    started=true;verified=false;callButton.hidden=true;
    stage.hidden=false;
    $("oneTapCamera").appendChild($("scanVideo"));
    $("chooseNearby")?.click();
    button.textContent=t("again");
    if(!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia){
      status.textContent=t("unavailable");status.dataset.kind="error";
      return;
    }
    if(!originalScan.disabled)originalScan.click();
    else mirrorStatus();
    syncStop();
  });
  stop.addEventListener("click",()=>{if(!originalStop.disabled)originalStop.click();syncStop();});
  callButton.addEventListener("click",()=>{
    if(!verified)return;
    advanced.open=true;
    $("callSetup").open=true;
    if(window.EZERO_INSTANT_ACTIONS?.open)window.EZERO_INSTANT_ACTIONS.open("audio");
    else $("guidedCallTitle")?.scrollIntoView({block:"start",behavior:"auto"});
  });
  document.addEventListener("ezero:friend-verification",event=>{
    const info=event.detail || {};
    if(info.source!=="scan" || !started)return;
    verified=info.ok===true && info.signed===true;
    callButton.hidden=!verified;
    if(verified){status.textContent=t("confirmed");status.dataset.kind="success";}
    else mirrorStatus();
  });
})();
