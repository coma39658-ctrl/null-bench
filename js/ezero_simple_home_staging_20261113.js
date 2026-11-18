/* E-ZERO simplified Secure App staging home. Navigation only: never initiates
 * camera, mic, signaling or friend trust. Existing call handlers remain authoritative.
 */
(()=>{"use strict";
const root=document.getElementById("ezeroUnifiedCard");
if(!root)return;
const heading=root.querySelector(".ezero-unified-heading");
if(!heading)return;
const labels={
 ur:{search:"دوست تلاش کریں",add:"دوست کو مستقل QR سے شامل کریں",friends:"میرے دوست",audio:"آڈیو کال",video:"ویڈیو کال",chat:"چیٹ",voice:"وائس میسج",myqr:"میرا مستقل QR",scan:"دوست کا QR اسکین کریں",gallery:"گیلری سے QR پڑھیں",more:"مزید سہولتیں",back:"واپس",hint:"دونوں فون ایک بار ایک دوسرے کا مستقل QR اسکین کرکے دوست محفوظ کریں؛ پھر فہرست سے براہِ راست کال کریں۔",status:"یہ تجرباتی ورژن ہے۔ کال وصول کرنے کے لیے دوسرے فون پر صفحہ کھلا ہونا ضروری ہوسکتا ہے۔"},
 ar:{search:"ابحث عن صديق",add:"إضافة صديق عبر QR الدائم",friends:"أصدقائي",audio:"مكالمة صوتية",video:"مكالمة فيديو",chat:"دردشة",voice:"رسالة صوتية",myqr:"رمز QR الدائم",scan:"مسح QR الصديق",gallery:"قراءة QR من المعرض",more:"المزيد",back:"رجوع",hint:"يمسح الهاتفان رمز QR الدائم لبعضهما مرة واحدة ويحفظان الصديق؛ بعد ذلك اتصل من القائمة مباشرة.",status:"نسخة تجريبية؛ قد يلزم إبقاء الصفحة مفتوحة لتلقي المكالمات."},
 en:{search:"Find a friend",add:"Add friend with permanent QR",friends:"My friends",audio:"Audio call",video:"Video call",chat:"Chat",voice:"Voice note",myqr:"My permanent QR",scan:"Scan friend QR",gallery:"Scan QR from gallery",more:"More options",back:"Back",hint:"Both phones scan and save each other’s permanent QR once; then call directly from Friends.",status:"Experimental: the recipient may need to keep this page open."}
};
const panel=document.createElement("section");
panel.className="ezero-simple-home";panel.setAttribute("aria-label","E-ZERO Secure App quick actions");
panel.innerHTML='<p class="ezero-simple-hint" id="ezeroSimpleHint"></p><label class="ezero-simple-search-label" for="ezeroSimpleSearch"></label><input id="ezeroSimpleSearch" type="search" autocomplete="off" maxlength="40"><div class="ezero-simple-tiles"><button type="button" data-ezero-home="add"><span aria-hidden="true">＋</span><strong></strong></button><button type="button" data-ezero-home="friends"><span aria-hidden="true">👥</span><strong></strong></button></div><div class="ezero-simple-actions"><button type="button" data-ezero-home="chat">💬 <span></span></button><button type="button" data-ezero-home="voice">🎙️ <span></span></button></div><p class="ezero-simple-call-hint">آڈیو اور ویڈیو کال کے بٹن منتخب دوست کے ساتھ نیچے ایک ہی جگہ موجود ہیں۔</p><p id="ezeroSimpleStatus" role="status" aria-live="polite"></p><button type="button" class="ezero-simple-more" data-ezero-home="more"></button>';
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
 for(const action of ["add","friends","chat","voice"]){
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
 if(action==="myqr"){
    const card=document.getElementById("ezeroPermanentQrCard");
    if(card){card.scrollIntoView({block:"nearest",behavior:"instant"});panel.querySelector("#ezeroSimpleStatus").textContent="یہ آپ کی مستقل شناخت ہے؛ پہلی بار بنانے کے بعد یہی QR برقرار رہے گا۔";}
    return;
  }
  if(action==="scan"||action==="gallery"){const workspace=find(["ezeroOneJoinPanel"]);if(workspace){workspace.hidden=false;workspace.classList.remove("ezero-simple-collapsed");workspace.scrollIntoView({block:"start",behavior:"instant"});}if(action==="scan"){const scanner=find(["ezeroOneScanInvite"]);if(scanner){scanner.click();panel.querySelector("#ezeroSimpleStatus").textContent="کیمرہ اسکینر کھولنے کی درخواست بھیج دی گئی ہے۔";}else panel.querySelector("#ezeroSimpleStatus").textContent="اسکینر بٹن اس ورژن میں موجود نہیں؛ اسے بحال کرنا ضروری ہے۔";}else{const picker=find(["ezeroOneImageScan","ezeroOneGalleryInvite"]);if(picker)picker.click();else panel.querySelector("#ezeroSimpleStatus").textContent="گیلری QR آپشن دستیاب نہیں۔";}return;}
 if(action==="friends"){find(["ezeroFriendListToggle"])?.click();dock?.scrollIntoView({block:"nearest"});return;}
 if(action==="add"){
    const card=document.getElementById("ezeroPermanentQrCard");
    const scan=document.getElementById("ezeroScanPermanentFriendQr");
    const create=document.getElementById("ezeroCreatePermanentQr");
    if(card)card.scrollIntoView({block:"nearest",behavior:"instant"});
    if(scan&&!scan.hidden){scan.click();}
    else if(create&&!create.hidden){
      panel.querySelector("#ezeroSimpleStatus").textContent=
        "پہلے اپنا مستقل QR بنائیں؛ پھر دوست کا QR اسکین کرکے اسے محفوظ کریں۔";
      create.focus();
    }else{
      panel.querySelector("#ezeroSimpleStatus").textContent="مستقل QR کا حصہ دستیاب نہیں؛ اس صفحے کو تازہ کریں۔";
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