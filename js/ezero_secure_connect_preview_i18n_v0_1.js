/* E-ZERO Secure Connect welcome: public static copy localized without any network/API. */
(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const selectorMap = {
    back:".topbar .back",heroEyebrow:".hero .eyebrow",heroTitle:".hero h1",
    intro:".hero .intro",notice:"#previewNotice",welcome:"#connectWelcome",
    liveButton:"#ezeroRealTwoPhoneTest",liveNote:".live-trial-entry p",
    video:'.action-grid button[data-mode="video"] strong',
    videoSmall:'.action-grid button[data-mode="video"] small',
    audio:'.action-grid button[data-mode="audio"] strong',
    audioSmall:'.action-grid button[data-mode="audio"] small',
    voice:'.action-grid button[data-mode="voice"] strong',
    voiceSmall:'.action-grid button[data-mode="voice"] small',
    qr:'.action-grid button[data-mode="qr"] strong',
    qrSmall:'.action-grid button[data-mode="qr"] small',
    messages:'button[data-mode="messages"]',
    groups:'button[data-mode="groups"]',
    demoButton:"#previewIncomingCall",
    demoNote:".incoming-demo-launch p",
    videoTitle:'[data-panel="video"] .sectionhead h2',
    videoInfo:'[data-panel="video"] p:not(.feedback)',
    audioTitle:'[data-panel="audio"] .sectionhead h2',
    audioInfo:'[data-panel="audio"] p:not(.feedback)',
    micMeter:'label[for="micMeter"]',
    voiceTitle:'[data-panel="voice"] .sectionhead h2',
    voiceInfo:'[data-panel="voice"] p:not(.feedback)',
    qrTitle:'[data-panel="qr"] .sectionhead h2',
    qrInfo:'[data-panel="qr"] p:not(.feedback)',
    makeFingerprint:"#makeFingerprint",
    messagesTitle:'[data-panel="messages"] .sectionhead h2',
    messagesInfo:'[data-panel="messages"] p:not(.info)',
    messagesLimit:'[data-panel="messages"] .info',
    groupsTitle:'[data-panel="groups"] .sectionhead h2',
    groupsInfo:'[data-panel="groups"] p',
    videoStart:"#startVideo",videoStop:"#stopVideo",
    audioStart:"#startAudio",audioStop:"#stopAudio",
    voiceStart:"#recordVoice",voiceStop:"#finishVoice",voiceClear:"#clearVoice",
    policyTitle:".policy h2",
    policy1:".policy p:nth-of-type(1)",
    policy2:".policy p:nth-of-type(2)",
    policy3:".policy p:nth-of-type(3)",
    policy4:".policy p:nth-of-type(4)",
    policy5:".policy p:nth-of-type(5)",
    policyFoot:".policy p.small",
    demoLabel:".incoming-demo-label",demoName:".incoming-demo-name",
    demoLimit:"#incomingDemoLimit",demoAcceptAudio:"#demoAcceptAudio",
    demoAcceptVideo:"#demoAcceptVideo",demoDecline:"#demoDecline",
    demoClose:"#demoClose"
  };
  const map = {
    en:{
      back:"↩ Back",heroEyebrow:"PRIVATE COMMUNICATION · LOCAL PREVIEW",heroTitle:"Welcome — E-ZERO Secure Connect",
      intro:"One simple center for clear audio, HD video, voice notes, verified identities and future groups. Community-service, no-ad goal.",
      notice:"LOCAL PREVIEW: Calls, messages and permanent contacts with other users do not work on this page. Microphone, camera and voice note drafts are tested on this phone only.",
      welcome:"Choose a feature. This page is a local device preview, not a real call or remote message.",
      liveButton:"📞 Test a real two-phone call · WebRTC laboratory",
      liveNote:"Real browser-to-browser audio, video and temporary messages. Share the signed offer/answer manually between two phones. Not a permanent account or background calling service.",
      video:"Video call",videoSmall:"HD camera · Local test",audio:"Audio call",audioSmall:"Mic quality · Local test",
      voice:"Voice message",voiceSmall:"Local private draft",qr:"QR identity",qrSmall:"SHA-256 · Local preview",
      messages:"🔒 Temporary messages",groups:"👥 Private groups",
      demoButton:"📲 Preview incoming call screen · Demo only",demoNote:"The screen appears only if you tap this button.",
      videoTitle:"HD video · Camera test only",
      videoInfo:"The camera requests 720p by default; 1080p is an optional device preference. This is a LOCAL CAMERA TEST, not a live call. Real network adaptation is evaluated separately in the two-phone WebRTC lab.",
      videoLabel:"Video quality / Quality",
      audioTitle:"Clear audio · Microphone test",
      audioInfo:"Echo cancellation, noise suppression and automatic gain control are requested where available. No audio is sent to a server.",
      micMeter:"Microphone level / Mic level",
      voiceTitle:"Voice message · Local draft",
      voiceInfo:"With consent, create up to a 60-second voice draft stored temporarily in this page. This prototype never sends it to another person or saves it as a permanent phone file.",
      qrTitle:"QR identity and friend verification",
      qrInfo:"Permanent QR friends need a verified identity server. Here you can try a local non-exportable signing key and SHA-256 fingerprint; it is NOT an account or a usable remote invitation. The two-phone lab has temporary signed QR verification.",
      makeFingerprint:"Generate local SHA-256 ID",
      messagesTitle:"Private one-view messages",
      messagesInfo:"After the first authorized opening, planned secret text and images expire within five minutes. Voice and video messages expire no later than their own duration plus five minutes. Ten-minute video: 15-minute ceiling; twelve-minute video: 17-minute ceiling. This local preview has no message backend.",
      messagesLimit:"Save and Forward will be restricted in the app, but an ordinary Chrome website cannot prevent operating-system screenshots or external recordings.",
      groupsTitle:"Private group audio/video calls",
      groupsInfo:"Group creation, QR invitations, moderator approval, microphone controls, removal and secure group calling are PLANNED, not deployed in this local preview.",
      videoStart:"Check camera and microphone",videoStop:"Stop camera",audioStart:"Start microphone test",audioStop:"Stop microphone",
      voiceStart:"🎙️ Start local draft",voiceStop:"■ Stop recording",voiceClear:"Clear temporary draft",
      policyTitle:"Our clear policy — no hidden controls",
      policy1:"① Our goal is affordable public communication without ads, selling contacts or selling messages.",
      policy2:"② Microphone and camera activate only after explicit user action and permission. Stop means stop tracks.",
      policy3:"③ No central conversation archive is planned. Future unread messages require bounded, encrypted temporary delivery storage.",
      policy4:"④ Secret text/images: up to five minutes after first view. Voice/video: actual duration plus a maximum five-minute grace.",
      policy5:"⑤ We can remove in-app Save/Forward, but cannot guarantee prevention of OS screenshots, external recordings or copies made by recipients.",
      policyFoot:"© E-ZERO · Secure Connect Local Research Preview. Not an audited messenger, emergency call system or automatic calling service.",
      demoLabel:"DEMO ONLY — Not an incoming phone call",demoName:"Sample caller",
      demoLimit:"This is just a screen demonstration. Nobody is calling you. The mic and camera stay off.",
      demoAcceptAudio:"📞 Accept audio",demoAcceptVideo:"📹 Accept video",demoDecline:"✕ Decline",demoClose:"↩ Back"
    },
    ar:{
      back:"↩ رجوع",heroEyebrow:"اتصال خاص · معاينة محلية",heroTitle:"مرحباً بك في E-ZERO Secure Connect",
      intro:"مركز بسيط للمكالمات الواضحة والفيديو عالي الدقة والرسائل الصوتية والتحقق من الهوية والمجموعات المستقبلية. خدمة عامة بلا إعلانات.",
      notice:"معاينة محلية: المكالمات والرسائل وإضافة الأصدقاء الدائمة لا تعمل هنا. الكاميرا والميكروفون ومسودات الصوت تختبر على هاتفك فقط.",
      welcome:"اختر الميزة المطلوبة. هذه معاينة محلية للجهاز وليست مكالمة أو رسالة حقيقية لشخص آخر.",
      liveButton:"📞 جرّب مكالمة حقيقية بين هاتفين · WebRTC",
      liveNote:"اختبار صوت وفيديو ورسائل مؤقتة بين متصفحين. انقل رمز العرض والرد الموقّع يدوياً بين الهاتفين. ليست خدمة حسابات دائمة أو تنبيهات مكالمات في الخلفية.",
      video:"مكالمة فيديو",videoSmall:"فحص الكاميرا · محلي",audio:"مكالمة صوتية",audioSmall:"فحص الميكروفون · محلي",
      voice:"رسالة صوتية",voiceSmall:"مسودة خاصة محلية",qr:"هوية QR",qrSmall:"SHA-256 · اختبار محلي",
      messages:"🔒 رسائل مؤقتة",groups:"👥 مجموعات خاصة",
      demoButton:"📲 معاينة شاشة المكالمة الواردة · عرض فقط",demoNote:"تظهر الشاشة فقط عندما تضغط هذا الزر.",
      videoTitle:"فيديو عالي الدقة · اختبار الكاميرا",
      videoInfo:"يطلب الاختبار 720p افتراضياً ويمكن طلب 1080p إن سمح الهاتف. هذا اختبار كاميرا محلي وليس مكالمة مباشرة. يُختبر الاتصال الحقيقي في صفحة الهاتفين.",
      videoLabel:"جودة الفيديو",
      audioTitle:"صوت واضح · اختبار الميكروفون",
      audioInfo:"نطلب إزالة الصدى وتقليل الضجيج وضبط الصوت تلقائياً حيثما يدعم الهاتف. لا يُرسل صوت إلى الخادم.",
      micMeter:"مستوى الميكروفون",
      voiceTitle:"رسالة صوتية · مسودة محلية",
      voiceInfo:"بموافقتك يمكن إنشاء مسودة صوتية حتى 60 ثانية داخل الصفحة مؤقتاً. لا تُرسل إلى شخص آخر ولا تُحفظ كملف دائم في الهاتف.",
      qrTitle:"هوية QR والتحقق من الأصدقاء",
      qrInfo:"إضافة أصدقاء دائمين تتطلب خادم هوية آمن. هنا يمكنك اختبار مفتاح توقيع محلي وبصمة SHA-256، وهذا ليس حساباً حقيقياً. تجربة الهاتفين تتضمن تحقق QR مؤقتاً.",
      makeFingerprint:"إنشاء هوية SHA-256 محلية",
      messagesTitle:"رسائل خاصة تُفتح مرة واحدة",
      messagesInfo:"تنتهي صلاحية النصوص والصور السرية خلال خمس دقائق من الفتح الأول. مدة الصوت والفيديو القصوى هي مدة المقطع إضافة إلى خمس دقائق. مقطع 10 دقائق = 15 دقيقة، ومقطع 12 دقيقة = 17 دقيقة. لا يوجد خادم رسائل في هذه المعاينة.",
      messagesLimit:"يمكن تقييد حفظ الرسائل وإعادة توجيهها داخل التطبيق، لكن موقع Chrome لا يستطيع منع لقطات شاشة النظام أو التسجيل الخارجي تماماً.",
      groupsTitle:"مكالمات مجموعات صوتية ومرئية خاصة",
      groupsInfo:"إنشاء المجموعات ودعوات QR وموافقة المشرف وكتم الصوت وإزالة الأعضاء ومكالمات المجموعات الآمنة مخطط لها وليست مفعّلة هنا.",
      videoStart:"اختبار الكاميرا والميكروفون",videoStop:"إيقاف الكاميرا",audioStart:"بدء اختبار الميكروفون",audioStop:"إيقاف الميكروفون",
      voiceStart:"🎙️ بدء المسودة",voiceStop:"■ إيقاف التسجيل",voiceClear:"حذف المسودة المؤقتة",
      policyTitle:"سياستنا الواضحة — بلا تحكم خفي",
      policy1:"① هدفنا خدمة اتصال عامة بتكلفة منخفضة بلا إعلانات أو بيع للمحادثات أو جهات الاتصال.",
      policy2:"② لا يعمل الميكروفون أو الكاميرا إلا بإذن وإجراء واضح، والتوقف يوقف بث الوسائط.",
      policy3:"③ لا نخطط لأرشيف مركزي للمحادثات. الرسائل غير المفتوحة تحتاج تخزيناً مشفراً مؤقتاً محدود المدة.",
      policy4:"④ النصوص والصور السرية: خمس دقائق كحد أقصى من الفتح الأول. الصوت والفيديو: مدة المحتوى إضافة إلى خمس دقائق كحد أقصى.",
      policy5:"⑤ نستطيع إلغاء زر الحفظ/إعادة التوجيه داخل التطبيق، لكن لا نضمن منع صور الشاشة أو التسجيل الخارجي.",
      policyFoot:"© E-ZERO · معاينة بحثية محلية. ليست خدمة رسائل مدققة أو مكالمات طوارئ أو اتصالات تلقائية.",
      demoLabel:"عرض فقط — ليست مكالمة واردة",demoName:"متصل تجريبي",
      demoLimit:"هذه مجرد شاشة تجريبية. لا يتصل بك أحد ولا يعمل الميكروفون أو الكاميرا.",
      demoAcceptAudio:"📞 قبول الصوت",demoAcceptVideo:"📹 قبول الفيديو",demoDecline:"✕ رفض",demoClose:"↩ رجوع"
    }
  };
  const originals = new Map();
  for (const [key, selector] of Object.entries(selectorMap)) {
    const el = $(selector);
    if (el) originals.set(key, el.textContent);
  }
  const labels = {
    quality: $("label[for='quality']")?.firstChild?.textContent || "ویڈیو معیار / Quality"
  };
  const statusIds=["videoStatus","audioStatus","voiceStatus","qrStatus","incomingDemoStatus","autoQualityStatus"];
  const nativeStatus=new Map();
  const renderedStatus=new Map();
  for(const id of statusIds) {
    const el=$("#"+id);
    if (!el) continue;
    nativeStatus.set(id,el.textContent);
    renderedStatus.set(id,el.textContent);
  }
  let lang="ur";
  const statusEnglish = {
    videoStatus:"Local camera test: permission required; never a remote call.",
    audioStatus:"Local mic test: permission required; no server upload.",
    voiceStatus:"Local draft only. It cannot be sent to another person.",
    qrStatus:"Local SHA-256 key test only. This is not a permanent account.",
    incomingDemoStatus:"Demonstration only; no real call, mic or camera activation.",
    autoQualityStatus:"Auto camera quality adapts to the available browser network hint, not measured call speed."
  };
  const statusArabic = {
    videoStatus:"اختبار كاميرا محلي بإذنك فقط، وليس مكالمة.",
    audioStatus:"اختبار ميكروفون محلي بإذن منك، دون رفع للخادم.",
    voiceStatus:"مسودة صوتية محلية لا تُرسل إلى شخص آخر.",
    qrStatus:"اختبار مفتاح SHA-256 محلي، وليس حساباً دائماً.",
    incomingDemoStatus:"عرض تجريبي فقط؛ لا مكالمة فعلية ولا تشغيل للميكروفون أو الكاميرا.",
    autoQualityStatus:"الجودة التلقائية اعتماداً على إشارة الشبكة في المتصفح، وليست سرعة مكالمة مقاسة."
  };
  function translateStatus(id, native){
    if(lang==="ur") return native;
    if(/✓.*(مقامی ٹیسٹ|مقامي)/.test(native)){
      const res=(native.match(/\d{3,4}\s*[×x]\s*\d{3,4}/)||[])[0]||"";
      return lang==="en" ? "✓ Local camera active "+res+"; not a remote call.":
        "✓ الكاميرا المحلية تعمل "+res+"؛ ليست مكالمة.";
    }
    const dictionary=lang==="en"?statusEnglish:statusArabic;
    return dictionary[id] || native;
  }
  function renderStatus(id) {
    const el=$("#"+id);if(!el)return;
    const translated=translateStatus(id,nativeStatus.get(id)||"");
    renderedStatus.set(id,translated);
    if(el.textContent!==translated)el.textContent=translated;
  }
  for (const id of statusIds) {
    const el=$("#"+id);if(!el)continue;
    new MutationObserver(()=>{
      const val=el.textContent;
      if(val===renderedStatus.get(id)) return;
      nativeStatus.set(id,val);
      renderStatus(id);
    }).observe(el,{childList:true,subtree:true,characterData:true});
  }
  function apply(value) {
    lang=["ur","en","ar"].includes(value)?value:"ur";
    document.documentElement.lang=lang; document.documentElement.dir=lang==="en"?"ltr":"rtl";
    $("#previewLanguage").value=lang;
    $("#previewLanguageCaption").textContent=lang==="en"?"🌐 Language":lang==="ar"?"🌐 اللغة":"🌐 زبان";
    for(const [key,selector] of Object.entries(selectorMap)){
      const el=$(selector);if(!el)continue;
      const translation=map[lang]?.[key] || originals.get(key);
      if(typeof translation==="string" && el.textContent!==translation)el.textContent=translation;
    }
    const firstLabel=$("label[for='quality']")?.firstChild;
    if(firstLabel)firstLabel.textContent=lang==="en"?"Video quality / Quality ":lang==="ar"?"جودة الفيديو ":labels.quality;
    const select=$("#quality");
    if(select){
      const texts=lang==="en"?["Auto (network hint)","Balanced 720p","High 1080p","Data Saver 360p"]:
        lang==="ar"?["تلقائي (إشارة الشبكة)","متوازن 720p","عالي 1080p","توفير بيانات 360p"]:null;
      if(texts)Array.from(select.options).forEach((op,i)=>{op.textContent=texts[i]||op.textContent;});
      else {
        Array.from(select.options).forEach((op,i)=>{
          op.textContent=["خودکار · Auto Quality (نیٹ ورک اشارے کے مطابق)","Balanced · 720p / 30fps preference",
            "High · 1080p / 30fps preference","Data Saver · 360p / 15fps preference"][i]||op.textContent;
        });
      }
    }
    const live=$("#ezeroRealTwoPhoneTest");
    if(live) live.href="./ezero_secure_connect_live_p2p_v0_1.html?lang="+encodeURIComponent(lang);
    for(const id of statusIds)renderStatus(id);
  }
  $("#previewLanguage")?.addEventListener("change",e=>apply(e.target.value));
  const requested=new URLSearchParams(location.search).get("lang");
  apply(["ur","en","ar"].includes(requested)?requested:"ur");
})();