import {createOrLoadIdentity,inviteLink,incomingInvite,apiRequest}
  from "./signaling_client_v0_1.mjs";

/* E-ZERO: intentionally separate from the production website.
 * An actual verified HTTPS backend URL is required; never invent an endpoint.
 * Explicit registration, request, acceptance. No background calls/polling.
 * Only public fingerprints appear in links, not signed-in identity secrets.
 */
const $=id=>document.getElementById(id);
const ids=/^[a-f0-9]{64}$/;
const TEXT={
  ur:{
    back:"↩ واپس",language:"زبان",title:"دوست کی درخواست — ایک سادہ اور محفوظ مرحلہ",
    explain:"لنک بھیجنے والے کا فنگرپرنٹ دیکھیں۔ صرف آپ کی منظوری کے بعد درخواست بھیجی یا قبول کی جائے گی۔",
    warning:"آزمائشی نظام: جب تک رابطہ سرور فعال نہ ہو، دوسرے فون کو درخواست نہیں پہنچے گی۔ انسٹالیشن کا مطلب خودکار دوستی نہیں۔",
    inviter:"لنک کس نے بھیجا؟",inviterFP:"بھیجنے والے کا SHA-256 فنگرپرنٹ",
    inviterUnknown:"اس لنک میں کسی مخصوص دوست کی شناخت موجود نہیں۔",
    inviterKnown:"دعوت میں عوامی فنگرپرنٹ موجود ہے۔ دوست کی اصل شناخت الگ سے تصدیق کریں۔",
    inviterHonesty:"SHA-256 فنگرپرنٹ اصل انسان کے نام کا ثبوت نہیں۔",
    setup:"میری محفوظ شناخت (صرف آزمائش)",setupExplain:"آپ کے فون پر غیرقابلِ برآمد سائننگ چابی محفوظ ہوگی؛ سرور صرف عوامی چابی دیکھے گا۔",
    settings:"آزمائشی Cloudflare رابطہ سرور کی سیٹنگز",
    endpoint:"Cloudflare Workers کا تصدیق شدہ HTTPS ایڈریس",
    secret:"آزمائشی رسائی کوڈ — میسج یا URL میں مت بھیجیں",
    consent:"میں اپنے فون میں غیرقابلِ برآمد ذاتی سائننگ چابی محفوظ کرنے کی اجازت دیتا/دیتی ہوں۔",
    register:"✓ میری شناخت بنائیں اور رجسٹر کریں",
    accountWaiting:"Cloudflare سرور کی تصدیق کے بغیر آن لائن اکاؤنٹ فعال نہیں۔",
    registered:"✓ سرور نے اس فون کی عوامی SHA-256 شناخت رجسٹر کردی۔",
    missingConsent:"پہلے ذاتی شناخت محفوظ کرنے کی منظوری دیں۔",
    missingEndpoint:"Cloudflare سرور کا درست HTTPS ایڈریس درج کریں؛ ابھی کوئی سرور فعال نہیں۔",
    missingSecret:"آزمائشی رسائی کوڈ صرف رجسٹریشن کے لیے درج کریں؛ اسے لنک میں مت بھیجیں۔",
    working:"درخواست کی تصدیق جاری ہے؛ کامیابی کا دعویٰ سرور کے جواب کے بعد ہی ہوگا۔",
    serverError:"سرور سے تصدیق نہیں ہوسکی۔ کنکشن، مفت کوٹہ یا Cloudflare اجازت چیک کریں۔",
    invalidSignature:"ڈیجیٹل دستخط مسترد ہوگیا؛ شناخت یا سکیورٹی کی جانچ ضروری ہے۔",
    pilotOff:"آزمائشی سرور ابھی بند ہے؛ درخواست نہیں پہنچ سکتی۔",
    shareTitle:"میرا مخصوص دعوتی لنک",
    shareExplain:"اس لنک میں صرف عوامی SHA-256 شناخت ہوگی؛ پاس ورڈ یا خفیہ چابی نہیں۔",
    share:"↗ دوست کو دعوتی لنک بھیجیں",copy:"📋 لنک کاپی کریں",
    linkCopied:"✓ آپ کا شناختی دعوتی لنک کاپی ہوگیا۔",
    linkShare:"شیئر اسکرین بند ہوگئی؛ دوست کے لنک وصول کرنے کی تصدیق نہیں ہوئی۔",
    shareFailed:"شیئرنگ دستیاب نہیں؛ لنک کاپی کریں۔",
    requestTitle:"دوست کی درخواست",
    requestHelp:"دوست کا لنک کھول کر آئے ہیں تو اس کا فنگرپرنٹ اوپر موجود ہوگا۔ آپ کی منظوری سے درخواست بھیجی جائے گی۔",
    sendRequest:"➕ اس شخص کو دوست کی درخواست بھیجیں",
    requestWaiting:"ابھی کوئی درخواست نہیں بھیجی گئی۔",
    requestSent:"✓ سرور نے درخواست درج کی۔ دوسرا شخص قبول کرے تو ہی دونوں دوست بنیں گے۔",
    requestPending:"درخواست پہلے سے موجود ہے؛ دوسرے شخص کی منظوری باقی ہے۔",
    requestNotAvailable:"اس فنگرپرنٹ والا اکاؤنٹ سرور پر ابھی رجسٹر نہیں۔",
    inboxTitle:"مجھے آئی ہوئی درخواستیں",checkInbox:"↻ درخواستیں دیکھیں",
    inboxEmpty:"کوئی زیرِ انتظار درخواست نہیں۔",
    accept:"✓ قبول کریں",decline:"✕ مسترد کریں",
    accepted:"✓ سرور نے دونوں اکاؤنٹس میں دوستی کی تصدیق کردی۔",
    declined:"درخواست مسترد کردی گئی؛ دوستی قائم نہیں ہوئی۔",
    friendsTitle:"تصدیق شدہ دوست",checkFriends:"↻ فرینڈ لسٹ دیکھیں",
    friendsEmpty:"ابھی کوئی باہمی منظور شدہ دوست نہیں۔",remove:"دوستی ہٹائیں",
    removed:"اس دوست کا رابطہ دونوں اکاؤنٹس سے ہٹا دیا گیا۔",
    footer:"آزمائشی فرینڈ ریکویسٹ · کال/پس منظر نوٹیفکیشن سرور ابھی نہیں · کوئی اشتہار نہیں"
  },
  en:{
    back:"↩ Back",language:"Language",title:"Friend invitations — a simple, consent-first flow",
    explain:"See the sender's public fingerprint. You decide whether to send or accept a friend request.",
    warning:"Experimental service: without a live signaling server, a request cannot reach another phone. Installation does not create a friendship.",
    inviter:"Who shared this link?",inviterFP:"Sender's SHA-256 fingerprint",
    inviterUnknown:"No specific friend's identity was included in this link.",
    inviterKnown:"This link contains a public fingerprint. Independently verify the person who sent it.",
    inviterHonesty:"A digital fingerprint does not establish a person's real-world identity.",
    setup:"My secure identity (pilot only)",setupExplain:"Your phone stores a non-extractable signing key. Only the public key is registered.",
    settings:"Cloudflare staging server settings",endpoint:"Verified HTTPS Cloudflare Workers endpoint",
    secret:"Pilot access code — never share in message or link",
    consent:"I consent to a non-extractable signing key being stored on this device.",
    register:"✓ Create and register my identity",accountWaiting:"No online account is active without server confirmation.",
    registered:"✓ The server confirmed this phone's public SHA-256 identity.",
    missingConsent:"Approve local key storage first.",
    missingEndpoint:"Enter a valid HTTPS Cloudflare Worker endpoint. No backend is connected yet.",
    missingSecret:"Enter your pilot access code for registration only; never send it in the link.",
    working:"Verifying with server. Success is shown only after a real server response.",
    serverError:"Server verification failed. Check connectivity, quotas or Cloudflare access.",
    invalidSignature:"Digital signature was rejected; review the identity and security setup.",
    pilotOff:"The pilot server is disabled. No request was delivered.",
    shareTitle:"My personal invite link",shareExplain:"Only your public SHA-256 fingerprint is included; no secret key or password.",
    share:"↗ Share my invite link",copy:"📋 Copy invite link",
    linkCopied:"✓ Your invitation link was copied.",
    linkShare:"The share sheet closed; delivery to the recipient is not confirmed.",
    shareFailed:"Sharing is unavailable. Copy the link instead.",
    requestTitle:"Friend request",requestHelp:"If you opened a friend's invite, their SHA-256 fingerprint appears above. Sending requires your approval.",
    sendRequest:"➕ Send this person a friend request",requestWaiting:"No request has been sent.",
    requestSent:"✓ Server received the request. Friendship requires the other person's acceptance.",
    requestPending:"Request already pending; waiting for the recipient.",
    requestNotAvailable:"This fingerprint is not yet registered with the pilot server.",
    inboxTitle:"Incoming requests",checkInbox:"↻ Check requests",inboxEmpty:"No pending requests.",
    accept:"✓ Accept",decline:"✕ Decline",accepted:"✓ Both accounts now show an accepted friendship.",
    declined:"Request declined; no friendship was made.",
    friendsTitle:"Accepted friends",checkFriends:"↻ See friend list",friendsEmpty:"No mutually approved friends yet.",
    remove:"Remove friend",removed:"This friendship was removed from both accounts.",
    footer:"Experimental friend requests · no call/background notification server yet · no ads"
  },
  ar:{
    back:"↩ رجوع",language:"اللغة",title:"طلب الصداقة — طريقة بسيطة بموافقتك",
    explain:"اطلع على بصمة المرسل العامة واختر بنفسك إرسال طلب الصداقة أو قبوله.",
    warning:"خدمة تجريبية: دون خادم نشط لا تصل الطلبات إلى هاتف آخر. التثبيت لا ينشئ الصداقة تلقائياً.",
    inviter:"من أرسل الرابط؟",inviterFP:"بصمة SHA-256 للمرسل",
    inviterUnknown:"لا يتضمن هذا الرابط هوية صديق محدد.",
    inviterKnown:"يحتوي الرابط على بصمة عامة. تحقّق من الشخص المرسل بشكل مستقل.",
    inviterHonesty:"البصمة الرقمية لا تثبت الاسم الحقيقي للشخص.",
    setup:"هويتي الآمنة (تجربة)",setupExplain:"يخزن الهاتف مفتاح توقيع غير قابل للتصدير؛ يُسجّل المفتاح العام فقط.",
    settings:"إعدادات خادم Cloudflare التجريبي",
    endpoint:"عنوان Cloudflare Workers مؤكد يعمل عبر HTTPS",
    secret:"رمز الوصول التجريبي — لا تشاركه برسالة أو رابط",
    consent:"أوافق على تخزين مفتاح توقيع خاص غير قابل للتصدير في هذا الهاتف.",
    register:"✓ إنشاء هويتي وتسجيلها",
    accountWaiting:"لا يوجد حساب نشط دون تأكيد من الخادم.",registered:"✓ أكد الخادم تسجيل هوية SHA-256 العامة لهذا الهاتف.",
    missingConsent:"وافق أولاً على تخزين المفتاح محلياً.",
    missingEndpoint:"أدخل عنوان خادم Cloudflare عبر HTTPS. لا يوجد خادم متصل بعد.",
    missingSecret:"أدخل رمز الوصول التجريبي للتسجيل فقط، ولا تشاركه في الرابط.",
    working:"جارٍ التحقق من الخادم. لا نعلن النجاح قبل وصول رد حقيقي.",
    serverError:"فشل التحقق من الخادم. افحص الشبكة والحدود وصلاحيات Cloudflare.",
    invalidSignature:"رُفض التوقيع الرقمي؛ تحقّق من إعدادات الهوية والأمان.",
    pilotOff:"الخادم التجريبي معطّل؛ لم يصل الطلب.",
    shareTitle:"رابط دعوتي الشخصي",shareExplain:"الرابط يحتوي بصمة SHA-256 العامة فقط، دون كلمة سر أو مفتاح خاص.",
    share:"↗ مشاركة رابط دعوتي",copy:"📋 نسخ رابط الدعوة",
    linkCopied:"✓ تم نسخ رابط الدعوة.",linkShare:"أُغلقت المشاركة؛ لا يمكن إثبات وصول الرابط للمستلم.",
    shareFailed:"المشاركة غير متاحة؛ انسخ الرابط.",
    requestTitle:"طلب الصداقة",requestHelp:"إذا فتحت دعوة صديق فستظهر بصمته أعلاه. إرسال الطلب يتطلب موافقتك.",
    sendRequest:"➕ إرسال طلب صداقة لهذا الشخص",requestWaiting:"لم يُرسل أي طلب بعد.",
    requestSent:"✓ استلم الخادم الطلب. لا تتم الصداقة حتى يوافق الطرف الآخر.",
    requestPending:"طلب سابق قيد الانتظار.",
    requestNotAvailable:"هذه البصمة غير مسجلة على الخادم التجريبي.",
    inboxTitle:"طلبات واردة",checkInbox:"↻ فحص الطلبات",inboxEmpty:"لا توجد طلبات معلقة.",
    accept:"✓ قبول",decline:"✕ رفض",accepted:"✓ أكد الخادم قبول الصداقة على الحسابين.",
    declined:"رُفض الطلب ولم تنشأ الصداقة.",
    friendsTitle:"الأصدقاء المقبولون",checkFriends:"↻ عرض الأصدقاء",friendsEmpty:"لا توجد صداقات متبادلة بعد.",
    remove:"حذف صديق",removed:"حُذفت الصداقة من كلا الحسابين.",
    footer:"طلبات صداقة تجريبية · لا خادم مكالمات أو إشعارات خلفية بعد · بلا إعلانات"
  }
};
const lng=()=>["ur","en","ar"].includes($("language").value)?$("language").value:"ur";
const t=k=>TEXT[lng()][k]||TEXT.ur[k]||k;
const invited=incomingInvite(location.href);
let identity=null,active=false,apiEndpoint="";
function setStatus(id,key){
  const node=$(id);
  node.dataset.status=key;node.textContent=t(key);
}
function refreshUI(){
  document.documentElement.lang=lng();
  document.documentElement.dir=lng()==="en"?"ltr":"rtl";
  for(const node of document.querySelectorAll("[data-l10n]"))
    node.textContent=t(node.dataset.l10n);
  for(const id of ["accountStatus","requestStatus"]){
    const key=$(id).dataset.status;
    if(key)$(id).textContent=t(key);
  }
  $("inviterStatus").textContent=t(invited?"inviterKnown":"inviterUnknown");
  if(active)$("accountStatus").textContent=t("registered");
}
function reveal(){
  const enabled=active&&identity;
  for(const id of ["shareLink","copyLink","checkInbox","checkFriends"])
    $(id).disabled=!enabled;
  $("sendRequest").disabled=!(enabled&&invited&&invited!==identity.account);
  $("ownIdentity").textContent=identity?.account||"—";
  $("incomingFingerprint").textContent=invited||"—";
}
function errorLabel(err){
  const code=String(err?.message||"").slice(0,80);
  if(code==="PILOT_DISABLED")return"pilotOff";
  if(code==="SIGNATURE_INVALID"||code==="BAD_FINGERPRINT")return"invalidSignature";
  if(code==="FRIEND_NOT_REGISTERED")return"requestNotAvailable";
  return"serverError";
}
async function call(type,options={}){
  if(!active||!identity||!apiEndpoint)throw Error("SERVER_NOT_READY");
  return apiRequest(apiEndpoint,identity,type,options);
}
function createItem(fp,label,buttons){
  const card=document.createElement("div");card.className="pilot-friend";
  const monogram=document.createElement("span");monogram.className="friend-letter";monogram.textContent="E";
  const details=document.createElement("div");details.className="pilot-friend-text";
  const name=document.createElement("strong");name.textContent=label;
  const hash=document.createElement("code");hash.textContent=fp;hash.className="hash";
  details.append(name,hash);
  const actions=document.createElement("div");actions.className="pilot-actions";
  for(const [text,fn] of buttons){
    const button=document.createElement("button");
    button.type="button";button.className="outline";
    button.textContent=text;
    button.addEventListener("click",()=>fn(button));
    actions.append(button);
  }
  card.append(monogram,details,actions);
  return card;
}
async function showInbox(){
  const list=$("inbox");list.replaceChildren();
  try{
    const data=await call("inbox");
    if(!data.pending?.length){list.textContent=t("inboxEmpty");return;}
    for(const item of data.pending){
      const from=item.from;
      list.appendChild(createItem(from,t("inviterFP"),[
        [t("accept"),async btn=>{
          btn.disabled=true;
          try{
            const res=await call("respond",{to:from,decision:"accept"});
            if(res.bothLinked===true){setStatus("requestStatus","accepted");await showInbox();}
          }catch(e){setStatus("requestStatus",errorLabel(e));}
          finally{btn.disabled=false;}
        }],
        [t("decline"),async btn=>{
          btn.disabled=true;
          try{
            await call("respond",{to:from,decision:"decline"});
            setStatus("requestStatus","declined");await showInbox();
          }catch(e){setStatus("requestStatus",errorLabel(e));}
          finally{btn.disabled=false;}
        }]
      ]));
    }
  }catch(e){setStatus("requestStatus",errorLabel(e));}
}
async function showFriends(){
  const list=$("friends");list.replaceChildren();
  try{
    const data=await call("friends");
    if(!data.friends?.length){list.textContent=t("friendsEmpty");return;}
    for(const fp of data.friends){
      list.appendChild(createItem(fp,t("inviterFP"),[
        [t("remove"),async btn=>{
          // Removal requires another explicit confirmation; no silent deletion.
          if(!window.confirm(t("remove")+"?"))return;
          btn.disabled=true;
          try{await call("remove",{to:fp});setStatus("requestStatus","removed");await showFriends();}
          catch(e){setStatus("requestStatus",errorLabel(e));}
          finally{btn.disabled=false;}
        }]
      ]));
    }
  }catch(e){setStatus("requestStatus",errorLabel(e));}
}
$("language").addEventListener("change",refreshUI);
$("register").addEventListener("click",async()=>{
  if(!$("agree").checked)return setStatus("accountStatus","missingConsent");
  const endpoint=$("serverUrl").value.trim();
  if(!/^https:\/\/[a-z0-9.-]+\.workers\.dev\/v1\/friends$/i.test(endpoint))
    return setStatus("accountStatus","missingEndpoint");
  const pilotJoinSecret=$("pilotSecret").value;
  if(pilotJoinSecret.length<16)return setStatus("accountStatus","missingSecret");
  $("register").disabled=true;setStatus("accountStatus","working");
  try{
    const next=await createOrLoadIdentity({consent:true});
    const result=await apiRequest(endpoint,next,"register",{pilotJoinSecret});
    if(result?.account!==next.account)throw Error("MISMATCH_SERVER_ACCOUNT");
    identity=next;active=true;apiEndpoint=endpoint;
    $("pilotSecret").value=""; // never persist or share the access code.
    setStatus("accountStatus","registered");
    reveal();
  }catch(e){setStatus("accountStatus",errorLabel(e));}
  finally{$("register").disabled=false;}
});
function link(){
  if(!active || !identity)throw Error("ACCOUNT_NOT_REGISTERED");
  return inviteLink(new URL("./pilot_friends_v0_1.html",location.href).href,identity);
}
$("copyLink").addEventListener("click",async()=>{
  try{
    const url=link();
    await navigator.clipboard.writeText(url);
    $("shareStatus").textContent=t("linkCopied");
  }catch(_){$("shareStatus").textContent=t("shareFailed");}
});
$("shareLink").addEventListener("click",()=>{
  const url=link();
  if(!navigator.share){$("shareStatus").textContent=t("shareFailed");return;}
  navigator.share({title:"E-ZERO Secure Connect",url,text:t("shareTitle")})
    .then(()=>$("shareStatus").textContent=t("linkShare"))
    .catch(()=>$("shareStatus").textContent=t("linkShare"));
});
$("sendRequest").addEventListener("click",async()=>{
  if(!invited||!active||invited===identity.account)return;
  $("sendRequest").disabled=true;setStatus("requestStatus","working");
  try{
    const res=await call("request",{to:invited});
    setStatus("requestStatus",res.code==="REQUEST_SENT"?"requestSent":
      res.code==="REQUEST_ALREADY_PENDING"?"requestPending":
      res.code==="ALREADY_FRIENDS"?"accepted":"requestPending");
  }catch(e){setStatus("requestStatus",errorLabel(e));}
  finally{$("sendRequest").disabled=false;}
});
$("checkInbox").addEventListener("click",showInbox);
$("checkFriends").addEventListener("click",showFriends);
reveal();refreshUI();
