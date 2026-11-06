/* E-ZERO People: local verified friend cards and short-lived call metadata.
 * No call media, chat, SDP, invitations, peer photos, IPs or push notifications.
 * Only genuinely connected calls with explicit opt-in are logged after END.
 * Each entry expires 10 minutes after hangup; cleanup while open/on next visit.
 * "Missed" remains an honest placeholder until real incoming-call alerts exist.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  if(!$("ezeroPeopleHub")||!$("ezeroPeopleList"))return;
  const CONTACTS="ezero_secure_connect_local_fingerprints_v0_1";
  const HISTORY="ezero_local_completed_call_history_v0_1";
  const CONSENT="ezero_local_call_history_consent_v0_1";
  const TEN_MINUTES=600000, LIMIT=40;
  const validFP=s=>typeof s==="string"&&/^[a-f0-9]{64}$/.test(s);
  const nameOf=s=>typeof s==="string"?s.trim().replace(/\s+/g," ").slice(0,40):"";
  const dict={
    ur:{verifyFriend:"+ QR شناخت سے دوست محفوظ کریں",hubTitle:"👥 دوست اور کال ہسٹری",hubDescription:"محفوظ دوست اور حقیقی طور پر کنیکٹ شدہ کالز؛ جعلی آن لائن یا مس کال کا نشان نہیں۔",
      friends:"دوست",calls:"کالز",missed:"مس کالز",searchLabel:"دوست یا کال تلاش کریں",
      historyConsent:"صرف واقعی کنیکٹ ہو کر مکمل ہونے والی آڈیو/ویڈیو کال کی مختصر ہسٹری 10 منٹ تک اسی فون پر محفوظ کریں۔ آواز، ویڈیو، تصویر اور چیٹ محفوظ نہیں ہوں گے۔",
      clearHistory:"کال ہسٹری صاف کریں",historyOff:"کال ہسٹری بند ہے؛ کوئی ریکارڈ محفوظ نہیں ہوگا۔",
      historyOn:"کامیاب کال کا ریکارڈ 10 منٹ بعد خودکار حذف ہوگا؛ جاری کال بند نہیں ہوگی۔",
      storageError:"اس براؤزر میں کال ہسٹری محفوظ نہیں ہوسکی۔",cleared:"مقامی کال ہسٹری صاف کردی گئی۔",
      noFriends:"ابھی کوئی دوست محفوظ نہیں۔ دستخط شدہ QR کی تصدیق کرکے دوست شامل کریں۔",
      noCalls:"ابھی کوئی مکمل تصدیق شدہ کال محفوظ نہیں۔ صرف حقیقی رابطہ قائم ہونے کے بعد اندراج ہوگا۔",
      noMissed:"پس منظر میں آنے والی کال کی اطلاع موجود نہیں، اس لیے کوئی مس کال فرض نہیں کی جائے گی۔",
      saved:"محفوظ شناخت · نئے سیشن میں دوبارہ تصدیق کریں",current:"ابھی WebRTC پر کنیکٹ",
      incoming:"آنے والی",outgoing:"کی گئی",audio:"آڈیو",video:"ویڈیو",temporary:"عارضی تصدیق شدہ رابطہ",
      unknown:"کنیکٹ شدہ رابطہ",recent:"10 منٹ کی ہسٹری",notOnline:"مستقل آن لائن حالت دستیاب نہیں",
      online:"● آن لائن — کال جاری",offline:"○ آف لائن — کال منقطع",presenceUnknown:"○ آن لائن حالت نامعلوم",friendCall:"📞 نئی کال",friendCallHelp:"کال کا دعوتی لنک شیئر کریں؛ محفوظ شناخت کو دوبارہ QR اسکین کرنا ضروری نہیں"},
    en:{verifyFriend:"+ Add friend via signed QR",hubTitle:"👥 Friends & call history",hubDescription:"Saved friends and genuinely connected calls; never fake online or missed-call status.",
      friends:"Friends",calls:"Calls",missed:"Missed",searchLabel:"Search friends or calls",
      historyConsent:"Keep minimal metadata about genuinely connected and completed audio/video calls on this phone for 10 minutes. Never save audio, video, photos or chat.",
      clearHistory:"Clear call history",historyOff:"Call history is off; no calls will be saved.",
      historyOn:"Completed call entries disappear automatically after 10 minutes; ongoing calls are not stopped.",
      storageError:"Browser storage prevented saving call history.",cleared:"Local call history cleared.",
      noFriends:"No friends saved yet. Verify a signed QR before saving a contact.",
      noCalls:"No completed verified calls saved. Only actual connections produce history entries.",
      noMissed:"Background incoming-call notifications are not available, so missed calls cannot be determined.",
      saved:"Saved ID · verify in each new session",current:"Connected via WebRTC now",
      incoming:"Incoming",outgoing:"Outgoing",audio:"Audio",video:"Video",temporary:"Temporary verified peer",
      unknown:"Connected peer",recent:"10-minute history",notOnline:"Permanent online status unavailable",
      online:"● Online — in call",offline:"○ Offline — call ended",presenceUnknown:"○ Online status unknown",friendCall:"📞 New call",friendCallHelp:"Share a fresh call link; do not rescan the saved identity QR"},
    ar:{verifyFriend:"+ إضافة صديق عبر QR موقّع",hubTitle:"👥 الأصدقاء وسجل المكالمات",hubDescription:"جهات الاتصال المحفوظة والمكالمات المتصلة فعليًا، دون حالة مزيفة.",
      friends:"الأصدقاء",calls:"المكالمات",missed:"الفائتة",searchLabel:"البحث عن صديق أو مكالمة",
      historyConsent:"احفظ البيانات المختصرة للمكالمات الصوتية/المرئية المتصلة والمكتملة على هذا الهاتف لمدة 10 دقائق؛ دون تسجيل الصوت أو الفيديو أو الصور أو الرسائل.",
      clearHistory:"مسح سجل المكالمات",historyOff:"السجل معطل ولن تُحفظ المكالمات.",
      historyOn:"تُحذف المكالمات المكتملة تلقائيًا بعد 10 دقائق؛ لا تنتهي المكالمة الجارية.",
      storageError:"منع المتصفح حفظ سجل المكالمات.",cleared:"تم مسح السجل المحلي.",
      noFriends:"لا أصدقاء محفوظون. تحقّق من QR موقّع قبل الحفظ.",
      noCalls:"لا يوجد سجل لمكالمات مكتملة متحقّق منها؛ لا تُسجَّل إلا الاتصالات الحقيقية.",
      noMissed:"لا تتوفر إشعارات مكالمات واردة في الخلفية، لذا لا يمكن تحديد الفائتة بعد.",
      saved:"هوية محفوظة · أعد التحقق في كل جلسة",current:"متصل الآن عبر WebRTC",
      incoming:"واردة",outgoing:"صادرة",audio:"صوتية",video:"مرئية",temporary:"طرف مؤقت متحقّق منه",
      unknown:"طرف متصل",recent:"سجل لمدة 10 دقائق",notOnline:"حالة الاتصال الدائمة غير متاحة",
      online:"● متصل الآن — في مكالمة",offline:"○ غير متصل — انتهت المكالمة",presenceUnknown:"○ حالة الاتصال غير معروفة",friendCall:"📞 مكالمة جديدة",friendCallHelp:"شارك رابط مكالمة جديداً؛ لا حاجة لمسح هوية QR المحفوظة مجدداً"}
  };
  const t=k=>(dict[document.documentElement.lang]||dict.ur)[k]||k;
  const el=(tag,cls,txt)=>{const n=document.createElement(tag);
    if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n;};
  function friends(){
    let parsed;
    try{parsed=JSON.parse(localStorage.getItem(CONTACTS)||"[]");}catch(_){return [];}
    if(!Array.isArray(parsed))return[];
    const seen=new Set(),out=[];
    for(const v of parsed.slice(0,50)){
      if(!v||!validFP(v.fp)||!nameOf(v.name)||seen.has(v.fp))continue;
      seen.add(v.fp);out.push({fp:v.fp,name:nameOf(v.name)});
    }
    return out;
  }
  const consent=()=>{try{return localStorage.getItem(CONSENT)==="yes";}catch(_){return false;}};
  function decodeHistory(){
    if(!consent())return[];
    try{
      const input=JSON.parse(localStorage.getItem(HISTORY)||"[]");
      if(!Array.isArray(input))return[];
      const now=Date.now(),seen=new Set(),out=[];
      for(const x of input.slice(0,LIMIT)){
        if(!x||!Number.isSafeInteger(x.ended)||x.ended<=now-TEN_MINUTES||
          x.ended>now+1000||!["incoming","outgoing"].includes(x.direction)||
          !["audio","video"].includes(x.kind)||typeof x.id!=="string"||
          !/^[a-f0-9]{16}$/.test(x.id)||seen.has(x.id)||
          typeof x.name!=="string"||x.name.length>40)continue;
        seen.add(x.id);
        out.push({ended:x.ended,direction:x.direction,kind:x.kind,
          id:x.id,name:nameOf(x.name)});
      }
      return out.sort((a,b)=>b.ended-a.ended);
    }catch(_){return[];}
  }
  let records=decodeHistory(),active=null,intent=null,tab="friends",timer=null,note=null;
  // Session-only disconnected states are not claims about global availability.
  const sessionEndedPeers=new Set();
  function persist(){
    try{
      if(!consent())localStorage.removeItem(HISTORY);
      else localStorage.setItem(HISTORY,JSON.stringify(records.slice(0,LIMIT)));
      return true;
    }catch(_){note="storageError";return false;}
  }
  function prune(){
    if(!consent()){records=[];return;}
    const now=Date.now(),before=records.length;
    records=records.filter(x=>x.ended>now-TEN_MINUTES&&x.ended<=now+1000);
    if(records.length!==before)persist();
  }
  function schedule(){
    if(timer){clearTimeout(timer);timer=null;}
    if(document.hidden||!records.length)return;
    const next=Math.min(...records.map(x=>x.ended+TEN_MINUTES));
    timer=setTimeout(()=>{prune();render();},Math.max(100,Math.min(60000,next-Date.now()+100)));
  }
  function avatar(name,image){
    const a=el("div","ezero-person-avatar");
    if(typeof image==="string"&&image.length<=12000&&
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)){
      const img=el("img");img.src=image;img.alt="";a.append(img);
    }else a.textContent=(Array.from(name||"E")[0]||"E").toLocaleUpperCase();
    a.setAttribute("aria-hidden","true");return a;
  }
  function card(name,small,tag,image){
    const article=el("article","ezero-person-card");
    article.append(avatar(name,image));
    const center=el("div","ezero-person-info");
    center.append(el("strong","",name),el("small","",small));
    article.append(center,el("span","ezero-person-label",tag));return article;
  }
  function render(){
    prune();
    const search=$("ezeroPeopleSearch").value.trim().toLocaleLowerCase();
    const box=$("ezeroPeopleList");box.replaceChildren();
    let entries=[];
    if(tab==="friends"){
      entries=friends().filter(x=>x.name.toLocaleLowerCase().includes(search)||
        x.fp.includes(search)).map(x=>{
        const online=active?.fp===x.fp&&
          window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true;
        const status=online?"online":sessionEndedPeers.has(x.fp)?"offline":"presenceUnknown";
        const row=card(x.name,t("saved")+" · "+x.fp.slice(0,10)+"…",
          t(status),"");
        row.dataset.presence=status;
        row.dataset.fingerprint=x.fp;
        if(!online){
          const callButton=el("button","ezero-saved-friend-call",t("friendCall"));
          callButton.type="button";
          callButton.setAttribute("aria-label",t("friendCall")+" — "+x.name);
          callButton.addEventListener("click",()=>{
            // A saved fingerprint is NOT an addressable online account.
            // Start a genuine fresh signed invite. Delivery still requires
            // explicit link sharing by the caller, without new QR identity scan.
            const call=document.querySelector('[data-modern-select="audio"]');
            if(!call)return;
            if(window.EZERO_PEER_PROFILE_TRANSPORT?.targetSavedContact(x.fp)!==true){
              $("ezeroPeopleStatus").textContent=t("presenceUnknown");
              return;
            }
            $("ezeroPeopleHub").open=false;
            call.click();
            $("ezeroAutoPilot")?.scrollIntoView({block:"center"});
          });
          row.append(callButton);
        }
        return row;
      });
      if(active&&active.name.toLocaleLowerCase().includes(search)){
        const img=$("ezeroPeerAvatar");
        const current=card(active.name,t("current"),t("online"),
          img&&!img.hidden?img.getAttribute("src"):"");
        current.dataset.presence="online";
        entries.unshift(current);
      }
    }else if(tab==="calls"){
      entries=records.filter(x=>x.name.toLocaleLowerCase().includes(search)).map(x=>{
        const locale=document.documentElement.lang==="ar"?"ar-SA":
          document.documentElement.lang==="ur"?"ur-PK":"en-US";
        const time=new Date(x.ended).toLocaleTimeString(locale,{hour:"numeric",minute:"2-digit"});
        return card(x.name||t("unknown"),t(x.direction)+" · "+t(x.kind)+" · "+time,t("recent"),"");
      });
    }
    if(!entries.length)box.append(el("p","ezero-people-empty",
      tab==="missed"?t("noMissed"):tab==="calls"?t("noCalls"):t("noFriends")));
    else box.append(...entries);
    for(const [id,kind] of [["ezeroTabFriends","friends"],["ezeroTabCalls","calls"],["ezeroTabMissed","missed"]])
      $(id).setAttribute("aria-pressed",String(tab===kind));
    $("ezeroPeopleSearch").hidden=tab==="missed";
    $("ezeroHistoryConsent").checked=consent();
    $("ezeroHistoryClear").disabled=!records.length;
    $("ezeroPeopleStatus").textContent=t(note||(consent()?"historyOn":"historyOff"));
    schedule();
  }
  function connected(){
    if(active)return;
    const peer=window.EZERO_PEER_PROFILE_TRANSPORT;
    if(!peer?.connected())return;
    const fp=peer.peerFingerprint();
    if(!validFP(fp))return;
    const saved=friends().find(x=>x.fp===fp);
    const visible=nameOf($("ezeroPeerDisplayName")?.textContent);
    const empty=["دوست نے ابھی پروفائل شیئر نہیں کی","Friend has not shared a profile yet",
      "لم يشارك الصديق ملفه بعد"];
    active={fp,name:saved?.name||(!empty.includes(visible)?visible:"")||t("unknown"),
      direction:intent?.direction||null,kind:intent?.kind||null};
    sessionEndedPeers.delete(fp);
    render();
  }
  function ended(){
    if(!active)return;
    const old=active;active=null;intent=null;
    sessionEndedPeers.add(old.fp);
    // Only a real connected session with explicit direction/type is eligible.
    if(consent()&&["incoming","outgoing"].includes(old.direction)&&
       ["audio","video"].includes(old.kind)){
      const random=new Uint8Array(8);crypto.getRandomValues(random);
      const id=Array.from(random,b=>b.toString(16).padStart(2,"0")).join("");
      records.unshift({id,ended:Date.now(),direction:old.direction,
        kind:old.kind,name:nameOf(old.name)||t("unknown")});
      records=records.slice(0,LIMIT);persist();
    }
    render();
  }
  function localize(){
    for(const n of document.querySelectorAll("[data-people]"))n.textContent=t(n.dataset.people);
    $("ezeroPeopleSearch").placeholder=t("searchLabel");render();
  }
  $("ezeroHistoryConsent").addEventListener("change",()=>{
    try{
      if($("ezeroHistoryConsent").checked)localStorage.setItem(CONSENT,"yes");
      else{localStorage.removeItem(CONSENT);localStorage.removeItem(HISTORY);records=[];}
      note=null;
    }catch(_){note="storageError";$("ezeroHistoryConsent").checked=false;}
    render();
  });
  $("ezeroHistoryClear").addEventListener("click",()=>{
    records=[];persist();note="cleared";render();
  });
  for(const [id,type] of [["ezeroTabFriends","friends"],["ezeroTabCalls","calls"],["ezeroTabMissed","missed"]])
    $(id).addEventListener("click",()=>{tab=type;render();});
  $("ezeroPeopleSearch").addEventListener("input",render);
  document.addEventListener("ezero:call-intent",e=>{
    const v=e.detail||{};
    if(["incoming","outgoing"].includes(v.direction)&&["audio","video"].includes(v.kind))
      intent={direction:v.direction,kind:v.kind};
  });
  document.addEventListener("ezero:channel-state",e=>{
    if(e.detail?.connected)connected();else ended();
  });
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="connected")connected();
    if(["offline","idle","iceNoRoute"].includes(e.detail?.stage))ended();
  });
  document.addEventListener("ezero:profile-received",e=>{
    const p=e.detail||{};
    if(active&&p.peerFingerprint===active.fp&&nameOf(p.name)){
      active.name=nameOf(p.name);render();
    }
  });
  // Update the visible Friends tab immediately after BOTH users approve
  // a real in-call friend request; do not require a page reload.
  document.addEventListener("ezero:friend-saved",render);
  $("language").addEventListener("change",localize);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
  window.addEventListener("focus",render);
  window.addEventListener("pagehide",()=>{ended();if(timer)clearTimeout(timer);});
  if(!consent()){try{localStorage.removeItem(HISTORY);}catch(_){}}
  // Expired entries are purged at startup and whenever the page becomes visible.
  persist();localize();
})();