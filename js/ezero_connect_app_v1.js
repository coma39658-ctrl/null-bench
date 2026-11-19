(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const translations = {
    ur: {
      welcome:"السلام علیکم 👋", sub:"آپ کے دوست، ایک ہی جگہ", quick:"فوری رابطہ", hint:"دوست منتخب کریں",
      audio:"آڈیو کال", video:"ویڈیو کال", callStatus:"ابھی کوئی تصدیق شدہ دوست منتخب نہیں۔",
      people:"آپ کے رابطے", add:"＋ دوست شامل کریں", search:"دوست تلاش کریں",
      friends:"دوست", chats:"چیٹس", calls:"کالز", empty:"ابھی کوئی دوست محفوظ نہیں",
      emptyText:"پہلی بار دوست سے جڑنے کے بعد، باہمی منظوری سے اسے یہاں محفوظ کیا جائے گا۔",
      privacy:"آپ کی پرائیویسی", privacyText:"کیمرہ اور مائیک صرف آپ کے واضح بٹن دبانے کے بعد مانگے جائیں گے۔ اس پیش نظارہ میں ابھی کوئی کال، پیغام یا دوست محفوظ نہیں کیا جاتا۔",
      footer:"نیا نظام — محفوظ تعمیراتی Preview، ابھی عوامی کال سروس نہیں۔",
      dialogTitle:"دوست شامل کریں", dialogText:"QR شناخت، محفوظ رابطہ اور دونوں طرف منظوری کا نیا نظام ابھی تعمیر کے مرحلے میں ہے۔ اس Preview میں QR یا رابطہ بھیجنے کا جھوٹا دعویٰ نہیں کیا جائے گا۔",
      close:"بند کریں", searchEmpty:"اس تلاش کے لیے کوئی محفوظ دوست موجود نہیں۔"
    },
    en: {
      welcome:"Hello 👋", sub:"Your friends, all in one place", quick:"Quick contact", hint:"Choose a friend",
      audio:"Audio call", video:"Video call", callStatus:"No verified friend is selected yet.",
      people:"Your contacts", add:"＋ Add friend", search:"Search friends",
      friends:"Friends", chats:"Chats", calls:"Calls", empty:"No saved friends yet",
      emptyText:"After a first connection and mutual approval, a friend can be saved here.",
      privacy:"Your privacy", privacyText:"Camera and microphone access will only be requested after your explicit action. This preview does not save contacts or send calls or messages.",
      footer:"New system — clean-build preview; public calling is not available yet.",
      dialogTitle:"Add a friend", dialogText:"The new QR identity, secure connection and mutual-approval flow is still being built. This preview will not pretend to scan a QR code or send an invite.",
      close:"Close", searchEmpty:"No saved friend matches this search."
    },
    ar: {
      welcome:"مرحباً 👋", sub:"أصدقاؤك في مكان واحد", quick:"اتصال سريع", hint:"اختر صديقاً",
      audio:"مكالمة صوتية", video:"مكالمة فيديو", callStatus:"لم يتم اختيار صديق موثّق بعد.",
      people:"جهات الاتصال", add:"＋ إضافة صديق", search:"ابحث عن صديق",
      friends:"الأصدقاء", chats:"المحادثات", calls:"المكالمات", empty:"لا يوجد أصدقاء محفوظون بعد",
      emptyText:"بعد الاتصال الأول والموافقة المتبادلة، يمكن حفظ الصديق هنا.",
      privacy:"خصوصيتك", privacyText:"لن نطلب إذن الكاميرا والميكروفون إلا بعد إجراء صريح منك. هذه المعاينة لا تحفظ جهات اتصال ولا تجري مكالمات أو ترسل رسائل.",
      footer:"النظام الجديد — معاينة بناء نظيف؛ خدمة الاتصال العامة غير متاحة بعد.",
      dialogTitle:"إضافة صديق", dialogText:"يجري بناء نظام هوية QR والاتصال الآمن والموافقة المتبادلة. لن تدّعي هذه المعاينة مسح رمز أو إرسال دعوة.",
      close:"إغلاق", searchEmpty:"لا يوجد صديق محفوظ يطابق هذا البحث."
    }
  };
  let language = "ur";
  let activeTab = "friends";
  const backdrop = $("dialogBackdrop");

  function renderLanguage() {
    const t = translations[language];
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" || language === "ur" ? "rtl" : "ltr";
    const map = {
      welcomeTitle:t.welcome,welcomeSub:t.sub,quickTitle:t.quick,quickHint:t.hint,
      audioLabel:t.audio,videoLabel:t.video,callStatus:t.callStatus,peopleTitle:t.people,
      addFriend:t.add,emptyAdd:t.add,searchFriends:null,tabFriends:t.friends,tabChats:t.chats,
      tabCalls:t.calls,emptyTitle:t.empty,emptyText:t.emptyText,privacyTitle:t.privacy,
      privacyText:t.privacyText,footerStatus:t.footer,dialogTitle:t.dialogTitle,
      dialogText:t.dialogText,closeDialog:t.close
    };
    for (const [id,value] of Object.entries(map)) if (value !== null && $(id)) $(id).textContent = value;
    $("searchFriends").placeholder = t.search;
    $("language").textContent = language === "ur" ? "اردو · EN · AR" : language === "en" ? "EN · AR · اردو" : "العربية · EN · اردو";
    document.querySelectorAll("[data-tab]").forEach((button) => {
      button.setAttribute("aria-selected", String(button.dataset.tab === activeTab));
    });
  }

  function openDialog() {
    backdrop.classList.add("open");
    $("closeDialog").focus();
  }
  function closeDialog() {
    backdrop.classList.remove("open");
    $("addFriend").focus();
  }
  function renderSearch() {
    const hasQuery = $("searchFriends").value.trim().length > 0;
    $("emptyTitle").textContent = hasQuery ? translations[language].searchEmpty : translations[language].empty;
  }

  $("language").addEventListener("click", () => {
    language = language === "ur" ? "en" : language === "en" ? "ar" : "ur";
    renderLanguage();
    renderSearch();
  });
  $("addFriend").addEventListener("click", openDialog);
  $("emptyAdd").addEventListener("click", openDialog);
  $("closeDialog").addEventListener("click", closeDialog);
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && backdrop.classList.contains("open")) closeDialog();
  });
  $("searchFriends").addEventListener("input", renderSearch);
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderLanguage();
      renderSearch();
    });
  });

  // Safety invariant: the clean-build preview has no contact database, no
  // signaling transport and no media access. Calls remain disabled until
  // verified services are implemented and release-gated.
  $("audioCall").disabled = true;
  $("videoCall").disabled = true;
  renderLanguage();
})();
