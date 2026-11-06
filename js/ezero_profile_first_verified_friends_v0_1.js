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
const AUTO="ezero_secure_connect_verified_friend_autosave_v0_1";
const FP=/^[a-f0-9]{64}$/;
const PHOTO=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const words={
 ur:{heading:"🔐 میری مستقل E-ZERO شناخت",instruction:"پہلی کال سے پہلے نام اور ڈیجیٹل شناخت محفوظ کریں۔ تصویر اختیاری ہے۔ دوست کو پہچاننے اور دوبارہ کال کرنے کے لیے شناخت اسی فون میں رہے گی۔",
  ready:"✓ نام اور محفوظ ڈیجیٹل شناخت تیار ہے۔ دوست منتخب کرکے کال کریں۔",
  missing:"پہلے پروفائل میں اپنا نام لکھ کر «محفوظ کریں» دبائیں، پھر کال کریں۔",
  failed:"اس براؤزر میں مستقل شناخت محفوظ نہیں ہوئی۔ فون کی اسٹوریج یا نجی براؤزنگ چیک کریں۔",
  open:"👤 نام اور تصویر مکمل کریں",autosave:"کامیاب محفوظ کال کے بعد تصدیق شدہ دوست خود اس فون کی فہرست میں محفوظ کریں",
  id:"میری SHA-256 ڈیجیٹل آئی ڈی",friendSaved:"✓ تصدیق شدہ رابطے کے بعد دوست اسی فون میں محفوظ ہوگیا۔",
  friendError:"اس فون میں دوست محفوظ نہیں ہو سکا؛ براؤزر کی اسٹوریج چیک کریں۔"},
 en:{heading:"🔐 My lasting E-ZERO identity",instruction:"Save your name and digital identity before calling. Photo is optional. The identity remains in this browser for later calls.",
  ready:"✓ Your saved digital identity and name are ready. Select a friend to call.",
  missing:"Enter your name in Profile, tap Save, then start a call.",
  failed:"Persistent identity unavailable. Check private mode and browser storage.",
  open:"👤 Complete name and photo",autosave:"Automatically save verified friends to this phone after a successful call",
  id:"My SHA-256 digital ID",friendSaved:"✓ Verified friend saved locally on this phone.",
  friendError:"Could not save friend on this phone. Check browser storage."},
 ar:{heading:"🔐 هويتي الدائمة في E-ZERO",instruction:"احفظ اسمك وهويتك الرقمية قبل الاتصال. الصورة اختيارية. تبقى الهوية في هذا المتصفح لتسهيل الاتصال لاحقًا.",
  ready:"✓ تم حفظ الاسم والهوية الرقمية. اختر صديقًا للاتصال.",
  missing:"اكتب اسمك في الملف الشخصي واضغط حفظ ثم اتصل.",
  failed:"تعذر حفظ الهوية. تحقق من تخزين المتصفح أو وضع التصفح الخاص.",
  open:"👤 أكمل الاسم والصورة",autosave:"حفظ الأصدقاء المؤكدين تلقائيًا في هذا الهاتف بعد اتصال ناجح",
  id:"معرفي الرقمي SHA-256",friendSaved:"✓ حُفظ الصديق المتحقق منه على هذا الجهاز.",
  friendError:"تعذر حفظ الصديق على هذا الهاتف؛ تحقق من التخزين."}
};
const t=k=>(words[document.documentElement.lang]||words.ur)[k];
const node=(tag,id)=>{const n=document.createElement(tag);if(id)n.id=id;return n;};
const box=node("section","ezeroProfileFirstGate");
box.className="ezero-profile-first-gate";
const h=node("strong","ezeroProfileFirstTitle");
const help=node("p","ezeroProfileFirstHelp");
const id=node("small","ezeroProfileFirstFingerprint");
const open=node("button","ezeroProfileFirstOpen");open.type="button";
const label=node("label","ezeroAutoSaveFriendLabel");
const consent=node("input","ezeroAutoSaveFriends");consent.type="checkbox";
const legend=node("span","ezeroAutoSaveFriendLegend");
label.append(consent,legend);
const status=node("p","ezeroProfileFirstStatus");
status.setAttribute("role","status");status.setAttribute("aria-live","polite");
const friendStatus=node("p","ezeroFriendAutoSaveStatus");
friendStatus.setAttribute("role","status");friendStatus.setAttribute("aria-live","polite");
box.append(h,help,id,open,label,status,friendStatus);
dock.prepend(box);
let ready=false,verifiedKey=null,checking=false,lastAutoPeer="";
const cleanName=v=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,40):"";
const userProfile=()=>{
 try{const p=JSON.parse(localStorage.getItem(PROFILE)||"null");
   return p&&cleanName(p.name)?p:null;
 }catch(_){return null;}
};
const autoEnabled=()=>{try{return localStorage.getItem(AUTO)==="yes";}catch(_){return false;}};
function paint(){
 h.textContent=t("heading");help.textContent=t("instruction");
 open.textContent=t("open");legend.textContent=t("autosave");
 const short=verifiedKey||$("myFingerprint")?.textContent?.trim();
 id.textContent=t("id")+": "+(FP.test(short||"")?
   short.slice(0,12)+"…"+short.slice(-8):"—");
 status.textContent=ready?t("ready"):t("missing");
 status.dataset.state=ready?"ready":"needs-profile";
 consent.checked=autoEnabled();
}
async function verifyProfile(){
 if(checking)return ready;
 checking=true;
 try{
   const profile=userProfile();
   const key=await window.EZERO_DEVICE_IDENTITY_STORE.read();
   const displayed=$("myFingerprint")?.textContent?.trim();
   ready=!!profile&&!!key&&FP.test(key.fingerprint)&&
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
 $("ezeroMyName")?.focus?.({preventScroll:true});
}
open.addEventListener("click",showProfile);
consent.addEventListener("change",()=>{
  // This control records intent only after Profile Save, not on every toggle.
  status.textContent=ready?t("ready"):t("missing");
});
document.addEventListener("ezero:profile-local-saved",async()=>{
 try{localStorage.setItem(AUTO,consent.checked?"yes":"no");}
 catch(_){status.textContent=t("failed");return;}
 await verifyProfile();
});
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
 showProfile();
},true);
// When profile changes in a separate tab, re-check the SAME browser-origin
// persistent identity. Never mark an unsaved or mismatched fingerprint ready.
window.addEventListener("storage",e=>{
 if(e.key===PROFILE||e.key===AUTO){paint();void verifyProfile();}
});
const validFriendName=v=>cleanName(v).length>0;
function persistFriend(fp,peer){
 if(!autoEnabled()||!ready||!FP.test(fp))return false;
 const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
 if(transport?.connected()!==true||transport.peerFingerprint()!==fp)return false;
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
function afterConnected(){
 if(!autoEnabled()||!ready)return;
 const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
 if(transport?.connected()!==true)return;
 const fp=transport.peerFingerprint();
 if(FP.test(fp))persistFriend(fp,null);
}
document.addEventListener("ezero:channel-state",e=>{
 if(e.detail?.connected)afterConnected();
 else lastAutoPeer="";
});
document.addEventListener("ezero:call-status",e=>{
 if(e.detail?.stage==="connected")afterConnected();
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