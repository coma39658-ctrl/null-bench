/* E-ZERO modern communications. Preserve original tested WebRTC experiment,
 * explicitly opt-in voice notes, no background recording, server, or archive. */
(() => {
"use strict";
const $=id=>document.getElementById(id);
const trans={
ur:{"inviteEmpty":"دعوت کا اصل لنک ابھی درج نہیں ہوا۔ IMO میں اصل پیغام کا مکمل لنک کاپی کر کے یہاں پیسٹ کریں؛ خانے میں نظر آنے والی مثال حقیقی دعوت نہیں۔","inviteFragmentMissing":"E-ZERO صفحہ کھلا ہے، مگر اس لنک میں کال کی دعوت کا ضروری حصہ نہیں ملا۔ IMO سے پورا اصل دعوتی لنک کاپی کریں، یا دوست سے نئی دعوت منگوائیں۔","inviteBroken":"دعوتی لنک کا محفوظ حصہ نامکمل یا تبدیل ہو گیا ہے۔ IMO میں صرف ویب سائٹ کھلنا کافی نہیں؛ دوست سے نئی مکمل دعوت شیئر کرنے کو کہیں۔","inviteExpiredReason":"یہ دعوت پرانی ہے۔ اصل فون پر نئی دعوت بنائیں اور فوراً مکمل لنک شیئر کریں۔","inviteWrongPage":"یہ E-ZERO کی موجودہ کال والی دعوت کا لنک نہیں ہے۔ صرف اپنے قابلِ اعتماد دوست کا اصل دعوتی لنک استعمال کریں۔","inviteIncomingTip":"اگر IMO میں E-ZERO کھل گیا لیکن درخواست نظر نہیں آئی، تو اصل IMO پیغام کا پورا دعوتی لنک یہاں پیسٹ کریں۔ کوئی نمونہ لنک استعمال نہ کریں۔","prepareInvite":"↗ دوست کے لیے دعوت تیار کریں","shareInvite":"↗ دعوت یا جواب شیئر کریں","incomingTitle":"دوست کی رابطہ درخواست","incomingDescription":"دوست کی عارضی دعوت یا جواب ملا ہے۔ صرف قابلِ اعتماد شخص کی درخواست قبول کریں۔","acceptInvite":"✓ درخواست قبول کریں","declineInvite":"✕ مسترد کریں","linkFallbackTitle":"دوست کا لنک اسی ٹیب میں نہ کھلے تو","linkFallbackHelp":"موجودہ کال والا ٹیب بند نہ کریں۔ دوست سے آیا E-ZERO لنک یہاں درج کریں؛ تکنیکی کوڈ ضروری نہیں۔","pasteLinkLabel":"موصولہ دعوت یا جواب کا لنک","loadLink":"✓ لنک کھولیں","generatedLabel":"دوست کو شیئر کرنے والا محفوظ عارضی لنک","copyLink":"📋 لنک کاپی کریں","signalPrivacy":"لنک میں IP اور نیٹ ورک معلومات ہو سکتی ہیں۔ صرف قابلِ اعتماد دوست کو بھیجیں؛ میسنجر لنک محفوظ کر سکتا ہے۔","inviteIdle":"دوست کو دعوت بھیجیں، یا اس سے موصولہ لنک کھولیں۔","inviteBusy":"محفوظ دعوت تیار ہو رہی ہے؛ مائک/کیمرہ کی اجازت درکار ہو سکتی ہے۔","inviteReady":"دعوت تیار ہے۔ اب لنک دوست کو شیئر کریں۔","answerReadyWizard":"جواب تیار ہے۔ اسی دوست کو لنک واپس بھیجیں۔","inviteReceived":"دوست کی دعوت ملی ہے۔ قبول کرنے سے پہلے فرد کی تصدیق کریں۔","answerReceived":"دوست کا جواب ملا ہے۔ اصل کال والا ٹیب کھلا ہو تو قبول کریں۔","inviteInvalid":"یہ لنک غلط، غیر متعلقہ یا نامکمل ہے۔ دوبارہ حاصل کریں۔","inviteExpired":"لنک کی مدت ختم ہو سکتی ہے؛ نیا لنک لیں۔","inviteRejected":"دعوت مسترد کر دی گئی۔ کوئی کال شروع نہیں ہوئی۔","inviteNeedsTab":"کال شروع کرنے والا اصل ٹیب کھول کر جواب والا لنک اسی میں درج کریں۔","inviteNoShare":"لنک شیئر نہیں ہوسکا۔ نیچے کاپی آپشن سے صرف اپنے دوست کو بھیجیں۔","inviteCopied":"لنک کاپی ہوا؛ اسے اپنے دوست کے میسنجر میں بھیجیں۔","inviteShared":"لنک شیئر کیا گیا؛ دوسرے فون کا جواب ابھی ضروری ہے۔","inviteNotSent":"شیئرنگ منسوخ ہوئی؛ کوئی کنکشن قائم نہیں ہوا۔","inviteAccepted":"درخواست قبول کی؛ تصدیق کے بعد رابطے کی کوشش جاری ہے۔",voiceConnect:"📱 وائس میسج بھیجنے کے لیے فون جوڑیں",endCall:"📴 کال ختم / رابطہ بند کریں",connect:"📱 فون جوڑنے کے مراحل",back:"↩ مرکزی صفحہ",heading:"بات کریں، دیکھیں، پیغام بھیجیں",subheading:"آڈیو کال، ویڈیو کال، وائس نوٹ اور نجی چیٹ — ایک آسان جگہ۔ کنکشن کے لیے دونوں فون درکار ہیں۔",free:"بلا اشتہار",consent:"مائک/کیمرہ آپ کی اجازت سے",noArchive:"سرور پر کال آرکائیو نہیں",audio:"آڈیو کال",video:"ویڈیو کال",voice:"وائس میسج",chat:"نجی چیٹ",audioHint:"براہِ راست آواز",videoHint:"آواز اور تصویر",voiceHint:"مختصر ریکارڈنگ",chatHint:"ایک بار کھلنے والا پیغام",callPanel:"آڈیو / ویڈیو کال",callHelp:"اصل آواز اور تصویر صرف حقیقی WebRTC کنکشن کے بعد۔",chatPanel:"نجی چیٹ",chatHelp:"دو فون جڑنے کے بعد ایک بار کھلنے والا پیغام بھیجا جا سکتا ہے۔",voicePanel:"وائس میسج",voiceHelp:"زیادہ سے زیادہ 6 سیکنڈ ریکارڈ کریں۔ Send دبانے سے پہلے کوئی آواز دوسرے فون کو نہیں جائے گی۔",record:"🎙️ ریکارڈ کریں",stop:"■ ریکارڈنگ بند",sendVoice:"↗ وائس نوٹ بھیجیں",discard:"✕ حذف",preview:"یہ آواز ابھی صرف آپ کے فون کی عارضی میموری میں ہے۔",incomingVoice:"دوست کا عارضی وائس نوٹ ملا ہے۔",playVoice:"🎧 ایک بار سنیں",setupTitle:"رابطہ جوڑیں",setupHelp:"فی الحال تجرباتی کال میں ایک فون کی دعوت اور دوسرے کا جواب شیئر کرنا ضروری ہے۔ خودکار کال سرور نہیں۔",qrLink:"▦ QR اور دوست",privacyLink:"🔒 پرائیویسی پالیسی",offlineTitle:"📶 مستقبل: Nearby / Offline Connect",offlineExplain:"ایک ہی مقامی Wi-Fi یا منظوری یافتہ ہاٹ اسپاٹ پر E-ZERO فون ملانے کا منصوبہ ہے۔ ابھی فعال نہیں۔",offlineConsent:"مستقبل میں انسٹالیشن کے دوران Nearby کی اختیاری، قابلِ واپسی رضامندی مل سکتی ہے۔ اس سے کسی دوسرے فون کا ڈیٹا خودکار استعمال کرنے کی اجازت نہیں ملتی۔",offlineTruth:"PWA خود Wi-Fi یا ہاٹ اسپاٹ نہیں چلا سکتی۔ OS کی اجازت اور الگ مقامی ٹیکنالوجی درکار ہوگی۔",idle:"ابھی حقیقی دو فون کنکشن نہیں۔",connected:"✓ حقیقی WebRTC کنکشن قائم ہے۔",connecting:"رابطہ قائم ہونے کی تصدیق باقی ہے۔",failed:"رابطہ ناکام؛ نیٹ ورک اور دعوت/جواب چیک کریں۔",audioInfo:"آڈیو کال کے لیے دو فونوں کی دعوت/جواب سے WebRTC کنکشن بنائیں۔",videoInfo:"ویڈیو کال کے لیے کنکشن بنائیں اور کیمرے کی اجازت دیں۔",voiceInfo:"وائس نوٹ مقامی ریکارڈ کریں، پھر فعال کنکشن کے ذریعے بھیجیں۔",chatInfo:"کنکشن کے بعد ایک بار کھلنے والا نجی پیغام بھیجیں۔",voiceIdle:"وائس نوٹ بھیجنے کے لیے حقیقی کنکشن ضروری ہے۔",recording:"آپ کی اجازت سے مائک 6 سیکنڈ تک ریکارڈ کر رہا ہے۔",ready:"مقامی وائس نوٹ تیار ہے؛ کنکشن ہو تو Send دبائیں۔",sent:"✓ وائس نوٹ کنکشن پر بھیج دیا گیا؛ سننے کی تصدیق نہیں۔",sendFail:"دو فونوں کا کنکشن موجود نہیں؛ ریکارڈنگ مقامی ہے۔",invalid:"وائس نوٹ غیر معاون یا حد سے بڑا ہے؛ دوبارہ بنائیں۔",permission:"مائک یا ریکارڈنگ کی اجازت/سپورٹ موجود نہیں۔",received:"عارضی وائس نوٹ آیا؛ سننے کے لیے بٹن دبائیں۔",expired:"وائس نوٹ حذف یا زائد المیعاد ہوگیا۔"},
en:{"inviteEmpty":"No actual invitation link has been entered. Copy the complete original link from the IMO message; the example text is not a real invitation.","inviteFragmentMissing":"The E-ZERO page opened, but the call invitation data is missing from this link. Copy the complete original invite or request a fresh invitation.","inviteBroken":"The signed invitation is incomplete or has changed. Opening the site alone is not enough; ask your friend to share a fresh, complete invitation.","inviteExpiredReason":"This invite has expired. Create a new offer on the original phone and share its complete link promptly.","inviteWrongPage":"This is not a valid invite URL for the current E-ZERO call page. Use the actual invitation from someone you trust.","inviteIncomingTip":"If IMO only opens the E-ZERO page without a request, copy the complete invitation link from the original IMO message and paste it here. Do not use the example.","prepareInvite":"↗ Prepare a friend's invitation","shareInvite":"↗ Share invitation / reply","incomingTitle":"Incoming connection request","incomingDescription":"A temporary friend invitation or reply arrived. Accept only from someone you trust.","acceptInvite":"✓ Accept request","declineInvite":"✕ Decline","linkFallbackTitle":"If your friend's link opens in another tab","linkFallbackHelp":"Keep the original call tab open. Enter the received E-ZERO link here; no technical codes.","pasteLinkLabel":"Received invitation or reply link","loadLink":"✓ Open link","generatedLabel":"Temporary link for your trusted friend","copyLink":"📋 Copy link","signalPrivacy":"The link may contain IP/network details; share only with a trusted friend. Messaging apps can retain it.","inviteIdle":"Send an invitation or open a friend's link.","inviteBusy":"Preparing a signed invitation. Camera/mic permission may be requested.","inviteReady":"Invitation ready. Share the link with your friend.","answerReadyWizard":"Reply ready. Share it back with the same friend.","inviteReceived":"Invitation received. Confirm who sent it before accepting.","answerReceived":"Reply received. Accept it in the original active call tab.","inviteInvalid":"This link is invalid, unrelated or incomplete. Ask for a new one.","inviteExpired":"The link may have expired. Request another.","inviteRejected":"Invitation declined. No call started.","inviteNeedsTab":"Return to the original call tab and enter the reply link there.","inviteNoShare":"Sharing unavailable. Use the optional copy link below and send only to your friend.","inviteCopied":"Link copied; send it privately to your friend.","inviteShared":"Link shared; your friend's reply is still required.","inviteNotSent":"Sharing canceled; no connection established.","inviteAccepted":"Request accepted; connection will be checked.",voiceConnect:"📱 Connect phones to send voice",endCall:"📴 Hang up / disconnect",connect:"📱 Connect both phones",back:"↩ Main page",heading:"Talk, see and send",subheading:"Audio, video, voice notes and private chat in one place. Two phones are required.",free:"No ads",consent:"Mic/camera with permission",noArchive:"No server call archive",audio:"Audio call",video:"Video call",voice:"Voice note",chat:"Private chat",audioHint:"Direct audio",videoHint:"Audio and video",voiceHint:"Short recording",chatHint:"One-view message",callPanel:"Audio / video call",callHelp:"Real media only after an actual WebRTC connection.",chatPanel:"Private chat",chatHelp:"Send a one-view message when both browsers are connected.",voicePanel:"Voice message",voiceHelp:"Record up to 6 seconds. Nothing is sent until you press Send.",record:"🎙️ Record",stop:"■ Stop",sendVoice:"↗ Send voice note",discard:"✕ Discard",preview:"This audio is temporary and local only.",incomingVoice:"A temporary voice note has arrived.",playVoice:"🎧 Listen once",setupTitle:"Connect devices",setupHelp:"Experimental calls still require sharing an offer and an answer. There is no automatic signaling server.",qrLink:"▦ QR & friends",privacyLink:"🔒 Privacy policy",offlineTitle:"📶 Future: Offline Nearby",offlineExplain:"Local Wi-Fi or an approved hotspot might connect nearby E-ZERO phones in a future release. Not active.",offlineConsent:"A future optional, revocable Nearby installation preference cannot authorize automatic use of another phone's mobile data.",offlineTruth:"A PWA cannot turn on Wi-Fi or a hotspot without OS support and permission.",idle:"No real two-phone connection yet.",connected:"✓ Real WebRTC connection established.",connecting:"Connection is not yet confirmed.",failed:"Connection failed. Check network and offer/answer.",audioInfo:"Connect both phones via the offer and answer before an audio call.",videoInfo:"Connect both phones and grant camera permission before video.",voiceInfo:"Record locally, then send over an active connection.",chatInfo:"Send a one-view private message after connection.",voiceIdle:"Connect two phones to send voice.",recording:"Recording with your permission for up to 6 seconds.",ready:"Local voice note ready. Press Send when connected.",sent:"✓ Voice note sent; delivery does not prove listening.",sendFail:"No active connection; recording stays local.",invalid:"Unsupported or oversized note. Record again.",permission:"Microphone or recorder permission/support unavailable.",received:"Temporary voice note received. Tap to listen.",expired:"Voice note expired or discarded."},
ar:{"inviteEmpty":"لم يتم إدخال رابط دعوة حقيقي. انسخ الرابط الكامل من رسالة IMO الأصلية؛ النص التوضيحي ليس دعوة.","inviteFragmentMissing":"فُتحت صفحة E-ZERO لكن بيانات دعوة المكالمة مفقودة من الرابط. انسخ الرابط الأصلي كاملًا أو اطلب دعوة جديدة.","inviteBroken":"رابط الدعوة الموقّعة ناقص أو تغيّر. فتح الموقع وحده لا يكفي؛ اطلب من صديقك إعادة إرسال دعوة كاملة جديدة.","inviteExpiredReason":"انتهت صلاحية الدعوة. أنشئ دعوة جديدة على الهاتف الأول وشارك الرابط الكامل بسرعة.","inviteWrongPage":"هذا الرابط ليس دعوة صحيحة لصفحة مكالمات E-ZERO الحالية. استخدم الرابط الفعلي من صديق موثوق.","inviteIncomingTip":"إذا فتح IMO موقع E-ZERO فقط دون ظهور طلب، انسخ رابط الدعوة الكامل من الرسالة الأصلية والصقه هنا، وليس النص التوضيحي.","prepareInvite":"↗ إعداد دعوة لصديق","shareInvite":"↗ مشاركة الدعوة أو الرد","incomingTitle":"طلب اتصال من صديق","incomingDescription":"وصلت دعوة أو رد مؤقت. اقبل فقط إذا كنت تثق بالمرسل.","acceptInvite":"✓ قبول الطلب","declineInvite":"✕ رفض","linkFallbackTitle":"إذا فُتح رابط الصديق في تبويب آخر","linkFallbackHelp":"احتفظ بتبويب المكالمة الأصلي مفتوحًا. أدخل رابط E-ZERO المستلم، دون أكواد تقنية.","pasteLinkLabel":"رابط الدعوة أو الرد المستلم","loadLink":"✓ فتح الرابط","generatedLabel":"رابط مؤقت لمشاركته مع صديق موثوق","copyLink":"📋 نسخ الرابط","signalPrivacy":"قد يحتوي الرابط على عنوان IP وبيانات الشبكة؛ شاركه مع صديق موثوق فقط. قد تحفظه تطبيقات المراسلة.","inviteIdle":"شارك دعوة أو افتح رابطًا من صديق.","inviteBusy":"جارٍ إعداد دعوة موقعة. قد يُطلب إذن الميكروفون أو الكاميرا.","inviteReady":"الدعوة جاهزة. شارك الرابط مع صديقك.","answerReadyWizard":"الرد جاهز. شاركه مع الصديق نفسه.","inviteReceived":"وصلت دعوة. تحقق من المرسل قبل القبول.","answerReceived":"وصل الرد. اقبله في تبويب المكالمة الأصلي.","inviteInvalid":"الرابط غير صالح أو غير مكتمل أو من صفحة أخرى. اطلب رابطًا جديدًا.","inviteExpired":"قد تكون صلاحية الرابط انتهت؛ اطلب رابطًا جديدًا.","inviteRejected":"رُفضت الدعوة ولم تبدأ مكالمة.","inviteNeedsTab":"ارجع إلى تبويب المكالمة الأصلي وأدخل رابط الرد هناك.","inviteNoShare":"المشاركة غير متاحة. انسخ الرابط وأرسله إلى صديق موثوق فقط.","inviteCopied":"تم نسخ الرابط. أرسله لصديقك بشكل خاص.","inviteShared":"تمت مشاركة الرابط. ما زال رد الصديق مطلوبًا.","inviteNotSent":"أُلغيت المشاركة ولم يتم الاتصال.","inviteAccepted":"تم قبول الطلب ويجري التحقق من الاتصال.",voiceConnect:"📱 اربط الهاتفين لإرسال الصوت",endCall:"📴 إنهاء المكالمة / قطع الاتصال",connect:"📱 خطوات ربط الهاتفين",back:"↩ الصفحة الرئيسية",heading:"تحدث وشاهد وأرسل",subheading:"مكالمات صوتية ومرئية ورسائل صوتية ومحادثات خاصة، مع اتصال حقيقي بين هاتفين.",free:"بلا إعلانات",consent:"إذن للكاميرا والميكروفون",noArchive:"لا أرشيف للمكالمات على الخادم",audio:"مكالمة صوتية",video:"مكالمة مرئية",voice:"رسالة صوتية",chat:"محادثة خاصة",audioHint:"صوت مباشر",videoHint:"صوت وصورة",voiceHint:"تسجيل قصير",chatHint:"رسالة تُفتح مرة واحدة",callPanel:"مكالمة صوتية / مرئية",callHelp:"تظهر الوسائط بعد اتصال WebRTC حقيقي.",chatPanel:"محادثة خاصة",chatHelp:"أرسل رسالة تُفتح مرة واحدة بعد اتصال الهاتفين.",voicePanel:"رسالة صوتية",voiceHelp:"سجّل حتى 6 ثوانٍ؛ لن تُرسل حتى تضغط إرسال.",record:"🎙️ تسجيل",stop:"■ إيقاف",sendVoice:"↗ إرسال الصوت",discard:"✕ حذف",preview:"الصوت محلي ومؤقت على الهاتف.",incomingVoice:"وصلت رسالة صوتية مؤقتة.",playVoice:"🎧 استمع مرة واحدة",setupTitle:"ربط الأجهزة",setupHelp:"تحتاج المكالمة التجريبية إلى تبادل دعوة ورد؛ لا يوجد خادم اتصال تلقائي.",qrLink:"▦ QR والأصدقاء",privacyLink:"🔒 سياسة الخصوصية",offlineTitle:"📶 مستقبلًا: Nearby دون إنترنت",offlineExplain:"نخطط لاتصال هواتف E-ZERO القريبة عبر Wi-Fi محلي أو نقطة اتصال بموافقة. غير مفعّل.",offlineConsent:"تفضيل Nearby اختياري وقابل للإلغاء مستقبلًا، ولا يسمح باستخدام بيانات هاتف آخر تلقائيًا.",offlineTruth:"لا يستطيع PWA تشغيل Wi-Fi أو نقطة الاتصال بلا دعم وأذونات النظام.",idle:"لا يوجد اتصال حقيقي بين الهاتفين.",connected:"✓ تم إنشاء اتصال WebRTC حقيقي.",connecting:"لم يتأكد الاتصال بعد.",failed:"فشل الاتصال؛ تحقق من الشبكة والدعوة والرد.",audioInfo:"اربط الهاتفين بالدعوة والرد للمكالمة الصوتية.",videoInfo:"اربط الهاتفين واسمح بالكاميرا للمكالمة المرئية.",voiceInfo:"سجّل محليًا ثم أرسل بعد الاتصال.",chatInfo:"أرسل رسالة خاصة تُفتح مرة واحدة بعد الاتصال.",voiceIdle:"يجب ربط الهاتفين لإرسال الصوت.",recording:"يجري التسجيل بإذنك لمدة 6 ثوانٍ كحد أقصى.",ready:"الرسالة جاهزة؛ اضغط إرسال بعد الاتصال.",sent:"✓ تم إرسال الصوت، ولا يعني ذلك أن الطرف الآخر استمع.",sendFail:"لا يوجد اتصال؛ يبقى التسجيل محليًا.",invalid:"الصوت كبير أو غير مدعوم. أعد التسجيل.",permission:"الميكروفون أو التسجيل غير متاح.",received:"وصلت رسالة مؤقتة؛ اضغط للاستماع.",expired:"انتهت صلاحية الرسالة أو حُذفت."}
};
const t=k=>(trans[document.documentElement.lang]||trans.ur)[k]||k;
let current="audio", recorder=null, micStream=null, limitTimer=null, draft=null, draftUrl=null,
  incoming=null, incomingUrl=null, incomingTimeout=null, recId=0;
const pick=(selector)=>document.querySelector(selector);
function moveOriginal(){
  const media=$("mediaTitle")?.closest("section.card");
  const chat=$("messageTitle")?.closest("section.card");
  // Keep the original verified WebRTC form mounted but invisible inside
  // #secureAdvanced. The public page uses link-based actions only.
  const setup=$("callSetup");
  if(media)$("ezeroCallMediaSlot").append(media);
  if(chat)$("ezeroChatSlot").append(chat);
  if(setup)setup.open=false;
  if($("ezeroCallSetupSlot"))$("ezeroCallSetupSlot").hidden=true;
}
moveOriginal();
$("modernHangup").addEventListener("click",()=>{
  $("hangup").click();
  ++recId;stopMic();clearDraft();clearIncoming();
  setConnection("idle");
  $("ezeroCallSetupSlot").hidden=true;
});
function openConnectionSteps(){
  $("ezeroCallSetupSlot").hidden=false;
  $("ezeroCallSetupSlot").scrollIntoView({block:"start",behavior:"smooth"});
}
$("modernConnect").addEventListener("click",openConnectionSteps);
$("ezeroVoiceConnect").addEventListener("click",openConnectionSteps);

/* Shareable signed WebRTC offers/replies: no signaling server, no tracking.
 * URL fragments are handled entirely in the browser. Other apps can retain the
 * shared link, including IP/network metadata. Only explicit accept starts media.
 */
let pendingSigned=null,preparedShare=null;
const wizardStatus=key=>{$("ezeroInviteStatus").textContent=t(key);};
const exactPage=new URL("./ezero_secure_connect_communications_v0_3.html",location.href);
function parseInviteLink(value){
  if(typeof value!=="string"||value.length>210000)throw Error("TOO_LONG");
  const entered=value.trim();
  if(!entered)throw Error("EMPTY_LINK");
  // Some share targets prepend a greeting or wrap the complete URL in text.
  // Extract only a complete http(s) URL; never accept an origin or path mismatch.
  const httpsAt=entered.indexOf("https://"),httpAt=entered.indexOf("http://");
  const start=httpsAt>=0?httpsAt:httpAt;
  const urlPart=start>=0?entered.slice(start):entered;
  const candidate=urlPart.split(" ")[0].split("\n")[0].split("\r")[0].split("<")[0].split(">")[0].split('"')[0].replace(/[.,)،。]+$/u,"");
  let uri;
  try{uri=new URL(candidate,location.href);}catch(_){throw Error("BAD_URL");}
  if(uri.origin!==location.origin||uri.pathname!==exactPage.pathname)throw Error("WRONG_ORIGIN");
  if(!uri.hash)throw Error("MISSING_INVITE");
  const m=/^#e=([A-Za-z0-9_-]+)$/.exec(uri.hash);
  if(!m||m[1].length<100||m[1].length>195000)throw Error("BAD_FRAGMENT");
  let decoded;
  try{
    const str=atob(m[1].replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-m[1].length%4)%4));
    const bytes=Uint8Array.from(str,x=>x.charCodeAt(0));
    decoded=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
  }catch(_){throw Error("BAD_ENCODING");}
  if(decoded.length>145000)throw Error("TOO_LARGE");
  let v;
  try{v=JSON.parse(decoded);}catch(_){throw Error("BAD_JSON");}
  if(v?.v!==1||!["offer","answer"].includes(v.type)||
     typeof v.sdp!=="string"||v.sdp.length<100||v.sdp.length>120000||
     !v.sdp.startsWith("v=0")||!v.sdp.includes("a=fingerprint:")||
     !/^[a-f0-9]{64}$/.test(v.fp||"")||
     !Number.isSafeInteger(v.issued))throw Error("BAD_SIGNAL");
  if(Math.abs(Date.now()-v.issued)>1800000)throw Error("EXPIRED_INVITE");
  return {raw:decoded,type:v.type,video:v.sdp.includes("m=video")};
}
function inviteFailure(error){
  const code=String(error?.message||"");
  const key=code==="EMPTY_LINK"?"inviteEmpty":
    code==="MISSING_INVITE"?"inviteFragmentMissing":
    code==="WRONG_ORIGIN"?"inviteWrongPage":
    code==="EXPIRED_INVITE"?"inviteExpiredReason":"inviteBroken";
  pendingSigned=null;
  $("ezeroIncomingInvite").hidden=true;
  $("ezeroCallSetupSlot").hidden=false;
  wizardStatus(key);
  // Intentionally do not log, send, or display the private invitation payload.
}
function encodeSignal(raw){
  const bytes=new TextEncoder().encode(raw);
  if(!bytes.length||bytes.length>120000)throw Error("TOO_LARGE");
  let text="";for(const byte of bytes)text+=String.fromCharCode(byte);
  const token=btoa(text).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  if(token.length>195000)throw Error("TOO_LONG");
  const u=new URL(exactPage.href);
  u.searchParams.set("mode",current==="video"?"video":"audio");
  const lang=document.documentElement.lang||"ur";
  if(lang!=="ur")u.searchParams.set("lang",lang);
  u.hash="e="+token;
  return u.href;
}
function readyToShare(type){
  try{
    const raw=$("localSignal").value;
    const signal=JSON.parse(raw);
    if(signal?.v!==1||!["offer","answer"].includes(signal.type)||signal.type!==type)
      throw Error("NOT_READY");
    preparedShare=encodeSignal(raw);
    $("ezeroGeneratedLink").value=preparedShare;
    $("ezeroShareInvite").hidden=false;
    $("ezeroShareInvite").disabled=false;
    wizardStatus(type==="offer"?"inviteReady":"answerReadyWizard");
  }catch(_){wizardStatus("inviteInvalid");}
}
document.addEventListener("ezero:signal-ready",e=>readyToShare(e.detail?.type));
$("ezeroPrepareInvite").addEventListener("click",()=>{
  preparedShare=null;
  $("ezeroShareInvite").hidden=true;
  $("ezeroShareInvite").disabled=true;
  $("ezeroGeneratedFallback").hidden=true;
  $("ezeroPrepareInvite").disabled=true;
  wizardStatus("inviteBusy");
  // The existing core handles permissions, signed SDP, ICE and error reporting.
  $("guidedOffer").click();
  // Defer reopening until its core create-offer transaction settles.
  const done=()=>{$("ezeroPrepareInvite").disabled=false;};
  document.addEventListener("ezero:signal-ready",done,{once:true});
  setTimeout(done,20000);
});
function showIncoming(link){
  const data=parseInviteLink(link);
  pendingSigned=data;
  $("ezeroIncomingInvite").hidden=false;
  $("ezeroIncomingHeading").textContent=t("incomingTitle");
  $("ezeroIncomingDescription").textContent=t("incomingDescription");
  $("ezeroAcceptInvite").disabled=false;
  $("ezeroPasteLink").value="";
  wizardStatus(data.type==="offer"?"inviteReceived":"answerReceived");
  $("ezeroCallSetupSlot").hidden=false;
  return data;
}
$("ezeroAcceptInvite").addEventListener("click",()=>{
  if(!pendingSigned)return;
  const data=pendingSigned;
  pendingSigned=null;$("ezeroIncomingInvite").hidden=true;
  // No network or microphone access is requested until this explicit click.
  if(data.type==="offer"){
    const radio=document.querySelector('input[name="mode"][value="'+(data.video?"video":"audio")+'"]');
    if(radio)radio.checked=true;
  }
  $("guidedIncoming").value=data.raw;
  $("ezeroAcceptInvite").disabled=true;
  $("guidedContinue").click();
  wizardStatus("inviteAccepted");
});
$("ezeroDeclineInvite").addEventListener("click",()=>{
  pendingSigned=null;$("ezeroIncomingInvite").hidden=true;
  wizardStatus("inviteRejected");
});
$("ezeroPasteLink").addEventListener("input",()=>{
  $("ezeroLoadLink").disabled=!$("ezeroPasteLink").value.trim();
});
$("ezeroLoadLink").addEventListener("click",()=>{
  try{showIncoming($("ezeroPasteLink").value.trim());}
  catch(error){inviteFailure(error);}
});
$("ezeroShareInvite").addEventListener("click",async()=>{
  if(!preparedShare)return;
  try{
    if(typeof navigator.share!=="function")throw Error("NO_SHARE");
    await navigator.share({title:"E-ZERO Secure Connect — experimental call",url:preparedShare});
    wizardStatus("inviteShared");
  }catch(e){
    if(e?.name==="AbortError"){wizardStatus("inviteNotSent");return;}
    $("ezeroGeneratedFallback").hidden=false;
    wizardStatus("inviteNoShare");
  }
});
$("ezeroCopyLink").addEventListener("click",async()=>{
  if(!preparedShare)return;
  try{await navigator.clipboard.writeText(preparedShare);wizardStatus("inviteCopied");}
  catch(_){wizardStatus("inviteNoShare");}
});
function receiveHash(){
  if(!location.hash.startsWith("#e="))return;
  const link=location.href;
  const sanitized=new URL(location.href);sanitized.hash="";
  try{history.replaceState(null,"",sanitized.href);}catch(_){}
  try{showIncoming(link);}catch(error){inviteFailure(error);}
}
receiveHash();
// Opening a same-page invite changes only the fragment and will not reload
// defer scripts; process the hashchange as well as initial page load.
window.addEventListener("hashchange",receiveHash);
function setConnection(stage){
 const el=$("modernConnectionStatus");
 const connected=stage==="connected";
 el.textContent=t(connected?"connected":stage==="iceNoRoute"||stage==="signalInvalid"||stage==="micDenied"?"failed":stage==="idle"?"idle":"connecting");
 el.dataset.state=connected?"connected":"idle";
 const dataReady=window.EZERO_VOICE_TRANSPORT?.connected()===true;
 $("ezeroVoiceSend").disabled=!(draft&&dataReady);
 $("ezeroVoiceConnect").hidden=dataReady;
}
const explain=()=>{ $("modernFeatureTitle").textContent=t(current);
 $("modernFeatureHelp").textContent=t(current+"Info"); };
