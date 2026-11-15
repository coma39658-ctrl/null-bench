/* E-ZERO staging: user-consented ICE route troubleshooting.
 * Never auto-activate a third-party STUN service, TURN, microphone, camera
 * or call retry. Reuse the original #ezeroAutoStun checkbox, which the signed
 * call engine reads immediately before creating each PeerConnection.
 */
(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const hub=$("ezeroFrontQrHub"),consent=$("ezeroAutoStun");
  if(!hub||!consent)return;
  const originalLabel=consent.closest("label");
  if(!originalLabel)return;
  const lang=()=>["ur","en","ar"].includes($("language")?.value)?$("language").value:"ur";
  const strings={
    ur:{
      title:"📶 کال کے لیے نیٹ ورک راستہ",
      consent:"اختیاری STUN — اگلی کال میں نیٹ ورک راستہ تلاش کریں؛ یہ سرور IP/نیٹ ورک معلومات دیکھ سکتا ہے۔",
      note:"STUN بھی بعض نیٹ ورکس پر ناکافی ہے۔ TURN ریلے ابھی دستیاب نہیں؛ کوئی ضمانت نہیں۔",
      failed:"کال کا QR پڑھ لیا گیا، مگر فونوں میں WebRTC کا راستہ قائم نہیں ہو سکا۔",
      cause:"حالت",
      brief:"دونوں فون Chrome میں ایک ہی HTTPS ٹیسٹ صفحہ کھولیں۔ کیمرہ/مائیک کی اجازت دیں۔ اگر دوبارہ ناکامی ہو تو دونوں فون پر اوپر STUN کو اپنی مرضی سے فعال کرکے نیا QR بنائیں۔",
      retry:"↻ نئی کال دعوت (میری منظوری سے)",other:"دوسرے فون پر پہلا موبائل نیا QR بنائے، پھر اسکین کریں۔",
      check:"اس فون پر STUN منتخب ہے",noStun:"اس فون پر STUN منتخب نہیں",norel:"TURN ریلے فعال نہیں",connected:"✓ رابطہ کامیاب ہو گیا۔",
      waiting:"کال شروع کی جا رہی ہے؛ نتیجہ اسی جگہ نظر آئے گا۔"
    },
    en:{
      title:"📶 Call network route",consent:"Optional STUN for the next call. Its provider may see IP/network metadata.",
      note:"STUN cannot solve all networks. No TURN relay is configured; success is not guaranteed.",
      failed:"Call invite was processed, but WebRTC could not find a working network route.",
      cause:"Status",brief:"Open the same HTTPS test page in Chrome on both phones, allow mic/camera. If retrying, voluntarily enable STUN on both phones, then create a NEW QR.",
      retry:"↻ Create new call invite (explicit tap)",other:"On the other phone, create a fresh QR from phone A and scan it again.",
      check:"STUN selected on this phone",noStun:"STUN not selected on this phone",norel:"TURN relay unavailable",
      connected:"✓ Connection established.",waiting:"Connecting; the result appears here."
    },
    ar:{
      title:"📶 مسار شبكة المكالمة",consent:"STUN اختياري للمكالمة التالية. قد يرى الخادم عنوان IP وبيانات الشبكة.",
      note:"قد لا يكفي STUN، ولم يتم إعداد خادم TURN بعد.",
      failed:"قُبلت دعوة المكالمة لكن لم يتوفر مسار WebRTC صالح.",
      cause:"الحالة",brief:"افتح رابط الاختبار نفسه في Chrome على الهاتفين واسمح للكاميرا والميكروفون. يمكن تفعيل STUN اختيارياً على الهاتفين ثم إنشاء QR جديد.",
      retry:"↻ إنشاء دعوة مكالمة جديدة",other:"أنشئ QR جديداً على الهاتف الأول وامسحه في الثاني.",
      check:"STUN مفعّل هنا",noStun:"STUN غير مفعّل هنا",norel:"TURN غير متاح",
      connected:"✓ تم الاتصال.",waiting:"جارٍ الاتصال، والنتيجة هنا."
    }
  };
  const t=k=>(strings[lang()]||strings.ur)[k];
  const opts=document.createElement("section");
  opts.id="ezeroFrontNetworkMode";
  opts.className="ezero-front-network-mode";
  opts.setAttribute("aria-labelledby","ezeroFrontNetworkTitle");
  const title=document.createElement("strong");
  title.id="ezeroFrontNetworkTitle";
  const note=document.createElement("p");note.id="ezeroFrontNetworkNote";
  opts.append(title,originalLabel,note);
  hub.querySelector("#ezeroFrontQrHelp")?.insertAdjacentElement("afterend",opts);
  // This is the SAME actual input read by chooseStun(); never duplicate it.
  originalLabel.classList.add("ezero-front-stun-checkbox");
  const labelText=originalLabel.querySelector("span");
  const recovery=document.createElement("section");
  recovery.id="ezeroInlineIceRecovery";
  recovery.className="ezero-inline-ice-recovery";
  recovery.hidden=true;
  recovery.setAttribute("role","region");
  recovery.setAttribute("aria-label","WebRTC connection troubleshooting");
  const heading=document.createElement("strong");
  const message=document.createElement("p");
  const details=document.createElement("p");details.id="ezeroIceSafeSummary";
  const instruction=document.createElement("p");
  const retry=document.createElement("button");retry.type="button";retry.id="ezeroIceNewInvite";
  const incomingNote=document.createElement("p");
  recovery.append(heading,message,details,instruction,retry,incomingNote);
  let lastStage="idle",lastSummary=null;
  function anchor(){
    const receiver=$("ezeroOneCallProgress");
    if(receiver&&!receiver.hidden)return receiver.parentElement;
    const call=$("ezeroInlineCallResult");
    if(call&&!call.hidden)return call;
    const video=$("ezeroFrontVideoSlot");
    if(video&&video.querySelector("#ezeroOneQrBox"))return video;
    return $("ezeroFrontMyQrCell")||hub;
  }
  function output(){
    const destination=anchor();
    if(recovery.parentElement!==destination)destination.append(recovery);
  }
  const labels={
    host:"host",srflx:"srflx",prflx:"prflx",relay:"relay"
  };
  function safeSummary(){
    // Only transport state names and candidate-category COUNTS.
    // Never print SDP, IP addresses, room identifiers or fingerprints.
    if(!lastSummary)return "";
    const s=lastSummary;
    return ["ICE "+(s.state||"unknown"),"gather "+(s.gathering||"unknown"),
      ...Object.keys(labels).map(k=>labels[k]+" "+(Number(s.counts?.[k])||0))].join(" · ");
  }
  function update(){
    title.textContent=t("title");
    note.textContent=t("note");
    if(labelText)labelText.textContent=t("consent");
    heading.textContent=t("failed");
    message.textContent=t(consent.checked?"check":"noStun")+" · "+t("norel");
    details.textContent=safeSummary();
    instruction.textContent=t("brief");
    retry.textContent=t("retry");
    const receiver=$("ezeroOneCallProgress");
    const wasReceiver=receiver&&!receiver.hidden;
    retry.hidden=!!wasReceiver;
    incomingNote.hidden=!wasReceiver;
    incomingNote.textContent=t("other");
  }
  function showFailure(){
    output();update();recovery.hidden=false;
    recovery.dataset.stage="iceNoRoute";
  }
  function hide(){
    recovery.hidden=true;
    recovery.dataset.stage="";
  }
  consent.addEventListener("change",update);
  $("language")?.addEventListener("change",update);
  document.addEventListener("ezero:ice-diagnostic",e=>{
    const d=e.detail;
    if(!d||!["new","gathering","complete"].includes(d.gathering)||
       !["new","checking","connected","completed","failed","disconnected","closed"].includes(d.state))return;
    lastSummary={
      gathering:d.gathering,state:d.state,
      counts:Object.fromEntries(["host","srflx","prflx","relay"].map(k=>
        [k,Math.max(0,Math.min(999,Number(d.counts?.[k])||0))]))
    };
    if(!recovery.hidden)update();
  });
  document.addEventListener("ezero:call-status",e=>{
    lastStage=e.detail?.stage||"idle";
    if(lastStage==="iceNoRoute")showFailure();
    else if(["connected","idle","offerReady","answerReady","iceChecking"].includes(lastStage))hide();
  });
  document.addEventListener("ezero:auto-call-starting",hide);
  retry.addEventListener("click",()=>{
    if(window.EZERO_PEER_PROFILE_TRANSPORT?.connected()===true)return;
    hide();
    // Exactly one fresh, user-initiated call; the existing crypto, identity
    // and mic/camera gates still authorize or reject the request.
    const mode=document.querySelector('input[name="mode"]:checked')?.value==="video"?"video":"audio";
    const button=$(mode==="video"?"ezeroFreshQrVideo":"ezeroFreshQrAudio");
    if(button)button.click();
    else $(mode==="video"?"ezeroFrontVideoQr":"ezeroFrontAudioQr")?.click();
  });
  update();
})();