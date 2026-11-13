/* E-ZERO simplified Secure App staging home. Navigation only: never initiates
 * camera, mic, signaling or friend trust. Existing call handlers remain authoritative.
 */
(()=>{"use strict";
const root=document.getElementById("ezeroUnifiedCard");
if(!root)return;
const heading=root.querySelector(".ezero-unified-heading");
if(!heading)return;
const labels={
 ur:{search:"دوست تلاش کریں",add:"دوست شامل کریں",friends:"میرے دوست",audio:"آڈیو کال",video:"ویڈیو کال",chat:"چیٹ",voice:"وائس میسج",myqr:"میرا کال QR",gallery:"گیلری سے QR پڑھیں",more:"مزید سہولتیں",back:"واپس",hint:"دوست کو دعوتی لنک بھیجیں؛ قبول ہونے کے بعد ایک بٹن سے کال کریں۔",status:"یہ تجرباتی ورژن ہے۔ کال وصول کرنے کے لیے دوسرے فون پر صفحہ کھلا ہونا ضروری ہوسکتا ہے۔"},
 ar:{search:"ابحث عن صديق",add:"إضافة صديق",friends:"أصدقائي",audio:"مكالمة صوتية",video:"مكالمة فيديو",chat:"دردشة",voice:"رسالة صوتية",myqr:"رمز مكالمتي",gallery:"قراءة QR من المعرض",more:"المزيد",back:"رجوع",hint:"أرسل رابط دعوة لصديق، ثم اتصل بنقرة واحدة بعد القبول.",status:"نسخة تجريبية؛ قد يلزم إبقاء الصفحة مفتوحة لتلقي المكالمات."},
 en:{search:"Find a friend",add:"Add friend",friends:"My friends",audio:"Audio call",video:"Video call",chat:"Chat",voice:"Voice note",myqr:"My call QR",gallery:"Scan QR from gallery",more:"More options",back:"Back",hint:"Share a friend invite link, then call with one tap after acceptance.",status:"Experimental: the recipient may need to keep this page open."}
};
const panel=document.createElement("section");
panel.className="ezero-simple-home";panel.setAttribute("aria-label","E-ZERO Secure App quick actions");
panel.innerHTML='<p class="ezero-simple-hint" id="ezeroSimpleHint"></p><label class="ezero-simple-search-label" for="ezeroSimpleSearch"></label><input id="ezeroSimpleSearch" type="search" autocomplete="off" maxlength="40"><div class="ezero-simple-tiles"><button type="button" data-ezero-home="add"><span aria-hidden="true">▦</span><strong></strong></button><button type="button" data-ezero-home="friends"><span aria-hidden="true">👥</span><strong></strong></button></div><div class="ezero-simple-actions"><button type="button" data-ezero-home="audio">📞 <span></span></button><button type="button" data-ezero-home="video">📹 <span></span></button><button type="button" data-ezero-home="chat">💬 <span></span></button><button type="button" data-ezero-home="voice">🎙️ <span></span></button></div><div class="ezero-simple-actions"><button type="button" data-ezero-home="myqr">▦ <span></span></button><button type="button" data-ezero-home="gallery">🖼️ <span></span></button></div><p id="ezeroSimpleStatus" role="status" aria-live="polite"></p><button type="button" class="ezero-simple-more" data-ezero-home="more"></button>';
heading.after(panel);
const sections=[...root.children].filter(e=>e!==heading&&e!==panel);
// Start in the actual simplified home, not the legacy QR wall. Preserve
// incoming-call acceptance and the working call workspace; More restores all.
for(const section of sections){
 if(section.id==="ezeroTrustedFriendsLab"||section.id==="ezeroFrontQrHub")continue;
 if(section.id==="ezeroContactFirstDock")continue;
 section.classList.add("ezero-simple-collapsed");
}
// Reveal the QR workspace only when explicitly requested or a genuine
// incoming-call panel/progress becomes visible. Never auto-answer a call.
const qrWorkspace=document.getElementById("ezeroOneJoinPanel");
const incomingShell=document.getElementById("ezeroOneIncomingShell");
const callProgress=document.getElementById("ezeroOneCallProgress");
if(qrWorkspace){
 const syncIncoming=()=>{
   if((incomingShell&&!incomingShell.hidden)||(callProgress&&!callProgress.hidden))
     qrWorkspace.classList.remove("ezero-simple-collapsed");
 };
 const observer=new MutationObserver(syncIncoming);
 if(incomingShell)observer.observe(incomingShell,{attributes:true,attributeFilter:["hidden"]});
 if(callProgress)observer.observe(callProgress,{attributes:true,attributeFilter:["hidden"]});
 syncIncoming();
}
const dock=document.getElementById("ezeroContactFirstDock");
const select=document.getElementById("language");
const simpleSearch=panel.querySelector("#ezeroSimpleSearch");
function lang(){return labels[select?.value]||labels.ur;}
function show(target){
 // Never hide the incoming-call acceptance UI or active WebRTC media.
 const protectedIds=new Set(["ezeroOneJoinPanel","ezeroTrustedFriendsLab","ezeroFrontQrHub"]);

 for(const e of sections){
   if(e===dock||protectedIds.has(e.id))continue;
   e.classList.toggle("ezero-simple-collapsed",!!target&&e!==target);
   if(!target)e.classList.remove("ezero-simple-collapsed");
 }
 if(target){target.classList.remove("ezero-simple-collapsed");target.scrollIntoView({block:"nearest",behavior:"instant"});}
 else panel.scrollIntoView({block:"start",behavior:"instant"});
}
function translate(){
 const t=lang();
 panel.querySelector("#ezeroSimpleHint").textContent=t.hint;
 panel.querySelector(".ezero-simple-search-label").textContent=t.search;
 simpleSearch.placeholder=t.search;
 panel.querySelector("#ezeroSimpleStatus").textContent=t.status;
 for(const action of ["add","friends","audio","video","chat","voice","myqr","gallery"]){
 const b=panel.querySelector('[data-ezero-home="'+action+'"]');
 (b.querySelector("strong")||b.querySelector("span:last-child")).textContent=t[action];
 }
 panel.querySelector('[data-ezero-home="more"]').textContent=t.more;
}
function find(ids){for(const id of ids){const x=document.getElementById(id);if(x)return x;}return null;}
panel.addEventListener("click",event=>{
 const action=event.target.closest("[data-ezero-home]")?.dataset.ezeroHome;
 if(!action)return;
 if(action==="more"){show(null);return;}
 if(action==="myqr"){const hub=find(["ezeroFrontQrHub"]);if(hub)hub.classList.remove("ezero-simple-collapsed");const own=find(["ezeroFrontAudioQr"]);if(own){own.click();hub?.scrollIntoView({block:"nearest"});}else panel.querySelector("#ezeroSimpleStatus").textContent="کال QR دستیاب نہیں؛ دعوتی سروس چیک کریں۔";return;}
 if(action==="gallery"){const hub=find(["ezeroFrontQrHub"]);hub?.classList.remove("ezero-simple-collapsed");const picker=find(["ezeroOneGalleryInvite"]);if(picker)picker.click();else panel.querySelector("#ezeroSimpleStatus").textContent="گیلری QR آپشن دستیاب نہیں۔";return;}
 if(action==="friends"){find(["ezeroFriendListToggle"])?.click();dock?.scrollIntoView({block:"nearest"});return;}
 if(action==="add"){
   // Do not automatically open a camera or claim a friend request was sent.
   // The existing invite-share button is a deliberate, user-driven fallback.
   const share=find(["ezeroAutoShare","ezeroOneShareInvite"]);
   if(share&&!share.disabled){share.click();return;}
   const start=find(["ezeroAutoStart"]);
   if(start&&!start.disabled){const workspace=start.closest("section");if(workspace)show(workspace);start.focus();return;}
   show(document.getElementById("ezeroOneJoinPanel"));
   panel.querySelector("#ezeroSimpleStatus").textContent=
     lang()===labels.en?"Invitation service is not ready. No request was sent.":
     lang()===labels.ar?"خدمة الدعوات غير جاهزة؛ لم يتم إرسال طلب.":
     "دعوتی سروس تیار نہیں؛ کوئی درخواست نہیں بھیجی گئی۔";
   return;
 }
 if(action==="audio"||action==="video"){
   // Route through existing selected-friend handler, which enforces trust and
   // falls back to first-time QR. Never synthesize a WebRTC Connected status.
   const existing=find([action==="audio"?"ezeroContactAudio":"ezeroContactVideo"]);
   if(existing&&!existing.disabled){existing.click();return;}
   // A saved friend must be explicitly selected; never silently create
   // another QR when the selected-contact button is disabled.
   let hasFriends=false;
   try{
     const items=JSON.parse(localStorage.getItem("ezero_secure_connect_staging_fingerprints_v0_1")||"[]");
     hasFriends=Array.isArray(items)&&items.some(x=>x&&/^[a-f0-9]{64}$/.test(x.fp||"")&&
       typeof x.name==="string"&&x.name.trim()&&
       window.EZERO_FRIEND_ACCESS?.isBlocked?.(x.fp)!==true);
   }catch(_){}
   if(hasFriends){
     const drawer=document.getElementById("ezeroFriendSidePanel");
     if(drawer?.hidden)find(["ezeroFriendListToggle"])?.click();
     dock?.scrollIntoView({block:"nearest"});
     return;
   }
   // First-time callers need a visible, actionable invitation, not a dead end.
   const start=find(["ezeroAutoStart"]);
   const workspace=start?.closest("section");
   if(workspace){show(workspace);workspace.classList.remove("ezero-simple-collapsed");}
   if(start&&!start.disabled){
     panel.querySelector("#ezeroSimpleStatus").textContent="کال کی دعوت بنائی جا رہی ہے؛ QR یا شیئر لنک نیچے ظاہر ہوگا۔";
     start.click();
   }else{
     panel.querySelector("#ezeroSimpleStatus").textContent="دعوتی سروس تیار نہیں؛ کوئی کال شروع نہیں ہوئی۔";
   }
   return;
 }
 const feature=root.querySelector('[data-modern-select="'+action+'"]');
 feature?.click();
});
simpleSearch.addEventListener("input",()=>{
 const search=document.getElementById("ezeroFriendSideSearch");
 if(search){search.value=simpleSearch.value;search.dispatchEvent(new Event("input",{bubbles:true}));}
 const list=document.getElementById("ezeroFriendSidePanel");
 if(simpleSearch.value.trim()&&list?.hidden)find(["ezeroFriendListToggle"])?.click();
});
select?.addEventListener("change",translate);
translate();
})();