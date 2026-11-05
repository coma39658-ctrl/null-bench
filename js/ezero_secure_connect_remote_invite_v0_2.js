/* E-ZERO universal messenger-compatible, public-key-only invites.
 * Explicit approval on both devices. No auto-send, call, account or tracking server.
 * The app's HTTPS fragment contains a PUBLIC signed invitation only.
 */
(() => {
  "use strict";
  const $=id=>document.getElementById(id);
  const core=window.EZERO_PUBLIC_QR_CORE;
  if(!core)return;
  const labels={
    ur:{
      distanceTitle:"دور موجود دوست سے رابطہ",distanceHelp:"کسی بھی میسنجر پر محفوظ دعوتی لنک بھیجیں۔ دوست منظوری دے کر شناختی جواب واپس بھیج سکتا ہے؛ کال خودکار شروع نہیں ہوتی۔",
      invite:"↗ دعوتی لنک بھیجیں",incomingTitle:"دوست کی دعوت",accept:"✓ قبول کریں اور جواب شیئر کریں",decline:"مسترد کریں",
      appTitle:"ایپ شیئر کریں یا انسٹال کریں",share:"↗ ایپ لنک شیئر کریں",install:"📲 انسٹال / شارٹ کٹ",
      shortLabel:"E-ZERO مختصر لنک:",policy:"🔒 پرائیویسی اور سیکیورٹی پالیسی",
      inviteReady:"دعوت تیار ہے۔ منتخب ایپ سے یہ لنک بھیجیں۔",inviteCopied:"دعوتی لنک کاپی ہوگیا۔ اسے میسنجر میں بھیجیں۔",
      inviteError:"دعوت تیار نہ ہوسکی؛ دوبارہ آزمائیں۔",storageError:"اس فون میں عارضی درخواست محفوظ نہیں ہوسکی۔ براؤزر کی اسٹوریج سیٹنگ چیک کریں۔",
      inviteVerified:"دوسرے فون کی عارضی دستخط شدہ شناخت درست ہے۔ یہ کسی مخصوص انسان کی شناخت یا کال کی تصدیق نہیں۔",
      inviteBad:"یہ دعوت غلط، تبدیل شدہ یا زائد المیعاد ہے۔",
      inviteDeclined:"درخواست مسترد کردی گئی؛ کوئی جواب نہیں بھیجا گیا۔",
      replyCopied:"دستخط شدہ جواب کا لنک کاپی ہوگیا، اب اصل دوست کو بھیجیں۔",
      replySent:"جواب شیئر کردیا گیا؛ کوئی کال شروع نہیں ہوئی۔",
      replyVerified:"✓ دوست کا دستخط شدہ جواب آپ کی اسی درخواست سے مل گیا۔ یہ کال نہیں اور انسان کی شناخت کی ضمانت نہیں۔",
      replyInvalid:"یہ جواب غلط، زائد المیعاد یا آپ کی موجودہ درخواست سے غیر متعلق ہے۔",
      replyNotSent:"جواب بھیجا نہیں جاسکا؛ دوبارہ شیئر کریں۔",
      approved:"یہ دعوت E-ZERO کی عوامی شناختی تصدیق کے لیے ہے؛ قبول کرنا آپ کی مرضی ہے۔",
      installed:"E-ZERO پہلے سے ایپ کے اندر کھلا ہوا ہے؛ دوبارہ انسٹال کی ضرورت نہیں۔",
      installAccepted:"براؤزر میں انسٹال کی درخواست منظور ہوئی؛ اصل انسٹال ہونے کی تصدیق باقی ہے۔",
      installHelp:"Chrome: ⋮ مینو → Install app یا Add to Home screen۔ iPhone Safari: Share → Add to Home Screen۔",
      fallback:"شیئر شیٹ دستیاب نہیں۔ نیچے کا بٹن دباکر لنک کاپی کریں۔",
      copy:"📋 دعوتی لنک کاپی کریں",copyFail:"لنک کاپی نہیں ہوا۔ نیچے لنک کو دیر تک دباکر کاپی یا شیئر کریں۔"
    },
    en:{
      distanceTitle:"Connect with a distant friend",distanceHelp:"Send a signed invite link through any compatible messenger. Your friend can approve and send an identity reply. No call starts automatically.",
      invite:"↗ Send invite link",incomingTitle:"Friend's invitation",accept:"✓ Accept and share reply",decline:"Decline",
      appTitle:"Share or install the app",share:"↗ Share app link",install:"📲 Install / home shortcut",
      shortLabel:"E-ZERO short link:",policy:"🔒 Privacy and security policy",
      inviteReady:"Invitation ready. Send the link through your chosen app.",inviteCopied:"Invite link copied. Send it via your messenger.",
      inviteError:"Could not create invite. Please retry.",storageError:"Couldn't store the temporary request on this device. Check browser storage permissions.",
      inviteVerified:"Signed temporary digital identity verified. This doesn't prove a person's identity or connect a call.",
      inviteBad:"This invite is invalid, altered or expired.",inviteDeclined:"Request declined; no reply was sent.",
      replyCopied:"Signed reply link copied. Return it to the original sender.",
      replySent:"Reply shared. No call started.",
      replyVerified:"✓ Signed digital response matches your original request. This is not a call or proof of someone's identity.",
      replyInvalid:"Reply invalid, expired, or unrelated to your active request.",replyNotSent:"Could not share reply. Try again.",
      approved:"This invites you to verify a temporary digital identity. Accepting is optional.",
      installed:"E-ZERO is already running as an installed app. No reinstall is needed.",
      installAccepted:"Installation request accepted; waiting for browser confirmation.",
      installHelp:"Chrome: ⋮ menu → Install app / Add to Home screen. iPhone Safari: Share → Add to Home Screen.",
      fallback:"Share sheet unavailable. Tap below to copy the link.",
      copy:"📋 Copy invitation link",copyFail:"Couldn't copy. Long-press the link below to copy or share it."
    },
    ar:{
      distanceTitle:"التواصل مع صديق بعيد",distanceHelp:"أرسل رابط دعوة موقعة عبر أي تطبيق متوافق. يستطيع صديقك الموافقة وإرسال رد للتحقق، دون بدء مكالمة تلقائياً.",
      invite:"↗ إرسال رابط دعوة",incomingTitle:"دعوة من صديق",accept:"✓ قبول ومشاركة الرد",decline:"رفض",
      appTitle:"مشاركة التطبيق أو تثبيته",share:"↗ مشاركة رابط التطبيق",install:"📲 تثبيت / اختصار",
      shortLabel:"رابط E-ZERO المختصر:",policy:"🔒 سياسة الخصوصية والأمان",
      inviteReady:"الدعوة جاهزة. أرسل الرابط عبر التطبيق المختار.",inviteCopied:"نُسخ رابط الدعوة. أرسله عبر المراسلة.",
      inviteError:"تعذر إنشاء الدعوة. أعد المحاولة.",storageError:"تعذر حفظ الطلب المؤقت على هذا الجهاز. تحقق من صلاحيات التخزين.",
      inviteVerified:"تم التحقق من الهوية الرقمية المؤقتة الموقعة. هذا لا يثبت هوية الشخص أو إجراء مكالمة.",
      inviteBad:"الدعوة غير صالحة أو معدّلة أو منتهية.",inviteDeclined:"رُفض الطلب ولم يُرسل رد.",
      replyCopied:"نُسخ رابط الرد الموقّع. أرسله إلى المُرسِل الأصلي.",
      replySent:"تمت مشاركة الرد، ولم تبدأ مكالمة.",
      replyVerified:"✓ الرد الرقمي الموقّع مطابق لطلبك الأصلي. هذه ليست مكالمة أو إثباتاً لهوية شخص.",
      replyInvalid:"الرد غير صالح أو منتهي أو غير مرتبط بطلبك.",replyNotSent:"تعذرت مشاركة الرد. حاول مجدداً.",
      approved:"هذه دعوة للتحقق من هوية رقمية مؤقتة؛ القبول اختياري.",
      installed:"E-ZERO مفتوح بالفعل كتطبيق مثبت ولا حاجة لإعادة التثبيت.",
      installAccepted:"تم قبول طلب التثبيت وبانتظار تأكيد المتصفح.",
      installHelp:"Chrome: قائمة ⋮ ثم Install app / Add to Home screen. iPhone Safari: Share ثم Add to Home Screen.",
      fallback:"المشاركة غير متاحة. اضغط أدناه لنسخ الرابط.",
      copy:"📋 نسخ رابط الدعوة",copyFail:"تعذر النسخ. اضغط مطولاً على الرابط أدناه لنسخه أو مشاركته."
    }
  };
  const word=k=>(labels[document.documentElement.lang]||labels.ur)[k]||k;
  const show=(id,key)=>{const el=$(id);if(el)el.textContent=word(key);};
  const PUBLIC_LINK=new URL("./c.html",location.href);
  const STORAGE="ezero_secure_connect_pending_v0_2";
  const hex=b=>Array.from(b,x=>x.toString(16).padStart(2,"0")).join("");
  const freshId=()=>{const b=new Uint8Array(16);crypto.getRandomValues(b);return hex(b);};
  const fromB64=input=>{
    if(typeof input!=="string"||!/^[A-Za-z0-9_-]+$/.test(input)||input.length>1000)throw Error("INVALID");
    const s=atob(input.replace(/-/g,"+").replace(/_/g,"/")+"=".repeat((4-input.length%4)%4));
    return Uint8Array.from(s,c=>c.charCodeAt(0));
  };
  const data=(id,a,b)=>["E-ZERO-REPLY-1",location.origin,id,a,b].join("|");
  const encoder=new TextEncoder();
  function pending(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE)||"[]");
      if(!Array.isArray(parsed))return [];
      const current=Date.now();
      const clean=parsed.filter(x=>x&&/^[a-f0-9]{32}$/.test(x.id)&&
        /^[a-f0-9]{64}$/.test(x.fp)&&Number.isSafeInteger(x.until)&&
        x.until>current&&x.until<=current+600000).slice(-5);
      if(clean.length!==parsed.length) {
        if(clean.length)localStorage.setItem(STORAGE,JSON.stringify(clean));
        else localStorage.removeItem(STORAGE);
      }
      return clean;
    }catch(_){return [];}
  }
  function persist(rows){
    try{localStorage.setItem(STORAGE,JSON.stringify(rows.slice(-5)));return true;}catch(_){return false;}
  }
  function clearRequest(id){
    try{
      const left=pending().filter(x=>x.id!==id);
      if(left.length)localStorage.setItem(STORAGE,JSON.stringify(left));
      else localStorage.removeItem(STORAGE);
    }catch(_){}
  }
  function link(type,parts){
    const url=new URL(PUBLIC_LINK.href);
    url.hash=type+"="+encodeURIComponent(parts.join("~"));
    return url.href;
  }
  let pendingShare="",received=null,installedViaEvent=false,installEvent=null;
  const fallback=$("fallbackShare"),fallbackLink=$("fallbackShareLink");
  function fallbackFor(url){
    pendingShare=url;fallback.hidden=false;
    fallbackLink.href=url;
    // Short label only. Token stays in the URL, not in the visible text.
    fallbackLink.textContent=PUBLIC_LINK.origin+PUBLIC_LINK.pathname+" · E-ZERO";
  }
  async function share(url,kind){
    if(typeof navigator.share==="function"){
      try{
        await navigator.share({title:"E-ZERO Secure Connect",text:"E-ZERO Secure Connect",url});
        return "shared";
      }catch(e){if(e?.name==="AbortError")return "cancelled";}
    }
    try{
      await navigator.clipboard.writeText(url);
      return "copied";
    }catch(_){
      fallbackFor(url);
      return "fallback";
    }
  }
  $("copyPreparedLink").addEventListener("click",async()=>{
    if(!pendingShare)return;
    try{await navigator.clipboard.writeText(pendingShare);
      show("inviteStatus","inviteCopied");fallback.hidden=true;
    }catch(_){show("inviteStatus","copyFail");}
  });
  $("remoteInviteButton").addEventListener("click",async()=>{
    const button=$("remoteInviteButton");
    if(button.disabled)return;
    button.disabled=true;fallback.hidden=true;
    try{
      const who=await core.identity(),id=freshId(),until=Date.now()+600000;
      const rows=pending();
      if(!persist([...rows,{id,fp:who.fp,until}])){
        show("inviteStatus","storageError");return;
      }
      const result=await share(link("i",[id,who.token]),"invite");
      if(result==="shared")show("inviteStatus","inviteReady");
      else if(result==="copied")show("inviteStatus","inviteCopied");
      else if(result==="fallback")show("inviteStatus","fallback");
    }catch(_){show("inviteStatus","inviteError");}
    finally{button.disabled=false;}
  });
  async function acceptIncoming(){
    if(!received||!received.replyUrl)return;
    $("acceptInviteButton").disabled=true;
    try{
      const result=await share(received.replyUrl,"reply");
      if(result==="shared")show("incomingStatus","replySent");
      else if(result==="copied")show("incomingStatus","replyCopied");
      else if(result==="fallback")show("incomingStatus","fallback");
    }finally{$("acceptInviteButton").disabled=false;}
  }
  $("acceptInviteButton").addEventListener("click",acceptIncoming);
  $("declineInviteButton").addEventListener("click",()=>{
    received=null;
    $("incomingPanel").hidden=true;
    fallback.hidden=true;pendingShare="";
    show("inviteStatus","inviteDeclined");
  });
  async function incomingFromFragment(){
    const hash=location.hash.slice(1);
    if(!/^(i|r)=/.test(hash))return;
    try{history.replaceState(null,"",location.pathname+location.search);}catch(_){}
    $("incomingPanel").hidden=false;
    $("acceptInviteButton").hidden=true;
    $("declineInviteButton").hidden=true;
    if(hash.length>2900){show("incomingStatus","inviteBad");return;}
    const params=new URLSearchParams(hash);
    const isInvite=params.has("i");
    const fields=(params.get(isInvite?"i":"r")||"").split("~");
    try{
      if(isInvite){
        if(fields.length!==2||!/^[a-f0-9]{32}$/.test(fields[0]))throw Error("INVALID");
        const person=await core.verifySignedQr(fields[1]);
        const info=await core.signBoundReply(fields[0],person.fingerprint);
        received={replyUrl:link("r",[fields[0],person.fingerprint,info.token,info.sig]),
          fp:person.fingerprint};
        $("incomingInfo").textContent=word("approved")+" · SHA-256 "+person.fingerprint.slice(0,16)+"…";
        $("acceptInviteButton").hidden=false;
        $("declineInviteButton").hidden=false;
        show("incomingStatus","inviteVerified");
      }else{
        if(fields.length!==4||!/^[a-f0-9]{32}$/.test(fields[0])||
           !/^[a-f0-9]{64}$/.test(fields[1]))throw Error("INVALID");
        const match=pending().find(x=>x.id===fields[0]&&x.fp===fields[1]);
        if(!match)throw Error("NO_MATCH");
        const person=await core.verifySignedQr(fields[2]);
        const signature=fromB64(fields[3]);
        const correct=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
          person.publicKey,signature,encoder.encode(data(fields[0],fields[1],person.fingerprint)));
        if(!correct)throw Error("BAD_SIGNATURE");
        clearRequest(fields[0]);
        $("incomingInfo").textContent="SHA-256 "+person.fingerprint.slice(0,16)+"…";
        show("incomingStatus","replyVerified");
      }
    }catch(_){
      show("incomingStatus",isInvite?"inviteBad":"replyInvalid");
    }
  }
  // Requests are never accepted automatically; other messaging apps may save
  // the complete URL. Never include a private key, caller name or chat content.
  incomingFromFragment().catch(()=>show("incomingStatus","inviteBad"));
  $("shareAppButton").addEventListener("click",async()=>{
    fallback.hidden=true;
    const result=await share(PUBLIC_LINK.href,"app");
    if(result==="copied")show("inviteStatus","inviteCopied");
    else if(result==="fallback")show("inviteStatus","fallback");
  });

  // Browsers cannot reliably detect a PWA installed but opened OUTSIDE its
  // own window. We hide Install when opened in an actual standalone PWA.
  const isStandalone=()=>installedViaEvent||
    !!window.matchMedia?.("(display-mode: standalone)")?.matches||
    navigator.standalone===true;
  const displayMode=window.matchMedia?.("(display-mode: standalone)");
  function updateInstall(){
    const installed=isStandalone();
    $("installAppButton").hidden=installed;
    if(installed)show("installHelp","installed");
  }
  window.addEventListener("beforeinstallprompt",event=>{
    event.preventDefault();installEvent=event;updateInstall();
  });
  window.addEventListener("appinstalled",()=>{
    installedViaEvent=true;installEvent=null;updateInstall();
  });
  displayMode?.addEventListener?.("change",updateInstall);
  $("installAppButton").addEventListener("click",async()=>{
    if(isStandalone()){updateInstall();return;}
    if(!installEvent){show("installHelp","installHelp");return;}
    const event=installEvent;installEvent=null;
    try{
      event.prompt();
      const decision=await event.userChoice;
      show("installHelp",decision?.outcome==="accepted"?"installAccepted":"installHelp");
    }catch(_){show("installHelp","installHelp");}
  });
  function translate(){
    for(const el of document.querySelectorAll("[data-ui]")){
      const key=el.dataset.ui;if(Object.hasOwn(labels[document.documentElement.lang]||{},key))
        el.textContent=word(key);
    }
    if(received)$("incomingInfo").textContent=word("approved")+" · SHA-256 "+received.fp.slice(0,16)+"…";
    updateInstall();
  }
  $("language").addEventListener("change",translate);
  translate();
})();
