/* E-ZERO consent-first forwarding UI: opt-in STAGING, no call-engine change.
 * Stable, signed public contact cards are DISTINCT from one-time call QR.
 * Contacts imported here are NOT added to the trusted-friends roster.
 * Owner may share public name/identity for 24h, with an explicit checkbox.
 * A real inbound stranger request requires a separately approved server.
 */
(()=>{"use strict";
if(new URLSearchParams(location.search).get("contactStage")!=="1"&&
   !location.hash.startsWith("#contact="))return;
const protocol=window.EZERO_CONTACT_REFERRAL, dock=document.getElementById("ezeroContactFirstDock");
if(!protocol||!dock||!window.crypto?.subtle)return;
const $=id=>document.getElementById(id);
const STORE="ezero_signed_forwarded_public_contacts_stage_v0_1";
const FP=/^[a-f0-9]{64}$/;
const language=()=>["ur","en","ar"].includes(document.documentElement.lang)?
  document.documentElement.lang:"ur";
const copy={
  ur:{heading:"↗ رابطہ شیئر کریں — آزمائشی فیچر",own:"میرا قابلِ شیئر رابطہ بنائیں",
    allow:"میں اپنی عوامی شناخت اور نام کا یہ دستخط شدہ لنک اگلے 24 گھنٹے دوسروں کو آگے بھیجنے کی اجازت دیتا ہوں۔",
    shareOwn:"↗ میرا رابطہ بھیجیں",forward:"↗ منتخب دوست کا رابطہ آگے بھیجیں",
    pending:"نیا رابطہ ملا ہے",save:"✓ رابطہ بطور انتظار محفوظ کریں",shareOther:"↗ یہ رابطہ آگے بھیجیں",
    intro:"درخواست قبول ہونے سے پہلے کسی نئے شخص کو کال یا نجی رابطے تک رسائی نہیں ملتی۔",
    onlyOwner:"ابھی منتخب دوست کا دستخط شدہ، آگے شیئر کرنے کی اجازت والا رابطہ موجود نہیں۔ پہلے اسی دوست سے اپنا قابلِ شیئر لنک منگوائیں۔",
    notFriend:"پہلے فہرست سے دوست منتخب کریں۔",
    consent:"اپنا رابطہ بنانے کے لیے واضح اجازت ضروری ہے۔",
    noProfile:"پہلے اپنا نام اور پروفائل محفوظ کریں۔ مستقل دستخطی چابی بھی ضروری ہے۔",
    made:"✓ مالک کے دستخط والا محدود رابطہ تیار ہے۔ 24 گھنٹے بعد ختم ہوگا۔",
    invalid:"رابطہ لنک غلط، بدلا ہوا، دوسری ویب سائٹ کا یا ختم شدہ ہے۔ اس سے کوئی دوست یا کال شامل نہیں ہوئی۔",
    verified:"✓ مالک کی ڈیوائس کے دستخط درست ہیں۔ یہ حقیقی انسانی شناخت کا ثبوت نہیں۔",
    saved:"✓ رابطہ الگ فہرست میں محفوظ ہے؛ قابلِ اعتماد دوست یا کال کی اجازت نہیں بنا۔",
    copied:"✓ لنک کاپی ہوگیا۔",shareDone:"شیئرنگ ونڈو مکمل ہوئی؛ وصولی کی تصدیق نہیں۔",
    cancelled:"شیئرنگ منسوخ ہوئی۔",fallback:"شیئرنگ دستیاب نہیں؛ لنک کاپی کریں۔",
    expired:"رابطہ لنک ختم ہو چکا ہے؛ مالک سے نیا لنک منگوائیں۔",
    server:"نئے شخص کو براہ راست رابطہ درخواست بھیجنے کی سروس ابھی آزمائشی ہے؛ مالک کی منظوری کے بغیر کال نہیں ہوگی۔",
    label:"صاحبِ رابطہ کا بتایا ہوا نام",expires:"لنک کی آخری مدت",noFriend:"اس دوست کا قابلِ شیئر رابطہ موجود نہیں۔",
    setup:"یہ حقیقی فون نمبر یا کال QR نہیں، صرف دستخط شدہ شناخت کا رابطہ کارڈ ہے۔",
    storage:"اس براؤزر میں رابطہ محفوظ نہ ہو سکا۔",missing:"رابطہ منتخب نہیں۔",
    pendingList:"محفوظ عوامی رابطے (غیر منظور شدہ)", none:"ابھی کوئی عوامی رابطہ نہیں۔"},
  en:{heading:"↗ Share a contact — test feature",own:"Create my forwardable contact link",
    allow:"I consent to forward my public name and signed identity link for the next 24 hours.",
    shareOwn:"↗ Share my contact",forward:"↗ Forward selected friend's contact",
    pending:"New contact received",save:"✓ Save as pending contact",shareOther:"↗ Forward this contact",
    intro:"Receiving a link never grants a call or private access without the person's approval.",
    onlyOwner:"No owner-signed, forwardable card for this friend. Ask them for their own contact link first.",
    notFriend:"Select a friend from the list first.",consent:"Explicit consent is required.",
    noProfile:"Save your name and profile first. Your persistent signing key is also required.",
    made:"✓ Owner-signed contact ready; expires in 24 hours.",
    invalid:"Invalid, edited, cross-origin or expired contact link. No friend or call was authorized.",
    verified:"✓ Device signature verified. This does not prove the human's identity.",
    saved:"✓ Saved separately as a pending public contact, not a trusted friend or calling permission.",
    copied:"✓ Link copied.",shareDone:"Share sheet completed; delivery is not confirmed.",
    cancelled:"Sharing cancelled.",fallback:"Native sharing unavailable; copy the link.",
    expired:"Contact has expired; request a new link from its owner.",
    server:"Direct requests from new people need a separate opt-in inbox service; calls still require owner's approval.",
    label:"Self-declared contact name",expires:"Expiry",noFriend:"This friend has no forwardable contact card.",
    setup:"This is neither a phone number nor a call QR, just a signed public contact card.",
    storage:"Could not save a contact in this browser.",missing:"No contact selected.",
    pendingList:"Public contact cards (not trusted)",none:"No public contact cards yet."},
  ar:{heading:"↗ مشاركة جهة اتصال — تجريبي",own:"إنشاء رابط جهة الاتصال الخاص بي",
    allow:"أوافق على إعادة توجيه اسمي العام ورابط هويتي الموقع لمدة 24 ساعة.",
    shareOwn:"↗ مشاركة رابط جهتي",forward:"↗ إعادة توجيه جهة اتصال الصديق المحدد",
    pending:"جهة اتصال واردة",save:"✓ حفظ كجهة انتظار",shareOther:"↗ إعادة توجيه هذا الرابط",
    intro:"الرابط وحده لا يتيح المكالمة أو البيانات الخاصة دون موافقة صاحب الهوية.",
    onlyOwner:"لا يتوفر رابط موقع قابل للتوجيه لهذا الصديق. اطلب منه رابط جهته أولاً.",
    notFriend:"اختر صديقاً أولاً.",consent:"الموافقة الصريحة مطلوبة.",
    noProfile:"احفظ الاسم والملف الشخصي والمفتاح الدائم أولاً.",
    made:"✓ الرابط الموقع صالح لمدة 24 ساعة.",invalid:"الرابط غير صحيح أو معدل أو منتهي. لم تنشأ صداقة أو مكالمة.",
    verified:"✓ توقيع الجهاز صحيح؛ لا يؤكد هوية الإنسان.",saved:"✓ حُفظ كجهة انتظار، وليس صديقاً موثوقاً.",
    copied:"✓ نُسخ الرابط.",shareDone:"اكتملت نافذة المشاركة دون تأكيد الاستلام.",
    cancelled:"أُلغيت المشاركة.",fallback:"المشاركة غير متاحة؛ انسخ الرابط.",
    expired:"انتهت صلاحية الرابط. اطلب رابطاً جديداً.",server:"طلب الاتصال المباشر يتطلب صندوق استقبال اختياري منفصل وموافقة المالك.",
    label:"اسم صاحب الحساب الذي صرح به",expires:"انتهاء الصلاحية",noFriend:"ليس لهذا الصديق رابط قابل للتوجيه.",
    setup:"ليس رقم هاتف أو رمز مكالمة، بل بطاقة هوية عامة موقعة.",
    storage:"تعذر حفظ الرابط محلياً.",missing:"لم تُحدد جهة اتصال.",
    pendingList:"جهات عامة في انتظار الموافقة",none:"لا توجد جهات عامة بعد."}
};
const t=k=>(copy[language()]||copy.ur)[k]||k;
const el=(tag,id,cls)=>{const x=document.createElement(tag);if(id)x.id=id;if(cls)x.className=cls;return x;};
const root=el("section","ezeroForwardContactStage","ezero-forward-contact");
root.setAttribute("aria-label","E-ZERO signed contact forwarding pilot");
const heading=el("h3");heading.dataset.forwardKey="heading";
const note=el("p");note.dataset.forwardKey="setup";
const allowed=el("label",null,"ezero-forward-consent");
const check=el("input","ezeroForwardConsent");check.type="checkbox";check.checked=false;
const consentText=el("span");consentText.dataset.forwardKey="allow";
allowed.append(check,consentText);
const createBtn=el("button","ezeroForwardCreate");createBtn.type="button";createBtn.dataset.forwardKey="own";
const shareMine=el("button","ezeroForwardShareMine");shareMine.type="button";
shareMine.dataset.forwardKey="shareOwn";shareMine.disabled=true;
const forwardBtn=el("button","ezeroForwardFriend");forwardBtn.type="button";forwardBtn.dataset.forwardKey="forward";
const status=el("p","ezeroForwardStatus");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
const incoming=el("div","ezeroForwardIncoming","ezero-forward-incoming");incoming.hidden=true;
const incomingTitle=el("strong");incomingTitle.dataset.forwardKey="pending";
const incomingName=el("strong","ezeroForwardIncomingName");
const incomingFp=el("code","ezeroForwardIncomingFp");
const verified=el("p");verified.dataset.forwardKey="verified";
const incomingExpiry=el("small","ezeroForwardIncomingExpiry");
const save=el("button","ezeroForwardSave");save.type="button";save.dataset.forwardKey="save";
const shareReceived=el("button","ezeroForwardShareReceived");shareReceived.type="button";shareReceived.dataset.forwardKey="shareOther";
incoming.append(incomingTitle,incomingName,incomingFp,verified,incomingExpiry,save,shareReceived);
const listTitle=el("strong");listTitle.dataset.forwardKey="pendingList";
const list=el("div","ezeroForwardSavedList","ezero-forward-list");
const footer=el("p");footer.dataset.forwardKey="intro";
const state=el("div",null,"ezero-forward-controls");
state.append(createBtn,shareMine,forwardBtn);
root.append(heading,note,allowed,state,status,incoming,listTitle,list,footer);
dock.append(root);
let own=null,viewed=null,known=new Map(),inFlight=false;
function statusText(key){status.textContent=t(key);}
function plainUrl(){return new URL("./ezero_trusted_friends_staging_20261106.html",location.href).href.split("#")[0].split("?")[0];}
function selectedFriendFp(){
  const selected=$("ezeroFriendSideList")?.querySelector('[data-friend-fp][aria-selected="true"]');
  return selected?.dataset.friendFp||"";
}
function safeStored(){
  try{const raw=JSON.parse(localStorage.getItem(STORE)||"[]");
    return Array.isArray(raw)?raw.slice(0,30).filter(x=>typeof x==="string"&&x.length<2500):[];
  }catch(_){return [];}
}
function paintList(){
 list.replaceChildren();
 for(const item of known.values()){
   const row=el("div",null,"ezero-forward-list-row");
   const n=el("span");n.textContent=item.name+" · "+item.fp.slice(0,8)+"…";
   const b=el("button");b.type="button";b.dataset.shareFp=item.fp;
   b.textContent=t("shareOther");
   b.addEventListener("click",()=>share(item));
   row.append(n,b);list.append(row);
 }
 if(!known.size){const n=el("p");n.textContent=t("none");list.append(n);}
}
async function loadStored(){
  const keys=safeStored();
  known.clear();
  for(const link of keys){
    try{const item=await protocol.verify(link,{expectedOrigin:location.origin});
      if(!window.EZERO_FRIEND_ACCESS?.isBlocked?.(item.fp))known.set(item.fp,item);
    }catch(_){}
  }
  paintList();
}
async function persist(item){
  const links=[item.url,...Array.from(known.values()).filter(x=>x.fp!==item.fp).map(x=>x.url)].slice(0,30);
  try{localStorage.setItem(STORE,JSON.stringify(links));known.set(item.fp,item);
    paintList();statusText("saved");return true;
  }catch(_){statusText("storage");return false;}
}
async function copyLink(link){
  try{
    if(!navigator.clipboard?.writeText)throw Error("CLIPBOARD_UNAVAILABLE");
    await navigator.clipboard.writeText(link);statusText("copied");
  }catch(_){statusText("fallback");}
}
function share(item){
 if(!item||item.expires<=Date.now())return statusText("expired");
 if(window.EZERO_FRIEND_ACCESS?.isBlocked?.(item.fp)===true)return statusText("missing");
 // The Web Share API is called directly from this click to retain user activation.
 if(typeof navigator.share==="function"){
   try{
     navigator.share({title:"E-ZERO Secure App Contact",text:item.name,url:item.url})
       .then(()=>statusText("shareDone")).catch(e=>statusText(e?.name==="AbortError"?"cancelled":"fallback"));
   }catch(_){statusText("fallback");}
 } else void copyLink(item.url);
}
async function createOwn(){
 if(inFlight)return;
 if(!check.checked)return statusText("consent");
 const store=window.EZERO_DEVICE_IDENTITY_STORE;
 let profile;
 try{profile=JSON.parse(localStorage.getItem("ezero_secure_connect_staging_local_profile_v0_1")||"null");}catch(_){}
 if(!profile?.share||typeof profile.name!=="string"||!profile.name.trim()||
    !store?.read)return statusText("noProfile");
 inFlight=true;createBtn.disabled=true;
 try{
   const identity=await store.read();
   if(!identity)throw Error("NO_PERSISTED_KEY");
   const result=await protocol.create({identity,name:profile.name,
     baseUrl:plainUrl(),consent:check.checked});
   own=await protocol.verify(result.url,{expectedOrigin:location.origin});
   shareMine.disabled=false;statusText("made");
 }catch(_){statusText("noProfile");}finally{inFlight=false;createBtn.disabled=false;}
}
function showIncoming(item){
 viewed=item;
 incoming.hidden=false;incomingName.textContent=item.name;
 incomingFp.textContent=item.fp.slice(0,16)+"…"+item.fp.slice(-8);
 incomingExpiry.textContent=t("expires")+": "+new Date(item.expires).toLocaleString(language());
 statusText("verified");
}
async function onReferral(){
 if(!location.hash.startsWith("#contact="))return;
 try{
   const link=plainUrl()+location.hash;
   const item=await protocol.verify(link,{expectedOrigin:location.origin});
   if(window.EZERO_FRIEND_ACCESS?.isBlocked?.(item.fp)===true)throw Error("BLOCKED");
   showIncoming(item);
 }catch(_){viewed=null;incoming.hidden=true;statusText("invalid");}
}
function repaint(){
 for(const n of root.querySelectorAll("[data-forward-key]"))
   n.textContent=t(n.dataset.forwardKey);
 if(viewed)incomingExpiry.textContent=t("expires")+": "+new Date(viewed.expires).toLocaleString(language());
 paintList();
}
createBtn.addEventListener("click",()=>void createOwn());
shareMine.addEventListener("click",()=>share(own));
forwardBtn.addEventListener("click",()=>{
 const fp=selectedFriendFp();
 if(!FP.test(fp))return statusText("notFriend");
 const item=known.get(fp);
 if(!item)return statusText("onlyOwner");
 share(item);
});
save.addEventListener("click",()=>{if(viewed)void persist(viewed);else statusText("missing");});
shareReceived.addEventListener("click",()=>share(viewed));
$("language")?.addEventListener("change",repaint);
document.addEventListener("ezero:friend-access-updated",()=>void loadStored());
repaint();void loadStored();void onReferral();
})();