function select(type){
 if(!["audio","video","voice","chat"].includes(type))return;
 current=type;
 for(const b of document.querySelectorAll("[data-modern-select]"))
   b.setAttribute("aria-pressed",String(b.dataset.modernSelect===type));
 const call=type==="audio"||type==="video";
 $("modernCallPanel").hidden=!call;
 $("modernChatPanel").hidden=type!=="chat";
 $("modernVoicePanel").hidden=type!=="voice";
 const radio=pick('input[name="mode"][value="'+(type==="video"?"video":"audio")+'"]');
 if(radio)radio.checked=true;
 explain();
}
for(const b of document.querySelectorAll("[data-modern-select]"))b.addEventListener("click",()=>select(b.dataset.modernSelect));
function translate(){
 for(const el of document.querySelectorAll("[data-modern]"))el.textContent=t(el.dataset.modern);
 const lang=document.documentElement.lang||"ur";
 for(const id of ["modernBack","modernQrLink","modernPolicyLink"]){
   const el=$(id),page=id==="modernPolicyLink"?"ezero_secure_connect_privacy_v0_2.html":"ezero_secure_connect_live_p2p_v0_1.html";
   el.href="./"+page+(lang==="ur"?"":"?lang="+encodeURIComponent(lang));
 }
 explain();
 if($("modernConnectionStatus").dataset.state!=="connected")$("modernConnectionStatus").textContent=t("idle");
 if(!draft)$("ezeroVoiceStatus").textContent=t("voiceIdle");
}
$("language").addEventListener("change",translate);
translate();
select(new URLSearchParams(location.search).get("mode")||"audio");
document.addEventListener("ezero:call-status",e=>setConnection(e.detail?.stage));
document.addEventListener("ezero:channel-state",e=>{
  if(e.detail?.connected)setConnection("connected");
  else{$("ezeroVoiceSend").disabled=true;$("ezeroVoiceConnect").hidden=false;clearIncoming();}
});
function stopMic(){
 if(limitTimer){clearTimeout(limitTimer);limitTimer=null;}
 if(recorder?.state==="recording"){try{recorder.stop();}catch(_){}}
 if(micStream){micStream.getTracks().forEach(tr=>tr.stop());micStream=null;}
 $("ezeroVoiceStop").hidden=true;$("ezeroVoiceRecord").disabled=false;
}
function clearDraft(){
 if(draftUrl){URL.revokeObjectURL(draftUrl);draftUrl=null;}
 draft=null;$("ezeroVoicePreview").pause();$("ezeroVoicePreview").removeAttribute("src");
 $("ezeroVoiceDraft").hidden=true;$("ezeroVoiceSend").disabled=true;$("ezeroVoiceClear").disabled=true;
}
function clearIncoming(){
 if(incomingTimeout){clearTimeout(incomingTimeout);incomingTimeout=null;}
 if(incomingUrl){URL.revokeObjectURL(incomingUrl);incomingUrl=null;}
 incoming=null;$("ezeroVoiceIncomingAudio").pause();$("ezeroVoiceIncomingAudio").removeAttribute("src");
 $("ezeroVoiceIncomingAudio").hidden=true;$("ezeroVoiceOpenIncoming").hidden=false;$("ezeroVoiceReceived").hidden=true;
}
function voiceStatus(key){$("ezeroVoiceStatus").textContent=t(key);}
$("ezeroVoiceRecord").addEventListener("click",async()=>{
 if(micStream||recorder?.state==="recording")return;
 clearDraft();
 if(typeof MediaRecorder!=="function"||!navigator.mediaDevices?.getUserMedia){voiceStatus("permission");return;}
 const generation=++recId;
 try{
  const s=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
  if(generation!==recId||document.hidden){s.getTracks().forEach(x=>x.stop());return;}
  micStream=s;
  const mime=["audio/webm;codecs=opus","audio/mp4","audio/ogg","audio/webm"]
    .find(type=>MediaRecorder.isTypeSupported(type));
  if(!mime){stopMic();voiceStatus("permission");return;}
  const chunks=[];
  recorder=new MediaRecorder(s,{mimeType:mime,audioBitsPerSecond:20000});
  const r=recorder;
  r.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
  r.onstop=()=>{
    stopMic();
    if(generation!==recId)return;
    const blob=new Blob(chunks,{type:r.mimeType});
    const type=blob.type.split(";")[0].toLowerCase();
    if(blob.size<100||blob.size>23000||!["audio/webm","audio/mp4","audio/ogg"].includes(type)){
      voiceStatus("invalid");return;
    }
    draft={blob,mime:type};draftUrl=URL.createObjectURL(blob);
    $("ezeroVoicePreview").src=draftUrl;$("ezeroVoiceDraft").hidden=false;
    $("ezeroVoiceClear").disabled=false;
    $("ezeroVoiceSend").disabled=!window.EZERO_VOICE_TRANSPORT?.connected();
    voiceStatus("ready");
  };
  recorder.start();
  $("ezeroVoiceRecord").disabled=true;$("ezeroVoiceStop").hidden=false;
  voiceStatus("recording");
  limitTimer=setTimeout(stopMic,6000);
 }catch(_){stopMic();voiceStatus("permission");}
});
$("ezeroVoiceStop").addEventListener("click",stopMic);
$("ezeroVoiceClear").addEventListener("click",()=>{++recId;stopMic();clearDraft();voiceStatus("expired");});
$("ezeroVoiceSend").addEventListener("click",async()=>{
 if(!draft||!window.EZERO_VOICE_TRANSPORT?.connected()){voiceStatus("sendFail");return;}
 $("ezeroVoiceSend").disabled=true;
 try{
   const bytes=new Uint8Array(await draft.blob.arrayBuffer());
   if(bytes.length>23000)throw Error("TOO_LARGE");
   let binary="";for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
   const good=window.EZERO_VOICE_TRANSPORT.send(draft.mime,btoa(binary));
   if(!good){voiceStatus("sendFail");return;}
   clearDraft();voiceStatus("sent");
 }catch(_){voiceStatus("invalid");}
});
document.addEventListener("ezero:voice-note-received",e=>{
 const d=e.detail;
 if(!d||typeof d.audio!=="string"||d.audio.length>32000||!["audio/webm","audio/mp4","audio/ogg"].includes(d.mime))return;
 clearIncoming();
 incoming={audio:d.audio,mime:d.mime};
 $("ezeroVoiceReceived").hidden=false;voiceStatus("received");
 incomingTimeout=setTimeout(clearIncoming,600000);
});
$("ezeroVoiceOpenIncoming").addEventListener("click",()=>{
 if(!incoming)return;
 try{
   const b=atob(incoming.audio);
   if(b.length>24000)throw Error("TOO_LARGE");
   const raw=Uint8Array.from(b,c=>c.charCodeAt(0));
   const blob=new Blob([raw],{type:incoming.mime});
   incomingUrl=URL.createObjectURL(blob);
   $("ezeroVoiceIncomingAudio").src=incomingUrl;
   $("ezeroVoiceIncomingAudio").hidden=false;
   $("ezeroVoiceOpenIncoming").hidden=true;
   incoming=null;
   $("ezeroVoiceIncomingAudio").play().catch(()=>{});
   if(incomingTimeout)clearTimeout(incomingTimeout);
   incomingTimeout=setTimeout(clearIncoming,300000);
 }catch(_){clearIncoming();voiceStatus("invalid");}
});
$("ezeroVoiceIncomingAudio").addEventListener("ended",()=>{clearIncoming();voiceStatus("expired");});
document.addEventListener("visibilitychange",()=>{if(document.hidden){++recId;stopMic();}});
window.addEventListener("pagehide",()=>{++recId;stopMic();clearDraft();clearIncoming();});
})();
