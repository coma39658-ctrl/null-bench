/* E-ZERO Secure Connect People v0.1: device-local, opt-in, truthful.
 * Saved QR contacts are not persistent live identities. A missed call cannot be
 * determined without a verified incoming-call signaling/notification service.
 * Never store call media, chat contents, invitations, SDP, or peer photos.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  if(!$("ezeroPeopleHub"))return;
  const HISTORY_KEY="ezero_local_completed_call_history_v0_1";
  const CONSENT_KEY="ezero_local_call_history_consent_v0_1";
  const CONTACTS_KEY="ezero_secure_connect_local_fingerprints_v0_1";
  const MAX_HISTORY=60;
  const validFP=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
  const nameOf=v=>typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,40):"";
  const locale={
    ur:{
      hubTitle:"👥 دوست اور کال ہسٹری",
      hubDescription:"آپ کے محفوظ دوست، قائم شدہ کالیں اور اختیاری مقامی ہسٹری۔ محفوظ نام کا مطلب آن لائن نہیں۔",
      friends:"دوست",calls:"کالز",missed:"مس کالز",searchLabel:"دوست یا کال تلاش کریں",
      searchHint:"نام تلاش کریں",historyConsent:"واقعی قائم ہونے والی کالوں کی مختصر ہسٹری صرف اسی فون پر محفوظ کریں؛ آواز، ویڈیو، چیٹ اور تصویر محفوظ نہیں ہوگی۔",
      clearHistory:"ہسٹری صاف کریں",clearConfirm:"کیا آپ اسی فون کی محفوظ کال ہسٹری ختم کرنا چاہتے ہیں؟",
      cleared:"مقامی کال ہسٹری صاف ہو گئی۔",historyOff:"کال ہسٹری بند ہے؛ مس کال کا خودکار نظام ابھی موجود نہیں۔",
      historyOn:"ہسٹری صرف اس فون پر فعال ہے۔ کال ملنے کے بعد ہی اندراج ہوگا۔",
      storageError:"براؤزر نے مقامی ہسٹری محفوظ نہیں ہونے دی۔",
      noFriends:"ابھی کوئی دوست اس فون میں محفوظ نہیں۔ محفوظ شدہ QR شناخت یہاں نظر آ سکتی ہے؛ نئی کال کے لیے دوبارہ تصدیق ضروری ہے۔",
      noCalls:"ابھی کوئی محفوظ حقیقی کال نہیں۔ ہسٹری فعال کرنے کے بعد کامیاب کنکشن درج ہوگا۔",
      noMissed:"معتبر مس کال کی اطلاع ابھی دستیاب نہیں۔ صرف دعوت کھلنے یا ناکام کنکشن سے مس کال کا دعویٰ نہیں کیا جائے گا۔",
      noResults:"اس نام کے مطابق کوئی نتیجہ نہیں۔",connected:"ابھی کنیکٹ",oldContact:"محفوظ شناخت؛ دوبارہ تصدیق ضروری",
      outbound:"کی گئی کال",inbound:"موصولہ کال",completed:"کال مکمل",localOnly:"صرف اس فون پر",
      unknownPeer:"عارضی رابطہ",minutes:"منٹ",seconds:"سیکنڈ",notHuman:"عارضی تصدیق شدہ کلید، انسانی شناخت نہیں"
    },
    en:{
      hubTitle:"👥 Friends & call history",
      hubDescription:"Saved contacts and established calls. A saved name does not mean online.",
      friends:"Friends",calls:"Calls",missed:"Missed",searchLabel:"Search a friend or call",
      searchHint:"Search by name",historyConsent:"Keep brief details of genuinely connected calls on this phone only. Never store audio, video, chat or photos.",
      clearHistory:"Clear history",clearConfirm:"Delete this phone's local call history?",
      cleared:"Local call history cleared.",historyOff:"Call history is off. Incoming missed-call notifications are not available.",
      historyOn:"History is on for this phone only. Calls are added after a real connection.",
      storageError:"Browser blocked local call history.",noFriends:"No saved friends yet. QR contacts can appear here; reverify before calling.",
      noCalls:"No verified calls stored. Enable local history to record future established calls.",
      noMissed:"Verified missed-call notifications are not yet supported. An invite or failed link is not a missed call.",
      noResults:"No match for this name.",connected:"Connected now",oldContact:"Saved key; reverify in a new session",
      outbound:"Outgoing",inbound:"Incoming",completed:"Completed",localOnly:"On this phone only",
      unknownPeer:"Temporary peer",minutes:"min",seconds:"sec",notHuman:"Temporary signed key; not human identity"
    },
    ar:{
      hubTitle:"👥 الأصدقاء وسجل المكالمات",
      hubDescription:"جهات اتصال محفوظة ومكالمات متصلة فعليًا. الاسم المحفوظ لا يعني الاتصال بالإنترنت.",
      friends:"الأصدقاء",calls:"المكالمات",missed:"الفائتة",searchLabel:"البحث عن صديق أو مكالمة",
      searchHint:"ابحث بالاسم",historyConsent:"احفظ بيانات مختصرة للمكالمات المتصلة فعليًا على هذا الهاتف فقط دون الصوت أو الفيديو أو الرسائل أو الصور.",
      clearHistory:"مسح السجل",clearConfirm:"هل تريد حذف سجل المكالمات المحلي؟",
      cleared:"تم مسح السجل المحلي.",historyOff:"سجل المكالمات متوقف. لا توجد إشعارات مكالمات فائتة بعد.",
      historyOn:"السجل مفعّل على هذا الهاتف فقط؛ تُسجَّل المكالمة بعد الاتصال الفعلي.",
      storageError:"منع المتصفح حفظ السجل المحلي.",noFriends:"لا يوجد أصدقاء محفوظون بعد. تتطلب جهات QR إعادة التحقق قبل الاتصال.",
      noCalls:"لا توجد مكالمات فعلية محفوظة. فعّل السجل لتسجيل المكالمات المستقبلية.",
      noMissed:"إشعارات المكالمات الفائتة الموثوقة غير مدعومة بعد. الدعوة أو الرابط الفاشل لا يعنيان مكالمة فائتة.",
      noResults:"لا توجد نتائج بهذا الاسم.",connected:"متصل الآن",oldContact:"مفتاح محفوظ؛ أعد التحقق في جلسة جديدة",
      outbound:"صادرة",inbound:"واردة",completed:"انتهت",localOnly:"على هذا الهاتف فقط",
      unknownPeer:"طرف مؤقت",minutes:"دقيقة",seconds:"ثانية",notHuman:"مفتاح مؤقت موقّع؛ ليس إثبات هوية الشخص"
    }
  };
  const t=k=>(locale[document.documentElement.lang]||locale.ur)[k]||k;
  let tab="friends",query="",intent="outbound",active=null,live=null,history=[],logging=false;
  function safeReadContacts(){
    try{
      const parsed=JSON.parse(localStorage.getItem(CONTACTS_KEY)||"[]");
      if(!Array.isArray(parsed))return[];
      const seen=new Set();
      return parsed.slice(0,50).filter(v=>{
        if(!v||!validFP(v.fp)||!nameOf(v.name)||seen.has(v.fp))return false;
        seen.add(v.fp);return true;
      }).map(v=>({name:nameOf(v.name),fp:v.fp}));
    }catch(_){return[];}
  }
  function safeReadHistory(){
    try{
      const parsed=JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
      if(!Array.isArray(parsed))return[];
      return parsed.slice(0,MAX_HISTORY).filter(v=>
        v && validFP(v.fp) && ["inbound","outbound"].includes(v.direction) &&
        typeof v.name==="string" && v.name.length<=40 &&
        Number.isSafeInteger(v.start) && v.start>0 &&
        Number.isSafeInteger(v.seconds)&&v.seconds>=0&&v.seconds<=86400
      ).map(v=>({fp:v.fp,name:nameOf(v.name),direction:v.direction,
        start:v.start,seconds:v.seconds}));
    }catch(_){return[];}
  }
  function writeHistory(){
    try{
      localStorage.setItem(HISTORY_KEY,JSON.stringify(history.slice(0,MAX_HISTORY)));
      return true;
    }catch(_){status("storageError");return false;}
  }
  function status(key){$("ezeroPeopleStatus").textContent=t(key);}
  function el(tag,cls,value){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=value;
    return node;
  }
  function person(name,detail,kind,photo){
    const card=el("article","ezero-person-card");
    const avatar=el("span","ezero-person-avatar",Array.from(name||"E")[0]?.toUpperCase()||"E");
    if(typeof photo==="string"&&photo.length<=12000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(photo)){
      const img=el("img");img.src=photo;img.alt="";avatar.replaceChildren(img);
    }
    const info=el("div","ezero-person-info");
    info.append(el("strong","",name),el("small","",detail));
    const pill=el("span","ezero-person-label",kind);
    card.append(avatar,info,pill);
    return card;
  }
  function verifiedLive(){
    return !!live && window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true &&
      validFP(window.EZERO_PEER_PROFILE_TRANSPORT.peerFingerprint()) &&
      live.fp===window.EZERO_PEER_PROFILE_TRANSPORT.peerFingerprint();
  }
  function show(){
    const out=$("ezeroPeopleList");
    out.replaceChildren();
    const matching=name=>!query||name.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    if(tab==="missed"){
      out.append(el("p","ezero-people-empty",t("noMissed")));
      return;
    }
    if(tab==="friends"){
      let count=0;
      if(verifiedLive()&&matching(live.name||t("unknownPeer"))){
        out.append(person(live.name||t("unknownPeer"),
          t("notHuman"),t("connected"),live.avatar));count++;
      }
      for(const v of safeReadContacts()){
        if(verifiedLive()&&v.fp===live.fp)continue;
        if(!matching(v.name))continue;
        out.append(person(v.name,t("oldContact"),t("localOnly")));count++;
      }
      if(!count)out.append(el("p","ezero-people-empty",query?t("noResults"):t("noFriends")));
      return;
    }
    let count=0;
    for(const v of history){
      const name=v.name||t("unknownPeer");
      if(!matching(name))continue;
      const clock=new Date(v.start).toLocaleString(document.documentElement.lang==="ur"?"ur-PK":
        document.documentElement.lang==="ar"?"ar-SA":"en-US",{dateStyle:"medium",timeStyle:"short"});
      const duration=v.seconds>=60?
        Math.floor(v.seconds/60)+" "+t("minutes")+" "+v.seconds%60+" "+t("seconds"):
        v.seconds+" "+t("seconds");
      out.append(person(name,clock+" · "+duration,t(v.direction)));count++;
    }
    if(!count)out.append(el("p","ezero-people-empty",query?t("noResults"):t("noCalls")));
  }
  function switchTab(next){
    tab=next;
    for(const [id,key] of [["ezeroTabFriends","friends"],["ezeroTabCalls","calls"],["ezeroTabMissed","missed"]]){
      $(id).setAttribute("aria-pressed",String(key===tab));
    }
    $("ezeroPeopleSearch").hidden=tab==="missed";
    show();
  }
  function updateLiveFromPeer(p){
    if(!p||!validFP(p.peerFingerprint))return;
    const tr=window.EZERO_PEER_PROFILE_TRANSPORT;
    if(!tr?.connected()||tr.peerFingerprint()!==p.peerFingerprint)return;
    live={fp:p.peerFingerprint,name:nameOf(p.name)||t("unknownPeer"),
      avatar:typeof p.avatar==="string"?p.avatar:""};
    if(active&&active.fp===live.fp){active.name=live.name;updateHistoryName();}
    show();
  }
  function updateHistoryName(){
    if(!active||!logging)return;
    const index=history.findIndex(x=>x._sessionId===active.id);
    if(index>=0){history[index].name=active.name;writeHistory();}
  }
  function onConnected(){
    const tr=window.EZERO_PEER_PROFILE_TRANSPORT;
    if(!tr?.connected())return;
    const fp=tr.peerFingerprint();
    if(!validFP(fp))return;
    if(!live||live.fp!==fp)live={fp,name:"",avatar:""};
    if(!active){
      active={fp,start:Date.now(),name:live.name||"",
        id:crypto.randomUUID?.()||String(Date.now())+"-"+Math.random(),direction:intent};
      if(logging){
        const rec={fp,name:active.name,direction:active.direction,
          start:active.start,seconds:0,_sessionId:active.id};
        history.unshift(rec);history=history.slice(0,MAX_HISTORY);
        writeHistory();
      }
    }
    show();
  }
  function onDisconnected(){
    if(active && logging){
      const row=history.find(x=>x._sessionId===active.id);
      if(row){
        row.seconds=Math.max(0,Math.min(86400,Math.round((Date.now()-active.start)/1000)));
        delete row._sessionId;
        writeHistory();
      }
    }
    active=null;live=null;intent="outbound";show();
  }
  function language(){
    for(const n of document.querySelectorAll("[data-people]"))n.textContent=t(n.dataset.people);
    $("ezeroPeopleSearch").placeholder=t("searchHint");
    status(logging?"historyOn":"historyOff");show();
  }
  logging=(()=>{try{return localStorage.getItem(CONSENT_KEY)==="yes";}catch(_){return false;}})();
  history=safeReadHistory();
  $("ezeroHistoryConsent").checked=logging;
  $("ezeroHistoryConsent").addEventListener("change",()=>{
    logging=$("ezeroHistoryConsent").checked;
    try{localStorage.setItem(CONSENT_KEY,logging?"yes":"no");}
    catch(_){logging=false;$("ezeroHistoryConsent").checked=false;status("storageError");return;}
    if(!logging){
      // Turning off stops further records; previously saved records can be cleared.
      if(active){const row=history.find(x=>x._sessionId===active.id);
        if(row){row.seconds=Math.round((Date.now()-active.start)/1000);
          delete row._sessionId;writeHistory();}}
    }else if(active){
      const row={fp:active.fp,name:active.name,direction:active.direction,
        start:Date.now(),seconds:0,_sessionId:active.id};
      active.start=row.start;
      history.unshift(row);history=history.slice(0,MAX_HISTORY);writeHistory();
    }
    status(logging?"historyOn":"historyOff");show();
  });
  $("ezeroHistoryClear").addEventListener("click",()=>{
    if(!history.length){status("cleared");return;}
    if(typeof window.confirm==="function"&&!window.confirm(t("clearConfirm")))return;
    history=[];try{localStorage.removeItem(HISTORY_KEY);}catch(_){}
    // Keep current call active but do not recreate a deleted entry.
    status("cleared");show();
  });
  for(const [id,k] of [["ezeroTabFriends","friends"],["ezeroTabCalls","calls"],["ezeroTabMissed","missed"]])
    $(id).addEventListener("click",()=>switchTab(k));
  $("ezeroPeopleSearch").addEventListener("input",()=>{
    query=$("ezeroPeopleSearch").value.trim().slice(0,40);show();
  });
  $("ezeroPrepareInvite")?.addEventListener("click",()=>{intent="outbound";});
  document.addEventListener("ezero:call-intent",e=>{
    if(["outbound","inbound"].includes(e.detail?.direction))intent=e.detail.direction;
  });
  document.addEventListener("ezero:call-status",e=>{
    if(e.detail?.stage==="connected")onConnected();
    if(["offline","iceNoRoute","idle"].includes(e.detail?.stage))onDisconnected();
  });
  document.addEventListener("ezero:channel-state",e=>{
    if(e.detail?.connected)onConnected();
    else onDisconnected();
  });
  document.addEventListener("ezero:profile-received",e=>updateLiveFromPeer(e.detail));
  $("language").addEventListener("change",language);
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)show();});
  window.addEventListener("pagehide",onDisconnected);
  language();
})();
