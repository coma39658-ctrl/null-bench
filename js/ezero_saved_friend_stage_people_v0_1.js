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
  const CONTACTS="ezero_secure_connect_staging_fingerprints_v0_1";
  const HISTORY="ezero_staging_local_completed_call_history_v0_1";
  const CONSENT="ezero_staging_local_call_history_consent_v0_1";
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
      unknown:"کنیکٹ شدہ رابطہ",recent:"10 منٹ کی ہسٹری",notOnline:"مستقل آن لائن حالت دستیاب نہیں"},
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
      unknown:"Connected peer",recent:"10-minute history",notOnline:"Permanent online status unavailable"},
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
      unknown:"طرف متصل",recent:"سجل لمدة 10 دقائق",notOnline:"حالة الاتصال الدائمة غير متاحة"}
  };
  const t=k=>(dict[document.documentElement.lang]||dict.ur)[k]||k;
  const saveWords={
    ur:{label:"👤 پہلی کامیاب کال کے بعد دوست کا نام محفوظ کریں",button:"✓ اس دوست کو محفوظ کریں",
      placeholder:"دوست کا نام",help:"صرف حقیقی کنکشن اور آپ کی منظوری کے بعد نام، کال میں تصدیق شدہ ڈیجیٹل فنگرپرنٹ اور آپ کے فون کی غیر قابلِ برآمد نجی کلید اسی براؤزر میں محفوظ ہوں گے۔ انسانی شناخت کی ضمانت نہیں۔",
      idle:"دوست محفوظ کرنے کے بعد بھی براہِ راست دوبارہ کال کے لیے مستقل محفوظ رابطہ سرور درکار ہے؛ یہ ابھی فعال نہیں۔",
      saved:"✓ دوست اس فون پر محفوظ ہوگیا، اور اس فون کی شناخت بھی محفوظ ہے۔ ابھی بغیر QR دوبارہ کال کی سہولت فعال نہیں۔",
      error:"دوست محفوظ نہیں ہوسکا؛ اس براؤزر میں محفوظ شناخت کی اجازت/اسٹوریج چیک کریں۔",
      disconnected:"دوست محفوظ کرنے کے لیے حقیقی فعال WebRTC کال ضروری ہے۔",
      needName:"دوست کا نام درج کریں۔",full:"50 دوست محفوظ ہیں؛ پہلے کوئی نام ہٹائیں۔",
      remove:"ہٹائیں",confirmRemove:"کیا یہ دوست اسی فون سے ہٹانا چاہتے ہیں؟"},
    en:{label:"👤 Save a friend after a successful call",button:"✓ Save this friend",placeholder:"Friend name",
      help:"Only after a real call and your consent, a nickname, call-verified fingerprint and a non-extractable private device key are saved locally in this browser. No real-world identity guarantee.",
      idle:"A secure addressable call server is still needed for no-QR redial; this is not active yet.",
      saved:"✓ Friend and device identity saved locally. No-QR redial is not active yet.",
      error:"Could not save. Check this browser's local storage permissions.",
      disconnected:"A genuinely connected WebRTC call is needed to save this friend.",
      needName:"Enter a friend name.",full:"50 friends saved; remove an old one first.",
      remove:"Remove",confirmRemove:"Remove this friend from this phone?"},
    ar:{label:"👤 احفظ صديقاً بعد مكالمة ناجحة",button:"✓ حفظ هذا الصديق",placeholder:"اسم الصديق",
      help:"فقط بعد الاتصال الحقيقي وبموافقتك، يُحفظ الاسم وبصمة المكالمة ومفتاح الجهاز الخاص غير القابل للتصدير محلياً في هذا المتصفح. لا ضمان للهوية الواقعية.",
      idle:"الاتصال مرة أخرى دون QR يحتاج لخادم توجيه آمن ودائم، ولم يُفعّل بعد.",
      saved:"✓ حُفظ الصديق وهوية الجهاز محلياً؛ إعادة الاتصال دون QR غير مفعّلة بعد.",
      error:"تعذّر الحفظ؛ تحقق من أذونات التخزين المحلي.",
      disconnected:"يلزم اتصال WebRTC حقيقي لحفظ هذا الصديق.",
      needName:"أدخل اسم الصديق.",full:"تم حفظ 50 صديقاً؛ احذف أحدهم أولاً.",
      remove:"إزالة",confirmRemove:"هل تريد إزالة هذا الصديق من هذا الهاتف؟"}
  };
  const sw=k=>(saveWords[document.documentElement.lang]||saveWords.ur)[k];
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
  let savingFriend=false,saveNotice=null;
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
  function renderSavePanel(){
    const panel=$("ezeroFriendSavePanel"),btn=$("ezeroSaveConnectedFriend");
    if(!panel||!btn)return;
    const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
    const live=!!active&&transport?.connected()===true&&
      transport.peerFingerprint()===active.fp;
    panel.hidden=!live;
    if(live&&!$("ezeroFriendSaveName").value.trim()&&
       active.name!==t("unknown"))$("ezeroFriendSaveName").value=active.name;
    btn.disabled=!live||savingFriend||!nameOf($("ezeroFriendSaveName").value);
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
        const item=card(x.name,t("saved")+" · "+x.fp.slice(0,10)+"…",t("friends"),"");
        const remove=el("button","ezero-friend-remove",sw("remove"));
        remove.type="button";
        remove.addEventListener("click",()=>{
          if(!window.confirm(sw("confirmRemove")))return;
          try{localStorage.setItem(CONTACTS,JSON.stringify(friends().filter(v=>v.fp!==x.fp)));}
          catch(_){saveNotice="error";render();return;}
          render();
        });
        item.append(remove);
        return item;
      });
      if(active&&!friends().some(x=>x.fp===active.fp)&&
         active.name.toLocaleLowerCase().includes(search)){
        const img=$("ezeroPeerAvatar");
        entries.unshift(card(active.name,t("current"),t("temporary"),
          img&&!img.hidden?img.getAttribute("src"):""));
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
    renderSavePanel();
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
    render();
  }
  function ended(){
    if(!active)return;
    const old=active;active=null;intent=null;
    $("ezeroFriendSaveName").value="";
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
    $("ezeroPeopleSearch").placeholder=t("searchLabel");
    const panel=$("ezeroFriendSavePanel");
    if(panel){
      panel.querySelector('label[for="ezeroFriendSaveName"]').textContent=sw("label");
      $("ezeroFriendSaveName").placeholder=sw("placeholder");
      $("ezeroSaveConnectedFriend").textContent=sw("button");
      $("ezeroFriendSaveHelp").textContent=sw("help");
      $("ezeroFriendSaveStatus").textContent=sw(saveNotice||"idle");
    }
    render();
  }
  $("ezeroFriendSaveName")?.addEventListener("input",renderSavePanel);
  $("ezeroSaveConnectedFriend")?.addEventListener("click",async()=>{
    if(savingFriend)return;
    const transport=window.EZERO_PEER_PROFILE_TRANSPORT;
    const fp=active?.fp;
    if(!validFP(fp)||!transport?.connected()||transport.peerFingerprint()!==fp){
      saveNotice="disconnected";localize();return;
    }
    const name=nameOf($("ezeroFriendSaveName").value);
    if(!name){saveNotice="needName";localize();return;}
    const items=friends(),old=items.findIndex(x=>x.fp===fp);
    if(old<0&&items.length>=50){saveNotice="full";localize();return;}
    savingFriend=true;renderSavePanel();
    try{
      // The actual click is consent to persist this device's private CryptoKey.
      const durable=await window.EZERO_DEVICE_IDENTITY_CONTROL?.saveAfterConsent();
      if(durable!==true)throw Error("DEVICE_KEY_NOT_SAVED");
      if(!transport.connected()||transport.peerFingerprint()!==fp)
        throw Error("CALL_ENDED_BEFORE_SAVE");
      const next=items.filter(x=>x.fp!==fp);
      next.unshift({fp,name});
      localStorage.setItem(CONTACTS,JSON.stringify(next));
      active.name=name;
      saveNotice="saved";
      document.dispatchEvent(new CustomEvent("ezero:friend-local-saved",{detail:{fp}}));
    }catch(_){saveNotice="error";}
    finally{savingFriend=false;localize();}
  });
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
  $("language").addEventListener("change",localize);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)render();});
  window.addEventListener("focus",render);
  window.addEventListener("pagehide",()=>{ended();if(timer)clearTimeout(timer);});
  if(!consent()){try{localStorage.removeItem(HISTORY);}catch(_){}}
  // Expired entries are purged at startup and whenever the page becomes visible.
  persist();localize();
})();