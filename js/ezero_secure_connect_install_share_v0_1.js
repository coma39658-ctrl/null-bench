/*
 * E-ZERO Secure Connect — public link sharing & consent-first install guidance.
 * A message contains ONLY a public static URL, never a contact fingerprint, SDP,
 * QR token, media, personal data or call status.
 * beforeinstallprompt is browser-controlled; never force installation or claim
 * success before appinstalled/standalone reports actual installation.
 * No new server, analytics, recording, service worker or caches are created here.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const labels={
    ur:{
      title:"E-ZERO دوستوں کو بھیجیں اور ایپ بنائیں",
      description:"یہ لنک WhatsApp، IMO یا کسی بھی میسج میں بھیجیں۔ لنک کھولنے والے دوست کو اسی صفحے پر انسٹال کا بٹن نظر آئے گا۔",
      share:"↗ دوست کو لنک بھیجیں",copy:"📋 ویب سائٹ لنک کاپی",install:"📲 ہوم اسکرین پر انسٹال کریں",
      initial:"انسٹالیشن آپ کی منظوری سے ہوگی؛ میسج کے اندر خودکار انسٹالیشن ممکن نہیں۔",
      ready:"اس براؤزر میں انسٹالیشن دستیاب ہے۔ «انسٹال کریں» دبانے سے اجازت والا ڈائیلاگ کھلے گا۔",
      shown:"براؤزر نے انسٹالیشن کی اجازت مانگی ہے؛ قبول یا مسترد کرنا آپ کا اختیار ہے۔",
      accepted:"انسٹالیشن کی درخواست قبول کی گئی؛ براؤزر کی مکمل تصدیق کا انتظار ہے۔",
      cancelled:"انسٹالیشن منسوخ ہوئی؛ دوبارہ کوشش کرسکتے ہیں۔",
      installed:"✓ براؤزر نے ایپ انسٹال ہونے کی تصدیق کردی ہے۔ ہوم اسکرین یا ایپ لسٹ سے کھولیں۔",
      manual:"اس براؤزر میں براہِ راست انسٹال ڈائیلاگ دستیاب نہیں۔ نیچے آسان طریقہ دیکھیں۔",
      copyOk:"✓ صرف عوامی ویب سائٹ کا لنک کاپی ہوا۔ دوست کو کسی بھی میسج میں بھیج دیں۔",
      copyFail:"فون نے لنک کاپی کرنے کی اجازت نہیں دی؛ نیچے موجود لنک کو لمبا دبا کر کاپی کریں۔",
      shared:"شیئرنگ کا عمل مکمل ہوا؛ دوست نے واقعی میسج وصول کیا یا نہیں، اس کی تصدیق یہاں نہیں ہوتی۔",
      shareCancel:"شیئرنگ منسوخ کی گئی؛ کوئی میسج بھیجنے کی تصدیق نہیں ہوئی۔",
      shareFail:"براہِ راست شیئرنگ دستیاب نہیں؛ «لنک کاپی» کرکے WhatsApp، IMO یا کسی اور ایپ میں پیسٹ کریں۔",
      helpTitle:"اگر انسٹال ڈائیلاگ نہ کھلے",
      helpPrivacy:"یہ شارٹ کٹ صرف ایپ کھولتا ہے۔ ابھی مستقل اکاؤنٹس یا پس منظر میں خودکار کال وصولی موجود نہیں۔",
      androidHelp:"اگر لنک WhatsApp یا IMO کے اندر کھلا ہے تو اس کے مینو سے «Open in Chrome» منتخب کریں۔ پھر Chrome کے ⋮ مینو میں «Install app» یا «Add to Home screen» دبائیں اور اجازت دیں۔",
      iosHelp:"Safari یا معاون براؤزر میں لنک کھولیں، Share کا آئیکن دبائیں، «Add to Home Screen» منتخب کریں اور «Add» کی منظوری دیں۔",
      desktopHelp:"براؤزر کے مینو میں «Install app» یا «Create shortcut» تلاش کریں۔ صرف براؤزر کی اجازت کے بعد ایپ یا شارٹ کٹ بنے گا۔",
      installError:"براؤزر انسٹالیشن کی درخواست مکمل نہ کرسکا۔ Chrome کے مینو سے Install app / Add to Home Screen آزمائیں۔",
      urlLabel:"E-ZERO Secure Connect کا عوامی لنک",
      shareText:"E-ZERO Secure Connect کھولیں۔ اسی صفحے پر «Install app / Add to Home Screen» موجود ہے۔ یہ ابھی تجرباتی دو فون کالنگ سروس ہے۔"
    },
    en:{
      title:"Share E-ZERO and install the app",
      description:"Send this link via WhatsApp, IMO or any messaging app. Your friend sees the Install button on the same page when they open it.",
      share:"↗ Send link to friend",copy:"📋 Copy website link",install:"📲 Install on home screen",
      initial:"Installation needs your approval. A link inside a message cannot install an app automatically.",
      ready:"This browser supports the install dialog. Tap Install and approve the browser prompt.",
      shown:"The browser has asked for installation approval. Accept or decline as you choose.",
      accepted:"Installation was accepted; awaiting browser confirmation.",
      cancelled:"Installation was cancelled. You can try again.",
      installed:"✓ The browser confirmed installation. Open from your home screen or app list.",
      manual:"This browser cannot launch an install dialog here. Follow the instructions below.",
      copyOk:"✓ Public website link copied. Send it in any chat app.",
      copyFail:"Clipboard permission unavailable. Long-press the website link below to copy.",
      shared:"The share sheet completed; this does not prove the recipient received the message.",
      shareCancel:"Sharing cancelled. No delivery is confirmed.",
      shareFail:"Direct sharing is unavailable. Copy the link and paste it into WhatsApp, IMO or any messenger.",
      helpTitle:"If no installation dialog opens",
      helpPrivacy:"The installed shortcut opens this app. Permanent friend accounts and background incoming calls are not available yet.",
      androidHelp:"If opened inside WhatsApp or IMO, choose Open in Chrome from that app's menu. In Chrome, tap ⋮ → Install app or Add to Home screen and confirm.",
      iosHelp:"Open this page in Safari or another supported browser. Tap Share → Add to Home Screen → Add.",
      desktopHelp:"Open your browser menu and choose Install app or Create shortcut. Installation always requires your approval.",
      installError:"The browser could not start installation. Use the Chrome menu → Install app / Add to Home screen.",
      urlLabel:"E-ZERO Secure Connect public link",
      shareText:"Open E-ZERO Secure Connect. Install App / Add to Home Screen is on the page. Two-phone calling is experimental."
    },
    ar:{
      title:"مشاركة E-ZERO وتثبيته كتطبيق",
      description:"أرسل هذا الرابط عبر واتساب أو IMO أو أي تطبيق مراسلة. سيظهر زر التثبيت في الصفحة نفسها عند فتحه.",
      share:"↗ إرسال الرابط لصديق",copy:"📋 نسخ رابط الموقع",install:"📲 تثبيت على الشاشة الرئيسية",
      initial:"يتطلب التثبيت موافقتك. لا يمكن للرابط داخل الرسائل تثبيت التطبيق تلقائياً.",
      ready:"يدعم هذا المتصفح نافذة التثبيت. اضغط تثبيت ووافق على طلب المتصفح.",
      shown:"طلب المتصفح موافقتك على التثبيت. يمكنك القبول أو الرفض.",
      accepted:"تم قبول طلب التثبيت؛ ننتظر تأكيد المتصفح.",
      cancelled:"أُلغي التثبيت. يمكنك المحاولة مجدداً.",
      installed:"✓ أكد المتصفح تثبيت التطبيق. افتحه من الشاشة الرئيسية أو قائمة التطبيقات.",
      manual:"لا يستطيع هذا المتصفح فتح نافذة التثبيت هنا. اتبع الخطوات أدناه.",
      copyOk:"✓ تم نسخ رابط الموقع العام فقط. أرسله في أي تطبيق مراسلة.",
      copyFail:"لم تتوفر صلاحية النسخ. اضغط مطولاً على الرابط أدناه لنسخه.",
      shared:"اكتملت واجهة المشاركة؛ هذا لا يثبت وصول الرسالة إلى الصديق.",
      shareCancel:"أُلغيت المشاركة؛ لم يتأكد التسليم.",
      shareFail:"المشاركة المباشرة غير متاحة. انسخ الرابط والصقه في واتساب أو IMO أو غيرهما.",
      helpTitle:"إذا لم تظهر نافذة التثبيت",
      helpPrivacy:"يفتح الاختصار هذا التطبيق؛ الحسابات الدائمة والمكالمات الواردة في الخلفية غير متاحة بعد.",
      androidHelp:"إذا فتح الرابط داخل واتساب أو IMO، اختر فتح في Chrome من قائمة التطبيق. ثم في Chrome اضغط ⋮ ← تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية، ووافق.",
      iosHelp:"افتح الصفحة في Safari أو متصفح مدعوم. اضغط مشاركة ← إضافة إلى الشاشة الرئيسية ← إضافة.",
      desktopHelp:"من قائمة المتصفح اختر تثبيت التطبيق أو إنشاء اختصار. التثبيت يحتاج موافقتك دائماً.",
      installError:"تعذر بدء التثبيت. استخدم قائمة Chrome ← تثبيت التطبيق / إضافة إلى الشاشة الرئيسية.",
      urlLabel:"الرابط العام لـ E-ZERO Secure Connect",
      shareText:"افتح E-ZERO Secure Connect. ستجد خيار تثبيت التطبيق / إضافته إلى الشاشة الرئيسية في الصفحة. المكالمات بين هاتفين تجريبية حالياً."
    }
  };
  const lang=()=>["en","ar","ur"].includes(document.documentElement.lang)?
    document.documentElement.lang:"ur";
  const t=key=>(labels[lang()]||labels.ur)[key]||labels.ur[key]||key;
  // Share only the stable public URL. No query strings, fingerprints, QR,
  // invite text, friend lists or network addresses may enter the share payload.
  const PUBLIC_URL=new URL("./ezero_secure_connect_live_p2p_v0_1.html",location.href).href;
  let promptEvent=null,installed=false,statusKey="initial",showHelp=false;
  const appLink=$("publicConnectLink");
  appLink.href=PUBLIC_URL;
  appLink.textContent=PUBLIC_URL;
  appLink.setAttribute("aria-label",t("urlLabel"));
  function status(key){
    statusKey=key;
    $("shareInstallStatus").textContent=t(key);
    $("shareInstallStatus").dataset.state=key;
  }
  function helper(){
    const ua=navigator.userAgent||"";
    return /iPhone|iPad|iPod/.test(ua)?t("iosHelp"):
      /Android/i.test(ua)?t("androidHelp"):t("desktopHelp");
  }
  function render(){
    for(const node of document.querySelectorAll("[data-share-i18n]"))
      node.textContent=t(node.getAttribute("data-share-i18n"));
    appLink.setAttribute("aria-label",t("urlLabel"));
    $("installHelp").hidden=!showHelp;
    if(showHelp)$("installHelpText").textContent=helper();
    if(installed){
      $("installSecureConnect").disabled=true;
      status("installed");
    }else status(statusKey);
  }
  function openInstallHelp(key="manual"){
    showHelp=true;render();status(key);
    $("installHelp").hidden=false;
  }
  function isStandalone(){
    return Boolean(window.matchMedia?.("(display-mode: standalone)").matches) ||
      navigator.standalone===true;
  }
  if(isStandalone()){
    installed=true;statusKey="installed";
  }
  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();
    if(installed)return;
    promptEvent=event;
    status("ready");
  });
  window.addEventListener("appinstalled",()=>{
    promptEvent=null;installed=true;showHelp=false;render();
  });
  $("installSecureConnect").addEventListener("click",()=>{
    if(installed){status("installed");return;}
    if(!promptEvent){
      openInstallHelp("manual");return;
    }
    // Synchronous call from direct user action: browser owns the permission UI.
    const ev=promptEvent;
    promptEvent=null;
    try{
      ev.prompt();
      status("shown");
      Promise.resolve(ev.userChoice).then(result=>{
        if(installed)return;
        const accepted=result?.outcome==="accepted";
        status(accepted?"accepted":"cancelled");
        if(!accepted)openInstallHelp("cancelled");
      }).catch(()=>openInstallHelp("installError"));
    }catch(_){openInstallHelp("installError");}
  });
  function legacyCopy(textValue){
    const input=document.createElement("textarea");
    input.value=textValue;
    input.style.cssText="position:fixed;left:0;top:0;width:1px;height:1px;opacity:0";
    document.body.appendChild(input);
    input.focus();input.select();
    let ok=false;
    try{ok=document.execCommand?.("copy")===true;}catch(_){}
    input.remove();
    return ok;
  }
  $("copyConnectLink").addEventListener("click",async()=>{
    let success=false;
    try{
      if(navigator.clipboard?.writeText){
        await navigator.clipboard.writeText(PUBLIC_URL);
        success=true;
      }else success=legacyCopy(PUBLIC_URL);
    }catch(_){success=legacyCopy(PUBLIC_URL);}
    status(success?"copyOk":"copyFail");
  });
  $("shareConnectLink").addEventListener("click",async()=>{
    if(typeof navigator.share!=="function"){
      status("shareFail");return;
    }
    try{
      await navigator.share({
        title:"E-ZERO Secure Connect",
        text:t("shareText"),
        url:PUBLIC_URL
      });
      status("shared");
    }catch(error){
      status(error?.name==="AbortError"?"shareCancel":"shareFail");
    }
  });
  $("language")?.addEventListener("change",render);
  render();
})();
