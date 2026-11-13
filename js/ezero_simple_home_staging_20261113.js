/* E-ZERO simplified Secure App staging home. Navigation only: never initiates
 * camera, mic, signaling or friend trust. Existing call handlers remain authoritative.
 */
(()=>{"use strict";
const root=document.getElementById("ezeroUnifiedCard");
if(!root)return;
const heading=root.querySelector(".ezero-unified-heading");
if(!heading)return;
const labels={
 ur:{search:"دوست تلاش کریں",add:"دوست شامل کریں",friends:"میرے دوست",audio:"آڈیو کال",video:"ویڈیو کال",chat:"چیٹ",voice:"وائس میسج",more:"مزید سہولتیں",back:"واپس",hint:"پہلی دوستی QR سے، پھر محفوظ دوست کو منتخب کرکے کال کریں۔",status:"یہ تجرباتی ورژن ہے۔ کال وصول کرنے کے لیے دوسرے فون پر صفحہ کھلا ہونا ضروری ہوسکتا ہے۔"},
 ar:{search:"ابحث عن صديق",add:"إضافة صديق",friends:"أصدقائي",audio:"مكالمة صوتية",video:"مكالمة فيديو",chat:"دردشة",voice:"رسالة صوتية",more:"المزيد",back:"رجوع",hint:"امسح QR لأول مرة، ثم اتصل بصديق محفوظ.",status:"نسخة تجريبية؛ قد يلزم إبقاء الصفحة مفتوحة لتلقي المكالمات."},
 en:{search:"Find a friend",add:"Add friend",friends:"My friends",audio:"Audio call",video:"Video call",chat:"Chat",voice:"Voice note",more:"More options",back:"Back",hint:"Scan QR once to pair, then call a saved friend.",status:"Experimental: the recipient may need to keep this page open."}
};
const panel=document.createElement("section");
panel.className="ezero-simple-home";panel.setAttribute("aria-label","E-ZERO Secure App quick actions");
panel.innerHTML='<p class="ezero-simple-hint" id="ezeroSimpleHint"></p><div class="ezero-simple-tiles"><button type="button" data-ezero-home="add"><span aria-hidden="true">▦</span><strong></strong></button><button type="button" data-ezero-home="friends"><span aria-hidden="true">👥</span><strong></strong></button></div><div class="ezero-simple-actions"><button type="button" data-ezero-home="audio">📞 <span></span></button><button type="button" data-ezero-home="video">📹 <span></span></button><button type="button" data-ezero-home="chat">💬 <span></span></button><button type="button" data-ezero-home="voice">🎙️ <span></span></button></div><p id="ezeroSimpleStatus" role="status" aria-live="polite"></p><button type="button" class="ezero-simple-more" data-ezero-home="more"></button>';
heading.after(panel);
const sections=[...root.children].filter(e=>e!==heading&&e!==panel);
const dock=document.getElementById("ezeroContactFirstDock");
const select=document.getElementById("language");
function lang(){return labels[select?.value]||labels.ur;}
function show(target){
 for(const e of sections){
   if(e===dock)continue;
   e.classList.toggle("ezero-simple-collapsed",!!target&&e!==target);
   if(!target)e.classList.remove("ezero-simple-collapsed");
 }
 if(target){target.classList.remove("ezero-simple-collapsed");target.scrollIntoView({block:"nearest",behavior:"instant"});}
 else panel.scrollIntoView({block:"start",behavior:"instant"});
}
function translate(){
 const t=lang();
 panel.querySelector("#ezeroSimpleHint").textContent=t.hint;
 panel.querySelector("#ezeroSimpleStatus").textContent=t.status;
 for(const action of ["add","friends","audio","video","chat","voice"]){
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
 if(action==="friends"){find(["ezeroFriendListToggle"])?.click();dock?.scrollIntoView({block:"nearest"});return;}
 if(action==="add"){
   const qr=find(["ezeroFrontQrHub","ezeroOneJoinPanel","ezeroOneScanInvite"]);
   show(qr?.closest("section")||document.getElementById("ezeroOneJoinPanel"));
   return;
 }
 if(action==="audio"||action==="video"){
   // Route through existing selected-friend handler, which enforces trust and
   // falls back to first-time QR. Never synthesize a WebRTC Connected status.
   const existing=find([action==="audio"?"ezeroContactAudio":"ezeroContactVideo"]);
   if(existing&&!existing.disabled){existing.click();return;}
   const feature=root.querySelector('[data-modern-select="'+action+'"]');
   feature?.click();return;
 }
 const feature=root.querySelector('[data-modern-select="'+action+'"]');
 feature?.click();
});
select?.addEventListener("change",translate);
translate();
})();