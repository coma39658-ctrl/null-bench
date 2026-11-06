/* E-ZERO contact-first calling | isolated preview.
 * The saved-friend selection controls only previously verified local contacts.
 * Existing signed WebRTC, QR, permissions and trusted inbox remain authoritative.
 * No camera/mic access, persistence, polling or network on selection.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const root=$("ezeroContactFirstDock");
const featureGrid=document.querySelector("#ezeroUnifiedCard .modern-feature-grid");
if(!root||!featureGrid)return;
const KEY="ezero_secure_connect_staging_fingerprints_v0_1";
const FP=/^[a-f0-9]{64}$/;
const copy={
  ur:{head:"👥 دوست منتخب کریں",hint:"پہلے دوست منتخب کریں، پھر اسی دوست کو آڈیو یا ویڈیو کال کریں۔",
    select:"دوستوں کی فہرست",hide:"فہرست بند کریں",search:"دوست تلاش کریں",
    empty:"ابھی کوئی دوست محفوظ نہیں۔ پہلی محفوظ کال کے لیے QR استعمال کریں۔",
    qr:"＋ نئے دوست کو QR سے ملائیں",unnamed:"دوست منتخب نہیں",saved:"محفوظ شناخت · آن لائن ہونے کی تصدیق نہیں",
    audio:"📞 آڈیو کال",video:"📹 ویڈیو کال",receive:"🔔 کال وصول کرنا فعال کریں",
    selected:"منتخب دوست",pick:"پہلے فہرست سے دوست منتخب کریں۔",
    pending:"درخواست شروع ہو گئی؛ دوسرا فون قبول کرے گا تو رابطہ بنے گا۔",
    busy:"پچھلی کال یا درخواست ختم کریں۔",
    noService:"محفوظ دوستوں کی کال سروس دستیاب نہیں؛ QR استعمال کریں۔"},
  en:{head:"👥 Choose a friend",hint:"Select a friend first; then call that friend by audio or video.",
    select:"Friends list",hide:"Close list",search:"Search friends",
    empty:"No saved friends yet. Pair the first friend using QR.",
    qr:"＋ Add a friend via QR",unnamed:"No friend selected",saved:"Saved device ID · not verified online",
    audio:"📞 Audio call",video:"📹 Video call",receive:"🔔 Enable incoming calls",
    selected:"Selected friend",pick:"Choose a friend from the list first.",
    pending:"Calling request started; your friend still needs to accept.",
    busy:"Finish the existing call or request first.",
    noService:"Saved-friend service unavailable; use QR instead."},
  ar:{head:"👥 اختر صديقًا",hint:"اختر صديقًا أولاً، ثم اضغط الاتصال الصوتي أو المرئي بجواره.",
    select:"قائمة الأصدقاء",hide:"إغلاق القائمة",search:"ابحث عن صديق",
    empty:"لا يوجد أصدقاء محفوظون. استخدم QR للاتصال الأول.",
    qr:"＋ إضافة صديق عبر QR",unnamed:"لم تختر صديقًا",saved:"هوية جهاز محفوظة · حالة الاتصال غير مؤكدة",
    audio:"📞 اتصال صوتي",video:"📹 مكالمة فيديو",receive:"🔔 تفعيل استقبال المكالمات",
    selected:"الصديق المختار",pick:"اختر صديقًا من القائمة أولاً.",
    pending:"بدأ طلب المكالمة؛ يلزم قبول الطرف الآخر.",
    busy:"أنهِ المكالمة أو الطلب الجاري أولاً.",
    noService:"خدمة الأصدقاء غير متاحة؛ استخدم QR."}
};
const tr=k=>(copy[document.documentElement.lang]||copy.ur)[k];
function contacts(){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY)||"[]");
    if(!Array.isArray(saved))return[];
    const seen=new Set();
    return saved.slice(0,50).filter(x=>{
      if(!x||!FP.test(x.fp)||typeof x.name!=="string"||
         !x.name.trim()||x.name.length>40||seen.has(x.fp))return false;
      seen.add(x.fp);return true;
    }).map(x=>({fp:x.fp,name:x.name.trim()}));
  }catch(_){return[];}
}
let selected=null,open=false;
const el=(tag,id,cls)=>{
  const node=document.createElement(tag);
  if(id)node.id=id;if(cls)node.className=cls;
  return node;
};
const bar=el("div",null,"ezero-contact-first-bar");
const heading=el("strong","ezeroContactFirstHeading");
const toggle=el("button","ezeroFriendListToggle");
toggle.type="button";toggle.setAttribute("aria-controls","ezeroFriendSidePanel");
toggle.setAttribute("aria-expanded","false");
bar.append(heading,toggle);
const selectedCard=el("div","ezeroSelectedFriendCard","ezero-selected-friend-card");
selectedCard.setAttribute("aria-live","polite");
const initial=el("span","ezeroSelectedFriendInitial","ezero-friend-monogram");
const identity=el("div",null,"ezero-selected-friend-info");
const selectedName=el("strong","ezeroSelectedFriendName");
const selectedNote=el("small","ezeroSelectedFriendNote");
identity.append(selectedName,selectedNote);
selectedCard.append(initial,identity);
const actions=el("div","ezeroContactCallActions","ezero-contact-call-actions");
const audio=el("button","ezeroContactAudio"),video=el("button","ezeroContactVideo");
audio.type=video.type="button";
audio.dataset.contactCall="audio";video.dataset.contactCall="video";
actions.append(audio,video);
const notice=el("p","ezeroContactFirstStatus","ezero-contact-first-status");
notice.setAttribute("role","status");notice.setAttribute("aria-live","polite");
const backdrop=el("button","ezeroFriendBackdrop","ezero-friend-backdrop");
backdrop.type="button";backdrop.hidden=true;backdrop.setAttribute("aria-label","Close friends list");
const side=el("aside","ezeroFriendSidePanel","ezero-friend-side-panel");
side.setAttribute("aria-label","Saved friends");
side.hidden=true;
const sideHead=el("div",null,"ezero-friend-side-heading");
const sideTitle=el("strong","ezeroFriendSideTitle");
const close=el("button","ezeroFriendSideClose");
close.type="button";
sideHead.append(sideTitle,close);
const search=el("input","ezeroFriendSideSearch");
search.type="search";search.maxLength=40;search.autocomplete="off";
const list=el("div","ezeroFriendSideList","ezero-friend-side-list");
list.setAttribute("role","listbox");list.setAttribute("aria-label","Saved friends");
const receive=el("button","ezeroFriendEnableIncoming");
receive.type="button";
const qr=el("button","ezeroFriendNewQr");
qr.type="button";
side.append(sideHead,search,list,receive,qr);
root.append(bar,selectedCard,actions,notice,backdrop,side);
function message(key){notice.textContent=tr(key);}
function showSide(yes){
  open=Boolean(yes);side.hidden=!open;backdrop.hidden=!open;
  toggle.setAttribute("aria-expanded",String(open));
  if(open)search.focus();
}
toggle.addEventListener("click",()=>showSide(!open));
close.addEventListener("click",()=>showSide(false));
backdrop.addEventListener("click",()=>showSide(false));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&open)showSide(false);});
const pickFriend=fp=>{
  const person=contacts().find(x=>x.fp===fp);
  if(!person)return;
  selected=fp;message("");paint();showSide(false);
};
function paint(){
  const people=contacts();
  if(selected&&!people.some(x=>x.fp===selected))selected=null;
  const person=people.find(x=>x.fp===selected);
  heading.textContent=tr("head");toggle.textContent=tr("select");
  sideTitle.textContent=tr("select");close.textContent="✕";
  search.placeholder=tr("search");
  initial.textContent=person?.name.charAt(0).toLocaleUpperCase()||"?";
  selectedName.textContent=person?.name||tr("unnamed");
  selectedNote.textContent=person?tr("saved"):tr("hint");
  audio.textContent=tr("audio");video.textContent=tr("video");
  receive.textContent=tr("receive");qr.textContent=tr("qr");
  audio.disabled=video.disabled=!person;
  toggle.setAttribute("aria-label",tr("select"));
  const query=search.value.trim().toLocaleLowerCase();
  const found=people.filter(x=>x.name.toLocaleLowerCase().includes(query));
  list.replaceChildren();
  if(!found.length){
    const p=el("p");p.className="ezero-contact-empty";
    p.textContent=people.length?tr("pick"):tr("empty");list.append(p);
  }
  for(const friend of found){
    const button=el("button",null,"ezero-friend-option");
    button.type="button";button.setAttribute("role","option");
    button.setAttribute("aria-selected",String(friend.fp===selected));
    button.dataset.friendFp=friend.fp;
    const avatar=el("span",null,"ezero-friend-monogram");
    avatar.textContent=friend.name.charAt(0).toLocaleUpperCase();
    const name=el("span");name.textContent=friend.name;
    button.append(avatar,name);button.addEventListener("click",()=>pickFriend(friend.fp));
    list.append(button);
  }
}
function contactCall(kind){
  if(!selected)return message("pick");
  const api=window.EZERO_TRUSTED_SAVED_CALL;
  if(!api?.prepare)return message("noService");
  // This explicit click is the sole trigger; the original call button
  // starts authenticated signaling and requests camera/mic as appropriate.
  if(!api.prepare(selected,kind))return message("busy");
  message("pending");showSide(false);
  const feature=featureGrid.querySelector('[data-modern-select="'+kind+'"]');
  if(feature)feature.click();
}
audio.addEventListener("click",()=>contactCall("audio"));
video.addEventListener("click",()=>contactCall("video"));
search.addEventListener("input",paint);
receive.addEventListener("click",()=>{
  showSide(false);
  const enable=$("ezeroTrustedEnable");
  if(enable)enable.click();
  else message("noService");
});
qr.addEventListener("click",()=>{
  showSide(false);selected=null;paint();
  // This is a safe fallback for first-time friends; scanning still
  // requires the other phone's QR and explicit permission.
  $("ezeroOneJoinPanel")?.scrollIntoView({block:"start",behavior:"auto"});
  $("ezeroOneScanInvite")?.focus();
});
// A top Audio/Video tile is routed to the SELECTED saved friend.
// With saved friends but no selection, show the list instead of
// inadvertently calling an arbitrary contact or starting a QR room.
// With NO saved friends retain the original first-QR workflow.
featureGrid.addEventListener("click",e=>{
  const target=e.target.closest?.('[data-modern-select="audio"],[data-modern-select="video"]');
  if(!target||!featureGrid.contains(target))return;
  const api=window.EZERO_TRUSTED_SAVED_CALL;
  if(api?.isPending?.())return; // already prepared by nearby contact button
  if(!contacts().length)return; // first QR pairing still works
  if(!selected){
    e.preventDefault();e.stopImmediatePropagation();message("pick");showSide(true);return;
  }
  if(!api?.prepare?.(selected,target.dataset.modernSelect)){
    e.preventDefault();e.stopImmediatePropagation();message(api?"busy":"noService");return;
  }
  message("pending");
},true);
document.addEventListener("ezero:friend-local-saved",()=>{paint();});
window.addEventListener("storage",e=>{if(e.key===KEY)paint();});
$("language")?.addEventListener("change",paint);
document.addEventListener("ezero:call-status",e=>{
  if(["idle","micDenied","iceNoRoute","signalInvalid","fingerprintMismatch"].includes(e.detail?.stage))
    message("");
});
paint();
})();
