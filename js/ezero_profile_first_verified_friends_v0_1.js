/* E-ZERO profile-first, durable friend recognition.
 * A profile Save is an explicit consent to store this browser's non-exportable
 * P-256 private key. No camera, microphone, contacts upload, network call
 * or invitation is triggered on page load.
 * QR/SDP and existing signed peer verification are NEVER bypassed.
 */
(()=>{"use strict";
const $=id=>document.getElementById(id);
const dock=$("ezeroContactFirstDock");
if(!dock||!window.EZERO_DEVICE_IDENTITY_STORE)return;
const PROFILE="ezero_secure_connect_staging_local_profile_v0_1";
const FRIENDS="ezero_secure_connect_staging_fingerprints_v0_1";
// A fresh link from the caller is a friend request; Accept on the
// recipient phone makes consent mutual. No second approval button.
const LINK_ACCEPT_MAX_MS=10*60*1000;
const FP=/^[a-f0-9]{64}$/;
const PHOTO=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const words={
 ur:{heading:"🔐 میری مستقل E-ZERO شناخت",instruction:"پہلی دوستی سے پہلے اپنا نام اور ڈی پی تصویر ضرور لگائیں، پروفائل شیئر کرنے کی اجازت دیں اور محفوظ کریں۔ تب دونوں طرف دوست کی پہچان رہے گی۔",
  ready:"✓ نام، شیئرنگ اجازت اور مستقل شناخت تیار ہیں۔ دوست کو دعوت دیں۔",
  missing:"⚠️ نام لکھیں، ڈی پی تصویر لگائیں، شیئرنگ کی اجازت منتخب کریں، پھر پروفائل محفوظ کریں۔",
  failed:"اس براؤزر میں مستقل شناخت محفوظ نہیں ہوئی۔ فون کی اسٹوریج یا نجی براؤزنگ چیک کریں۔",
  open:"👤 نام لکھیں اور ڈی پی لگائیں",autosave:"دعوت بھیجنا فرینڈ ریکویسٹ ہے؛ دوسرا قبول کرے تو تصدیق شدہ رابطے کے بعد دونوں کے فونوں میں دوست محفوظ ہوگا۔",
  id:"میری SHA-256 ڈیجیٹل آئی ڈی",friendSaved:"✓ تصدیق شدہ رابطے کے بعد دوست اسی فون میں محفوظ ہوگیا۔",
  friendError:"اس فون میں دوست محفوظ نہیں ہو سکا؛ براؤزر کی اسٹوریج چیک کریں۔"},
 en:{heading:"🔐 My lasting E-ZERO identity",instruction:"Before pairing, add your name and display photo, allow sharing, and save. This identifies you in friends lists.",
  ready:"✓ Your saved digital identity and name are ready. Select a friend to call.",
  missing:"⚠️ Add a name and profile photo, permit sharing, then Save before calling.",
  failed:"Persistent identity unavailable. Check private mode and browser storage.",
  open:"👤 Complete name and photo",autosave:"Sending an invite requests friendship; when the recipient accepts, a verified connection saves the friend on each phone.",
  id:"My SHA-256 digital ID",friendSaved:"✓ Verified friend saved locally on this phone.",
  friendError:"Could not save friend on this phone. Check browser storage."},
 ar:{heading:"🔐 هويتي الدائمة في E-ZERO",instruction:"قبل إضافة صديق اكتب اسمك واختر صورتك الشخصية ووافق على مشاركتها ثم احفظ ملفك.",
  ready:"✓ تم حفظ الاسم والهوية الرقمية. اختر صديقًا للاتصال.",
  missing:"⚠️ اكتب اسمك، أضف الصورة الشخصية ووافق على المشاركة ثم احفظ.",
  failed:"تعذر حفظ الهوية. تحقق من تخزين المتصفح أو وضع التصفح الخاص.",
  open:"👤 أكمل الاسم والصورة",autosave:"إرسال رابط الدعوة طلب صداقة؛ بقبول الطرف الآخر والاتصال المتحقق تُحفظ الصداقة في الجهازين.",
  id:"معرفي الرقمي SHA-256",friendSaved:"✓ حُفظ الصديق المتحقق منه على هذا الجهاز.",
  friendError:"تعذر حفظ الصديق على هذا الهاتف؛ تحقق من التخزين."}
};
const t=k=>(words[document.documentElement.lang]||words.ur)[k];
const node=(tag,id)=>{const n=document.createElement(tag);if(id)n.id=id;return n;};
const box=node("section","ezeroProfileFirstGate");
box.setAttribute("aria-label","E-ZERO profile prerequisite");
box.className="ezero-profile-first-gate";
const h=node("strong","ezeroProfileFirstTitle");
const help=node("p","ezeroProfileFirstHelp");
const id=node("small","ezeroProfileFirstFingerprint");
const open=node("button","ezeroProfileFirstOpen");open.type="button";
const legend=node("p","ezeroAutoSaveFriendLegend");
const reminder=node("div","ezeroProfileMissingReminder");
reminder.setAttribute("role","status");
reminder.setAttribute("aria-live","polite");
const status=node("p","ezeroProfileFirstStatus");
status.setAttribute("role","status");status.setAttribute("aria-live","polite");
const friendStatus=node("p","ezeroFriendAutoSaveStatus");
friendStatus.setAttribute("role","status");friendStatus.setAttribute("aria-live","polite");
box.append(h,help,reminder,id,open,legend,status,friendStatus);
dock.prepend(box);
let ready=false,verifiedKey=null,checking=false,lastAutoPeer="",pairIntent=null,
    proofFingerprint=null;
const cleanName=v=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,40):"";
const userProfile=()=>{
 try{const p=JSON.parse(localStorage.getItem(PROFILE)||"null");
   return p&&cleanName(p.name)?p:null;
 }catch(_){return null;}
};
const pairApproved=()=>ready&&pairIntent&&
  Date.now()-pairIntent.at>=0&&Date.now()-pairIntent.at<LINK_ACCEPT_MAX_MS;
function paint(){
 h.textContent=t("heading");help.textContent=t("instruction");
 open.textContent=t("open");legend.textContent=t("autosave");
 const short=verifiedKey||$("myFingerprint")?.textContent?.trim();
 id.textContent=t("id")+": "+(FP.test(short||"")?
   short.slice(0,12)+"…"+short.slice(-8):"—");
 status.textContent=ready?t("ready"):t("missing");
 reminder.hidden=ready;
 reminder.textContent=ready?"":t("missing");
 status.dataset.state=ready?"ready":"needs-profile";
 // No extra approval. Sending an invite and accepting it are the
 // visible actions that authorize a mutual contact after verification.
}
async function verifyProfile(){
 if(checking)return ready;
 checking=true;
 try{
   const profile=userProfile();
   const key=await window.EZERO_DEVICE_IDENTITY_STORE.read();
   const displayed=$("myFingerprint")?.textContent?.trim();
   ready=!!profile&&profile.share===true&&typeof profile.avatar==="string"&&
     profile.avatar.length>100&&profile.avatar.length<=12000&&PHOTO.test(profile.avatar)&&
     !!key&&FP.test(key.fingerprint)&&
     displayed===key.fingerprint;
   verifiedKey=ready?key.fingerprint:null;
   paint();
   return ready;
 }catch(_){
   ready=false;verifiedKey=null;paint();status.textContent=t("failed");return false;
 }finally{checking=false;}
}
function showProfile(){
 const editor=$("ezeroProfileEditor");
 editor?.closest(".ezero-unified-options")?.setAttribute("open","");
 if(editor)editor.open=true;
 editor?.scrollIntoView?.({block:"start",behavior:"auto"});
 const name=$("ezeroMyName");
 if(!name?.value?.trim())name?.focus?.({preventScroll:true});
}
open.addEventListener("click",showProfile);
document.addEventListener("ezero:profile-local-saved",()=>{void verifyProfile();});
// Keep the request visible after scanning until the user saves a name and DP.
document.addEventListener("ezero:auto-incoming-open",()=>{
 if(!ready){paint();reminder.hidden=false;}
});
// A deliberate signed call invitation constitutes the sender's request.
document.addEventListener("ezero:call-intent",e=>{
 if(e.detail?.direction==="outgoing"&&
   ["audio","video"].includes(e.detail?.kind))
   {pairIntent={role:"sender",at:Date.now()};proofFingerprint=null;}
});
// The receiver must physically Accept the invitation. Opening a link alone
// cannot add anyone. Signing and peer fingerprint verification remain required.
document.addEventListener("click",e=>{
 const button=e.target?.closest?.("button");
 if(button?.id==="ezeroAutoAccept"&&
    $("ezeroAutoIncoming")?.hidden===false&&
    /^#room=[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(location.hash))
   {pairIntent={role:"recipient",at:Date.now()};proofFingerprint=null;}
},true);
// Call setup must never silently proceed under an ephemeral identity.
// Allow opening a friend drawer, reading a QR and editing a profile without
// restriction. Only real call/connect/accept/owner-inbox actions are gated.
const gated=new Set(["ezeroContactAudio","ezeroContactVideo",
 "ezeroFreshQrAudio","ezeroFreshQrVideo","ezeroAutoStart",
 "ezeroAutoAccept","ezeroTrustedEnable"]);
document.addEventListener("click",e=>{
 const clicked=e.target?.closest?.("button");
 if(!clicked)return;
 const startsCall=gated.has(clicked.id)||
   (clicked.dataset?.modernSelect==="audio"||
    clicked.dataset?.modernSelect==="video");
 if(!startsCall||ready)return;
 e.preventDefault();e.stopImmediatePropagation();
 status.textContent=t("missing");
 reminder.hidden=false;reminder.textContent=t("missing");
 showProfile();
},true);
// When profile changes in a separate tab, re-check the SAME browser-origin
// persistent identity. Never mark an unsaved or mismatched fingerprint ready.
window.addEventListener("storage",e=>{
 if(e.key===PROFILE){paint();void verifyProfile();}
});
const validFriendName=v=>cleanName(v).length>0;
function persistFriend(fp,peer){
 if(!pairApproved()||!FP.test(fp))return false;
 const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
 const verifiedLive=transport?.connected()===true&&transport.peerFingerprint()===fp;
 if(!verifiedLive&&proofFingerprint!==fp)return false;
 let items=[];
 try{const v=JSON.parse(localStorage.getItem(FRIENDS)||"[]");
   if(Array.isArray(v))items=v.filter(row=>row&&FP.test(row.fp)&&validFriendName(row.name));
 }catch(_){return false;}
 const existing=items.find(row=>row.fp===fp);
 const verifiedName=cleanName(peer?.name);
 // Never replace an existing user-written nickname with a peer-controlled
 // display name. Only upgrade our clearly marked fingerprint placeholder.
 const placeholder="دوست · "+fp.slice(0,10);
 const newName=existing?.name&&!existing.name.startsWith("دوست · ")?
   existing.name:verifiedName||existing?.name||placeholder;
 const avatar=typeof peer?.avatar==="string"&&peer.avatar.length<=12000&&
   (peer.avatar===""||PHOTO.test(peer.avatar))?peer.avatar:
   (typeof existing?.avatar==="string"?existing.avatar:"");
 if(lastAutoPeer===fp&&existing?.name===newName&&
    (existing?.avatar||"")===(avatar||""))return true;
 const next=items.filter(row=>row.fp!==fp);
 next.unshift({fp,name:newName,...(avatar?{avatar}:{})});
 if(next.length>50)next.length=50;
 try{localStorage.setItem(FRIENDS,JSON.stringify(next));}
 catch(_){friendStatus.textContent=t("friendError");return false;}
 lastAutoPeer=fp;
 friendStatus.textContent=t("friendSaved");
 document.dispatchEvent(new CustomEvent("ezero:friend-local-saved",{detail:{fp,automatic:true}}));
 return true;
}
document.addEventListener("ezero:peer-signed-verified",e=>{
 const d=e.detail||{};
 if(!pairApproved()||d.signatureVerified!==true||
    !FP.test(d.peerFingerprint||""))return;
 // Sender may save ONLY after verifying the recipient's signed ANSWER.
 // Recipient may save ONLY after Accept and verifying sender's OFFER.
 if((pairIntent.role==="sender"&&d.signalType!=="answer")||
    (pairIntent.role==="recipient"&&d.signalType!=="offer"))return;
 proofFingerprint=d.peerFingerprint;
 persistFriend(d.peerFingerprint,null);
});
function afterConnected(){
 if(!pairApproved())return;
 const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
 if(transport?.connected()!==true)return;
 const fp=transport.peerFingerprint();
 if(FP.test(fp))persistFriend(fp,null);
}
document.addEventListener("ezero:channel-state",e=>{
 if(e.detail?.connected)afterConnected();
 else{lastAutoPeer="";pairIntent=null;proofFingerprint=null;}
});
document.addEventListener("ezero:call-status",e=>{
 if(e.detail?.stage==="connected")afterConnected();
 else if(["idle","micDenied","iceNoRoute","signalInvalid",
          "fingerprintMismatch","failed"].includes(e.detail?.stage))
   {pairIntent=null;proofFingerprint=null;}
});
document.addEventListener("ezero:profile-received",e=>{
 const d=e.detail||{},transport=window.EZERO_PEER_PROFILE_TRANSPORT;
 // Peer identity is obtained from the signed call engine, not from photo.
 if(d.connected===true&&FP.test(d.peerFingerprint||"")&&
    transport?.connected()===true&&transport.peerFingerprint()===d.peerFingerprint)
   persistFriend(d.peerFingerprint,d);
});
$("language")?.addEventListener("change",paint);
paint();void verifyProfile();
})();