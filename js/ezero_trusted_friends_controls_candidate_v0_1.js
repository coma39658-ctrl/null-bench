/*
 * E-ZERO saved-friend CALL CONTROLS -- PRIVATE LAB CANDIDATE ONLY.
 * Never included on current public page. Needs a reviewed foreground inbox
 * Cloudflare deployment, opted-in persistent identity and an authenticated
 * first-call Save Friend flow before physical end-to-end testing.
 *
 * "Ring" here is delivery to an active trusted browser tab only. Actual
 * connection and media are independently checked by existing signed WebRTC.
 */
(() => {
  "use strict";
  const root=document.getElementById("ezeroTrustedFriendsLab");
  const api=window.EZERO_TRUSTED_FRIEND_LAB;
  if(!root||!api?.enabled?.())return;
  const FRIENDS_KEY="ezero_secure_connect_staging_fingerprints_v0_1";
  const FP=/^[a-f0-9]{64}$/;
  const $=tag=>document.createElement(tag);
  let active=false,pending=null,incoming=null,pendingTimer=null;
  let outgoingInFlight=false,outgoingResult=null;
  const copy={
    ur:{head:"🔐 محفوظ دوست — تجرباتی رابطہ",start:"✓ کال وصول کرنا فعال کریں",
      note:"صرف اس وقت کال وصول ہوگی جب یہ صفحہ کھلا اور آپ نے اجازت دی ہو۔ پہلے QR سے تصدیق کے بعد دوست محفوظ کریں۔",
      empty:"ابھی کوئی تصدیق شدہ دوست محفوظ نہیں۔",
      allow:"✓ اجازت دیں",deny:"✕ اجازت ہٹائیں",audio:"📞 کال",video:"📹 ویڈیو",
      idle:"براہِ راست رابطہ سرور ابھی آزمائشی ہے؛ کال بننے کی تصدیق کے بغیر کامیابی ظاہر نہیں ہوگی۔",
      offline:"رابطہ سرور سے رابطہ نہیں ہوا؛ انٹرنیٹ چیک کریں یا موجودہ QR دعوت استعمال کریں۔",
       firstQr:"پہلے دو موبائلوں پر QR سے ایک کامیاب کال کریں اور دونوں طرف دوست محفوظ کریں؛ پھر یہ بٹن دبائیں۔",
       missingIdentity:"اس فون کی محفوظ شناخت دستیاب نہیں۔ QR سے دوبارہ تصدیق کرکے دوست محفوظ کریں۔",
      ownerOn:"✓ یہ صفحہ محفوظ دوستوں کی کال وصول کرنے کے لیے تیار ہے (پس منظر میں نہیں)۔",
      trusted:"دوست کی کال کی اجازت محفوظ کرنے کی درخواست بھیجی گئی۔",
      untrusted:"دوست کی کال کی اجازت واپس لینے کی درخواست بھیجی گئی۔",
      preparing:"نئی محفوظ دعوت تیار کی جارہی ہے۔",
      sent:"درخواست سرور کو بھیجی؛ دوست کے فون پر پہنچنے کی تصدیق باقی ہے۔",
      delivered:"✓ دوست کے کھلے ہوئے صفحے تک دعوت پہنچی؛ کال ابھی قبول نہیں ہوئی۔",
      failed:"کال نہیں پہنچی۔ QR کوڈ یا شیئر لنک موجود ہے؛ اسی سے رابطہ کریں۔",
      callIncoming:"📞 محفوظ دوست کی نئی کال",review:"دعوت کھولیں اور کال قبول کریں",
      dismiss:"✕ ابھی نہیں",notConnected:"صفحہ پہلے کال وصول کرنے کے لیے فعال کریں۔"},
    en:{head:"🔐 Trusted Friends — testing only",start:"✓ Enable incoming calls",
      note:"Calls arrive only while this page stays open and you opt in. Save a friend after verified QR pairing.",
      empty:"No verified saved friends yet.",allow:"✓ Allow",deny:"✕ Revoke",
      audio:"📞 Call",video:"📹 Video",
      idle:"This addressable calling service is experimental; no success without evidence.",
      offline:"Unable to reach the calling server. Check internet or use the QR invitation.",
       firstQr:"First complete one QR call on both phones and save each other as friends; then enable incoming calls.",
       missingIdentity:"Saved device identity unavailable. Verify again with QR and save the friend.",
      ownerOn:"✓ This foreground page can receive trusted invitations.",
      trusted:"Trust registration request sent.",untrusted:"Revocation request sent.",
      preparing:"Preparing a fresh signed invitation.",
      sent:"Request sent; delivery to recipient not confirmed.",
      delivered:"✓ Delivered to recipient's open page, not accepted or connected.",
      failed:"Call not delivered. Use the existing QR or share link.",
      callIncoming:"📞 New call from a trusted friend",review:"Open invitation and accept",
      dismiss:"✕ Not now",notConnected:"Enable incoming calls first."},
    ar:{head:"🔐 الأصدقاء الموثوقون — تجريبي",start:"✓ تفعيل استقبال المكالمات",
      note:"تصل المكالمات فقط والصفحة مفتوحة وبعد موافقتك. احفظ الصديق بعد تحقق QR.",
      empty:"لا يوجد أصدقاء محفوظون متحقق منهم.",allow:"✓ السماح",deny:"✕ إلغاء السماح",
      audio:"📞 اتصال",video:"📹 فيديو",idle:"خدمة الاتصال التجريبية لا تعرض نجاحاً وهمياً.",
      offline:"تعذر الاتصال بالخادم؛ تحقق من الإنترنت أو استخدم QR.",
       firstQr:"أجرِ مكالمة QR ناجحة أولاً واحفظ الصديق على الجهازين، ثم فعّل استقبال المكالمات.",
       missingIdentity:"هوية الجهاز المحفوظة غير متاحة؛ أعد التحقق عبر QR واحفظ الصديق.",
       ownerOn:"✓ يمكن لهذه الصفحة المفتوحة استقبال دعوات موثوقة.",
      trusted:"أُرسل طلب تسجيل الثقة.",untrusted:"أُرسل طلب الإلغاء.",
      preparing:"تجهيز دعوة آمنة جديدة.",sent:"أُرسل الطلب دون إثبات الاستلام.",
      delivered:"✓ وصلت الدعوة للصفحة المفتوحة، ولم يتم قبولها بعد.",
      failed:"لم تصل الدعوة. استخدم QR أو رابط المشاركة.",
      callIncoming:"📞 مكالمة جديدة من صديق موثوق",
      review:"افتح الدعوة ثم اقبل",dismiss:"✕ ليس الآن",
      notConnected:"فعّل استقبال المكالمات أولاً."}
  };
  const t=k=>(copy[document.documentElement.lang]||copy.ur)[k];
  const contacts=()=>{
    try{
      const arr=JSON.parse(localStorage.getItem(FRIENDS_KEY)||"[]");
      if(!Array.isArray(arr))return[];
      const unique=new Set();
      return arr.slice(0,50).filter(x=>{
        if(!x||!FP.test(x.fp)||typeof x.name!=="string"||
           !x.name.trim()||x.name.length>40||unique.has(x.fp))return false;
        unique.add(x.fp);return true;
      });
    }catch(_){return[];}
  };
  function status(key,err=false){
    const node=document.getElementById("ezeroTrustedStatus");
    if(node){node.textContent=t(key);node.dataset.status=err?"error":"info";}
  }
  function button(text,click){
    const node=$("button");
    node.type="button";node.textContent=text;
    node.addEventListener("click",click);return node;
  }
  function clearPending(){
    pending=null;
    if(pendingTimer!==null){clearTimeout(pendingTimer);pendingTimer=null;}
  }
  function paintIncoming(){
    const view=document.getElementById("ezeroTrustedIncoming");
    if(!view)return;
    view.replaceChildren();view.hidden=!incoming;
    if(!incoming)return;
    const heading=$("strong");heading.textContent=t("callIncoming")+" · "+incoming.name;
    const review=button(t("review"),()=>{
      const selected=incoming;
      incoming=null;paintIncoming();
      // This is an EXPLICIT user click and only opens the existing
      // validated invitation. The next page still requires Accept.
      if(api.safeInvite(selected.invite,selected.kind))
        window.location.assign(selected.invite);
    });
    const dismiss=button(t("dismiss"),()=>{incoming=null;paintIncoming();});
    view.append(heading,review,dismiss);
  }
  // One call path for both the saved-friend row and the new adjacent
  // contact-first controls. The user must explicitly select a saved friend.
  function prepareSavedCall(fp,kind){
    if(!["audio","video"].includes(kind)||pending||outgoingInFlight)return false;
    if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true)return false;
    const item=contacts().find(x=>x.fp===fp);
    if(!item)return false;
    pending={fp:item.fp,kind};
    pendingTimer=setTimeout(()=>{
      if(pending){clearPending();status("failed",true);}
    },30000);
    status("preparing");
    return true;
  }
  // Only prepares a named contact: the original guarded, signed WebRTC
  // start still runs via the normal, deliberate Audio/Video button tap.
  window.EZERO_TRUSTED_SAVED_CALL=Object.freeze({
    prepare:prepareSavedCall,
    hasContact:fp=>contacts().some(x=>x.fp===fp),
    isPending:()=>Boolean(pending||outgoingInFlight),
    cancelForQr:()=>{
      // Only after a deliberate user tap on New Call QR. Do not leave
      // a stale selected-contact receipt waiting across the new invitation.
      clearPending();outgoingInFlight=false;outgoingResult=null;
    }
  });
  function paint(){
    const title=document.getElementById("ezeroTrustedTitle");
    if(title)title.textContent=t("head");
    document.getElementById("ezeroTrustedHelp").textContent=t("note");
    document.getElementById("ezeroTrustedEnable").textContent=t("start");
    const box=document.getElementById("ezeroTrustedList");
    box.replaceChildren();
    const items=contacts();
    if(!items.length){const p=$("p");p.textContent=t("empty");box.append(p);return;}
    for(const item of items){
      const line=$("div");line.className="ezero-trusted-friend-row";
      const name=$("strong");name.textContent=item.name;
      const allow=button(t("allow"),async()=>{
        if(!active)return status("notConnected",true);
        try{await api.setFriendTrust(item.fp,true);status("trusted");}
        catch(_){status("offline",true);}
      });
      const deny=button(t("deny"),async()=>{
        if(!active)return status("notConnected",true);
        try{await api.setFriendTrust(item.fp,false);status("untrusted");}
        catch(_){status("offline",true);}
      });
      function call(kind){
        return ()=>{
          const feature=document.querySelector('[data-modern-select="'+kind+'"]');
          if(!feature)return status("failed",true);
          // New contact-first dock will route this through the shared
          // preparation API. Prevent duplicate preparation if the row is used.
          if(!prepareSavedCall(item.fp,kind))return;
          feature.click(); // explicit user's gesture; no automatic media access
        };
      }
      line.append(name,allow,deny,button(t("audio"),call("audio")),
        button(t("video"),call("video")));
      box.append(line);
    }
  }
  root.hidden=false;
  root.replaceChildren();
  const head=$("h2");head.id="ezeroTrustedTitle";
  const note=$("p");note.id="ezeroTrustedHelp";
  const enable=button(t("start"),async()=>{
    // A first-time user has no persisted contact or device identity yet.
    // Do not misleadingly label this as a Cloudflare outage.
    if(!contacts().length){active=false;return status("firstQr",true);}
    try{await api.openOwnerInbox();active=true;status("ownerOn");}
    catch(error){
      active=false;
      const code=String(error?.message||"");
      if(/^(DEVICE_IDENTITY_NOT_SAVED|DEVICE_IDENTITY_MISMATCH|DEVICE_IDENTITY_STORE_NOT_LOADED|LAB_DISABLED_OR_INSECURE)$/.test(code))
        status("missingIdentity",true);
      else status("offline",true);
    }
  });
  enable.id="ezeroTrustedEnable";
  const list=$("div");list.id="ezeroTrustedList";
  const received=$("div");received.id="ezeroTrustedIncoming";received.hidden=true;
  const live=$("p");live.id="ezeroTrustedStatus";live.setAttribute("role","status");
  live.setAttribute("aria-live","polite");
  root.append(head,note,enable,list,received,live);
  status("idle");paint();
  api.on("incoming",e=>{
    const packet=e.detail;
    // A hidden/background tab must not claim the user saw a call prompt.
    if(document.hidden||!active||!packet||
       !contacts().some(x=>x.fp===packet.from)||
       !api.safeInvite(packet.invite,packet.kind))return;
    incoming=packet;paintIncoming();
    const visible=document.getElementById("ezeroTrustedIncoming");
    if(!visible||visible.hidden||incoming?.callId!==packet.callId)return;
    try{
      api.confirmIncomingVisible(packet.from,packet.callId);
    }catch(_){
      incoming=null;paintIncoming();status("failed",true);
    }
  });
  api.on("outgoing-delivered",()=>{
    if(!outgoingInFlight)return;
    outgoingResult="delivered";outgoingInFlight=false;status("delivered");
  });
  api.on("outgoing-error",()=>{
    if(!outgoingInFlight)return;
    outgoingResult="failed";outgoingInFlight=false;status("failed",true);
  });
  api.on("offline",()=>{active=false;status("offline",true);});
  document.addEventListener("ezero:auto-invite-ready",async e=>{
    if(!pending)return;
    const {fp,kind}=pending;clearPending();
    const link=e.detail?.link;
    if(!api.safeInvite(link,kind))return status("failed",true);
    outgoingInFlight=true;outgoingResult=null;
    try{
      await api.callSavedFriend(fp,kind,link);
      // A fast ACK/ERROR may arrive before this Promise resolves.
      // Never replace a verified delivery or failure with a stale "Sent".
      if(outgoingResult==="delivered")status("delivered");
      else if(outgoingResult==="failed")status("failed",true);
      else status("sent");
    }catch(_){
      outgoingInFlight=false;outgoingResult="failed";status("failed",true);
    }
  });
  // The first connected call can save a friend without reloading the page.
  document.addEventListener("ezero:friend-local-saved",paint);
  document.getElementById("language")?.addEventListener("change",()=>{
    paint();paintIncoming();
  });
  document.addEventListener("ezero:call-status",e=>{
    if(!pending)return;
    if(["micDenied","iceNoRoute","signalInvalid","fingerprintMismatch","idle"]
      .includes(e.detail?.stage)){clearPending();status("failed",true);}
  });
  window.addEventListener("pagehide",()=>{
    clearPending();outgoingInFlight=false;outgoingResult=null;
    api.closeOwnerInbox();
  });
})();