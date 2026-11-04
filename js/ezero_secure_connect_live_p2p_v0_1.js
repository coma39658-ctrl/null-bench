/*
 * E-ZERO Secure Connect v0.1 — real peer-to-peer WebRTC lab.
 * NO account backend, no automatic friend discovery, no billing, no recording.
 * Explicit camera/microphone consent, manual SDP signaling, signed ephemeral identity.
 * This is NOT a security-audited production messenger.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const te = new TextEncoder();
  const langs = {
    ur: {
      idle:"ابھی کوئی کال شروع نہیں ہوئی۔", connected:"WebRTC کنکشن قائم ہوا؛ دوست کی شناخت خود تصدیق کریں۔",
      waiting:"دوسرے فون کے جواب کا انتظار؛ اپنا کوڈ بھیجیں۔", connecting:"دوسرے فون سے رابطہ قائم ہو رہا ہے…",
      offline:"رابطہ ٹوٹ گیا یا ناکام ہوا؛ کال بند کرکے دوبارہ آزمائیں۔",
      micDenied:"کیمرہ یا مائک کی اجازت نہیں ملی، یا یہ دستیاب نہیں۔",
      signalInvalid:"کوڈ غلط، پرانا یا بغیر تصدیق شدہ ہے؛ کنکشن قائم نہیں ہوا۔",
      needCode:"مکمل دعوت یا جواب کوڈ پیسٹ کریں۔", needConnected:"پہلے دو فون آپس میں جوڑیں۔",
      copied:"کوڈ کاپی ہوگیا۔",shareUnavailable:"شیئرنگ دستیاب نہیں؛ براہِ کرم کوڈ کاپی کریں۔",
      scanUnavailable:"اس براؤزر میں QR کیمرہ اسکین نہیں چل سکتا؛ کوڈ پیسٹ کریں۔",
      scanActive:"اسکینر فعال ہے؛ E-ZERO کا ایک QR کیمرے کے سامنے رکھیں۔",
      scanStopped:"کیمرہ اسکینر بند کردیا گیا۔", identityNotAccount:"یہ عارضی دستخط شدہ شناخت ہے؛ مستقل اکاؤنٹ یا اصل انسان کی شناخت کی تصدیق نہیں۔",
      verifiedSelf:"ڈیجیٹل دستخط درست ہے؛ انسان کی شناخت الگ سے تصدیق کریں۔",
      identityMismatch:"کال کی شناخت اسکین کردہ QR/کوڈ سے مختلف ہے؛ کنکشن بند کردیا گیا۔",
      confirmPeer:"دوسرے فون کا خود دستخط شدہ کوڈ ملا ہے؛ SHA-256 فنگرپرنٹ الگ سے ملائیں۔",
      arrived:"عارضی پیغام ملا ہے؛ ایک بار کھولنے کے لیے بٹن دبائیں۔",
      opened:"اس فون پر پیغام کھولا گیا؛ یہ انسان کے پڑھنے کا ثبوت نہیں۔",
      expired:"عارضی پیغام ختم کردیا گیا۔",
      sent:"پیغام encrypted DataChannel میں بھیجا گیا؛ انسان کے پڑھنے کا ثبوت نہیں۔",
      notConnected:"میسج کے لیے دونوں فونوں کا کنکشن ضروری ہے۔",
      easyTitle:"دوست سے رابطہ — صرف دو طریقے",
      easyExplain:"نزدیک ہوں تو QR اسکین کریں۔ دور ہوں تو شناختی کوڈ میسج میں بھیج کر پیسٹ کریں۔",
      nearby:"📷 نزدیک · QR اسکین",
      remote:"📩 دور · کاپی / پیسٹ",
      easyTrust:"SHA-256 ڈیجیٹل شناخت کی تصدیق کرتا ہے، انسان کی شناخت یا خودکار کال نہیں۔ حقیقی کال کے لیے ایک دعوت اور جواب بھی درکار ہے۔",
      nearbyHint:"میرا QR دوست کو دکھائیں، پھر اس کا QR اسکین کریں۔",
      remoteHint:"میرا کوڈ کاپی یا میسج کریں؛ دوست کا موصولہ کوڈ پیسٹ کرکے تصدیق کریں۔",
      qrOnly:"QR میں نجی چابی نہیں ہے؛ یہ عارضی شناخت کا دستخط شدہ کوڈ ہے۔",
      shareIdentity:"↗ شناختی کوڈ میسج کریں",
      showMyCode:"میرا کوڈ دیکھیں (اختیاری)",
      nearCopy:"📋 اسکین نہ ہو تو کوڈ کاپی کریں",
      pasteFriend:"📋 آیا ہوا میسج پیسٹ کریں",
      callSetupSummary:"📞 شناخت ملنے کے بعد کال آزمائیں",
      callSetupTruth:"ابھی سرور نہیں؛ دو فونوں کو جوڑنے کے لیے دعوت اور جواب شیئر کرنا ضروری ہے۔",
      guidedTitle:"دعوت میسج کریں یا آیا ہوا جواب پیسٹ کریں",
      guidedHelp:"فون A دعوت بھیجے؛ فون B اسے پیسٹ کرے، جواب واپس بھیجے؛ فون A جواب پیسٹ کرے۔ بٹن خود دعوت یا جواب پہچانے گا۔",
      guidedOffer:"📩 کال کی دعوت تیار کریں",
      guidedShare:"↗ دعوت/جواب میسج کریں",
      guidedCopy:"📋 دعوت/جواب کاپی کریں",
      guidedIncoming:"دوسرے فون سے آیا ہوا میسج یہاں پیسٹ کریں",
      guidedContinue:"✓ میسج پیسٹ کرکے جاری رکھیں",
      guidedWaiting:"دعوت تیار کریں یا دوسرے فون کا میسج پیسٹ کریں۔",
      expertSummary:"تفصیلی تکنیکی کوڈ (ضرورت نہیں)",guidedPrivacy:"دعوت/جواب میں آپ کے IP یا نیٹ ورک کی معلومات ہوسکتی ہیں؛ صرف قابلِ اعتماد دوست کو شیئر کریں۔"
    },
    en: {
      back:"↩ Back", language:"Language", welcome:"Welcome — test a real 1:1 call", intro:"A two-browser trial of real voice, video, and one-view messages.",
      free:"No charge",ads:"No advertising",consent:"Mic/camera only with permission",labWarning:"REAL experimental P2P: no persistent accounts, automatic friend finding, background call notifications or signaling server. Manually share the offer/answer between the two phones. Some networks cannot connect without a TURN relay.",
      policyButton:"🔒 Clear privacy policy",closeEverything:"✕ Hang up and clear temporary content",step1:"Choose call type and network",
      audioCall:"📞 Voice call",videoCall:"📹 Video call",stunConsent:"Optional public STUN server — it may see IP/network metadata. Without a TURN relay, some calls will not connect.",
      quality:"Video quality",autoQuality:"Auto · Network hint",saverQuality:"Data Saver · 360p",hdQuality:"HD · 720p",fullQuality:"Full HD · prefer 1080p",
      step2:"Phone A makes an offer; Phone B answers",step2Help:"Phone A: create an offer and send the entire code to Phone B. Phone B: paste it and accept. Send the answer back to Phone A. Phone A: paste it to finish connecting.",
      makeOffer:"1 · Create offer (Phone A)",acceptOffer:"2 · Accept offer (Phone B)",applyAnswer:"3 · Apply answer (Phone A)",receivedCode:"Offer/answer received from other phone",
      yourCode:"Your offer/answer — send to other phone",copy:"📋 Copy code",share:"↗ Share code",codeWarning:"Signaling includes network/IP details. Share only with a trusted person. This is not a permanent account ID or automatic friend QR.",
      idle:"No call has started.",liveCall:"Live call",myMedia:"My camera",peerMedia:"Friend's voice / video",playRemote:"🔊 Play incoming audio",mute:"🎙️ Mute microphone",cameraOff:"📷 Turn camera off",hangup:"📴 Hang up",
      callTruth:"Only a WebRTC Connected state confirms a network path. The device shows its own mic/camera permission indicator. No call recording.",
      oneView:"One-view message",messageHelp:"Send only through the direct DataChannel while connected. No server chat archive. After the first view, it expires within five minutes. No in-app save button.",
      compose:"Write a message",send:"Send private message",notConnected:"Connect two phones before sending.",privatePending:"A temporary message has arrived.",viewOnce:"Open once",
      nextPhase:"Future phases: persistent accounts, QR friends, groups",nextHelp:"Persistent identity, registered SHA-256 QR friends, automatic signaling, voice notes, private groups and TURN relay are not yet enabled or independently audited.",
      identityLink:"Try local SHA-256 identity",footer:"E-ZERO · Community service, no ads, no hidden recording.",policyTitle:"E-ZERO: simple privacy policy",close:"Close",
      policy1:"We do not run ads or sell contacts or conversations. The goal is a public service funded transparently, not profit.",
      policy2:"This experimental page creates no central call or chat archive. Both browsers exchange media directly through WebRTC. One-view text is kept only temporarily in page memory.",
      policy3:"We do not secretly record, transcribe or inspect calls. Camera/microphone require deliberate action and permission. A participant can make an external recording, which we cannot fully prevent.",
      policy4:"Shared SDP signaling may contain network/IP information. Optional public STUN infrastructure may see connection metadata. Hosting and apps used to pass codes may retain their own logs.",
      policy5:"WebRTC encrypts audio/video on the transport path, but there is no independent identity certification or security audit in this trial. Do not rely on it for highly sensitive secrets.",
      policy6:"Software playback/read receipts do not prove a human listened/read. Removing content from app memory does not ensure external screenshots, OS buffers or copies are erased.",
      policy7:"No payments, subscriptions or ads are active. Any future small cost-recovery fee must be disclosed and approved in advance.",
      identityTitle:"Your automatically generated digital ID (temporary)",identityHelp:"Each page session makes a new cryptographic signing key and SHA-256 fingerprint. It is not a registered account: it disappears on reload. Scan the other phone's QR or paste its ID to compare. Both sides must verify before trusting the person.",
      identityPending:"Generating a unique digital ID…",identityCopy:"📋 Copy my digital ID",identityCamera:"📷 Scan friend's QR",identityStop:"■ Stop scanning",identityInput:"Paste the friend's signed ID or 64-character SHA-256 fingerprint",identityVerify:"Verify friend ID",identityNotAccount:"QR verification checks a cryptographic self-signature, not who the human is. It cannot automatically add a permanent friend without an account server.",
      identityPeer:"Friend's ID check",verifiedSelf:"Self-signature valid; compare with the person independently.",identityMismatch:"The peer's call identity does not match the checked QR/code.",peerFinger:"Other side's SHA-256 ID",localFinger:"My SHA-256 ID",
      scanUnavailable:"QR camera scanning is unavailable in this browser. Paste the ID instead.",scanActive:"Scanner active. Point at a single E-ZERO QR code.",scanStopped:"Scanner stopped.",copied:"Copied.",shareUnavailable:"Sharing not supported here; copy the code.",
      needCode:"Paste the complete signal code.",needConnected:"Connect the two browsers first.",signalInvalid:"Invalid, stale or unsigned signal. No connection was made.",waiting:"Waiting for the other phone; send your code.",connecting:"Connecting to the other phone…",connected:"WebRTC connected. Confirm your friend's ID independently.",offline:"Peer connection closed or failed; use Hang up to reset.",micDenied:"Microphone/camera permission denied or unavailable.",sent:"Encrypted DataChannel send completed. Not proof of a human reading.",arrived:"A private message arrived; tap Open once.",opened:"Message opened on this browser; this does not prove a human read it.",expired:"The temporary message has expired.",confirmPeer:"The remote key is self-signed, not verified as a person. Compare its SHA-256 ID.",
      easyTitle:"Connect with a friend — only two ways",
      easyExplain:"Together? Scan QR. Far apart? Copy your signed ID into a message, then paste theirs.",
      nearby:"📷 Nearby · Scan QR",
      remote:"📩 Far away · Copy / paste",
      easyTrust:"SHA-256 verifies a digital key, not a person's identity or an automatic call. A live call still needs one invitation and one answer.",
      nearbyHint:"Show your QR to your friend, then scan theirs.",
      remoteHint:"Copy or share your signed ID. Paste your friend's ID here and verify.",
      qrOnly:"The QR contains no private key; it is a signed temporary identity.",
      shareIdentity:"↗ Message my ID",
      showMyCode:"Show my ID code (optional)",
      nearCopy:"📋 Can't scan? Copy my ID",
      pasteFriend:"📋 Paste friend's message",
      callSetupSummary:"📞 After checking ID: test audio / video call",
      callSetupTruth:"No signaling server yet. For a real call, the two phones must share an invitation and an answer.",
      guidedTitle:"Message an invite or paste the reply",
      guidedHelp:"Phone A shares an invite. Phone B pastes it and sends back the answer. Phone A pastes the answer. The system identifies either type.",
      guidedOffer:"📩 Create call invite",
      guidedShare:"↗ Message invite/answer",
      guidedCopy:"📋 Copy invite/answer",
      guidedIncoming:"Paste the message from the other phone",
      guidedContinue:"✓ Continue with pasted message",
      guidedWaiting:"Create an invitation or paste the message from the other phone.",
      expertSummary:"Advanced technical code (optional)",guidedPrivacy:"Call invitations/answers may reveal IP or network details. Share only with a trusted friend, not a public group."
    },
    ar: {
      back:"↩ رجوع",language:"اللغة",welcome:"مرحباً — جرّب اتصالاً حقيقياً بين هاتفين",intro:"اختبار مباشر للمكالمات الصوتية والمرئية والرسائل التي تُعرض مرة واحدة.",
      free:"دون رسوم",ads:"دون إعلانات",consent:"الكاميرا والميكروفون بإذن منك",labWarning:"تجربة اتصال مباشر P2P وليست خدمة مكتملة: لا حساب دائم ولا إضافة أصدقاء آلية ولا إشعارات في الخلفية ولا خادم إشارات. انقل رمز العرض والرد يدوياً بين الهاتفين. قد تفشل بعض الشبكات دون خادم TURN.",
      policyButton:"🔒 سياسة الخصوصية الواضحة",closeEverything:"✕ إنهاء الاتصال ومسح البيانات المؤقتة",step1:"اختر نوع الاتصال والشبكة",
      audioCall:"📞 مكالمة صوتية",videoCall:"📹 مكالمة فيديو",stunConsent:"خادم STUN عام اختياري — قد يرى بيانات IP والشبكة. قد تفشل المكالمة دون خادم TURN.",
      quality:"جودة الفيديو",autoQuality:"تلقائي · إشارة الشبكة",saverQuality:"توفير البيانات · 360p",hdQuality:"عالية الدقة · 720p",fullQuality:"1080p إن توفرت",
      step2:"الهاتف أ ينشئ الدعوة والهاتف ب يرد",step2Help:"الهاتف أ: أنشئ الدعوة وأرسل الرمز كاملاً إلى الهاتف ب. الهاتف ب: الصق الرمز واضغط قبول. أعد الرد إلى الهاتف أ ليكمل الاتصال.",
      makeOffer:"1 · إنشاء دعوة (الهاتف أ)",acceptOffer:"2 · قبول دعوة (الهاتف ب)",applyAnswer:"3 · تطبيق الرد (الهاتف أ)",receivedCode:"رمز الدعوة أو الرد من الهاتف الآخر",
      yourCode:"رمزك لإرساله إلى الهاتف الآخر",copy:"📋 نسخ الرمز",share:"↗ مشاركة الرمز",codeWarning:"قد يحتوي الرمز على معلومات IP والشبكة. شاركه مع شخص موثوق فقط. ليس حساباً دائماً ولا دعوة صداقة آلية.",
      idle:"لم تبدأ مكالمة.",liveCall:"مكالمة مباشرة",myMedia:"كاميرتي",peerMedia:"صوت / فيديو الطرف الآخر",playRemote:"🔊 تشغيل صوت الطرف الآخر",mute:"🎙️ كتم الميكروفون",cameraOff:"📷 إغلاق الكاميرا",hangup:"📴 إنهاء المكالمة",
      callTruth:"لا نعتبر الاتصال ناجحاً إلا عند حالة Connected في WebRTC. لا نسجل المكالمات.",oneView:"رسالة تظهر مرة واحدة",
      messageHelp:"إرسال مباشر عبر DataChannel عند الاتصال. لا أرشيف رسائل على الخادم. تنتهي الرسالة خلال خمس دقائق من أول فتح. لا زر حفظ داخل التطبيق.",
      compose:"اكتب رسالة",send:"إرسال رسالة خاصة",notConnected:"صل الهاتفين أولاً.",privatePending:"وصلت رسالة مؤقتة.",viewOnce:"فتح مرة واحدة",
      nextPhase:"المراحل القادمة: حسابات دائمة وأصدقاء QR ومجموعات",nextHelp:"هوية دائمة وإضافة أصدقاء برمز SHA-256 واتصال تلقائي وملاحظات صوتية ومجموعات وخادم TURN ليست مفعلة أو مدققة بعد.",
      identityLink:"اختبار هوية SHA-256 محلية",footer:"E-ZERO · خدمة عامة بلا إعلانات ولا تسجيل خفي.",policyTitle:"سياسة الخصوصية المبسطة",close:"إغلاق",
      policy1:"لا نعرض إعلانات ولا نبيع جهات الاتصال أو المحادثات. غايتنا الخدمة العامة مع إظهار النفقات بشفافية لا الربح.",
      policy2:"هذا الاختبار لا ينشئ أرشيف مكالمات أو رسائل مركزياً. ينقل المتصفحان الوسائط عبر WebRTC. نصوص العرض الواحد مؤقتة في ذاكرة الصفحة فقط.",
      policy3:"لا نسجل أو ننسخ أو نفحص المكالمات سراً. يتطلب الميكروفون والكاميرا إجراء واضحاً وإذناً. قد يسجل الطرف الآخر خارج التطبيق ولا يمكننا منع ذلك تماماً.",
      policy4:"قد تتضمن رموز SDP عناوين IP. قد يرى خادم STUN الاختياري بيانات اتصال. قد تحتفظ خدمات الاستضافة وتطبيقات مشاركة الأكواد بسجلاتها الخاصة.",
      policy5:"يشفر WebRTC نقل الصوت والفيديو، لكن هذه التجربة لم تحصل على توثيق مستقل للهويات أو تدقيق أمني. لا تستخدمها للأسرار شديدة الحساسية.",
      policy6:"إشعار تشغيل الصوت أو فتح الرسالة لا يثبت أن إنساناً سمع أو قرأ. المسح من الذاكرة لا يضمن محو لقطات الشاشة أو النسخ الخارجية.",
      policy7:"لا توجد رسوم أو اشتراكات أو إعلانات مفعلة. لا تُضاف رسوم مستقبلية بسيطة لتغطية التكلفة دون إعلان وموافقة مسبقين.",
      identityTitle:"هويتك الرقمية التلقائية (مؤقتة)",identityHelp:"تنشئ الجلسة مفتاح توقيع جديداً وبصمة SHA-256 فريدة. لا يوجد حساب مسجل؛ تختفي الهوية عند إعادة التحميل. امسح QR للطرف الآخر أو الصق هويته ثم قارنا البصمتين.",
      identityPending:"جارٍ إنشاء هوية رقمية…",identityCopy:"📋 نسخ هويتي",identityCamera:"📷 مسح QR للصديق",identityStop:"■ إيقاف المسح",identityInput:"ألصق هوية الصديق الموقعة أو بصمة SHA-256 المكونة من 64 حرفاً",identityVerify:"تحقق من هوية الصديق",
      identityNotAccount:"يؤكد QR صحة التوقيع الذاتي وليس هوية الشخص الواقعية. إضافة صديق دائم تتطلب خادم حسابات.",
      identityPeer:"التحقق من هوية الصديق",verifiedSelf:"التوقيع الذاتي صحيح. تحقق من الشخص بطريقة مستقلة.",identityMismatch:"هوية الاتصال لا تطابق رمز QR / البصمة المدخلة.",peerFinger:"بصمة الطرف الآخر",localFinger:"بصمتي SHA-256",
      scanUnavailable:"مسح QR بالكاميرا غير مدعوم في هذا المتصفح. ألصق الرمز بدلاً من ذلك.",scanActive:"الماسح يعمل. وجّه الكاميرا نحو QR واحد من E-ZERO.",scanStopped:"توقف المسح.",copied:"تم النسخ.",shareUnavailable:"المشاركة غير متاحة؛ انسخ الرمز.",
      needCode:"ألصق رمز الإشارة الكامل.",needConnected:"صل المتصفحين أولاً.",signalInvalid:"رمز غير صالح أو منتهي الصلاحية أو غير موقع. لم يتصل الهاتفان.",waiting:"بانتظار الهاتف الآخر؛ أرسل الرمز.",connecting:"جارٍ الاتصال بالطرف الآخر…",connected:"اتصل WebRTC. تحقق من هوية الصديق بشكل مستقل.",offline:"أُغلق الاتصال أو فشل؛ اضغط إنهاء لإعادة الضبط.",micDenied:"الميكروفون/الكاميرا غير متاح أو لم يُسمح به.",sent:"أُرسلت البيانات عبر قناة مشفرة؛ لا يثبت ذلك قراءة الإنسان.",arrived:"وصلت رسالة خاصة؛ اضغط فتح مرة واحدة.",opened:"فُتحت الرسالة على هذا الجهاز؛ ليس دليلاً على قراءة الإنسان.",expired:"انتهت صلاحية الرسالة المؤقتة.",confirmPeer:"المفتاح موقّع ذاتياً ولا يثبت هوية الشخص. قارن بصمة SHA-256.",
      easyTitle:"تواصل مع صديق — بطريقتين فقط",
      easyExplain:"إذا كنتما قريبين فامسح QR. وإذا كنتما بعيدين فانسخ الهوية الموقعة في رسالة ثم الصق هوية الصديق.",
      nearby:"📷 قريب · مسح QR",
      remote:"📩 بعيد · نسخ / لصق",
      easyTrust:"تؤكد بصمة SHA-256 المفتاح الرقمي، ولا تثبت هوية الإنسان أو تُنشئ مكالمة تلقائياً. تتطلب المكالمة دعوة ورداً.",
      nearbyHint:"اعرض رمز QR لصديقك ثم امسح رمزه.",
      remoteHint:"انسخ هويتك الموقعة أو شاركها ثم الصق هوية صديقك للتحقق.",
      qrOnly:"لا يحتوي QR على المفتاح السري؛ هو رمز هوية مؤقت موقّع.",
      shareIdentity:"↗ إرسال رمز الهوية",
      showMyCode:"عرض رمز هويتي (اختياري)",
      nearCopy:"📋 لا يمكن المسح؟ انسخ هويتي",
      pasteFriend:"📋 لصق رسالة الصديق",
      callSetupSummary:"📞 بعد التحقق: تجربة مكالمة صوت وفيديو",
      callSetupTruth:"لا يوجد خادم إشارات بعد. تتطلب المكالمة الحقيقية تبادل دعوة ورد بين الهاتفين.",
      guidedTitle:"أرسل الدعوة أو الصق الرد",
      guidedHelp:"يرسل الهاتف أ الدعوة. يلصقها الهاتف ب ويرسل الرد. يلصق الهاتف أ الرد. يحدد النظام النوع تلقائياً.",
      guidedOffer:"📩 إنشاء دعوة اتصال",
      guidedShare:"↗ إرسال الدعوة/الرد",
      guidedCopy:"📋 نسخ الدعوة/الرد",
      guidedIncoming:"ألصق رسالة الهاتف الآخر هنا",
      guidedContinue:"✓ متابعة باستخدام الرسالة",
      guidedWaiting:"أنشئ دعوة أو الصق رسالة الهاتف الآخر.",
      expertSummary:"الأكواد التقنية المتقدمة (اختياري)",guidedPrivacy:"قد تحتوي دعوة الاتصال أو الرد على بيانات IP والشبكة؛ شاركها مع صديق موثوق فقط."
    }
  };
  const $all = selector => Array.from(document.querySelectorAll(selector));
  let currentLang = "ur", identityPromise = null, identity = null, expectedPeerFingerprint = null;
  let peer = null, channel = null, localStream = null, remoteStream = null, role = null;
  let incoming = null, unreadExpiry = null, viewedExpiry = null, scanStream = null, scanTimeout = null, scanGeneration = 0;
  let micMuted = false, cameraMuted = false;
  const me = key => (langs[currentLang] || {})[key] || $("fallbackNever") || null;
  const t = key => typeof me(key) === "string" ? me(key) : ($all('[data-i18n="' + key + '"]')[0]?.textContent || key);
  const status = (key, detail) => { $("connectionStatus").textContent = t(key) + (detail ? " · " + detail : ""); };
  function langChange(lang) {
    currentLang = ["ur","en","ar"].includes(lang) ? lang : "ur";
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === "en" ? "ltr" : "rtl";
    $("language").value = currentLang;
    $all("[data-i18n]").forEach(el => {
      const value = langs[currentLang]?.[el.dataset.i18n];
      if (value) el.textContent = value;
    });
    if (currentLang !== "ur") {
      const ph = currentLang === "ar" ? "ألصق الدعوة / الرد" : "Paste offer / answer";
      $("remoteSignal").placeholder = ph;
      $("friendIdInput").placeholder = currentLang === "ar" ? "QR أو SHA-256" : "Signed QR ID or SHA-256 fingerprint";
    } else {
      $("friendIdInput").placeholder = "QR کوڈ یا SHA-256 فنگرپرنٹ";
    }
  }
  $("language").addEventListener("change", e => langChange(e.target.value));
  langChange(new URLSearchParams(location.search).get("lang") || "ur");

  function randomBytes(n) { const b = new Uint8Array(n); crypto.getRandomValues(b); return b; }
  const hex = bytes => Array.from(bytes, x => x.toString(16).padStart(2,"0")).join("");
  const toB64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  function fromB64(input) {
    if (!/^[a-zA-Z0-9_-]+$/.test(input) || input.length > 100000) throw Error("BAD_ENCODING");
    const x = atob(input.replace(/-/g,"+").replace(/_/g,"/") + "=".repeat((4 - input.length % 4) % 4));
    return Uint8Array.from(x, c => c.charCodeAt(0));
  }
  async function sha256(bytes) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))); }
  async function loadIdentity() {
    if (!window.isSecureContext || !crypto?.subtle) throw Error("HTTPS_REQUIRED");
    if (identity) return identity;
    const keys = await crypto.subtle.generateKey({name:"ECDSA",namedCurve:"P-256"},false,["sign","verify"]);
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki",keys.publicKey));
    const fingerprint = await sha256(spki);
    const result = {keys,spki:toB64(spki),fingerprint,code:hex(randomBytes(12)),expires:Date.now()+600000};
    identity = result;
    await refreshMyQr();
    return result;
  }
  identityPromise = loadIdentity().catch(() => { $("identityStatus").textContent = "HTTPS/Web Crypto required."; return null; });
  function identityPayload(i) { return ["EZERO-IDENTITY-1",location.origin,i.spki,i.fingerprint,i.code,i.expires].join("|"); }
  async function signedIdentity() {
    const i = await identityPromise; if (!i) throw Error("NO_IDENTITY");
    const sig = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},i.keys.privateKey,te.encode(identityPayload(i)));
    return ["EZERO1",i.spki,i.fingerprint,i.code,String(i.expires),toB64(sig)].join(".");
  }
  function showQr(textValue) {
    const element = $("myQr");
    if (!element) return;
    if (typeof window.qrcode !== "function") { element.textContent = "QR library unavailable"; return; }
    try {
      const qr = window.qrcode(0,"L");
      qr.addData(textValue);
      qr.make();
      element.innerHTML = qr.createSvgTag(3,4);
      const svg = element.querySelector("svg");
      if (svg) {svg.setAttribute("role","img");svg.setAttribute("aria-label","E-ZERO temporary signed identity QR");}
    } catch (_) {element.textContent = "QR generation unavailable"; }
  }
  async function refreshMyQr() {
    if (!identity) return;
    const signed = await signedIdentityInternal(identity);
    $("myFingerprint").textContent = identity.fingerprint;
    $("myDigitalId").value = signed;
    $("identityStatus").textContent = t("identityNotAccount");
    showQr(signed);
  }
  async function signedIdentityInternal(i) {
    const sig = await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},i.keys.privateKey,te.encode(identityPayload(i)));
    return ["EZERO1",i.spki,i.fingerprint,i.code,String(i.expires),toB64(sig)].join(".");
  }
  async function verifyInvite(value) {
    const supplied = value.trim();
    // The app can receive an ID forwarded inside a message with a short heading.
    // Only the exact signed-token grammar is extracted; verification is unchanged.
    const found = supplied.match(/EZERO1\.[A-Za-z0-9_-]+\.[0-9a-f]{64}\.[0-9a-f]{24}\.\d{13}\.[A-Za-z0-9_-]+/);
    const raw = found ? found[0] : supplied;
    if (/^[0-9a-fA-F]{64}$/.test(raw)) return {fingerprint:raw.toLowerCase(),verified:false};
    if (raw.length > 1300) throw Error("BAD_SIZE");
    const parts = raw.split(".");
    if (parts.length !== 6 || parts[0] !== "EZERO1" || !/^[0-9a-f]{64}$/.test(parts[2]) ||
        !/^[0-9a-f]{24}$/.test(parts[3]) || !/^\d{13}$/.test(parts[4])) throw Error("BAD_ID");
    const expires = Number(parts[4]);
    if (expires < Date.now() || expires > Date.now()+610000) throw Error("EXPIRED_ID");
    const spki = fromB64(parts[1]);if (spki.length > 140) throw Error("BAD_KEY");
    const fp = await sha256(spki);
    if (fp !== parts[2]) throw Error("FP_MISMATCH");
    const pub = await crypto.subtle.importKey("spki",spki,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    const msg = ["EZERO-IDENTITY-1",location.origin,parts[1],parts[2],parts[3],expires].join("|");
    if (!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,fromB64(parts[5]),te.encode(msg))) throw Error("BAD_SIGNATURE");
    return {fingerprint:fp,verified:true};
  }
  async function confirmFriend(value) {
    try {
      const r = await verifyInvite(value || $("friendIdInput").value);
      expectedPeerFingerprint = r.fingerprint;
      $("peerFingerprint").textContent = expectedPeerFingerprint;
      $("identityPeerStatus").textContent = t("verifiedSelf") +
        (r.verified ? "" : " · Fingerprint only (no signature verified)");
      const other = peer?.__ezeroPeerFP;
      if (other && other !== expectedPeerFingerprint) {
        $("identityPeerStatus").textContent = t("identityMismatch");
        hardHangup();
      }
      return true;
    } catch (error) {
      $("identityPeerStatus").textContent = t("signalInvalid") + " (" + String(error.message).slice(0,55) + ")";
      return false;
    }
  }
  $("verifyFriend").addEventListener("click", () => confirmFriend());
  $("copyIdentity").addEventListener("click", async () => {
    const ok=await copyValue($("myDigitalId"));
    $("identityPeerStatus").textContent = ok ? t("copied") : t("shareUnavailable");
  });
  function stopScanner() {
    scanGeneration++;
    if (scanTimeout) { clearTimeout(scanTimeout); scanTimeout = null; }
    if (scanStream) { scanStream.getTracks().forEach(track => track.stop()); scanStream = null; }
    $("scanVideo").srcObject = null; $("scanVideo").hidden = true;
    $("stopScan").disabled = true; $("scanQR").disabled = false;
  }
  $("stopScan").addEventListener("click", () => {stopScanner();$("identityPeerStatus").textContent=t("scanStopped");});
  $("scanQR").addEventListener("click", async () => {
    if (!window.BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      $("identityPeerStatus").textContent = t("scanUnavailable"); return;
    }
    stopScanner(); const gen = scanGeneration;
    try {
      const detector = new BarcodeDetector({formats:["qr_code"]});
      scanStream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      if (gen !== scanGeneration || document.hidden) {stopScanner();return;}
      $("scanVideo").srcObject = scanStream; $("scanVideo").hidden = false;
      await $("scanVideo").play();
      $("stopScan").disabled = false; $("scanQR").disabled = true;
      $("identityPeerStatus").textContent=t("scanActive");
      const frame = async () => {
        if (gen !== scanGeneration || !scanStream) return;
        try {
          const codes = await detector.detect($("scanVideo"));
          if (codes.length) {
            const code = String(codes[0].rawValue || "");
            if (code.startsWith("EZERO1.")) {
              stopScanner();
              $("friendIdInput").value = code;
              await confirmFriend(code);
              return;
            }
          }
        } catch (_) { /* camera frame not ready */ }
        if (gen === scanGeneration) scanTimeout=setTimeout(frame,270);
      };
      scanTimeout=setTimeout(frame,350);
    } catch (e) { stopScanner(); $("identityPeerStatus").textContent=t("scanUnavailable")+" ("+String(e.name||"ERROR")+")"; }
  });

  function quality() {
    const wanted = $("quality").value;
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (wanted !== "auto") return wanted;
    if (c?.saveData || /^(2g|slow-2g|3g)$/.test(c?.effectiveType || "") || (c?.downlink > 0 && c?.downlink < 1.5)) return "saver";
    return "hd";
  }
  function mediaConstraints() {
    const useVideo = document.querySelector('input[name="mode"]:checked').value === "video";
    const requested = quality();
    const profiles = {saver:[640,360,15],hd:[1280,720,30],full:[1920,1080,30]};
    const v = profiles[requested] || profiles.hd;
    return {audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},
      video:useVideo?{facingMode:{ideal:"user"},width:{ideal:v[0]},height:{ideal:v[1]},frameRate:{ideal:v[2],max:v[2]}}:false};
  }
  async function initPeer() {
    if (peer) throw Error("HANGUP_FIRST");
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) throw Error("WEBRTC_UNAVAILABLE");
    await identityPromise;
    const cfg = {iceServers:$("enableStun").checked?[{urls:"stun:stun.cloudflare.com:3478"}]:[]};
    const p = new RTCPeerConnection(cfg);peer=p;
    remoteStream=new MediaStream(); $("remoteVideo").srcObject=remoteStream;
    p.ontrack = event => {
      if (peer !== p) return;
      if (event.streams?.[0]) { $("remoteVideo").srcObject=event.streams[0]; remoteStream=event.streams[0]; }
      else {remoteStream.addTrack(event.track);}
      $("remoteVideo").play().catch(() => { $("playRemote").disabled=false; });
    };
    p.onconnectionstatechange=()=>{
      if(peer!==p)return;
      if(p.connectionState==="connected") status("connected",p.__ezeroPeerFP?.slice(0,16));
      else if(["failed","closed","disconnected"].includes(p.connectionState)) status("offline",p.connectionState);
      else status("connecting",p.connectionState);
    };
    p.ondatachannel=e=>attachChannel(e.channel);
    localStream=await navigator.mediaDevices.getUserMedia(mediaConstraints());
    if(peer!==p){localStream.getTracks().forEach(x=>x.stop());return;}
    $("localVideo").srcObject=localStream;
    localStream.getTracks().forEach(track=>p.addTrack(track,localStream));
    micMuted=false;cameraMuted=false;
    $("muteMic").disabled=false;$("toggleCamera").disabled=localStream.getVideoTracks().length===0;
    role="peer";
    return p;
  }
  function attachChannel(c) {
    channel=c;
    c.onopen=()=>{$("sendMessage").disabled=false;$("messageStatus").textContent=t("connected");};
    c.onclose=()=>{$("sendMessage").disabled=true;$("messageStatus").textContent=t("notConnected");};
    c.onmessage=e=>{
      if (typeof e.data!=="string" || e.data.length>8500) return;
      try {
        const m=JSON.parse(e.data);
        if (m.v===1 && m.kind==="once" && typeof m.text==="string" && m.text.length<=2000 &&
            /^[a-f0-9]{32}$/.test(m.id)) {
          discardIncoming();
          incoming={id:m.id,text:m.text,opened:false};
          $("incomingItem").hidden=false;$("viewMessage").hidden=false;
          $("seenMessage").hidden=true;$("seenMessage").textContent="";
          $("messageTimer").textContent="";
          $("messageStatus").textContent=t("arrived");
          unreadExpiry=setTimeout(discardIncoming,600000);
        }
      }catch(_){}
    };
  }
  async function iceComplete(p) {
    if (p.iceGatheringState==="complete")return true;
    return new Promise(resolve=>{
      let done=false;
      const settle = ok => {if(done)return;done=true;clearTimeout(timer);p.removeEventListener("icegatheringstatechange",check);resolve(ok);};
      const check=()=>{if(p.iceGatheringState==="complete")settle(true);};
      p.addEventListener("icegatheringstatechange",check);
      const timer=setTimeout(()=>settle(false),12000);
      check();
    });
  }
  function signedSignalText(type,sdp,issued,nonce) {return ["E-ZERO-RTC-SIGNED-1",type,sdp,String(issued),nonce].join("\n");}
  async function makeSignal(type) {
    const i=await identityPromise;if(!i||!peer?.localDescription)throw Error("NO_SESSION");
    const sdp=peer.localDescription.sdp;
    const issued=Date.now(),nonce=hex(randomBytes(16));
    const signature=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},i.keys.privateKey,te.encode(signedSignalText(type,sdp,issued,nonce)));
    return JSON.stringify({v:1,type,sdp,issued,nonce,pub:i.spki,fp:i.fingerprint,sig:toB64(signature)});
  }
  async function parseSignal(type) {
    const raw=$("remoteSignal").value.trim();
    if (!raw || raw.length>145000)throw Error("INVALID_CODE");
    let s;try{s=JSON.parse(raw);}catch(_){throw Error("INVALID_JSON");}
    if (s?.v!==1 || s.type!==type || typeof s.sdp!=="string" ||
        s.sdp.length>120000 || s.sdp.length<100 ||
        !s.sdp.startsWith("v=0") || !s.sdp.includes("a=fingerprint:") ||
        !/^[0-9a-f]{64}$/.test(s.fp||"") || !/^[0-9a-f]{32}$/.test(s.nonce||"") ||
        !Number.isSafeInteger(s.issued) || Math.abs(Date.now()-s.issued)>1800000)throw Error("INVALID_ENVELOPE");
    const spki=fromB64(s.pub),fp=await sha256(spki);
    if(spki.length>140||fp!==s.fp)throw Error("FINGERPRINT_ERROR");
    const pub=await crypto.subtle.importKey("spki",spki,{name:"ECDSA",namedCurve:"P-256"},false,["verify"]);
    if(!await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},pub,fromB64(s.sig),
      te.encode(signedSignalText(s.type,s.sdp,s.issued,s.nonce))))throw Error("BAD_SIGNATURE");
    if(expectedPeerFingerprint&&expectedPeerFingerprint!==s.fp)throw Error("FRIEND_ID_MISMATCH");
    $("peerFingerprint").textContent=s.fp;
    $("identityPeerStatus").textContent=expectedPeerFingerprint?t("verifiedSelf"):t("confirmPeer");
    return {type,sdp:s.sdp,fp:s.fp};
  }
  let busy=false;
  async function withBusy(fn) {
    if(busy)return;
    busy=true;
    ["createOffer","acceptOffer","applyAnswer"].forEach(id=>$(id).disabled=true);
    try{await fn();}catch(error) {
      const msg=String(error?.name||error?.message||"ERROR").slice(0,85);
      status(/NotAllowedError|NotFoundError|NotReadableError|OverconstrainedError/.test(msg)?"micDenied":"signalInvalid",msg);
      if(peer && peer.connectionState!=="connected") hardHangup(false);
    }finally{busy=false;["createOffer","acceptOffer","applyAnswer"].forEach(id=>$(id).disabled=false);}
  }
  $("createOffer").addEventListener("click",()=>withBusy(async()=>{
    const p=await initPeer();role="offerer";
    const dc=p.createDataChannel("ezero-ephemeral",{ordered:true});attachChannel(dc);
    await p.setLocalDescription(await p.createOffer());
    const complete=await iceComplete(p);
    $("localSignal").value=await makeSignal("offer");
    document.dispatchEvent(new CustomEvent("ezero:signal-ready",{detail:{type:"offer"}}));
    status("waiting",complete?"":"ICE gathering partial");
  }));
  $("acceptOffer").addEventListener("click",()=>withBusy(async()=>{
    const signed=await parseSignal("offer");
    const p=await initPeer();role="answerer";p.__ezeroPeerFP=signed.fp;
    await p.setRemoteDescription({type:"offer",sdp:signed.sdp});
    await p.setLocalDescription(await p.createAnswer());
    const complete=await iceComplete(p);
    $("localSignal").value=await makeSignal("answer");
    document.dispatchEvent(new CustomEvent("ezero:signal-ready",{detail:{type:"answer"}}));
    status("waiting",complete?"":"ICE gathering partial");
  }));
  $("applyAnswer").addEventListener("click",()=>withBusy(async()=>{
    if(!peer || role!=="offerer" || peer.signalingState!=="have-local-offer")throw Error("OFFER_REQUIRED");
    const signed=await parseSignal("answer");
    peer.__ezeroPeerFP=signed.fp;
    await peer.setRemoteDescription({type:"answer",sdp:signed.sdp});
    status("connecting");
  }));
  async function copyValue(element) {
    const value=element.value;
    if(!value) return false;
    try{await navigator.clipboard.writeText(value);return true;}
    catch(_){
      // Permission-safe user-gesture fallback even when the raw-code details are closed.
      const temp=document.createElement("textarea");
      temp.value=value;temp.readOnly=true;
      temp.style.cssText="position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
      document.body.appendChild(temp);
      temp.focus();temp.select();
      let copied=false;
      try{copied=document.execCommand?.("copy")===true;}catch(_){}
      temp.remove();
      return copied;
    }
  }
  $("copySignal").addEventListener("click",async()=>{
    const success=await copyValue($("localSignal"));
    status(success?"copied":"shareUnavailable");
    document.dispatchEvent(new CustomEvent("ezero:copy-result",{detail:{success}}));
  });
  $("shareSignal").addEventListener("click",async()=>{
    const textValue=$("localSignal").value;
    if(!textValue)return status("needCode");
    if(navigator.share) {
      try{await navigator.share({title:"E-ZERO WebRTC experimental invite",text:textValue});}
      catch(error){if(error?.name!=="AbortError")status("shareUnavailable");}
    }else status("shareUnavailable");
  });
  $("playRemote").addEventListener("click",()=>{
    const el=$("remoteVideo");el.muted=false;el.play().catch(()=>status("offline","Playback not allowed"));
  });
  $("muteMic").addEventListener("click",()=>{
    if(!localStream)return;
    micMuted=!micMuted;
    localStream.getAudioTracks().forEach(x=>{x.enabled=!micMuted;});
    $("muteMic").textContent=micMuted?"🎙️ Unmute / مائک کھولیں":t("mute");
  });
  $("toggleCamera").addEventListener("click",()=>{
    if(!localStream)return;
    cameraMuted=!cameraMuted;localStream.getVideoTracks().forEach(x=>{x.enabled=!cameraMuted;});
    $("toggleCamera").textContent=cameraMuted?"📷 Camera On / کیمرہ کھولیں":t("cameraOff");
  });
  function discardIncoming() {
    if(unreadExpiry){clearTimeout(unreadExpiry);unreadExpiry=null;}
    if(viewedExpiry){clearTimeout(viewedExpiry);viewedExpiry=null;}
    incoming=null;$("seenMessage").textContent="";$("seenMessage").hidden=true;
    $("incomingItem").hidden=true;$("messageTimer").textContent="";
    $("viewMessage").hidden=false;
  }
  $("sendMessage").addEventListener("click",()=>{
    const textValue=$("sendText").value.trim();
    if(!channel || channel.readyState!=="open")return $("messageStatus").textContent=t("needConnected");
    if(!textValue || textValue.length>2000)return;
    channel.send(JSON.stringify({v:1,kind:"once",id:hex(randomBytes(16)),text:textValue}));
    $("sendText").value="";$("messageStatus").textContent=t("sent");
  });
  $("viewMessage").addEventListener("click",()=>{
    if(!incoming||incoming.opened)return;
    incoming.opened=true;if(unreadExpiry){clearTimeout(unreadExpiry);unreadExpiry=null;}
    $("seenMessage").textContent=incoming.text;$("seenMessage").hidden=false;$("viewMessage").hidden=true;
    incoming.text="";
    $("messageStatus").textContent=t("opened");
    let deadline=Date.now()+300000;
    const countdown=()=>{
      if(!incoming)return;
      const left=Math.max(0,Math.ceil((deadline-Date.now())/1000));
      $("messageTimer").textContent="One view · "+left+"s";
      if(left<=0){discardIncoming();$("messageStatus").textContent=t("expired");return;}
      viewedExpiry=setTimeout(countdown,1000);
    };
    countdown();
  });
  function hardHangup(show=true) {
    stopScanner();
    if(channel){channel.onmessage=channel.onopen=channel.onclose=null;try{channel.close();}catch(_){}channel=null;}
    if(peer){peer.ontrack=peer.ondatachannel=peer.onconnectionstatechange=null;try{peer.close();}catch(_){}peer=null;}
    if(localStream){localStream.getTracks().forEach(x=>x.stop());localStream=null;}
    remoteStream=null;
    ["localVideo","remoteVideo"].forEach(id=>{const el=$(id);el.pause();el.srcObject=null;});
    $("localSignal").value="";$("remoteSignal").value="";role=null;
    $("sendMessage").disabled=true;$("muteMic").disabled=true;$("toggleCamera").disabled=true;
    discardIncoming();$("sendText").value="";
    $("messageStatus").textContent=t("notConnected");
    if(show)status("idle");
  }
  $("hangup").addEventListener("click",()=>hardHangup());
  $("closeAll").addEventListener("click",()=>hardHangup());
  const dialog=$("policyDialog");
  $("openPolicy").addEventListener("click",()=>{
    dialog.hidden=false;document.body.classList.add("dialogOpen");$("closePolicy").focus();
  });
  function closePolicy(){dialog.hidden=true;document.body.classList.remove("dialogOpen");$("openPolicy").focus();}
  $("closePolicy").addEventListener("click",closePolicy);
  document.addEventListener("keydown",e=>{
    if(dialog.hidden)return;
    if(e.key==="Escape"){e.preventDefault();closePolicy();}
    if(e.key==="Tab") {
      const list=[...dialog.querySelectorAll("button:not([disabled])")];
      if(!list.length)return;
      if(e.shiftKey && document.activeElement===list[0]) {e.preventDefault();list[list.length-1].focus();}
      if(!e.shiftKey && document.activeElement===list[list.length-1]) {e.preventDefault();list[0].focus();}
    }
  });
  document.addEventListener("visibilitychange",()=>{if(document.hidden)stopScanner();});
  window.addEventListener("pagehide",()=>{hardHangup(false);identity=null;expectedPeerFingerprint=null;});
})();