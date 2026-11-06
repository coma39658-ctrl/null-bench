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
  const FRIENDS_KEY="ezero_secure_connect_local_fingerprints_v0_1";
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
      offline:"رابطہ سرور دستیاب نہیں، موجودہ QR دعوت استعمال کریں۔",
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
      offline:"Inbox service unavailable; use the existing QR invitation.",
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
      offline:"الخادم غير متاح؛ استخدم دعوة QR.",ownerOn:"✓ يمكن لهذه الصفحة المفتوحة استقبال دعوات موثوقة.",
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
          // At most one contact call attempt at a time, including the server
          // receipt window. Prevent duplicate taps and conflicting statuses.
          if(pending||outgoingInFlight)return;
          pending={fp:item.fp,kind};
          pendingTimer=setTimeout(()=>{
            if(pending){clearPending();status("failed",true);}
          },30000);
          status("preparing");
          const feature=document.querySelector('[data-modern-select="'+kind+'"]');
          if(!feature){clearPending();return status("failed",true);}
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
    try{await api.openOwnerInbox();active=true;status("ownerOn");}
    catch(_){active=false;status("offline",true);}
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